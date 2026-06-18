# Prompt — Workflow n8n Confeitaria Mika

Configure no n8n (instância **mario081.app.n8n.cloud** — n8n **Cloud**) o workflow de automação da Confeitaria Mika.

> **IMPORTANTE — n8n Cloud vs Docker**
> O n8n Cloud **não** alcança URLs internas Docker (`http://backend:3000`).
> Use sempre URL **pública** acessível na internet, ex.: `https://api.confeitaria-mika.me/pedidos`.
> A URL `http://backend:3000/pedidos` só vale se o n8n rodar no **mesmo** docker-compose.prod.yml da VPS.

## Contexto

Leia neste repositório: README.md, backend/src/pedidos/, backend/src/pedidos/dto.ts e docker-compose.prod.yml.

Sistema de gestão de pedidos para confeitaria artesanal. Fluxo alvo:

WhatsApp → Evolution API → n8n → POST /pedidos (backend NestJS) → backend gera tarefas com agendamento reverso → frontend exibe dashboard do dia.

## O que criar no n8n

1. Workflow principal: **Confeitaria Mika - Pedido WhatsApp → API**
2. Trigger: Evolution API (mensagens recebidas no WhatsApp)
   - Se precisar de credenciais/URL da Evolution API, PERGUNTE antes de continuar
3. Node de parsing: extrair da mensagem do cliente:
   - `nomeCliente` (string, 2–120 chars)
   - `saborBolo` (string, 2–120 chars)
   - `dataEntrega` (formato ISO date `YYYY-MM-DD`, deve ser data FUTURA)
   - `possui_personalizados` (boolean)
4. Node HTTP Request → POST para criar pedido:
   - Method: `POST`
   - URL produção (Docker interno): `http://backend:3000/pedidos`
   - URL externa (se aplicável): `https://api.confeitaria-mika.me/pedidos`
   - Headers:
     - `Content-Type: application/json`
     - `x-api-key`: [PERGUNTE o valor de BACKEND_API_KEY — não invente]
   - Body JSON:
     ```json
     {
       "nomeCliente": "...",
       "saborBolo": "...",
       "dataEntrega": "2026-06-20",
       "possui_personalizados": true
     }
     ```
5. Tratamento de erros:
   - Se API retornar 400/401/500, registrar erro e (opcional) responder no WhatsApp que o pedido falhou
   - Se sucesso (201/200), confirmar ao cliente no WhatsApp com resumo do pedido e data de entrega
6. NÃO ativar/publicar o workflow em produção sem confirmação explícita do usuário

## Regras de negócio (backend já faz isso — n8n só envia o pedido)

Ao receber POST /pedidos, o backend cria automaticamente estas tarefas:

| Data | Tarefa |
|------|--------|
| Entrega − 1 dia | Montagem e Decoração |
| Entrega − 2 dias | Preparação de Recheios |
| Entrega − 3 dias | Produção das Massas |
| Entrega − 4 dias | Iniciar Confecção de Personalizados *(somente se `possui_personalizados: true`)* |

## Autenticação da API

- `POST /pedidos` usa ApiKeyGuard (header `x-api-key`) — é o que o n8n deve usar
- Rotas GET/PATCH usam JWT — o n8n NÃO precisa delas neste workflow

## Formato sugerido da mensagem WhatsApp (para o parser)

Exemplo que o cliente pode enviar:

```
Pedido Confeitaria Mika
Nome: Maria Silva
Sabor: Chocolate com morango
Entrega: 20/06/2026
Personalizados: sim
```

Adapte o parser para aceitar variações (sim/não, true/false, com/sem personalizados).

## Credenciais — ordem sugerida (pergunte ao usuário; não invente)

1. **URL da API** (n8n Cloud → URL pública obrigatória)
2. **BACKEND_API_KEY** (header `x-api-key`)
3. Evolution API — só para o workflow WhatsApp (pode pular no workflow de teste)

### Valores de referência (dev local — substituir pelos reais do usuário)

| Campo | Exemplo dev |
|-------|-------------|
| URL API | `https://api.confeitaria-mika.me/pedidos` *(prod)* ou tunnel/ngrok se backend local |
| BACKEND_API_KEY | valor de `backend/.env` → `dev-api-key-local` *(exemplo do .env.example)* |

## Entregáveis

1. **Primeiro:** workflow de teste (Manual/Webhook) — POST /pedidos com body fixo
2. **Depois:** workflow WhatsApp → Evolution API → API (só se credenciais Evolution forem informadas)
3. Criar via MCP n8n
3. Listar nodes configurados e URLs usadas
4. Explicar como testar (mensagem de exemplo + como ver execução no n8n)
5. NÃO executar workflow destrutivo em produção sem confirmação explícita

Use as ferramentas MCP do n8n (Search Workflows, criar/editar workflow, etc.). Se já existir workflow similar, mostre e pergunte se deve atualizar ou criar novo.
