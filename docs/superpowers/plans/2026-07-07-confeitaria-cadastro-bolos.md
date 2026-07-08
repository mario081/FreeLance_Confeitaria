# Sistema de Cadastro Automático de Bolos — Confeitaria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir completamente o projeto existente por um sistema de cadastro automatizado de bolos via WhatsApp, com 3 disparos diários, coleta conversacional e registro no Google Sheets.

**Architecture:** n8n orquestra todo o fluxo — 3 cron triggers enviam pergunta inicial via Evolution API REST, webhook recebe respostas da confeiteira, PostgreSQL mantém estado da conversa por número, um Code node centraliza toda a lógica de diálogo, Google Sheets recebe os dados finais. Sem backend customizado, sem frontend.

**Tech Stack:** Docker Compose v2, Evolution API (`atendai/evolution-api:latest`), n8n (`n8nio/n8n:latest`), PostgreSQL 16, Google Sheets API (service account), Node.js (Code node no n8n)

## Global Constraints

- Docker Compose v2 — comando `docker compose` (sem hífen)
- Todos os segredos via `.env`, nunca hardcoded em arquivos versionados
- Números WhatsApp sempre no formato internacional sem `+` (ex: `5511999999999`)
- n8n usa PostgreSQL como banco (não SQLite) — banco `n8n` no mesmo container postgres
- Variáveis acessíveis no n8n via `$env.NOME` devem estar no environment do container n8n
- Code nodes requerem `N8N_ALLOW_EXEC=true` no container n8n
- Fuso horário: `America/Sao_Paulo` nos containers

---

### Task 1: Limpar arquivos do projeto anterior

**Files:**
- Delete: `backend/`, `frontend/`, `node_modules/`
- Delete: `docker-compose.prod.yml`, `.env.local.example`, `fix_workflow.js`
- Delete: `package.json`, `package-lock.json`, `prompt.md`, `qr-whatsapp.png`, `CNAME`

**Interfaces:**
- Produces: projeto limpo; itens restantes: `.git/`, `.claude/`, `.superpowers/`, `.env`, `.gitignore`, `docs/`

- [ ] **Step 1: Remover diretórios e arquivos antigos**

```bash
rm -rf backend/ frontend/ node_modules/
rm -f docker-compose.prod.yml .env.local.example fix_workflow.js
rm -f package.json package-lock.json prompt.md qr-whatsapp.png CNAME
```

- [ ] **Step 2: Verificar que apenas arquivos esperados restam**

```bash
ls -la
```

Esperado: `.git/`, `.claude/`, `.superpowers/`, `.env`, `.gitignore`, `docs/`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove projeto anterior (NestJS + React)"
```

---

### Task 2: Docker Compose e variáveis de ambiente

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Produces: `docker-compose.yml` com serviços `postgres`, `evolution-api`, `n8n` com health checks
- Produces: `.env.example` com todas as variáveis documentadas

- [ ] **Step 1: Criar docker-compose.yml**

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
      # Variáveis acessíveis no workflow via $env.*
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      EVOLUTION_INSTANCE_NAME: ${EVOLUTION_INSTANCE_NAME}
      WHATSAPP_NUMBER: ${WHATSAPP_NUMBER}
      GOOGLE_SHEETS_ID: ${GOOGLE_SHEETS_ID}
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "${N8N_PORT:-5678}:5678"
    networks:
      - confeitaria_net
```

- [ ] **Step 2: Criar .env.example**

```env
# ============================================================
# PostgreSQL
# ============================================================
POSTGRES_USER=admin
POSTGRES_PASSWORD=troque_por_senha_segura
POSTGRES_DB=confeitaria

# ============================================================
# Evolution API — gateway WhatsApp
# Acesse http://localhost:8080 após subir os containers
# ============================================================
EVOLUTION_API_KEY=troque_por_chave_segura_min32chars
EVOLUTION_PORT=8080

# Nome da instância que você vai criar na Evolution API UI
EVOLUTION_INSTANCE_NAME=confeitaria

# ============================================================
# WhatsApp
# Número da confeiteira (código do país + DDD + número, sem + ou espaços)
# ============================================================
WHATSAPP_NUMBER=5511999999999

# ============================================================
# n8n — orquestrador
# Acesse http://localhost:5678 após subir os containers
# ============================================================
N8N_USER=admin
N8N_PASSWORD=troque_por_senha_segura
N8N_PORT=5678

# URL base do n8n acessível pela Evolution API (dentro do Docker: http://n8n:5678)
# Para receber webhooks em produção, use a URL pública (ex: https://n8n.seudominio.com)
N8N_WEBHOOK_URL=http://n8n:5678

# ============================================================
# Google Sheets
# ID da planilha: parte da URL docs.google.com/spreadsheets/d/ESTE_ID/edit
# ============================================================
GOOGLE_SHEETS_ID=id_da_planilha_aqui
```

