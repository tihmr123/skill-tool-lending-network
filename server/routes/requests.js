const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create a borrow request
router.post('/', requireAuth, (req, res) => {
    const { listing_id } = req.body;
  const message = String(req.body.message || '').trim();
  if (message.length > 500) {
    return res.status(400).json({ error: 'Message is too long (max 500)' });
  }
  if (!listing_id) return res.status(400).json({ error: 'listing_id is required' });

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id === req.user.id) {
    return res.status(400).json({ error: "You can't request your own listing" });
  }
  if (listing.availability !== 'available') {
    return res.status(400).json({ error: 'This listing is not currently available' });
  }

  const existing = db
    .prepare(
      `SELECT id FROM borrow_requests
       WHERE listing_id = ? AND requester_id = ? AND status IN ('pending', 'accepted')`
    )
    .get(listing_id, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'You already have an active request for this listing' });
  }

  const info = db
    .prepare('INSERT INTO borrow_requests (listing_id, requester_id, message) VALUES (?, ?, ?)')
    .run(listing_id, req.user.id, message || '');

  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(request);
});

// Requests I've sent (owner email only visible once accepted)
router.get('/sent', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT br.*, l.title AS listing_title, l.type AS listing_type, l.deposit_amount,
              u.name AS owner_name,
              CASE WHEN br.status IN ('accepted', 'returned') THEN u.email END AS owner_email,
              EXISTS(SELECT 1 FROM reviews r WHERE r.request_id = br.id) AS reviewed
       FROM borrow_requests br
       JOIN listings l ON l.id = br.listing_id
       JOIN users u ON u.id = l.owner_id
       WHERE br.requester_id = ?
       ORDER BY br.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Requests received on my listings (requester email only visible once accepted)
router.get('/received', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT br.*, l.title AS listing_title, l.type AS listing_type, l.deposit_amount,
              u.name AS requester_name,
              CASE WHEN br.status IN ('accepted', 'returned') THEN u.email END AS requester_email
       FROM borrow_requests br
       JOIN listings l ON l.id = br.listing_id
       JOIN users u ON u.id = br.requester_id
       WHERE l.owner_id = ?
       ORDER BY br.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Owner responds: accept / decline / mark returned (or completed, for skills)
router.put('/:id', requireAuth, (req, res) => {
  const { status, damage_notes } = req.body;
  if (!['accepted', 'declined', 'returned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const request = db
    .prepare(
      `SELECT br.*, l.owner_id AS listing_owner_id, l.type AS listing_type,
              l.availability AS listing_availability
       FROM borrow_requests br
       JOIN listings l ON l.id = br.listing_id
       WHERE br.id = ?`
    )
    .get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.listing_owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the listing owner can update this request' });
  }

  // Allowed transitions: pending -> accepted/declined, accepted -> returned
  const allowed = { pending: ['accepted', 'declined'], accepted: ['returned'] };
  if (!(allowed[request.status] || []).includes(status)) {
    return res
      .status(400)
      .json({ error: `A ${request.status} request can't be changed to ${status}` });
  }

  if (status === 'accepted' && request.listing_availability !== 'available') {
    return res.status(400).json({
      error: 'This listing is currently unavailable. Mark it available before accepting.',
    });
  }

    const isTool = request.listing_type === 'tool';
  const notes = status === 'returned' && damage_notes ? String(damage_notes).trim() : null;
  if (notes && notes.length > 300) {
    return res.status(400).json({ error: 'Condition notes are too long (max 300)' });
  }

  const apply = db.transaction(() => {
    db.prepare('UPDATE borrow_requests SET status = ?, damage_notes = ? WHERE id = ?').run(
      status,
      notes,
      request.id
    );

    // Only tools are physically lent out. Skills stay open for other learners.
    if (isTool && status === 'accepted') {
      db.prepare('UPDATE listings SET availability = ? WHERE id = ?').run(
        'unavailable',
        request.listing_id
      );
      db.prepare(
        `UPDATE borrow_requests SET status = 'declined'
         WHERE listing_id = ? AND status = 'pending' AND id != ?`
      ).run(request.listing_id, request.id);
    } else if (isTool && status === 'returned') {
      db.prepare('UPDATE listings SET availability = ? WHERE id = ?').run(
        'available',
        request.listing_id
      );
    }
    // Declining never touches availability.
  });
  apply();

  const updated = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(request.id);
  res.json(updated);
});

// Requester cancels their own pending request
router.delete('/:id', requireAuth, (req, res) => {
  const request = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only cancel your own requests' });
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending requests can be cancelled' });
  }

  db.prepare('DELETE FROM borrow_requests WHERE id = ?').run(request.id);
  res.json({ success: true });
});

module.exports = router;