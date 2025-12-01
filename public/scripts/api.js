const API_BASE = `${window.location.origin}/api`;

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

export async function fetchWorks(params) {
  const query = buildQuery(params);
  return request(`/works${query}`);
}

export async function fetchPersons(params) {
  const query = buildQuery(params);
  return request(`/persons${query}`);
}

export async function fetchCharacters(params) {
  const query = buildQuery(params);
  return request(`/characters${query}`);
}

export async function fetchGenres(params) {
  const query = buildQuery(params);
  return request(`/genres${query}`);
}

export async function fetchAwards(params) {
  const query = buildQuery(params);
  return request(`/awards${query}`);
}

export async function searchAll(query) {
  const searchQuery = buildQuery({ q: query });
  return request(`/search${searchQuery}`);
}
