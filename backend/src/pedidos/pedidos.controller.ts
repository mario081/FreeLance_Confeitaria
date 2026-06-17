import { Body, Controller, Get, Post, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CriarPedidoDto } from './dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @UseGuards(ApiKeyGuard)
  @Post()
  criar(@Body() dto: CriarPedidoDto) {
    return this.pedidosService.criar(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.pedidosService.listarTodos(page, limit);
  }
}
