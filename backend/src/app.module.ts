import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PedidosModule } from './pedidos/pedidos.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    PedidosModule,
    TarefasModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
