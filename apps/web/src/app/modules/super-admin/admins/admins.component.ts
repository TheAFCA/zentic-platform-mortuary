import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  SuperAdminUser,
  SuperAdminUsersApiService,
} from '../../../core/services/super-admin-users-api.service';
import {
  DataTableColumn,
  DataTableComponent,
} from '../../../shared/organisms/data-table/data-table.component';
import { ConfirmDialogComponent } from '../../../shared/organisms/confirm-dialog/confirm-dialog.component';
import { BadgeComponent } from '../../../shared/atoms/badge/badge.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';

@Component({
  selector: 'app-super-admin-admins',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DataTableComponent,
    ConfirmDialogComponent,
    BadgeComponent,
  ],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.scss',
})
export class SuperAdminAdminsComponent implements OnInit {
  private readonly superAdminUsersApi = inject(SuperAdminUsersApiService);
  private readonly notifications = inject(NotificationService);

  readonly admins = signal<SuperAdminUser[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly creating = signal(false);
  readonly actionLoading = signal(false);
  readonly newEmail = signal('');
  readonly createError = signal('');

  readonly confirmTarget = signal<SuperAdminUser | null>(null);
  readonly confirmError = signal('');

  readonly columns: DataTableColumn<SuperAdminUser>[] = [
    { key: 'email', label: 'Email' },
    {
      key: 'createdAt',
      label: 'Creado',
      format: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.superAdminUsersApi.list().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudieron cargar los Super Admins'));
      },
    });
  }

  createSuperAdmin(): void {
    const email = this.newEmail().trim();
    if (!email || this.creating()) return;

    this.createError.set('');
    this.creating.set(true);
    this.superAdminUsersApi.create(email).subscribe({
      next: () => {
        this.creating.set(false);
        this.newEmail.set('');
        this.notifications.success('Super Admin creado');
        this.load();
      },
      error: (error: unknown) => {
        this.creating.set(false);
        this.createError.set(getErrorMessage(error, 'No se pudo crear el Super Admin'));
      },
    });
  }

  askToggleActive(admin: SuperAdminUser): void {
    this.confirmTarget.set(admin);
    this.confirmError.set('');
  }

  cancelConfirm(): void {
    this.confirmTarget.set(null);
  }

  confirmToggle(): void {
    const admin = this.confirmTarget();
    if (!admin || this.actionLoading()) return;
    this.actionLoading.set(true);

    this.superAdminUsersApi.setActive(admin.id, !admin.active).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.cancelConfirm();
        this.notifications.success(
          admin.active ? 'Super Admin desactivado' : 'Super Admin reactivado',
        );
        this.load();
      },
      error: (error: unknown) => {
        this.actionLoading.set(false);
        this.confirmError.set(getErrorMessage(error, 'No se pudo actualizar el Super Admin'));
      },
    });
  }
}
