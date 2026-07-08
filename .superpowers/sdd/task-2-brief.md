### Task 2: Backend — Testes do AuthController e ApiKeyGuard

**Files:**
- Create: `backend/src/auth/auth.controller.spec.ts`
- Create: `backend/src/auth/api-key.guard.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1 (já instalada: jest, ts-jest, @nestjs/testing)
- Produz: `AuthController` e `ApiKeyGuard` cobertos por testes

- [ ] **Step 1: Escrever testes do AuthController**

Criar `backend/src/auth/auth.controller.spec.ts`:
```typescript
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
```

- [ ] **Step 2: Rodar para verificar que passam**

```bash
cd /home/mario081/mario081.github.io/backend && npm test -- --testPathPatterns=auth.controller
```

Expected:
```
PASS src/auth/auth.controller.spec.ts
  AuthController
    login()
      ✓ seta cookie auth_token com httpOnly: true
      ✓ retorna { ok: true }
    logout()
      ✓ limpa cookie auth_token

Tests: 3 passed, 3 total
```

- [ ] **Step 3: Escrever testes do ApiKeyGuard**

Criar `backend/src/auth/api-key.guard.spec.ts`:
```typescript
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
```

- [ ] **Step 4: Rodar para verificar que passam**

```bash
cd /home/mario081/mario081.github.io/backend && npm test -- --testPathPatterns=api-key.guard
```

Expected:
```
PASS src/auth/api-key.guard.spec.ts
  ApiKeyGuard
    ✓ retorna true com a chave correta
    ✓ lança UnauthorizedException com chave ausente
    ✓ lança UnauthorizedException com chave de tamanho diferente
    ✓ lança UnauthorizedException se BACKEND_API_KEY não está configurada

Tests: 4 passed, 4 total
```

- [ ] **Step 5: Commit**

```bash
git -C /home/mario081/mario081.github.io add backend/src/auth/auth.controller.spec.ts backend/src/auth/api-key.guard.spec.ts
git -C /home/mario081/mario081.github.io commit -m "test: testes do AuthController e ApiKeyGuard"
```

**Note:** Jest 30 renamed `--testPathPattern` to `--testPathPatterns` — use the new flag name.
