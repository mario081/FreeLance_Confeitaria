# Dashboard de Bolos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web dashboard (Node.js + Express + HTML/CSS/JS vanilla) inside Docker where the baker and employee can add, view, edit and delete cakes via a shared password.

**Architecture:** New `dashboard` service in the existing `docker-compose.yml`. Express app serves both a REST API (`/api/*`) and a vanilla HTML/CSS/JS frontend at `/`. PostgreSQL `bolos` table in the existing `confeitaria` database. Users authenticate with a shared password → JWT (7 days). n8n authenticates with `x-api-key`.

**Tech Stack:** Node.js 20-alpine, Express 4, pg (node-postgres), jsonwebtoken, Jest 29, supertest, dotenv (dev)

## Global Constraints

- Node base image: `node:20-alpine`
- PostgreSQL: existing `confeitaria` DB, new table `bolos` with exact schema in Task 1
- Status values (exact strings): `disponivel`, `vendido`, `expirado`
- Origem values (exact strings): `whatsapp`, `manual`
- Disparo values: `manha`, `tarde`, `noite` (or null)
- Dashboard port: `DASHBOARD_PORT` env var, default `3000`
- JWT secret env var: `JWT_SECRET`, expiry `7d`
- Shared password env var: `DASHBOARD_SENHA`
- n8n API key env var: `DASHBOARD_API_KEY`
- Docker network: `confeitaria_net`
- `requires_db` tests require PostgreSQL at `DATABASE_URL` (constructed from `.env`)
- Frontend font: Inter (Google Fonts)
- Header gradient: `linear-gradient(135deg, #FF6B9D, #C44BCE)`
- Background: `#f9f7ff`

---

## File Structure

```
dashboard/
├── Dockerfile
├── package.json
├── .gitignore
├── src/
│   ├── index.js          # Express app — static serving + routes; conditionally starts server
│   ├── db.js             # pg Pool, exported directly
│   ├── auth.js           # POST /api/auth router + requireAuth middleware (exported)
│   ├── bolos.js          # CRUD router for /api/bolos
│   └── public/
│       ├── index.html    # SPA — login + dashboard screens
│       ├── style.css     # All styles
│       └── app.js        # Frontend logic
└── tests/
    ├── auth.test.js      # Auth endpoint + requireAuth middleware
    └── bolos.test.js     # CRUD endpoints — hits real PostgreSQL
```

Modified files:
- `docker-compose.yml` — add `dashboard` service + `DASHBOARD_API_KEY`/`DASHBOARD_URL` to n8n env
- `.env.example` — 4 new vars
- `init.sh` — add `CREATE TABLE IF NOT EXISTS bolos`

---

### Task 1: Scaffolding + Infrastructure

**Files:**
- Create: `dashboard/Dockerfile`
- Create: `dashboard/package.json`
- Create: `dashboard/.gitignore`
- Create: `dashboard/src/db.js`
- Create: `dashboard/src/index.js`
- Create: `dashboard/src/public/index.html` (placeholder)
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `init.sh`

**Interfaces:**
- Produces: `db` = `require('./db')` → pg `Pool` instance with `.query(sql, params)` and `.end()`
- Produces: `app` = `require('./src/index')` → Express app (no server started unless `require.main === module`)

- [ ] **Step 1: Create `dashboard/.gitignore`**

```
node_modules/
```

- [ ] **Step 2: Create `dashboard/package.json`**

```json
{
  "name": "confeitaria-dashboard",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest --testEnvironment node"
  },
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "dotenv": "^16.3.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testMatch": ["**/tests/**/*.test.js"],
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 3: Create `dashboard/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
```

- [ ] **Step 4: Create `dashboard/src/db.js`**

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

- [ ] **Step 5: Create `dashboard/src/index.js`** (skeleton — no routers yet; Tasks 2 and 3 add them)

```javascript
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  app.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
}

