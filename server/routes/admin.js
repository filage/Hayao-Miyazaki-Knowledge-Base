const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware для проверки админа
async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const result = await db.query(
    `SELECT u.id, u.username, u.role
     FROM users u
     JOIN sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Сессия истекла' });
  }

  if (result.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  req.user = result.rows[0];
  next();
}

// ==================== WORKS ====================

// Создать фильм
router.post('/works', requireAdmin, async (req, res, next) => {
  try {
    const {
      title_ru, title_en, release_year, type, synopsis,
      poster_url, trailer_url, runtime_minutes, rating, age_rating,
      budget, box_office, world_premiere
    } = req.body;

    const result = await db.query(
      `INSERT INTO works (title_ru, title_en, release_year, type, synopsis,
                          poster_url, trailer_url, runtime_minutes, rating, age_rating,
                          budget, box_office, world_premiere)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [title_ru, title_en, release_year, type, synopsis,
       poster_url, trailer_url, runtime_minutes, rating, age_rating,
       budget, box_office, world_premiere]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Обновить фильм
router.put('/works/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title_ru, title_en, release_year, type, synopsis,
      poster_url, trailer_url, runtime_minutes, rating, age_rating,
      budget, box_office, world_premiere
    } = req.body;

    const result = await db.query(
      `UPDATE works SET
         title_ru = COALESCE($2, title_ru),
         title_en = COALESCE($3, title_en),
         release_year = COALESCE($4, release_year),
         type = COALESCE($5, type),
         synopsis = COALESCE($6, synopsis),
         poster_url = COALESCE($7, poster_url),
         trailer_url = COALESCE($8, trailer_url),
         runtime_minutes = COALESCE($9, runtime_minutes),
         rating = COALESCE($10, rating),
         age_rating = COALESCE($11, age_rating),
         budget = COALESCE($12, budget),
         box_office = COALESCE($13, box_office),
         world_premiere = COALESCE($14, world_premiere)
       WHERE id = $1
       RETURNING *`,
      [id, title_ru, title_en, release_year, type, synopsis,
       poster_url, trailer_url, runtime_minutes, rating, age_rating,
       budget, box_office, world_premiere]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Удалить фильм
router.delete('/works/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM works WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }

    res.json({ success: true, deletedId: id });
  } catch (err) {
    next(err);
  }
});

// ==================== PERSONS ====================

