import { fetchWorks, searchAll } from './api.js';
import { renderWorkCard, renderPersonCard, renderCharacterCard, getTypeLabel } from './renderers.js';

const recentWorksGrid = document.querySelector('#recent-works-grid');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const tabsWrapper = document.querySelector('#works-tabs');
const searchResultsSection = document.querySelector('#search-results');
const searchStatus = document.querySelector('#search-status');
const searchClearBtn = document.querySelector('#search-clear');
const searchWorksContainer = document.querySelector('#search-works');
const searchPersonsContainer = document.querySelector('#search-persons');
const searchCharactersContainer = document.querySelector('#search-characters');
const genreChipsContainer = document.querySelector('#genre-chips');

const DEFAULT_WORK_LIMIT = 60;

// Загрузка статистики из БД
async function loadStats() {
  try {
    const response = await fetch('/api/works/stats');
    const stats = await response.json();
    
    // Анимированный счётчик
    animateCounter('stat-works', stats.works);
    animateCounter('stat-characters', stats.characters);
    animateCounter('stat-awards', stats.awards);
  } catch (err) {
    console.error('Ошибка загрузки статистики:', err);
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  
  el.dataset.count = target;
  let current = 0;
  const increment = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current + '+';
  }, 30);
}

// Состояние фильтров
let allWorks = [];
let currentType = 'all';
let selectedGenres = []; // Мульти-выбор жанров
let currentSearch = '';  // Поиск по названию
let currentSort = 'year';
let currentOrder = 'desc';

async function loadRecentWorks(type = 'all') {
  try {
    currentType = type;
    const params = { limit: DEFAULT_WORK_LIMIT };
    if (type && type !== 'all') params.type = type;
    const works = await fetchWorks(params);
    allWorks = works;
    
    if (!works.length) {
      recentWorksGrid.textContent = 'Пока нет данных о произведениях.';
      return;
    }
    
    // Загружаем жанры
    await loadGenres();
    
    // Применяем фильтры и сортировку
    applyFiltersAndSort();
  } catch (error) {
    recentWorksGrid.textContent = 'Не удалось загрузить произведения.';
  }
}

async function loadGenres() {
  try {
    const response = await fetch('/api/genres');
    const genres = await response.json();
    
    // Показываем все жанры (не только использованные)
    genreChipsContainer.innerHTML = '<button class="filter-chip active" data-genre="">Все</button>';
    genres.forEach(genre => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.genre = genre.id;
      chip.textContent = genre.title_ru;
      genreChipsContainer.appendChild(chip);
    });
  } catch (err) {
    console.error('Ошибка загрузки жанров:', err);
  }
}

