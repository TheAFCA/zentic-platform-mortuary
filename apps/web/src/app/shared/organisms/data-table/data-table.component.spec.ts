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
  template: `
    <app-data-table
      [columns]="columns"
      [rows]="rows"
      [loading]="loading"
      [errorMessage]="errorMessage"
      emptyMessage="Nada"
      (retry)="retryCount = retryCount + 1"
    />
  `,
})
class HostComponent {
  columns: DataTableColumn<Row>[] = [{ key: 'name', label: 'Nombre' }];
  rows: Row[] = [
    { id: '1', name: 'Uno' },
    { id: '2', name: 'Dos' },
  ];
  loading = false;
  errorMessage = '';
  retryCount = 0;
}

describe('DataTableComponent', () => {
  function createFixture(rows: Row[], state: { loading?: boolean; errorMessage?: string } = {}) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows = rows;
    fixture.componentInstance.loading = state.loading ?? false;
    fixture.componentInstance.errorMessage = state.errorMessage ?? '';
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

  it('shows a loading status without rendering stale rows', () => {
    const fixture = createFixture([{ id: '1', name: 'Uno' }], { loading: true });

    const loading = fixture.nativeElement.querySelector('[data-testid="data-table-loading"]');
    expect(loading).toBeTruthy();
    expect(loading.getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.querySelector('[data-testid="data-row"]')).toBeNull();
  });

  it('shows a persistent error and emits retry', () => {
    const fixture = createFixture([], {
      errorMessage: 'No fue posible cargar la información',
    });

    const error = fixture.nativeElement.querySelector('[data-testid="data-table-error"]');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('No fue posible cargar la información');

    error.querySelector('button').click();
    expect(fixture.componentInstance.retryCount).toBe(1);
  });
});
