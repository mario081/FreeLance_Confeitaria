import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

// dataProgramada é gravado como UTC midnight; usa UTC para o intervalo não vazar entre fusos.
function inicioDoDia(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function fimDoDia(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

@Injectable()
export class TarefasService {
  constructor(private prisma: PrismaService) {}

  async tarefasDeHoje() {
    const hoje = new Date();
    return this.prisma.tarefa.findMany({
      where: {
        dataProgramada: {
          gte: inicioDoDia(hoje),
          lte: fimDoDia(hoje),
        },
      },
      include: { pedido: true },
      orderBy: { id: 'asc' },
    });
  }

  async concluir(id: number) {
    try {
      return await this.prisma.tarefa.update({
        where: { id },
        data: { concluida: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`Tarefa ${id} não encontrada`);
      }
      throw e;
    }
  }
}
