const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { POSTGRES_USER = 'admin', POSTGRES_PASSWORD, POSTGRES_DB = 'confeitaria' } = process.env;
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}`;
process.env.DASHBOARD_SENHA = 'senha_de_teste_123';
process.env.JWT_SECRET = 'segredo_jwt_testes_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.DASHBOARD_API_KEY = 'chave_api_testes_32chars_xxxxxxxx';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const db = require('../src/db');

const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET);
const jwtAuth = { Authorization: `Bearer ${token}` };
const apiKeyAuth = { 'x-api-key': 'chave_api_testes_32chars_xxxxxxxx' };

beforeAll(async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bolos (
      id SERIAL PRIMARY KEY,
      sabor TEXT NOT NULL,
      tamanho TEXT NOT NULL,
      preco DECIMAL(10,2) NOT NULL,
      quantidade INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'disponivel',
      origem TEXT NOT NULL DEFAULT 'manual',
      disparo TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
});

beforeEach(async () => {
  await db.query('DELETE FROM bolos');
});

afterAll(async () => {
  await db.end();
});

describe('GET /api/bolos', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/bolos');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no bolos', async () => {
    const res = await request(app).get('/api/bolos').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all bolos ordered by criado_em desc', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      ['Chocolate', 'M', 45.00, 2, 'Morango', 'P', 30.00, 1]
    );
    const res = await request(app).get('/api/bolos').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by status=disponivel', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade, status)
       VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)`,
      ['Morango', 'P', 30, 1, 'disponivel', 'Limão', 'G', 60, 1, 'vendido']
    );
    const res = await request(app).get('/api/bolos?status=disponivel').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sabor).toBe('Morango');
  });

  it('filters by data=hoje', async () => {
    await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4)`,
      ['Hoje', 'M', 45, 1]
    );
    const res = await request(app).get('/api/bolos?data=hoje').set(jwtAuth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/bolos', () => {
  it('creates a bolo with JWT auth', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(jwtAuth)
      .send({ sabor: 'Morango', tamanho: 'P', preco: 30, quantidade: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.sabor).toBe('Morango');
    expect(res.body.status).toBe('disponivel');
    expect(res.body.origem).toBe('manual');
  });

  it('creates a bolo with x-api-key (n8n flow)', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(apiKeyAuth)
      .send({ sabor: 'Chocolate', tamanho: 'M', preco: 45, quantidade: 2, origem: 'whatsapp', disparo: 'manha' });
    expect(res.status).toBe(201);
    expect(res.body.origem).toBe('whatsapp');
    expect(res.body.disparo).toBe('manha');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/bolos')
      .set(jwtAuth)
      .send({ sabor: 'Morango' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
  });
});

describe('PUT /api/bolos/:id', () => {
  it('updates status', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Chocolate', 'M', 45, 2]
    );
    const id = rows[0].id;
    const res = await request(app)
      .put(`/api/bolos/${id}`)
      .set(jwtAuth)
      .send({ status: 'vendido' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('vendido');
    expect(res.body.sabor).toBe('Chocolate');
  });

  it('updates multiple fields', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Baunilha', 'P', 25, 1]
    );
    const id = rows[0].id;
    const res = await request(app)
      .put(`/api/bolos/${id}`)
      .set(jwtAuth)
      .send({ sabor: 'Baunilha com coco', preco: 30 });
    expect(res.status).toBe(200);
    expect(res.body.sabor).toBe('Baunilha com coco');
    expect(Number(res.body.preco)).toBe(30);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/bolos/99999')
      .set(jwtAuth)
      .send({ status: 'vendido' });
    expect(res.status).toBe(404);
  });

  it('updates origem', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade, origem) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['Baunilha', 'P', 25, 1, 'whatsapp']
    );
    const id = rows[0].id;
    const res = await request(app)
      .put(`/api/bolos/${id}`)
      .set(jwtAuth)
      .send({ origem: 'manual' });
    expect(res.status).toBe(200);
    expect(res.body.origem).toBe('manual');
  });
});

describe('DELETE /api/bolos/:id', () => {
  it('deletes a bolo and returns 204', async () => {
    const { rows } = await db.query(
      `INSERT INTO bolos (sabor, tamanho, preco, quantidade) VALUES ($1,$2,$3,$4) RETURNING id`,
      ['Limão', 'P', 25, 1]
    );
    const id = rows[0].id;
    const res = await request(app).delete(`/api/bolos/${id}`).set(jwtAuth);
    expect(res.status).toBe(204);
    const { rows: check } = await db.query('SELECT id FROM bolos WHERE id = $1', [id]);
    expect(check).toHaveLength(0);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/bolos/99999').set(jwtAuth);
    expect(res.status).toBe(404);
  });
});