module.exports = app;
```

- [ ] **Step 6: Create placeholder `dashboard/src/public/index.html`** (replaced in Task 4)

```html
<!DOCTYPE html><html lang="pt"><body><p>Dashboard a carregar...</p></body></html>
```

- [ ] **Step 7: Add `bolos` table to `init.sh`**

Open `init.sh`. Inside the second `psql` block (the one that targets `$POSTGRES_DB`), add after the `erros_log` table creation:

```sql
    CREATE TABLE IF NOT EXISTS bolos (
        id            SERIAL PRIMARY KEY,
        sabor         TEXT NOT NULL,
        tamanho       TEXT NOT NULL,
        preco         DECIMAL(10,2) NOT NULL,
        quantidade    INTEGER NOT NULL,
        status        TEXT NOT NULL DEFAULT 'disponivel',
        origem        TEXT NOT NULL DEFAULT 'manual',
        disparo       TEXT,
        criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
```

The full updated `init.sh` is:

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE n8n;
    CREATE DATABASE evolution;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE IF NOT EXISTS conversa_estado (
        numero        TEXT PRIMARY KEY,
        estado        TEXT NOT NULL DEFAULT 'aguardando_inicial',
        dados         JSONB NOT NULL DEFAULT '{}',
        disparo       TEXT NOT NULL DEFAULT 'manha',
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS erros_log (
        id        SERIAL PRIMARY KEY,
        numero    TEXT NOT NULL,
        erro      TEXT NOT NULL,
        dados     JSONB NOT NULL DEFAULT '{}',
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bolos (
        id            SERIAL PRIMARY KEY,
        sabor         TEXT NOT NULL,
        tamanho       TEXT NOT NULL,
        preco         DECIMAL(10,2) NOT NULL,
        quantidade    INTEGER NOT NULL,
        status        TEXT NOT NULL DEFAULT 'disponivel',
        origem        TEXT NOT NULL DEFAULT 'manual',
        disparo       TEXT,
        criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
EOSQL
```

- [ ] **Step 8: Add dashboard service to `docker-compose.yml`**

Add the `dashboard` service at the end of the `services:` block, and add `DASHBOARD_API_KEY` + `DASHBOARD_URL` to the n8n service environment.

Full updated `docker-compose.yml`:

```yaml
# Sistema Confeitaria — Cadastro de Bolos via WhatsApp
# Uso: cp .env.example .env  →  editar .env  →  docker compose up -d

volumes:
  postgres_data:
  n8n_data:
  evolution_data:

networks:
  confeitaria_net:
    driver: bridge

services:
  postgres:
    image: postgres:16
    container_name: postgres_confeitaria
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-confeitaria}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sh:/docker-entrypoint-initdb.d/init.sh
    networks:
      - confeitaria_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-admin}"]
      interval: 5s
      timeout: 5s
      retries: 10

  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution_confeitaria
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SERVER_PORT: 8080
      DATABASE_ENABLED: "true"
      DATABASE_CONNECTION_URI: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD}@postgres:5432/evolution
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      DATABASE_SAVE_DATA_INSTANCE: "true"
      DATABASE_SAVE_DATA_NEW_MESSAGE: "true"
      DATABASE_SAVE_MESSAGE_UPDATE: "true"
      DATABASE_SAVE_DATA_CONTACTS: "true"
      DATABASE_SAVE_DATA_CHATS: "true"
      AUTHENTICATION_TYPE: apikey
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      WEBHOOK_GLOBAL_ENABLED: "false"
      LOG_LEVEL: ERROR
      LOG_COLOR: "true"
      DEL_INSTANCE: "false"
      TZ: America/Sao_Paulo
    volumes:
      - evolution_data:/evolution/instances
    ports:
      - "${EVOLUTION_PORT:-8080}:8080"
    networks:
      - confeitaria_net

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n_confeitaria
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_USER: ${POSTGRES_USER:-admin}
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_POSTGRESDB_SCHEMA: public
      N8N_HOST: 0.0.0.0
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: ${N8N_WEBHOOK_URL:-http://localhost:5678}
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: ${N8N_USER:-admin}
      N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD}
      N8N_ALLOW_EXEC: "true"
      EXECUTIONS_PROCESS: main
      GENERIC_TIMEZONE: America/Sao_Paulo
      TZ: America/Sao_Paulo
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE_NAME: ${EVOLUTION_INSTANCE_NAME}
      WHATSAPP_NUMBER: ${WHATSAPP_NUMBER}
      DASHBOARD_API_KEY: ${DASHBOARD_API_KEY}
      DASHBOARD_URL: http://dashboard:3000
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "${N8N_PORT:-5678}:5678"
    networks:
      - confeitaria_net

  dashboard:
    build: ./dashboard
    container_name: dashboard_confeitaria
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-confeitaria}"
      DASHBOARD_SENHA: ${DASHBOARD_SENHA}
      DASHBOARD_API_KEY: ${DASHBOARD_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      DASHBOARD_PORT: ${DASHBOARD_PORT:-3000}
    ports:
      - "${DASHBOARD_PORT:-3000}:3000"
    networks:
      - confeitaria_net
```

- [ ] **Step 9: Add new vars to `.env.example`**

Append to the end of `.env.example`:

```env
# ============================================================
# Dashboard — Painel de bolos
# Acesse http://localhost:3000 após subir os containers
# ============================================================
DASHBOARD_PORT=3000

# Senha partilhada entre confeiteira e funcionária
DASHBOARD_SENHA=troque_por_senha_segura

# Chave usada pelo n8n para gravar bolos sem login (mín. 32 chars)
DASHBOARD_API_KEY=troque_por_chave_api_32chars_xxxx

# Segredo para assinar os JWT (mín. 64 chars)
JWT_SECRET=troque_por_segredo_jwt_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 10: Run `npm install` inside `dashboard/`**

```bash
cd dashboard
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 11: Verify Docker build**

```bash
docker compose build dashboard
```

Expected: build completes without errors. Output ends with something like `Successfully built` or `naming to docker.io/library/...`.

- [ ] **Step 12: Commit**

```bash
git add dashboard/ docker-compose.yml .env.example init.sh
git commit -m "feat: scaffolding do dashboard (Docker + DB schema)"
```

---

### Task 2: Auth API

**Files:**
- Create: `dashboard/src/auth.js`
- Create: `dashboard/tests/auth.test.js`
- Modify: `dashboard/src/index.js` (add auth router)

**Interfaces:**
- Consumes: `db` from `./db` (not used in auth itself)
- Produces:
  - `authRouter` = default export of `./auth` — mounts at `/api/auth`
  - `requireAuth(req, res, next)` = named export of `./auth` — Express middleware

- [ ] **Step 1: Write the failing tests**

Create `dashboard/tests/auth.test.js`:

```javascript
process.env.DASHBOARD_SENHA = 'senha_de_teste_123';
process.env.JWT_SECRET = 'segredo_jwt_testes_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.DASHBOARD_API_KEY = 'chave_api_testes_32chars_xxxxxxxx';
process.env.DATABASE_URL = 'postgresql://admin:admin@localhost:5432/confeitaria';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const { requireAuth } = require('../src/auth');
const app = require('../src/index');

// Minimal app to test the requireAuth middleware in isolation
const guardedApp = express();
guardedApp.use(express.json());
guardedApp.get('/protected', requireAuth, (req, res) => res.json({ ok: true }));

describe('POST /api/auth', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth').send({ senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBeDefined();
  });

  it('returns 401 for missing body', async () => {
    const res = await request(app).post('/api/auth').send({});
    expect(res.status).toBe(401);
  });

  it('returns JWT for correct password', async () => {
    const res = await request(app)
      .post('/api/auth')
      .send({ senha: 'senha_de_teste_123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('user');
  });
});

describe('requireAuth middleware', () => {
  it('returns 401 with no credentials', async () => {
    const res = await request(guardedApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid JWT', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('Authorization', 'Bearer token_invalido_xxxx');
    expect(res.status).toBe(401);
  });

  it('passes with valid JWT', async () => {
    const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET);
    const res = await request(guardedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('passes with valid x-api-key', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('x-api-key', 'chave_api_testes_32chars_xxxxxxxx');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 for wrong x-api-key', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('x-api-key', 'chave_errada');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd dashboard
npm test -- --testPathPattern=auth
```

Expected: FAIL — `Cannot find module '../src/auth'`

- [ ] **Step 3: Create `dashboard/src/auth.js`**

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/', (req, res) => {
  const { senha } = req.body || {};
  if (!senha || senha !== process.env.DASHBOARD_SENHA) {
    return res.status(401).json({ erro: 'Senha incorrecta' });
  }
  const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.DASHBOARD_API_KEY) return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
