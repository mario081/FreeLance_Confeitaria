### Task 6: Frontend — Testes do componente App

**Files:**
- Create: `frontend/src/App.test.jsx`

**Interfaces:**
- Consome: infraestrutura Vitest da Task 5 (já instalada)
- Produz: fluxos principais do dashboard (carregamento, tarefas, concluir, logout) testados

**IMPORTANT about App.jsx:**
- `App` faz `fetch('/api/tarefas/hoje', { credentials: 'include' })` no `useEffect` ao montar
- Se retorna 401 → mostra componente `<Login>`
- Se retorna 200 com lista → mostra tarefas com botão "Concluir"
- Botão "Concluir" faz `fetch('/api/tarefas/${id}/concluir', { method: 'PATCH', credentials: 'include' })`
- Botão "Sair" faz `fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })` e volta ao Login
- Login.jsx agora tem `id="username"` e `id="password"` nos inputs (corrigido na Task 5)

- [ ] **Step 1: Escrever os testes do App**

Criar `frontend/src/App.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exibe "Carregando…" enquanto fetch não resolve', () => {
    fetch.mockReturnValue(new Promise(() => {})); // nunca resolve
    render(<App />);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('exibe componente Login quando /tarefas/hoje retorna 401', async () => {
    fetch.mockResolvedValue({ status: 401, ok: false });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    );
  });

  it('exibe tarefas do dia quando fetch retorna lista', async () => {
    const tarefas = [
      { id: 1, descricao: 'Produção das Massas', concluida: false, pedido: { nomeCliente: 'Ana', saborBolo: 'Chocolate' } },
    ];
    fetch.mockResolvedValue({ status: 200, ok: true, json: async () => tarefas });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Produção das Massas')).toBeInTheDocument()
    );
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });

  it('exibe mensagem de lista vazia quando não há tarefas', async () => {
    fetch.mockResolvedValue({ status: 200, ok: true, json: async () => [] });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Nenhuma tarefa programada para hoje 🎉')).toBeInTheDocument()
    );
  });

  it('clique em Concluir chama PATCH /api/tarefas/:id/concluir', async () => {
    const user = userEvent.setup();
    const tarefas = [
      { id: 5, descricao: 'Preparação de Recheios', concluida: false, pedido: { nomeCliente: 'Bia', saborBolo: 'Morango' } },
    ];

    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tarefas }) // GET hoje
      .mockResolvedValueOnce({ status: 200, ok: true }); // PATCH concluir

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(fetch).toHaveBeenCalledWith('/api/tarefas/5/concluir', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
    }));
  });

  it('após concluir, tarefa aparece com badge "Concluída ✓"', async () => {
    const user = userEvent.setup();
    const tarefas = [
      { id: 3, descricao: 'Montagem e Decoração', concluida: false, pedido: { nomeCliente: 'Carla', saborBolo: 'Red Velvet' } },
    ];

    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tarefas })
      .mockResolvedValueOnce({ status: 200, ok: true });

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    await waitFor(() =>
      expect(screen.getByText('Concluída ✓')).toBeInTheDocument()
    );
  });

  it('clique em Sair chama POST /api/auth/logout e exibe Login', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => [] }) // GET hoje
      .mockResolvedValueOnce({ status: 200, ok: true }); // POST logout

    render(<App />);

    await waitFor(() => screen.getByRole('button', { name: 'Sair' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Rodar para verificar que passam**

```bash
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/frontend && npm test
```

Expected: 11 tests passing (4 do Login + 7 do App).

- [ ] **Step 3: Commit**

```bash
git -C /home/mario081/mario081.github.io add frontend/src/App.test.jsx
git -C /home/mario081/mario081.github.io commit -m "test: testes do componente App (dashboard)"
```
