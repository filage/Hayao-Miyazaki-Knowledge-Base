import { fetchWorks, fetchPersons, fetchCharacters, searchAll } from './api.js';
import { renderWorkCard, renderPersonCard, renderCharacterCard } from './renderers.js';

const form = document.querySelector('#search-page-form');
const queryInput = document.querySelector('#search-page-query');
const minScoreInput = document.querySelector('#search-min-score');
const worksGrid = document.querySelector('#search-works-grid');
const personsGrid = document.querySelector('#search-persons-grid');
const charactersGrid = document.querySelector('#search-characters-grid');
const worksEmpty = document.querySelector('#search-works-empty');
const personsEmpty = document.querySelector('#search-persons-empty');
const charactersEmpty = document.querySelector('#search-characters-empty');
const worksCount = document.querySelector('#works-count');
const personsCount = document.querySelector('#persons-count');
const charactersCount = document.querySelector('#characters-count');

function updateURL(query) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const minScore = minScoreInput.value.trim();
  if (minScore) params.set('min_score', minScore);
  const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState({}, '', url);
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) queryInput.value = q;
  const minScore = params.get('min_score');
  if (minScore) minScoreInput.value = minScore;
}

function filterByMinScore(results = [], threshold) {
  if (threshold === null) return results;
  return results.filter((item) => Number.parseFloat(item.score ?? 1) >= threshold);
}

function renderCollection(grid, emptyNode, countNode, items, renderer) {
  grid.textContent = '';
  if (!items.length) {
    emptyNode.hidden = false;
    countNode.textContent = '';
    return;
  }
  emptyNode.hidden = true;
  countNode.textContent = `${items.length}`;
  items.forEach((item) => grid.appendChild(renderer(item)));
}

async function performSearch(query) {
  if (!query || !query.trim()) {
    worksGrid.textContent = '';
    personsGrid.textContent = '';
    charactersGrid.textContent = '';
    worksEmpty.hidden = false;
    personsEmpty.hidden = false;
    charactersEmpty.hidden = false;
    worksCount.textContent = '';
    personsCount.textContent = '';
    charactersCount.textContent = '';
    return;
  }

  worksGrid.textContent = personsGrid.textContent = charactersGrid.textContent = 'Загрузка...';
  worksEmpty.hidden = personsEmpty.hidden = charactersEmpty.hidden = true;

  try {
    const response = await searchAll(query);
    const threshold = (() => {
      const value = minScoreInput.value.trim();
      if (!value) return null;
      const parsed = Number.parseFloat(value);
      return Number.isNaN(parsed) ? null : parsed;
    })();

    const works = filterByMinScore(response.works || [], threshold);
    renderCollection(worksGrid, worksEmpty, worksCount, works, renderWorkCard);
    renderCollection(personsGrid, personsEmpty, personsCount, response.persons || [], renderPersonCard);
    renderCollection(charactersGrid, charactersEmpty, charactersCount, response.characters || [], renderCharacterCard);
  } catch (error) {
    console.error('Search request failed', error);
    worksGrid.textContent = 'Не удалось выполнить поиск.';
    personsGrid.textContent = '';
    charactersGrid.textContent = '';
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const query = queryInput.value.trim();
  updateURL(query);
  performSearch(query);
}

function init() {
  applyFiltersFromURL();
  form.addEventListener('submit', handleSubmit);
  minScoreInput.addEventListener('change', () => {
    const query = queryInput.value.trim();
    updateURL(query);
    performSearch(query);
  });
  const initialQuery = queryInput.value.trim();
  if (initialQuery) performSearch(initialQuery);
}

init();
