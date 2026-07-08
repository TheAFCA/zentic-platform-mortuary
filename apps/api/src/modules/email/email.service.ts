import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPasswordResetEmail } from './templates/password-reset.template';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const provider = this.config.get<'resend' | 'sendgrid'>(
      'EMAIL_PROVIDER',
      'resend',
    );
    const message = buildPasswordResetEmail({ resetUrl: input.resetUrl });

    if (provider === 'sendgrid') {
      throw new BadGatewayException('SendGrid provider is not implemented yet');
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@zentic.pro');

    if (!apiKey) {
      this.logger.warn(
        `Password reset email skipped for ${input.to}: RESEND_API_KEY is missing`,
      );
      this.logger.debug(
        `Password reset link for ${input.to}: ${input.resetUrl}`,
      );
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
        to: [input.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayException(
        `Failed to send password reset email: ${errorText}`,
      );
    }
  }
}
