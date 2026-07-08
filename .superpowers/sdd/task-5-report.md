# Task 5 Report: Frontend — Setup Vitest + testes do Login

**Status:** DONE_WITH_CONCERNS

## What was done

1. **Installed dependencies** using WSL Linux npm (not Windows npm — see concern below):
   - vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom

2. **Created `frontend/vitest.config.js`** — separate from vite.config.js, uses jsdom environment, globals: true, setupFiles pointing to test-setup.js.

3. **Created `frontend/src/test-setup.js`** — imports @testing-library/jest-dom.

4. **Updated `frontend/package.json`** — added `"test": "vitest run"` and `"test:watch": "vitest"` scripts.

5. **Created `frontend/src/Login.test.jsx`** — 4 tests covering:
   - Renders username input, password input, and "Entrar" button
   - POSTs to /api/auth/login with typed credentials
   - Calls onLogin(username) on successful login
   - Shows error message on 401

6. **Committed** all 5 files.

## Test Results

```
RUN  v4.1.9 /home/mario081/mario081.github.io/frontend

✓ src/Login.test.jsx (4 tests) 292ms

Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  879ms
```

**4/4 tests pass.**

## Commit

`6e25586 test: setup Vitest e testes do componente Login`

## Concerns / Deviations from Spec

### 1. getByLabelText adaptation (minor)

The task spec uses `getByLabelText('Usuário')` and `getByLabelText('Senha')`. However, `Login.jsx` uses labels as **sibling elements** without `htmlFor`/`id` association:

```jsx
<div>
  <label className="...">Usuário</label>
  <input type="text" ... />
</div>
```

Testing Library's `getByLabelText` requires either:
- `<label htmlFor="id"><input id="id" />` association, or  
- `<label>` directly wrapping the `<input>`

Neither is the case here. The tests were adapted to use:
- `screen.getByRole('textbox')` for the username input (there's only one textbox)
- `container.querySelector('input[type="password"]')` for the password input

The test **intent** is identical — same interactions, same assertions, same 4 scenarios.

### 2. Must run npm in WSL (not Windows)

The project's node_modules must be installed with WSL Linux npm because Vitest uses native bindings (`@rolldown/binding-linux-x64-gnu`). If `npm install` is run from Windows (PowerShell/cmd), it installs Windows binaries that fail when vitest runs under WSL's Linux node.

**To run tests:** always use:
```bash
wsl bash -c "source /home/mario081/.nvm/nvm.sh && cd /home/mario081/mario081.github.io/frontend && npm test"
```

This is a project-wide concern to document: the frontend node_modules must be managed from within WSL.

## Files created/modified

- `frontend/vitest.config.js` (new)
- `frontend/src/test-setup.js` (new)
- `frontend/src/Login.test.jsx` (new)
- `frontend/package.json` (scripts added + devDependencies updated)
- `frontend/package-lock.json` (regenerated with Linux binaries)

---

## Fix Report: Accessibility — htmlFor/id + revert tests to getByLabelText

**Commit:** `9e466a1 fix(a11y): adiciona htmlFor/id nos labels do Login e reverte testes para getByLabelText`

**Status:** DONE

### What was done

The concern documented above (labels not linked to inputs via `htmlFor`/`id`) was resolved:

1. **`frontend/src/Login.jsx`** — Added `id="username"` to the text input and `htmlFor="username"` to its label; added `id="password"` to the password input and `htmlFor="password"` to its label.

2. **`frontend/src/Login.test.jsx`** — Removed the `getUsuarioInput` / `getSenhaInput` helper functions and `container` destructuring from all `render()` calls. All queries now use `screen.getByLabelText('Usuário')` and `screen.getByLabelText('Senha')` as originally intended.

### Test Results

```
RUN  v4.1.9 /home/mario081/mario081.github.io/frontend

✓ src/Login.test.jsx (4 tests) 299ms

Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  1.27s
```

**4/4 tests pass.**
