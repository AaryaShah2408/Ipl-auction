const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all players
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM players ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single player
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM players WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bid history for a player
router.get('/:id/bids', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM bids WHERE player_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
