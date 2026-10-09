// These must be set before the app loads: tests use an in-memory database
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const app = require('../app');

const TEST_SECRET = 'test-secret';

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}/api` });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
}

async function call(base, path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let counter = 0;

async function newUser(base, name = 'Tester') {
  counter += 1;
  const email = `user${counter}_${Date.now()}@example.com`;
  const { status, data } = await call(base, '/auth/register', {
    method: 'POST',
    body: { name, email, password: 'lending2026' },
  });
  if (!data.token) throw new Error(`Test setup failed: register returned ${status}`);
  return { token: data.token, id: data.user.id, email, name };
}

async function newListing(base, token, overrides = {}) {
  const { status, data } = await call(base, '/listings', {
    method: 'POST',
    token,
    body: {
      type: 'tool',
      title: 'Electric drill',
      category: 'Tools',
      area: 'Riverside',
      description: 'Works fine',
      deposit_amount: 500,
      ...overrides,
    },
  });
  if (!data.id) throw new Error(`Test setup failed: create listing returned ${status}`);
  return data;
}

module.exports = { startServer, stopServer, call, newUser, newListing, TEST_SECRET };