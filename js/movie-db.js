function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizeSecretPhrase(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function loadJson(requestPath, { allowMissing = false } = {}) {
  const trace = document.getElementById("last-request");
  if (trace) trace.textContent = requestPath;

  const response = await fetch(requestPath, { cache: "no-store" });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Could not load ${requestPath}: HTTP ${response.status}`);
  }
  return response.json();
}

let allMovies = [];
let currentRequestNumber = 0;

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function getSearchState() {
  return {
    query: document.getElementById("search-input").value,
    genre: document.getElementById("genre-filter").value,
    rating: document.getElementById("rating-filter").value
  };
}

function updateBrowserUrl({ query, genre, rating }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (genre) params.set("genre", genre);
  if (rating) params.set("rating", rating);

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", newUrl);
}

function buildSearchRequestUrl({ query, genre, rating }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (genre) params.set("genre", genre);
  if (rating) params.set("rating", rating);
  params.set("_trace", Date.now());
  return `data/movies.json?${params.toString()}`;
}

function buildMovieHref(movie, state) {
  const params = new URLSearchParams();
  params.set("id", movie.id);
  if (state.query) params.set("q", state.query);
  params.set("selected", movie.title || movie.id);
  return `movie.html?${params.toString()}`;
}

function buildSecretHref(secret, state) {
  const params = new URLSearchParams();
  params.set("key", secret.lookup_key);
  if (state.query) params.set("q", state.query);
  params.set("selected", secret.title || "Secret Portal");
  return `secret.html?${params.toString()}`;
}

function collectOptions(field, splitter = null) {
  const values = new Set();
  allMovies.forEach(movie => {
    const raw = movie[field] || "";
    const parts = splitter ? raw.split(splitter) : [raw];
    parts.map(v => v.trim()).filter(Boolean).forEach(v => values.add(v));
  });
  return [...values].sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  const genreFilter = document.getElementById("genre-filter");
  const ratingFilter = document.getElementById("rating-filter");

  collectOptions("genre", ",").forEach(genre => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });

  collectOptions("mpaa_rating").forEach(rating => {
    const option = document.createElement("option");
    option.value = rating;
    option.textContent = rating;
    ratingFilter.appendChild(option);
  });
}

async function findSecret(query) {
  const normalized = normalizeSecretPhrase(query);

  // Do not download a complete list of secret phrases. Once the typed
  // normalized input is long enough to plausibly be a secret phrase, check
  // for exactly one hashed static file. Most partial strings return 404.
  if (normalized.length < 12) return null;

  const key = await sha256Hex(normalized);
  const requestPath = `data/secret-entries/${key}.json?_trace=${Date.now()}`;
  return loadJson(requestPath, { allowMissing: true });
}

function filterMovies(movies, state) {
  const queryLower = normalize(state.query);

  return movies.filter(movie => {
    const haystack = normalize([
      movie.title,
      movie.genre,
      movie.actors,
      movie.director,
      movie.description
    ].join(" "));

    const matchesQuery = !queryLower || haystack.includes(queryLower);
    const matchesGenre = !state.genre || String(movie.genre || "").split(",").map(g => g.trim()).includes(state.genre);
    const matchesRating = !state.rating || movie.mpaa_rating === state.rating;

    return matchesQuery && matchesGenre && matchesRating;
  });
}

async function renderMovies() {
  const grid = document.getElementById("movie-grid");
  const summary = document.getElementById("results-summary");
  const state = getSearchState();
  const requestNumber = ++currentRequestNumber;

  updateBrowserUrl(state);

  try {
    const movies = await loadJson(buildSearchRequestUrl(state));
    if (requestNumber !== currentRequestNumber) return;

    const [secret, filtered] = await Promise.all([
      (!state.genre && !state.rating) ? findSecret(state.query) : Promise.resolve(null),
      Promise.resolve(filterMovies(movies, state))
    ]);
    if (requestNumber !== currentRequestNumber) return;

    const cards = [];

    if (secret) {
      cards.push(`
        <a class="movie-card search-result secret-card" href="${escapeHtml(buildSecretHref(secret, state))}">
          <div class="movie-card-body">
            <h2>${escapeHtml(secret.title)}</h2>
            <p class="result-description">${escapeHtml(secret.subtitle || secret.description || "Hidden entry")}</p>
          </div>
        </a>
      `);
    }

    cards.push(...filtered.map(movie => `
      <a class="movie-card search-result" href="${escapeHtml(buildMovieHref(movie, state))}">
        <div class="movie-card-body">
          <h2>${escapeHtml(movie.title)}</h2>
          <p class="result-description">${escapeHtml(movie.description || "")}</p>
        </div>
      </a>
    `));

    const totalShown = cards.length;
    summary.textContent = `${totalShown} result${totalShown === 1 ? "" : "s"} shown`;
    grid.innerHTML = cards.join("");
  } catch (err) {
    grid.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

async function init() {
  try {
    const cacheBust = Date.now();
    allMovies = await loadJson(`data/movies.json?_trace=${cacheBust}`);

    populateFilters();

    const params = new URLSearchParams(window.location.search);
    document.getElementById("search-input").value = params.get("q") || "";
    document.getElementById("genre-filter").value = params.get("genre") || "";
    document.getElementById("rating-filter").value = params.get("rating") || "";

    await renderMovies();

    document.getElementById("search-input").addEventListener("input", renderMovies);
    document.getElementById("genre-filter").addEventListener("change", renderMovies);
    document.getElementById("rating-filter").addEventListener("change", renderMovies);
  } catch (err) {
    document.getElementById("movie-grid").innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

init();