```

- [ ] **Step 4: Update `dashboard/src/index.js`** to wire in the auth router

```javascript
const express = require('express');
const path = require('path');
const authRouter = require('./auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', authRouter);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  app.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
}

module.exports = app;
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd dashboard
npm test -- --testPathPattern=auth
```

Expected:
```
PASS tests/auth.test.js
  POST /api/auth
    ✓ returns 401 for wrong password
    ✓ returns 401 for missing body
    ✓ returns JWT for correct password
  requireAuth middleware
    ✓ returns 401 with no credentials
    ✓ returns 401 for invalid JWT
    ✓ passes with valid JWT
    ✓ passes with valid x-api-key
    ✓ returns 401 for wrong x-api-key

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/auth.js dashboard/src/index.js dashboard/tests/auth.test.js
git commit -m "feat: auth API — POST /api/auth + requireAuth middleware"
```

---

### Task 3: Bolos API

**Files:**
- Create: `dashboard/src/bolos.js`
- Create: `dashboard/tests/bolos.test.js`
- Modify: `dashboard/src/index.js` (add bolos router)

**Interfaces:**
- Consumes:
  - `db.query(sql, params)` from `./db` — returns `{ rows }`
  - `requireAuth` from `./auth`
- Produces: `bolosRouter` — mounts at `/api/bolos`

> **Note:** These tests hit real PostgreSQL. Before running, make sure Docker is running with `docker compose up -d postgres`. The test file loads credentials from `../../.env`.

- [ ] **Step 1: Write failing tests**

Create `dashboard/tests/bolos.test.js`:

```javascript
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { POSTGRES_USER = 'admin', POSTGRES_PASSWORD, POSTGRES_DB = 'confeitaria' } = process.env;
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}`;
process.env.DASHBOARD_SENHA = 'senha_de_teste_123';
process.env.JWT_SECRET = 'segredo_jwt_testes_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.DASHBOARD_API_KEY = 'chave_api_testes_32chars_xxxxxxxx';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const db = require('../src/db');

const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET);
const jwtAuth = { Authorization: `Bearer ${token}` };
const apiKeyAuth = { 'x-api-key': 'chave_api_testes_32chars_xxxxxxxx' };

beforeAll(async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bolos (
      id SERIAL PRIMARY KEY,
      sabor TEXT NOT NULL,
      tamanho TEXT NOT NULL,
      preco DECIMAL(10,2) NOT NULL,
      quantidade INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'disponivel',
      origem TEXT NOT NULL DEFAULT 'manual',
      disparo TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
});

beforeEach(async () => {
  await db.query('DELETE FROM bolos');
});

afterAll(async () => {
  await db.end();
});

describe('GET /api/bolos', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/bolos');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no bolos', async () => {
    const res = await request(app).get('/api/bolos').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all bolos ordered by criado_em desc', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      ['Chocolate', 'M', 45.00, 2, 'Morango', 'P', 30.00, 1]
    );
    const res = await request(app).get('/api/bolos').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by status=disponivel', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade, status)
       VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)`,
      ['Morango', 'P', 30, 1, 'disponivel', 'Limão', 'G', 60, 1, 'vendido']
    );
    const res = await request(app).get('/api/bolos?status=disponivel').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sabor).toBe('Morango');
  });

  it('filters by data=hoje', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4)`,
      ['Hoje', 'M', 45, 1]
    );
    const res = await request(app).get('/api/bolos?data=hoje').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/bolos', () => {
  it('creates a bolo with JWT auth', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(jwtAuth)
      .send({ sabor: 'Morango', tamanho: 'P', preco: 30, quantidade: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.sabor).toBe('Morango');
    expect(res.body.status).toBe('disponivel');
    expect(res.body.origem).toBe('manual');
  });

  it('creates a bolo with x-api-key (n8n flow)', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(apiKeyAuth)
      .send({ sabor: 'Chocolate', tamanho: 'M', preco: 45, quantidade: 2, origem: 'whatsapp', disparo: 'manha' });
    expect(res.status).toBe(201);
    expect(res.body.origem).toBe('whatsapp');
    expect(res.body.disparo).toBe('manha');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(jwtAuth)
      .send({ sabor: 'Morango' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
  });
});

describe('PUT /api/bolos/:id', () => {
  it('updates status', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Chocolate', 'M', 45, 2]
    );
    const id = rows[0].id;
    const res = await request(app)
      .put(`/api/bolos/${id}`)
      .set(jwtAuth)
      .send({ status: 'vendido' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('vendido');
    expect(res.body.sabor).toBe('Chocolate');
  });

  it('updates multiple fields', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Baunilha', 'P', 25, 1]
    );
    const id = rows[0].id;
    const res = await request(app)
      .put(`/api/bolos/${id}`)
      .set(jwtAuth)
      .send({ sabor: 'Baunilha com coco', preco: 30 });
    expect(res.status).toBe(200);
    expect(res.body.sabor).toBe('Baunilha com coco');
    expect(Number(res.body.preco)).toBe(30);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/bolos/99999')
      .set(jwtAuth)
      .send({ status: 'vendido' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/bolos/:id', () => {
  it('deletes a bolo and returns 204', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Limão', 'P', 25, 1]
    );
    const id = rows[0].id;
    const res = await request(app).delete(`/api/bolos/${id}`).set(jwtAuth);
    expect(res.status).toBe(204);
    const { rows: check } = await db.query('SELECT id FROM bolos WHERE id = $1', [id]);
    expect(check).toHaveLength(0);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/bolos/99999').set(jwtAuth);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd dashboard
npm test -- --testPathPattern=bolos
```

