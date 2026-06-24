# Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar e escrever ~35 testes automatizados cobrindo a lógica de negócio central do backend NestJS e do frontend React.

**Architecture:** Backend usa Jest + @nestjs/testing com Prisma mockado via `jest.fn()` — sem banco de dados. Frontend usa Vitest + Testing Library com `fetch` mockado globalmente via `vi.fn()`. Duas suites independentes, cada uma com seu próprio config.

**Tech Stack:** NestJS 10, Prisma 5, Jest 29, ts-jest, @nestjs/testing | React 18, Vite 5, Vitest, @testing-library/react, jsdom

## Global Constraints

- Todos os comandos de backend rodam em: `/home/mario081/mario081.github.io/backend` (WSL)
- Todos os comandos de frontend rodam em: `/home/mario081/mario081.github.io/frontend` (WSL)
- Nenhum teste deve depender de banco de dados, servidor ou variáveis de ambiente reais
- `npm test` deve rodar sem erros em ambiente limpo
- Não usar `any` nos tipos TypeScript quando possível

---

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

---

### Task 2: Backend — Testes do AuthController e ApiKeyGuard

**Files:**
- Create: `backend/src/auth/auth.controller.spec.ts`
- Create: `backend/src/auth/api-key.guard.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1
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
npm test -- --testPathPattern=auth.controller
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
npm test -- --testPathPattern=api-key.guard
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
git add backend/src/auth/auth.controller.spec.ts backend/src/auth/api-key.guard.spec.ts
git commit -m "test: testes do AuthController e ApiKeyGuard"
```

---

### Task 3: Backend — Testes do TarefasService e TarefasController

**Files:**
- Create: `backend/src/tarefas/tarefas.service.spec.ts`
- Create: `backend/src/tarefas/tarefas.controller.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1
- Produz: lógica UTC de data e role guard testados

- [ ] **Step 1: Escrever testes do TarefasService**

Criar `backend/src/tarefas/tarefas.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TarefasService } from './tarefas.service';
import { PrismaService } from '../prisma.service';

describe('TarefasService', () => {
  let service: TarefasService;
  let tarefaFindMany: jest.Mock;
  let tarefaUpdate: jest.Mock;

  beforeEach(async () => {
    tarefaFindMany = jest.fn().mockResolvedValue([]);
    tarefaUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TarefasService,
        {
          provide: PrismaService,
          useValue: { tarefa: { findMany: tarefaFindMany, update: tarefaUpdate } },
        },
      ],
    }).compile();

    service = module.get<TarefasService>(TarefasService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('tarefasDeHoje()', () => {
    it('usa intervalo UTC do início ao fim do dia atual', async () => {
      await service.tarefasDeHoje();

      const args = tarefaFindMany.mock.calls[0][0];
      const gte: Date = args.where.dataProgramada.gte;
      const lte: Date = args.where.dataProgramada.lte;

      expect(gte.getUTCHours()).toBe(0);
      expect(gte.getUTCMinutes()).toBe(0);
      expect(gte.getUTCSeconds()).toBe(0);
      expect(lte.getUTCHours()).toBe(23);
      expect(lte.getUTCMinutes()).toBe(59);
      expect(lte.getUTCSeconds()).toBe(59);
    });

    it('inclui pedido na query', async () => {
      await service.tarefasDeHoje();
      const args = tarefaFindMany.mock.calls[0][0];
      expect(args.include).toEqual({ pedido: true });
    });

    it('ordena por id ascendente', async () => {
      await service.tarefasDeHoje();
      const args = tarefaFindMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ id: 'asc' });
    });
  });

  describe('concluir()', () => {
    it('atualiza concluida para true', async () => {
      tarefaUpdate.mockResolvedValue({ id: 1, concluida: true });

      const result = await service.concluir(1);

      expect(result).toEqual({ id: 1, concluida: true });
      expect(tarefaUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { concluida: true },
      });
    });

    it('lança NotFoundException quando Prisma retorna P2025', async () => {
      const erro = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      tarefaUpdate.mockRejectedValue(erro);

      await expect(service.concluir(999)).rejects.toThrow(NotFoundException);
    });

    it('re-lança erros que não são P2025', async () => {
      tarefaUpdate.mockRejectedValue(new Error('Erro de conexão'));

      await expect(service.concluir(1)).rejects.toThrow('Erro de conexão');
    });
  });
});
```

- [ ] **Step 2: Rodar para verificar que passam**

```bash
npm test -- --testPathPattern=tarefas.service
```

Expected:
```
PASS src/tarefas/tarefas.service.spec.ts
  TarefasService
    tarefasDeHoje()
      ✓ usa intervalo UTC do início ao fim do dia atual
      ✓ inclui pedido na query
      ✓ ordena por id ascendente
    concluir()
      ✓ atualiza concluida para true
      ✓ lança NotFoundException quando Prisma retorna P2025
      ✓ re-lança erros que não são P2025