- [ ] **Step 3: Verificar sintaxe do docker-compose**

```bash
cp .env.example .env
# Edite .env e preencha POSTGRES_PASSWORD, EVOLUTION_API_KEY, N8N_PASSWORD
docker compose config 2>&1 | head -20
```

Esperado: YAML válido impresso, sem erros de sintaxe.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: docker-compose com Evolution API, n8n e PostgreSQL"
```

---

### Task 3: Script de inicialização do banco

**Files:**
- Create: `init.sh`

**Interfaces:**
- Consumes: container `postgres` do docker-compose.yml (Task 2)
- Produces: bancos `confeitaria` (tabelas `conversa_estado`, `erros_log`) e `n8n` criados na primeira inicialização

- [ ] **Step 1: Criar init.sh**

```bash
#!/bin/bash
set -e

# Cria banco para o n8n
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE n8n;
EOSQL

# Cria tabelas no banco da confeitaria
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
EOSQL
```

- [ ] **Step 2: Tornar executável**

```bash
chmod +x init.sh
```

- [ ] **Step 3: Subir postgres e verificar tabelas**

```bash
docker compose up -d postgres
sleep 8
docker compose exec postgres psql -U admin -d confeitaria -c "\dt"
```

Esperado:
```
         List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | conversa_estado   | table | admin
 public | erros_log         | table | admin
(2 rows)
```

- [ ] **Step 4: Verificar banco n8n**

```bash
docker compose exec postgres psql -U admin -l
```

Esperado: bancos `confeitaria`, `n8n` e `postgres` na listagem.

- [ ] **Step 5: Commit**

```bash
git add init.sh
git commit -m "feat: schema PostgreSQL para estado da conversa e banco n8n"
```

---

### Task 4: Workflow n8n

**Files:**
- Create: `n8n-whatsapp-workflow.json`

**Interfaces:**
- Consumes:
  - Tabela `conversa_estado` no PostgreSQL (Task 3)
  - Evolution API em `http://evolution-api:8080` — endpoint `POST /message/sendText/{instanceName}`
  - Google Sheets — credencial "Google Sheets Confeitaria" configurada no n8n
- Produces: arquivo JSON importável no n8n com workflow completo

**Fluxo de nós:**
```
[Schedule Manha] ─┐
[Schedule Tarde] ─┼→ [Set Disparo] → [Postgres Upsert] → [HTTP Pergunta Inicial]
[Schedule Noite] ─┘

[Webhook Entrada] → [Set Extrair Dados] → [IF Não é Minha Msg]
  → [Postgres Ler Estado] → [Code Lógica Conversa]
  → [Switch Ação]
      → enviar: [Postgres Update Estado] → [IF Salvar Sheets?]
                                              true  → [Google Sheets Append] → [HTTP Enviar Resposta]
                                              false ──────────────────────── → [HTTP Enviar Resposta]
      → ignorar: [NoOp]
```

**Credenciais necessárias no n8n** (criar antes de importar):

| Nome no n8n              | Tipo                     | Dados                                          |
|--------------------------|--------------------------|------------------------------------------------|
| PostgreSQL Confeitaria   | Postgres                 | host: postgres, port: 5432, db: confeitaria    |
| Google Sheets Confeitaria| Google Sheets (OAuth2)   | service account JSON (via Google Cloud Console)|

- [ ] **Step 1: Criar n8n-whatsapp-workflow.json**

