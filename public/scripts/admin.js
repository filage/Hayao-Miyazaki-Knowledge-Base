// Admin panel script

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Проверка авторизации
if (!token || user.role !== 'admin') {
  alert('Доступ запрещён. Требуются права администратора.');
  window.location.href = '/login.html';
}

// Динамическая навигация
(function updateNav() {
  const navAuth = document.getElementById('nav-auth');
  if (navAuth && user.username) {
    navAuth.innerHTML = `
      <span class="nav-user">
        <a href="./profile.html" class="nav-user-link">👤 ${user.displayName || user.username}</a>
        <a href="./admin.html" class="nav-admin-btn">Панель управления</a>
        <a href="#" class="nav-logout-btn" id="logout-btn">Выйти</a>
      </span>
    `;
  }
})();

// Элементы
const navItems = document.querySelectorAll('.admin-tab');
const sections = document.querySelectorAll('.admin-section');
const modal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-title');
const formFields = document.getElementById('form-fields');
const editForm = document.getElementById('edit-form');

// Кэш данных для выбора
let allPersons = [];
let allCharacters = [];
let allGenres = [];
let allAwards = [];

// API helpers
async function apiRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка запроса');
  }
  return response.json();
}

// Загрузка справочников
async function loadAllData() {
  try {
    [allPersons, allCharacters, allGenres, allAwards] = await Promise.all([
      apiRequest('/api/persons'),
      apiRequest('/api/characters'),
      apiRequest('/api/genres'),
      apiRequest('/api/awards')
    ]);
  } catch (err) {
    console.error('Ошибка загрузки справочников:', err);
  }
}

// Навигация между секциями
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const sectionId = `section-${item.dataset.section}`;
    sections.forEach(s => s.hidden = s.id !== sectionId);
    
    loadSection(item.dataset.section);
  });
});

