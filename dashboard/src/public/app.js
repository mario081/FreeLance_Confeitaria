const API = '';
let TOKEN = localStorage.getItem('token');
let filtroData = 'hoje';
let filtroStatus = 'todos';
let bolosData = [];

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function login(senha) {
  const res = await fetch(`${API}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });
  if (!res.ok) throw new Error('Senha incorrecta');
  const data = await res.json();
  TOKEN = data.token;
  localStorage.setItem('token', TOKEN);
}

function logout() {
  TOKEN = null;
  localStorage.removeItem('token');
  showScreen('login');
}

function showScreen(name) {
  document.getElementById('screen-login').hidden = name !== 'login';
  document.getElementById('screen-dashboard').hidden = name !== 'dashboard';
}

async function loadBolos() {
  const params = new URLSearchParams();
  if (filtroData !== 'todos') params.set('data', filtroData);
  if (filtroStatus !== 'todos') params.set('status', filtroStatus);
  const res = await fetch(`${API}/api/bolos?${params}`, { headers: getHeaders() });
  if (res.status === 401) { logout(); return; }
  bolosData = await res.json();
  renderBolos(bolosData);
}

function statusLabel(s) {
  return { disponivel: 'Disponível', vendido: 'Vendido', expirado: 'Expirado' }[s] || s;
}

function origemLabel(b) {
  const parts = [];
  if (b.origem === 'whatsapp') parts.push('WhatsApp');
  if (b.disparo) {
    parts.push({ manha: 'manhã', tarde: 'tarde', noite: 'noite' }[b.disparo] || b.disparo);
  }
  return parts.length ? parts.join(' · ') : 'manual';
}

function statusOptions(current) {
  return ['disponivel', 'vendido', 'expirado']
    .map(s => `<option value="${s}"${s === current ? ' selected' : ''}>${statusLabel(s)}</option>`)
    .join('');
}

function renderBolos(bolos) {
  const disponiveis = bolos.filter(b => b.status === 'disponivel').length;
  document.getElementById('contagem').textContent =
    `${bolos.length} bolo(s) — ${disponiveis} disponível(eis)`;

  const cardsEl = document.querySelector('.cards-view');
  const tableEl = document.querySelector('.table-view');

  if (!bolos.length) {
    cardsEl.innerHTML = '<p class="empty">Nenhum bolo encontrado.</p>';
    tableEl.innerHTML = '';
    return;
  }

  cardsEl.innerHTML = bolos.map(b => `
    <div class="bolo-card" data-id="${b.id}">
      <div class="bolo-card-top">
        <span class="bolo-nome">🎂 ${esc(b.sabor)}</span>
        <span class="bolo-preco">R$ ${esc(Number(b.preco).toFixed(2))}</span>
      </div>
      <div class="bolo-meta">${esc(b.tamanho)} · Qtd: ${esc(b.quantidade)} · ${esc(origemLabel(b))}</div>
      <div class="bolo-actions">
        <select onchange="changeStatus(${b.id}, this.value)">${statusOptions(b.status)}</select>
        <button class="btn-icon" onclick="openModal(${b.id})" title="Editar">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteBolo(${b.id})" title="Apagar">🗑️</button>
      </div>
    </div>
  `).join('');

  tableEl.innerHTML = `
    <thead><tr>
      <th>Sabor</th><th>Tam.</th><th>Preço</th><th>Qtd</th><th>Origem</th><th>Status</th><th></th>
    </tr></thead>
    <tbody>${bolos.map(b => `
      <tr data-id="${b.id}">
        <td>🎂 ${esc(b.sabor)}</td>
        <td>${esc(b.tamanho)}</td>
        <td>R$ ${esc(Number(b.preco).toFixed(2))}</td>
        <td>${esc(b.quantidade)}</td>
        <td>${esc(origemLabel(b))}</td>
        <td><select onchange="changeStatus(${b.id}, this.value)">${statusOptions(b.status)}</select></td>
        <td>
          <button class="btn-icon" onclick="openModal(${b.id})">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteBolo(${b.id})">🗑️</button>
        </td>
      </tr>
    `).join('')}</tbody>
  `;
}

async function changeStatus(id, status) {
  const res = await fetch(`${API}/api/bolos/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status })
  });
  if (!res.ok) { alert('Erro ao atualizar status. Tente novamente.'); return; }
  loadBolos();
}

async function deleteBolo(id) {
  if (!confirm('Apagar este bolo?')) return;
  const res = await fetch(`${API}/api/bolos/${id}`, { method: 'DELETE', headers: getHeaders() });
  if (!res.ok) { alert('Erro ao apagar. Tente novamente.'); return; }
  loadBolos();
}

function openModal(id) {
  document.getElementById('modal-titulo').textContent = id ? 'Editar Bolo' : 'Adicionar Bolo';
  document.getElementById('bolo-id').value = id || '';
  if (id) {
    const b = bolosData.find(b => b.id === id);
    if (b) {
      document.getElementById('bolo-sabor').value = b.sabor;
      document.getElementById('bolo-tamanho').value = b.tamanho;
      document.getElementById('bolo-preco').value = Number(b.preco).toFixed(2);
      document.getElementById('bolo-quantidade').value = b.quantidade;
      document.getElementById('bolo-status').value = b.status;
    }
  } else {
    document.getElementById('form-bolo').reset();
  }
  document.getElementById('modal-overlay').hidden = false;
}

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
}

async function saveBolo(e) {
  e.preventDefault();
  const id = document.getElementById('bolo-id').value;
  const body = {
    sabor: document.getElementById('bolo-sabor').value.trim(),
    tamanho: document.getElementById('bolo-tamanho').value,
    preco: parseFloat(document.getElementById('bolo-preco').value),
    quantidade: parseInt(document.getElementById('bolo-quantidade').value),
    status: document.getElementById('bolo-status').value
  };
  const url = id ? `${API}/api/bolos/${id}` : `${API}/api/bolos`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
  if (!res.ok) { alert('Erro ao guardar. Tente novamente.'); return; }
  closeModal();
  loadBolos();
}

// ── Event listeners ──
document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const erroEl = document.getElementById('login-erro');
  erroEl.hidden = true;
  try {
    await login(document.getElementById('input-senha').value);
    showScreen('dashboard');
    loadBolos();
  } catch {
    erroEl.textContent = 'Senha incorrecta. Tente novamente.';
    erroEl.hidden = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-adicionar').addEventListener('click', () => openModal(null));
document.getElementById('btn-cancelar').addEventListener('click', closeModal);
document.getElementById('form-bolo').addEventListener('submit', saveBolo);

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filtroData = tab.dataset.data;
    loadBolos();
  });
});

document.getElementById('filtro-status').addEventListener('change', e => {
  filtroStatus = e.target.value;
  loadBolos();
});

// ── Init ──
if (TOKEN) {
  showScreen('dashboard');
  loadBolos();
} else {
  showScreen('login');
}
