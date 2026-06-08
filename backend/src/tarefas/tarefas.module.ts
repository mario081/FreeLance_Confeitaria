import { Module } from '@nestjs/common';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TarefasController],
  providers: [TarefasService, PrismaService],
})
export class TarefasModule {}
