import React, { useEffect, useState } from 'react';
import Login from './Login';

const API_BASE = '/api';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(null); // null=verificando, false=deslogado, true=logado
  const [usuario, setUsuario] = useState('');
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregarTarefas() {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await fetch(`${API_BASE}/tarefas/hoje`, { credentials: 'include' });
      if (resp.status === 401) { setLoggedIn(false); return; }
      if (!resp.ok) throw new Error('Falha ao buscar tarefas');
      setTarefas(await resp.json());
      setLoggedIn(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  // Verifica sessão existente (cookie) ao montar
  useEffect(() => { carregarTarefas(); }, []);

  function handleLogin(username) {
    setUsuario(username);
    setLoggedIn(true);
    carregarTarefas();
  }

  async function handleLogout() {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    setLoggedIn(false);
    setUsuario('');
    setTarefas([]);
  }

  async function concluirTarefa(id) {
    try {
      const resp = await fetch(`${API_BASE}/tarefas/${id}/concluir`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (resp.status === 401) { setLoggedIn(false); return; }
      if (!resp.ok) throw new Error(`Erro ao concluir tarefa (${resp.status})`);
      setTarefas((atual) => atual.map((t) => (t.id === id ? { ...t, concluida: true } : t)));
    } catch (e) {
      setErro(e.message);
    }
  }

  if (loggedIn === null) {
    return <p className="text-center p-8 text-gray-500">Carregando…</p>;
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard do Dia</h1>
            <p className="text-gray-500 text-sm">
              Tarefas programadas para hoje{usuario ? ` · ${usuario}` : ''}
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
        {erro && (
          <p className="text-red-500 mb-4">
            Erro: {erro}{' '}
            <button onClick={carregarTarefas} className="underline text-sm">Tentar novamente</button>
          </p>
        )}

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
