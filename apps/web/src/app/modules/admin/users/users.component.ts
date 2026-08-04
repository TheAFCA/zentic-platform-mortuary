import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminUser, AdminUsersApiService } from '../../../core/services/admin-users-api.service';
import { PermissionsApiService } from '../../../core/services/permissions-api.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { UserFormComponent, UserFormValue } from './user-form/user-form.component';
import { FeedbackBannerComponent } from '../../../shared/molecules/feedback-banner/feedback-banner.component';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/error-message';
import { FormPanelComponent } from '../../../shared/organisms/form-panel/form-panel.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HasPermissionDirective,
    UserFormComponent,
    FeedbackBannerComponent,
    FormPanelComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly adminUsersApi = inject(AdminUsersApiService);
  private readonly permissionsApi = inject(PermissionsApiService);
  private readonly notifications = inject(NotificationService);

  users = signal<AdminUser[]>([]);
  showForm = signal(false);
  editingUser = signal<AdminUser | null>(null);
  editingFormValue = signal<UserFormValue | null>(null);
  loading = signal(false);
  loadError = signal('');
  formError = signal('');
  saving = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.adminUsersApi.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(error, 'No se pudieron cargar los usuarios'));
      },
    });
  }

  initials(email: string): string {
    const name = email.split('@')[0] ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  openCreate(): void {
    this.formError.set('');
    this.editingUser.set(null);
    this.editingFormValue.set(null);
    this.showForm.set(true);
  }

  openEdit(user: AdminUser): void {
    this.editingUser.set(user);
    this.formError.set('');
    this.permissionsApi.getUserPermissions(user.id).subscribe({
      next: (result) => {
        this.editingFormValue.set({
          email: user.email,
          role: user.role as 'OPERATOR' | 'VIEWER',
          permissions: result.permissions,
        });
        this.showForm.set(true);
      },
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los permisos del usuario'),
    });
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onSave(value: UserFormValue): void {
    if (this.saving()) return;
    const editing = this.editingUser();
    this.formError.set('');
    this.saving.set(true);
    const request = editing
      ? this.adminUsersApi.updateUser(editing.id, {
          role: value.role,
          permissions: value.permissions,
        })
      : this.adminUsersApi.createUser({
          email: value.email,
          role: value.role,
          permissions: value.permissions,
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notifications.success(editing ? 'Usuario actualizado' : 'Usuario creado');
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(getErrorMessage(error, 'No se pudo guardar el usuario'));
      },
    });
  }
}
