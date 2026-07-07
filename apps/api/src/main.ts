import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { JsonLoggerService } from './common/logging/json-logger.service';

async function bootstrap() {
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      integrations: [Sentry.onUncaughtExceptionIntegration()],
    });
  }

  const logger = new JsonLoggerService('ZENTIC API');
  const app = await NestFactory.create(AppModule, { logger });
  const config = app.get(ConfigService);

  const frontendUrl = config.get<string>(
    'FRONTEND_URL',
    'http://localhost:4200',
  );
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.use(helmet());
  app.use(cookieParser());
  app.useLogger(logger);

  app.enableCors({
    origin: nodeEnv === 'production' ? false : frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ZENTIC.pro API')
      .setDescription('SaaS multi-tenant platform for funeral homes')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log({ event: 'startup', url: `http://localhost:${port}/api` });
  if (nodeEnv !== 'production') {
    logger.log({
      event: 'swagger',
      url: `http://localhost:${port}/api/docs`,
    });
    logger.log({
      event: 'sentry-test',
      url: `http://localhost:${port}/api/dev/sentry-test`,
    });
  }
}

void bootstrap();
