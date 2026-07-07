import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';
import { JsonLoggerService } from '../logging/json-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new JsonLoggerService(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : 500;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const errorMessage =
      exception instanceof Error ? exception.message : 'Internal server error';
    const trace = exception instanceof Error ? exception.stack : undefined;

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof exceptionResponse === 'object' &&
        'message' in (exceptionResponse as Record<string, unknown>)
          ? (exceptionResponse as Record<string, unknown>).message
          : errorMessage,
    };

    if (status >= 500) {
      this.logger.error(
        {
          event: 'http_exception',
          method: request.method,
          path: request.url,
          status,
        },
        trace,
      );
      Sentry.captureException(exception, {
        tags: {
          method: request.method,
          path: request.url,
          status: String(status),
        },
      });
    }

    response.status(status).json(body);
  }
}
