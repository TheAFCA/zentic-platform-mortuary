import { BadRequestException } from '@nestjs/common';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function assertStrongPassword(password: string): void {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException('Password must be at least 8 characters');
  }

  if (!PASSWORD_POLICY_REGEX.test(password)) {
    throw new BadRequestException(
      'Password must include uppercase, lowercase, number and special character',
    );
  }
}
