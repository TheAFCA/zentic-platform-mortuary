import {
  Controller,
  Get,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('dev/sentry-test')
  sentryTest(): never {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      throw new InternalServerErrorException('Not available in production');
    }

    throw new InternalServerErrorException('Local Sentry test from API');
  }
}
