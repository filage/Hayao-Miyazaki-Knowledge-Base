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
    `SELECT u.id, u.username, u.display_name, u.role
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

// Опциональная авторизация (для просмотра)
async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const result = await db.query(
      `SELECT u.id, u.username, u.display_name, u.role
       FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  }
  next();
}

// Получить комментарии к фильму
router.get('/work/:workId', optionalAuth, async (req, res, next) => {
  try {
    const { workId } = req.params;
    
    const result = await db.query(
      `SELECT c.id, c.content, c.created_at, c.updated_at, c.user_id,
              u.username, u.display_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.work_id = $1
       ORDER BY c.created_at DESC`,
      [workId]
    );

    const comments = result.rows.map(c => ({
      ...c,
      isOwner: req.user?.id === c.user_id,
      canDelete: req.user?.id === c.user_id || req.user?.role === 'admin'
    }));

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// Добавить комментарий
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { workId, content } = req.body;

    if (!workId || !content?.trim()) {
      return res.status(400).json({ error: 'Укажите workId и content' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Комментарий слишком длинный (макс. 2000 символов)' });
    }

    const result = await db.query(
      `INSERT INTO comments (work_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [workId, req.user.id, content.trim()]
    );

    res.status(201).json({
      ...result.rows[0],
      username: req.user.username,
      display_name: req.user.display_name,
      isOwner: true,
      canDelete: true
    });
  } catch (err) {
    next(err);
  }
});

// Удалить комментарий
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверяем права
    const comment = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (comment.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Нет прав на удаление' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
