import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

/**
 * Mensaje de homenaje recibido via WebSocket.
 */
export interface SocketMessage {
  id: string;
  authorName: string;
  content: string;
  iconType: string | null;
  createdAt: string;
}

/**
 * Reacción rápida recibida via WebSocket.
 */
export interface SocketReaction {
  type: string;
  icon: string;
}

/**
 * Contador de espectadores recibido via WebSocket.
 */
export interface SocketViewerCount {
  eventId: string;
  tenantId: string;
  count: number;
}

/**
 * Cambio de estado del stream recibido via WebSocket.
 */
export interface SocketStreamStatus {
  eventId: string;
  tenantId: string;
  status: string;
}

/**
 * Servicio cliente de Socket.IO para el módulo de Streaming.
 *
 * Gestiona la conexión en tiempo real con el servidor para recibir:
 * - Mensajes de homenaje aprobados en tiempo real
 * - Reacciones rápidas de otros viewers
 * - Actualizaciones del contador de espectadores
 * - Cambios de estado del stream (LIVE, FINISHED)
 * - Mensajes pendientes de moderación (sala de administración)
 *
 * @remarks
 * Se conecta al namespace `/events` del servidor Socket.IO.
 * Usa Subjects de RxJS para exponer los eventos como Observables
 * a los que los componentes pueden suscribirse.
 * Implementa OnDestroy para limpiar la conexión al destruirse.
 */
@Injectable({ providedIn: 'root' })
export class StreamingSocketService implements OnDestroy {
  private socket: Socket | null = null;

  private newMessageSubject = new Subject<SocketMessage>();
  private newReactionSubject = new Subject<SocketReaction>();
  private viewerCountSubject = new BehaviorSubject<number>(0);
  private streamStatusSubject = new Subject<string>();
  private messagePendingSubject = new Subject<SocketMessage>();
  private reconnectSubject = new Subject<void>();

  /** Observable de nuevos mensajes de homenaje aprobados */
  newMessage$: Observable<SocketMessage> = this.newMessageSubject.asObservable();
  /** Observable de nuevas reacciones rápidas */
  newReaction$: Observable<SocketReaction> = this.newReactionSubject.asObservable();
  /** Observable del contador actual de espectadores (con valor inicial 0) */
  viewerCount$: Observable<number> = this.viewerCountSubject.asObservable();
  /** Observable de cambios de estado del stream */
  streamStatus$: Observable<string> = this.streamStatusSubject.asObservable();
  /** Observable de mensajes pendientes de moderación (solo admin) */
  messagePending$: Observable<SocketMessage> = this.messagePendingSubject.asObservable();
  /** Observable de reconexión del socket */
  reconnect$: Observable<void> = this.reconnectSubject.asObservable();

  /**
   * Establece la conexión Socket.IO y se suscribe a la sala del evento.
   * Si asAdmin es true, también se suscribe a la sala de administración
   * para recibir mensajes pendientes de moderación.
   *
   * @param eventId - Identificador del evento al que conectarse
   * @param asAdmin - Si true, también recibe eventos de moderación
   */
  connect(eventId: string, asAdmin = false): void {
    this.disconnect();

    this.socket = io(`${environment.wsUrl}/events`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join-event', { eventId });
      if (asAdmin) {
        this.socket?.emit('join-admin', { eventId });
      }
    });

    this.socket.on('new-message', (data: { message: SocketMessage }) => {
      this.newMessageSubject.next(data.message);
    });

    this.socket.on('new-reaction', (data: { reaction: SocketReaction }) => {
      this.newReactionSubject.next(data.reaction);
    });

    this.socket.on('viewer-count', (data: { count: number }) => {
      this.viewerCountSubject.next(data.count);
    });

    this.socket.on('stream-status', (data: { status: string }) => {
      this.streamStatusSubject.next(data.status);
    });

    this.socket.on('message-pending', (data: { message: SocketMessage }) => {
      this.messagePendingSubject.next(data.message);
    });

    this.socket.on('reconnect', () => {
      this.reconnectSubject.next();
    });
  }

  /**
   * Cierra la conexión Socket.IO y limpia todos los listeners.
   * Reinicia el contador de espectadores a 0.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.viewerCountSubject.next(0);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
