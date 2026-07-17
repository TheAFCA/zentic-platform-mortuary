import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Permission, PermissionMeta, PermissionPreset } from '@zentic/shared-types';
import { PermissionsApiService } from '../../../../core/services/permissions-api.service';
import { NotificationService } from '../../../../core/services/notification.service';

/**
 * Checkboxes agrupados por módulo, filtrados según lo que sea asignable al rol (OPERATOR/VIEWER)
 * según el catálogo (§4/§5). El selector de perfiles (§13) solo precarga los checkboxes editables
 * — no se guarda como un "nuevo perfil" (HU-RBAC-003).
 */
@Component({
  selector: 'app-permission-editor',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './permission-editor.component.html',
  styleUrl: './permission-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionEditorComponent implements OnInit, OnChanges {
  @Input() role: 'OPERATOR' | 'VIEWER' = 'OPERATOR';
  @Input() initialPermissions: Permission[] = [];
  @Output() permissionsChange = new EventEmitter<Permission[]>();

  private readonly permissionsApi = inject(PermissionsApiService);
  private readonly notifications = inject(NotificationService);

  catalogGroups: Record<string, PermissionMeta[]> = {};
  presets: PermissionPreset[] = [];
  selected = new Set<Permission>();

  ngOnInit(): void {
    this.selected = new Set(this.initialPermissions);
    this.permissionsApi.getCatalog().subscribe({
      next: (groups) => (this.catalogGroups = groups),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudo cargar el catálogo de permisos'),
    });
    this.permissionsApi.getPresets().subscribe({
      next: (presets) => (this.presets = presets),
      error: (error: unknown) =>
        this.notifications.apiError(error, 'No se pudieron cargar los perfiles de permisos'),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPermissions'] && !changes['initialPermissions'].firstChange) {
      this.selected = new Set(this.initialPermissions);
    }
  }

  get moduleNames(): string[] {
    return Object.keys(this.catalogGroups);
  }

  assignableMetas(moduleName: string): PermissionMeta[] {
    const metas = this.catalogGroups[moduleName] ?? [];
    return metas.filter((meta) =>
      this.role === 'VIEWER' ? meta.assignableToViewer : meta.assignableToOperator,
    );
  }

  isChecked(code: Permission): boolean {
    return this.selected.has(code);
  }

  toggle(code: Permission, checked: boolean): void {
    if (checked) this.selected.add(code);
    else this.selected.delete(code);
    this.emit();
  }

  applyPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;

    const assignableCodes = new Set(
      Object.values(this.catalogGroups)
        .flat()
        .filter((meta) =>
          this.role === 'VIEWER' ? meta.assignableToViewer : meta.assignableToOperator,
        )
        .map((meta) => meta.code),
    );
    this.selected = new Set(preset.permissions.filter((code) => assignableCodes.has(code)));
    this.emit();
  }

  private emit(): void {
    this.permissionsChange.emit(Array.from(this.selected));
  }
}
