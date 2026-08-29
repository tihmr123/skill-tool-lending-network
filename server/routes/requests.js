const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create a borrow request for a listing
router.post('/', requireAuth, (req, res) => {
  const { listing_id, message } = req.body;
  if (!listing_id) return res.status(400).json({ error: 'listing_id is required' });

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id === req.user.id) {
    return res.status(400).json({ error: "You can't request your own listing" });
  }
  if (listing.availability !== 'available') {
    return res.status(400).json({ error: 'This listing is not currently available' });
  }

  const info = db
    .prepare('INSERT INTO borrow_requests (listing_id, requester_id, message) VALUES (?, ?, ?)')
    .run(listing_id, req.user.id, message || '');

  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(request);
});

// Requests I've sent
router.get('/sent', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT borrow_requests.*, listings.title AS listing_title, listings.type AS listing_type
       FROM borrow_requests
       JOIN listings ON listings.id = borrow_requests.listing_id
       WHERE borrow_requests.requester_id = ?
       ORDER BY borrow_requests.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Requests received on my listings
router.get('/received', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT borrow_requests.*, listings.title AS listing_title, listings.type AS listing_type,
              users.name AS requester_name
       FROM borrow_requests
       JOIN listings ON listings.id = borrow_requests.listing_id
       JOIN users ON users.id = borrow_requests.requester_id
       WHERE listings.owner_id = ?
       ORDER BY borrow_requests.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Respond to a request (accept / decline / mark returned) - owner of the listing only
router.put('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined', 'returned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const request = db
    .prepare(
      `SELECT borrow_requests.*, listings.owner_id AS listing_owner_id
       FROM borrow_requests JOIN listings ON listings.id = borrow_requests.listing_id
       WHERE borrow_requests.id = ?`
    )
    .get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.listing_owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the listing owner can update this request' });
  }

  db.prepare('UPDATE borrow_requests SET status = ? WHERE id = ?').run(status, req.params.id);

  // Keep listing availability in sync with active borrow status
  if (status === 'accepted') {
    db.prepare('UPDATE listings SET availability = ? WHERE id = ?').run(
      'unavailable',
      request.listing_id
    );
  } else if (status === 'returned' || status === 'declined') {
    db.prepare('UPDATE listings SET availability = ? WHERE id = ?').run(
      'available',
      request.listing_id
    );
  }

  const updated = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;