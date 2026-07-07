import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class JsonLoggerService implements LoggerService {
  constructor(private readonly context = 'App') {}

  log(message: unknown, context?: string) {
    this.write('log', message, undefined, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, trace, context);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, undefined, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, undefined, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, undefined, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    trace?: string,
    context?: string,
  ) {
    const payload = {
      level,
      timestamp: new Date().toISOString(),
      context: context ?? this.context,
      message,
      ...(trace ? { trace } : {}),
    };

    const serialized = JSON.stringify(payload);

    if (level === 'error') {
      console.error(serialized);
      return;
    }

    if (level === 'warn') {
      console.warn(serialized);
      return;
    }

    console.log(serialized);
  }
}
