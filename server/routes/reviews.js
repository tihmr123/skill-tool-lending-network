const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Leave a review. Only the requester, only after the request is marked returned,
// and only once per request.
router.post('/', requireAuth, (req, res) => {
  const { request_id } = req.body;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();

  if (!request_id) return res.status(400).json({ error: 'request_id is required' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  }
  if (comment.length > 500) {
    return res.status(400).json({ error: 'Comment is too long (max 500)' });
  }

  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(request_id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only review your own requests' });
  }
  if (request.status !== 'returned') {
    return res.status(400).json({ error: 'You can review once the request is marked returned' });
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE request_id = ?').get(request.id);
  if (existing) return res.status(409).json({ error: 'You already reviewed this request' });

  const info = db
    .prepare(
      `INSERT INTO reviews (request_id, listing_id, reviewer_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(request.id, request.listing_id, req.user.id, rating, comment);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(review);
});

// All reviews for a listing (public)
router.get('/listing/:listingId', (req, res) => {
  const rows = db
    .prepare(
      `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at,
              users.name AS reviewer_name
       FROM reviews
       JOIN users ON users.id = reviews.reviewer_id
       WHERE reviews.listing_id = ?
       ORDER BY reviews.created_at DESC`
    )
    .all(req.params.listingId);
  res.json(rows);
});

module.exports = router;