```json
{
  "name": "Confeitaria - Cadastro de Bolos",
  "nodes": [
    {
      "id": "cron-manha",
      "name": "Schedule Manha",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 100],
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 8 * * *" }]
        }
      }
    },
    {
      "id": "cron-tarde",
      "name": "Schedule Tarde",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 220],
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 15 * * *" }]
        }
      }
    },
    {
      "id": "cron-noite",
      "name": "Schedule Noite",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 340],
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 20 * * *" }]
        }
      }
    },
    {
      "id": "set-manha",
      "name": "Set Disparo Manha",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.3,
      "position": [460, 100],
      "parameters": {
        "assignments": {
          "assignments": [
            { "id": "d1", "name": "disparo", "type": "string", "value": "manha" }
          ]
        }
      }
    },
    {
      "id": "set-tarde",
      "name": "Set Disparo Tarde",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.3,
      "position": [460, 220],
      "parameters": {
        "assignments": {
          "assignments": [
            { "id": "d2", "name": "disparo", "type": "string", "value": "tarde" }
          ]
        }
      }
    },
    {
      "id": "set-noite",
      "name": "Set Disparo Noite",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.3,
      "position": [460, 340],
      "parameters": {
        "assignments": {
          "assignments": [
            { "id": "d3", "name": "disparo", "type": "string", "value": "noite" }
          ]
        }
      }
    },
    {
      "id": "pg-upsert",
      "name": "Postgres Upsert Estado",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [680, 220],
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO conversa_estado (numero, estado, dados, disparo, atualizado_em) VALUES ($1, 'aguardando_inicial', '{}', $2, NOW()) ON CONFLICT (numero) DO UPDATE SET estado = 'aguardando_inicial', dados = '{}', disparo = $2, atualizado_em = NOW()",
        "options": {
          "queryParams": "={{ JSON.stringify([$env.WHATSAPP_NUMBER, $json.disparo]) }}"
        }
      },
      "credentials": {
        "postgres": { "id": "1", "name": "PostgreSQL Confeitaria" }
      }
    },
    {
      "id": "http-inicial",
      "name": "HTTP Enviar Pergunta Inicial",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [900, 220],
      "parameters": {
        "method": "POST",
        "url": "={{ $env.EVOLUTION_API_URL }}/message/sendText/={{ $env.EVOLUTION_INSTANCE_NAME }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [{ "name": "apikey", "value": "={{ $env.EVOLUTION_API_KEY }}" }]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ number: $env.WHATSAPP_NUMBER, options: { delay: 1200 }, textMessage: { text: 'Oi! 😊 Tem bolo disponível hoje?' } }) }}"
      }
    },
    {
      "id": "webhook",
      "name": "Webhook Entrada",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [250, 600],
      "parameters": {
        "path": "whatsapp-webhook",
        "httpMethod": "POST",
        "responseMode": "onReceived",
        "responseData": ""
      },
      "webhookId": "confeitaria-webhook"
    },
    {
      "id": "set-extrair",
      "name": "Set Extrair Dados",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.3,
      "position": [460, 600],
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "e1",
              "name": "numero",
              "type": "string",
              "value": "={{ ($json.body?.data?.key?.remoteJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '') }}"
            },
            {
              "id": "e2",
              "name": "mensagem",
              "type": "string",
              "value": "={{ $json.body?.data?.message?.conversation || $json.body?.data?.message?.extendedTextMessage?.text || '' }}"
            },
            {
              "id": "e3",
              "name": "fromMe",
              "type": "boolean",
              "value": "={{ !!$json.body?.data?.key?.fromMe }}"
            },
            {
              "id": "e4",
              "name": "event",
              "type": "string",
              "value": "={{ $json.body?.event || '' }}"
            }
          ]
        }
      }
    },
    {
      "id": "if-not-me",
      "name": "IF Nao e Minha Mensagem",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [680, 600],
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": false, "leftValue": "", "typeValidation": "loose" },
          "conditions": [
            {
              "id": "c1",
              "leftValue": "={{ $json.fromMe }}",
              "rightValue": true,
              "operator": { "type": "boolean", "operation": "notEquals" }
            },
            {
              "id": "c2",
              "leftValue": "={{ $json.mensagem }}",
              "rightValue": "",
              "operator": { "type": "string", "operation": "notEquals" }
            }
          ],
          "combinator": "and"
        }
      }
    },
    {
      "id": "pg-ler",
      "name": "Postgres Ler Estado",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [900, 560],
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT estado, dados, disparo FROM conversa_estado WHERE numero = $1",
        "options": {
          "queryParams": "={{ JSON.stringify([$json.numero]) }}"
        }
      },
      "credentials": {
        "postgres": { "id": "1", "name": "PostgreSQL Confeitaria" }
      }
    },
    {
      "id": "code-logica",
      "name": "Code Logica Conversa",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1120, 560],
      "parameters": {
        "jsCode": "const numero = $('Set Extrair Dados').first().json.numero;\nconst mensagem = $('Set Extrair Dados').first().json.mensagem || '';\n\nconst rows = $input.all();\nconst row = rows.length > 0 ? rows[0].json : {};\nconst estado = row.estado || 'aguardando_inicial';\nconst dados = typeof row.dados === 'string' ? JSON.parse(row.dados) : (row.dados || {});\nconst disparo = row.disparo || 'manha';\nconst msg = mensagem.toLowerCase().trim();\n\nif (!msg) {\n  return [{ json: { action: 'ignorar', numero, mensagemResposta: '', nextEstado: estado, nextDados: JSON.stringify(dados), saveToSheets: false, dadosParaSheets: null, disparo } }];\n}\n\nfunction ehSim(t) {\n  return /\\b(sim|s|tenho|tem|claro|pode|vai|ok|okay|vou|quero|disponivel|dispon\\u00edvel|yes)\\b/.test(t);\n}\nfunction ehNao(t) {\n  return /\\b(n\\u00e3o|nao|n|sem|nenhum|zero|negativo|no)\\b/.test(t);\n}\n\nlet action = 'enviar_mensagem';\nlet nextEstado = estado;\nlet nextDados = { ...dados };\nlet mensagemResposta = '';\nlet saveToSheets = false;\nlet dadosParaSheets = null;\n\nswitch (estado) {\n  case 'aguardando_inicial':\n    if (ehSim(msg)) {\n      nextEstado = 'pergunta_sabor';\n      mensagemResposta = 'Que legal! Qual o sabor?';\n    } else if (ehNao(msg)) {\n      nextEstado = 'encerrado';\n      mensagemResposta = 'Tudo bem! Qualquer coisa me avisa. \\uD83D\\uDE0A';\n    } else {\n      mensagemResposta = 'Oi! \\uD83D\\uDE0A Tem bolo disponível hoje?';\n    }\n    break;\n\n  case 'pergunta_sabor':\n    nextDados = { ...nextDados, sabor: mensagem };\n    nextEstado = 'pergunta_tamanho';\n    mensagemResposta = 'Hmm, delícia! Qual o tamanho? (pequeno, médio ou grande)';\n    break;\n\n  case 'pergunta_tamanho':\n    nextDados = { ...nextDados, tamanho: mensagem };\n    nextEstado = 'pergunta_preco';\n    mensagemResposta = 'Qual o preço desse bolo?';\n    break;\n\n  case 'pergunta_preco':\n    nextDados = { ...nextDados, preco: mensagem };\n    nextEstado = 'pergunta_quantidade';\n    mensagemResposta = 'E quantos você tem disponível?';\n    break;\n\n  case 'pergunta_quantidade': {\n    const completo = { ...nextDados, quantidade: mensagem };\n    nextDados = {};\n    nextEstado = 'aguardando_mais';\n    saveToSheets = true;\n    const agora = new Date();\n    dadosParaSheets = {\n      data: agora.toLocaleDateString('pt-BR'),\n      horario: disparo,\n      sabor: completo.sabor || '',\n      tamanho: completo.tamanho || '',\n      preco: completo.preco || '',\n      quantidade: mensagem,\n      status: 'Disponível'\n    };\n    mensagemResposta = 'Tudo anotado! \\u2705 Já coloquei na planilha. Tem mais algum bolo? \\uD83C\\uDF82';\n    break;\n  }\n\n  case 'aguardando_mais':\n    if (ehSim(msg)) {\n      nextEstado = 'pergunta_sabor';\n      nextDados = {};\n      mensagemResposta = 'Qual o sabor?';\n    } else {\n      nextEstado = 'encerrado';\n      mensagemResposta = 'Tudo bem! Qualquer coisa me avisa. \\uD83D\\uDE0A';\n    }\n    break;\n\n  case 'encerrado':\n  default:\n    action = 'ignorar';\n    break;\n}\n\nreturn [{ json: { numero, mensagemResposta, nextEstado, nextDados: JSON.stringify(nextDados), saveToSheets, dadosParaSheets, action, disparo } }];"
      }
    },
    {
      "id": "switch-acao",
      "name": "Switch Acao",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [1340, 560],
      "parameters": {
        "mode": "rules",
        "rules": {
          "rules": [
            {
              "conditions": {
                "conditions": [{
                  "leftValue": "={{ $json.action }}",
                  "rightValue": "enviar_mensagem",
                  "operator": { "type": "string", "operation": "equals" }
                }]
              },
              "renameOutput": true,
              "outputKey": "enviar"
            },
            {
              "conditions": {
                "conditions": [{
                  "leftValue": "={{ $json.action }}",
                  "rightValue": "ignorar",
                  "operator": { "type": "string", "operation": "equals" }
                }]
              },
              "renameOutput": true,
              "outputKey": "ignorar"
            }
          ]
        },
        "options": {}
      }
    },
    {
      "id": "pg-update",
      "name": "Postgres Update Estado",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [1560, 480],
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO conversa_estado (numero, estado, dados, disparo, atualizado_em) VALUES ($3, $1, $2::jsonb, $4, NOW()) ON CONFLICT (numero) DO UPDATE SET estado = $1, dados = $2::jsonb, atualizado_em = NOW()",
        "options": {
          "queryParams": "={{ JSON.stringify([$json.nextEstado, $json.nextDados, $json.numero, $json.disparo]) }}"
        }
      },
      "credentials": {
        "postgres": { "id": "1", "name": "PostgreSQL Confeitaria" }
      }
    },
    {
      "id": "if-sheets",
      "name": "IF Salvar Sheets",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [1780, 480],
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": false, "leftValue": "", "typeValidation": "loose" },
          "conditions": [{
            "id": "s1",
            "leftValue": "={{ $json.saveToSheets }}",
            "rightValue": true,
            "operator": { "type": "boolean", "operation": "equals" }
          }],
          "combinator": "and"
        }
      }
    },
    {
      "id": "sheets-append",
      "name": "Google Sheets Append",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.4,
      "position": [2000, 400],
      "continueOnFail": true,
      "parameters": {
        "operation": "append",
        "documentId": {
          "__rl": true,
          "value": "={{ $env.GOOGLE_SHEETS_ID }}",
          "mode": "id"
        },
        "sheetName": {
          "__rl": true,
          "value": "Bolos Disponíveis",
          "mode": "name"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "Data": "={{ $json.dadosParaSheets.data }}",
            "Horário": "={{ $json.dadosParaSheets.horario }}",
            "Sabor": "={{ $json.dadosParaSheets.sabor }}",
            "Tamanho": "={{ $json.dadosParaSheets.tamanho }}",
            "Preço": "={{ $json.dadosParaSheets.preco }}",
            "Quantidade": "={{ $json.dadosParaSheets.quantidade }}",
            "Status": "={{ $json.dadosParaSheets.status }}"
          },
          "matchingColumns": [],
          "schema": []
        },
        "options": {}
      },
      "credentials": {
        "googleSheetsOAuth2Api": { "id": "2", "name": "Google Sheets Confeitaria" }
      }
    },
    {
      "id": "http-resposta",
      "name": "HTTP Enviar Resposta",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [2220, 480],
      "parameters": {
        "method": "POST",
        "url": "={{ $env.EVOLUTION_API_URL }}/message/sendText/={{ $env.EVOLUTION_INSTANCE_NAME }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [{ "name": "apikey", "value": "={{ $env.EVOLUTION_API_KEY }}" }]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ number: $('Code Logica Conversa').first().json.numero, options: { delay: 1200 }, textMessage: { text: $('Code Logica Conversa').first().json.mensagemResposta } }) }}"
      }
    },
    {
      "id": "noop-ignorar",
      "name": "NoOp Ignorar",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [1560, 680],
      "parameters": {}
    }
  ],
  "connections": {
    "Schedule Manha": {
      "main": [[{ "node": "Set Disparo Manha", "type": "main", "index": 0 }]]
    },
    "Schedule Tarde": {
      "main": [[{ "node": "Set Disparo Tarde", "type": "main", "index": 0 }]]
    },
    "Schedule Noite": {
      "main": [[{ "node": "Set Disparo Noite", "type": "main", "index": 0 }]]
    },
    "Set Disparo Manha": {
      "main": [[{ "node": "Postgres Upsert Estado", "type": "main", "index": 0 }]]
    },
    "Set Disparo Tarde": {
      "main": [[{ "node": "Postgres Upsert Estado", "type": "main", "index": 0 }]]
    },
    "Set Disparo Noite": {
      "main": [[{ "node": "Postgres Upsert Estado", "type": "main", "index": 0 }]]
    },
    "Postgres Upsert Estado": {
      "main": [[{ "node": "HTTP Enviar Pergunta Inicial", "type": "main", "index": 0 }]]
    },
    "Webhook Entrada": {
      "main": [[{ "node": "Set Extrair Dados", "type": "main", "index": 0 }]]
    },
    "Set Extrair Dados": {
      "main": [[{ "node": "IF Nao e Minha Mensagem", "type": "main", "index": 0 }]]
    },
    "IF Nao e Minha Mensagem": {
      "main": [
        [{ "node": "Postgres Ler Estado", "type": "main", "index": 0 }],
        []
      ]
    },
    "Postgres Ler Estado": {
      "main": [[{ "node": "Code Logica Conversa", "type": "main", "index": 0 }]]
    },
    "Code Logica Conversa": {
      "main": [[{ "node": "Switch Acao", "type": "main", "index": 0 }]]
    },
    "Switch Acao": {
      "main": [
        [{ "node": "Postgres Update Estado", "type": "main", "index": 0 }],
        [{ "node": "NoOp Ignorar", "type": "main", "index": 0 }]
      ]
    },
    "Postgres Update Estado": {
      "main": [[{ "node": "IF Salvar Sheets", "type": "main", "index": 0 }]]
    },
    "IF Salvar Sheets": {
      "main": [
        [{ "node": "Google Sheets Append", "type": "main", "index": 0 }],
        [{ "node": "HTTP Enviar Resposta", "type": "main", "index": 0 }]
      ]
    },
    "Google Sheets Append": {
      "main": [[{ "node": "HTTP Enviar Resposta", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveExecutionProgress": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": ""
  },
  "staticData": null,
  "meta": { "templateCredsSetupCompleted": false },
  "tags": [],
  "triggerCount": 4,
  "updatedAt": "2026-07-07T00:00:00.000Z",
  "versionId": "1"
}
```

