process.env.DASHBOARD_SENHA = 'senha_de_teste_123';
process.env.JWT_SECRET = 'segredo_jwt_testes_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.DASHBOARD_API_KEY = 'chave_api_testes_32chars_xxxxxxxx';
process.env.DATABASE_URL = 'postgresql://admin:admin@localhost:5432/confeitaria';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const { requireAuth } = require('../src/auth');
const app = require('../src/index');

// Minimal app to test the requireAuth middleware in isolation
const guardedApp = express();
guardedApp.use(express.json());
guardedApp.get('/protected', requireAuth, (req, res) => res.json({ ok: true }));

describe('POST /api/auth', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth').send({ senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBeDefined();
  });

  it('returns 401 for missing body', async () => {
    const res = await request(app).post('/api/auth').send({});
    expect(res.status).toBe(401);
  });

  it('returns JWT for correct password', async () => {
    const res = await request(app)
      .post('/api/auth')
      .send({ senha: 'senha_de_teste_123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('user');
  });
});

describe('requireAuth middleware', () => {
  it('returns 401 with no credentials', async () => {
    const res = await request(guardedApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid JWT', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('Authorization', 'Bearer token_invalido_xxxx');
    expect(res.status).toBe(401);
  });

  it('passes with valid JWT', async () => {
    const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET);
    const res = await request(guardedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('passes with valid x-api-key', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('x-api-key', 'chave_api_testes_32chars_xxxxxxxx');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 for wrong x-api-key', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('x-api-key', 'chave_errada');
    expect(res.status).toBe(401);
  });
});
