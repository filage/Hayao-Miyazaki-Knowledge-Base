const express = require('express');
const db = require('../db');
const {
  embeddingsEnabled,
  buildPrompt,
  generateEmbeddingFromText,
} = require('../services/embeddings');

const router = express.Router();

const WORK_TYPES = new Set(['feature', 'short', 'manga', 'series', 'other']);

function sanitizeWorkRow(row) {
  if (!row) return null;
  const { embedding, ...rest } = row;
  return rest;
}

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeWorkPayload(payload = {}) {
  const pick = (primary, fallback) => {
    const value = primary !== undefined ? primary : fallback;
    return typeof value === 'string' ? value.trim() : value ?? null;
  };

  const typeValue = pick(payload.type, payload.workType);
  const normalizedType = typeValue && WORK_TYPES.has(typeValue) ? typeValue : null;

  return {
    title_ru: pick(payload.title_ru, payload.titleRu),
    title_en: pick(payload.title_en, payload.titleEn),
    release_year: toInt(pick(payload.release_year, payload.releaseYear)),
    type: normalizedType,
    synopsis: pick(payload.synopsis, payload.description),
    poster_url: pick(payload.poster_url, payload.posterUrl),
    trailer_url: pick(payload.trailer_url, payload.trailerUrl),
    runtime_minutes: toInt(pick(payload.runtime_minutes, payload.runtimeMinutes)),
  };
}

async function maybeGenerateEmbedding(data) {
  if (!embeddingsEnabled()) {
    return null;
  }

  const prompt = buildPrompt({
    titleRu: data.title_ru,
    titleEn: data.title_en,
    synopsis: data.synopsis,
    type: data.type,
  });

  if (!prompt.trim()) {
    return null;
  }

  return generateEmbeddingFromText(prompt);
}