- [ ] **Step 2: Validar que o JSON é sintaxicamente correto**

```bash
python3 -m json.tool n8n-whatsapp-workflow.json > /dev/null && echo "JSON válido"
```

Esperado: `JSON válido`

- [ ] **Step 3: Subir todos os serviços**

```bash
docker compose up -d
docker compose ps
```

Esperado: todos os 3 containers com status `Up` (ou `healthy`).

- [ ] **Step 4: Acessar n8n e configurar credenciais**

Abra `http://localhost:5678` no browser (usuário/senha do `.env`).

Crie as 2 credenciais antes de importar o workflow:

**Credencial 1 — PostgreSQL Confeitaria:**
- Menu: Credentials → Add Credential → Postgres
- Host: `postgres`
- Port: `5432`
- Database: `confeitaria`
- User: valor de `POSTGRES_USER` do `.env`
- Password: valor de `POSTGRES_PASSWORD` do `.env`
- Nome da credencial: `PostgreSQL Confeitaria`
- Salvar e testar conexão (deve aparecer "Connection tested successfully")

**Credencial 2 — Google Sheets Confeitaria:**
- Menu: Credentials → Add Credential → Google Sheets OAuth2 API
- Selecionar "Service Account" e colar o JSON da service account
- Nome da credencial: `Google Sheets Confeitaria`
- Salvar

