import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  StreamingApiService,
  StreamingEvent,
  Message,
} from '../../../core/services/streaming-api.service';
import { StreamingSocketService } from '../../../core/services/streaming-socket.service';
import { InvitationsApiService } from '../../../core/services/invitations-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EventStatus } from '@zentic/shared-types';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { HlsPlayerComponent } from '../../../shared/molecules/hls-player/hls-player.component';
import { getErrorMessage } from '../../../core/utils/error-message';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    HlsPlayerComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }

      .detail-loading {
        display: flex;
        justify-content: center;
        padding: 4rem 0;
      }
      .detail-error {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-radius: 0.85rem;
        background: #fef2f2;
        color: #991b1b;
        font-size: 0.9rem;
      }

      .detail-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .detail-header__info {
        display: grid;
        gap: 0.3rem;
      }
      .detail-header__title {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.6rem;
        font-weight: 500;
        letter-spacing: 0;
        color: var(--ink, #1f2937);
      }
      .detail-header__subtitle {
        margin: 0;
        font-size: 0.92rem;
        color: var(--ink-secondary, #4b5563);
      }
      .detail-header__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--ink-secondary, #6b7280);
      }
      .detail-header__meta a {
        color: var(--brand-primary, #0f5e59);
        font-weight: 500;
      }
      .detail-header__meta a:hover {
        text-decoration: underline;
      }
      .detail-header__meta-item {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .detail-header__meta-item mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--muted-light, #9ca3af);
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .status-badge--SCHEDULED {
        background: #eff6ff;
        color: #1d4ed8;
      }
      .status-badge--LIVE {
        background: #f0fdf4;
        color: #15803d;
      }
      .status-badge--PAUSED {
        background: #fffbeb;
        color: #b45309;
      }
      .status-badge--FINISHED {
        background: #f9fafb;
        color: #4b5563;
      }
      .status-badge--CANCELLED {
        background: #fef2f2;
        color: #b91c1c;
      }
      .status-badge--INTERRUPTED {
        background: #fff7ed;
        color: #c2410c;
      }

      .control-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        border-radius: 1rem;
        background: var(--surface-alt, #fff);
        border: 1px solid var(--border, #e7e9ee);
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .control-bar__actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .control-bar__status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: var(--ink-secondary, #4b5563);
        margin-left: auto;
      }

      .live-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        background: #f0fdf4;
        color: #15803d;
        font-weight: 600;
        font-size: 0.82rem;
      }

      .live-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 999px;
        background: #16a34a;
        animation: livePulse 1.5s ease-in-out infinite;
      }

      @keyframes livePulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }

      .creds-card {
        border-radius: 1rem;
        background: var(--surface-alt, #fff);
        border: 1px solid var(--border, #e7e9ee);
        margin-bottom: 1.5rem;
        overflow: hidden;
      }

      .creds-card__header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-light, #f3f4f6);
        font-weight: 600;
        font-size: 0.92rem;
        color: var(--ink, #1f2937);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .creds-card__header mat-icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        color: var(--brand-primary, #0f5e59);
      }

      .creds-card__body {
        padding: 1rem 1.25rem;
        display: grid;
        gap: 1rem;
      }

      .creds-field {
      }
      .creds-field__label {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--ink-secondary, #6b7280);
        margin-bottom: 0.35rem;
        display: block;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .creds-field__row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .creds-field__value {
        flex: 1;
        padding: 0.6rem 0.85rem;
        background: var(--surface, #f9fafb);
        border: 1px solid var(--border-light, #f3f4f6);
        border-radius: 0.65rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.82rem;
        color: var(--ink, #1f2937);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .detail-tabs {
        display: flex;
        gap: 0.25rem;
        margin-bottom: 1rem;
        padding: 0.25rem;
        background: var(--surface, #f3f4f6);
        border-radius: 0.75rem;
      }

      .detail-tab {
        flex: 1;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.55rem;
        background: transparent;
        color: var(--ink-secondary, #6b7280);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-align: center;
        transition: all 150ms ease;
      }

      .detail-tab:hover {
        color: var(--ink, #1f2937);
      }
      .detail-tab--active {
        background: var(--surface-alt, #fff);
        color: var(--brand-primary, #0f5e59);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .chat-card {
        border-radius: 1rem;
        background: var(--surface-alt, #fff);
        border: 1px solid var(--border, #e7e9ee);
        overflow: hidden;
      }

      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid var(--border-light, #f3f4f6);
        background: var(--surface, #fafbfc);
      }

      .chat-header__title {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--ink, #1f2937);
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .chat-header__title mat-icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
        color: var(--brand-primary, #0f5e59);
      }
      .chat-header__actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .chat-filter-btn {
        padding: 0.3rem 0.65rem;
        border: 1px solid var(--border, #e7e9ee);
        border-radius: 0.5rem;
        background: var(--surface-alt, #fff);
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--ink-secondary, #6b7280);
        cursor: pointer;
        transition: all 150ms ease;
      }

      .chat-filter-btn:hover {
        border-color: var(--border-dark, #d1d5db);
        color: var(--ink, #1f2937);
      }
      .chat-filter-btn--active {
        background: var(--brand-primary, #0f5e59);
        color: #fff;
        border-color: var(--brand-primary, #0f5e59);
      }

      .chat-messages {
        height: 24rem;
        overflow-y: auto;
        padding: 0.75rem 1.25rem;
        display: grid;
        gap: 0.15rem;
        background: var(--surface, #fafbfc);
      }

      .chat-message {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.4rem 0.5rem;
        border-radius: 0.5rem;
        transition: background-color 100ms ease;
      }

      .chat-message:hover {
        background: rgba(255, 255, 255, 0.8);
      }
      .chat-message--pending {
        background: #fffbeb;
        border: 1px solid #fde68a;
      }

      .chat-message__icon {
        font-size: 1rem;
        flex-shrink: 0;
        line-height: 1.4;
      }
      .chat-message__author {
        font-weight: 600;
        font-size: 0.82rem;
        color: var(--ink, #1f2937);
      }
      .chat-message__text {
        font-size: 0.85rem;
        color: var(--ink-secondary, #374151);
        word-break: break-word;
      }
      .chat-message__time {
        font-size: 0.72rem;
        color: var(--muted-light, #9ca3af);
        margin-left: 0.35rem;
        flex-shrink: 0;
      }
      .chat-message__mod-actions {
        display: flex;
        gap: 0.15rem;
        margin-left: auto;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 100ms ease;
      }
      .chat-message:hover .chat-message__mod-actions {
        opacity: 1;
      }

      .chat-message__rejected {
        font-size: 0.72rem;
        color: #ef4444;
        margin-left: auto;
        flex-shrink: 0;
      }

      .chat-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
        color: var(--ink-secondary, #6b7280);
      }

      .chat-empty mat-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        margin-bottom: 0.75rem;
        color: var(--border-dark, #d1d5db);
      }
      .chat-empty p {
        margin: 0;
        font-size: 0.88rem;
      }
      .chat-empty p:first-of-type {
        font-weight: 500;
        color: var(--ink, #1f2937);
      }

      .preview-card {
        border-radius: 1rem;
        overflow: hidden;
        border: 1px solid var(--border, #e7e9ee);
        background: var(--surface-alt, #fff);
      }

      .preview-card__toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--border, #e7e9ee);
        background: var(--surface, #fafbfc);
      }

      .preview-card__context {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-width: 0;
      }

      .preview-card__context mat-icon {
        color: var(--brand-primary, #0f5e59);
      }

      .preview-card__copy {
        display: grid;
        gap: 0.1rem;
        min-width: 0;
      }

      .preview-card__copy strong {
        color: var(--ink, #1f2937);
        font-size: 0.88rem;
      }
      .preview-card__copy span {
        color: var(--ink-secondary, #6b7280);
        font-size: 0.76rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .preview-card iframe {
        width: 100%;
        height: min(72vh, 58rem);
        min-height: 34rem;
        display: block;
        border: 0;
        background: var(--surface, #f7f8fa);
      }

      @media (max-width: 640px) {
        .preview-card__toolbar {
          align-items: flex-start;
        }
        .preview-card iframe {
          height: 70vh;
          min-height: 28rem;
        }
      }

      .recording-card {
        border-radius: 1rem;
        overflow: hidden;
        border: 1px solid var(--border, #e7e9ee);
      }

      .recording-card video {
        display: block;
        width: 100%;
      }
      .recording-card__footer {
        padding: 1rem 1.25rem;
        font-size: 0.85rem;
        color: var(--ink-secondary, #6b7280);
      }

      .recording-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
      }

      .recording-empty mat-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        margin-bottom: 0.75rem;
        color: var(--border-dark, #d1d5db);
      }
      .recording-empty p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ink-secondary, #6b7280);
      }
    `,
  ],
  template: `
    <div class="detail-container" style="max-width:64rem; margin:0 auto;">
      @if (loading()) {
        <div class="detail-loading">
          <mat-spinner diameter="36" />
        </div>
      } @else if (error()) {
        <div class="detail-error" role="alert">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      } @else if (event(); as ev) {
        <div class="detail-header">
          <div class="detail-header__info">
            <h1 class="detail-header__title">{{ ev.title }}</h1>
            @if (ev.deceased) {
              <p class="detail-header__subtitle">
                En memoria de {{ ev.deceased.firstName }} {{ ev.deceased.lastName }}
              </p>
            }
            <div class="detail-header__meta">
              <span class="detail-header__meta-item">
                <mat-icon>calendar_today</mat-icon>
                {{ ev.scheduledAt | date: 'dd/MM/yyyy HH:mm' }}
              </span>
              @if (ev.room) {
                <a class="detail-header__meta-item" [routerLink]="['/admin/venues']">
                  <mat-icon>location_on</mat-icon>
                  {{ ev.room.venue.name }} · {{ ev.room.name }}
                </a>
              }
              @if (ev.client) {
                <a class="detail-header__meta-item" [routerLink]="['/admin/clients', ev.client.id]">
                  <mat-icon>person</mat-icon>
                  {{ ev.client.name }}
                </a>
              }
              @if (ev.assignedTo) {
                <span class="detail-header__meta-item">
                  <mat-icon>support_agent</mat-icon>
                  {{ ev.assignedTo.email }}
                </span>
              }
            </div>
          </div>
          <span class="status-badge" [class]="'status-badge--' + ev.status">
            <mat-icon
              *ngIf="ev.status === 'LIVE'"
              style="font-size:0.85rem;width:0.85rem;height:0.85rem;"
              >fiber_manual_record</mat-icon
            >
            {{ statusLabel(ev.status) }}
          </span>
        </div>

        @if (canManage()) {
          <div class="control-bar">
            <div class="control-bar__actions">
              @if (ev.status === 'SCHEDULED') {
                <button
                  mat-raised-button
                  color="primary"
                  (click)="startStream()"
                  [disabled]="streamLoading()"
                >
                  <mat-icon>play_arrow</mat-icon>
                  Iniciar transmisión
                </button>
              }
              @if (ev.status === 'LIVE' || ev.status === 'PAUSED') {
                <button
                  mat-raised-button
                  color="warn"
                  (click)="stopStream()"
                  [disabled]="streamLoading()"
                >
                  <mat-icon>stop</mat-icon>
                  Finalizar transmisión
                </button>
              }
              <button
                mat-stroked-button
                (click)="generateInvitation()"
                [disabled]="generatingInvitation()"
              >
                <mat-icon>mail</mat-icon>
                {{ generatingInvitation() ? 'Generando…' : 'Generar Invitación' }}
              </button>
            </div>
            @if (ev.status === 'LIVE') {
              <div class="control-bar__status">
                <span class="live-indicator">
                  <span class="live-dot"></span>
                  EN VIVO
                </span>
                <span style="color:var(--ink-secondary,#6b7280);font-size:0.85rem;"
                  >{{ viewerCount() }} espectadores</span
                >
              </div>
            }
            @if (streamLoading()) {
              <mat-spinner diameter="20" style="margin-left:auto;" />
            }
          </div>
        }

        @if (ev.status === 'SCHEDULED' && canManage()) {
          <div class="creds-card">
            <div class="creds-card__header">
              <mat-icon>vpn_key</mat-icon>
              Credenciales de transmisión
            </div>
            <div class="creds-card__body">
              <div class="creds-field">
                <span class="creds-field__label">Stream Key</span>
                <div class="creds-field__row">
                  <code class="creds-field__value" [matTooltip]="ev.streamKey!">{{
                    ev.streamKey
                  }}</code>
                  @if (credentialsRevealed()) {
                    <button
                      mat-icon-button
                      (click)="copyStreamKey(ev.streamKey!)"
                      matTooltip="Copiar"
                    >
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  } @else {
                    <button mat-button (click)="revealCredentials()">Revelar</button>
                  }
                </div>
              </div>
              <button mat-stroked-button (click)="rotateStreamKey()">
                <mat-icon>sync</mat-icon>
                Rotar stream key
              </button>
              <div class="creds-field">
                <span class="creds-field__label">RTMP URL</span>
                <div class="creds-field__row">
                  <code class="creds-field__value">{{ ev.rtmpUrl }}</code>
                  <button
                    mat-icon-button
                    (click)="copyToClipboard(ev.rtmpUrl!)"
                    matTooltip="Copiar"
                  >
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
              <div class="creds-field">
                <span class="creds-field__label">URL Pública</span>
                <div class="creds-field__row">
                  <code class="creds-field__value">{{ getPublicUrl() }}</code>
                  <button
                    mat-icon-button
                    (click)="copyToClipboard(getPublicUrl())"
                    matTooltip="Copiar"
                  >
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <div class="detail-tabs" role="tablist">
          @for (tab of tabs; track tab.key) {
            <button
              class="detail-tab"
              [class.detail-tab--active]="activeTab() === tab.key"
              (click)="activeTab.set(tab.key)"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.key"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        @if (activeTab() === 'messages') {
          <div class="chat-card">
            <div class="chat-header">
              <span class="chat-header__title">
                <mat-icon>forum</mat-icon>
                Chat en vivo
              </span>
              <div class="chat-header__actions">
                @if (canModerate()) {
                  <button
                    class="chat-filter-btn"
                    [class.chat-filter-btn--active]="!showingPending()"
                    (click)="showAllMessages()"
                  >
                    Todos
                  </button>
                  <button
                    class="chat-filter-btn"
                    [class.chat-filter-btn--active]="showingPending()"
                    (click)="showPendingMessages()"
                  >
                    Pendientes
                    @if (pendingCount() > 0) {
                      ({{ pendingCount() }})
                    }
                  </button>
                }
                @if (ev.status === 'LIVE') {
                  <span class="live-indicator" style="padding:0.25rem 0.6rem;">
                    <span class="live-dot"></span>
                    {{ viewerCount() }}
                  </span>
                }
              </div>
            </div>

            <div #chatContainer class="chat-messages">
              @if (messagesLoading()) {
                <div class="chat-empty">
                  <mat-spinner diameter="24" />
                </div>
              } @else if (messages().length === 0) {
                <div class="chat-empty">
                  <mat-icon>chat</mat-icon>
                  @if (ev.status === 'SCHEDULED') {
                    <p>El chat se activará cuando comience el evento</p>
                  } @else {
                    <p>No hay mensajes aún</p>
                    <p>Comparte el enlace para recibir homenajes</p>
                  }
                </div>
              } @else {
                @for (msg of messages(); track msg.id) {
                  <div
                    class="chat-message"
                    [class.chat-message--pending]="msg.status === 'PENDING'"
                  >
                    <span class="chat-message__icon">{{
                      iconMap[msg.iconType ?? ''] ?? '💬'
                    }}</span>
                    <div style="flex:1;min-width:0;">
                      <span class="chat-message__author">{{ msg.authorName }}</span>
                      <span class="chat-message__text">{{ msg.content }}</span>
                    </div>
                    <span class="chat-message__time">{{ msg.createdAt | date: 'HH:mm' }}</span>
                    @if (msg.status === 'PENDING' && canModerate()) {
                      <span class="chat-message__mod-actions">
                        <button
                          mat-icon-button
                          size="small"
                          (click)="approveMessage(msg.id)"
                          matTooltip="Aprobar"
                          style="color:#16a34a;"
                        >
                          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;"
                            >check_circle</mat-icon
                          >
                        </button>
                        <button
                          mat-icon-button
                          size="small"
                          (click)="rejectMessage(msg.id)"
                          matTooltip="Rechazar"
                          style="color:#dc2626;"
                        >
                          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;"
                            >cancel</mat-icon
                          >
                        </button>
                      </span>
                    }
                    @if (msg.status === 'REJECTED') {
                      <span class="chat-message__rejected">Rechazado</span>
                    }
                  </div>
                }
                <div #chatBottom></div>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'preview') {
          <div class="preview-card">
            <div class="preview-card__toolbar">
              <div class="preview-card__context">
                <mat-icon>public</mat-icon>
                <div class="preview-card__copy">
                  <strong>Vista del espectador</strong>
                  <span>{{ publicEventUrl() }}</span>
                </div>
              </div>
              <a mat-stroked-button [href]="publicEventUrl()" target="_blank" rel="noopener">
                <mat-icon>open_in_new</mat-icon>
                Abrir aparte
              </a>
            </div>
            <iframe
              [src]="previewUrl()"
              title="Vista previa del evento"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          </div>
        }

        @if (activeTab() === 'recording') {
          @if (ev.playbackUrl && (ev.status === 'LIVE' || ev.status === 'FINISHED')) {
            <div class="recording-card">
              <app-hls-player
                [src]="ev.playbackUrl"
                [posterUrl]="ev.deceased.photoUrl ?? ''"
                [mode]="ev.status === 'FINISHED' ? 'recording' : 'live'"
                (playbackRefreshRequested)="refreshPlaybackUrl()"
              >
                La grabación estará disponible cuando finalice el evento
              </app-hls-player>
              @if (ev.status === 'FINISHED') {
                <div class="recording-card__footer">
                  Grabación disponible — descárgala desde el panel de administración
                </div>
              }
            </div>
          } @else {
            <div class="recording-card">
              <div class="recording-empty">
                <mat-icon>videocam</mat-icon>
                @if (ev.status === 'LIVE') {
                  <p>La grabación estará disponible cuando finalice el evento</p>
                } @else if (ev.status === 'SCHEDULED') {
                  <p>El evento aún no ha iniciado</p>
                } @else {
                  <p>No hay grabación disponible</p>
                }
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(StreamingApiService);
  private readonly socket = inject(StreamingSocketService);
  private readonly invitationsApi = inject(InvitationsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authState = inject(AuthStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly event = signal<StreamingEvent | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly pendingCount = signal(0);
  readonly messagesLoading = signal(false);
  readonly streamLoading = signal(false);
  readonly generatingInvitation = signal(false);
  readonly viewerCount = signal(0);
  readonly activeTab = signal('messages');
  readonly showingPending = signal(false);

  readonly tabs = [
    { key: 'messages', label: 'Chat' },
    { key: 'preview', label: 'Vista previa' },
    { key: 'recording', label: 'Grabación' },
  ];

  readonly previewUrl = computed(() => {
    const url = this.publicEventUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly publicEventUrl = computed(() => {
    const ev = this.event();
    return ev ? `${window.location.origin}/e/${ev.slug}` : '';
  });

  readonly iconMap: Partial<Record<string, string>> = {
    HEART: '❤️',
    CANDLE: '🕯️',
    FLOWER: '🌸',
    DOVE: '🕊️',
    heart: '❤️',
    candle: '🕯️',
    flower: '🌸',
    dove: '🕊️',
  };

  readonly statusLabels: Record<string, string> = {
    SCHEDULED: 'Programado',
    LIVE: 'En vivo',
    PAUSED: 'Pausado',
    FINISHED: 'Finalizado',
    CANCELLED: 'Cancelado',
    INTERRUPTED: 'Interrumpido',
  };

  private readonly sanitizer = inject(DomSanitizer);
  private eventId = '';
  readonly credentialsRevealed = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (id) {
      this.eventId = id;
      this.loadEvent();

      this.socket.newMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
        this.messages.update((prev) => [...prev, msg as unknown as Message]);
      });

      this.socket.viewerCount$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((count) => {
        this.viewerCount.set(count);
        this.event.update((e) => (e ? { ...e, viewerCount: count } : e));
      });

      this.socket.streamStatus$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((status) => {
        this.event.update((e) => (e ? { ...e, status: status as EventStatus } : e));
      });

      this.socket.messagePending$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((msg) => {
        this.pendingCount.update((c) => c + 1);
        if (this.showingPending()) {
          this.messages.update((prev) => [...prev, msg as unknown as Message]);
        }
      });
    }

    this.destroyRef.onDestroy(() => {
      this.socket.disconnect();
    });
  }

  readonly canManage = computed(() => this.authState.hasPermission('streaming:manage'));

  readonly canModerate = computed(() => this.authState.hasPermission('streaming:moderate'));

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  // RF-INV-001: genera un borrador de invitación prellenado con los datos del evento — no hay
  // trigger automático al crear el evento, el operador lo dispara desde aquí.
  generateInvitation(): void {
    this.generatingInvitation.set(true);
    this.invitationsApi.create({ eventId: this.eventId }).subscribe({
      next: (invitation) => {
        this.generatingInvitation.set(false);
        void this.router.navigate(['/admin/invitations', invitation.id]);
      },
      error: () => {
        this.generatingInvitation.set(false);
        this.notifications.error('No se pudo generar la invitación. Inténtalo de nuevo.');
      },
    });
  }

  getPublicUrl(): string {
    const ev = this.event();
    return ev ? `${window.location.origin}/e/${ev.slug}` : '';
  }

  copyToClipboard(value: string): void {
    void navigator.clipboard
      .writeText(value)
      .then(() => this.notifications.success('Copiado al portapapeles'))
      .catch(() => this.notifications.error('No se pudo copiar al portapapeles'));
  }

  copyStreamKey(value: string): void {
    this.api
      .auditStreamKeyCopy(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.copyToClipboard(value),
        error: () => this.notifications.error('No fue posible registrar la copia'),
      });
  }

  revealCredentials(): void {
    this.api
      .revealCredentials(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials) => {
          this.credentialsRevealed.set(true);
          this.event.update((event) => (event ? { ...event, ...credentials } : event));
        },
        error: () => this.notifications.error('No fue posible revelar las credenciales'),
      });
  }

  rotateStreamKey(): void {
    this.api
      .rotateStreamKey(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials) => {
          this.credentialsRevealed.set(true);
          this.event.update((event) => (event ? { ...event, ...credentials } : event));
          this.notifications.success('Stream key rotada');
        },
        error: () => this.notifications.error('No fue posible rotar la stream key'),
      });
  }

  showAllMessages(): void {
    this.showingPending.set(false);
    this.loadMessages();
  }

  showPendingMessages(): void {
    this.showingPending.set(true);
    this.loadPendingMessages();
  }

  startStream(): void {
    this.streamLoading.set(true);
    this.api
      .startStream(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.streamLoading.set(false);
          this.socket.connect(this.eventId, true);
          this.notifications.success('Transmisión iniciada');
        },
        error: (error: unknown) => {
          this.streamLoading.set(false);
          this.notifications.apiError(error, 'No se pudo iniciar la transmisión');
        },
      });
  }

  stopStream(): void {
    this.streamLoading.set(true);
    this.api
      .stopStream(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.streamLoading.set(false);
          this.socket.disconnect();
          this.notifications.success('Transmisión finalizada');
        },
        error: (error: unknown) => {
          this.streamLoading.set(false);
          this.notifications.apiError(error, 'No se pudo finalizar la transmisión');
        },
      });
  }

  loadMessages(): void {
    this.messagesLoading.set(true);
    this.api
      .getMessages(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          this.messagesLoading.set(false);
        },
        error: (error: unknown) => {
          this.messagesLoading.set(false);
          this.notifications.apiError(error, 'No se pudieron cargar los mensajes');
        },
      });
  }

  loadPendingMessages(): void {
    this.messagesLoading.set(true);
    this.api
      .getPendingMessages(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (msgs) => {
          this.messages.set(msgs);
          this.pendingCount.set(msgs.length);
          this.messagesLoading.set(false);
        },
        error: (error: unknown) => {
          this.messagesLoading.set(false);
          this.notifications.apiError(error, 'No se pudieron cargar los mensajes pendientes');
        },
      });
  }

  refreshPlaybackUrl(): void {
    this.loadEvent();
  }

  approveMessage(messageId: string): void {
    this.api
      .approveMessage(this.eventId, messageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.update((prev) => prev.filter((m) => m.id !== messageId));
          this.pendingCount.update((c) => Math.max(0, c - 1));
          this.notifications.success('Mensaje aprobado');
        },
        error: () => this.notifications.error('No se pudo aprobar el mensaje'),
      });
  }

  rejectMessage(messageId: string): void {
    this.api
      .rejectMessage(this.eventId, messageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.update((prev) => prev.filter((m) => m.id !== messageId));
          this.pendingCount.update((c) => Math.max(0, c - 1));
          this.notifications.success('Mensaje rechazado');
        },
        error: () => this.notifications.error('No se pudo rechazar el mensaje'),
      });
  }

  private loadEvent(): void {
    this.loading.set(true);
    this.api
      .findOne(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.loading.set(false);
          this.loadMessages();

          if (ev.status === EventStatus.SCHEDULED && this.canManage()) {
            this.loadCredentials();
          }

          if (ev.status === EventStatus.LIVE || ev.status === EventStatus.PAUSED) {
            this.socket.connect(this.eventId, true);
          }
        },
        error: (error: unknown) => {
          this.error.set(getErrorMessage(error, 'No se pudo cargar el evento'));
          this.loading.set(false);
        },
      });
  }

  private loadCredentials(): void {
    this.api
      .getCredentials(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials) => {
          this.event.update((event) => (event ? { ...event, ...credentials } : event));
        },
        error: () => {
          this.notifications.error('No fue posible cargar las credenciales');
        },
      });
  }
}
