import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const CHAVE = 'chave-secreta-exatamente-32chars!';

  function mockContext(apiKey: string | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': apiKey } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    process.env.BACKEND_API_KEY = CHAVE;
  });

  afterEach(() => {
    delete process.env.BACKEND_API_KEY;
  });

  it('retorna true com a chave correta', () => {
    const guard = new ApiKeyGuard();
    expect(guard.canActivate(mockContext(CHAVE))).toBe(true);
  });

  it('lança UnauthorizedException com chave ausente', () => {
    const guard = new ApiKeyGuard();
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException com chave de tamanho diferente', () => {
    const guard = new ApiKeyGuard();
    expect(() => guard.canActivate(mockContext('curta'))).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException se BACKEND_API_KEY não está configurada', () => {
    delete process.env.BACKEND_API_KEY;
    const guard = new ApiKeyGuard();
    expect(() => guard.canActivate(mockContext(CHAVE))).toThrow(UnauthorizedException);
  });
});
