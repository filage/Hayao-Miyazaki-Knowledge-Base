const express = require('express');
const db = require('../db');

const router = express.Router();

function parseRoles(rawRoles) {
  if (!rawRoles) return null;
  if (typeof rawRoles === 'object') return rawRoles;
  try {
    return JSON.parse(rawRoles);
  } catch (error) {
    return null;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { role, country, q } = req.query;
    const whereClauses = [];
    const values = [];

    if (role) {
      values.push(`%${role.toLowerCase()}%`);
      whereClauses.push(`LOWER(p.roles::text) LIKE $${values.length}`);
    }

    if (country) {
      values.push(country);
      whereClauses.push(`p.country = $${values.length}`);
    }

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      whereClauses.push(`(LOWER(p.full_name_ru) LIKE $${values.length} OR LOWER(p.full_name_en) LIKE $${values.length})`);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT p.id,
                        p.full_name_ru,
                        p.full_name_en,
                        p.roles,
                        p.biography,
                        p.birth_date,
                        p.country,
                        p.photo_url
                   FROM persons p
                   ${whereSQL}
                   ORDER BY COALESCE(p.birth_date, DATE '2100-01-01'), p.full_name_ru`;

    const result = await db.query(sql, values);
    const rows = result.rows.map((row) => ({
      ...row,
      roles: parseRoles(row.roles),
    }));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const personResult = await db.query(
      `SELECT p.id,
              p.full_name_ru,
              p.full_name_en,
              p.roles,
              p.biography,
              p.birth_date,
              p.country,
              p.photo_url
         FROM persons p
        WHERE p.id = $1`,
      [id]
    );

    if (!personResult.rows.length) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const worksPromise = db.query(
      `SELECT w.id,
              w.title_ru,
              w.title_en,
              w.release_year,
              w.type,
              w.synopsis,
              wp.role,
              wp.is_primary
         FROM work_persons wp
         JOIN works w ON w.id = wp.work_id
        WHERE wp.person_id = $1
        ORDER BY w.release_year NULLS LAST, w.title_ru`,
      [id]
    );

    const awardsPromise = db.query(
      `SELECT a.id,
              a.name,
              a.category,
              a.presented_by,
              pa.award_year,
              pa.result
         FROM person_awards pa
         JOIN awards a ON a.id = pa.award_id
        WHERE pa.person_id = $1
        ORDER BY pa.award_year DESC NULLS LAST, a.name`,
      [id]
    );

    const [worksResult, awardsResult] = await Promise.all([worksPromise, awardsPromise]);

    const response = {
      ...personResult.rows[0],
      roles: parseRoles(personResult.rows[0].roles),
      works: worksResult.rows,
      awards: awardsResult.rows,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