- [ ] **Step 5: Importar o workflow no n8n**

- Menu: Workflows → Import from File
- Selecionar `n8n-whatsapp-workflow.json`
- Verificar que todos os nós aparecem sem erros de credencial
- Se algum nó mostrar aviso de credencial, clicar no nó e selecionar a credencial correta
- Ativar o workflow (toggle no canto superior direito)

- [ ] **Step 6: Commit**

```bash
git add n8n-whatsapp-workflow.json
git commit -m "feat: workflow n8n para cadastro automático de bolos"
```

---

### Task 5: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: guia completo de setup do zero para o usuário final

- [ ] **Step 1: Criar README.md**

```markdown
# 🎂 Confeitaria — Cadastro Automático de Bolos via WhatsApp

Sistema que envia mensagens automáticas para a confeiteira 3x/dia via WhatsApp
e registra os bolos disponíveis em uma planilha Google Sheets.

---

## Pré-requisitos

- Docker Desktop instalado e rodando
- Conta Google com acesso ao Google Sheets
- Número WhatsApp para conectar na Evolution API (chip da confeitaria ou pessoal)

---

## 1. Configurar Google Sheets

### 1.1 Criar a planilha

1. Acesse [Google Sheets](https://sheets.google.com) e crie uma nova planilha
2. Renomeie a aba para **Bolos Disponíveis**
3. Adicione os cabeçalhos na linha 1:

| A    | B       | C     | D       | E     | F          | G      |
|------|---------|-------|---------|-------|------------|--------|
| Data | Horário | Sabor | Tamanho | Preço | Quantidade | Status |

4. Copie o **ID da planilha** da URL:
   `https://docs.google.com/spreadsheets/d/**ESTE_ID**/edit`

