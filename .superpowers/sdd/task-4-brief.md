### Task 4: Backend — Testes do PedidosService e DTO

**Files:**
- Create: `backend/src/pedidos/pedidos.service.spec.ts`
- Create: `backend/src/pedidos/pedidos.dto.spec.ts`

**Interfaces:**
- Consome: infraestrutura Jest da Task 1 (já instalada), `CriarPedidoDto` de `dto.ts`
- Produz: lógica de cronograma (5/4/3/0 dias), paginação e validação do DTO testados

**IMPORTANT:** `TarefasController.concluir()` é síncrono — use `expect(() => ...).toThrow()` para exceções síncronas (aprendido na Task 3). No PedidosService, `listarTodos()` é async, então use `await expect(...).rejects.toThrow()`.

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
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/backend && npx jest --testPathPatterns=pedidos.service
```

Expected: 9 testes passando.

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
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/backend && npx jest --testPathPatterns=pedidos.dto
```

Expected: 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git -C /home/mario081/mario081.github.io add backend/src/pedidos/pedidos.service.spec.ts backend/src/pedidos/pedidos.dto.spec.ts
git -C /home/mario081/mario081.github.io commit -m "test: testes do PedidosService e CriarPedidoDto"
```
