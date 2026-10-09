const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startServer, stopServer, call, TEST_SECRET } = require('./helpers');

describe('auth', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(() => stopServer(ctx.server));

  const register = (body) => call(ctx.base, '/auth/register', { method: 'POST', body });
  const login = (body) => call(ctx.base, '/auth/login', { method: 'POST', body });

  test('registering creates an account and returns a token', async () => {
    const { status, data } = await register({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'lending2026',
    });
    assert.equal(status, 201);
    assert.ok(data.token);
    assert.equal(data.user.email, 'asha@example.com');
  });

  test('rejects weak passwords', async () => {
    for (const password of ['short1', 'abcdefgh', '12345678']) {
      const { status } = await register({
        name: 'Weak',
        email: `weak_${password}@example.com`,
        password,
      });
      assert.equal(status, 400, `password "${password}" should be rejected`);
    }
  });

  test('rejects an invalid email', async () => {
    const { status } = await register({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'lending2026',
    });
    assert.equal(status, 400);
  });

  test('rejects a duplicate email, ignoring case', async () => {
    await register({ name: 'First', email: 'dupe@example.com', password: 'lending2026' });
    const { status } = await register({
      name: 'Second',
      email: 'DUPE@example.com',
      password: 'lending2026',
    });
    assert.equal(status, 409);
  });

  test('logs in with the right password, ignoring email case', async () => {
    await register({ name: 'Login', email: 'login@example.com', password: 'lending2026' });
    const { status, data } = await login({ email: 'LOGIN@example.com', password: 'lending2026' });
    assert.equal(status, 200);
    assert.ok(data.token);
  });

  test('rejects a wrong password', async () => {
    await register({ name: 'Wrong', email: 'wrong@example.com', password: 'lending2026' });
    const { status } = await login({ email: 'wrong@example.com', password: 'notthepassword1' });
    assert.equal(status, 401);
  });

  test('protected routes need a token', async () => {
    const { status } = await call(ctx.base, '/requests/sent');
    assert.equal(status, 401);
  });

  test('a valid token for an account that no longer exists is rejected', async () => {
    const stale = jwt.sign({ id: 99999, name: 'Ghost', email: 'ghost@example.com' }, TEST_SECRET);
    const { status, data } = await call(ctx.base, '/requests/sent', { token: stale });
    assert.equal(status, 401);
    assert.match(data.error, /no longer exists/);
  });
});