Expected: FAIL — `Cannot find module '../src/bolos'` (or similar — bolos.js doesn't exist yet)

- [ ] **Step 3: Create `dashboard/src/bolos.js`**

```javascript
const express = require('express');
const router = express.Router();
const db = require('./db');
const { requireAuth } = require('./auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { status, data } = req.query;
  const conditions = [];
  const values = [];

  if (status && status !== 'todos') {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (data === 'hoje') {
    conditions.push(`criado_em::date = CURRENT_DATE`);
  } else if (data === 'semana') {
    conditions.push(`criado_em >= NOW() - INTERVAL '7 days'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT * FROM bolos ${where} ORDER BY criado_em DESC`,
    values
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const {
    sabor, tamanho, preco, quantidade,
    status = 'disponivel', origem = 'manual', disparo = null
  } = req.body || {};

  if (!sabor || !tamanho || preco == null || quantidade == null) {
    return res.status(400).json({ erro: 'Campos obrigatórios: sabor, tamanho, preco, quantidade' });
  }

  const { rows } = await db.query(
    `INSERT INTO bolos (sabor, tamanho, preco, quantidade, status, origem, disparo)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [sabor, tamanho, Number(preco), Number(quantidade), status, origem, disparo]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { sabor, tamanho, preco, quantidade, status, disparo } = req.body || {};
  const { rows } = await db.query(
    `UPDATE bolos SET
       sabor         = COALESCE($1, sabor),
       tamanho       = COALESCE($2, tamanho),
       preco         = COALESCE($3, preco),
       quantidade    = COALESCE($4, quantidade),
       status        = COALESCE($5, status),
       disparo       = COALESCE($6, disparo),
       atualizado_em = NOW()
     WHERE id = $7 RETURNING *`,
    [
      sabor ?? null,
      tamanho ?? null,
      preco != null ? Number(preco) : null,
      quantidade != null ? Number(quantidade) : null,
      status ?? null,
      disparo ?? null,
      req.params.id
    ]
  );
  if (!rows[0]) return res.status(404).json({ erro: 'Bolo não encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rows } = await db.query(
    'DELETE FROM bolos WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ erro: 'Bolo não encontrado' });
  res.status(204).end();
});

module.exports = router;
```

- [ ] **Step 4: Update `dashboard/src/index.js`** — final version with both routers

```javascript
const express = require('express');
const path = require('path');
const authRouter = require('./auth');
const bolosRouter = require('./bolos');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', authRouter);
app.use('/api/bolos', bolosRouter);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  app.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
}

