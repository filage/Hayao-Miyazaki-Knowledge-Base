// Profile page script

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Проверка авторизации
if (!token) {
  window.location.href = '/login.html?redirect=/profile.html';
}

// Загрузка темы сразу
(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
})();

// Загрузка списков
async function loadLists() {
  try {
    const response = await fetch('/api/user-lists', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Ошибка загрузки');
    }
    
    const items = await response.json();
    
    const watchlist = items.filter(i => i.list_type === 'watchlist');
    const watched = items.filter(i => i.list_type === 'watched');
    const favorite = items.filter(i => i.list_type === 'favorite');
    
    renderList('watchlist', watchlist);
    renderList('watched', watched);
    renderList('favorite', favorite);
    
  } catch (err) {
    console.error('Ошибка:', err);
  }
}

function renderStars(rating, workId) {
  let stars = '';
  for (let i = 1; i <= 10; i++) {
    const filled = i <= (rating || 0);
    stars += `<span class="star ${filled ? 'filled' : ''}" data-rating="${i}" data-work="${workId}">★</span>`;
  }
  return stars;
}

function renderList(listType, items) {
  const container = document.getElementById(`${listType}-items`);
  const empty = document.getElementById(`${listType}-empty`);
  
  if (!container || !empty) return;
  
  if (items.length === 0) {
    container.innerHTML = '';
    empty.hidden = false;
    return;
  }
  
  empty.hidden = true;
  container.innerHTML = items.map(item => `
    <div class="film-card">
      <a href="./film.html?id=${item.work_id}">
        <img class="film-card-poster" src="${item.poster_url || '/assets/posters/placeholder.jpg'}" alt="${item.title_ru}">
        <div class="film-card-info">
          <h3 class="film-card-title">${item.title_ru}</h3>
          <p class="film-card-year">${item.release_year || ''}</p>
        </div>
      </a>
      ${listType === 'watched' ? `
        <div class="film-card-rating">
          <span class="rating-label">Моя оценка:</span>
          <div class="stars-container" data-work-id="${item.work_id}">
            ${renderStars(item.rating, item.work_id)}
          </div>
        </div>
      ` : ''}
      <button class="film-card-remove" data-work-id="${item.work_id}" data-list-type="${listType}">
        Удалить
      </button>
    </div>
  `).join('');
  
  container.querySelectorAll('.film-card-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const workId = btn.dataset.workId;
      const lt = btn.dataset.listType;
      
      try {
        await fetch('/api/user-lists/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ workId, listType: lt })
        });
        loadLists();
      } catch (err) {
        console.error('Ошибка:', err);
      }
    });
  });
  
  // Обработчик звёзд для оценки
  if (listType === 'watched') {
    container.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const rating = parseInt(star.dataset.rating);
        const workId = star.dataset.work;
        
        console.log('Rating:', rating, 'WorkId:', workId);
        
        try {
          const response = await fetch('/api/user-lists/rate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ workId, rating })
          });
          
          if (!response.ok) {
            const err = await response.json();
            console.error('Ошибка API:', err);
            return;
          }
          
          loadLists();
        } catch (err) {
          console.error('Ошибка:', err);
        }
      });
      
      // Hover эффект
      star.addEventListener('mouseenter', () => {
        const container = star.closest('.stars-container');
        const rating = parseInt(star.dataset.rating);
        container.querySelectorAll('.star').forEach((s, i) => {
          s.classList.toggle('hover', i < rating);
        });
      });
      
      star.addEventListener('mouseleave', () => {
        const container = star.closest('.stars-container');
        container.querySelectorAll('.star').forEach(s => s.classList.remove('hover'));
      });
    });
  }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  // Навигация
  const navAuth = document.getElementById('nav-auth');
  if (navAuth && token && user.username) {
    navAuth.innerHTML = `
      <span class="nav-user">
        <a href="./profile.html" class="nav-user-link nav-user-link--active">👤 ${user.displayName || user.username}</a>
        ${user.role === 'admin' ? '<a href="./admin.html" class="nav-admin-btn">Панель управления</a>' : ''}
        <a href="#" class="nav-logout-btn" id="nav-logout-btn">Выйти</a>
      </span>
    `;
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        } catch (err) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      });
    }
  } else if (navAuth) {
    navAuth.innerHTML = '<a href="./login.html" class="top-nav__link">Войти</a>';
  }

  // Профиль
  const avatar = document.getElementById('profile-avatar');
  const name = document.getElementById('profile-name');
  const email = document.getElementById('profile-email');
  const role = document.getElementById('profile-role');
  
  if (avatar) avatar.textContent = (user.displayName || user.username || '?')[0].toUpperCase();
  if (name) name.textContent = user.displayName || user.username || 'Пользователь';
  if (email) email.textContent = user.email || '';
  if (role) role.textContent = user.role === 'admin' ? 'Администратор' : '';

  // Табы
  const tabs = document.querySelectorAll('.profile-tab');
  const tabSections = {
    watchlist: document.getElementById('tab-watchlist'),
    watched: document.getElementById('tab-watched'),
    favorite: document.getElementById('tab-favorite')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(tabSections).forEach(s => { if (s) s.hidden = true; });
      if (tabSections[tab.dataset.tab]) tabSections[tab.dataset.tab].hidden = false;
    });
  });

  // Переключатель темы
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
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

  // Загрузка списков
  loadLists();
});
