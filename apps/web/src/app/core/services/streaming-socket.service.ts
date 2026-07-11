import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface SocketMessage {
  id: string;
  authorName: string;
  content: string;
  iconType: string | null;
  createdAt: string;
}

export interface SocketReaction {
  type: string;
  icon: string;
}

export interface SocketViewerCount {
  eventId: string;
  tenantId: string;
  count: number;
}

export interface SocketStreamStatus {
  eventId: string;
  tenantId: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class StreamingSocketService implements OnDestroy {
  private socket: Socket | null = null;

  private newMessageSubject = new Subject<SocketMessage>();
  private newReactionSubject = new Subject<SocketReaction>();
  private viewerCountSubject = new BehaviorSubject<number>(0);
  private streamStatusSubject = new Subject<string>();
  private messagePendingSubject = new Subject<SocketMessage>();

  newMessage$: Observable<SocketMessage> = this.newMessageSubject.asObservable();
  newReaction$: Observable<SocketReaction> = this.newReactionSubject.asObservable();
  viewerCount$: Observable<number> = this.viewerCountSubject.asObservable();
  streamStatus$: Observable<string> = this.streamStatusSubject.asObservable();
  messagePending$: Observable<SocketMessage> = this.messagePendingSubject.asObservable();

  connect(eventId: string, asAdmin = false): void {
    this.disconnect();

    this.socket = io(`${environment.wsUrl}/events`, {
      transports: ['websocket', 'polling'],
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
  }

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
