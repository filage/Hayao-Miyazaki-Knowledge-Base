const TYPE_LABELS = {
  feature: 'Полнометражный фильм',
  short: 'Короткометражка',
  series: 'Сериал',
  manga: 'Манга',
  other: 'Проект',
};

export function getTypeLabel(type) {
  if (!type) return 'Произведение';
  return TYPE_LABELS[type] || 'Произведение';
}

function createElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

export function renderWorkCard(work) {
  const wrapper = document.createElement('a');
  wrapper.className = 'card card--link';
  wrapper.href = `./film.html?id=${encodeURIComponent(work.id)}`;
  wrapper.dataset.workType = work.type || '';

  // Контейнер для постера и бейджей
  const posterContainer = createElement('div', 'card__poster-container');
  
  if (work.poster_url) {
    const poster = document.createElement('img');
    poster.className = 'card__media';
    poster.src = work.poster_url;
    poster.alt = work.title_ru || work.title_en;
    poster.loading = 'lazy';
    poster.onerror = () => {
      poster.remove();
      posterContainer.prepend(createElement('div', 'card__media card__media--placeholder', 'Постер появится позже'));
    };
    posterContainer.appendChild(poster);
  } else {
    const placeholder = createElement('div', 'card__media card__media--placeholder', 'Постер появится позже');
    posterContainer.appendChild(placeholder);
  }

  // Бейджи на постере
  if (work.rating) {
    const ratingBadge = createElement('span', 'card__overlay-badge card__overlay-badge--rating');
    ratingBadge.innerHTML = `<span class="rating-star">★</span> ${Number(work.rating).toFixed(1)}`;
    posterContainer.appendChild(ratingBadge);
  }
  if (work.age_rating) {
    const ageBadge = createElement('span', 'card__overlay-badge card__overlay-badge--age', work.age_rating);
    posterContainer.appendChild(ageBadge);
  }

  wrapper.appendChild(posterContainer);

  // Текстовый контент
  const content = createElement('div', 'card__content');
  const title = createElement('h3', 'card__title', work.title_ru || work.title_en);
  const metaParts = [];
  if (work.release_year) metaParts.push(work.release_year);
  if (work.type) metaParts.push(getTypeLabel(work.type));
  const meta = createElement('p', 'card__meta', metaParts.join(' · '));
  const synopsis = createElement('p', 'card__text');
  synopsis.textContent = work.synopsis ? `${work.synopsis.slice(0, 100)}${work.synopsis.length > 100 ? '…' : ''}` : '';

  content.append(title, meta);
  if (synopsis.textContent) content.appendChild(synopsis);
  wrapper.appendChild(content);
  
  return wrapper;
}

export function renderGenrePill(genre) {
  const pill = createElement('div', 'pill');
  pill.dataset.genreId = genre.id;
  const title = createElement('span', 'pill__title', genre.title_ru || genre.title_en);
  const category = createElement('span', 'pill__meta', genre.category ? ` · ${genre.category}` : '');
  pill.append(title, category);
  return pill;
}

export function renderAwardCard(award) {
  const card = createElement('article', 'card');
  const title = createElement('h3', 'card__title', award.name);
  const meta = createElement(
    'p',
    'card__meta',
    [award.category, award.location]
      .filter(Boolean)
      .join(' · ')
  );
  const description = createElement('p', 'card__text');
  description.textContent = award.description ? `${award.description.slice(0, 120)}${award.description.length > 120 ? '…' : ''}` : 'Описание пока отсутствует';

  card.append(title, meta, description);
  return card;
}

const roleTranslations = {
  'director': 'Режиссёр',
  'screenwriter': 'Сценарист',
  'producer': 'Продюсер',
  'animator': 'Аниматор',
  'composer': 'Композитор',
  'conductor': 'Дирижёр',
  'voice actor': 'Актёр озвучивания',
  'key animator': 'Ключевой аниматор',
  'art director': 'Художник-постановщик',
  'background artist': 'Художник фонов',
  'character designer': 'Дизайнер персонажей',
  'animation director': 'Режиссёр анимации',
  'studio executive': 'Руководитель студии',
  'creative advisor': 'Креативный консультант'
};

function translateRole(role) {
  return roleTranslations[role.toLowerCase()] || role;
}

export function renderPersonCard(person) {
  const wrapper = createElement('article', 'detail-card');
  const title = createElement('h3', null, person.full_name_ru || person.full_name_en);
  const metaParts = [];
  if (person.birth_date) metaParts.push(new Date(person.birth_date).getFullYear());
  if (person.country) metaParts.push(person.country);
  const meta = createElement('p', 'list-card__meta', metaParts.join(' · '));
  
  const roles = Array.isArray(person.roles?.roles) 
    ? person.roles.roles.map(translateRole).join(', ') 
    : person.roles ?? '';
  const text = createElement('p', 'card__text', roles || 'Роли не указаны');

  wrapper.append(title, meta, text);
  return wrapper;
}

export function renderCharacterCard(character) {
  const card = createElement('article', 'list-card');
  
  if (character.image_url) {
    const img = document.createElement('img');
    img.className = 'list-card__image';
    img.src = character.image_url;
    img.alt = character.name_ru || character.name_en;
    card.appendChild(img);
  }
  
  const title = createElement('h3', 'list-card__title', character.name_ru || character.name_en);
  
  const metaParts = [];
  if (character.works && character.works.length > 0) {
    const work = character.works[0];
    metaParts.push(`Из: ${work.title_ru || work.title_en}`);
  }
  if (character.first_appearance_year) {
    metaParts.push(character.first_appearance_year);
  }
  const meta = createElement('p', 'list-card__meta', metaParts.join(' · '));
  
  const description = createElement('p', 'card__text');
  description.textContent = character.description ? `${character.description.slice(0, 140)}${character.description.length > 140 ? '…' : ''}` : 'Описание пока отсутствует';

  card.append(title, meta, description);
  return card;
}

export function renderGenreCard(genre) {
  const card = createElement('article', 'list-card');
  const title = createElement('h3', 'list-card__title', genre.title_ru || genre.title_en);
  const meta = createElement('p', 'list-card__meta', genre.category || '');
  const description = createElement('p', 'card__text', genre.description || 'Описание будет добавлено позднее');
  card.append(title, meta, description);
  return card;
}

export function renderAwardListCard(award) {
  const card = createElement('article', 'list-card');
  const title = createElement('h3', 'list-card__title', award.name);
  const metaParts = [];
  if (award.category) metaParts.push(award.category);
  if (award.presented_by) metaParts.push(award.presented_by);
  if (award.location) metaParts.push(award.location);
  if (award.year_started) metaParts.push(`С ${award.year_started}`);
  const meta = createElement('p', 'list-card__meta', metaParts.join(' · '));
  
  const description = createElement('p', 'card__text', award.description || 'Описание будет добавлено позднее');
  
  // Add works information if available
  if (award.works && award.works.length > 0) {
    const worksTitle = createElement('p', 'card__text');
    worksTitle.style.fontWeight = '600';
    worksTitle.style.marginTop = '12px';
    worksTitle.textContent = 'Награждённые работы:';
    card.appendChild(worksTitle);
    
    award.works.forEach(work => {
      const workItem = createElement('p', 'card__text');
      workItem.style.fontSize = '0.9rem';
      workItem.style.marginTop = '4px';
      const resultText = work.result === 'winner' ? '🏆 Победитель' : '📋 Номинант';
      workItem.textContent = `${work.award_year}: ${work.work_title_ru || work.work_title_en} — ${resultText}`;
      card.appendChild(workItem);
    });
  }
  
  card.append(title, meta, description);
  return card;
}
