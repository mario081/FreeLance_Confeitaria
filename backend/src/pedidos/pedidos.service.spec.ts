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
