require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const worksRouter = require('./routes/works');
const personsRouter = require('./routes/persons');
const charactersRouter = require('./routes/characters');
const genresRouter = require('./routes/genres');
const awardsRouter = require('./routes/awards');
const searchRouter = require('./routes/search');
const authRouter = require('./routes/auth');
const userListsRouter = require('./routes/userLists');
const commentsRouter = require('./routes/comments');
const adminRouter = require('./routes/admin');
const uploadRouter = require('./routes/upload');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/works', worksRouter);
app.use('/api/persons', personsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/genres', genresRouter);
app.use('/api/awards', awardsRouter);
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/user-lists', userListsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
