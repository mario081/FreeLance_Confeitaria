import { Module } from '@nestjs/common';
import { PedidosModule } from './pedidos/pedidos.module';
import { TarefasModule } from './tarefas/tarefas.module';

@Module({
  imports: [PedidosModule, TarefasModule],
})
export class AppModule {}
