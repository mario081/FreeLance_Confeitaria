# Design: Landing Page Portfolio — Confeitaria Automation

**Data:** 2026-07-08
**Status:** Aprovado

---

## Contexto

Página estática de portfólio em `confeitaria-mika.me` (GitHub Pages) apresentando o sistema de automação WhatsApp para confeitaria. Público-alvo: recrutadores/desenvolvedores que querem entender o que foi construído tecnicamente.

---

## Arquivos

```
index.html   ← página completa (HTML + CSS + JS inline)
CNAME        ← confeitaria-mika.me
```

---

## Seções (de cima para baixo)

| Seção | Conteúdo |
|---|---|
| Toggle | Botão PT/EN fixo no topo direito |
| Hero | Gradiente rosa→roxo, nome do projeto, tagline, botão GitHub |
| Como funciona | 3 steps em cards: Disparo → Conversa → Planilha |
| Stack técnica | Badge cards coloridos: Evolution API, n8n, PostgreSQL, Docker, Google Sheets |
| Funcionalidades | Lista com ✅: 3 disparos diários, conversa WhatsApp, registro tempo real, zero código para usuário |
| Footer | Link GitHub + crédito |

---

## Visual

- **Gradiente hero:** `#FF6B9D → #C44BCE` (rosa para roxo)
- **Fundo:** branco (`#ffffff`)
- **Cards:** `border-radius: 12px`, `box-shadow: 0 4px 20px rgba(0,0,0,0.08)`
- **Fonte:** Inter (Google Fonts)
- **Responsivo:** mobile-first, grid de 1 coluna em mobile, 3 colunas em desktop

---

## Toggle de idioma

- Botão `[PT | EN]` fixo `position: fixed; top: 1rem; right: 1rem`
- JS vanilla: `document.documentElement.setAttribute('data-lang', lang)`
- Todos os textos duplos via atributos: `<span data-pt="Texto PT" data-en="English text"></span>`
- Script percorre todos os elementos com `data-pt`/`data-en` e exibe o idioma ativo
- Sem reload de página

---

## Textos (PT / EN)

| Elemento | PT | EN |
|---|---|---|
| Tagline | Automação de cadastro de bolos via WhatsApp | Cake inventory automation via WhatsApp |
| Step 1 | Disparo automático 3x/dia | Automatic trigger 3x/day |
| Step 2 | Conversa guiada por WhatsApp | Guided WhatsApp conversation |
| Step 3 | Registro em Google Sheets | Logged to Google Sheets |
| Feat 1 | 3 disparos diários automáticos | 3 daily automated triggers |
| Feat 2 | Conversa natural via WhatsApp | Natural WhatsApp conversation |
| Feat 3 | Registro em tempo real na planilha | Real-time spreadsheet logging |
| Feat 4 | Zero código para a confeiteira | Zero code for the baker |
| Botão GitHub | Ver no GitHub | View on GitHub |

---

## Entregáveis

- `index.html` — página completa
- `CNAME` — `confeitaria-mika.me`
- GitHub Pages habilitado em Settings → Pages → Source: main, / (root)
