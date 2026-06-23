import { Controller, ForbiddenException, Get, Param, Patch, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TarefasService } from './tarefas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Get('hoje')
  hoje() {
    return this.tarefasService.tarefasDeHoje();
  }

  @Patch(':id/concluir')
  concluir(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user?.role !== 'confeiteira') {
      throw new ForbiddenException('Apenas a confeiteira pode concluir tarefas');
    }
    return this.tarefasService.concluir(id);
  }
}
