import { HttpErrorResponse } from '@angular/common/http';
import { getErrorMessage } from './error-message';

describe('getErrorMessage', () => {
  it('uses the API message when it is safe to show', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['El nombre es obligatorio', 'El correo no es válido'] },
    });

    expect(getErrorMessage(error, 'No se pudo guardar')).toBe(
      'El nombre es obligatorio. El correo no es válido',
    );
  });

  it('provides an actionable message for connection failures', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

    expect(getErrorMessage(error, 'No se pudo guardar')).toContain('Revisa tu conexión');
  });

  it('does not expose unknown response objects', () => {
    expect(getErrorMessage({ message: 'detalle interno' }, 'No se pudo guardar')).toBe(
      'No se pudo guardar',
    );
  });
});