module.exports = app;
```

- [ ] **Step 5: Ensure PostgreSQL is running and run the bolos tests**

```bash
# From the repo root — postgres must be running:
docker compose up -d postgres

# Run tests from inside dashboard/
cd dashboard
npm test -- --testPathPattern=bolos
```

Expected:
```
PASS tests/bolos.test.js
  GET /api/bolos
    ✓ returns 401 without auth
    ✓ returns empty array when no bolos
    ✓ returns all bolos ordered by criado_em desc
    ✓ filters by status=disponivel
    ✓ filters by data=hoje
  POST /api/bolos
    ✓ creates a bolo with JWT auth
    ✓ creates a bolo with x-api-key (n8n flow)
    ✓ returns 400 when required fields are missing
  PUT /api/bolos/:id
    ✓ updates status
    ✓ updates multiple fields
    ✓ returns 404 for unknown id
  DELETE /api/bolos/:id
    ✓ deletes a bolo and returns 204
    ✓ returns 404 for unknown id

Tests: 13 passed, 13 total
```

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
cd dashboard
npm test
```

Expected: all 21 tests pass (8 auth + 13 bolos).

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/bolos.js dashboard/src/index.js dashboard/tests/bolos.test.js
git commit -m "feat: bolos CRUD API — GET/POST/PUT/DELETE /api/bolos"
```

---

### Task 4: Frontend

**Files:**
- Replace: `dashboard/src/public/index.html`
- Create: `dashboard/src/public/style.css`
- Create: `dashboard/src/public/app.js`

**Interfaces:**
- Consumes: `POST /api/auth`, `GET/POST/PUT/DELETE /api/bolos` (from Tasks 2 and 3)
- No automated tests — verification is visual (browser)

- [ ] **Step 1: Replace `dashboard/src/public/index.html`**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confeitaria Mika</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<!-- LOGIN -->
<div id="screen-login" class="screen">
  <div class="login-card">
    <div class="login-icon">🎂</div>
    <h1>Confeitaria Mika</h1>
    <p class="login-sub">Painel de Bolos</p>
    <form id="form-login">
      <input type="password" id="input-senha" placeholder="Senha" autocomplete="current-password" required>
      <button type="submit" class="btn-primary">Entrar</button>
    </form>
    <p id="login-erro" class="erro" hidden></p>
  </div>
</div>

<!-- DASHBOARD -->
<div id="screen-dashboard" class="screen" hidden>
  <header>
    <span class="header-title">🎂 Confeitaria Mika</span>
    <button id="btn-logout" class="btn-logout">Sair</button>
  </header>

  <main>
    <div class="toolbar">
      <div class="tabs">
        <button class="tab active" data-data="hoje">Hoje</button>
        <button class="tab" data-data="semana">Semana</button>
        <button class="tab" data-data="todos">Todos</button>
      </div>
      <select id="filtro-status">
        <option value="todos">Todos os status</option>
        <option value="disponivel">Disponível</option>
        <option value="vendido">Vendido</option>
        <option value="expirado">Expirado</option>
      </select>
      <button id="btn-adicionar" class="btn-primary">+ Adicionar</button>
    </div>

    <p id="contagem" class="contagem"></p>

    <div id="lista-bolos">
      <div class="cards-view"></div>
      <table class="table-view"></table>
    </div>
  </main>
</div>

<!-- MODAL -->
<div id="modal-overlay" hidden>
  <div class="modal">
    <h2 id="modal-titulo">Adicionar Bolo</h2>
    <form id="form-bolo">
      <input type="hidden" id="bolo-id">
      <label>
        Sabor
        <input type="text" id="bolo-sabor" placeholder="Ex: Chocolate com morango" required>
      </label>
      <label>
        Tamanho
        <select id="bolo-tamanho" required>
          <option value="">Escolher...</option>
          <option value="P">P — Pequeno</option>
          <option value="M">M — Médio</option>
          <option value="G">G — Grande</option>
          <option value="Personalizado">Personalizado</option>
        </select>
      </label>
      <label>
        Preço (R$)
        <input type="number" id="bolo-preco" step="0.01" min="0" placeholder="0.00" required>
      </label>
      <label>
        Quantidade
        <input type="number" id="bolo-quantidade" min="1" placeholder="1" required>
      </label>
      <label>
        Status
        <select id="bolo-status">
          <option value="disponivel">Disponível</option>
          <option value="vendido">Vendido</option>
          <option value="expirado">Expirado</option>
        </select>
      </label>
      <div class="modal-actions">
        <button type="button" id="btn-cancelar" class="btn-secondary">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `dashboard/src/public/style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: 'Inter', sans-serif; background: #f9f7ff; color: #1a1a2e; min-height: 100vh; }

