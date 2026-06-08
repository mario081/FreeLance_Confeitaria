import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CriarPedidoDto } from './dto';

function subtrairDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() - dias);
  return resultado;
}

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CriarPedidoDto) {
    const dataEntrega = new Date(dto.dataEntrega);

    const tarefas = [
      { dias: 1, descricao: 'Montagem e Decoração' },
      { dias: 2, descricao: 'Preparação de Recheios' },
      { dias: 3, descricao: 'Produção das Massas' },
    ];

    if (dto.possui_personalizados) {
      tarefas.push({ dias: 4, descricao: 'Iniciar Confecção de Personalizados' });
    }

    return this.prisma.pedido.create({
      data: {
        nomeCliente: dto.nomeCliente,
        saborBolo: dto.saborBolo,
        dataEntrega,
        possuiPersonalizados: dto.possui_personalizados,
        tarefas: {
          create: tarefas.map((t) => ({
            descricao: t.descricao,
            dataProgramada: subtrairDias(dataEntrega, t.dias),
          })),
        },
      },
      include: { tarefas: true },
    });
  }

  async listarTodos(page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    return this.prisma.pedido.findMany({
      include: { tarefas: true },
      orderBy: { criadoEm: 'desc' },
      take,
      skip,
    });
  }
}
