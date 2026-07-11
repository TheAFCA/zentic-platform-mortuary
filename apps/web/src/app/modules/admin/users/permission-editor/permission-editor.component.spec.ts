import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PermissionMeta } from '@zentic/shared-types';
import { PermissionEditorComponent } from './permission-editor.component';
import { PermissionsApiService } from '../../../../core/services/permissions-api.service';

const CATALOG: Record<string, PermissionMeta[]> = {
  Leads: [
    {
      code: 'leads:read',
      module: 'Leads',
      label: 'Ver leads',
      description: '',
      assignableToOperator: true,
      assignableToViewer: true,
    },
    {
      code: 'leads:export',
      module: 'Leads',
      label: 'Exportar leads',
      description: '',
      assignableToOperator: true,
      assignableToViewer: false,
    },
  ],
};

describe('PermissionEditorComponent', () => {
  function createFixture(role: 'OPERATOR' | 'VIEWER') {
    const permissionsApiMock = {
      getCatalog: () => of(CATALOG),
      getPresets: () =>
        of([{ id: 'recepcionista', label: 'Recepcionista', permissions: ['leads:read', 'leads:export'] }]),
    };

    TestBed.configureTestingModule({
      imports: [PermissionEditorComponent],
      providers: [{ provide: PermissionsApiService, useValue: permissionsApiMock }],
    });

    const fixture = TestBed.createComponent(PermissionEditorComponent);
    fixture.componentInstance.role = role;
    fixture.detectChanges();
    return fixture;
  }

  it('only shows viewer-assignable permissions when the role is VIEWER', () => {
    const fixture = createFixture('VIEWER');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );

    expect(labels.some(text => text?.includes('Ver leads'))).toBe(true);
    expect(labels.some(text => text?.includes('Exportar leads'))).toBe(false);
  });

  it('shows every operator-assignable permission when the role is OPERATOR', () => {
    const fixture = createFixture('OPERATOR');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('label')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );

    expect(labels.some(text => text?.includes('Ver leads'))).toBe(true);
    expect(labels.some(text => text?.includes('Exportar leads'))).toBe(true);
  });

  it('applying a preset only checks the permissions assignable to the current role', () => {
    const fixture = createFixture('VIEWER');
    const emitted: string[][] = [];
    fixture.componentInstance.permissionsChange.subscribe(value => emitted.push(value));

    fixture.componentInstance.applyPreset('recepcionista');

    // 'leads:export' no es asignable a VIEWER, debe quedar filtrado
    expect(emitted[0]).toEqual(['leads:read']);
  });
});
