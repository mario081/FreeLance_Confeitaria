# Task 1 Report: Backend — Setup Jest + testes do AuthService

**Status:** DONE_WITH_CONCERNS

## What Was Done

### Steps Completed

1. **Installed test dependencies** in WSL via `npm install --save-dev jest @types/jest ts-jest @nestjs/testing@^10.0.0`
   - Had to pin `@nestjs/testing` to `^10.x` because the project uses `@nestjs/common@^10` and the default install resolved to v11 (peer dep conflict).
   - Installed versions: jest@30.4.2, ts-jest@29.4.11, @types/jest@30.0.0, @nestjs/testing@10.4.22

2. **Updated `backend/package.json`** — added `"test": "jest"` and `"test:coverage": "jest --coverage"` to scripts.

3. **Created `backend/jest.config.ts`** — exactly as specified in the brief.

4. **Created `backend/src/auth/auth.service.spec.ts`** — exactly as specified, with all 3 test cases.

5. **Ran tests** — all 3 passed.

6. **Committed** — commit `bc65984` "test: setup Jest e testes do AuthService".

## Test Results

```
PASS src/auth/auth.service.spec.ts
  AuthService
    ✓ retorna access_token com credenciais válidas (7 ms)
    ✓ lança UnauthorizedException com senha incorreta (5 ms)
    ✓ lança UnauthorizedException se usuário não existe (1 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        1.772 s
```

## Concerns

### 1. Jest 30 renamed `--testPathPattern` to `--testPathPatterns`

The task brief says to run `npm test -- --testPathPattern=auth.service` but Jest 30 replaced this flag with `--testPathPatterns`. Using the old flag causes an error:

```
Option "testPathPattern" was replaced by "--testPathPatterns". "--testPathPatterns" is only available as a command-line option.
```

**Impact:** The tests themselves pass fine; only the developer-facing run command in the brief is outdated. The `npm test` script without patterns works correctly for CI. Future tasks referencing this flag should use `--testPathPatterns` instead.

### 2. npm had to run inside WSL with interactive bash

Due to nvm being the node manager, npm commands need `-i` (interactive bash) to load the nvm environment. Commands run via plain `wsl --` do not have node in PATH. This is a developer environment note, not a code issue.

### 3. `@nestjs/testing` version pinned at ^10 (not latest)

The brief specified `@nestjs/testing` without a version (which resolves to v11 at time of install), but the rest of the project is on NestJS 10. This was resolved by explicitly pinning to `^10.0.0`. If the project ever upgrades to NestJS 11, this devDependency should be unpinned.

## Files Created/Modified

- `backend/package.json` — added test scripts, devDeps updated by npm
- `backend/package-lock.json` — updated by npm install
- `backend/jest.config.ts` — created (new)
- `backend/src/auth/auth.service.spec.ts` — created (new)

## Commit

`bc65984` — "test: setup Jest e testes do AuthService"