function applyFiltersAndSort() {
  let filtered = [...allWorks];
  
  // Поиск по названию
  if (currentSearch.trim()) {
    const searchLower = currentSearch.toLowerCase().trim();
    filtered = filtered.filter(work => {
      const titleRu = (work.title_ru || '').toLowerCase();
      const titleEn = (work.title_en || '').toLowerCase();
      return titleRu.includes(searchLower) || titleEn.includes(searchLower);
    });
  }
  
  // Фильтр по жанрам (мульти-выбор - показывать только если совпадают ВСЕ выбранные жанры)
  if (selectedGenres.length > 0) {
    filtered = filtered.filter(work => {
      if (!work.genres || !Array.isArray(work.genres)) return false;
      const workGenreIds = work.genres.map(g => g.id);
      return selectedGenres.every(genreId => workGenreIds.includes(genreId));
    });
  }
  
  // Сортировка
  filtered.sort((a, b) => {
    let valA, valB;
    
    switch (currentSort) {
      case 'year':
        valA = a.release_year || 0;
        valB = b.release_year || 0;
        break;
      case 'rating':
        valA = parseFloat(a.rating) || 0;
        valB = parseFloat(b.rating) || 0;
        break;
      case 'title':
        valA = (a.title_ru || '').toLowerCase();
        valB = (b.title_ru || '').toLowerCase();
        return currentOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    return currentOrder === 'asc' ? valA - valB : valB - valA;
  });
  
  // Анимация перерисовки
  animateCards(filtered);
}

function animateCards(works) {
  const cards = recentWorksGrid.querySelectorAll('.work-card');
  
  // Fade out
  cards.forEach(card => card.classList.add('fade-out'));
  
  setTimeout(() => {
    recentWorksGrid.innerHTML = '';
    
    if (!works.length) {
      recentWorksGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">Нет фильмов по заданным критериям</p>';
      return;
    }
    
    works.forEach((work, index) => {
      const card = renderWorkCard(work);
      card.classList.add('work-card');
      card.style.opacity = '0';
      card.style.animationDelay = `${index * 0.05}s`;
      card.classList.add('fade-in');
      recentWorksGrid.appendChild(card);
    });
  }, 200);
}

function renderList(container, items, renderer) {
  container.textContent = '';
  if (!items.length) {
    container.textContent = 'Ничего не найдено.';
    return;
  }
  items.forEach((item) => container.appendChild(renderer(item)));
}

async function handleSearch(event) {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  searchResultsSection.hidden = false;
  searchStatus.textContent = 'Запрашиваем подборку у Gemini…';
  searchWorksContainer.textContent = 'Загрузка…';
  searchPersonsContainer.textContent = 'Загрузка…';
  searchCharactersContainer.textContent = 'Загрузка…';

  try {
    const { works, persons, characters } = await searchAll(query);
    const scoredWorks = (works || []).map((work) => ({ ...work, score: Number(work.score || 0).toFixed(2) }));
    searchStatus.textContent = scoredWorks.length ? `Показаны результаты по запросу «${query}».` : 'Gemini не нашёл совпадений, показаны текстовые результаты.';
    renderList(searchWorksContainer, scoredWorks, (work) => {
      const card = renderWorkCard(work);
      if (work.score) {
        const badge = document.createElement('span');
        badge.className = 'score-badge';
        badge.textContent = `${work.score}`;
        card.appendChild(badge);
      }
      const meta = card.querySelector('.card__meta');
      if (meta) {
        const parts = [];
        if (work.release_year) parts.push(work.release_year);
        if (work.type) parts.push(getTypeLabel(work.type));
        if (work.rating) parts.push(`★ ${Number(work.rating).toFixed(1)}`);
        if (work.age_rating) parts.push(work.age_rating);
        meta.textContent = parts.join(' · ');
      }
      return card;
    });
    renderList(searchPersonsContainer, persons || [], renderPersonCard);
    renderList(searchCharactersContainer, characters || [], renderCharacterCard);
  } catch (error) {
    searchStatus.textContent = 'Поиск временно недоступен.';
    searchWorksContainer.textContent = 'Ошибка.';
    searchPersonsContainer.textContent = 'Ошибка.';
    searchCharactersContainer.textContent = 'Ошибка.';
  }
}

function setupSearch() {
  searchForm.addEventListener('submit', handleSearch);
  searchClearBtn.addEventListener('click', () => {
    searchResultsSection.hidden = true;
    searchInput.value = '';
  });
}

function setupTabs() {
  if (!tabsWrapper) return;
  tabsWrapper.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const type = event.target.dataset.type;
    if (!type) return;
    tabsWrapper.querySelectorAll('.tabs__button').forEach((btn) => btn.classList.remove('tabs__button--active'));
    event.target.classList.add('tabs__button--active');
    loadRecentWorks(type);
  });
}

function setupFilters() {
  // Обработчик поиска по названию
  const searchInput = document.getElementById('title-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Обработчик жанров (мульти-выбор)
  genreChipsContainer.addEventListener('click', (e) => {
    if (!e.target.classList.contains('filter-chip')) return;
    
    const genreId = e.target.dataset.genre;
    
    // Если нажали "Все" - сбрасываем выбор
    if (!genreId) {
      selectedGenres = [];
      genreChipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
    } else {
      // Убираем "Все" из активных
      const allChip = genreChipsContainer.querySelector('[data-genre=""]');
      if (allChip) allChip.classList.remove('active');
      
      // Переключаем выбранный жанр
      if (selectedGenres.includes(genreId)) {
        selectedGenres = selectedGenres.filter(g => g !== genreId);
        e.target.classList.remove('active');
        
        // Если ничего не выбрано - активируем "Все"
        if (selectedGenres.length === 0 && allChip) {
          allChip.classList.add('active');
        }
      } else {
        selectedGenres.push(genreId);
        e.target.classList.add('active');
      }
    }
    
    applyFiltersAndSort();
  });
  
  // Обработчик сортировки
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sortType = btn.dataset.sort;
      
      // Если уже активна - меняем направление
      if (btn.classList.contains('active')) {
        const newOrder = btn.dataset.order === 'desc' ? 'asc' : 'desc';
        btn.dataset.order = newOrder;
        currentOrder = newOrder;
      } else {
        // Снимаем активность с других
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = sortType;
        currentOrder = btn.dataset.order;
      }
      
      applyFiltersAndSort();
    });
  });
}

