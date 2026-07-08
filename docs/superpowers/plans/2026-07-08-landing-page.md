# Landing Page Portfolio — Confeitaria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma landing page estática de portfólio em `confeitaria-mika.me` apresentando o sistema de automação WhatsApp da confeitaria, com toggle PT/EN.

**Architecture:** Página HTML única (`index.html`) com CSS e JS inline, hospedada no GitHub Pages. Toggle de idioma via `data-lang` no `<html>` e atributos `data-pt`/`data-en` em cada elemento de texto. Sem build step, sem dependências locais além da fonte Inter via Google Fonts.

**Tech Stack:** HTML5, CSS3, JavaScript vanilla, GitHub Pages

## Global Constraints

- Zero dependências além de Google Fonts (Inter)
- Nenhum framework, nenhum build step
- Totalmente responsivo (mobile-first)
- Gradiente hero: `#FF6B9D → #C44BCE`
- Fonte: Inter (Google Fonts)
- Link do GitHub: `https://github.com/mario081/FreeLance_Confeitaria`

---

### Task 1: index.html + CNAME + GitHub Pages

**Files:**
- Create: `index.html`
- Create: `CNAME`

**Interfaces:**
- Produces: página acessível em `confeitaria-mika.me` via GitHub Pages

- [ ] **Step 1: Criar CNAME**

Crie o arquivo `CNAME` na raiz com este conteúdo exato (sem espaços, sem quebra de linha extra):

```
confeitaria-mika.me
```

- [ ] **Step 2: Criar index.html**

Crie o arquivo `index.html` na raiz com este conteúdo:

