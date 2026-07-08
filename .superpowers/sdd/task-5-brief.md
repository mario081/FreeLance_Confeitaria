### Task 5: Frontend — Setup Vitest + testes do Login

**Files:**
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test-setup.js`
- Modify: `frontend/package.json` — adicionar scripts e deps
- Create: `frontend/src/Login.test.jsx`

**Interfaces:**
- Produz: infraestrutura Vitest funcionando; componente Login testado

- [ ] **Step 1: Instalar dependências de teste no frontend**

Em WSL, dentro de `/home/mario081/mario081.github.io/frontend`:
```bash
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/frontend && npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: `added N packages` sem erros.

- [ ] **Step 2: Adicionar scripts no package.json do frontend**

Adicionar ao `"scripts"` em `frontend/package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

O bloco `"scripts"` completo deve ficar:
```json
"scripts": {
  "dev": "vite --host",
  "build": "vite build",
  "preview": "vite preview --host --port 5173",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Criar vitest.config.js**

Criar `frontend/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
});
```

- [ ] **Step 4: Criar arquivo de setup dos testes**

Criar `frontend/src/test-setup.js`:
```javascript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Escrever testes do componente Login**

Criar `frontend/src/Login.test.jsx`:
```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Login from './Login';

describe('Login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza campos de usuário e senha e o botão Entrar', () => {
    render(<Login onLogin={vi.fn()} />);

    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('chama POST /api/auth/login com as credenciais digitadas', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({ ok: true });

    render(<Login onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText('Usuário'), 'maria');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'maria', password: 'senha123' }),
    }));
  });

  it('chama onLogin com o username após login bem-sucedido', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    fetch.mockResolvedValue({ ok: true });

    render(<Login onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Usuário'), 'maria');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('maria'));
  });

  it('exibe mensagem de erro quando login falha (401)', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({ ok: false, status: 401 });

    render(<Login onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText('Usuário'), 'errado');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByText('Usuário ou senha inválidos')).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 6: Rodar para verificar que passam**

```bash
source ~/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/frontend && npm test
```

Expected:
```
PASS src/Login.test.jsx
  Login
    ✓ renderiza campos de usuário e senha e o botão Entrar
    ✓ chama POST /api/auth/login com as credenciais digitadas
    ✓ chama onLogin com o username após login bem-sucedido
    ✓ exibe mensagem de erro quando login falha (401)

Tests: 4 passed, 4 total
```

- [ ] **Step 7: Commit**

```bash
git -C /home/mario081/mario081.github.io add frontend/package.json frontend/vitest.config.js frontend/src/test-setup.js frontend/src/Login.test.jsx
git -C /home/mario081/mario081.github.io commit -m "test: setup Vitest e testes do componente Login"
```

**Notes:**
- `fetch` global é mockado com `vi.stubGlobal` e limpo com `vi.unstubAllGlobals()` no `afterEach`
- `userEvent.setup()` (v14 API) é necessário para simular typing corretamente
- O Login.jsx usa `<label>Usuário</label>` e `<label>Senha</label>` — `getByLabelText` funciona porque os inputs têm `required` e os labels estão corretamente associados via estrutura DOM
