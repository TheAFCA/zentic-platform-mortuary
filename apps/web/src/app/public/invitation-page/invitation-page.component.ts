import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PublicInvitation } from '@zentic/shared-types';
import { InvitationsApiService } from '../../core/services/invitations-api.service';
import { InitialsAvatarComponent } from '../../shared/atoms/initials-avatar/initials-avatar.component';
import { ShareButtonsComponent } from '../../shared/molecules/share-buttons/share-buttons.component';

@Component({
  selector: 'app-invitation-page',
  standalone: true,
  imports: [CommonModule, RouterLink, InitialsAvatarComponent, ShareButtonsComponent],
  templateUrl: './invitation-page.component.html',
  styleUrl: './invitation-page.component.scss',
})
export class InvitationPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invitationsApi = inject(InvitationsApiService);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  readonly invitation = signal<PublicInvitation | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  get currentUrl(): string {
    return window.location.href;
  }

  get fullName(): string {
    const invitation = this.invitation();
    if (!invitation) return '';
    return `${invitation.deceased.firstName} ${invitation.deceased.lastName}`;
  }

  get shareMessage(): string {
    const invitation = this.invitation();
    if (!invitation) return '';

    const date = new Date(invitation.event.scheduledAt).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    const time = new Date(invitation.event.scheduledAt).toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const place = invitation.event.place
      ? `${invitation.event.place.venueName} - ${invitation.event.place.roomName}`
      : 'Lugar por confirmar';

    return (
      `Te invitamos a acompañarnos en memoria de ${this.fullName}.\n` +
      `📅 ${date}, ${time}\n` +
      `📍 ${place}\n` +
      `🔗 ${this.currentUrl}`
    );
  }

  get addressLabel(): string {
    // Caso borde §13: sin dirección (o sin lugar asignado), se muestra el mismo fallback.
    return this.invitation()?.event.place?.address ?? 'Dirección por confirmar';
  }

  ngOnInit(): void {
    // RNF-INV-004 / consistente con obituary-page: no indexable hasta confirmar visibilidad.
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.invitationsApi.getPublic(slug).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
        this.loading.set(false);
        this.updateMetaTags(invitation);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  private updateMetaTags(invitation: PublicInvitation): void {
    const fullName = `${invitation.deceased.firstName} ${invitation.deceased.lastName}`;
    const description = invitation.message ?? `Invitación en memoria de ${fullName}`;

    this.title.setTitle(`Invitación — ${fullName}`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `Invitación — ${fullName}` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: this.currentUrl });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    // Caso borde §13: si nunca se generó la imagen, se omite el tag en vez de romper.
    if (invitation.imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: invitation.imageUrl });
    }
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
