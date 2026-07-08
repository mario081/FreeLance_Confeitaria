### Task 3: Backend — Testes do TarefasService e TarefasController

**Files:**
- Create: `backend/src/tarefas/tarefas.service.spec.ts`
- Create: `backend/src/tarefas/tarefas.controller.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1 (já instalada)
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
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/backend && npx jest --testPathPatterns=tarefas.service
```

Expected: 6 testes passando.

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
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/backend && npx jest --testPathPatterns=tarefas.controller
```

Expected: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git -C /home/mario081/mario081.github.io add backend/src/tarefas/tarefas.service.spec.ts backend/src/tarefas/tarefas.controller.spec.ts
git -C /home/mario081/mario081.github.io commit -m "test: testes do TarefasService e TarefasController"
```

**Note:** Jest 30 usa `--testPathPatterns` (plural). npm commands precisam do nvm: `source ~/.nvm/nvm.sh`.
