# Confeitaria — Cadastro Automático de Bolos via WhatsApp

Sistema que envia mensagens automáticas para a confeiteira 3x/dia via WhatsApp
e registra os bolos disponíveis em uma planilha Google Sheets.

---

## Pré-requisitos

- Docker Desktop instalado e rodando
- Conta Google com acesso ao Google Sheets
- Número WhatsApp para conectar na Evolution API

---

## 1. Configurar Google Sheets

### 1.1 Criar a planilha

1. Acesse [Google Sheets](https://sheets.google.com) e crie uma nova planilha
2. Renomeie a aba para **Bolos Disponíveis**
3. Adicione os cabeçalhos na linha 1 (uma coluna por célula):

```
A1: Data  |  B1: Horário  |  C1: Sabor  |  D1: Tamanho  |  E1: Preço  |  F1: Quantidade  |  G1: Status
```

4. Copie o **ID da planilha** da URL:
   `https://docs.google.com/spreadsheets/d/**ESTE_ID**/edit`

### 1.2 Criar Service Account (Google Cloud)

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie ou selecione um projeto
3. Ative a API: **APIs & Services → Library → Google Sheets API → Enable**
4. Crie credenciais: **APIs & Services → Credentials → Create Credentials → Service Account**
5. Após criar, clique na service account → **Keys → Add Key → JSON**
6. Salve o arquivo JSON baixado (você vai precisar no passo 5)
7. Anote o email da service account (formato: `nome@projeto.iam.gserviceaccount.com`)

### 1.3 Compartilhar a planilha

Na planilha Google Sheets: **Compartilhar → cole o email da service account → Editor → Confirmar**

---

## 2. Configurar .env

```bash
cp .env.example .env
```

Edite `.env` e preencha todos os campos:

| Variável | Descrição |
|---|---|
| `POSTGRES_PASSWORD` | Senha do banco (invente uma senha segura) |
| `EVOLUTION_API_KEY` | Chave da Evolution API (invente, mínimo 32 caracteres) |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp (ex: `confeitaria`) |
| `WHATSAPP_NUMBER` | Número da confeiteira (ex: `5511999999999`) |
| `N8N_PASSWORD` | Senha do painel n8n (invente uma senha segura) |
| `GOOGLE_SHEETS_ID` | ID da planilha do passo 1.1 |

---

## 3. Subir os containers

```bash
docker compose up -d
```

Aguarde ~30 segundos e verifique:

```bash
docker compose ps
```

Esperado: 3 containers com status `Up` ou `healthy`.

---

## 4. Conectar WhatsApp na Evolution API

1. Acesse `http://localhost:8080`
2. Faça login com a `EVOLUTION_API_KEY` do seu `.env` (como Bearer token ou apikey header)
3. Crie uma instância: **New Instance**
   - Instance Name: mesmo valor de `EVOLUTION_INSTANCE_NAME` no `.env`
4. Clique em **Connect** → aparece um QR Code
5. No WhatsApp da confeiteira: **Configurações → Aparelhos conectados → Conectar aparelho**
6. Escaneie o QR Code
7. Aguarde o status mudar para **Connected**

---

## 5. Configurar credenciais no n8n

1. Acesse `http://localhost:5678`
2. Login: usuário `admin`, senha do `N8N_PASSWORD` do `.env`
3. Vá em **Credentials → Add Credential**

**Credencial 1 — PostgreSQL:**
- Tipo: **Postgres**
- Host: `postgres` | Port: `5432` | Database: `confeitaria`
- User e Password: mesmos valores do `.env`
- Nome: `PostgreSQL Confeitaria`
- Clique em **Test connection** (deve aparecer "Connection tested successfully")

**Credencial 2 — Google Sheets:**
- Tipo: **Google Sheets OAuth2 API**
- Selecione **Service Account** e cole o conteúdo do arquivo JSON baixado no passo 1.2
- Nome: `Google Sheets Confeitaria`

---

## 6. Importar o workflow no n8n

1. No n8n: **Workflows → Import from File**
2. Selecione o arquivo `n8n-whatsapp-workflow.json`
3. Se algum nó mostrar aviso de credencial, clique nele e selecione a credencial correta
4. **Ative o workflow** (toggle no canto superior direito)

---

## 7. Configurar webhook na Evolution API

O n8n precisa receber as respostas da confeiteira. No painel da Evolution API:

1. Selecione a instância criada
2. Vá em **Webhooks** ou **Settings → Webhooks**
3. Configure:
   - **URL:** `http://n8n:5678/webhook/whatsapp-webhook`
   - **Events:** marque `MESSAGES_UPSERT`
4. Salvar

> **Em produção:** substitua `http://n8n:5678` pela URL pública do seu servidor
> e atualize `N8N_WEBHOOK_URL` no `.env`.

---

## 8. Testar

### Teste do disparo manual

No n8n, abra o workflow e clique em **Execute** no nó **Schedule Manha**.
A confeiteira deve receber "Oi! 😊 Tem bolo disponível hoje?" no WhatsApp.

### Teste da conversa completa

Responda "sim" → siga as perguntas → ao final verifique a planilha Google Sheets.
Uma nova linha deve aparecer com os dados do bolo.

---

## Estrutura do projeto

```
.
├── docker-compose.yml          # 3 serviços: postgres, evolution-api, n8n
├── init.sh                     # Cria tabelas e bancos no PostgreSQL
├���─ n8n-whatsapp-workflow.json  # Workflow importável no n8n
├── .env.example                # Template de variáveis de ambiente
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-07-07-confeitaria-cadastro-bolos-design.md
        └── plans/
            └── 2026-07-07-confeitaria-cadastro-bolos.md
```

---

## Horários de disparo

Padrão: **08:00**, **15:00** e **20:00** (fuso America/Sao_Paulo).

Para alterar, abra o workflow no n8n e edite os nós
**Schedule Manha**, **Schedule Tarde** e **Schedule Noite**.

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
- Verifique os logs: `docker compose logs evolution-api`

**Webhook não recebe mensagens:**
- A Evolution API precisa conseguir acessar a URL do n8n
- Dentro do Docker, use `http://n8n:5678` (não `localhost`)
- Teste a URL: `curl -X POST http://n8n:5678/webhook/whatsapp-webhook -H 'Content-Type: application/json' -d '{}'`

**Dados não salvam no Google Sheets:**
- Confirme que a planilha foi compartilhada com o email da service account
- A aba deve se chamar exatamente `Bolos Disponíveis`
- Verifique os cabeçalhos da linha 1 (devem ser idênticos ao listado no passo 1.1)

**Reiniciar do zero (apagar dados):**
```bash
docker compose down -v   # Remove containers E volumes (apaga todos os dados)
docker compose up -d
```
