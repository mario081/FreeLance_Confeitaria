import { Module } from '@nestjs/common';
import { PedidosModule } from './pedidos/pedidos.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, PedidosModule, TarefasModule],
})
export class AppModule {}
