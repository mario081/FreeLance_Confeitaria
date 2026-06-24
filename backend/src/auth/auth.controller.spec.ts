import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceLogin: jest.Mock;
  let mockRes: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(async () => {
    mockRes = { cookie: jest.fn(), clearCookie: jest.fn() };
    authServiceLogin = jest.fn().mockResolvedValue({ access_token: 'token.jwt' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login: authServiceLogin } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login()', () => {
    it('seta cookie auth_token com httpOnly: true', async () => {
      await controller.login({ username: 'maria', password: 'senha' }, mockRes as unknown as Response);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'auth_token',
        'token.jwt',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });

    it('retorna { ok: true }', async () => {
      const result = await controller.login(
        { username: 'maria', password: 'senha' },
        mockRes as unknown as Response,
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('logout()', () => {
    it('limpa cookie auth_token', () => {
      controller.logout(mockRes as unknown as Response);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('auth_token', expect.objectContaining({ path: '/' }));
    });
  });
});
