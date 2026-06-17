import { Controller, Get, Param, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TarefasService } from './tarefas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Get('hoje')
  hoje() {
    return this.tarefasService.tarefasDeHoje();
  }

  @Patch(':id/concluir')
  concluir(@Param('id', ParseIntPipe) id: number) {
    return this.tarefasService.concluir(id);
  }
}
