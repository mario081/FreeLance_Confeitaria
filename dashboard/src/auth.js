const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/', (req, res) => {
  const { senha } = req.body || {};
  if (!senha || senha !== process.env.DASHBOARD_SENHA) {
    return res.status(401).json({ erro: 'Senha incorrecta' });
  }
  const token = jwt.sign({ role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.DASHBOARD_API_KEY) return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
