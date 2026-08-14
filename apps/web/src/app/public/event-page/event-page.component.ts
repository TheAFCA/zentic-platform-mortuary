import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StreamingApiService, PublicEvent } from '../../core/services/streaming-api.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  StreamingSocketService,
  SocketMessage,
} from '../../core/services/streaming-socket.service';
import { EventStatus } from '@zentic/shared-types';
import { HlsPlayerComponent } from '../../shared/molecules/hls-player/hls-player.component';
import { PoweredByBadgeComponent } from '../../shared/atoms/powered-by-badge/powered-by-badge.component';
import { getErrorMessage } from '../../core/utils/error-message';

/** Iconos de reacción rápida disponibles */
const REACTION_ICONS = [
  { type: 'heart', icon: '❤️', label: 'Corazón' },
  { type: 'candle', icon: '🕯️', label: 'Vela' },
  { type: 'flower', icon: '🌸', label: 'Flor' },
  { type: 'dove', icon: '🕊️', label: 'Paloma' },
];

/**
 * Página pública de evento de streaming.
 *
 * Accesible sin autenticación en la ruta `/e/:slug`.
 * Proporciona la experiencia completa para familiares y amigos:
 * - Reproductor de video en vivo (o grabación si finalizó)
 * - Información del difunto
 * - Reacciones rápidas con animaciones
 * - Mensajes de homenaje en tiempo real via Socket.IO
 * - Formulario de código de acceso para eventos privados
 * - Botones para compartir (WhatsApp, email, copiar enlace)
 *
 * @remarks
 * Si el evento requiere código de acceso, muestra un formulario
 * inicial antes de revelar el contenido. Al acceder exitosamente,
 * se conecta al Socket.IO para recibir actualizaciones en vivo.
 */
