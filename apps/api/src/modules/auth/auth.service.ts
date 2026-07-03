import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtPayload } from '@zentic/shared-types';

@Injectable()
export class AuthService {
  // TODO: Implement in Module 02 — Login & Registration

  async login(_email: string, _password: string, _res: Response) {
    throw new Error('Not implemented');
  }

  async logout(_req: Request, _res: Response) {
    throw new Error('Not implemented');
  }

  async refresh(_req: Request, _res: Response) {
    throw new Error('Not implemented');
  }

  async forgotPassword(_email: string) {
    throw new Error('Not implemented');
  }

  async resetPassword(_token: string, _newPassword: string) {
    throw new Error('Not implemented');
  }

  async me(_user: JwtPayload) {
    throw new Error('Not implemented');
  }

  async changePassword(_userId: string, _currentPassword: string, _newPassword: string) {
    throw new Error('Not implemented');
  }
}
