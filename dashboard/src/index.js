const express = require('express');
const path = require('path');
const authRouter = require('./auth');
const bolosRouter = require('./bolos');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', authRouter);
app.use('/api/bolos', bolosRouter);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  app.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
}

module.exports = app;
