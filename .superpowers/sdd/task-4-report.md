# Task 4 Report: Testes do PedidosService e CriarPedidoDto

## Status: DONE

## Files Created

- `backend/src/pedidos/pedidos.service.spec.ts` — 9 testes do PedidosService
- `backend/src/pedidos/pedidos.dto.spec.ts` — 6 testes do CriarPedidoDto

## Commit

SHA: `34fd6d8`
Message: `test: testes do PedidosService e CriarPedidoDto`

## Test Results

### pedidos.service.spec.ts — 9/9 PASS

```
PedidosService
  criar()
    ✓ sem personalizados cria exatamente 3 tarefas
    ✓ sem personalizados cria tarefas: Massas, Recheios, Montagem
    ✓ com personalizados cria exatamente 4 tarefas
    ✓ calcula dataProgramada de Massas como entrega - 5 dias (UTC)
    ✓ calcula dataProgramada de Montagem como dia da entrega (- 0 dias)
  listarTodos()
    ✓ paginação padrão: take=50, skip=0
    ✓ page=2, limit=10: take=10, skip=10
    ✓ limit > 100 é capeado em 100
    ✓ page < 1 lança BadRequestException
```

### pedidos.dto.spec.ts — 6/6 PASS

```
CriarPedidoDto
  ✓ aceita DTO válido
  ✓ rejeita dataEntrega no passado
  ✓ rejeita nomeCliente com menos de 2 caracteres
  ✓ rejeita nomeCliente com mais de 120 caracteres
  ✓ rejeita saborBolo com menos de 2 caracteres
  ✓ rejeita possui_personalizados que não é boolean
```

## Implementation Notes

- Spec files written exactly as specified in the task brief with no deviations.
- Service tests use NestJS `Test.createTestingModule` with a PrismaService mock.
- DTO tests use `plainToInstance` + `validate` from class-validator; the `IsFutureDate` custom validator correctly rejects past dates.
- UTC date arithmetic (`setUTCDate`) in `subtrairDias()` is verified: `2099-12-25 - 5 = 2099-12-20` matches ISO string prefix.
- `listarTodos()` pagination cap test confirms `Math.min(Math.max(1, 200), 100) = 100`.
- `page < 1` test uses `await expect(...).rejects.toThrow(BadRequestException)` as the method is async.

## Concerns

None. All 15 tests pass as expected.
