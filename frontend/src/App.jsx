import React, { useEffect, useState } from 'react';
import Login from './Login';

// Todas as chamadas passam pelo BFF (/api) — a API key é injetada server-side
// pelo proxy do Vite (dev) e nunca chega ao browser.
const API_BASE = '/api';

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [usuario, setUsuario] = useState(() => localStorage.getItem('auth_user'));
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  function handleLogin(access_token, username) {
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('auth_user', username);
    setToken(access_token);
    setUsuario(username);
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUsuario(null);
    setTarefas([]);
  }

  async function carregarTarefas() {
    setCarregando(true);
    try {
      const resp = await fetch(`${API_BASE}/tarefas/hoje`, { headers: headers(token) });
      if (resp.status === 401) { handleLogout(); return; }
      if (!resp.ok) throw new Error('Falha ao buscar tarefas');
      const dados = await resp.json();
      setTarefas(dados);
      setErro(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (token) carregarTarefas();
  }, [token]);

  async function concluirTarefa(id) {
    const resp = await fetch(`${API_BASE}/tarefas/${id}/concluir`, {
      method: 'PATCH',
      headers: headers(token),
    });
    if (resp.status === 401) { handleLogout(); return; }
    setTarefas((atual) => atual.map((t) => (t.id === id ? { ...t, concluida: true } : t)));
  }

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard do Dia</h1>
            <p className="text-gray-500 text-sm">
              Tarefas programadas para hoje · <span className="capitalize">{usuario}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Sair
          </button>
        </div>

        {carregando && <p className="text-gray-500">Carregando…</p>}
        {erro && <p className="text-red-500">Erro: {erro}</p>}

        {!carregando && !erro && tarefas.length === 0 && (
          <p className="text-gray-500">Nenhuma tarefa programada para hoje 🎉</p>
        )}

        <ul className="space-y-3">
          {tarefas.map((tarefa) => (
            <li
              key={tarefa.id}
              className={`flex items-center justify-between rounded-lg border p-4 shadow-sm bg-white ${
                tarefa.concluida ? 'opacity-50' : ''
              }`}
            >
              <div>
                <p className={`font-medium text-gray-800 ${tarefa.concluida ? 'line-through' : ''}`}>
                  {tarefa.descricao}
                </p>
                <p className="text-sm text-gray-500">
                  Pedido: {tarefa.pedido?.nomeCliente} — {tarefa.pedido?.saborBolo}
                </p>
              </div>

              {!tarefa.concluida ? (
                <button
                  onClick={() => concluirTarefa(tarefa.id)}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Concluir
                </button>
              ) : (
                <span className="text-sm text-emerald-600 font-medium">Concluída ✓</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
