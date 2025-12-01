const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Папки для разных типов изображений
const UPLOAD_DIRS = {
  posters: path.join(__dirname, '../../public/assets/posters'),
  people: path.join(__dirname, '../../public/assets/people'),
  characters: path.join(__dirname, '../../public/assets/characters')
};

// Создаём папки если не существуют
Object.values(UPLOAD_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'posters';
    const dir = UPLOAD_DIRS[type] || UPLOAD_DIRS.posters;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Уникальное имя: timestamp + оригинальное имя
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9а-яА-Я]/g, '-')
      .toLowerCase()
      .slice(0, 50);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Фильтр файлов - только изображения
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB макс
});

// POST /api/upload/:type (posters, people, characters)
router.post('/:type', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const type = req.params.type || 'posters';
  const relativePath = `/assets/${type}/${req.file.filename}`;
  
  res.json({
    success: true,
    url: relativePath,
    filename: req.file.filename
  });
});

// Обработка ошибок multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой (макс 5MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
