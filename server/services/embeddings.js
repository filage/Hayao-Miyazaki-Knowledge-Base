const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004';

function embeddingsEnabled() {
  return Boolean(API_KEY);
}

function buildPrompt({ titleRu = '', titleEn = '', synopsis = '', type = '' }) {
  return [
    titleRu,
    titleEn,
    type ? `Тип: ${type}` : '',
    synopsis ? `Описание: ${synopsis}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function requestEmbedding(text) {
  return new Promise((resolve, reject) => {
    const trimmed = text.slice(0, 6000);
    const body = JSON.stringify({
      model: `models/${MODEL}`,
      content: {
        parts: [{ text: trimmed }],
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${encodeURIComponent(MODEL)}:embedContent?key=${encodeURIComponent(API_KEY)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (chunk) => {
        chunks += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(chunks));
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Embedding request failed with status ${res.statusCode}: ${chunks}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateEmbeddingFromText(text) {
  if (!embeddingsEnabled()) {
    throw new Error('Embedding service is not configured. Set GEMINI_API_KEY environment variable.');
  }

  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const payload = await requestEmbedding(trimmed);
  const values = payload?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Invalid embedding response payload');
  }

  return values.map((value) => Number.parseFloat(value));
}

module.exports = {
  embeddingsEnabled,
  generateEmbeddingFromText,
  buildPrompt,
};
