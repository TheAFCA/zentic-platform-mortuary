import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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

  readonly admins = signal<SuperAdminUser[]>([]);
  readonly loading = signal(false);
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
    this.superAdminUsersApi.list().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  createSuperAdmin(): void {
    const email = this.newEmail().trim();
    if (!email) return;

    this.createError.set('');
    this.superAdminUsersApi.create(email).subscribe({
      next: () => {
        this.newEmail.set('');
        this.load();
      },
      error: (error: HttpErrorResponse) =>
        this.createError.set(this.extractErrorMessage(error, 'No se pudo crear el Super Admin')),
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
    if (!admin) return;

    this.superAdminUsersApi.setActive(admin.id, !admin.active).subscribe({
      next: () => {
        this.cancelConfirm();
        this.load();
      },
      error: (error: HttpErrorResponse) =>
        this.confirmError.set(
          this.extractErrorMessage(error, 'No se pudo actualizar el Super Admin'),
        ),
    });
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? fallback;
  }
}
