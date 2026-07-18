import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Subject, Observable } from 'rxjs';

/** Mensaje de homenaje aprobado recibido via WebSocket (Módulo 10: Libro de Homenajes). */
export interface ObituarySocketMessage {
  id: string;
  authorName: string;
  content: string;
  iconType: string | null;
  createdAt: string;
}

/**
 * Servicio cliente de Socket.IO para la página pública de obituario.
 *
 * A diferencia de streaming, el obituario es una página estática por defecto — este
 * servicio solo existe para reflejar en tiempo real los cambios de moderación
 * (RNF-TRIB-004: <2s) sin necesidad de recargar. Se conecta al mismo namespace `/events`
 * del gateway, pero se une a una sala `obituary:{id}` en vez de `event:{id}`.
 */
@Injectable({ providedIn: 'root' })
export class ObituarySocketService implements OnDestroy {
  private socket: Socket | null = null;

  private newMessageSubject = new Subject<ObituarySocketMessage>();

  /** Observable de nuevos mensajes de homenaje aprobados */
  newMessage$: Observable<ObituarySocketMessage> = this.newMessageSubject.asObservable();

  connect(obituaryId: string): void {
    this.disconnect();

    this.socket = io(`${environment.wsUrl}/events`, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join-obituary', { obituaryId });
    });

    this.socket.on('new-message', (data: { message: ObituarySocketMessage }) => {
      this.newMessageSubject.next(data.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
