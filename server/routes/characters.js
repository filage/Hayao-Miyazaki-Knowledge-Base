const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { workId, theme, q } = req.query;
    const whereClauses = [];
    const values = [];
    let joins = '';

    if (workId) {
      joins += ' INNER JOIN work_characters wc ON wc.character_id = c.id';
      values.push(workId);
      whereClauses.push(`wc.work_id = $${values.length}`);
    }

    if (theme) {
      joins += ' INNER JOIN work_characters wc2 ON wc2.character_id = c.id INNER JOIN work_themes wt ON wt.work_id = wc2.work_id INNER JOIN themes t ON t.id = wt.theme_id';
      values.push(theme);
      whereClauses.push(`(t.id = $${values.length} OR t.code = $${values.length})`);
    }

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      whereClauses.push(`(LOWER(c.name_ru) LIKE $${values.length} OR LOWER(c.name_en) LIKE $${values.length})`);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT c.id,
                        c.name_ru,
                        c.name_en,
                        c.description,
                        c.image_url,
                        c.first_appearance_year,
                        (SELECT json_agg(json_build_object('id', w.id, 'title_ru', w.title_ru, 'title_en', w.title_en))
                         FROM work_characters wc_inner
                         JOIN works w ON w.id = wc_inner.work_id
                         WHERE wc_inner.character_id = c.id
                         LIMIT 1) as works
                   FROM characters c
                   ${joins}
                   ${whereSQL}
                   GROUP BY c.id, c.name_ru, c.name_en, c.description, c.image_url, c.first_appearance_year
                   ORDER BY c.name_ru ASC`;

    const result = await db.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Получить одного персонажа по ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name_ru, name_en, description, image_url, first_appearance_year
       FROM characters WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
