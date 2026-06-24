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
