---
name: test-suite-design
description: Design da suite de testes para o projeto confeitaria fullstack (NestJS + React)
metadata:
  type: project
---

# Suite de Testes — Confeitaria Fullstack

## Contexto

Projeto fullstack para gestão de pedidos de confeitaria:
- **Backend**: NestJS + Prisma + PostgreSQL, JWT httpOnly cookie, API key guard, rate limiting
- **Frontend**: React + Vite + Tailwind CSS, fetch com cookies, dashboard de tarefas
- **Estado atual**: Zero testes instalados

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Framework backend | Jest + @nestjs/testing | Peer dependency nativa do NestJS |
| Banco nos testes | Mock do Prisma (jest.fn()) | Sem dependência de infra, roda em CI/CD |
| Framework frontend | Vitest + Testing Library | Zero-config com Vite/ESM |
| Escopo | Core business logic | ~25 backend + ~10 frontend = ~35 testes |
| Estrutura | Duas suites independentes | Mais simples que monorepo unificado |

## Backend

### Dependências a instalar (devDependencies)

```
@nestjs/testing
jest
@types/jest
ts-jest
supertest
@types/supertest
```

### jest.config.ts

```ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

### Testes planejados

#### `auth/auth.service.spec.ts` (~5 testes)
- `login()` com credenciais válidas → retorna `access_token`
- `login()` com senha errada → lança `UnauthorizedException`
- `login()` com usuário inexistente → lança `UnauthorizedException`
- Prisma mockado com `jest.fn()` para `user.findUnique`
- bcrypt mockado para evitar custo de hash

#### `auth/auth.controller.spec.ts` (~3 testes)
- POST login → seta cookie `auth_token` httpOnly
- POST login com credenciais inválidas → 401
- POST logout → limpa cookie `auth_token`

#### `auth/api-key.guard.spec.ts` (~4 testes)
- Chave correta → `canActivate` retorna `true`
- Chave ausente → lança `UnauthorizedException`
- Chave com tamanho diferente → lança (evita timing attack)
- `BACKEND_API_KEY` não configurada → lança

#### `tarefas/tarefas.service.spec.ts` (~5 testes)
- `tarefasDeHoje()` → query usa intervalo UTC correto (gte/lte)
- `tarefasDeHoje()` → inclui `pedido` no resultado
- `concluir(id)` existente → atualiza `concluida: true`
- `concluir(id)` inexistente (P2025) → lança `NotFoundException`
- `concluir(id)` erro genérico → re-lança

#### `tarefas/tarefas.controller.spec.ts` (~4 testes)
- GET `hoje` com JWT válido → chama `tarefasDeHoje()`
- PATCH `concluir` com role `confeiteira` → chama `concluir(id)`
- PATCH `concluir` com role `funcionaria` → lança `ForbiddenException`
- PATCH `concluir` sem role → lança `ForbiddenException`

#### `pedidos/pedidos.service.spec.ts` (~6 testes)
- `criar()` sem personalizados → cria 3 tarefas (dias 5, 4, 0)
- `criar()` com personalizados → cria 4 tarefas (inclui dia 3)
- `criar()` → datas calculadas corretamente via UTC
- `listarTodos()` paginação padrão → take=50, skip=0
- `listarTodos()` page=2, limit=10 → skip=10
- `listarTodos()` page<1 → lança `BadRequestException`

#### `pedidos/pedidos.dto.spec.ts` (~4 testes)
- `dataEntrega` no futuro → válido
- `dataEntrega` no passado → inválido (`IsFutureDate`)
- `nomeCliente` < 2 chars → inválido
- `nomeCliente` > 120 chars → inválido

**Total backend: ~31 testes**

## Frontend

### Dependências a instalar (devDependencies)

```
vitest
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
jsdom
```

### vitest.config.js

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
});
```

### `src/test-setup.js`

```js
import '@testing-library/jest-dom';
```

### Testes planejados

#### `App.test.jsx` (~7 testes)
- Renderiza estado "Carregando…" enquanto fetch não resolve
- Fetch retorna 401 → exibe componente `<Login>`
- Fetch retorna lista de tarefas → exibe tarefas no dashboard
- Lista vazia → exibe "Nenhuma tarefa programada para hoje"
- Clique em "Concluir" → chama `PATCH /api/tarefas/:id/concluir`
- Após concluir → tarefa aparece com `line-through` e badge "Concluída ✓"
- Clique em "Sair" → chama POST logout e exibe `<Login>`

#### `Login.test.jsx` (~3 testes)
- Renderiza campos username e password e botão Entrar
- Submit com credenciais → chama `POST /api/auth/login`
- Login com 401 → exibe mensagem de erro

**Total frontend: ~10 testes**

## Critérios de sucesso

- `npm test` no backend roda sem banco de dados
- `npm test` no frontend roda sem servidor
- Sem testes frágeis: nenhum teste acessa implementação interna — só interfaces públicas
- Cobertura dos fluxos críticos: autenticação, criar pedido, concluir tarefa, role guard

## Fora do escopo

- Testes E2E (Playwright/Cypress) — próxima iteração
- Testes de integração com banco real
- Testes de snapshot do React
