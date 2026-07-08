# Design: Dashboard de Bolos — Confeitaria Mika

**Data:** 2026-07-08
**Status:** Aprovado

---

## Contexto

O sistema actual (n8n + WhatsApp + PostgreSQL) guarda os bolos disponíveis no Google Sheets. A confeiteira e a funcionária precisam de uma interface web para ver, adicionar, editar e apagar bolos — acessível em telemóvel e computador, com uma senha partilhada.

---

## Arquitectura

Novo serviço `dashboard` adicionado ao `docker-compose.yml` existente:

```
WhatsApp → Evolution API → n8n → POST /api/bolos → dashboard (Express) → PostgreSQL
                                                                               ↑
                                     Browser (confeiteira/funcionária) → API REST
```

- **dashboard**: Node.js + Express — serve a API REST e o frontend HTML estático em `/`
- **PostgreSQL**: tabela nova `bolos` no banco `confeitaria` já existente
- **n8n**: workflow actualizado — chama `POST /api/bolos` com `x-api-key` em vez de Google Sheets Append
- **Autenticação**: senha partilhada em `.env` → JWT válido 7 dias

---

## Modelo de dados

```sql
CREATE TABLE bolos (
    id           SERIAL PRIMARY KEY,
    sabor        TEXT NOT NULL,
    tamanho      TEXT NOT NULL,
    preco        DECIMAL(10,2) NOT NULL,
    quantidade   INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'disponivel',  -- disponivel | vendido | expirado
    origem       TEXT NOT NULL DEFAULT 'manual',       -- whatsapp | manual
    disparo      TEXT,                                 -- manha | tarde | noite | NULL
    criado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## API

Base URL: `http://localhost:DASHBOARD_PORT` (interno Docker: `http://dashboard:3000`)

### Autenticação

`POST /api/auth`
- Body: `{ "senha": "..." }`
- Resposta: `{ "token": "<JWT>" }`
- JWT válido 7 dias, assinado com `JWT_SECRET` do `.env`

Todos os outros endpoints exigem `Authorization: Bearer <token>`.

O n8n usa `x-api-key: <DASHBOARD_API_KEY>` em vez de JWT (autenticação de serviço, sem expiração).

### Bolos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/bolos` | Lista bolos. Query params: `status`, `data` (`hoje`/`semana`/`todos`) |
| `POST` | `/api/bolos` | Cria bolo. Aceita JWT **ou** x-api-key |
| `PUT` | `/api/bolos/:id` | Edita bolo (qualquer campo) |
| `DELETE` | `/api/bolos/:id` | Apaga bolo |

#### Body de POST/PUT

```json
{
  "sabor": "Chocolate com morango",
  "tamanho": "M",
  "preco": 45.00,
  "quantidade": 2,
  "status": "disponivel",
  "origem": "manual",
  "disparo": null
}
```

---

## Frontend

HTML + CSS + JS vanilla, servido pelo Express em `GET /`. Sem build step.

### Ecrãs

**Login**
- Campo senha + botão "Entrar"
- Token guardado em `localStorage`
- Redireccionamento automático se token válido

**Dashboard**
- Header com gradiente `#FF6B9D → #C44BCE`, título "Confeitaria Mika 🎂", botão logout
- Filtros: tabs `Hoje / Esta semana / Todos` + selector status `Disponível / Vendido / Expirado / Todos`
- Botão "+ Adicionar bolo"
- Lista de bolos (cards em mobile, tabela em desktop)
- Contagem no topo: "X bolos disponíveis hoje"

**Cartão/Linha de bolo**
```
🎂 Chocolate com morango — M — R$ 45,00 — Qtd: 2  [whatsapp | manhã]
   [Disponível ▼]  [✏️ Editar]  [🗑️ Apagar]
```
- Dropdown status altera directamente (PUT sem abrir modal)
- Badge de origem (`whatsapp` / `manual`) e disparo (`manhã`/`tarde`/`noite`)

**Modal Adicionar/Editar**
- Campos: Sabor (text), Tamanho (select: P/M/G/Personalizado), Preço (number), Quantidade (number), Status (select)
- Botões: Guardar / Cancelar
- Validação: todos os campos obrigatórios excepto disparo

### Visual

- Fonte: Inter (Google Fonts)
- Gradiente header: `#FF6B9D → #C44BCE`
- Fundo: `#f9f7ff` (mesmo tom da landing page)
- Cards: `border-radius: 12px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.07)`
- Responsivo: cards em coluna única em mobile (< 600px), tabela em desktop

---

## Variáveis de ambiente (novas)

```env
DASHBOARD_PORT=3000
DASHBOARD_SENHA=troque_por_senha_segura
DASHBOARD_API_KEY=troque_por_chave_32chars
JWT_SECRET=troque_por_segredo_jwt_64chars
```

---

## Docker Compose (novo serviço)

```yaml
dashboard:
  build: ./dashboard
  restart: unless-stopped
  ports:
    - "${DASHBOARD_PORT:-3000}:3000"
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    DASHBOARD_SENHA: ${DASHBOARD_SENHA}
    DASHBOARD_API_KEY: ${DASHBOARD_API_KEY}
    JWT_SECRET: ${JWT_SECRET}
  depends_on:
    postgres:
      condition: service_healthy
  networks:
    - confeitaria_net
```

---

## Alteração ao n8n

No workflow existente, substituir o nó **Google Sheets Append** por um nó **HTTP Request**:

```
Method: POST
URL: http://dashboard:3000/api/bolos
Headers:
  x-api-key: {{ $env.DASHBOARD_API_KEY }}
  Content-Type: application/json
Body:
{
  "sabor": "{{ $json.sabor }}",
  "tamanho": "{{ $json.tamanho }}",
  "preco": {{ $json.preco }},
  "quantidade": {{ $json.quantidade }},
  "origem": "whatsapp",
  "disparo": "{{ $json.disparo }}"
}
```

---

## Ficheiros a criar

```
dashboard/
├── Dockerfile
├── package.json
├── src/
│   ├── index.js          # Entry point — Express setup
│   ├── db.js             # Pool PostgreSQL (pg)
│   ├── auth.js           # POST /api/auth + middleware JWT/apikey
│   ├── bolos.js          # Router /api/bolos (CRUD)
│   └── public/
│       ├── index.html    # Login + Dashboard (SPA vanilla)
│       ├── style.css     # Estilos
│       └── app.js        # Lógica frontend
```

---

## Migração (stack já em execução)

Se o PostgreSQL já está a correr, o `init.sh` não re-executa. Correr manualmente:

```bash
docker exec -it postgres_confeitaria psql -U admin -d confeitaria -c "
CREATE TABLE IF NOT EXISTS bolos (
    id           SERIAL PRIMARY KEY,
    sabor        TEXT NOT NULL,
    tamanho      TEXT NOT NULL,
    preco        DECIMAL(10,2) NOT NULL,
    quantidade   INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'disponivel',
    origem       TEXT NOT NULL DEFAULT 'manual',
    disparo      TEXT,
    criado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);"
```

---

## Entregáveis

1. `dashboard/` — serviço Node.js + frontend
2. `docker-compose.yml` — serviço `dashboard` adicionado
3. `.env.example` — novas variáveis documentadas
4. `init.sh` — `CREATE TABLE bolos` adicionado
5. Instrução de actualização do workflow n8n (manual — não automatizável)
