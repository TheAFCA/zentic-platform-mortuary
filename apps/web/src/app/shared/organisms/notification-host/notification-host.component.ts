import { Component, inject } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  imports: [MessageModule],
  styles: [
    `
      .notification-host {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(28rem, calc(100vw - 2rem));
        pointer-events: none;
      }

      .notification-host ::ng-deep .p-message {
        pointer-events: auto;
        box-shadow: var(--shadow-xl);
        font-weight: 600;
      }
    `,
  ],
  template: `
    <div class="notification-host">
      @for (item of notificationService.notifications(); track item.id) {
        <p-message
          [severity]="item.severity"
          [icon]="item.icon"
          [closable]="true"
          (onClose)="notificationService.dismiss(item.id)"
        >
          {{ item.message }}
        </p-message>
      }
    </div>
  `,
})
export class NotificationHostComponent {
  protected readonly notificationService = inject(NotificationService);
}
