const jwt = require('jsonwebtoken');
const db = require('../db');

const PLACEHOLDER = 'change-this-to-a-long-random-string';
const secret = process.env.JWT_SECRET;
const insecure = !secret || secret === PLACEHOLDER;

if (insecure && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set to a real secret in production');
}
if (insecure && process.env.NODE_ENV !== 'test') {
  console.warn('Warning: using an insecure JWT_SECRET. Set a real one in server/.env');
}

const JWT_SECRET = secret || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // The token can be valid for an account that no longer exists (e.g. after a DB reset)
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists. Please log in again.' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth, JWT_SECRET };