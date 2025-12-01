// Film detail page script

// Role translations
const roleTranslations = {
  'director': 'Режиссер',
  'screenwriter': 'Сценарист',
  'producer': 'Продюсер',
  'composer': 'Композитор',
  'animator': 'Аниматор',
  'art director': 'Художник-постановщик',
  'background artist': 'Художник фонов',
  'character designer': 'Дизайнер персонажей',
  'key animator': 'Ключевой аниматор',
  'voice actor': 'Актер озвучивания',
  'conductor': 'Дирижер',
  'studio executive': 'Руководитель студии'
};

function translateRole(role) {
  const roleLower = role.toLowerCase();
  return roleTranslations[roleLower] || role;
}

function toYouTubeEmbed(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return url;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function loadFilm() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  
  if (!id) {
    document.getElementById('film-title').textContent = 'ID фильма не указан';
    return;
  }

  try {
    const response = await fetch(`/api/works/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error('Failed to load film');
    }
    
    const film = await response.json();
    
    // Update document title
    document.title = `${film.title_ru || film.title_en} — Хаяо Миядзаки`;
    
    // Poster
    const posterImg = document.getElementById('film-poster-img');
    if (film.poster_url) {
      posterImg.src = film.poster_url;
      posterImg.alt = film.title_ru || film.title_en;
    }
    
    // Title
    document.getElementById('film-title').textContent = film.title_ru || film.title_en;
    if (film.title_en && film.title_ru) {
      document.getElementById('film-original-title').textContent = film.title_en;
    }
    
    // Rating
    if (film.rating) {
      const ratingEl = document.getElementById('film-rating');
      ratingEl.querySelector('.rating-value').textContent = Number(film.rating).toFixed(1);
      ratingEl.hidden = false;
    }
    
    // Age rating
    if (film.age_rating) {
      const ageEl = document.getElementById('film-age-rating');
      ageEl.textContent = film.age_rating;
      ageEl.hidden = false;
    }
    
    // Genres
    const genresContainer = document.getElementById('film-genres');
    genresContainer.innerHTML = '';
    if (film.genres?.length) {
      film.genres.forEach(genre => {
        const pill = document.createElement('a');
        pill.className = 'genre-pill';
        pill.href = '#';
        pill.textContent = genre.title_ru || genre.title_en;
        pill.addEventListener('click', (e) => e.preventDefault());
        genresContainer.appendChild(pill);
      });
    }
    
    // Synopsis
    document.getElementById('film-synopsis').textContent = film.synopsis || 'Описание отсутствует';
    
    // Film details
    document.getElementById('film-year').textContent = film.release_year || '—';
    document.getElementById('film-country').textContent = 'Япония';
    document.getElementById('film-runtime').textContent = film.runtime_minutes ? `${film.runtime_minutes} мин` : '—';
    document.getElementById('film-age').textContent = film.age_rating || '—';
    
    // Persons by role
    const persons = film.persons || [];
    const directors = persons.filter(p => p.role === 'director');
    const screenwriters = persons.filter(p => p.role === 'screenwriter');
    const producers = persons.filter(p => p.role === 'producer');
    const composers = persons.filter(p => p.role === 'composer');
    const artists = persons.filter(p => p.role === 'art_director' || p.role === 'art director' || p.role === 'background artist');
    const cinematographers = persons.filter(p => p.role === 'cinematographer');
    
    document.getElementById('film-director').innerHTML = directors.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    document.getElementById('film-screenwriter').innerHTML = screenwriters.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    document.getElementById('film-producer').innerHTML = producers.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    document.getElementById('film-composer').innerHTML = composers.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    document.getElementById('film-artist').innerHTML = artists.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    // Cinematographer
    document.getElementById('film-cinematographer').innerHTML = cinematographers.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    // Editor
    const editors = persons.filter(p => p.role === 'editor');
    document.getElementById('film-editor').innerHTML = editors.map(p => 
      `<a href="#">${p.full_name_ru || p.full_name_en}</a>`
    ).join(', ') || '—';
    
    // Budget and box office
    document.getElementById('film-budget').textContent = film.budget ? `$${Number(film.budget).toLocaleString()}` : '—';
    document.getElementById('film-box-office').textContent = film.box_office ? `$${Number(film.box_office).toLocaleString()}` : '—';
    
    // World premiere
    document.getElementById('film-premiere').textContent = film.world_premiere ? 
      new Date(film.world_premiere).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    
    // Trailer
    const trailerSection = document.getElementById('film-trailer-section');
    const showTrailerBtn = document.getElementById('show-trailer-btn');
    const trailerModal = document.getElementById('trailer-modal');
    const trailerIframe = document.getElementById('trailer-iframe');
    const closeTrailerBtn = document.getElementById('close-trailer');
    
    const embedUrl = toYouTubeEmbed(film.trailer_url);
    if (embedUrl) {
      trailerSection.hidden = false;
      showTrailerBtn.addEventListener('click', () => {
        trailerIframe.src = `${embedUrl}?autoplay=1&rel=0`;
        trailerModal.classList.add('active');
      });
      
      closeTrailerBtn.addEventListener('click', () => {
        trailerModal.classList.remove('active');
        trailerIframe.src = '';
      });
      
      trailerModal.addEventListener('click', (e) => {
        if (e.target === trailerModal) {
          trailerModal.classList.remove('active');
          trailerIframe.src = '';
        }
      });
    }
    
    // Render characters
    const charactersGrid = document.getElementById('film-characters');
    charactersGrid.innerHTML = '';
    const characters = film.characters || [];
    characters.forEach(character => {
      const card = document.createElement('div');
      card.className = 'character-card';
      
      if (character.image_url) {
        const photo = document.createElement('img');
        photo.className = 'character-photo';
        photo.src = character.image_url;
        photo.alt = character.name_ru || character.name_en;
        card.appendChild(photo);
      }
      
      const info = document.createElement('div');
      info.className = 'character-info';
      
      const name = document.createElement('p');
      name.className = 'character-name';
      name.textContent = character.name_ru || character.name_en;
      
      const desc = document.createElement('p');
      desc.className = 'character-description';
      desc.textContent = character.description || 'Описание отсутствует';
      
      info.append(name, desc);
      card.appendChild(info);
      charactersGrid.appendChild(card);
    });
    
    // Render awards
    const awards = film.awards || [];
    if (awards.length > 0) {
      const awardsSection = document.getElementById('film-awards-section');
      const awardsList = document.getElementById('film-awards');
      awardsSection.hidden = false;
      awardsList.innerHTML = '';
      
      awards.forEach(award => {
        const item = document.createElement('div');
        item.className = 'award-item';
        
        const name = document.createElement('h3');
        name.className = 'award-name';
        name.textContent = award.name;
        
        const meta = document.createElement('p');
        meta.className = 'award-meta';
        const metaParts = [];
        if (award.award_year) metaParts.push(award.award_year);
        if (award.category) metaParts.push(award.category);
        meta.textContent = metaParts.join(' • ');
        
        const result = document.createElement('span');
        result.className = 'award-result';
        result.textContent = award.result === 'winner' ? '🏆 Победитель' : '📋 Номинант';
        
        item.append(name, meta, result);
        awardsList.appendChild(item);
      });
    }
    
    // Инициализация кнопок списков
    await initUserLists(id);
    
  } catch (error) {
    console.error(error);
    document.getElementById('film-title').textContent = 'Не удалось загрузить данные фильма';
  }
}

// Инициализация кнопок списков пользователя
async function initUserLists(workId) {
  const token = localStorage.getItem('token');
  const actionsDiv = document.getElementById('film-actions');
  const authHint = document.getElementById('auth-hint');
  
  if (!token) {
    // Не авторизован - показываем подсказку
    actionsDiv.hidden = true;
    authHint.hidden = false;
    return;
  }
  
  // Авторизован - показываем кнопки
  actionsDiv.hidden = false;
  authHint.hidden = true;
  
  const btnWatchlist = document.getElementById('btn-watchlist');
  const btnWatched = document.getElementById('btn-watched');
  const btnFavorite = document.getElementById('btn-favorite');
  
  // Загрузить текущий статус
  try {
    const response = await fetch(`/api/user-lists/film/${workId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const lists = await response.json();
      
      if (lists.watchlist) btnWatchlist.classList.add('active');
      if (lists.watched) btnWatched.classList.add('active');
      if (lists.favorite) btnFavorite.classList.add('active');
    }
  } catch (err) {
    console.error('Ошибка загрузки списков:', err);
  }
  
  // Обработчики кнопок - watchlist и watched взаимоисключающие
  async function toggleList(listType, btn, oppositeBtn = null) {
    try {
      const response = await fetch('/api/user-lists/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workId, listType })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.added) {
          btn.classList.add('active');
          // Если добавили в один список - убираем из противоположного
          if (oppositeBtn && oppositeBtn.classList.contains('active')) {
            oppositeBtn.classList.remove('active');
            // Удаляем из противоположного списка на сервере
            const oppositeType = oppositeBtn === btnWatchlist ? 'watchlist' : 'watched';
            await fetch('/api/user-lists/toggle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ workId, listType: oppositeType })
            });
          }
        } else {
          btn.classList.remove('active');
        }
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  }
  
  btnWatchlist.addEventListener('click', () => toggleList('watchlist', btnWatchlist, btnWatched));
  btnWatched.addEventListener('click', () => toggleList('watched', btnWatched, btnWatchlist));
  btnFavorite.addEventListener('click', () => toggleList('favorite', btnFavorite));
}

// Переключатель темы
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  
  // Синхронизация body с html
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  toggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    toggle.style.transform = 'scale(0.9)';
    setTimeout(() => toggle.style.transform = 'scale(1)', 150);
  });
}