```html
<!DOCTYPE html>
<html lang="pt" data-lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confeitaria Automation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; line-height: 1.6; }

    .lang-toggle {
      position: fixed; top: 1rem; right: 1rem; z-index: 100;
      display: flex; border-radius: 8px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    }
    .lang-toggle button {
      padding: 0.4rem 0.8rem; border: none; cursor: pointer;
      font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600;
      transition: all 0.2s; background: #fff; color: #888;
    }
    .lang-toggle button.active {
      background: linear-gradient(135deg, #FF6B9D, #C44BCE); color: #fff;
    }

    .hero {
      background: linear-gradient(135deg, #FF6B9D 0%, #C44BCE 100%);
      color: #fff; padding: 6rem 1.5rem 5rem; text-align: center;
    }
    .hero .emoji { font-size: 3.5rem; margin-bottom: 1rem; display: block; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 800; margin-bottom: 1rem; }
    .hero p { font-size: 1.15rem; opacity: 0.92; max-width: 520px; margin: 0 auto 2rem; }
    .hero a {
      display: inline-block; background: rgba(255,255,255,0.2); color: #fff;
      text-decoration: none; padding: 0.75rem 2rem; border-radius: 50px;
      font-weight: 600; font-size: 0.95rem;
      border: 2px solid rgba(255,255,255,0.5); transition: all 0.2s;
    }
    .hero a:hover { background: rgba(255,255,255,0.35); }

    section { padding: 5rem 1.5rem; }
    section:nth-child(even) { background: #f9f7ff; }
    .container { max-width: 960px; margin: 0 auto; }
    h2 { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: 2.5rem; color: #1a1a2e; }

    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
    .step-card {
      background: #fff; border-radius: 16px; padding: 2rem 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.07); text-align: center; position: relative;
    }
    .step-card .icon { font-size: 2.5rem; margin-bottom: 1rem; display: block; }
    .step-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: #C44BCE; }
    .step-card p { font-size: 0.9rem; color: #555; }
    .step-num {
      position: absolute; top: -0.7rem; left: 1.2rem;
      background: linear-gradient(135deg, #FF6B9D, #C44BCE);
      color: #fff; width: 1.5rem; height: 1.5rem; border-radius: 50%;
      font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }

    .stack-grid { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
    .stack-badge {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.65rem 1.2rem; border-radius: 50px;
      font-size: 0.9rem; font-weight: 600; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .badge-evolution { background: #fce4ec; color: #880e4f; }
    .badge-n8n       { background: #fff3e0; color: #e65100; }
    .badge-postgres  { background: #e3f2fd; color: #1565c0; }
    .badge-docker    { background: #e1f5fe; color: #0277bd; }
    .badge-sheets    { background: #e8f5e9; color: #1b5e20; }

    .features {
      list-style: none; max-width: 560px; margin: 0 auto; display: grid; gap: 1rem;
    }
    .features li {
      display: flex; align-items: center; gap: 1rem;
      background: #fff; border-radius: 12px; padding: 1rem 1.25rem;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); font-size: 0.95rem; font-weight: 500;
    }
    .features li span.check { font-size: 1.2rem; flex-shrink: 0; }

    footer {
      background: #1a1a2e; color: #aaa;
      text-align: center; padding: 2rem 1.5rem; font-size: 0.875rem;
    }
    footer a { color: #FF6B9D; text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 600px) {
      .hero { padding: 5rem 1.25rem 4rem; }
      h2 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>

  <div class="lang-toggle">
    <button id="btn-pt" class="active" onclick="setLang('pt')">PT</button>
    <button id="btn-en" onclick="setLang('en')">EN</button>
  </div>

  <div class="hero">
    <span class="emoji">🎂</span>
    <h1>Confeitaria Automation</h1>
    <p data-pt="Automação de cadastro de bolos via WhatsApp — sem apps, sem formulários." data-en="Cake inventory automation via WhatsApp — no apps, no forms.">Automação de cadastro de bolos via WhatsApp — sem apps, sem formulários.</p>
    <a href="https://github.com/mario081/FreeLance_Confeitaria" target="_blank" rel="noopener">
      <span data-pt="Ver no GitHub" data-en="View on GitHub">Ver no GitHub</span>
    </a>
  </div>

  <section>
    <div class="container">
      <h2 data-pt="Como funciona" data-en="How it works">Como funciona</h2>
      <div class="steps">
        <div class="step-card">
          <div class="step-num">1</div>
          <span class="icon">📅</span>
          <h3 data-pt="Disparo automático" data-en="Automatic trigger">Disparo automático</h3>
          <p data-pt="3x ao dia o sistema envia uma mensagem no WhatsApp perguntando se há bolo disponível." data-en="3 times a day the system sends a WhatsApp message asking if there are cakes available.">3x ao dia o sistema envia uma mensagem no WhatsApp perguntando se há bolo disponível.</p>
        </div>
        <div class="step-card">
          <div class="step-num">2</div>
          <span class="icon">💬</span>
          <h3 data-pt="Conversa guiada" data-en="Guided conversation">Conversa guiada</h3>
          <p data-pt="Se sim, o sistema coleta sabor, tamanho, preço e quantidade — uma pergunta de cada vez." data-en="If yes, the bot collects flavor, size, price and quantity — one question at a time.">Se sim, o sistema coleta sabor, tamanho, preço e quantidade — uma pergunta de cada vez.</p>
        </div>
        <div class="step-card">
          <div class="step-num">3</div>
          <span class="icon">📊</span>
          <h3 data-pt="Registro instantâneo" data-en="Instant logging">Registro instantâneo</h3>
          <p data-pt="Os dados vão direto para o Google Sheets em tempo real, sem intervenção manual." data-en="Data goes straight to Google Sheets in real time, with no manual intervention.">Os dados vão direto para o Google Sheets em tempo real, sem intervenção manual.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 data-pt="Stack técnica" data-en="Tech stack">Stack técnica</h2>
      <div class="stack-grid">
        <span class="stack-badge badge-evolution">📱 Evolution API</span>
        <span class="stack-badge badge-n8n">⚙️ n8n</span>
        <span class="stack-badge badge-postgres">🐘 PostgreSQL</span>
        <span class="stack-badge badge-docker">🐳 Docker</span>
        <span class="stack-badge badge-sheets">📋 Google Sheets</span>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 data-pt="Funcionalidades" data-en="Features">Funcionalidades</h2>
      <ul class="features">
        <li><span class="check">✅</span><span data-pt="3 disparos diários automáticos (manhã, tarde e noite)" data-en="3 daily automated triggers (morning, afternoon and night)">3 disparos diários automáticos (manhã, tarde e noite)</span></li>
        <li><span class="check">✅</span><span data-pt="Conversa natural via WhatsApp — sem app extra" data-en="Natural WhatsApp conversation — no extra app">Conversa natural via WhatsApp — sem app extra</span></li>
        <li><span class="check">✅</span><span data-pt="Registro em tempo real na planilha Google Sheets" data-en="Real-time logging to Google Sheets">Registro em tempo real na planilha Google Sheets</span></li>
        <li><span class="check">✅</span><span data-pt="Zero código para a confeiteira usar" data-en="Zero code for the baker to operate">Zero código para a confeiteira usar</span></li>
        <li><span class="check">✅</span><span data-pt="Suporte a múltiplos bolos por sessão" data-en="Multiple cakes per session supported">Suporte a múltiplos bolos por sessão</span></li>
        <li><span class="check">✅</span><span data-pt="Estado da conversa salvo em PostgreSQL" data-en="Conversation state saved in PostgreSQL">Estado da conversa salvo em PostgreSQL</span></li>
      </ul>
    </div>
  </section>

  <footer>
    <p>
      <a href="https://github.com/mario081/FreeLance_Confeitaria" target="_blank" rel="noopener">🐙 GitHub</a>
      &nbsp;·&nbsp;
      <span data-pt="Feito por" data-en="Made by">Feito por</span>
      <a href="https://github.com/mario081" target="_blank" rel="noopener">mario081</a>
    </p>
  </footer>

  <script>
    function setLang(lang) {
      document.documentElement.setAttribute('data-lang', lang);
      document.getElementById('btn-pt').classList.toggle('active', lang === 'pt');
      document.getElementById('btn-en').classList.toggle('active', lang === 'en');
      document.querySelectorAll('[data-pt]').forEach(function(el) {
        el.textContent = lang === 'pt' ? el.dataset.pt : el.dataset.en;
      });
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Verificar HTML abre corretamente no browser**

Abra o arquivo diretamente no browser:
```
Abra index.html com duplo clique (ou arraste para o browser)
```

Verificar:
- Gradiente rosa→roxo no hero aparece
- Toggle PT/EN funciona (clica EN → textos mudam, clica PT → voltam)
- 3 cards aparecem em linha no desktop, empilhados no mobile (redimensione a janela)
- Botão "Ver no GitHub" abre o link correto

- [ ] **Step 4: Commit**

```bash
git add index.html CNAME
git commit -m "feat: landing page de portfólio com toggle PT/EN"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

