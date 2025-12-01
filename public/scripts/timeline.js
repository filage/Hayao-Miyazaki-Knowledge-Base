// Timeline page script

const typeLabels = {
  feature: 'Полнометражный',
  short: 'Короткометражка',
  series: 'Сериал',
  manga: 'Манга',
  other: 'Другое'
};

async function loadTimeline() {
  try {
    const response = await fetch('/api/works?limit=100');
    const works = await response.json();
    
    // Сортируем по году
    works.sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    
    const container = document.getElementById('timeline-items');
    let currentDecade = null;
    let html = '';
    
    works.forEach((work, index) => {
      const year = work.release_year || 0;
      const decade = Math.floor(year / 10) * 10;
      
      // Добавляем маркер десятилетия
      if (decade !== currentDecade && decade > 0) {
        currentDecade = decade;
        html += `
          <div class="timeline-decade">
            <span>${decade}-е</span>
          </div>
        `;
      }
      
      html += `
        <div class="timeline-item">
          <div class="timeline-content">
            <div class="timeline-year">${year || '?'}</div>
            <a href="./film.html?id=${work.id}" class="timeline-card">
              <img class="timeline-poster" 
                   src="${work.poster_url || '/assets/posters/placeholder.jpg'}" 
                   alt="${work.title_ru}"
                   loading="lazy">
              <div class="timeline-info">
                <h3 class="timeline-title">${work.title_ru}</h3>
                <span class="timeline-type ${work.type || ''}">${typeLabels[work.type] || 'Фильм'}</span>
                ${work.synopsis ? `<p class="timeline-synopsis">${work.synopsis.substring(0, 150)}${work.synopsis.length > 150 ? '...' : ''}</p>` : ''}
              </div>
            </a>
          </div>
          <div class="timeline-dot"></div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Обновляем статистику
    const years = works.filter(w => w.release_year).map(w => w.release_year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    
    document.getElementById('stat-years').textContent = maxYear - minYear;
    document.getElementById('stat-films').textContent = works.length;
    
    // Подсчёт наград (примерный)
    const awardsResponse = await fetch('/api/awards');
    const awards = await awardsResponse.json();
    document.getElementById('stat-awards').textContent = awards.length * 2; // Примерно
    
  } catch (err) {
    console.error('Ошибка загрузки таймлайна:', err);
    document.getElementById('timeline-items').innerHTML = `
      <p style="text-align: center; color: #888; padding: 40px;">Ошибка загрузки данных</p>
    `;
  }
}

// Навигация
function initNav() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navAuth = document.getElementById('nav-auth');
  
  if (navAuth && token && user.username) {
    navAuth.innerHTML = `
      <span class="nav-user">
        <a href="./profile.html" class="nav-user-link">👤 ${user.displayName || user.username}</a>
        ${user.role === 'admin' ? '<a href="./admin.html" class="nav-admin-btn">Панель управления</a>' : ''}
        <a href="#" class="nav-logout-btn" id="logout-btn">Выйти</a>
      </span>
    `;
    
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    });
  } else if (navAuth) {
    navAuth.innerHTML = '<a href="./login.html" class="top-nav__link">Войти</a>';
  }
}

// Тема
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  toggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

loadTimeline();
initNav();
initTheme();