// ==================== КОММЕНТАРИИ ====================
async function loadComments() {
  const workId = new URLSearchParams(window.location.search).get('id');
  const token = localStorage.getItem('token');
  
  const commentsList = document.getElementById('comments-list');
  const commentsEmpty = document.getElementById('comments-empty');
  const commentsCount = document.getElementById('comments-count');
  const formContainer = document.getElementById('comment-form-container');
  const loginPrompt = document.getElementById('login-prompt');
  
  // Показать форму или подсказку для входа
  if (token) {
    formContainer.hidden = false;
    loginPrompt.hidden = true;
  } else {
    formContainer.hidden = true;
    loginPrompt.hidden = false;
  }
  
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(`/api/comments/work/${workId}`, { headers });
    const comments = await response.json();
    
    commentsCount.textContent = comments.length > 0 ? `(${comments.length})` : '';
    
    if (comments.length === 0) {
      commentsList.innerHTML = '';
      commentsEmpty.hidden = false;
      return;
    }
    
    commentsEmpty.hidden = true;
    commentsList.innerHTML = comments.map(c => `
      <div class="comment" data-id="${c.id}">
        <div class="comment-header">
          <span class="comment-author">${c.display_name || c.username}</span>
          <span class="comment-date">${formatDate(c.created_at)}</span>
          ${c.canDelete ? `<button class="comment-delete" data-id="${c.id}">🗑️</button>` : ''}
        </div>
        <div class="comment-content">${escapeHtml(c.content)}</div>
      </div>
    `).join('');
    
    // Обработчики удаления
    commentsList.querySelectorAll('.comment-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить комментарий?')) return;
        
        try {
          await fetch(`/api/comments/${btn.dataset.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          loadComments();
        } catch (err) {
          console.error('Ошибка удаления:', err);
        }
      });
    });
    
  } catch (err) {
    console.error('Ошибка загрузки комментариев:', err);
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

function initCommentForm() {
  const input = document.getElementById('comment-input');
  const chars = document.getElementById('comment-chars');
  const submitBtn = document.getElementById('submit-comment');
  const token = localStorage.getItem('token');
  const workId = new URLSearchParams(window.location.search).get('id');
  
  if (!input) return;
  
  input.addEventListener('input', () => {
    chars.textContent = `${input.value.length} / 2000`;
  });
  
  submitBtn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workId, content })
      });
      
      if (response.ok) {
        input.value = '';
        chars.textContent = '0 / 2000';
        loadComments();
      } else {
        const err = await response.json();
        alert(err.error || 'Ошибка отправки');
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить';
    }
  });
}

loadFilm();
initThemeToggle();
loadComments();
initCommentForm();
