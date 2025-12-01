/**
 * Скрипт для загрузки постеров фильмов Миядзаки с TMDB
 * 
 * Для работы нужен API ключ TMDB:
 * 1. Зарегистрируйся на https://www.themoviedb.org/
 * 2. Получи API ключ: https://www.themoviedb.org/settings/api
 * 3. Добавь в .env: TMDB_API_KEY=твой_ключ
 */

const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const POSTERS_DIR = path.join(__dirname, '..', 'public', 'assets', 'posters');

// Соответствие фильмов Миядзаки их TMDB ID
const TMDB_MOVIES = {
  // Полнометражные фильмы
  'Мальчик и птица': { tmdb_id: 508883, filename: 'boy-and-the-heron.jpg' },
  'Ветер крепчает': { tmdb_id: 149870, filename: 'wind-rises.jpg' },
  'Рыбка Поньо на утёсе': { tmdb_id: 12429, filename: 'ponyo.jpg' },
  'Ходячий замок': { tmdb_id: 4935, filename: 'howls-moving-castle.jpg' },
  'Унесённые призраками': { tmdb_id: 129, filename: 'spirited-away.jpg' },
  'Принцесса Мононоке': { tmdb_id: 128, filename: 'princess-mononoke.jpg' },
  'Порко Россо': { tmdb_id: 11621, filename: 'porco-rosso.jpg' },
  'Ведьмина служба доставки': { tmdb_id: 16859, filename: 'kikis-delivery-service.jpg' },
  'Мой сосед Тоторо': { tmdb_id: 8392, filename: 'totoro.jpg' },
  'Небесный замок Лапута': { tmdb_id: 10515, filename: 'castle-in-the-sky.jpg' },
  'Навсикая из Долины ветров': { tmdb_id: 13204, filename: 'nausicaa.jpg' },
  'Люпен III: Замок Калиостро': { tmdb_id: 15371, filename: 'castle-of-cagliostro.jpg' },
  // Сериалы и другое
  'Со склонов Кокурико': { tmdb_id: 58959, filename: 'from-up-on-poppy-hill.jpg' },
  'Сказания Земноморья': { tmdb_id: 3084, filename: 'tales-from-earthsea.jpg' },
  'Ариэтти из страны лилипутов': { tmdb_id: 42473, filename: 'arrietty.jpg' },
  'Шёпот сердца': { tmdb_id: 37797, filename: 'whisper-of-the-heart.jpg' },
  'Помпоко: Война тануки': { tmdb_id: 12606, filename: 'pom-poko.jpg' },
  'Могила светлячков': { tmdb_id: 12477, filename: 'grave-of-fireflies.jpg' },
  'Панда большая и маленькая': { tmdb_id: 17202, filename: 'panda-kopanda.jpg' },
  // Короткометражки (могут не быть на TMDB)
  'Гусеница Боро': { tmdb_id: 504253, filename: 'boro-caterpillar.jpg' },
};

// Альтернативные названия для поиска
const TITLE_ALIASES = {
  'Мальчик и птица': ['The Boy and the Heron', '君たちはどう生きるか'],
  'Унесённые призраками': ['Spirited Away', '千と千尋の神隠し'],
  'Ходячий замок': ['Howl\'s Moving Castle', 'ハウルの動く城'],
  'Принцесса Мононоке': ['Princess Mononoke', 'もののけ姫'],
  'Рыбка Поньо на утёсе': ['Ponyo', '崖の上のポニョ'],
  'Ветер крепчает': ['The Wind Rises', '風立ちぬ'],
  'Мой сосед Тоторо': ['My Neighbor Totoro', 'となりのトトロ'],
  'Ведьмина служба доставки': ['Kiki\'s Delivery Service', '魔女の宅急便'],
  'Небесный замок Лапута': ['Castle in the Sky', '天空の城ラピュタ'],
  'Навсикая из Долины ветров': ['Nausicaä of the Valley of the Wind', '風の谷のナウシカ'],
  'Порко Россо': ['Porco Rosso', '紅の豚'],
  'Люпен III: Замок Калиостро': ['The Castle of Cagliostro', 'ルパン三世 カリオストロの城'],
};

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Следуем за редиректом
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=ru`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function searchMovie(title) {
  const result = await fetchTMDB(`/search/movie?query=${encodeURIComponent(title)}`);
  return result.results?.[0];
}

async function getMovieDetails(tmdbId) {
  return await fetchTMDB(`/movie/${tmdbId}`);
}

async function downloadPoster(tmdbId, filename) {
  try {
    const movie = await getMovieDetails(tmdbId);
    if (!movie.poster_path) {
      console.log(`  ⚠️  Нет постера для TMDB ID ${tmdbId}`);
      return null;
    }
    
    const imageUrl = `${TMDB_IMAGE_BASE}${movie.poster_path}`;
    const filepath = path.join(POSTERS_DIR, filename);
    
    await downloadImage(imageUrl, filepath);
    console.log(`  ✅ Скачан: ${filename}`);
    return `/assets/posters/${filename}`;
  } catch (err) {
    console.error(`  ❌ Ошибка загрузки ${filename}:`, err.message);
    return null;
  }
}

async function run() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY не найден в .env!');
    console.log('\nДля получения ключа:');
    console.log('1. Зарегистрируйся на https://www.themoviedb.org/');
    console.log('2. Получи API ключ: https://www.themoviedb.org/settings/api');
    console.log('3. Добавь в .env: TMDB_API_KEY=твой_ключ');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Получаем все фильмы
    const { rows: works } = await client.query(`
      SELECT id, title_ru, title_en, poster_url 
      FROM works 
      ORDER BY release_year DESC
    `);

    console.log(`\n📽️  Найдено ${works.length} фильмов в базе данных\n`);
    
    let downloaded = 0;
    let updated = 0;

    for (const work of works) {
      console.log(`🎬 ${work.title_ru}`);
      
      // Ищем фильм в нашем маппинге
      let movieInfo = TMDB_MOVIES[work.title_ru];
      
      if (!movieInfo) {
        // Пробуем поискать по названию на TMDB
        console.log(`  🔍 Поиск на TMDB...`);
        const searchResult = await searchMovie(work.title_ru) || 
                            await searchMovie(work.title_en);
        
        if (searchResult) {
          movieInfo = {
            tmdb_id: searchResult.id,
            filename: `${work.title_en?.toLowerCase().replace(/[^a-z0-9]/g, '-') || work.id}.jpg`
          };
          console.log(`  📌 Найден: ${searchResult.title} (ID: ${searchResult.id})`);
        } else {
          console.log(`  ⚠️  Не найден на TMDB`);
          continue;
        }
      }

      // Скачиваем постер
      const posterUrl = await downloadPoster(movieInfo.tmdb_id, movieInfo.filename);
      
      if (posterUrl) {
        downloaded++;
        
        // Обновляем URL в базе данных
        await client.query(
          'UPDATE works SET poster_url = $1 WHERE id = $2',
          [posterUrl, work.id]
        );
        updated++;
      }
      
      // Пауза чтобы не превысить лимит API
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n✅ Готово!`);
    console.log(`   Скачано постеров: ${downloaded}`);
    console.log(`   Обновлено в БД: ${updated}`);

  } catch (err) {
    console.error('Ошибка:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