async function init() {
  loadStats(); // Загружаем статистику из БД
  await loadRecentWorks();
  setupTabs();
  setupSearch();
  setupFilters();
  updateAuthNav();
}

// Обновление навигации авторизации
function updateAuthNav() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (token && user.username) {
    navAuth.innerHTML = `
      <span class="nav-user">
        <a href="./profile.html" class="nav-user-link">👤 ${user.displayName || user.username}</a>
        ${user.role === 'admin' ? '<a href="./admin.html" class="nav-admin-btn">Панель управления</a>' : ''}
        <a href="#" class="nav-logout-btn" id="logout-link">Выйти</a>
      </span>
    `;
    
    document.getElementById('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    });
  } else {
    navAuth.innerHTML = '<a href="./login.html" class="top-nav__link">Войти</a>';
  }
}

// Анимация частиц в hero секции
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: rgba(255, 170, 0, ${Math.random() * 0.5 + 0.2});
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: particleFloat ${Math.random() * 10 + 10}s ease-in-out infinite;
      animation-delay: ${Math.random() * 5}s;
    `;
    container.appendChild(particle);
  }
  
  // Добавляем CSS анимацию
  if (!document.getElementById('particle-styles')) {
    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
      @keyframes particleFloat {
        0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        50% { transform: translateY(-100px) translateX(${Math.random() > 0.5 ? '' : '-'}50px); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Анимация счётчика
function animateCounters() {
  const counters = document.querySelectorAll('.hero__stat-number');
  
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const updateCounter = () => {
      current += step;
      if (current < target) {
        counter.textContent = Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target + '+';
      }
    };
    
    // Запуск при появлении в области видимости
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          updateCounter();
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(counter);
  });
}

// Инициализация анимаций hero
function initHeroAnimations() {
  createParticles();
  animateCounters();
}

// Эффект навигации при скролле
function initScrollEffects() {
  const nav = document.getElementById('top-nav');
  const hero = document.querySelector('.hero');
  
  if (!nav || !hero) return;
  
  const heroHeight = hero.offsetHeight;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
  
  // Плавная прокрутка к секции фильмов
  const scrollToWorks = document.getElementById('scroll-to-works');
  if (scrollToWorks) {
    scrollToWorks.addEventListener('click', (e) => {
      e.preventDefault();
      const worksSection = document.getElementById('works');
      if (worksSection) {
        worksSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }
}

// Анимации появления при скролле
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Наблюдаем за карточками и секциями
  document.querySelectorAll('.card, .section__header, .filters-bar, .filter-group').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
  
  // Добавляем стили для анимации
  if (!document.getElementById('scroll-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'scroll-animation-styles';
    style.textContent = `
      .animate-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), 
                    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .animate-on-scroll.animate-visible {
        opacity: 1;
        transform: translateY(0);
      }
      .card.animate-on-scroll {
        transition-delay: calc(var(--card-index, 0) * 0.05s);
      }
    `;
    document.head.appendChild(style);
  }
}

// Индексы для staggered анимаций карточек
function assignCardIndices() {
  document.querySelectorAll('.card-grid .card').forEach((card, index) => {
    card.style.setProperty('--card-index', index % 8);
  });
}

// Наблюдатель за изменениями в grid
function watchCardGrid() {
  const grid = document.getElementById('recent-works-grid');
  if (!grid) return;
  
  const mutationObserver = new MutationObserver(() => {
    assignCardIndices();
    initScrollAnimations();
  });
  
  mutationObserver.observe(grid, { childList: true });
}

// Переключатель темы
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  
  // Синхронизация с html (уже применено в head)
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
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

init();
initHeroAnimations();
initScrollEffects();
initScrollAnimations();
watchCardGrid();
initThemeToggle();