/* ── LOGIN ── */
#screen-login {
  min-height: 100vh; display: flex; align-items: center;
  justify-content: center; padding: 1rem;
}
.login-card {
  background: #fff; border-radius: 20px; padding: 2.5rem 2rem;
  box-shadow: 0 8px 32px rgba(196,75,206,0.12); text-align: center;
  width: 100%; max-width: 360px;
}
.login-icon { font-size: 3rem; margin-bottom: 0.75rem; }
.login-card h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
.login-sub { color: #888; margin-bottom: 1.5rem; font-size: 0.9rem; }
#form-login { display: flex; flex-direction: column; gap: 0.75rem; }
#form-login input {
  padding: 0.8rem 1rem; border: 1.5px solid #e0e0e0; border-radius: 10px;
  font-size: 1rem; font-family: inherit; outline: none; transition: border-color 0.2s;
}
#form-login input:focus { border-color: #C44BCE; }
.erro { color: #e53935; font-size: 0.85rem; margin-top: 0.5rem; }

/* ── BUTTONS ── */
.btn-primary {
  background: linear-gradient(135deg, #FF6B9D, #C44BCE); color: #fff;
  border: none; padding: 0.65rem 1.4rem; border-radius: 10px;
  font-family: inherit; font-weight: 600; font-size: 0.95rem;
  cursor: pointer; transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.88; }
.btn-secondary {
  background: none; border: 1.5px solid #ddd; padding: 0.65rem 1.4rem;
  border-radius: 10px; font-family: inherit; font-size: 0.95rem; cursor: pointer;
}
.btn-secondary:hover { background: #f5f5f5; }
.btn-icon {
  background: none; border: 1.5px solid #e8e8e8; border-radius: 8px;
  padding: 0.3rem 0.55rem; cursor: pointer; font-size: 0.9rem; transition: background 0.15s;
}
.btn-icon:hover { background: #f0f0f0; }
.btn-delete:hover { background: #fff0f0; border-color: #ffcdd2; }

/* ── HEADER ── */
header {
  background: linear-gradient(135deg, #FF6B9D, #C44BCE); color: #fff;
  padding: 0.9rem 1.5rem; display: flex; justify-content: space-between;
  align-items: center; position: sticky; top: 0; z-index: 10;
  box-shadow: 0 2px 12px rgba(196,75,206,0.25);
}
.header-title { font-weight: 700; font-size: 1.1rem; }
.btn-logout {
  background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4);
  color: #fff; padding: 0.35rem 1rem; border-radius: 20px; cursor: pointer;
  font-family: inherit; font-size: 0.85rem; font-weight: 600; transition: background 0.2s;
}
.btn-logout:hover { background: rgba(255,255,255,0.35); }

/* ── MAIN ── */
main { padding: 1.25rem; max-width: 960px; margin: 0 auto; }

/* ── TOOLBAR ── */
.toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; }
.tabs { display: flex; background: #ede9ff; border-radius: 10px; padding: 0.25rem; gap: 0.2rem; }
.tab {
  border: none; background: none; padding: 0.4rem 0.9rem; border-radius: 7px;
  cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 500;
  color: #666; transition: all 0.15s;
}
.tab.active { background: #fff; color: #C44BCE; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
#filtro-status {
  padding: 0.45rem 0.8rem; border: 1.5px solid #e0e0e0; border-radius: 10px;
  font-family: inherit; font-size: 0.875rem; background: #fff; cursor: pointer;
}
.contagem { color: #999; font-size: 0.8rem; margin-bottom: 0.75rem; }
.empty { text-align: center; color: #bbb; padding: 3rem 1rem; font-size: 0.95rem; }

/* ── CARDS (mobile) ── */
.cards-view { display: flex; flex-direction: column; gap: 0.75rem; }
.bolo-card {
  background: #fff; border-radius: 12px; padding: 1rem 1.25rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.bolo-card-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 0.5rem; margin-bottom: 0.25rem;
}
.bolo-nome { font-weight: 600; font-size: 0.95rem; }
.bolo-preco { color: #C44BCE; font-weight: 700; font-size: 0.95rem; white-space: nowrap; }
.bolo-meta { color: #999; font-size: 0.8rem; margin-bottom: 0.75rem; }
.bolo-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.bolo-actions select {
  padding: 0.3rem 0.5rem; border: 1.5px solid #e0e0e0; border-radius: 7px;
  font-family: inherit; font-size: 0.8rem; background: #fff;
}

/* ── TABLE (desktop ≥ 640px) ── */
.table-view {
  display: none; width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.table-view th {
  background: #f5f0ff; padding: 0.7rem 1rem; text-align: left;
  font-size: 0.8rem; color: #888; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.table-view td { padding: 0.75rem 1rem; border-top: 1px solid #f0eeff; font-size: 0.9rem; }
.table-view td select {
  border: 1.5px solid #e0e0e0; border-radius: 7px;
  padding: 0.25rem 0.4rem; font-family: inherit; font-size: 0.8rem;
}
.table-view td:last-child { display: flex; gap: 0.4rem; align-items: center; }

@media (min-width: 640px) {
  .cards-view { display: none; }
  .table-view { display: table; }
}
@media (max-width: 480px) {
  .toolbar { flex-direction: column; align-items: flex-start; }
  #btn-adicionar { width: 100%; }
}

/* ── MODAL ── */
#modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 1rem;
}
.modal {
  background: #fff; border-radius: 16px; padding: 1.75rem;
  width: 100%; max-width: 420px; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}
.modal h2 { font-size: 1.15rem; margin-bottom: 1.25rem; }
#form-bolo { display: flex; flex-direction: column; gap: 0.85rem; }
#form-bolo label {
  display: flex; flex-direction: column; gap: 0.3rem;
  font-size: 0.85rem; font-weight: 600; color: #444;
}
#form-bolo input, #form-bolo select {
  padding: 0.65rem 0.85rem; border: 1.5px solid #e0e0e0; border-radius: 8px;
  font-family: inherit; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
}
#form-bolo input:focus, #form-bolo select:focus { border-color: #C44BCE; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
```

- [ ] **Step 3: Create `dashboard/src/public/app.js`**

```javascript
const API = '';
let TOKEN = localStorage.getItem('token');
let filtroData = 'hoje';
let filtroStatus = 'todos';
let bolosData = [];

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
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
        <span class="bolo-nome">🎂 ${b.sabor}</span>
        <span class="bolo-preco">R$ ${Number(b.preco).toFixed(2)}</span>
      </div>
      <div class="bolo-meta">${b.tamanho} · Qtd: ${b.quantidade} · ${origemLabel(b)}</div>
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
        <td>🎂 ${b.sabor}</td>
        <td>${b.tamanho}</td>
        <td>R$ ${Number(b.preco).toFixed(2)}</td>
        <td>${b.quantidade}</td>
        <td>${origemLabel(b)}</td>
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
  await fetch(`${API}/api/bolos/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status })
  });
  loadBolos();
}

async function deleteBolo(id) {
  if (!confirm('Apagar este bolo?')) return;
  await fetch(`${API}/api/bolos/${id}`, { method: 'DELETE', headers: getHeaders() });
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
```

- [ ] **Step 4: Start the full stack and test visually**

```bash
# From repo root:
docker compose up -d --build
```

Wait ~30 seconds, then open `http://localhost:3000`.

**Checklist visual:**
- [ ] Login screen aparece com emoji 🎂, campo senha, botão "Entrar"
- [ ] Senha errada → mensagem "Senha incorrecta"
- [ ] Senha correcta → redireciona para dashboard
- [ ] Header com gradiente rosa/roxo e botão "Sair"
- [ ] Tabs "Hoje / Semana / Todos" funcionam
- [ ] Filtro de status funciona
- [ ] "+ Adicionar" abre modal com todos os campos
- [ ] Guardar cria o bolo e aparece na lista
- [ ] ✏️ abre modal pré-preenchido, guardar actualiza
- [ ] Dropdown status muda directamente sem modal
- [ ] 🗑️ pede confirmação e apaga
- [ ] Em mobile (< 640px): mostra cards. Em desktop: mostra tabela

- [ ] **Step 5: Actualizar o workflow n8n (manual)**

No painel n8n (`http://localhost:5678`):

1. Abra o workflow existente
2. Encontre o nó **Google Sheets Append** e elimine-o
3. Adicione um nó **HTTP Request** no seu lugar:
   - **Method:** POST
   - **URL:** `http://dashboard:3000/api/bolos`
   - **Authentication:** None
   - **Send Headers:** ON → adicione:
     - `x-api-key` : `{{ $env.DASHBOARD_API_KEY }}`
     - `Content-Type` : `application/json`
   - **Body:** JSON → Raw JSON:
     ```json
     {
       "sabor": "{{ $json.sabor }}",
       "tamanho": "{{ $json.tamanho }}",
       "preco": {{ $json.preco }},
       "quantidade": {{ $json.quantidade }},
       "origem": "whatsapp",
       "disparo": "{{ $json.disparo }}"
     }
     ```
4. Ligue o nó ao **Postgres Update Estado** (ou ao nó anterior)
5. **Guarde e active** o workflow

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/public/
git commit -m "feat: frontend do dashboard — login, listagem, CRUD de bolos"
```

---

## Self-Review

**Spec coverage:**
- ✅ Serviço `dashboard` no docker-compose — Task 1
- ✅ Tabela `bolos` com todos os campos — Task 1
- ✅ POST /api/auth com senha → JWT 7 dias — Task 2
- ✅ requireAuth: JWT + x-api-key — Task 2
- ✅ GET /api/bolos com filtros status/data — Task 3
- ✅ POST /api/bolos (JWT e x-api-key) — Task 3
- ✅ PUT /api/bolos/:id (qualquer campo) — Task 3
- ✅ DELETE /api/bolos/:id — Task 3
- ✅ Frontend login — Task 4
- ✅ Frontend dashboard com cards (mobile) e tabela (desktop) — Task 4
- ✅ Modal adicionar/editar — Task 4
- ✅ Dropdown status sem modal — Task 4
- ✅ Instrução de migração PostgreSQL — Task 1 (init.sh)
- ✅ Instrução de actualização n8n — Task 4 Step 5
- ✅ Novas variáveis em .env.example — Task 1

**Placeholders:** nenhum.

**Consistência de tipos:** `db.query()` usado identicamente em bolos.js e nos testes. `requireAuth` exportado e importado com o mesmo nome. `bolosData` array usado em `renderBolos` e `openModal`.
