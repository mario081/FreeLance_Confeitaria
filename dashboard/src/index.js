const express = require('express');
const path = require('path');
const authRouter = require('./auth');
const bolosRouter = require('./bolos');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', authRouter);
app.use('/api/bolos', bolosRouter);
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
});

if (require.main === module) {
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  const db = require('./db');
  db.query(`
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
    )
  `).then(() => {
    app.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = app;
