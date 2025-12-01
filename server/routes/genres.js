const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { category, limit, q } = req.query;
    const whereClauses = [];
    const values = [];

    if (category) {
      values.push(category);
      whereClauses.push(`g.category = $${values.length}`);
    }

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      whereClauses.push(`(LOWER(g.title_ru) LIKE $${values.length} OR LOWER(g.title_en) LIKE $${values.length})`);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let limitSQL = '';
    if (limit) {
      const limitNumber = Number.parseInt(limit, 10);
      if (!Number.isNaN(limitNumber) && limitNumber > 0) {
        values.push(limitNumber);
        limitSQL = ` LIMIT $${values.length}`;
      }
    }

    const sql = `SELECT g.id,
                        g.code,
                        g.title_ru,
                        g.title_en,
                        g.description,
                        g.category
                   FROM genres g
                   ${whereSQL}
                   ORDER BY g.title_ru ASC
                   ${limitSQL}`;

    const result = await db.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Получить один жанр по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, code, title_ru, title_en, description, category
       FROM genres WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Жанр не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
