<<<<<<< HEAD
# 🎂 Confeitaria Mika — Sistema de Gestão de Pedidos

Sistema de automação e gestão de tarefas para confeitaria artesanal.
Pedidos chegam via **WhatsApp → Evolution API → n8n → API**, e o sistema calcula
automaticamente o cronograma de produção com **Agendamento Reverso**.

---

## 🏗️ Arquitetura

```
WhatsApp → Evolution API → n8n → POST /pedidos (backend)
                                        ↓
                              Cria tarefas com datas (X-1, X-2, X-3, X-4)
                                        ↓
                          Frontend (Dashboard do Dia) ← GET /tarefas/hoje
```

### Stack
| Camada | Tecnologia |
|---|---|
| Backend | NestJS + Prisma ORM |
| Banco de dados | PostgreSQL 16 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Automação | n8n |
| WhatsApp | Evolution API |
| Infra | Docker Compose + Cloudflare Tunnel |

---

## 📁 Estrutura

```
projeto-n8n/
├── backend/                  # API NestJS
│   ├── src/
│   │   ├── pedidos/          # POST /pedidos, GET /pedidos
│   │   ├── tarefas/          # GET /tarefas/hoje, PATCH /tarefas/:id/concluir
│   │   └── auth/             # ApiKeyGuard (timing-safe)
│   ├── prisma/               # Schema + migrations
│   └── Dockerfile
├── frontend/                 # Dashboard React
│   ├── src/
│   ├── nginx.conf.template   # Proxy BFF — injeta API key server-side
│   └── Dockerfile
├── docker-compose.yml        # Dev — só Postgres (backend/frontend rodam local)
├── docker-compose.prod.yml   # Produção — todos os serviços
├── .env.example              # Variáveis de produção (copie para .env)
└── .env.local.example        # Variáveis locais dev (copie para .env.local)
```

---

## 🚀 Rodando localmente (desenvolvimento)

### 1. Pré-requisitos
- Docker Desktop
- Node.js 20+

### 2. Configure as variáveis

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 3. Suba o Postgres

```bash
docker compose up -d
```

### 4. Inicie o backend

```bash
cd backend
npm install
npx prisma migrate deploy
npm run start:dev
# API em http://localhost:3000
```

### 5. Inicie o frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard em http://localhost:5173
```

---

## 🐳 Deploy em Produção (VPS + Cloudflare Tunnel)

### 1. Configure as variáveis

```bash
cp .env.example .env
# Edite .env com valores reais:
# POSTGRES_PASSWORD  → openssl rand -base64 24
# BACKEND_API_KEY    → openssl rand -hex 32
# EVOLUTION_API_KEY  → openssl rand -hex 32
# TUNNEL_TOKEN       → painel Cloudflare Zero Trust → Tunnels
# N8N_HOST, API_URL, APP_URL, EVOLUTION_URL, CORS_ORIGIN
```

### 2. Suba todos os serviços

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Verifique

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 🔌 Endpoints da API

> Todas as rotas exigem o header `x-api-key: <BACKEND_API_KEY>`

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/pedidos` | Cria pedido + gera tarefas automaticamente |
| `GET` | `/pedidos` | Lista pedidos (`?page=1&limit=50`) |
| `GET` | `/tarefas/hoje` | Tarefas do dia atual |
| `PATCH` | `/tarefas/:id/concluir` | Marca tarefa como concluída |

### Exemplo — criar pedido

```bash
curl -X POST https://api.confeitaria-mika.me/pedidos \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_BACKEND_API_KEY" \
  -d '{
    "nomeCliente": "Maria Silva",
    "saborBolo": "Chocolate com morango",
    "dataEntrega": "2026-06-20",
    "possui_personalizados": true
  }'
```

### Agendamento Reverso gerado automaticamente

| Data | Tarefa |
|---|---|
| Entrega − 1 dia | Montagem e Decoração |
| Entrega − 2 dias | Preparação de Recheios |
| Entrega − 3 dias | Produção das Massas |
| Entrega − 4 dias | Iniciar Confecção de Personalizados *(somente se `possui_personalizados: true`)* |

---

## 🔒 Segurança

- `x-api-key` obrigatório em todas as rotas (comparação `timingSafeEqual` — resistente a timing attack)
- CORS restrito ao domínio do frontend
- Helmet (headers HTTP de segurança)
- Validação de payload com `class-validator` + `ValidationPipe`
- Nenhuma porta exposta ao host em produção (`expose` interno apenas)
- API key injetada pelo nginx (BFF) — nunca chega ao bundle JS do browser
- Segredos em `.env` (fora do Git via `.gitignore`)

---

## 📱 Configurando o n8n (WhatsApp → API)

No n8n em `https://n8n.confeitaria-mika.me`:

1. Crie um workflow com trigger **Webhook**
2. Conecte o **Evolution API node** para receber mensagens
3. Adicione um node **HTTP Request**:
   - Method: `POST`
   - URL: `http://backend:3000/pedidos` *(rede interna Docker — sem passar pelo túnel)*
   - Header: `x-api-key` = sua `BACKEND_API_KEY`
   - Body: `nomeCliente`, `saborBolo`, `dataEntrega`, `possui_personalizados`

---

## 🛠️ Comandos úteis

```bash
# Logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Rebuild de um serviço específico
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d backend

# Acessar o banco de dados
docker exec -it postgres_confeitaria psql -U admin -d confeitaria

# Derrubar tudo (cuidado: -v apaga os volumes/dados)
docker compose -f docker-compose.prod.yml down
```
=======
# mario081.github.io
>>>>>>> 82b7d67e83e09c0395b830c8aa973c7522ca08c4
