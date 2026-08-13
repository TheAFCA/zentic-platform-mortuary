import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TENANT_MODULE_KEYS, TENANT_MODULE_CATALOG, TenantModuleKey } from '@zentic/shared-types';

/**
 * Grid de checkboxes para los módulos configurables por tenant (segundo nivel de acceso,
 * por encima del sistema de permisos por usuario). Dashboard, Usuarios, Marca y Cuenta no
 * aparecen aquí porque siempre están activos para todo tenant.
 */
@Component({
  selector: 'app-tenant-module-toggles',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule],
  templateUrl: './tenant-module-toggles.component.html',
  styleUrl: './tenant-module-toggles.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantModuleTogglesComponent implements OnChanges {
  @Input() value: TenantModuleKey[] = [];
  @Output() valueChange = new EventEmitter<TenantModuleKey[]>();

  readonly modules = TENANT_MODULE_KEYS;
  readonly catalog = TENANT_MODULE_CATALOG;

  private selected = new Set<TenantModuleKey>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.selected = new Set(this.value);
    }
  }

  isChecked(key: TenantModuleKey): boolean {
    return this.selected.has(key);
  }

  toggle(key: TenantModuleKey, checked: boolean): void {
    if (checked) this.selected.add(key);
    else this.selected.delete(key);
    this.valueChange.emit(Array.from(this.selected));
  }
}
