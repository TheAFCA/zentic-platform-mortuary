import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    logout: jest.Mock;
    refresh: jest.Mock;
    me: jest.Mock;
    changePassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn(),
      changePassword: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = app.get<AuthController>(AuthController);
  });

  it('delegates login to AuthService', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const res = {} as never;
    const body = { email: 'test@example.com', password: 'Secret123!' };

    await controller.login(req, body, res);

    expect(authService.login).toHaveBeenCalledWith(
      body.email,
      body.password,
      req,
      res,
    );
  });

  it('delegates refresh to AuthService', async () => {
    const req = {} as never;
    const res = {} as never;

    await controller.refresh(req, res);

    expect(authService.refresh).toHaveBeenCalledWith(req, res);
  });

  it('delegates logout to AuthService', async () => {
    const req = {} as never;
    const res = {} as never;

    await controller.logout(req, res);

    expect(authService.logout).toHaveBeenCalledWith(req, res);
  });

  it('delegates me to AuthService', async () => {
    const user = { sub: 'user-1' } as never;

    await controller.me(user);

    expect(authService.me).toHaveBeenCalledWith(user);
  });

  it('delegates changePassword to AuthService', async () => {
    const user = { sub: 'user-1' } as never;
    const body = {
      currentPassword: 'Secret123!',
      newPassword: 'NewSecret123!',
    };

    await controller.changePassword(user, body);

    expect(authService.changePassword).toHaveBeenCalledWith(
      'user-1',
      body.currentPassword,
      body.newPassword,
    );
  });
});