Tests: 6 passed, 6 total
```

- [ ] **Step 3: Escrever testes do TarefasController**

Criar `backend/src/tarefas/tarefas.controller.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';

describe('TarefasController', () => {
  let controller: TarefasController;
  let tarefasDeHoje: jest.Mock;
  let concluir: jest.Mock;

  beforeEach(async () => {
    tarefasDeHoje = jest.fn().mockResolvedValue([]);
    concluir = jest.fn().mockResolvedValue({ id: 1, concluida: true });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TarefasController],
      providers: [
        { provide: TarefasService, useValue: { tarefasDeHoje, concluir } },
      ],
    }).compile();

    controller = module.get<TarefasController>(TarefasController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('hoje()', () => {
    it('chama tarefasDeHoje() e retorna o resultado', async () => {
      const tarefa = { id: 1, descricao: 'Teste' };
      tarefasDeHoje.mockResolvedValue([tarefa]);

      const result = await controller.hoje();

      expect(tarefasDeHoje).toHaveBeenCalled();
      expect(result).toEqual([tarefa]);
    });
  });

  describe('concluir()', () => {
    it('chama service.concluir() quando role é confeiteira', async () => {
      const req = { user: { role: 'confeiteira' } };
      await controller.concluir(1, req);
      expect(concluir).toHaveBeenCalledWith(1);
    });

    it('lança ForbiddenException quando role é funcionaria', async () => {
      const req = { user: { role: 'funcionaria' } };
      await expect(controller.concluir(1, req)).rejects.toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando user não tem role', async () => {
      const req = { user: {} };
      await expect(controller.concluir(1, req)).rejects.toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando user é undefined', async () => {
      const req = { user: undefined };
      await expect(controller.concluir(1, req)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 4: Rodar para verificar que passam**

```bash
npm test -- --testPathPattern=tarefas.controller
```

Expected:
```
PASS src/tarefas/tarefas.controller.spec.ts
  TarefasController
    hoje()
      ✓ chama tarefasDeHoje() e retorna o resultado
    concluir()
      ✓ chama service.concluir() quando role é confeiteira
      ✓ lança ForbiddenException quando role é funcionaria
      ✓ lança ForbiddenException quando user não tem role
      ✓ lança ForbiddenException quando user é undefined

Tests: 5 passed, 5 total
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/tarefas/tarefas.service.spec.ts backend/src/tarefas/tarefas.controller.spec.ts
git commit -m "test: testes do TarefasService e TarefasController"
```

---

### Task 4: Backend — Testes do PedidosService e DTO

**Files:**
- Create: `backend/src/pedidos/pedidos.service.spec.ts`
- Create: `backend/src/pedidos/pedidos.dto.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1, `CriarPedidoDto` da Task 1
- Produz: lógica de cronograma (5/4/3/0 dias), paginação e validação do DTO testados

- [ ] **Step 1: Escrever testes do PedidosService**

Criar `backend/src/pedidos/pedidos.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma.service';

describe('PedidosService', () => {
  let service: PedidosService;
  let pedidoCreate: jest.Mock;
  let pedidoFindMany: jest.Mock;

  beforeEach(async () => {
    pedidoCreate = jest.fn().mockResolvedValue({ id: 1 });
    pedidoFindMany = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        {
          provide: PrismaService,
          useValue: { pedido: { create: pedidoCreate, findMany: pedidoFindMany } },
        },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('criar()', () => {
    const baseDto = {
      nomeCliente: 'Ana',
      saborBolo: 'Chocolate',
      dataEntrega: '2099-12-25',
      possui_personalizados: false,
    };

    it('sem personalizados cria exatamente 3 tarefas', async () => {
      await service.criar(baseDto);

      const tarefas = pedidoCreate.mock.calls[0][0].data.tarefas.create;
      expect(tarefas).toHaveLength(3);
    });

    it('sem personalizados cria tarefas: Massas, Recheios, Montagem', async () => {
      await service.criar(baseDto);

      const tarefas = pedidoCreate.mock.calls[0][0].data.tarefas.create;
      const descricoes = tarefas.map((t: { descricao: string }) => t.descricao);
      expect(descricoes).toContain('Produção das Massas');
      expect(descricoes).toContain('Preparação de Recheios');
      expect(descricoes).toContain('Montagem e Decoração');
    });

    it('com personalizados cria exatamente 4 tarefas', async () => {
      await service.criar({ ...baseDto, possui_personalizados: true });

      const tarefas = pedidoCreate.mock.calls[0][0].data.tarefas.create;
      expect(tarefas).toHaveLength(4);
      const descricoes = tarefas.map((t: { descricao: string }) => t.descricao);
      expect(descricoes).toContain('Iniciar Confecção de Personalizados');
    });

    it('calcula dataProgramada de Massas como entrega - 5 dias (UTC)', async () => {
      await service.criar(baseDto); // dataEntrega: 2099-12-25

      const tarefas = pedidoCreate.mock.calls[0][0].data.tarefas.create;
      const massas = tarefas.find((t: { descricao: string }) => t.descricao === 'Produção das Massas');

      // 2099-12-25 - 5 dias = 2099-12-20
      expect(massas.dataProgramada.toISOString()).toMatch(/^2099-12-20/);
    });

    it('calcula dataProgramada de Montagem como dia da entrega (- 0 dias)', async () => {
      await service.criar(baseDto); // dataEntrega: 2099-12-25

      const tarefas = pedidoCreate.mock.calls[0][0].data.tarefas.create;
      const montagem = tarefas.find((t: { descricao: string }) => t.descricao === 'Montagem e Decoração');

      expect(montagem.dataProgramada.toISOString()).toMatch(/^2099-12-25/);
    });
  });

  describe('listarTodos()', () => {
    it('paginação padrão: take=50, skip=0', async () => {
      await service.listarTodos(1, 50);

      expect(pedidoFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      );
    });

    it('page=2, limit=10: take=10, skip=10', async () => {
      await service.listarTodos(2, 10);

      expect(pedidoFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 }),
      );
    });

    it('limit > 100 é capeado em 100', async () => {
      await service.listarTodos(1, 200);

      const args = pedidoFindMany.mock.calls[0][0];
      expect(args.take).toBe(100);
    });

    it('page < 1 lança BadRequestException', async () => {
      await expect(service.listarTodos(0, 10)).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Rodar para verificar que passam**

```bash
npm test -- --testPathPattern=pedidos.service
```

Expected:
```
PASS src/pedidos/pedidos.service.spec.ts
  PedidosService
    criar()
      ✓ sem personalizados cria exatamente 3 tarefas
      ✓ sem personalizados cria tarefas: Massas, Recheios, Montagem
      ✓ com personalizados cria exatamente 4 tarefas
      ✓ calcula dataProgramada de Massas como entrega - 5 dias (UTC)
      ✓ calcula dataProgramada de Montagem como dia da entrega (- 0 dias)
    listarTodos()
      ✓ paginação padrão: take=50, skip=0
      ✓ page=2, limit=10: take=10, skip=10
      ✓ limit > 100 é capeado em 100
      ✓ page < 1 lança BadRequestException

Tests: 9 passed, 9 total
```

- [ ] **Step 3: Escrever testes de validação do DTO**

Criar `backend/src/pedidos/pedidos.dto.spec.ts`:
```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CriarPedidoDto } from './dto';

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return plainToInstance(CriarPedidoDto, {
    nomeCliente: 'Ana Silva',
    saborBolo: 'Chocolate',
    dataEntrega: '2099-12-25',
    possui_personalizados: false,
    ...overrides,
  });
}

describe('CriarPedidoDto', () => {
  it('aceita DTO válido', async () => {
    const errors = await validate(dto());
    expect(errors).toHaveLength(0);
  });

  it('rejeita dataEntrega no passado', async () => {
    const errors = await validate(dto({ dataEntrega: '2000-01-01' }));
    expect(errors.some((e) => e.property === 'dataEntrega')).toBe(true);
  });

  it('rejeita nomeCliente com menos de 2 caracteres', async () => {
    const errors = await validate(dto({ nomeCliente: 'A' }));
    expect(errors.some((e) => e.property === 'nomeCliente')).toBe(true);
  });

  it('rejeita nomeCliente com mais de 120 caracteres', async () => {
    const errors = await validate(dto({ nomeCliente: 'A'.repeat(121) }));
    expect(errors.some((e) => e.property === 'nomeCliente')).toBe(true);
  });

  it('rejeita saborBolo com menos de 2 caracteres', async () => {
    const errors = await validate(dto({ saborBolo: 'X' }));
    expect(errors.some((e) => e.property === 'saborBolo')).toBe(true);
  });

  it('rejeita possui_personalizados que não é boolean', async () => {
    const errors = await validate(dto({ possui_personalizados: 'sim' }));
    expect(errors.some((e) => e.property === 'possui_personalizados')).toBe(true);
  });
});
```

- [ ] **Step 4: Rodar para verificar que passam**

```bash
npm test -- --testPathPattern=pedidos.dto
```

Expected:
```
PASS src/pedidos/pedidos.dto.spec.ts
  CriarPedidoDto
    ✓ aceita DTO válido
    ✓ rejeita dataEntrega no passado
    ✓ rejeita nomeCliente com menos de 2 caracteres
    ✓ rejeita nomeCliente com mais de 120 caracteres
    ✓ rejeita saborBolo com menos de 2 caracteres
    ✓ rejeita possui_personalizados que não é boolean

Tests: 6 passed, 6 total
```

- [ ] **Step 5: Rodar toda a suite backend**

```bash
npm test
```

Expected:
```
Test Suites: 7 passed, 7 total
Tests:       ~31 passed, ~31 total
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/pedidos/pedidos.service.spec.ts backend/src/pedidos/pedidos.dto.spec.ts
git commit -m "test: testes do PedidosService e CriarPedidoDto"
```

---

### Task 5: Frontend — Setup Vitest + testes do Login

**Files:**
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test-setup.js`
- Modify: `frontend/package.json` — adicionar scripts e deps
- Create: `frontend/src/Login.test.jsx`

**Interfaces:**
- Produz: infraestrutura Vitest funcionando; componente Login testado

- [ ] **Step 1: Instalar dependências de teste no frontend**

Em WSL, dentro de `/home/mario081/mario081.github.io/frontend`:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: `added N packages` sem erros.

- [ ] **Step 2: Adicionar scripts no package.json do frontend**

Adicionar ao `"scripts"` em `frontend/package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

O bloco `"scripts"` completo deve ficar:
```json
"scripts": {
  "dev": "vite --host",
  "build": "vite build",
  "preview": "vite preview --host --port 5173",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Criar vitest.config.js**

Criar `frontend/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
});
```

- [ ] **Step 4: Criar arquivo de setup dos testes**

Criar `frontend/src/test-setup.js`:
```javascript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Escrever testes do componente Login**

Criar `frontend/src/Login.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Login from './Login';

describe('Login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza campos de usuário e senha e o botão Entrar', () => {
    render(<Login onLogin={vi.fn()} />);

    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('chama POST /api/auth/login com as credenciais digitadas', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({ ok: true });

    render(<Login onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText('Usuário'), 'maria');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'maria', password: 'senha123' }),
    }));
  });

  it('chama onLogin com o username após login bem-sucedido', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    fetch.mockResolvedValue({ ok: true });

    render(<Login onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Usuário'), 'maria');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('maria'));
  });

  it('exibe mensagem de erro quando login falha (401)', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({ ok: false, status: 401 });

    render(<Login onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText('Usuário'), 'errado');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByText('Usuário ou senha inválidos')).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 6: Rodar para verificar que passam**

```bash
npm test
```

Expected:
```
PASS src/Login.test.jsx
  Login
    ✓ renderiza campos de usuário e senha e o botão Entrar
    ✓ chama POST /api/auth/login com as credenciais digitadas
    ✓ chama onLogin com o username após login bem-sucedido
    ✓ exibe mensagem de erro quando login falha (401)

Tests: 4 passed, 4 total
```

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/vitest.config.js frontend/src/test-setup.js frontend/src/Login.test.jsx
git commit -m "test: setup Vitest e testes do componente Login"
```

---

### Task 6: Frontend — Testes do componente App

**Files:**
- Create: `frontend/src/App.test.jsx`

**Interfaces:**
- Consome: infraestrutura Vitest da Task 5
- Produz: fluxos principais do dashboard (carregamento, tarefas, concluir, logout) testados

- [ ] **Step 1: Escrever os testes do App**

Criar `frontend/src/App.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exibe "Carregando…" enquanto fetch não resolve', () => {
    fetch.mockReturnValue(new Promise(() => {})); // nunca resolve
    render(<App />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('exibe componente Login quando /tarefas/hoje retorna 401', async () => {
    fetch.mockResolvedValue({ status: 401, ok: false });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    );
  });

  it('exibe tarefas do dia quando fetch retorna lista', async () => {
    const tarefas = [
      { id: 1, descricao: 'Produção das Massas', concluida: false, pedido: { nomeCliente: 'Ana', saborBolo: 'Chocolate' } },
    ];
    fetch.mockResolvedValue({ status: 200, ok: true, json: async () => tarefas });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Produção das Massas')).toBeInTheDocument()
    );
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });

  it('exibe mensagem de lista vazia quando não há tarefas', async () => {
    fetch.mockResolvedValue({ status: 200, ok: true, json: async () => [] });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Nenhuma tarefa programada para hoje 🎉')).toBeInTheDocument()
    );
  });

  it('clique em Concluir chama PATCH /api/tarefas/:id/concluir', async () => {
    const user = userEvent.setup();
    const tarefas = [
      { id: 5, descricao: 'Preparação de Recheios', concluida: false, pedido: { nomeCliente: 'Bia', saborBolo: 'Morango' } },
    ];

    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tarefas }) // GET hoje
      .mockResolvedValueOnce({ status: 200, ok: true }); // PATCH concluir

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(fetch).toHaveBeenCalledWith('/api/tarefas/5/concluir', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
    }));
  });

  it('após concluir, tarefa aparece com badge "Concluída ✓"', async () => {
    const user = userEvent.setup();
    const tarefas = [
      { id: 3, descricao: 'Montagem e Decoração', concluida: false, pedido: { nomeCliente: 'Carla', saborBolo: 'Red Velvet' } },
    ];

    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tarefas })
      .mockResolvedValueOnce({ status: 200, ok: true });

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    await waitFor(() =>
      expect(screen.getByText('Concluída ✓')).toBeInTheDocument()
    );
  });

  it('clique em Sair chama POST /api/auth/logout e exibe Login', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => [] }) // GET hoje
      .mockResolvedValueOnce({ status: 200, ok: true }); // POST logout

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Sair' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Rodar para verificar que passam**

```bash
npm test
```

Expected:
```
PASS src/App.test.jsx
  App
    ✓ exibe "Carregando…" enquanto fetch não resolve
    ✓ exibe componente Login quando /tarefas/hoje retorna 401
    ✓ exibe tarefas do dia quando fetch retorna lista
    ✓ exibe mensagem de lista vazia quando não há tarefas
    ✓ clique em Concluir chama PATCH /api/tarefas/:id/concluir
    ✓ após concluir, tarefa aparece com badge "Concluída ✓"
    ✓ clique em Sair chama POST /api/auth/logout e exibe Login

Tests: 11 passed, 11 total (Login: 4, App: 7)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.test.jsx
git commit -m "test: testes do componente App (dashboard)"
```

---

## Resumo Final

| Suite | Testes | Comando |
|---|---|---|
| Backend | ~31 testes em 7 arquivos | `cd backend && npm test` |
| Frontend | ~11 testes em 2 arquivos | `cd frontend && npm test` |
| **Total** | **~42 testes** | — |

Cobertura dos fluxos críticos:
- Autenticação (login, logout, JWT cookie, API key)
- Role guard (confeiteira vs funcionaria)
- Cronograma de produção (5/4/3/0 dias, UTC)
- Paginação de pedidos
- Validação de DTO (data futura, min/max length)
- UI: carregamento, tarefas, concluir, sair, erro
