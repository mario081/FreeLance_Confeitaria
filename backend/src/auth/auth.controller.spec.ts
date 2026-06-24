import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceLogin: jest.Mock;

  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(async () => {
    authServiceLogin = jest.fn().mockResolvedValue({ access_token: 'token.jwt' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login: authServiceLogin } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('login()', () => {
    it('seta cookie auth_token com httpOnly: true', async () => {
      await controller.login({ username: 'maria', password: 'senha' }, mockRes as any);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'auth_token',
        'token.jwt',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });

    it('retorna { ok: true }', async () => {
      const result = await controller.login(
        { username: 'maria', password: 'senha' },
        mockRes as any,
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('logout()', () => {
    it('limpa cookie auth_token', () => {
      controller.logout(mockRes as any);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('auth_token', expect.objectContaining({ path: '/' }));
    });
  });
});
