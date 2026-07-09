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
