# Task 2 Report: Testes do AuthController e ApiKeyGuard

## Status: DONE

## Summary

Created two spec files for the NestJS confeitaria backend auth module. All 7 tests pass.

## Files Created

- `backend/src/auth/auth.controller.spec.ts` — 3 tests covering login cookie setup and logout
- `backend/src/auth/api-key.guard.spec.ts` — 4 tests covering valid key, missing key, wrong length key, and unconfigured server key

## Test Results

### auth.controller.spec.ts
```
PASS src/auth/auth.controller.spec.ts
  AuthController
    login()
      ✓ seta cookie auth_token com httpOnly: true (8 ms)
      ✓ retorna { ok: true } (3 ms)
    logout()
      ✓ limpa cookie auth_token (2 ms)
Tests: 3 passed, 3 total
```

### api-key.guard.spec.ts
```
PASS src/auth/api-key.guard.spec.ts
  ApiKeyGuard
    ✓ retorna true com a chave correta (1 ms)
    ✓ lança UnauthorizedException com chave ausente (5 ms)
    ✓ lança UnauthorizedException com chave de tamanho diferente (1 ms)
    ✓ lança UnauthorizedException se BACKEND_API_KEY não está configurada
Tests: 4 passed, 4 total
```

## Commit

- `c4b2c4d` — test: testes do AuthController e ApiKeyGuard

## Implementation Notes

- Tests match exactly the spec defined in task-2-brief.md
- AuthController tests use `@nestjs/testing` module pattern with mocked `AuthService`
- ApiKeyGuard tests instantiate the guard directly (no DI needed) and control `process.env.BACKEND_API_KEY` via beforeEach/afterEach
- The `timingSafeEqual` comparison in ApiKeyGuard requires the received key to match the expected key's length — the test for "chave de tamanho diferente" ("curta" is 5 chars vs 34 chars) correctly triggers `UnauthorizedException`
- Environment note: WSL Ubuntu uses NVM node (v24.17.0); Windows npm from C:\Program Files\nodejs was being picked up by default, requiring explicit NVM sourcing for test runs

## Concerns

None. All 7 tests pass as specified.

---

## Fix Addendum: mockRes isolation + type safety (2026-06-23)

### What was changed

File: `backend/src/auth/auth.controller.spec.ts`

**Fix 1 — mockRes isolated per test:**
- Removed the module-level `const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() }` declaration.
- Added `let mockRes: { cookie: jest.Mock; clearCookie: jest.Mock };` at describe scope.
- Inside `beforeEach`, assigned `mockRes = { cookie: jest.fn(), clearCookie: jest.fn() };` so each test gets fresh mocks.
- Removed the now-redundant `jest.clearAllMocks()` call.

**Fix 2 — Replace `as any` with `as unknown as Response`:**
- Added `import { Response } from 'express';` at the top of the file.
- Changed all three `mockRes as any` casts to `mockRes as unknown as Response`.

### Test Results

Command: `npx jest --testPathPatterns=auth.controller`

```
PASS src/auth/auth.controller.spec.ts
  AuthController
    login()
      ✓ seta cookie auth_token com httpOnly: true (8 ms)
      ✓ retorna { ok: true } (2 ms)
    logout()
      ✓ limpa cookie auth_token (1 ms)

Tests: 3 passed, 3 total
Time: 1.742 s
```

### Commit

- `341fa47` — fix(test): mockRes isolado por teste e remove as any em auth.controller.spec
