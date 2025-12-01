const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware для проверки авторизации
async function requireAuth(req, res, next) {
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

  req.user = result.rows[0];
  next();
}

// Получить все списки пользователя
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ufl.*, w.title_ru, w.title_en, w.poster_url, w.release_year
       FROM user_film_lists ufl
       JOIN works w ON w.id = ufl.work_id
       WHERE ufl.user_id = $1
       ORDER BY w.title_ru ASC, w.release_year DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Получить статус фильма для пользователя
router.get('/film/:workId', requireAuth, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const result = await db.query(
      `SELECT list_type, rating
       FROM user_film_lists
       WHERE user_id = $1 AND work_id = $2`,
      [req.user.id, workId]
    );

    const lists = {};
    result.rows.forEach(row => {
      lists[row.list_type] = { rating: row.rating };
    });

    res.json(lists);
  } catch (err) {
    next(err);
  }
});

// Добавить/удалить фильм из списка
router.post('/toggle', requireAuth, async (req, res, next) => {
  try {
    const { workId, listType, rating } = req.body;

    if (!workId || !listType) {
      return res.status(400).json({ error: 'Укажите workId и listType' });
    }

    if (!['watchlist', 'watched', 'favorite'].includes(listType)) {
      return res.status(400).json({ error: 'Неверный тип списка' });
    }

    // Проверяем существует ли запись
    const existing = await db.query(
      'SELECT id FROM user_film_lists WHERE user_id = $1 AND work_id = $2 AND list_type = $3',
      [req.user.id, workId, listType]
    );

    if (existing.rows.length > 0) {
      // Удаляем
      await db.query(
        'DELETE FROM user_film_lists WHERE user_id = $1 AND work_id = $2 AND list_type = $3',
        [req.user.id, workId, listType]
      );
      res.json({ added: false, listType });
    } else {
      // Добавляем
      await db.query(
        `INSERT INTO user_film_lists (user_id, work_id, list_type, rating)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, workId, listType, rating || null]
      );
      res.json({ added: true, listType });
    }
  } catch (err) {
    next(err);
  }
});

// Обновить рейтинг/заметку
router.put('/update', requireAuth, async (req, res, next) => {
  try {
    const { workId, listType, rating } = req.body;

    await db.query(
      `UPDATE user_film_lists
       SET rating = $4
       WHERE user_id = $1 AND work_id = $2 AND list_type = $3`,
      [req.user.id, workId, listType, rating]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Поставить оценку фильму
router.post('/rate', requireAuth, async (req, res, next) => {
  try {
    const { workId, rating } = req.body;

    if (!workId || !rating || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Укажите workId и rating (1-10)' });
    }

    // Обновляем оценку для watched
    const result = await db.query(
      `UPDATE user_film_lists
       SET rating = $3
       WHERE user_id = $1 AND work_id = $2 AND list_type = 'watched'
       RETURNING *`,
      [req.user.id, workId, rating]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден в списке просмотренных' });
    }

    res.json({ success: true, rating });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