// Загрузка секций
async function loadSection(section) {
  try {
    switch (section) {
      case 'works':
        await loadWorks();
        break;
      case 'persons':
        await loadPersons();
        break;
      case 'characters':
        await loadCharacters();
        break;
      case 'genres':
        await loadGenres();
        break;
      case 'awards':
        await loadAwards();
        break;
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки данных');
  }
}

// ==================== WORKS ====================
async function loadWorks() {
  const works = await apiRequest('/api/works?limit=100');
  const list = document.getElementById('works-list');
  
  if (works.length === 0) {
    list.innerHTML = '<div class="empty-state"><h3>Фильмы не найдены</h3></div>';
    return;
  }
  
  list.innerHTML = works.map(work => `
    <div class="admin-list-item" data-id="${work.id}">
      <img src="${work.poster_url || '/assets/posters/placeholder.jpg'}" alt="${work.title_ru}">
      <div class="admin-list-item-info">
        <h3 class="admin-list-item-title">${work.title_ru}</h3>
        <p class="admin-list-item-meta">${work.release_year || ''} • ${work.type || ''}</p>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="editWork('${work.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-small" onclick="deleteWork('${work.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

window.editWork = async function(id) {
  const work = await apiRequest(`/api/works/${id}`);
  openModal('Редактирование фильма', 'work', work);
};

window.deleteWork = async function(id) {
  if (!confirm('Удалить этот фильм?')) return;
  await apiRequest(`/api/admin/works/${id}`, 'DELETE');
  loadWorks();
};

document.getElementById('add-work-btn').addEventListener('click', () => {
  openModal('Новый фильм', 'work', {});
});

// ==================== PERSONS ====================
const roleLabels = {
  director: 'Режиссёр',
  screenwriter: 'Сценарист',
  producer: 'Продюсер',
  composer: 'Композитор',
  cinematographer: 'Оператор',
  art_director: 'Художник',
  editor: 'Монтажёр',
  animator: 'Аниматор',
  voice_actor: 'Актёр озвучки'
};

function formatRoles(roles) {
  if (!roles?.roles || !Array.isArray(roles.roles)) return '';
  return roles.roles.map(r => roleLabels[r] || r).join(', ');
}

async function loadPersons() {
  const persons = await apiRequest('/api/persons');
  const list = document.getElementById('persons-list');
  
  list.innerHTML = persons.map(person => `
    <div class="admin-list-item" data-id="${person.id}">
      <img src="${person.photo_url || '/assets/people/placeholder.svg'}" alt="${person.full_name_ru}">
      <div class="admin-list-item-info">
        <h3 class="admin-list-item-title">${person.full_name_ru}</h3>
        <p class="admin-list-item-meta">${formatRoles(person.roles) || person.country || ''}</p>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="editPerson('${person.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-small" onclick="deletePerson('${person.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

window.editPerson = async function(id) {
  const person = await apiRequest(`/api/persons/${id}`);
  openModal('Редактирование персоны', 'person', person);
};

window.deletePerson = async function(id) {
  if (!confirm('Удалить эту персону?')) return;
  await apiRequest(`/api/admin/persons/${id}`, 'DELETE');
  loadPersons();
};

document.getElementById('add-person-btn').addEventListener('click', () => {
  openModal('Новая персона', 'person', {});
});

// ==================== CHARACTERS ====================
function getCharacterWorks(char) {
  if (char.works && Array.isArray(char.works) && char.works.length > 0) {
    return char.works.map(w => w.title_ru).join(', ');
  }
  return char.first_appearance_year || '';
}

async function loadCharacters() {
  const characters = await apiRequest('/api/characters');
  const list = document.getElementById('characters-list');
  
  list.innerHTML = characters.map(char => `
    <div class="admin-list-item" data-id="${char.id}">
      <img src="${char.image_url || '/assets/characters/placeholder.svg'}" alt="${char.name_ru}">
      <div class="admin-list-item-info">
        <h3 class="admin-list-item-title">${char.name_ru}</h3>
        <p class="admin-list-item-meta">${getCharacterWorks(char)}</p>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="editCharacter('${char.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-small" onclick="deleteCharacter('${char.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

window.editCharacter = async function(id) {
  const char = await apiRequest(`/api/characters/${id}`);
  openModal('Редактирование персонажа', 'character', char);
};

window.deleteCharacter = async function(id) {
  if (!confirm('Удалить этого персонажа?')) return;
  await apiRequest(`/api/admin/characters/${id}`, 'DELETE');
  loadCharacters();
};

document.getElementById('add-character-btn').addEventListener('click', () => {
  openModal('Новый персонаж', 'character', {});
});

// ==================== GENRES ====================
async function loadGenres() {
  const genres = await apiRequest('/api/genres');
  const list = document.getElementById('genres-list');
  
  list.innerHTML = genres.map(genre => `
    <div class="admin-list-item" data-id="${genre.id}">
      <div class="admin-list-item-info">
        <h3 class="admin-list-item-title">${genre.title_ru}</h3>
        <p class="admin-list-item-meta">${genre.code} • ${genre.category || ''}</p>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="editGenre('${genre.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-small" onclick="deleteGenre('${genre.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

window.editGenre = async function(id) {
  const genre = await apiRequest(`/api/genres/${id}`);
  openModal('Редактирование жанра', 'genre', genre);
};

window.deleteGenre = async function(id) {
  if (!confirm('Удалить этот жанр?')) return;
  await apiRequest(`/api/admin/genres/${id}`, 'DELETE');
  loadGenres();
};

document.getElementById('add-genre-btn').addEventListener('click', () => {
  openModal('Новый жанр', 'genre', {});
});

// ==================== AWARDS ====================
async function loadAwards() {
  const awards = await apiRequest('/api/awards');
  const list = document.getElementById('awards-list');
  
  list.innerHTML = awards.map(award => `
    <div class="admin-list-item" data-id="${award.id}">
      <div class="admin-list-item-info">
        <h3 class="admin-list-item-title">${award.name}</h3>
        <p class="admin-list-item-meta">${award.presented_by || ''} • ${award.year_started || ''}</p>
      </div>
      <div class="admin-list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="editAward('${award.id}')">✏️ Изменить</button>
        <button class="btn btn-danger btn-small" onclick="deleteAward('${award.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');
}

window.editAward = async function(id) {
  const award = await apiRequest(`/api/awards/${id}`);
  openModal('Редактирование награды', 'award', award);
};

window.deleteAward = async function(id) {
  if (!confirm('Удалить эту награду?')) return;
  await apiRequest(`/api/admin/awards/${id}`, 'DELETE');
  loadAwards();
};

document.getElementById('add-award-btn').addEventListener('click', () => {
  openModal('Новая награда', 'award', {});
});

// ==================== MODAL ====================
let currentEditType = '';
let currentEditId = null;

function openModal(title, type, data) {
  currentEditType = type;
  currentEditId = data.id || null;
  modalTitle.textContent = title;
  
  const fields = getFormFields(type, data);
  formFields.innerHTML = fields;
  
  // Обработчик для включения/отключения поля года награды
  formFields.querySelectorAll('.award-item-select input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const container = e.target.closest('.award-item-select');
      const yearInput = container.querySelector('.award-year-input');
      if (e.target.checked) {
        yearInput.disabled = false;
        container.classList.add('selected');
        if (!yearInput.value) yearInput.value = data.release_year || new Date().getFullYear();
      } else {
        yearInput.disabled = true;
        container.classList.remove('selected');
      }
    });
  });
  
  // Обработчик поиска для съёмочной группы
  formFields.querySelectorAll('.crew-search').forEach(input => {
    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const role = e.target.dataset.role;
      const grid = formFields.querySelector(`.crew-grid[data-role="${role}"]`);
      
      grid.querySelectorAll('.checkbox-item').forEach(item => {
        const name = item.dataset.name || '';
        const isChecked = item.querySelector('input').checked;
        // Показываем если: нет запроса, совпадает с поиском, или уже выбран
        if (!query || name.includes(query) || isChecked) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
  
  modal.classList.add('active');
  
  // Инициализируем обработчики загрузки изображений
  setTimeout(() => setupImageUploads(), 100);
}

function closeModal() {
  modal.classList.remove('active');
  currentEditType = '';
  currentEditId = null;
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

function getFormFields(type, data) {
  switch (type) {
    case 'work':
      const currentPersons = data.persons || [];
      const hasPersonRole = (role, personId) => currentPersons.some(p => p.role === role && p.id === personId);
      
      // Функция для создания checkbox-сетки для ролей с поиском
      const crewCheckboxGrid = (role, label) => `
        <div class="form-row crew-section">
          <label>${label}</label>
          <input type="text" class="crew-search" data-role="${role}" placeholder="🔍 Поиск...">
          <div class="checkbox-grid crew-grid" data-role="${role}">
            ${allPersons.map(p => `
              <label class="checkbox-item" data-name="${p.full_name_ru.toLowerCase()}">
                <input type="checkbox" name="crew_${role}" value="${p.id}" ${hasPersonRole(role, p.id) ? 'checked' : ''}>
                <span>${p.full_name_ru}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
      
      return `
        <div class="form-row">
          <label>Название (рус)</label>
          <input type="text" name="title_ru" value="${data.title_ru || ''}" required>
        </div>
        <div class="form-row">
          <label>Название (англ)</label>
          <input type="text" name="title_en" value="${data.title_en || ''}">
        </div>
        <div class="form-row-half">
          <div class="form-row">
            <label>Год выпуска</label>
            <input type="number" name="release_year" value="${data.release_year || ''}">
          </div>
          <div class="form-row">
            <label>Тип</label>
            <select name="type">
              <option value="feature" ${data.type === 'feature' ? 'selected' : ''}>Полнометражный</option>
              <option value="short" ${data.type === 'short' ? 'selected' : ''}>Короткометражка</option>
              <option value="series" ${data.type === 'series' ? 'selected' : ''}>Сериал</option>
            </select>
          </div>
        </div>
        
        <h3 class="form-section-title">Съёмочная группа</h3>
        ${crewCheckboxGrid('director', 'Режиссёры')}
        ${crewCheckboxGrid('screenwriter', 'Сценаристы')}
        ${crewCheckboxGrid('producer', 'Продюсеры')}
        ${crewCheckboxGrid('composer', 'Композиторы')}
        ${crewCheckboxGrid('cinematographer', 'Операторы')}
        ${crewCheckboxGrid('art_director', 'Художники')}
        ${crewCheckboxGrid('editor', 'Монтажёры')}
        
        <h3 class="form-section-title">Персонажи</h3>
        <div class="form-row">
          <label>Персонажи фильма</label>
          <div class="checkbox-grid">
            ${allCharacters.map(c => `
              <label class="checkbox-item">
                <input type="checkbox" name="character_ids" value="${c.id}" ${data.characters?.some(dc => dc.id === c.id) ? 'checked' : ''}>
                <span>${c.name_ru}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <h3 class="form-section-title">Жанры</h3>
        <div class="form-row">
          <label>Жанры фильма</label>
          <div class="checkbox-grid">
            ${allGenres.map(g => `
              <label class="checkbox-item">
                <input type="checkbox" name="genre_ids" value="${g.id}" ${data.genres?.some(dg => dg.id === g.id) ? 'checked' : ''}>
                <span>${g.title_ru}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <h3 class="form-section-title">Награды</h3>
        <div class="form-row">
          <label>Награды фильма (укажите год получения)</label>
          <div class="awards-grid">
            ${allAwards.map(a => {
              const existingAward = data.awards?.find(da => da.id === a.id);
              return `
              <div class="award-item-select ${existingAward ? 'selected' : ''}">
                <label class="checkbox-item">
                  <input type="checkbox" name="award_ids" value="${a.id}" ${existingAward ? 'checked' : ''}>
                  <span>${a.name}</span>
                </label>
                <input type="number" name="award_year_${a.id}" class="award-year-input" 
                       placeholder="Год" min="1900" max="2100" 
                       value="${existingAward?.award_year || data.release_year || ''}"
                       ${existingAward ? '' : 'disabled'}>
              </div>
            `}).join('')}
          </div>
        </div>
        
        <h3 class="form-section-title">Описание</h3>
        <div class="form-row">
          <label>Синопсис</label>
          <textarea name="synopsis">${data.synopsis || ''}</textarea>
        </div>
        
        <h3 class="form-section-title">Медиа</h3>
        <div class="form-row">
          <label>Постер</label>
          <div class="image-upload-container">
            <input type="hidden" name="poster_url" value="${data.poster_url || ''}">
            <div class="image-preview ${data.poster_url ? '' : 'empty'}" id="poster-preview">
              ${data.poster_url ? `<img src="${data.poster_url}" alt="Превью">` : '<span>Нет изображения</span>'}
            </div>
            <div class="image-upload-actions">
              <label class="btn btn-secondary btn-upload">
                <input type="file" accept="image/*" data-upload-type="posters" data-target="poster_url" hidden>
                📁 Выбрать файл
              </label>
              <input type="text" name="poster_url_manual" placeholder="Или введите URL" value="${data.poster_url || ''}" class="url-input">
            </div>
          </div>
        </div>
        <div class="form-row">
          <label>URL трейлера (YouTube)</label>
          <input type="text" name="trailer_url" value="${data.trailer_url || ''}">
        </div>
        
        <h3 class="form-section-title">Детали</h3>
        <div class="form-row-half">
          <div class="form-row">
            <label>Длительность (мин)</label>
            <input type="number" name="runtime_minutes" value="${data.runtime_minutes || ''}">
          </div>
          <div class="form-row">
            <label>Рейтинг</label>
            <input type="number" step="0.1" min="0" max="10" name="rating" value="${data.rating || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Возрастной рейтинг</label>
          <input type="text" name="age_rating" value="${data.age_rating || ''}">
        </div>
        <div class="form-row">
          <label>Премьера в мире</label>
          <input type="date" name="world_premiere" value="${data.world_premiere?.split('T')[0] || ''}">
        </div>
        <div class="form-row-half">
          <div class="form-row">
            <label>Бюджет ($)</label>
            <input type="number" name="budget" value="${data.budget || ''}">
          </div>
          <div class="form-row">
            <label>Сборы в мире ($)</label>
            <input type="number" name="box_office" value="${data.box_office || ''}">
          </div>
        </div>
      `;
    case 'person':
      const personRoles = data.roles?.roles || [];
      const availableRoles = [
        { value: 'director', label: 'Режиссёр' },
        { value: 'screenwriter', label: 'Сценарист' },
        { value: 'producer', label: 'Продюсер' },
        { value: 'composer', label: 'Композитор' },
        { value: 'cinematographer', label: 'Оператор' },
        { value: 'art_director', label: 'Художник' },
        { value: 'editor', label: 'Монтажёр' },
        { value: 'animator', label: 'Аниматор' },
        { value: 'voice_actor', label: 'Актёр озвучки' }
      ];
      
      return `
        <div class="form-row">
          <label>Имя (рус)</label>
          <input type="text" name="full_name_ru" value="${data.full_name_ru || ''}" required>
        </div>
        <div class="form-row">
          <label>Имя (англ)</label>
          <input type="text" name="full_name_en" value="${data.full_name_en || ''}">
        </div>
        <div class="form-row">
          <label>Роли</label>
          <div class="checkbox-grid roles-grid">
            ${availableRoles.map(r => `
              <label class="checkbox-item">
                <input type="checkbox" name="person_roles" value="${r.value}" ${personRoles.includes(r.value) ? 'checked' : ''}>
                <span>${r.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-row">
          <label>Биография</label>
          <textarea name="biography">${data.biography || ''}</textarea>
        </div>
        <div class="form-row-half">
          <div class="form-row">
            <label>Дата рождения</label>
            <input type="date" name="birth_date" value="${data.birth_date?.split('T')[0] || ''}">
          </div>
          <div class="form-row">
            <label>Страна</label>
            <input type="text" name="country" value="${data.country || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Фото</label>
          <div class="image-upload-container">
            <input type="hidden" name="photo_url" value="${data.photo_url || ''}">
            <div class="image-preview ${data.photo_url ? '' : 'empty'}" id="photo-preview">
              ${data.photo_url ? `<img src="${data.photo_url}" alt="Превью">` : '<span>Нет фото</span>'}
            </div>
            <div class="image-upload-actions">
              <label class="btn btn-secondary btn-upload">
                <input type="file" accept="image/*" data-upload-type="people" data-target="photo_url" hidden>
                📁 Выбрать файл
              </label>
              <input type="text" name="photo_url_manual" placeholder="Или введите URL" value="${data.photo_url || ''}" class="url-input">
            </div>
          </div>
        </div>
      `;
    case 'character':
      return `
        <div class="form-row">
          <label>Имя (рус)</label>
          <input type="text" name="name_ru" value="${data.name_ru || ''}" required>
        </div>
        <div class="form-row">
          <label>Имя (англ)</label>
          <input type="text" name="name_en" value="${data.name_en || ''}">
        </div>
        <div class="form-row">
          <label>Описание</label>
          <textarea name="description">${data.description || ''}</textarea>
        </div>
        <div class="form-row">
          <label>Изображение</label>
          <div class="image-upload-container">
            <input type="hidden" name="image_url" value="${data.image_url || ''}">
            <div class="image-preview ${data.image_url ? '' : 'empty'}" id="image-preview">
              ${data.image_url ? `<img src="${data.image_url}" alt="Превью">` : '<span>Нет изображения</span>'}
            </div>
            <div class="image-upload-actions">
              <label class="btn btn-secondary btn-upload">
                <input type="file" accept="image/*" data-upload-type="characters" data-target="image_url" hidden>
                📁 Выбрать файл
              </label>
              <input type="text" name="image_url_manual" placeholder="Или введите URL" value="${data.image_url || ''}" class="url-input">
            </div>
          </div>
        </div>
        <div class="form-row">
          <label>Год первого появления</label>
          <input type="number" name="first_appearance_year" value="${data.first_appearance_year || ''}">
        </div>
      `;
    case 'genre':
      return `
        <div class="form-row">
          <label>Код</label>
          <input type="text" name="code" value="${data.code || ''}" required>
        </div>
        <div class="form-row">
          <label>Название (рус)</label>
          <input type="text" name="title_ru" value="${data.title_ru || ''}" required>
        </div>
        <div class="form-row">
          <label>Название (англ)</label>
          <input type="text" name="title_en" value="${data.title_en || ''}">
        </div>
        <div class="form-row">
          <label>Описание</label>
          <textarea name="description">${data.description || ''}</textarea>
        </div>
        <div class="form-row">
          <label>Категория</label>
          <input type="text" name="category" value="${data.category || ''}">
        </div>
      `;
    case 'award':
      return `
        <div class="form-row">
          <label>Название</label>
          <input type="text" name="name" value="${data.name || ''}" required>
        </div>
        <div class="form-row">
          <label>Категория</label>
          <input type="text" name="category" value="${data.category || ''}">
        </div>
        <div class="form-row">
          <label>Вручается</label>
          <input type="text" name="presented_by" value="${data.presented_by || ''}">
        </div>
        <div class="form-row-half">
          <div class="form-row">
            <label>Год основания</label>
            <input type="number" name="year_started" value="${data.year_started || ''}">
          </div>
          <div class="form-row">
            <label>Уровень престижа (1-5)</label>
            <input type="number" min="1" max="5" name="prestige_level" value="${data.prestige_level || ''}">
          </div>
        </div>
        <div class="form-row">
          <label>Местоположение</label>
          <input type="text" name="location" value="${data.location || ''}">
        </div>
        <div class="form-row">
          <label>Описание</label>
          <textarea name="description">${data.description || ''}</textarea>
        </div>
      `;
    default:
      return '';
  }
}

// Обработчик загрузки изображений
function setupImageUploads() {
  const fileInputs = document.querySelectorAll('input[type="file"][data-upload-type]');
  
  fileInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const uploadType = input.dataset.uploadType;
      const targetField = input.dataset.target;
      const container = input.closest('.image-upload-container');
      const preview = container.querySelector('.image-preview');
      const hiddenInput = container.querySelector(`input[name="${targetField}"]`);
      const manualInput = container.querySelector(`input[name="${targetField}_manual"]`);
      
      // Показываем загрузку
      preview.innerHTML = '<span>Загрузка...</span>';
      preview.classList.add('loading');
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`/api/upload/${uploadType}`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Ошибка загрузки');
        }
        
        const result = await response.json();
        
        // Обновляем превью и поля
        preview.innerHTML = `<img src="${result.url}" alt="Превью">`;
        preview.classList.remove('empty', 'loading');
        hiddenInput.value = result.url;
        if (manualInput) manualInput.value = result.url;
        
      } catch (err) {
        preview.innerHTML = `<span style="color: #e74c3c;">Ошибка: ${err.message}</span>`;
        preview.classList.remove('loading');
      }
    });
  });
  
  // Обработчик ручного ввода URL
  const manualInputs = document.querySelectorAll('input.url-input');
  manualInputs.forEach(input => {
    input.addEventListener('blur', () => {
      const container = input.closest('.image-upload-container');
      const targetName = input.name.replace('_manual', '');
      const hiddenInput = container.querySelector(`input[name="${targetName}"]`);
      const preview = container.querySelector('.image-preview');
      
      if (input.value) {
        hiddenInput.value = input.value;
        preview.innerHTML = `<img src="${input.value}" alt="Превью" onerror="this.parentElement.innerHTML='<span>Неверный URL</span>'">`;
        preview.classList.remove('empty');
      }
    });
  });
}

// Сохранение формы
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(editForm);
  const data = Object.fromEntries(formData.entries());
  
  // Обработка ролей для персон (из чекбоксов)
  const personRolesChecked = Array.from(editForm.querySelectorAll('input[name="person_roles"]:checked')).map(cb => cb.value);
  if (personRolesChecked.length > 0) {
    data.roles = { roles: personRolesChecked };
  } else if (currentEditType === 'person') {
    // Если персона без ролей, устанавливаем пустой массив
    data.roles = { roles: [] };
  }
  delete data.person_roles;
  
  // Получение отмеченных чекбоксов
  const characterIds = Array.from(editForm.querySelectorAll('input[name="character_ids"]:checked')).map(cb => cb.value);
  const genreIds = Array.from(editForm.querySelectorAll('input[name="genre_ids"]:checked')).map(cb => cb.value);
  
  // Собираем награды с годами
  const awards = Array.from(editForm.querySelectorAll('input[name="award_ids"]:checked')).map(cb => {
    const awardId = cb.value;
    const yearInput = editForm.querySelector(`input[name="award_year_${awardId}"]`);
    return {
      awardId,
      year: yearInput?.value ? parseInt(yearInput.value) : new Date().getFullYear()
    };
  });
  
  // Удаляем из data поля связей и годов наград
  delete data.character_ids;
  delete data.genre_ids;
  delete data.award_ids;
  Object.keys(data).forEach(key => {
    if (key.startsWith('award_year_')) delete data[key];
  });
  
  // Собираем персоны съёмочной группы из чекбоксов
  const crewRoles = ['director', 'screenwriter', 'producer', 'composer', 'cinematographer', 'art_director', 'editor'];
  
  const persons = [];
  crewRoles.forEach(role => {
    const checkboxes = editForm.querySelectorAll(`input[name="crew_${role}"]:checked`);
    checkboxes.forEach((cb, index) => {
      persons.push({ 
        personId: cb.value, 
        role: role === 'art_director' ? 'art_director' : role,
        isPrimary: index === 0 // Первый выбранный — главный
      });
    });
    // Удаляем поля из data
    delete data[`crew_${role}`];
  });
  
  // Преобразование пустых строк в null и удаление _manual полей
  Object.keys(data).forEach(key => {
    if (key.endsWith('_manual')) {
      delete data[key];
    } else if (data[key] === '') {
      data[key] = null;
    }
  });
  
  try {
    let workId = currentEditId;
    const endpoint = `/api/admin/${currentEditType}s`;
    
    if (currentEditType === 'work') {
      // Сохраняем фильм
      if (currentEditId) {
        await apiRequest(`${endpoint}/${currentEditId}`, 'PUT', data);
      } else {
        const result = await apiRequest(endpoint, 'POST', data);
        workId = result.id;
      }
      
      // Сохраняем связи (персоны, персонажи, жанры, награды)
      await apiRequest(`/api/admin/works/${workId}/relations`, 'PUT', {
        persons,
        characterIds,
        genreIds,
        awards
      });
    } else {
      console.log('Сохранение:', currentEditType, data);
      if (currentEditId) {
        await apiRequest(`${endpoint}/${currentEditId}`, 'PUT', data);
      } else {
        await apiRequest(endpoint, 'POST', data);
      }
    }
    
    closeModal();
    
    // Перезагружаем нужную секцию
    const sectionName = currentEditType + 's';
    loadSection(sectionName);
    
    // Также обновляем кэш для выбора в формах
    await loadAllData();
  } catch (err) {
    alert('Ошибка сохранения: ' + err.message);
  }
});

// Выход
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (err) {}
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
});

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

// ==================== SEARCH ====================
function initSearch() {
  // Поиск по фильмам
  document.getElementById('search-works')?.addEventListener('input', (e) => {
    filterList('works-list', e.target.value, '.admin-list-item-title');
  });
  
  // Поиск по персонам
  document.getElementById('search-persons')?.addEventListener('input', (e) => {
    filterList('persons-list', e.target.value, '.admin-list-item-title');
  });
  
  // Поиск по персонажам
  document.getElementById('search-characters')?.addEventListener('input', (e) => {
    filterList('characters-list', e.target.value, '.admin-list-item-title');
  });
  
  // Поиск по жанрам
  document.getElementById('search-genres')?.addEventListener('input', (e) => {
    filterList('genres-list', e.target.value, '.admin-list-item-title');
  });
  
  // Поиск по наградам
  document.getElementById('search-awards')?.addEventListener('input', (e) => {
    filterList('awards-list', e.target.value, '.admin-list-item-title');
  });
}

function filterList(listId, query, titleSelector) {
  const list = document.getElementById(listId);
  if (!list) return;
  
  const items = list.querySelectorAll('.admin-list-item');
  const searchQuery = query.toLowerCase().trim();
  
  items.forEach(item => {
    const title = item.querySelector(titleSelector)?.textContent?.toLowerCase() || '';
    const meta = item.querySelector('.admin-list-item-meta')?.textContent?.toLowerCase() || '';
    
    if (searchQuery === '' || title.includes(searchQuery) || meta.includes(searchQuery)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
  
  // Показать сообщение если ничего не найдено
  const visibleItems = list.querySelectorAll('.admin-list-item:not(.hidden)');
  let noResults = list.querySelector('.no-results');
  
  if (visibleItems.length === 0 && searchQuery !== '') {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'no-results empty-state';
      noResults.innerHTML = '<h3>Ничего не найдено</h3><p>Попробуйте изменить поисковый запрос</p>';
      list.appendChild(noResults);
    }
    noResults.style.display = 'block';
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

// Загрузка при старте
async function init() {
  await loadAllData();
  await loadWorks();
  initThemeToggle();
  initSearch();
}
init();