router.post('/persons', requireAdmin, async (req, res, next) => {
  try {
    const { full_name_ru, full_name_en, roles, biography, birth_date, country, photo_url } = req.body;
    
    // Безопасная обработка roles
    const rolesJson = roles ? JSON.stringify(roles) : JSON.stringify({ roles: [] });

    const result = await db.query(
      `INSERT INTO persons (full_name_ru, full_name_en, roles, biography, birth_date, country, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [full_name_ru, full_name_en, rolesJson, biography || null, birth_date || null, country || null, photo_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания персоны:', err);
    next(err);
  }
});

router.put('/persons/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name_ru, full_name_en, roles, biography, birth_date, country, photo_url } = req.body;

    const result = await db.query(
      `UPDATE persons SET
         full_name_ru = COALESCE($2, full_name_ru),
         full_name_en = COALESCE($3, full_name_en),
         roles = COALESCE($4, roles),
         biography = COALESCE($5, biography),
         birth_date = COALESCE($6, birth_date),
         country = COALESCE($7, country),
         photo_url = COALESCE($8, photo_url)
       WHERE id = $1
       RETURNING *`,
      [id, full_name_ru, full_name_en, roles ? JSON.stringify(roles) : null, biography, birth_date, country, photo_url]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Персона не найдена' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/persons/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM persons WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==================== CHARACTERS ====================

router.post('/characters', requireAdmin, async (req, res, next) => {
  try {
    const { name_ru, name_en, description, image_url, first_appearance_year } = req.body;

    const result = await db.query(
      `INSERT INTO characters (name_ru, name_en, description, image_url, first_appearance_year)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name_ru, name_en, description, image_url, first_appearance_year]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/characters/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_ru, name_en, description, image_url, first_appearance_year } = req.body;

    const result = await db.query(
      `UPDATE characters SET
         name_ru = COALESCE($2, name_ru),
         name_en = COALESCE($3, name_en),
         description = COALESCE($4, description),
         image_url = COALESCE($5, image_url),
         first_appearance_year = COALESCE($6, first_appearance_year)
       WHERE id = $1
       RETURNING *`,
      [id, name_ru, name_en, description, image_url, first_appearance_year]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/characters/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM characters WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==================== GENRES ====================

router.post('/genres', requireAdmin, async (req, res, next) => {
  try {
    const { code, title_ru, title_en, description, category } = req.body;

    const result = await db.query(
      `INSERT INTO genres (code, title_ru, title_en, description, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, title_ru, title_en, description, category]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/genres/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, title_ru, title_en, description, category } = req.body;

    const result = await db.query(
      `UPDATE genres SET
         code = COALESCE($2, code),
         title_ru = COALESCE($3, title_ru),
         title_en = COALESCE($4, title_en),
         description = COALESCE($5, description),
         category = COALESCE($6, category)
       WHERE id = $1
       RETURNING *`,
      [id, code, title_ru, title_en, description, category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Жанр не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/genres/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM genres WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==================== WORK RELATIONS ====================

// Обновить все связи фильма одним запросом
router.put('/works/:workId/relations', requireAdmin, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { persons, characterIds, genreIds, awards } = req.body;

    // Удаляем старые связи
    await db.query('DELETE FROM work_persons WHERE work_id = $1', [workId]);
    await db.query('DELETE FROM work_characters WHERE work_id = $1', [workId]);
    await db.query('DELETE FROM work_genres WHERE work_id = $1', [workId]);
    await db.query('DELETE FROM work_awards WHERE work_id = $1', [workId]);

    // Добавляем персон
    if (persons && persons.length > 0) {
      for (const p of persons) {
        await db.query(
          `INSERT INTO work_persons (work_id, person_id, role, is_primary)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (work_id, person_id, role) DO NOTHING`,
          [workId, p.personId, p.role, p.isPrimary || false]
        );
      }
    }

    // Добавляем персонажей
    if (characterIds && characterIds.length > 0) {
      for (const charId of characterIds) {
        await db.query(
          `INSERT INTO work_characters (work_id, character_id, importance)
           VALUES ($1, $2, 'main')
           ON CONFLICT (work_id, character_id) DO NOTHING`,
          [workId, charId]
        );
      }
    }

    // Добавляем жанры
    if (genreIds && genreIds.length > 0) {
      for (const genreId of genreIds) {
        await db.query(
          `INSERT INTO work_genres (work_id, genre_id)
           VALUES ($1, $2)
           ON CONFLICT (work_id, genre_id) DO NOTHING`,
          [workId, genreId]
        );
      }
    }

    // Добавляем награды
    if (awards && awards.length > 0) {
      for (const award of awards) {
        await db.query(
          `INSERT INTO work_awards (work_id, award_id, award_year, result)
           VALUES ($1, $2, $3, 'winner')
           ON CONFLICT (work_id, award_id, award_year) DO NOTHING`,
          [workId, award.awardId, award.year]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Добавить персону к фильму
router.post('/works/:workId/persons', requireAdmin, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { personId, role, isPrimary } = req.body;

    await db.query(
      `INSERT INTO work_persons (work_id, person_id, role, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (work_id, person_id, role) DO UPDATE SET is_primary = $4`,
      [workId, personId, role, isPrimary || false]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Добавить персонажа к фильму
router.post('/works/:workId/characters', requireAdmin, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { characterId, importance } = req.body;

    await db.query(
      `INSERT INTO work_characters (work_id, character_id, importance)
       VALUES ($1, $2, $3)
       ON CONFLICT (work_id, character_id) DO UPDATE SET importance = $3`,
      [workId, characterId, importance]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Добавить жанр к фильму
router.post('/works/:workId/genres', requireAdmin, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { genreId } = req.body;

    await db.query(
      `INSERT INTO work_genres (work_id, genre_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [workId, genreId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Удалить связи
router.delete('/works/:workId/persons/:personId', requireAdmin, async (req, res, next) => {
  try {
    const { workId, personId } = req.params;
    await db.query('DELETE FROM work_persons WHERE work_id = $1 AND person_id = $2', [workId, personId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/works/:workId/characters/:characterId', requireAdmin, async (req, res, next) => {
  try {
    const { workId, characterId } = req.params;
    await db.query('DELETE FROM work_characters WHERE work_id = $1 AND character_id = $2', [workId, characterId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/works/:workId/genres/:genreId', requireAdmin, async (req, res, next) => {
  try {
    const { workId, genreId } = req.params;
    await db.query('DELETE FROM work_genres WHERE work_id = $1 AND genre_id = $2', [workId, genreId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Получить все сущности для выбора
router.get('/all-persons', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, full_name_ru, full_name_en FROM persons ORDER BY full_name_ru');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/all-characters', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name_ru, name_en FROM characters ORDER BY name_ru');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/all-genres', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, code, title_ru, title_en FROM genres ORDER BY title_ru');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
