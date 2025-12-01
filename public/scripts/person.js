import { getTypeLabel } from './renderers.js';

const nameNode = document.querySelector('#person-name');
const metaNode = document.querySelector('#person-meta');
const bioNode = document.querySelector('#person-bio');
const countryNode = document.querySelector('#person-country');
const birthNode = document.querySelector('#person-birth');
const rolesNode = document.querySelector('#person-roles');
const rolesTagsContainer = document.querySelector('#person-roles-tags');
const photoNode = document.querySelector('#person-photo');
const linksContainer = document.querySelector('#person-links');
const worksContainer = document.querySelector('#person-works');
const awardsContainer = document.querySelector('#person-awards');

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function createDetailCard({ title, meta, text, href }) {
  const card = document.createElement('article');
  card.className = 'detail-card';
  const heading = document.createElement('h3');
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    heading.appendChild(link);
  } else {
    heading.textContent = title;
  }
  const metaEl = document.createElement('p');
  metaEl.className = 'detail-card__meta';
  metaEl.textContent = meta || '';
  const textEl = document.createElement('p');
  textEl.className = 'detail-card__text';
  textEl.textContent = text || '';
  card.append(heading, metaEl, textEl);
  return card;
}

function renderList(container, items, renderItem, emptyMessage) {
  container.textContent = '';
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  items.forEach((item) => container.appendChild(renderItem(item)));
}

function renderWorks(works = []) {
  renderList(
    worksContainer,
    works,
    (work) =>
      createDetailCard({
        title: work.title_ru || work.title_en,
        meta: [work.release_year, work.type ? getTypeLabel(work.type) : null, work.role].filter(Boolean).join(' · '),
        text: work.synopsis ? `${work.synopsis.slice(0, 140)}${work.synopsis.length > 140 ? '…' : ''}` : '',
        href: `./work.html?id=${encodeURIComponent(work.id)}`,
      }),
    'Произведения ещё не добавлены.'
  );
}

function renderAwards(awards = []) {
  renderList(
    awardsContainer,
    awards,
    (award) =>
      createDetailCard({
        title: award.name,
        meta: [award.award_year, award.result].filter(Boolean).join(' · '),
        text: award.category || award.presented_by,
      }),
    'Награды ещё не добавлены.'
  );
}

async function loadPerson() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    nameNode.textContent = 'ID персоны не указан';
    return;
  }

  try {
    const response = await fetch(`/api/persons/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Failed to load person');
    const person = await response.json();

    nameNode.textContent = person.full_name_ru || person.full_name_en;
    const metaParts = [];
    if (person.country) metaParts.push(person.country);
    if (person.birth_date) metaParts.push(new Date(person.birth_date).getFullYear());
    metaNode.textContent = metaParts.join(' · ');

    bioNode.textContent = person.biography || 'Биография будет добавлена позднее.';
    countryNode.textContent = person.country || '—';
    birthNode.textContent = formatDate(person.birth_date);

    const rolesArray = Array.isArray(person.roles?.roles) ? person.roles.roles : person.roles;
    if (Array.isArray(rolesArray)) {
      rolesNode.textContent = rolesArray.join(', ');
      rolesTagsContainer.textContent = '';
      rolesArray.forEach((role) => {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = role;
        rolesTagsContainer.appendChild(pill);
      });
    } else {
      rolesNode.textContent = typeof rolesArray === 'string' ? rolesArray : '—';
      rolesTagsContainer.textContent = 'Роли не указаны.';
    }

    if (person.photo_url) {
      photoNode.src = person.photo_url;
      photoNode.alt = person.full_name_ru || person.full_name_en;
      photoNode.hidden = false;
    } else {
      photoNode.hidden = true;
    }

    linksContainer.textContent = '';
    if (person.website) {
      const link = document.createElement('a');
      link.href = person.website;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Официальный сайт';
      linksContainer.appendChild(link);
    }

    renderWorks(person.works || []);
    renderAwards(person.awards || []);
  } catch (error) {
    console.error(error);
    nameNode.textContent = 'Не удалось загрузить данные персоны.';
  }
}

loadPerson();
