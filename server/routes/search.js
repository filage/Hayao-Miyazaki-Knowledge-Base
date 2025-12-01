const express = require('express');
const db = require('../db');
const { embeddingsEnabled, generateEmbeddingFromText, buildPrompt } = require('../services/embeddings');

const router = express.Router();

function toVector(embedding) {
  if (!embedding) return null;
  if (Array.isArray(embedding)) {
    return embedding.map((value) => Number.parseFloat(value));
  }

  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding);
      return Array.isArray(parsed) ? parsed.map((value) => Number.parseFloat(value)) : null;
    } catch (error) {
      return null;
    }
  }

  if (typeof embedding === 'object' && embedding !== null) {
    // jsonb может прийти как объект с числовыми ключами
    const values = Object.values(embedding);
    if (values.every((value) => typeof value === 'number')) {
      return values.map((value) => Number.parseFloat(value));
    }
  }

  return null;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  const length = Math.min(a.length, b.length);
  if (!length) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const valA = Number.parseFloat(a[i]) || 0;
    const valB = Number.parseFloat(b[i]) || 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (!magnitude) return null;

  return dot / magnitude;
}

async function ensureWorkEmbedding(row) {
  if (!embeddingsEnabled()) return null;

  const prompt = buildPrompt({
    titleRu: row.title_ru,
    titleEn: row.title_en,
    synopsis: row.synopsis,
    type: row.type,
  });

  if (!prompt.trim()) {
    return null;
  }

  try {
    const embedding = await generateEmbeddingFromText(prompt);
    await db.query('UPDATE works SET embedding = $1::jsonb WHERE id = $2', [JSON.stringify(embedding), row.id]);
    return embedding;
  } catch (error) {
    console.error(`Failed to build embedding for work ${row.id}`, error.message);
    return null;
  }
}

async function semanticWorksSearch(query) {
  if (!embeddingsEnabled()) {
    return null;
  }

  try {
    const queryEmbedding = await generateEmbeddingFromText(query);
    const { rows } = await db.query(
      `SELECT id,
              title_ru,
              title_en,
              release_year,
              type,
              synopsis,
              poster_url,
              rating,
              age_rating,
              embedding
         FROM works`
    );

    const scored = [];

    for (const row of rows) {
      let vector = toVector(row.embedding);
      if (!vector) {
        vector = await ensureWorkEmbedding(row);
      }
      if (!vector) {
        continue;
      }
      const score = cosineSimilarity(queryEmbedding, vector);
      if (score === null) {
        continue;
      }
      scored.push({
        score,
        data: {
          id: row.id,
          title_ru: row.title_ru,
          title_en: row.title_en,
          release_year: row.release_year,
          type: row.type,
          synopsis: row.synopsis,
          poster_url: row.poster_url,
          rating: row.rating,
          age_rating: row.age_rating,
        },
      });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ data, score }) => ({ ...data, score }));
  } catch (error) {
    console.error('Semantic search failed, falling back to text search:', error);
    return null;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const trimmedQuery = q.trim();
    const pattern = `%${trimmedQuery.toLowerCase()}%`;

    let works = await semanticWorksSearch(trimmedQuery);

    if (!works || works.length === 0) {
      const { rows } = await db.query(
        `SELECT id,
                title_ru,
                title_en,
                release_year,
                type,
                synopsis,
                poster_url,
                rating,
                age_rating
           FROM works
          WHERE LOWER(title_ru) LIKE $1
             OR LOWER(title_en) LIKE $1
             OR LOWER(COALESCE(synopsis, '')) LIKE $1
          ORDER BY release_year DESC NULLS LAST, title_ru ASC
          LIMIT 3`,
        [pattern]
      );
      works = rows;
    }

    const personsPromise = db.query(
      `SELECT id,
              full_name_ru,
              full_name_en,
              roles,
              country
         FROM persons
        WHERE LOWER(full_name_ru) LIKE $1
           OR LOWER(full_name_en) LIKE $1
           OR LOWER(COALESCE(biography, '')) LIKE $1
        ORDER BY full_name_ru ASC
        LIMIT 3`,
      [pattern]
    );

    const charactersPromise = db.query(
      `SELECT id,
              name_ru,
              name_en,
              description
         FROM characters
        WHERE LOWER(name_ru) LIKE $1
           OR LOWER(name_en) LIKE $1
           OR LOWER(COALESCE(description, '')) LIKE $1
        ORDER BY name_ru ASC
        LIMIT 3`,
      [pattern]
    );

    const [personsResult, charactersResult] = await Promise.all([
      personsPromise,
      charactersPromise,
    ]);

    res.json({
      query: trimmedQuery,
      works,
      persons: personsResult.rows,
      characters: charactersResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
