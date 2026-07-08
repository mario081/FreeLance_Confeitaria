# Design: Sistema de Cadastro Automático de Bolos — Confeitaria

**Data:** 2026-07-07
**Status:** Aprovado

---

## Contexto

Substituição completa do projeto anterior (NestJS + React + PostgreSQL + dashboard de tarefas de produção) por um sistema mais simples: disparo automático via WhatsApp 3x/dia para a confeiteira, coleta conversacional de dados de bolos disponíveis e registro em Google Sheets.

Não há sistema web, não há cadastro de clientes, não há pagamento. O Google Sheets é o painel.

---

## Arquitetura

```
Cron (n8n, 3x/dia)
        │
        ▼
Evolution API ──► WhatsApp da confeiteira
                          │
                          │ (resposta)
                          ▼
               Webhook n8n recebe mensagem
                          │
                          ▼
               PostgreSQL: lê estado atual
                          │
              ┌───────────┴────────────┐
              │                        │
        aguardando_inicial        pergunta_*
              │                        │
        checa sim/não         envia próxima pergunta
              │               ou salva resposta
              │ (quando completo)
              ▼
        Google Sheets API
        (insere nova linha)
```

### Stack

| Componente     | Tecnologia              |
|----------------|-------------------------|
| Orquestração   | n8n                     |
| WhatsApp       | Evolution API           |
| Persistência   | PostgreSQL 16           |
| Painel         | Google Sheets           |
| Infra          | Docker Compose          |

### Containers (3 no total)

| Serviço       | Porta  | Função                              |
|---------------|--------|-------------------------------------|
| postgres      | 5432   | Estado da conversa + log de erros   |
| evolution-api | 8080   | Gateway WhatsApp REST               |
| n8n           | 5678   | Orquestrador do fluxo               |

---

## Banco de Dados

### Tabela `conversa_estado`

| Coluna          | Tipo      | Descrição                                      |
|-----------------|-----------|------------------------------------------------|
| numero          | TEXT (PK) | Número da confeiteira                          |
| estado          | TEXT      | Estado atual da conversa (ver abaixo)          |
| dados           | JSONB     | Respostas parciais acumuladas                  |
| disparo         | TEXT      | `manha`, `tarde` ou `noite`                    |
| atualizado_em   | TIMESTAMP | Última atualização                             |

### Estados possíveis

```
aguardando_inicial → pergunta_sabor → pergunta_tamanho → pergunta_preco → pergunta_quantidade → aguardando_mais → encerrado
                                                                                                       └──► pergunta_sabor (loop para bolo adicional)
```

### Tabela `erros_log`

| Coluna      | Tipo      | Descrição                        |
|-------------|-----------|----------------------------------|
| id          | SERIAL PK |                                  |
| numero      | TEXT      | Número da conversa               |
| erro        | TEXT      | Descrição do erro                |
| dados       | JSONB     | Dados que não foram salvos       |
| criado_em   | TIMESTAMP |                                  |

---

## Fluxo n8n

### Entrada 1 — Cron (3 triggers separados)

```
[Schedule Trigger: manhã]  ──┐
[Schedule Trigger: tarde]  ──┼──► [Upsert estado no PostgreSQL: aguardando_inicial]
[Schedule Trigger: noite]  ──┘         │
                                        ▼
                               [HTTP: Evolution API]
                               POST /message/sendText
                               "Oi! 😊 Tem bolo disponível hoje?"
```

### Entrada 2 — Webhook (resposta da confeiteira)

```
[Webhook: POST /whatsapp-webhook]
          │
          ▼
[Extrair numero + mensagem do body]
          │
          ▼
[PostgreSQL: SELECT * FROM conversa_estado WHERE numero = ?]
          │
    ┌─────┴──────────────────────────────────────────┐
    │                                                 │
aguardando_inicial                             pergunta_sabor
    │                                                 │
[Switch: sim/tenho/tem → pergunta_sabor]      [UPDATE dados.sabor]
[Switch: não/nao/sem  → agradece + encerra]   [UPDATE estado = pergunta_tamanho]
                                              [Enviar: "Qual o tamanho? (pequeno, médio ou grande)"]
                                                       │
                                               pergunta_tamanho
                                                       │
                                              [UPDATE dados.tamanho]
                                              [UPDATE estado = pergunta_preco]
                                              [Enviar: "Qual o preço?"]
                                                       │
                                               pergunta_preco
                                                       │
                                              [UPDATE dados.preco]
                                              [UPDATE estado = pergunta_quantidade]
                                              [Enviar: "Quantos você tem disponível?"]
                                                       │
                                               pergunta_quantidade
                                                       │
                                              [UPDATE dados.quantidade]
                                              [Google Sheets: append row]
                                              [UPDATE estado = finalizado]
                                              [Enviar: "Tudo anotado! ✅ Já coloquei na planilha."]
                                              [Enviar: "Tem mais algum bolo? 🎂"]
                                              [UPDATE estado = aguardando_mais]

                                          aguardando_mais
                                                  │
                                    ┌─────────────┴────────────┐
                                    │                          │
                                  sim                         não
                                    │                          │
                            [estado = pergunta_sabor]  [Enviar: "Tudo bem! Qualquer"]
                            [Enviar: "Qual o sabor?"]  ["coisa me avisa. 😊"]
                                                       [estado = encerrado]
```

