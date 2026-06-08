CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "saborBolo" TEXT NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "possuiPersonalizados" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tarefa" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataProgramada" TIMESTAMP(3) NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "pedidoId" INTEGER NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
