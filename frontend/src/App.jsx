import React, { useEffect, useState } from 'react';

// Todas as chamadas passam pelo BFF (/api) — a API key é injetada server-side
// pelo proxy do Vite (dev) ou pelo nginx (produção) e nunca chega ao browser.
const API_BASE = '/api';

const headersPadrao = {
  'Content-Type': 'application/json',
};

export default function App() {
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregarTarefas() {
    setCarregando(true);
    try {
      const resp = await fetch(`${API_BASE}/tarefas/hoje`, { headers: headersPadrao });
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
    carregarTarefas();
  }, []);

  async function concluirTarefa(id) {
    await fetch(`${API_BASE}/tarefas/${id}/concluir`, { method: 'PATCH', headers: headersPadrao });
    setTarefas((atual) =>
      atual.map((t) => (t.id === id ? { ...t, concluida: true } : t)),
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard do Dia</h1>
        <p className="text-gray-500 mb-6">Tarefas programadas para hoje</p>

        {carregando && <p className="text-gray-500">Carregando...</p>}
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
