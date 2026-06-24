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

    it('lança ForbiddenException quando role é funcionaria', () => {
      const req = { user: { role: 'funcionaria' } };
      expect(() => controller.concluir(1, req)).toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando user não tem role', () => {
      const req = { user: {} };
      expect(() => controller.concluir(1, req)).toThrow(ForbiddenException);
    });

    it('lança ForbiddenException quando user é undefined', () => {
      const req = { user: undefined };
      expect(() => controller.concluir(1, req)).toThrow(ForbiddenException);
    });
  });
});
