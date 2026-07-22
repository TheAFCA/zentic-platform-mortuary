import { CommonModule } from '@angular/common';
import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

export interface DataTableColumn<T> {
  key: keyof T & string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends object> {
  @Input() columns: DataTableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() emptyMessage = 'No hay datos para mostrar';
  @Input() loading = false;
  @Input() errorMessage = '';
  @Output() retry = new EventEmitter<void>();

  /** Activa la columna de checkboxes. Requiere `rowId` para identificar cada fila. */
  @Input() selectable = false;
  @Input() rowId: (row: T) => string = () => '';
  @Input() selectedIds: ReadonlySet<string> = new Set<string>();
  @Output() selectionChange = new EventEmitter<Set<string>>();

  @ContentChild('rowActions') actionsTemplate?: TemplateRef<{ $implicit: T }>;

  get columnCount(): number {
    return this.columns.length + (this.actionsTemplate ? 1 : 0) + (this.selectable ? 1 : 0);
  }

  get allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every((row) => this.isSelected(row));
  }

  get someSelected(): boolean {
    return !this.allSelected && this.rows.some((row) => this.isSelected(row));
  }

  isSelected(row: T): boolean {
    return this.selectedIds.has(this.rowId(row));
  }

  toggleRow(row: T): void {
    const next = new Set(this.selectedIds);
    const id = this.rowId(row);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectionChange.emit(next);
  }

  toggleAll(): void {
    if (this.allSelected) {
      this.selectionChange.emit(new Set());
      return;
    }
    this.selectionChange.emit(new Set(this.rows.map((row) => this.rowId(row))));
  }

  cellValue(row: T, column: DataTableColumn<T>): string {
    const value = row[column.key];
    if (column.format) return column.format(value, row);
    return value === null || value === undefined ? '' : String(value);
  }
}
