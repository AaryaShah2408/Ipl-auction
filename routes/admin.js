const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// Middleware to check admin session
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Unauthorized' });
};

// Admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.isAdmin = true;
    req.session.adminId = rows[0].id;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check session
router.get('/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// Add a new player
router.post('/players', requireAdmin, async (req, res) => {
  const { name, role, nationality, age, base_price, stats, image_url } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO players (name, role, nationality, age, base_price, current_bid, stats, image_url)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING *`,
      [name, role, nationality, age, base_price, stats ? JSON.stringify(stats) : null, image_url]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a player
router.put('/players/:id', requireAdmin, async (req, res) => {
  const { name, role, nationality, age, base_price, stats, image_url, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE players SET name=$1, role=$2, nationality=$3, age=$4, base_price=$5, stats=$6, image_url=$7, status=$8
       WHERE id=$9 RETURNING *`,
      [name, role, nationality, age, base_price, stats ? JSON.stringify(stats) : null, image_url, status || 'available', req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a player
router.delete('/players/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM bids WHERE player_id = $1', [req.params.id]);
    await pool.query('DELETE FROM players WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset bids for a player
router.post('/players/:id/reset', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT base_price FROM players WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' });

    await pool.query('DELETE FROM bids WHERE player_id = $1', [req.params.id]);
    await pool.query(
      `UPDATE players SET current_bid = base_price, current_bidder = null, team = null, status = 'available' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark player as sold
router.post('/players/:id/sell', requireAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE players SET status = 'sold' WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BULK IMPORT players from CSV data
router.post('/players/bulk', requireAdmin, async (req, res) => {
  const { players } = req.body;
  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'No players provided' });
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const p of players) {
    try {
      if (!p.name || !p.role || !p.nationality || !p.base_price) {
        results.failed++;
        results.errors.push(`Skipped row: missing required fields (name/role/nationality/base_price) — "${p.name || 'unknown'}"`);
        continue;
      }

      let stats = null;
      if (p.stats) {
        try { stats = typeof p.stats === 'string' ? JSON.parse(p.stats) : p.stats; }
        catch { stats = null; }
      }

      await pool.query(
        `INSERT INTO players (name, role, nationality, age, base_price, current_bid, stats, image_url)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7)`,
        [p.name.trim(), p.role.trim(), p.nationality.trim(), parseInt(p.age) || null, parseInt(p.base_price), stats, p.image_url || null]
      );
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(`"${p.name}": ${err.message}`);
    }
  }

  res.json(results);
});

// Clear all Wikipedia image URLs so they get re-fetched
router.post('/clear-wiki-images', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE players SET image_url = NULL WHERE image_url LIKE '%wikimedia%' OR image_url LIKE '%wikipedia%'`
    );
    res.json({ success: true, cleared: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, requireAdmin };