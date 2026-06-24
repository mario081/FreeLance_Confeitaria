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
