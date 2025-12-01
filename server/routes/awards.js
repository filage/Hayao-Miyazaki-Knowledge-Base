const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, prestige, limit } = req.query;
    const whereClauses = [];
    const values = [];

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      whereClauses.push(`(LOWER(a.name) LIKE $${values.length} OR LOWER(a.description) LIKE $${values.length})`);
    }

    if (prestige) {
      const prestigeNumber = Number.parseInt(prestige, 10);
      if (!Number.isNaN(prestigeNumber)) {
        values.push(prestigeNumber);
        whereClauses.push(`a.prestige_level >= $${values.length}`);
      }
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

    const result = await db.query(
      `SELECT a.id,
              a.name,
              a.category,
              a.presented_by,
              a.year_started,
              a.location,
              a.description,
              a.prestige_level,
              (SELECT json_agg(json_build_object(
                'work_id', w.id,
                'work_title_ru', w.title_ru,
                'work_title_en', w.title_en,
                'award_year', wa.award_year,
                'result', wa.result
              ))
               FROM work_awards wa
               JOIN works w ON w.id = wa.work_id
               WHERE wa.award_id = a.id) as works
         FROM awards a
         ${whereSQL}
         ORDER BY a.prestige_level DESC NULLS LAST, a.name ASC
         ${limitSQL}`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const awardResult = await db.query(
      `SELECT a.id,
              a.name,
              a.category,
              a.presented_by,
              a.year_started,
              a.location,
              a.description,
              a.prestige_level
         FROM awards a
        WHERE a.id = $1`,
      [id]
    );

    if (!awardResult.rows.length) {
      return res.status(404).json({ error: 'Award not found' });
    }

    const worksResult = await db.query(
      `SELECT w.id,
              w.title_ru,
              w.title_en,
              w.release_year,
              wa.award_year,
              wa.result
         FROM work_awards wa
         JOIN works w ON w.id = wa.work_id
        WHERE wa.award_id = $1
        ORDER BY wa.award_year DESC NULLS LAST, w.title_ru`,
      [id]
    );

    res.json({
      ...awardResult.rows[0],
      works: worksResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
