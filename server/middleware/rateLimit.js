const rateLimit = require('express-rate-limit');

// Limits repeated login/register attempts from one IP (slows down password guessing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

module.exports = { authLimiter };