// Статистика для главной страницы
router.get('/stats', async (req, res, next) => {
  try {
    const [worksCount, personsCount, charactersCount, awardsCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM works'),
      db.query('SELECT COUNT(*) FROM persons'),
      db.query('SELECT COUNT(*) FROM characters'),
      db.query('SELECT COUNT(*) FROM awards')
    ]);
    
    res.json({
      works: parseInt(worksCount.rows[0].count),
      persons: parseInt(personsCount.rows[0].count),
      characters: parseInt(charactersCount.rows[0].count),
      awards: parseInt(awardsCount.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, type, genre: genreParam, theme, q } = req.query;
    const values = [];
    const whereClauses = [];
    let joins = '';

    if (type) {
      values.push(type);
      whereClauses.push(`w.type = $${values.length}`);
    }

    const genreFilter = genreParam || theme;
    if (genreFilter) {
      joins += ' INNER JOIN work_genres wg ON wg.work_id = w.id INNER JOIN genres g ON g.id = wg.genre_id';
      values.push(genreFilter);
      whereClauses.push(`(g.id = $${values.length} OR g.code = $${values.length})`);
    }

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      whereClauses.push(`(LOWER(w.title_ru) LIKE $${values.length} OR LOWER(w.title_en) LIKE $${values.length})`);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderSQL =
      'ORDER BY w.id, w.release_year DESC NULLS LAST, w.title_ru ASC';

    let limitSQL = '';
    if (limit) {
      const limitNumber = Number.parseInt(limit, 10);
      if (!Number.isNaN(limitNumber) && limitNumber > 0) {
        values.push(limitNumber);
        limitSQL += ` LIMIT $${values.length}`;
      }
    }

    if (offset) {
      const offsetNumber = Number.parseInt(offset, 10);
      if (!Number.isNaN(offsetNumber) && offsetNumber >= 0) {
        values.push(offsetNumber);
        limitSQL += ` OFFSET $${values.length}`;
      }
    }

    const query = `SELECT DISTINCT ON (w.id) w.id,
                          w.title_ru,
                          w.title_en,
                          w.release_year,
                          w.type,
                          w.synopsis,
                          w.poster_url,
                          w.trailer_url,
                          w.runtime_minutes,
                          w.rating,
                          w.age_rating,
                          COALESCE(
                            (
                              SELECT json_agg(json_build_object('id', g.id, 'title_ru', g.title_ru, 'title_en', g.title_en, 'category', g.category) ORDER BY g.title_ru)
                              FROM work_genres wg
                              JOIN genres g ON g.id = wg.genre_id
                             WHERE wg.work_id = w.id
                            ), '[]'::json
                          ) AS genres
                     FROM works w
                     ${joins}
                     ${whereSQL}
                     ${orderSQL}
                     ${limitSQL}`;

    const result = await db.query(query, values);
    res.json(result.rows.map(sanitizeWorkRow));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const baseResult = await db.query(
      `SELECT w.id,
              w.title_ru,
              w.title_en,
              w.release_year,
              w.type,
              w.synopsis,
              w.poster_url,
              w.trailer_url,
              w.runtime_minutes,
              w.rating,
              w.age_rating,
              w.budget,
              w.box_office,
              w.world_premiere
         FROM works w
        WHERE w.id = $1`,
      [id]
    );

    if (!baseResult.rows.length) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const personsPromise = db.query(
      `SELECT p.id,
              p.full_name_ru,
              p.full_name_en,
              p.photo_url,
              wp.role,
              wp.is_primary
         FROM work_persons wp
         JOIN persons p ON p.id = wp.person_id
        WHERE wp.work_id = $1
        ORDER BY wp.is_primary DESC, wp.role, p.full_name_ru`,
      [id]
    );

    const charactersPromise = db.query(
      `SELECT c.id,
              c.name_ru,
              c.name_en,
              c.description,
              c.image_url,
              wc.importance
         FROM work_characters wc
         JOIN characters c ON c.id = wc.character_id
        WHERE wc.work_id = $1
        ORDER BY wc.importance DESC NULLS LAST, c.name_ru`,
      [id]
    );

    const genresPromise = db.query(
      `SELECT g.id,
              g.code,
              g.title_ru,
              g.title_en,
              g.category
         FROM work_genres wg
         JOIN genres g ON g.id = wg.genre_id
        WHERE wg.work_id = $1
        ORDER BY g.title_ru`,
      [id]
    );

    const awardsPromise = db.query(
      `SELECT a.id,
              a.name,
              a.category,
              a.presented_by,
              wa.award_year,
              wa.result
         FROM work_awards wa
         JOIN awards a ON a.id = wa.award_id
        WHERE wa.work_id = $1
        ORDER BY wa.award_year DESC NULLS LAST, a.name`,
      [id]
    );

    const [personsResult, charactersResult, genresResult, awardsResult] = await Promise.all([
      personsPromise,
      charactersPromise,
      genresPromise,
      awardsPromise,
    ]);

    const response = {
      ...baseResult.rows[0],
      persons: personsResult.rows,
      characters: charactersResult.rows,
      genres: genresResult.rows,
      awards: awardsResult.rows,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = normalizeWorkPayload(req.body);

    if (!payload.title_ru) {
      return res.status(400).json({ error: 'Поле title_ru обязательно' });
    }

    let embedding = null;
    try {
      embedding = await maybeGenerateEmbedding(payload);
    } catch (embeddingError) {
      console.error('Failed to generate embedding for new work:', embeddingError);
      return res.status(502).json({ error: 'Не удалось получить embedding из внешнего сервиса' });
    }

    const values = [
      payload.title_ru,
      payload.title_en,
      payload.release_year,
      payload.type,
      payload.synopsis,
      payload.poster_url,
      payload.trailer_url,
      payload.runtime_minutes,
      embedding,
    ];

    const insertQuery = `INSERT INTO works (
        title_ru,
        title_en,
        release_year,
        type,
        synopsis,
        poster_url,
        trailer_url,
        runtime_minutes,
        embedding
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING id, title_ru, title_en, release_year, type, synopsis, poster_url, trailer_url, runtime_minutes`;

    const { rows } = await db.query(insertQuery, values);
    res.status(201).json(sanitizeWorkRow(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = normalizeWorkPayload(req.body);

    const existing = await db.query('SELECT * FROM works WHERE id = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const current = existing.rows[0];
    const merged = {
      title_ru: payload.title_ru ?? current.title_ru,
      title_en: payload.title_en ?? current.title_en,
      release_year: payload.release_year ?? current.release_year,
      type: payload.type ?? current.type,
      synopsis: payload.synopsis ?? current.synopsis,
      poster_url: payload.poster_url ?? current.poster_url,
      trailer_url: payload.trailer_url ?? current.trailer_url,
      runtime_minutes: payload.runtime_minutes ?? current.runtime_minutes,
    };

    if (!merged.title_ru) {
      return res.status(400).json({ error: 'Поле title_ru обязательно' });
    }

    let embedding = current.embedding;
    try {
      const generated = await maybeGenerateEmbedding(merged);
      if (generated) {
        embedding = generated;
      }
    } catch (embeddingError) {
      console.error('Failed to regenerate embedding for work:', embeddingError);
      return res.status(502).json({ error: 'Не удалось обновить embedding из внешнего сервиса' });
    }

    const values = [
      merged.title_ru,
      merged.title_en,
      merged.release_year,
      merged.type,
      merged.synopsis,
      merged.poster_url,
      merged.trailer_url,
      merged.runtime_minutes,
      embedding,
      id,
    ];

    const updateQuery = `UPDATE works
                           SET title_ru = $1,
                               title_en = $2,
                               release_year = $3,
                               type = $4,
                               synopsis = $5,
                               poster_url = $6,
                               trailer_url = $7,
                               runtime_minutes = $8,
                               embedding = $9
                         WHERE id = $10
                     RETURNING id, title_ru, title_en, release_year, type, synopsis, poster_url, trailer_url, runtime_minutes`;

    const { rows } = await db.query(updateQuery, values);
    res.json(sanitizeWorkRow(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM works WHERE id = $1', [id]);
    if (!rowCount) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