- [ ] **Step 6: Habilitar GitHub Pages (manual — uma única vez)**

No GitHub:
1. Acesse `https://github.com/mario081/FreeLance_Confeitaria/settings/pages`
2. Em **Source**: selecione `Deploy from a branch`
3. Branch: `main` | Folder: `/ (root)`
4. Clique **Save**
5. Aguarde ~2 minutos
6. A URL `https://confeitaria-mika.me` deve estar no ar

> **DNS:** Se o domínio `confeitaria-mika.me` ainda aponta para o repo antigo (`mario081.github.io`), verifique no seu provedor de DNS se os registros CNAME/A apontam para `mario081.github.io` (que o GitHub redireciona automaticamente para o novo repo via CNAME). Não é necessário alterar o DNS.

---

## Self-Review

**Cobertura da spec:**
- ✅ Toggle PT/EN — JS `setLang()` + atributos `data-pt`/`data-en`
- ✅ Hero com gradiente `#FF6B9D → #C44BCE`
- ✅ 3 steps em cards
- ✅ Stack técnica em badges coloridos
- ✅ Lista de funcionalidades com ✅
- ✅ Footer com link GitHub
- ✅ Fonte Inter (Google Fonts)
- ✅ Responsivo (grid `auto-fit`, `clamp` no h1)
- ✅ CNAME `confeitaria-mika.me`

**Placeholders:** nenhum — HTML completo no Step 2.
