require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { authLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const requestsRoutes = require('./routes/requests');
const reviewsRoutes = require('./routes/reviews');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/reviews', reviewsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Unknown API routes return JSON instead of an HTML error page
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Last-resort error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

module.exports = app;