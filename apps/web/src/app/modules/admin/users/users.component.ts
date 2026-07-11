import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminUser, AdminUsersApiService } from '../../../core/services/admin-users-api.service';
import { PermissionsApiService } from '../../../core/services/permissions-api.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { UserFormComponent, UserFormValue } from './user-form/user-form.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, HasPermissionDirective, UserFormComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly adminUsersApi = inject(AdminUsersApiService);
  private readonly permissionsApi = inject(PermissionsApiService);

  users = signal<AdminUser[]>([]);
  showForm = signal(false);
  editingUser = signal<AdminUser | null>(null);
  editingFormValue = signal<UserFormValue | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.adminUsersApi.getUsers().subscribe((users) => this.users.set(users));
  }

  initials(email: string): string {
    const name = email.split('@')[0] ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.editingFormValue.set(null);
    this.showForm.set(true);
  }

  openEdit(user: AdminUser): void {
    this.editingUser.set(user);
    this.permissionsApi.getUserPermissions(user.id).subscribe((result) => {
      this.editingFormValue.set({
        email: user.email,
        role: user.role as 'OPERATOR' | 'VIEWER',
        permissions: result.permissions,
      });
      this.showForm.set(true);
    });
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  onSave(value: UserFormValue): void {
    const editing = this.editingUser();
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

    request.subscribe(() => {
      this.showForm.set(false);
      this.load();
    });
  }
}