### Tratamento de erros

- **Evolution API não responde:** n8n loga e encerra silenciosamente (sem retry).
- **Google Sheets falha:** n8n tenta 1x novamente. Se falhar, salva em `erros_log` e avisa a confeiteira via WhatsApp: "Ops! Não consegui salvar na planilha agora. Vou tentar guardar aqui. 🙏".
- **Resposta não reconhecida:** n8n repete a pergunta atual uma vez. Na segunda tentativa inválida encerra: "Não entendi, tudo bem! Me chama quando quiser cadastrar. 😊".

---

## Google Sheets

### Aba: "Bolos Disponíveis"

| Data | Horário | Sabor | Tamanho | Preço | Quantidade | Status |
|------|---------|-------|---------|-------|------------|--------|
| 07/07/2026 | manhã | chocolate | médio | R$50 | 2 | Disponível |

- Cada cadastro completo = uma nova linha.
- Múltiplos bolos no mesmo disparo = múltiplas linhas (mesmo Data/Horário).
- Coluna Status sempre inicia como "Disponível" (pode ser editada manualmente).

---

## Mensagens da IA

| Momento                      | Mensagem                                                            |
|------------------------------|---------------------------------------------------------------------|
| Disparo inicial              | "Oi! 😊 Tem bolo disponível hoje?"                                  |
| Se sim                       | "Que legal! Qual o sabor?"                                          |
| Após sabor                   | "Hmm, delícia! Qual o tamanho? (pequeno, médio ou grande)"          |
| Após tamanho                 | "Qual o preço desse bolo?"                                          |
| Após preço                   | "E quantos você tem disponível?"                                    |
| Finalização                  | "Tudo anotado! ✅ Já coloquei na planilha. Tem mais algum bolo? 🎂" |
| Mais um bolo (sim)           | "Qual o sabor?"                                                     |
| Encerramento                 | "Tudo bem! Qualquer coisa me avisa. 😊"                             |
| Resposta inválida (1ª vez)   | Repete a pergunta atual                                             |
| Resposta inválida (2ª vez)   | "Não entendi, tudo bem! Me chama quando quiser cadastrar. 😊"       |
| Erro ao salvar               | "Ops! Não consegui salvar na planilha agora. Vou tentar guardar aqui. 🙏" |

---

## Variáveis de Ambiente (.env)

```
# PostgreSQL
POSTGRES_USER=admin
POSTGRES_PASSWORD=senha_segura
POSTGRES_DB=confeitaria

# Evolution API
EVOLUTION_API_KEY=chave_aqui
EVOLUTION_INSTANCE_NAME=confeitaria

# WhatsApp
WHATSAPP_NUMBER=5511999999999   # número da confeiteira com código do país

# Google Sheets
GOOGLE_SHEETS_ID=id_da_planilha
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Horários de disparo (cron)
CRON_MANHA=0 8 * * *
CRON_TARDE=0 15 * * *
CRON_NOITE=0 20 * * *
```

---

## Entregáveis

### Arquivos criados/substituídos

```
projeto/
├── docker-compose.yml          ← novo (3 serviços)
├── .env.example                ← novo (variáveis documentadas)
├── init.sql                    ← novo (cria tabelas conversa_estado + erros_log)
├── n8n-whatsapp-workflow.json  ← novo (workflow completo)
├── README.md                   ← novo (guia de setup passo a passo)
└── docs/superpowers/specs/
    └── 2026-07-07-confeitaria-cadastro-bolos-design.md
```

### Arquivos removidos

```
backend/              ← NestJS removido
frontend/             ← React removido
docker-compose.prod.yml
.env.local.example
fix_workflow.js
package.json (raiz)
package-lock.json (raiz)
node_modules/ (raiz)
prompt.md
qr-whatsapp.png
CNAME
```

---

## README — Seções

1. Pré-requisitos (Docker + conta Google)
2. Criar e configurar Google Sheets (planilha + service account + compartilhar)
3. Configurar `.env` com todas as variáveis
4. `docker-compose up -d` e verificar serviços
5. Conectar WhatsApp (QR code na UI da Evolution API)
6. Importar workflow no n8n
7. Configurar webhook na Evolution API → URL do n8n
8. Testar manualmente (enviar mensagem de teste)
