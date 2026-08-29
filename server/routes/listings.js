const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Browse / search listings (public). Query params: q, type, category
router.get('/', (req, res) => {
  const { q, type, category } = req.query;

  let sql = `
    SELECT listings.*, users.name AS owner_name
    FROM listings
    JOIN users ON users.id = listings.owner_id
    WHERE 1 = 1
  `;
  const params = [];

  if (q) {
    sql += ' AND (listings.title LIKE ? OR listings.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (type) {
    sql += ' AND listings.type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND listings.category = ?';
    params.push(category);
  }

  sql += ' ORDER BY listings.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Get listings owned by the current user (must come before /:id)
router.get('/mine/list', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json(rows);
});

// Get a single listing
router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT listings.*, users.name AS owner_name
       FROM listings JOIN users ON users.id = listings.owner_id
       WHERE listings.id = ?`
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Listing not found' });
  res.json(row);
});

// Create a listing (auth required)
router.post('/', requireAuth, (req, res) => {
  const { type, title, description, category } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: 'Type and title are required' });
  }
  if (!['skill', 'tool'].includes(type)) {
    return res.status(400).json({ error: "Type must be 'skill' or 'tool'" });
  }

  const info = db
    .prepare(
      'INSERT INTO listings (owner_id, type, title, description, category) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.user.id, type, title, description || '', category || '');

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(listing);
});

// Update a listing (owner only)
router.put('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can edit this listing' });
  }

  const { title, description, category, availability } = req.body;
  db.prepare(
    `UPDATE listings SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      availability = COALESCE(?, availability)
     WHERE id = ?`
  ).run(title, description, category, availability, req.params.id);

  const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete a listing (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can delete this listing' });
  }

  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;