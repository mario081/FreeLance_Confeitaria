import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CriarPedidoDto } from './dto';

// Usa UTC para evitar desvio de fuso: datas ISO date-only chegam como UTC midnight.
function subtrairDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() - dias);
  return resultado;
}

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CriarPedidoDto) {
    const dataEntrega = new Date(dto.dataEntrega);

    // Cronograma sincronizado com a Ficha de Produção enviada ao cliente via n8n:
    //   Dia -5: Produção das Massas
    //   Dia -4: Preparação de Recheios
    //   Dia -3: Iniciar Confecção de Personalizados (se houver)
    //   Dia  0: Montagem e Decoração (dia da entrega)
    const tarefas = [
      { dias: 5, descricao: 'Produção das Massas' },
      { dias: 4, descricao: 'Preparação de Recheios' },
      { dias: 0, descricao: 'Montagem e Decoração' },
    ];

    if (dto.possui_personalizados) {
      tarefas.push({ dias: 3, descricao: 'Iniciar Confecção de Personalizados' });
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
    if (page < 1) throw new BadRequestException('page deve ser >= 1');
    const take = Math.min(Math.max(1, limit), 100);
    const skip = (page - 1) * take;
    return this.prisma.pedido.findMany({
      include: { tarefas: true },
      orderBy: { criadoEm: 'desc' },
      take,
      skip,
    });
  }
}
