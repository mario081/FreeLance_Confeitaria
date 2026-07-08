### Task 1: Backend — Setup Jest + testes do AuthService

**Files:**
- Modify: `backend/package.json` — adicionar scripts de teste e deps
- Create: `backend/jest.config.ts`
- Create: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Produz: infraestrutura Jest funcionando; `AuthService` testado com Prisma e bcrypt mockados

- [ ] **Step 1: Instalar dependências de teste no backend**

Em WSL, dentro de `/home/mario081/mario081.github.io/backend`:
```bash
npm install --save-dev jest @types/jest ts-jest @nestjs/testing
```

Expected: `added N packages` sem erros.

- [ ] **Step 2: Adicionar scripts de teste no package.json**

Adicionar ao `"scripts"` em `backend/package.json`:
```json
"test": "jest",
"test:coverage": "jest --coverage"
```

O bloco `"scripts"` completo deve ficar:
```json
"scripts": {
  "build": "nest build",
  "start": "node dist/main",
  "start:dev": "nest start --watch",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate deploy",
  "prisma:migrate:dev": "prisma migrate dev",
  "prisma:seed": "prisma db seed",
  "test": "jest",
  "test:coverage": "jest --coverage"
}
```

- [ ] **Step 3: Criar jest.config.ts**

Criar `backend/jest.config.ts` com o conteúdo:
```typescript
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: { types: ['jest', 'node'] },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
};
```

- [ ] **Step 4: Escrever os testes do AuthService**

Criar `backend/src/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const bcryptCompare = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prismaUserFindUnique: jest.Mock;
  let jwtSign: jest.Mock;

  beforeEach(async () => {
    prismaUserFindUnique = jest.fn();
    jwtSign = jest.fn().mockReturnValue('token.jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: prismaUserFindUnique } },
        },
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('retorna access_token com credenciais válidas', async () => {
    prismaUserFindUnique.mockResolvedValue({
      id: 1, username: 'maria', password: 'hash', role: 'confeiteira',
    });
    bcryptCompare.mockResolvedValue(true);

    const result = await service.login('maria', 'senha123');

    expect(result).toEqual({ access_token: 'token.jwt' });
    expect(jwtSign).toHaveBeenCalledWith({ sub: 1, username: 'maria', role: 'confeiteira' });
  });

  it('lança UnauthorizedException com senha incorreta', async () => {
    prismaUserFindUnique.mockResolvedValue({
      id: 1, username: 'maria', password: 'hash', role: 'confeiteira',
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(service.login('maria', 'errada')).rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException se usuário não existe', async () => {
    prismaUserFindUnique.mockResolvedValue(null);
    bcryptCompare.mockResolvedValue(false);

    await expect(service.login('naoexiste', 'qualquer')).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 5: Rodar para garantir que passam**

```bash
npm test -- --testPathPattern=auth.service
```

Expected:
```
PASS src/auth/auth.service.spec.ts
  AuthService
    ✓ retorna access_token com credenciais válidas
    ✓ lança UnauthorizedException com senha incorreta
    ✓ lança UnauthorizedException se usuário não existe

Tests: 3 passed, 3 total
```

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/jest.config.ts backend/src/auth/auth.service.spec.ts
git commit -m "test: setup Jest e testes do AuthService"
```