### 1.2 Criar Service Account

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Ative a **Google Sheets API**: APIs & Services → Library → Google Sheets API → Enable
4. Crie credenciais: APIs & Services → Credentials → Create Credentials → Service Account
5. Após criar, clique na service account → aba Keys → Add Key → JSON
6. Guarde o arquivo JSON baixado (você vai precisar no n8n)
7. Copie o email da service account (formato: `nome@projeto.iam.gserviceaccount.com`)

### 1.3 Compartilhar a planilha com a service account

Na planilha Google Sheets:
- Clique em **Compartilhar** → cole o email da service account → Editor → Confirmar

---

## 2. Configurar .env

```bash
cp .env.example .env
```

Edite `.env` e preencha todos os campos. Os obrigatórios são:

| Variável              | Descrição                                         |
|-----------------------|---------------------------------------------------|
| `POSTGRES_PASSWORD`   | Senha do banco (inventar uma senha segura)        |
| `EVOLUTION_API_KEY`   | Chave da Evolution API (inventar, mín. 32 chars)  |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp (ex: `confeitaria`) |
| `WHATSAPP_NUMBER`     | Número da confeiteira (ex: `5511999999999`)       |
| `N8N_PASSWORD`        | Senha do n8n (inventar uma senha segura)          |
| `GOOGLE_SHEETS_ID`    | ID da planilha do passo 1.1                       |

