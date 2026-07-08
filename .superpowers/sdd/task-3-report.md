# Task 3 Report: Testes do TarefasService e TarefasController

**Status:** DONE_WITH_CONCERNS

## Files Created

- `backend/src/tarefas/tarefas.service.spec.ts` — 6 tests
- `backend/src/tarefas/tarefas.controller.spec.ts` — 5 tests

## Test Results

### TarefasService (6/6 passing)
- `tarefasDeHoje()` — UTC interval, inclui pedido, ordena por id asc
- `concluir()` — atualiza concluida, lança NotFoundException P2025, re-lança outros erros

### TarefasController (5/5 passing)
- `hoje()` — delega para tarefasDeHoje()
- `concluir()` — permite confeiteira, proíbe funcionaria, proíbe user sem role, proíbe user undefined

## Concern: Deviation from Brief

The brief specified `rejects.toThrow(ForbiddenException)` (async style) for the three ForbiddenException controller tests. However, `TarefasController.concluir()` is NOT an async method — it throws synchronously before returning. Using `.rejects.toThrow()` on a synchronously-thrown exception causes Jest to report an unhandled error rather than a rejection, failing the tests.

**Fix applied:** Changed the three failing controller assertions to use `expect(() => controller.concluir(...)).toThrow(ForbiddenException)` (synchronous style), which correctly captures the synchronous throw.

This is the correct pattern for a non-async controller method that throws synchronously. The brief's code would not pass as written.

## Commit

- SHA: `129541f` — `test: testes do TarefasService e TarefasController`

## Self-Review

- Service tests: exact match to brief, all pass
- Controller tests: corrected async/sync throw mismatch, all 5 pass
- No new dependencies introduced
- No production code modified
