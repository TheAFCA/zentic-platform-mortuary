import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MessageStatus, ObituaryMessage, PublicObituary } from '@zentic/shared-types';
import { ObituariesApiService } from '../../core/services/obituaries-api.service';
import { ObituarySocketService } from '../../core/services/obituary-socket.service';
import { InitialsAvatarComponent } from '../../shared/atoms/initials-avatar/initials-avatar.component';
import { CondolenceFormComponent } from './condolence-form/condolence-form.component';
import { ShareButtonsComponent } from '../../shared/molecules/share-buttons/share-buttons.component';
import { FeedbackBannerComponent } from '../../shared/molecules/feedback-banner/feedback-banner.component';
import { PoweredByBadgeComponent } from '../../shared/atoms/powered-by-badge/powered-by-badge.component';
import { getErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-obituary-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    InitialsAvatarComponent,
    CondolenceFormComponent,
    ShareButtonsComponent,
    FeedbackBannerComponent,
    PoweredByBadgeComponent,
  ],
  templateUrl: './obituary-page.component.html',
  styleUrl: './obituary-page.component.scss',
})
export class ObituaryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly obituariesApi = inject(ObituariesApiService);
  private readonly socket = inject(ObituarySocketService);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  private slug = '';

  readonly obituary = signal<PublicObituary | null>(null);
  readonly loading = signal(true);
  readonly unlocking = signal(false);
  readonly accessCodeError = signal('');
  readonly loadError = signal('');
  /** Código ya validado — se reutiliza para no pedirlo de nuevo al dejar un mensaje. */
  readonly unlockedAccessCode = signal<string | null>(null);
  /**
   * Mensajes aprobados a mostrar — arranca con los que trae la carga inicial y se les van
   * agregando los que llegan por WebSocket cuando el operador aprueba uno nuevo (RNF-TRIB-004).
   */
  readonly liveMessages = signal<ObituaryMessage[]>([]);

  constructor() {
    this.socket.newMessage$.subscribe((msg) => {
      const newMessage: ObituaryMessage = {
        id: msg.id,
        obituaryId: this.obituary()?.id ?? '',
        authorName: msg.authorName,
        content: msg.content,
        iconType: msg.iconType,
        status: MessageStatus.APPROVED,
        approvedBy: null,
        approvedAt: null,
        createdAt: msg.createdAt,
      };
      this.liveMessages.update((prev) => [...prev, newMessage]);
    });
  }

  readonly accessForm = new FormGroup({
    accessCode: new FormControl('', { nonNullable: true }),
  });

  get currentUrl(): string {
    return window.location.href;
  }

  get shareMessage(): string {
    const obituary = this.obituary();
    if (!obituary?.deceased) return '';
    return `Nos unimos en memoria de ${this.fullName(obituary)}. Puedes ver el obituario y la transmisión aquí: ${this.currentUrl}`;
  }

  fullName(obituary: PublicObituary): string {
    if (!obituary.deceased) return '';
    return `${obituary.deceased.firstName} ${obituary.deceased.lastName}`;
  }

  ngOnInit(): void {
    // RNF-OBT-006: por defecto no indexable hasta confirmar que está PUBLISHED y accesible.
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading.set(false);
      return;
    }
    this.slug = slug;
    this.fetch();
  }

  submitAccessCode(): void {
    this.accessCodeError.set('');
    this.unlocking.set(true);
    const code = this.accessForm.controls.accessCode.value;

    this.obituariesApi.getPublic(this.slug, code).subscribe({
      next: (obituary) => {
        this.unlocking.set(false);
        if (!obituary.accessGranted) {
          this.accessCodeError.set('Código de acceso incorrecto');
          return;
        }
        this.unlockedAccessCode.set(code);
        this.obituary.set(obituary);
        this.liveMessages.set(obituary.approvedMessages);
        this.updateMetaTags(obituary);
        this.connectSocket(obituary.id);
      },
      error: (error: HttpErrorResponse) => {
        this.unlocking.set(false);
        this.accessCodeError.set(
          error.status === 404
            ? 'Este contenido no está disponible'
            : 'No se pudo verificar el código, intenta de nuevo',
        );
      },
    });
  }

  onMessageSent(): void {
    // El mensaje queda en moderación (PENDING); no se agrega a la lista de aprobados aún.
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.obituariesApi.getPublic(this.slug).subscribe({
      next: (obituary) => {
        this.obituary.set(obituary);
        this.loading.set(false);
        if (obituary.accessGranted) {
          this.liveMessages.set(obituary.approvedMessages);
          this.updateMetaTags(obituary);
          this.connectSocket(obituary.id);
        }
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.obituary.set(null);
          return;
        }
        this.loadError.set(getErrorMessage(error, 'No se pudo cargar el obituario'));
      },
    });
  }

  private connectSocket(obituaryId: string): void {
    this.socket.connect(obituaryId);
  }

  private updateMetaTags(obituary: PublicObituary): void {
    if (!obituary.deceased) return;
    const fullName = this.fullName(obituary);
    const description = obituary.deceased.epitaph ?? `Obituario de ${fullName}`;

    this.title.setTitle(`En memoria de ${fullName}`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `En memoria de ${fullName}` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: this.currentUrl });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    if (obituary.deceased.photoUrl) {
      this.meta.updateTag({ property: 'og:image', content: obituary.deceased.photoUrl });
    }
    // RF-OBT-005: solo se relaja la indexación una vez confirmado que está PUBLISHED y accesible
    // (obituarios protegidos por código nunca se indexan, aunque estén PUBLISHED).
    if (obituary.isPublic) {
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }
  }
}