---

## 3. Subir os containers

```bash
docker compose up -d
```

Aguarde ~30 segundos e verifique:

```bash
docker compose ps
```

Esperado: 3 containers com status `Up`.

---

## 4. Conectar WhatsApp na Evolution API

1. Acesse `http://localhost:8080`
2. Faça login com a `EVOLUTION_API_KEY` do seu `.env`
3. Clique em **New Instance** e configure:
   - Instance Name: mesmo valor de `EVOLUTION_INSTANCE_NAME` no `.env`
4. Clique em **Connect** → aparece um QR Code
5. No WhatsApp do número da confeitaria: **Configurações → Aparelhos conectados → Conectar aparelho**
6. Escaneie o QR Code
7. Aguarde o status mudar para **Connected**

---

## 5. Configurar credenciais no n8n

1. Acesse `http://localhost:5678`
2. Login: usuário `admin`, senha do `N8N_PASSWORD` do `.env`
3. Vá em **Credentials** → **Add Credential**

**Credencial 1 — PostgreSQL:**
- Tipo: Postgres
- Host: `postgres` | Port: `5432` | Database: `confeitaria`
- User e Password: mesmos do `.env`
- Nome: `PostgreSQL Confeitaria`
- Teste a conexão antes de salvar

**Credencial 2 — Google Sheets:**
- Tipo: Google Sheets OAuth2 API
- Selecione Service Account e cole o conteúdo do JSON baixado no passo 1.2
- Nome: `Google Sheets Confeitaria`

