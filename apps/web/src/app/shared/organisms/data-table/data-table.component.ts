import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, TemplateRef } from '@angular/core';

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

  @ContentChild('rowActions') actionsTemplate?: TemplateRef<{ $implicit: T }>;

  get columnCount(): number {
    return this.columns.length + (this.actionsTemplate ? 1 : 0);
  }

  cellValue(row: T, column: DataTableColumn<T>): string {
    const value = row[column.key];
    if (column.format) return column.format(value, row);
    return value === null || value === undefined ? '' : String(value);
  }
}
