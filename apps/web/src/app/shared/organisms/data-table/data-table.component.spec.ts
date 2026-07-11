import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataTableColumn, DataTableComponent } from './data-table.component';

interface Row {
  id: string;
  name: string;
}

@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `<app-data-table [columns]="columns" [rows]="rows" emptyMessage="Nada" />`,
})
class HostComponent {
  columns: DataTableColumn<Row>[] = [{ key: 'name', label: 'Nombre' }];
  rows: Row[] = [
    { id: '1', name: 'Uno' },
    { id: '2', name: 'Dos' },
  ];
}

describe('DataTableComponent', () => {
  function createFixture(rows: Row[]) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows = rows;
    fixture.detectChanges();
    return fixture;
  }

  it('renders one row per item and the formatted cell value', () => {
    const fixture = createFixture([
      { id: '1', name: 'Uno' },
      { id: '2', name: 'Dos' },
    ]);

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="data-row"]');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Uno');
  });

  it('shows the empty message when there are no rows', () => {
    const fixture = createFixture([]);

    const empty = fixture.nativeElement.querySelector('[data-testid="data-table-empty"]');
    expect(empty.textContent).toContain('Nada');
  });
});