@Component({
  selector: 'app-event-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    HlsPlayerComponent,
    PoweredByBadgeComponent,
  ],
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    /* ── Twitch Dark Theme Tokens ── */
    .stream-room {
      --bg-body: #0e0e10;
      --bg-surface: #18181b;
      --bg-elevated: #1f1f23;
      --bg-hover: #26262c;
      --bg-active: #2b2b30;
      --border: #2f2f35;
      --text-primary: #efeff1;
      --text-secondary: #adadb8;
      --text-muted: #777781;
      --brand: var(--brand-primary, #9147ff);
      --red: #eb0400;

      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-body);
      color: var(--text-primary);
    }

    /* ── Top Nav ── */
    .stream-room__topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 3.125rem;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
    }
    .stream-room__nav {
      display: flex;
      align-items: center;
      height: 100%;
      padding: 0 1rem;
      gap: 1rem;
    }
    .stream-room__nav-logo {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary);
    }
    .stream-room__nav-logo img {
      height: 1.75rem;
    }
    .stream-room__nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: 1.5rem;
    }
    .stream-room__nav-links a {
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-decoration: none;
    }
    .stream-room__nav-links a:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
    .stream-room__nav-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .stream-room__nav-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    .stream-room__nav-btn:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
    .stream-room__nav-btn mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }

    /* ── Layout (sidebar | main | chat) ── */
    .stream-room__body {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .stream-room__sidebar {
      width: 15rem;
      flex-shrink: 0;
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      padding: 0.75rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      overflow-y: auto;
    }
    .stream-room__sidebar-label {
      color: var(--text-secondary);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.5rem 0.5rem 0.25rem;
    }
    .stream-room__sidebar-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.4375rem 0.5rem;
      border-radius: 0.25rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 400;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
    }
    .stream-room__sidebar-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .stream-room__sidebar-item--active {
      background: var(--bg-active);
      color: var(--text-primary);
    }
    .stream-room__sidebar-item mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
      flex-shrink: 0;
    }

    /* ── Main Content ── */
    .stream-room__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    /* ── Video Player ── */
    .stream-room__player {
      position: relative;
      background: #000;
      width: 100%;
      aspect-ratio: 16 / 9;
      max-height: calc(100vh - 3.125rem - 10rem);
      overflow: hidden;
    }
    .stream-room__player app-hls-player {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* Override hls-player border-radius en este contexto de ancho completo. También se
       anula su aspect-ratio propio: como este wrapper ya fija 16:9 + max-height, dejar
       que el componente recalculara SU aspect-ratio a partir del ancho (ignorando el
       max-height del padre) lo hacía más alto de lo permitido y se desbordaba tapando
       el contenido de abajo (perfil del difunto) — aquí solo debe llenar el espacio ya
       calculado por el padre. */
    .stream-room__player ::ng-deep .hls-player {
      border-radius: 0 !important;
      aspect-ratio: unset;
      height: 100%;
    }
    .stream-room__player-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      gap: 0.5rem;
    }
    .stream-room__player-placeholder mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      opacity: 0.6;
    }
    /* ── Metadata (channel info below player) ── */
    .stream-room__metadata {
      padding: 1rem 1.5rem;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .stream-room__metadata-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .stream-room__metadata-avatar-fallback {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: var(--bg-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stream-room__metadata-avatar-fallback mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--text-muted);
    }
    .stream-room__metadata-body {
      flex: 1;
      min-width: 0;
    }
    .stream-room__metadata-top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .stream-room__metadata-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .stream-room__live-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--red);
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.125rem 0.4375rem;
      border-radius: 0.125rem;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .stream-room__live-dot {
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 50%;
      background: #fff;
    }
    .stream-room__metadata-deceased {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: 0.125rem;
    }
    .stream-room__metadata-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .stream-room__metadata-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .stream-room__metadata-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .stream-room__metadata-share {
      background: none;
      border: none;
      color: var(--text-secondary);
      width: 2rem;
      height: 2rem;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .stream-room__metadata-share:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .stream-room__metadata-share mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }
    .stream-room__viewer-count {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-muted);
    }
    .stream-room__viewer-count mat-icon {
      font-size: 0.875rem;
      width: 0.875rem;
      height: 0.875rem;
    }

    /* ── Info Sections ── */
    .stream-room__info {
      padding: 1rem 1.5rem;
    }
    .stream-room__about,
    .stream-room__reactions {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .stream-room__about h2 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 0.75rem;
    }
    .stream-room__about p {
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }
    .stream-room__about-content {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .stream-room__about-avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .stream-room__about-avatar-fallback {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: var(--bg-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stream-room__about-avatar-fallback mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: var(--text-muted);
    }
    .stream-room__about-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .stream-room__about-dates {
      color: var(--text-secondary);
      font-size: 0.8125rem;
      margin-top: 0.125rem;
    }
    .stream-room__about-epitaph {
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .stream-room__reactions p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0 0 0.75rem;
    }
    .stream-room__reactions-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .stream-room__reaction-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: transform 0.15s;
    }
    .stream-room__reaction-btn:hover {
      transform: scale(1.25);
    }
    .stream-room__reaction-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }
    .stream-room__reaction-cooldown {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.375rem;
    }

    /* ── Chat Column ── */
    .stream-room__chat {
      width: 21.25rem;
      flex-shrink: 0;
      background: var(--bg-surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: calc(100vh - 3.125rem);
      position: sticky;
      top: 3.125rem;
    }
    .stream-room__chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      min-height: 3rem;
    }
    .stream-room__chat-header h3 {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-primary);
      margin: 0;
    }
    .stream-room__chat-header-actions {
      display: flex;
      gap: 0.25rem;
    }
    .stream-room__chat-header-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .stream-room__chat-header-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .stream-room__chat-header-btn mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }
    .stream-room__messages {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-body);
      padding: 0.5rem 0;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }
    .stream-room__messages::-webkit-scrollbar {
      width: 0.375rem;
    }
    .stream-room__messages::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 0.1875rem;
    }
    .stream-room__messages-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-muted);
      font-size: 0.8125rem;
      padding: 2rem;
      text-align: center;
    }
    .stream-room__message {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.25rem 1rem;
      font-size: 0.8125rem;
      transition: background 0.1s;
    }
    .stream-room__message:hover {
      background: var(--bg-hover);
    }
    .stream-room__message-icon {
      font-size: 1rem;
      line-height: 1.4;
      flex-shrink: 0;
    }
    .stream-room__message-body {
      flex: 1;
      min-width: 0;
    }
    .stream-room__message-author {
      font-weight: 600;
      color: color-mix(in srgb, var(--brand-primary, #9147ff) 55%, white);
    }
    .stream-room__message-text {
      color: var(--text-primary);
      word-break: break-word;
    }
    .stream-room__message-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
      margin-top: 0.125rem;
    }

    /* ── Composer ── */
    .stream-room__composer {
      border-top: 1px solid var(--border);
      padding: 0.75rem 1rem;
      background: var(--bg-surface);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .stream-room__composer-input {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .stream-room__composer-field {
      flex: 1;
      position: relative;
    }
    .stream-room__composer-field input {
      width: 100%;
      background: var(--bg-body);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      color: var(--text-primary);
      outline: none;
    }
    .stream-room__composer-field input:focus {
      border-color: var(--brand);
    }
    .stream-room__composer-field input::placeholder {
      color: var(--text-muted);
    }
    .stream-room__composer-send {
      background: var(--brand);
      border: none;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .stream-room__composer-send:hover {
      opacity: 0.9;
    }
    .stream-room__composer-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .stream-room__composer-name {
      display: flex;
      gap: 0.5rem;
    }
    .stream-room__composer-name input {
      flex: 1;
      background: var(--bg-body);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      color: var(--text-primary);
      outline: none;
    }
    .stream-room__composer-name input:focus {
      border-color: var(--brand);
    }
    .stream-room__composer-name input::placeholder {
      color: var(--text-muted);
    }

    /* ── Access Code Overlay ── */
    .stream-room__access {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .stream-room__access-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      width: 100%;
      max-width: 24rem;
      padding: 2rem;
    }
    .stream-room__access-logo {
      height: 3rem;
      margin: 0 auto 1rem;
      display: block;
    }
    .stream-room__access-title {
      font-size: 1.25rem;
      font-weight: 700;
      text-align: center;
      color: var(--text-primary);
      margin: 0 0 0.375rem;
    }
    .stream-room__access-subtitle {
      font-size: 0.875rem;
      text-align: center;
      color: var(--text-secondary);
      margin: 0 0 1.5rem;
    }
    .stream-room__access-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .stream-room__access-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stream-room__access-field label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .stream-room__access-field input {
      width: 100%;
      background: var(--bg-body);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: var(--text-primary);
      outline: none;
    }
    .stream-room__access-field input:focus {
      border-color: var(--brand);
    }
    .stream-room__access-submit {
      background: var(--brand);
      border: none;
      color: #fff;
      padding: 0.625rem 1rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    }
    .stream-room__access-submit:hover {
      opacity: 0.9;
    }
    .stream-room__access-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .stream-room__access-error {
      color: #f87171;
      font-size: 0.8125rem;
      text-align: center;
    }
    .stream-room__loading {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-body);
    }
    .stream-room__error {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-body);
      color: var(--text-primary);
    }
    .stream-room__error-content {
      text-align: center;
    }
    .stream-room__error-content h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
    }
    .stream-room__error-content p {
      color: var(--text-secondary);
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .stream-room__sidebar {
        display: none;
      }
    }
    @media (max-width: 800px) {
      .stream-room__body {
        flex-direction: column;
      }
      .stream-room__chat {
        width: 100%;
        height: 24rem;
        position: static;
        border-left: none;
        border-top: 1px solid var(--border);
      }
      .stream-room__metadata {
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
      }
      .stream-room__info {
        padding: 0.75rem 1rem;
      }
    }
  `,
  template: `
    <app-powered-by-badge />
    @if (loading()) {
      <div class="stream-room__loading">
        <mat-spinner diameter="40" />
      </div>
    } @else if (error()) {
      <div class="stream-room__error" role="alert">
        <div class="stream-room__error-content">
          <h1>Evento no encontrado</h1>
          <p>{{ error() }}</p>
        </div>
      </div>
    } @else if (evt(); as event) {
      @if (!accessGranted()) {
        <!-- Access Code Overlay -->
        <div class="stream-room__access">
          <div class="stream-room__access-card">
            @if (event.tenant.brandConfig?.logoUrl) {
              <img
                [src]="event.tenant.brandConfig?.logoUrl"
                class="stream-room__access-logo"
                alt="Logo"
              />
            }
            <h2 class="stream-room__access-title">{{ event.title }}</h2>
            <p class="stream-room__access-subtitle">
              Ingresa el código de acceso para ver el evento
            </p>

            <form
              [formGroup]="accessForm"
              (ngSubmit)="submitAccessCode()"
              class="stream-room__access-form"
            >
              <div class="stream-room__access-field">
                <label for="access-name">Tu nombre</label>
                <input id="access-name" formControlName="name" placeholder="Nombre completo" />
              </div>
              <div class="stream-room__access-field">
                <label for="access-email">Email (opcional)</label>
                <input
                  id="access-email"
                  type="email"
                  formControlName="email"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div class="stream-room__access-field">
                <label for="access-code">Código de acceso</label>
                <input
                  id="access-code"
                  formControlName="code"
                  placeholder="Ej: FAMILIA2026"
                  required
                />
              </div>

              <button
                class="stream-room__access-submit"
                type="submit"
                [disabled]="accessLoading() || accessForm.invalid"
              >
                @if (accessLoading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  Acceder al evento
                }
              </button>

              @if (accessError()) {
                <p class="stream-room__access-error" role="alert">{{ accessError() }}</p>
              }
            </form>
          </div>
        </div>
      } @else {
        <!-- Full Twitch‑style event page -->
        <div class="stream-room">
          <!-- ── Top Nav ── -->
          <header class="stream-room__topbar">
            <div class="stream-room__nav">
              <div class="stream-room__nav-logo">
                @if (event.tenant.brandConfig?.logoUrl) {
                  <img [src]="event.tenant.brandConfig?.logoUrl" alt="Logo" />
                }
                <span>{{ event.tenant.name }}</span>
              </div>
              <div class="stream-room__nav-actions">
                <button
                  class="stream-room__nav-btn"
                  (click)="shareWhatsApp()"
                  matTooltip="Compartir por WhatsApp"
                >
                  <mat-icon>chat</mat-icon>
                </button>
                <button
                  class="stream-room__nav-btn"
                  (click)="shareEmail()"
                  matTooltip="Compartir por email"
                >
                  <mat-icon>email</mat-icon>
                </button>
                <button
                  class="stream-room__nav-btn"
                  (click)="copyLink()"
                  matTooltip="Copiar enlace"
                >
                  <mat-icon>link</mat-icon>
                </button>
              </div>
            </div>
          </header>

          <!-- ── Body: sidebar / main / chat ── -->
          <div class="stream-room__body">
            <!-- Sidebar -->
            <aside class="stream-room__sidebar" aria-label="Navegación del evento">
              <span class="stream-room__sidebar-label">Este homenaje</span>
              <button
                class="stream-room__sidebar-item stream-room__sidebar-item--active"
                type="button"
              >
                <mat-icon>play_circle</mat-icon>
                Ver transmisión
              </button>
              <button class="stream-room__sidebar-item" type="button">
                <mat-icon>favorite_border</mat-icon>
                Mensajes
              </button>
              <button class="stream-room__sidebar-item" type="button">
                <mat-icon>info_outline</mat-icon>
                Información
              </button>
            </aside>

            <!-- Main Content -->
            <div class="stream-room__main">
              <!-- Player -->
              <section class="stream-room__player" aria-label="Reproductor de transmisión">
                @if (
                  event.status === 'LIVE' ||
                  event.status === 'FINISHED' ||
                  event.status === 'INTERRUPTED'
                ) {
                  <app-hls-player
                    [src]="event.playbackUrl"
                    [posterUrl]="event.deceased?.photoUrl ?? ''"
                    [mode]="event.status === 'LIVE' ? 'live' : 'recording'"
                    (playbackRefreshRequested)="refreshPlaybackUrl()"
                  />
                } @else {
                  <div class="stream-room__player-placeholder">
                    <mat-icon>play_circle</mat-icon>
                    <p>Transmisión en espera</p>
                    <p>El reproductor iniciará automáticamente cuando comience la transmisión.</p>
                    @if (event.scheduledAt) {
                      <p>Programado para {{ event.scheduledAt | date: 'dd/MM/yyyy, HH:mm' }}</p>
                    }
                  </div>
                }
              </section>

              <!-- Metadata -->
              <section class="stream-room__metadata">
                @if (event.deceased?.photoUrl) {
                  <img
                    [src]="event.deceased?.photoUrl"
                    class="stream-room__metadata-avatar"
                    alt=""
                  />
                } @else {
                  <div class="stream-room__metadata-avatar-fallback">
                    <mat-icon>person</mat-icon>
                  </div>
                }
                <div class="stream-room__metadata-body">
                  <div class="stream-room__metadata-top">
                    <h1 class="stream-room__metadata-title">{{ event.title }}</h1>
                    @if (event.status === 'LIVE') {
                      <span class="stream-room__live-badge">
                        <span class="stream-room__live-dot"></span>
                        EN DIRECTO
                      </span>
                    }
                  </div>
                  @if (event.deceased; as deceased) {
                    <p class="stream-room__metadata-deceased">
                      Homenaje a {{ deceased.firstName }} {{ deceased.lastName }}
                    </p>
                  }
                  <div class="stream-room__metadata-meta">
                    @if (event.status === 'LIVE') {
                      <span class="stream-room__viewer-count">
                        <mat-icon>people</mat-icon>
                        {{ viewerCount() }} espectadores
                      </span>
                    } @else if (event.scheduledAt) {
                      <span>Programado: {{ event.scheduledAt | date: 'dd/MM/yyyy, HH:mm' }}</span>
                    }
                    <span>{{ event.ceremonyType | titlecase }}</span>
                  </div>
                </div>
                <div class="stream-room__metadata-actions">
                  <button
                    class="stream-room__metadata-share"
                    (click)="copyLink()"
                    matTooltip="Compartir enlace"
                    aria-label="Compartir enlace"
                  >
                    <mat-icon>share</mat-icon>
                  </button>
                </div>
              </section>

              <!-- Info sections -->
              <div class="stream-room__info">
                <!-- Deceased about -->
                @if (event.deceased; as deceased) {
                  <section class="stream-room__about">
                    <h2>Acerca del homenaje</h2>
                    <div class="stream-room__about-content">
                      @if (deceased.photoUrl) {
                        <img [src]="deceased.photoUrl" class="stream-room__about-avatar" alt="" />
                      } @else {
                        <div class="stream-room__about-avatar-fallback">
                          <mat-icon>person</mat-icon>
                        </div>
                      }
                      <div>
                        <p class="stream-room__about-name">
                          {{ deceased.firstName }} {{ deceased.lastName }}
                        </p>
                        @if (deceased.birthDate || deceased.deathDate) {
                          <p class="stream-room__about-dates">
                            @if (deceased.birthDate) {
                              {{ deceased.birthDate | date: 'dd/MM/yyyy' }}
                            }
                            @if (deceased.birthDate && deceased.deathDate) {
                              –
                            }
                            @if (deceased.deathDate) {
                              {{ deceased.deathDate | date: 'dd/MM/yyyy' }}
                            }
                          </p>
                        }
                        @if (deceased.epitaph) {
                          <p class="stream-room__about-epitaph">"{{ deceased.epitaph }}"</p>
                        }
                      </div>
                    </div>
                  </section>
                }

                <!-- Reactions -->
                @if (event.status === 'LIVE') {
                  <section class="stream-room__reactions">
                    <p>Envía tu reacción</p>
                    <div class="stream-room__reactions-buttons">
                      @for (reaction of reactions; track reaction.type) {
                        <button
                          class="stream-room__reaction-btn"
                          (click)="sendReaction(reaction.type)"
                          [disabled]="reactionCooldown()"
                        >
                          {{ reaction.icon }}
                        </button>
                      }
                    </div>
                    @if (reactionCooldown()) {
                      <p class="stream-room__reaction-cooldown">Espera un momento...</p>
                    }
                  </section>
                }
              </div>
            </div>

            <!-- Chat -->
            <aside class="stream-room__chat">
              <div class="stream-room__chat-header">
                <h3>Chat del evento</h3>
                <div class="stream-room__chat-header-actions">
                  <button
                    class="stream-room__chat-header-btn"
                    matTooltip="Configuración del chat"
                    aria-label="Configuración del chat"
                  >
                    <mat-icon>settings</mat-icon>
                  </button>
                </div>
              </div>

              <div class="stream-room__messages">
                @for (msg of messages(); track msg.id) {
                  <div class="stream-room__message">
                    <span class="stream-room__message-icon">{{
                      iconMap[msg.iconType ?? ''] ?? '💬'
                    }}</span>
                    <div class="stream-room__message-body">
                      <span class="stream-room__message-author">{{ msg.authorName }}</span>
                      <span class="stream-room__message-text">{{ msg.content }}</span>
                      <div class="stream-room__message-time">
                        {{ msg.createdAt | date: 'dd/MM HH:mm' }}
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="stream-room__messages-empty">
                    @if (event.status === 'SCHEDULED') {
                      Los mensajes se habilitarán cuando el evento comience
                    } @else {
                      No hay mensajes aún. ¡Sé el primero en escribir!
                    }
                  </div>
                }
              </div>

              <form
                [formGroup]="messageForm"
                (ngSubmit)="submitMessage()"
                class="stream-room__composer"
              >
                <div class="stream-room__composer-name">
                  <input formControlName="authorName" placeholder="Tu nombre" required />
                </div>
                <div class="stream-room__composer-input">
                  <div class="stream-room__composer-field">
                    <input
                      formControlName="content"
                      placeholder="Escribe tu mensaje..."
                      required
                      maxlength="500"
                    />
                  </div>
                  <button
                    class="stream-room__composer-send"
                    type="submit"
                    [disabled]="messageSending() || messageForm.invalid"
                  >
                    @if (messageSending()) {
                      <mat-spinner diameter="16" />
                    } @else {
                      Enviar
                    }
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StreamingApiService);
  private readonly socket = inject(StreamingSocketService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Indica si los datos del evento están cargando */
  readonly loading = signal(true);
  /** Mensaje de error si el evento no existe */
  readonly error = signal('');
  /** Datos públicos del evento */
  readonly evt = signal<PublicEvent | null>(null);
  /** Indica si el acceso fue concedido (evento público o código válido) */
  readonly accessGranted = signal(false);
  /** Indica si la validación del código está en curso */
  readonly accessLoading = signal(false);
  /** Mensaje de error en la validación del código */
  readonly accessError = signal('');
  /** Lista de mensajes de homenaje */
  readonly messages = signal<SocketMessage[]>([]);
  /** Contador de espectadores en vivo */
  readonly viewerCount = signal(0);
  /** Indica si se está enviando un mensaje */
  readonly messageSending = signal(false);
  /** Indica si el botón de reacción está en cooldown */
  readonly reactionCooldown = signal(false);

  /** Lista de tipos de reacción disponibles */
  readonly reactions = REACTION_ICONS;

  /** Mapa de iconos por tipo */
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

  /** Formulario de código de acceso */
  accessForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    code: ['', Validators.required],
  });

  /** Formulario de envío de mensaje */
  messageForm = this.fb.nonNullable.group({
    authorName: ['', Validators.required],
    content: ['', [Validators.required, Validators.maxLength(500)]],
  });

  private slug = '';
  private eventId = '';
  private playbackRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private playbackRefreshInFlight = false;
  private lastMessageTimestamp = '';

  constructor() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (this.slug) this.loadPublicEvent();

    this.socket.newMessage$.subscribe((msg) => {
      this.messages.update((prev) =>
        prev.some((current) => current.id === msg.id) ? prev : [...prev, msg],
      );
      this.lastMessageTimestamp = msg.createdAt;
    });

    this.socket.viewerCount$.subscribe((count) => {
      this.viewerCount.set(count);
    });

    this.socket.streamStatus$.subscribe((status) => {
      const prevStatus = this.evt()?.status as string | undefined;
      this.evt.update((e) => (e ? { ...e, status: status as EventStatus } : e));
      if (prevStatus === 'LIVE' && (status === 'FINISHED' || status === 'INTERRUPTED')) {
        this.pollRecordingUrl();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearPlaybackRefreshTimer();
      this.cancelPoll();
    });
  }

  /** Carga los datos públicos del evento desde la API */
  loadPublicEvent(): void {
    const previouslyGranted = this.accessGranted();
    this.loading.set(true);
    this.api.findPublic(this.slug).subscribe({
      next: (ev) => {
        this.evt.set(ev);
        this.schedulePlaybackRefresh(ev);
        this.loading.set(false);
        this.eventId = ev.id ?? '';

        if ((ev.isPublic || previouslyGranted) && ev.id) {
          this.accessGranted.set(true);
          this.accessLoading.set(false);
          this.loadMessages();
          this.connectSocket();
        }

        if (
          (ev.status === EventStatus.FINISHED || ev.status === EventStatus.INTERRUPTED) &&
          !ev.recordingReady
        ) {
          this.pollRecordingUrl();
        }
      },
      error: (error: unknown) => {
        this.error.set(getErrorMessage(error, 'Evento no encontrado'));
        this.loading.set(false);
        this.accessLoading.set(false);
      },
    });
  }

  refreshPlaybackUrl(): void {
    if (this.playbackRefreshInFlight || !this.accessGranted()) return;

    this.playbackRefreshInFlight = true;
    this.api.getPlayback(this.slug).subscribe({
      next: ({ url }) => {
        this.evt.update((event) => (event ? { ...event, playbackUrl: url } : event));
        this.playbackRefreshInFlight = false;
      },
      error: () => {
        this.playbackRefreshInFlight = false;
      },
    });
  }

  private schedulePlaybackRefresh(event: PublicEvent): void {
    this.clearPlaybackRefreshTimer();
    const hasPrivatePlayback =
      !event.isPublic &&
      Boolean(event.playbackUrl) &&
      (event.status === EventStatus.LIVE ||
        event.status === EventStatus.FINISHED ||
        event.status === EventStatus.INTERRUPTED);
    if (!hasPrivatePlayback) return;

    this.playbackRefreshTimer = setInterval(() => this.refreshPlaybackUrl(), 45 * 60 * 1000);
  }

  private pollAttempts = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private pollRecordingUrl(): void {
    this.cancelPoll();
    this.pollAttempts = 0;
    this.schedulePoll();
  }

  private schedulePoll(): void {
    const delay = [2_000, 5_000, 10_000, 30_000][this.pollAttempts] ?? 60_000;
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      this.api.findPublic(this.slug).subscribe({
        next: (ev) => {
          if (ev.recordingReady) {
            this.evt.set(ev);
            this.pollAttempts = 0;
            return;
          }
          if (this.pollAttempts < 8) {
            this.pollAttempts++;
            this.schedulePoll();
          }
        },
        error: () => {
          if (this.pollAttempts < 8) {
            this.pollAttempts++;
            this.schedulePoll();
          }
        },
      });
    }, delay);
  }

  private cancelPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.pollAttempts = 0;
  }

  private clearPlaybackRefreshTimer(): void {
    if (!this.playbackRefreshTimer) return;
    clearInterval(this.playbackRefreshTimer);
    this.playbackRefreshTimer = null;
  }

  /** Valida el código de acceso y concede acceso si es correcto */
  submitAccessCode(): void {
    if (this.accessForm.invalid || this.accessLoading()) return;
    this.accessLoading.set(true);
    this.accessError.set('');

    this.api
      .validateAccessCode(this.slug, {
        code: this.accessForm.controls.code.value,
        name: this.accessForm.controls.name.value || undefined,
        email: this.accessForm.controls.email.value || undefined,
        consent: true,
      })
      .subscribe({
        next: (res) => {
          this.accessGranted.set(true);
          this.eventId = res.eventId;
          this.loadPublicEvent();
        },
        error: (error: unknown) => {
          this.accessError.set(getErrorMessage(error, 'Código incorrecto'));
          this.accessLoading.set(false);
        },
      });
  }

  /** Envía un mensaje de homenaje al evento */
  submitMessage(): void {
    if (this.messageForm.invalid || this.messageSending()) return;
    this.messageSending.set(true);

    this.api
      .sendMessage(this.slug, {
        authorName: this.messageForm.controls.authorName.value,
        content: this.messageForm.controls.content.value,
      })
      .subscribe({
        next: (message) => {
          // No esperamos al eco del WebSocket para mostrar el propio mensaje: si el socket
          // todavía no terminó de unirse a la sala del evento cuando este POST responde
          // (carrera muy común justo después de cargar la página), el broadcast del backend
          // llega mientras esta pestaña todavía no está suscrita y el mensaje nunca aparece
          // hasta recargar. El dedup por id evita duplicarlo si el eco sí llega después.
          if (message.status === 'APPROVED') {
            this.messages.update((prev) =>
              prev.some((current) => current.id === message.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: message.id,
                      authorName: message.authorName,
                      content: message.content,
                      iconType: message.iconType,
                      createdAt: message.createdAt,
                    },
                  ],
            );
          }
          this.messageForm.reset({
            authorName: this.messageForm.controls.authorName.value,
            content: '',
          });
          this.messageSending.set(false);
          this.notifications.success('Mensaje enviado para moderación');
        },
        error: (error: unknown) => {
          this.messageSending.set(false);
          this.notifications.apiError(error, 'No se pudo enviar el mensaje');
        },
      });
  }

  /** Envía una reacción rápida con rate limiting de 2 segundos */
  sendReaction(type: string): void {
    if (this.reactionCooldown()) return;
    this.reactionCooldown.set(true);

    this.api.sendReaction(this.slug, { type }).subscribe({
      next: () => {
        setTimeout(() => this.reactionCooldown.set(false), 2000);
      },
      error: () => {
        this.reactionCooldown.set(false);
        this.notifications.error('No se pudo enviar la reacción');
      },
    });
  }

  /** Comparte el enlace del evento por WhatsApp */
  shareWhatsApp(): void {
    const ev = this.evt();
    const name = ev?.deceased ? `${ev.deceased.firstName} ${ev.deceased.lastName}` : 'la ceremonia';
    const url = window.location.href;
    const text = encodeURIComponent(`Te invitamos a la ceremonia de ${name}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  /** Comparte el enlace del evento por email */
  shareEmail(): void {
    const ev = this.evt();
    const name = ev?.deceased ? `${ev.deceased.firstName} ${ev.deceased.lastName}` : 'la ceremonia';
    const url = window.location.href;
    const subject = encodeURIComponent(`Invitación a ceremonia de ${name}`);
    const body = encodeURIComponent(
      `Te invitamos a seguir la ceremonia de ${name} en vivo:\n\n${url}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  /** Copia el enlace del evento al portapapeles */
  copyLink(): void {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => this.notifications.success('Enlace copiado'))
      .catch(() => this.notifications.error('No se pudo copiar el enlace'));
  }

  /** Conecta al Socket.IO para recibir actualizaciones en tiempo real */
  private connectSocket(): void {
    this.socket.connect(this.eventId);

    this.socket.reconnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadMessages();
    });
  }

  private loadMessages(): void {
    this.api.getPublicMessages(this.slug).subscribe({
      next: (messages) => {
        this.messages.set(
          messages.map(({ id, authorName, content, iconType, createdAt }) => ({
            id,
            authorName,
            content,
            iconType,
            createdAt,
          })),
        );
      },
      error: () => {
        this.messages.set([]);
        this.notifications.error('No se pudieron cargar los mensajes');
      },
    });
  }
}
