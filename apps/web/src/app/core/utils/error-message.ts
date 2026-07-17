import { HttpErrorResponse } from '@angular/common/http';

type ApiErrorBody = { message?: string | string[] } | null | undefined;

/** Convierte errores HTTP en mensajes breves y seguros para la interfaz. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }

    const apiMessage = (error.error as ApiErrorBody)?.message;
    if (Array.isArray(apiMessage)) {
      const messages = apiMessage.map((message) => message.trim()).filter(Boolean);
      return messages.length > 0 ? messages.join('. ') : fallback;
    }
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage.trim();
    return fallback;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !message.startsWith('Http failure response')) return message;
  }

  return fallback;
}
