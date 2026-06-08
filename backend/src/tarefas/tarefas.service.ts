import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function inicioDoDia(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function fimDoDia(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
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
    return this.prisma.tarefa.update({
      where: { id },
      data: { concluida: true },
    });
  }
}
