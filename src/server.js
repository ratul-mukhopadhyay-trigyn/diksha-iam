require('dotenv').config();
const express = require('express');
const otpRoutes = require('./routes/otp.routes');
const ssoRoutes = require('./routes/sso.routes');
const usersRoutes = require('./routes/users.routes');
const { connect, shutdown } = require('./db/cassandra');
const { HttpError } = require('./services/sso.service');

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/', otpRoutes);
app.use('/', ssoRoutes);
app.use('/', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof HttpError ? err.message : 'Internal server error.';
  if (!(err instanceof HttpError)) {
    console.error(err);
  }

  res.set({
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
  });

  res.status(statusCode).json({ error: message });
});

async function start() {
  await connect();
  app.listen(port, () => {
    console.log(`SSO API listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