---

## 6. Importar o workflow no n8n

1. No n8n: **Workflows** → **Import from File**
2. Selecione o arquivo `n8n-whatsapp-workflow.json`
3. Se aparecer aviso de credenciais, clique em cada nó afetado e selecione a credencial correta
4. **Ative o workflow** (toggle no canto superior direito)

---

## 7. Configurar webhook na Evolution API

O n8n precisa receber as respostas da confeiteira. Configure o webhook:

1. Acesse `http://localhost:8080`
2. Na instância criada, clique em **Webhooks** ou **Settings**
3. Configure a URL do webhook:
   - URL: `http://n8n:5678/webhook/whatsapp-webhook`
   - Events: marque `MESSAGES_UPSERT`
4. Salvar

> **Em produção:** substitua `http://n8n:5678` pela URL pública do seu servidor.

---

## 8. Testar

### Teste manual do disparo

No n8n, abra o workflow e clique em **Execute** no nó **Schedule Manha**.
A confeiteira deve receber a mensagem no WhatsApp em alguns segundos.

### Teste de resposta

Responda "sim" no WhatsApp e siga o fluxo de perguntas.
Ao final, verifique a planilha Google Sheets — uma nova linha deve ter aparecido.

---

## Estrutura do projeto

```
.
├── docker-compose.yml          # 3 serviços: postgres, evolution-api, n8n
├── init.sh                     # Cria tabelas conversa_estado e erros_log
├── n8n-whatsapp-workflow.json  # Workflow importável no n8n
├── .env.example                # Template de variáveis de ambiente
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-07-07-confeitaria-cadastro-bolos-design.md
```

---

## Horários de disparo

Padrão: **08:00**, **15:00** e **20:00** (fuso America/Sao_Paulo).

Para alterar, abra o workflow no n8n e edite os nós **Schedule Manha**,
**Schedule Tarde** e **Schedule Noite**.

---

## Troubleshooting

**Containers não sobem:**
```bash
docker compose logs postgres
docker compose logs evolution-api
docker compose logs n8n
```

**Mensagem não chega no WhatsApp:**
- Verifique se a instância Evolution API está com status `Connected`
- Confirme que `WHATSAPP_NUMBER` está no formato correto (sem `+`, sem espaços)

**Dados não salvam no Google Sheets:**
- Confirme que a planilha foi compartilhada com o email da service account
- A aba deve se chamar exatamente `Bolos Disponíveis`
- Verifique os cabeçalhos da linha 1 (devem ser idênticos aos listados no passo 1.1)

**Webhook não funciona em produção:**
- `N8N_WEBHOOK_URL` no `.env` deve ser a URL pública do n8n (ex: `https://n8n.seudominio.com`)
- A Evolution API precisa conseguir acessar essa URL
```

- [ ] **Step 2: Commit final**

```bash
git add README.md
git commit -m "docs: README com guia de setup passo a passo"
```

---

## Self-Review

**Cobertura da spec:**
- ✅ Docker Compose (3 serviços) — Task 2
- ✅ .env.example documentado — Task 2
- ✅ 3 disparos diários configuráveis — Tasks 2 + 4 (Schedule nodes)
- ✅ Fluxo conversacional completo (sim/não → sabor → tamanho → preço → quantidade) — Task 4 (Code node)
- ✅ Estado da conversa em PostgreSQL — Tasks 3 + 4
- ✅ Salvar no Google Sheets — Task 4 (Google Sheets node)
- ✅ Múltiplos bolos por sessão (aguardando_mais loop) — Task 4 (Code node)
- ✅ Mensagens com tom informal — Task 4 (strings no Code node)
- ✅ Remoção completa do projeto anterior — Task 1
- ✅ README passo a passo — Task 5

**Placeholders:** nenhum — todos os steps têm código completo.

**Consistência de tipos:** `nextDados` é sempre `JSON.stringify(objeto)` no Code node e recebido como `$2::jsonb` no PostgreSQL update — consistente.

**Nota sobre credenciais:** os IDs `"id": "1"` e `"id": "2"` nos nós PostgreSQL e Google Sheets são placeholders que o n8n substituirá automaticamente após as credenciais serem criadas. O que importa é o **nome** da credencial coincidir com o que o usuário configurar.
