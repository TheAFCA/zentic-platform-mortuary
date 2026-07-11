import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPasswordResetEmail } from './templates/password-reset.template';
import { buildNewUserCredentialsEmail } from './templates/new-user-credentials.template';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

type NewUserCredentialsEmailInput = {
  to: string;
  loginUrl: string;
  temporaryPassword: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const message = buildPasswordResetEmail({ resetUrl: input.resetUrl });
    await this.send(input.to, message);
  }

  async sendNewUserCredentialsEmail(input: NewUserCredentialsEmailInput): Promise<void> {
    const message = buildNewUserCredentialsEmail({
      loginUrl: input.loginUrl,
      temporaryPassword: input.temporaryPassword,
    });
    await this.send(input.to, message);
  }

  private async send(
    to: string,
    message: { subject: string; html: string; text: string },
  ): Promise<void> {
    const provider = this.config.get<'resend' | 'sendgrid'>(
      'EMAIL_PROVIDER',
      'resend',
    );

    if (provider === 'sendgrid') {
      throw new BadGatewayException('SendGrid provider is not implemented yet');
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@zentic.pro');

    if (!apiKey) {
      this.logger.warn(`Email skipped for ${to}: RESEND_API_KEY is missing`);
      this.logger.debug(`Email body for ${to}: ${message.text}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayException(`Failed to send email: ${errorText}`);
    }
  }
}
