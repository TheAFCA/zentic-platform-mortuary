import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageStatus, ObituaryMessage } from '@zentic/shared-types';
import { BadgeColor, BadgeComponent } from '../../../shared/atoms/badge/badge.component';

@Component({
  selector: 'app-messages-moderation',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './messages-moderation.component.html',
  styleUrl: './messages-moderation.component.scss',
})
export class MessagesModerationComponent {
  @Input() messages: ObituaryMessage[] = [];
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  readonly MessageStatus = MessageStatus;

  statusBadgeColor(status: MessageStatus): BadgeColor {
    if (status === MessageStatus.APPROVED) return 'green';
    if (status === MessageStatus.REJECTED) return 'red';
    return 'yellow';
  }
}
