const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const RATING_COLUMNS = `
  (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE reviews.listing_id = listings.id) AS avg_rating,
  (SELECT COUNT(*) FROM reviews WHERE reviews.listing_id = listings.id) AS review_count
`;

// Returns a non-negative integer, 0 for empty input, or null if invalid
function cleanDeposit(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

// Browse / search listings (public). Query params: q, type, category, area
router.get('/', (req, res) => {
  const { q, type, category, area } = req.query;

  let sql = `
    SELECT listings.*, users.name AS owner_name, ${RATING_COLUMNS}
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
    sql += ' AND LOWER(listings.category) = LOWER(?)';
    params.push(category);
  }
  if (area) {
    sql += ' AND LOWER(listings.area) = LOWER(?)';
    params.push(area);
  }

  sql += ' ORDER BY listings.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Distinct categories and areas, used to fill the filter dropdowns
router.get('/meta/filters', (req, res) => {
  const categories = db
    .prepare(
      `SELECT DISTINCT category FROM listings
       WHERE category IS NOT NULL AND category != ''
       ORDER BY category COLLATE NOCASE`
    )
    .all()
    .map((r) => r.category);

  const areas = db
    .prepare(
      `SELECT DISTINCT area FROM listings
       WHERE area IS NOT NULL AND area != ''
       ORDER BY area COLLATE NOCASE`
    )
    .all()
    .map((r) => r.area);

  res.json({ categories, areas });
});

// Listings owned by the current user
router.get('/mine/list', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT listings.*, ${RATING_COLUMNS}
       FROM listings
       WHERE owner_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Get a single listing
router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT listings.*, users.name AS owner_name, ${RATING_COLUMNS}
       FROM listings
       JOIN users ON users.id = listings.owner_id
       WHERE listings.id = ?`
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Listing not found' });
  res.json(row);
});

// Create a listing (auth required)
router.post('/', requireAuth, (req, res) => {
  const { type, deposit_amount } = req.body;
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const category = String(req.body.category || '').trim();
  const area = String(req.body.area || '').trim();

  if (!type || !title) {
    return res.status(400).json({ error: 'Type and title are required' });
  }
  if (!['skill', 'tool'].includes(type)) {
    return res.status(400).json({ error: "Type must be 'skill' or 'tool'" });
  }
  if (title.length > 100) return res.status(400).json({ error: 'Title is too long (max 100)' });
  if (description.length > 1000) {
    return res.status(400).json({ error: 'Description is too long (max 1000)' });
  }
  if (category.length > 50) return res.status(400).json({ error: 'Category is too long (max 50)' });
  if (area.length > 60) return res.status(400).json({ error: 'Area is too long (max 60)' });

  let deposit = cleanDeposit(deposit_amount);
  if (deposit === null) {
    return res.status(400).json({ error: 'Deposit must be a whole number, 0 or more' });
  }
  if (type === 'skill') deposit = 0; // deposits only apply to physical tools

  const info = db
    .prepare(
      `INSERT INTO listings (owner_id, type, title, description, category, area, deposit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, type, title, description, category, area, deposit);

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(listing);
});

// Update a listing (owner only). Only fields that are sent are changed.
router.put('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can edit this listing' });
  }

  const body = req.body;
  const title = body.title !== undefined ? String(body.title).trim() : listing.title;
  const description =
    body.description !== undefined ? String(body.description).trim() : listing.description;
  const category = body.category !== undefined ? String(body.category).trim() : listing.category;
  const area = body.area !== undefined ? String(body.area).trim() : listing.area;
  const availability = body.availability !== undefined ? body.availability : listing.availability;

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (title.length > 100) return res.status(400).json({ error: 'Title is too long (max 100)' });
  if (description.length > 1000) {
    return res.status(400).json({ error: 'Description is too long (max 1000)' });
  }
  if (category.length > 50) return res.status(400).json({ error: 'Category is too long (max 50)' });
  if (area.length > 60) return res.status(400).json({ error: 'Area is too long (max 60)' });
  if (!['available', 'unavailable'].includes(availability)) {
    return res.status(400).json({ error: "Availability must be 'available' or 'unavailable'" });
  }

  let deposit = listing.deposit_amount;
  if (body.deposit_amount !== undefined) {
    deposit = cleanDeposit(body.deposit_amount);
    if (deposit === null) {
      return res.status(400).json({ error: 'Deposit must be a whole number, 0 or more' });
    }
  }
  if (listing.type === 'skill') deposit = 0;

  // A tool that is currently lent out can't be marked available by hand
  if (listing.type === 'tool' && availability === 'available') {
    const active = db
      .prepare("SELECT id FROM borrow_requests WHERE listing_id = ? AND status = 'accepted'")
      .get(listing.id);
    if (active) {
      return res
        .status(400)
        .json({ error: 'This tool is currently lent out. Mark the request as returned first.' });
    }
  }

  db.prepare(
    `UPDATE listings
     SET title = ?, description = ?, category = ?, area = ?, deposit_amount = ?, availability = ?
     WHERE id = ?`
  ).run(title, description, category, area, deposit, availability, listing.id);

  const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing.id);
  res.json(updated);
});

// Delete a listing (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner can delete this listing' });
  }

  const active = db
    .prepare("SELECT id FROM borrow_requests WHERE listing_id = ? AND status = 'accepted'")
    .get(listing.id);
  if (active) {
    return res
      .status(400)
      .json({ error: 'This listing has an accepted request in progress. Finish it before deleting.' });
  }

  db.prepare('DELETE FROM listings WHERE id = ?').run(listing.id);
  res.json({ success: true });
});

module.exports = router;