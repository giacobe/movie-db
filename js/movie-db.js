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

function imageHtml(movie, className = "") {
  const src = movie.image || "";
  const alt = movie.title ? `Poster for ${movie.title}` : "Movie poster";

  if (!src) {
    return `<div class="poster-fallback">No poster available</div>`;
  }

  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"
    onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'poster-fallback', textContent:'Poster image not found: ${escapeHtml(src)}'}));">`;
}

async function loadJson(requestPath) {
  const trace = document.getElementById("last-request");
  if (trace) trace.textContent = requestPath;

  const response = await fetch(requestPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${requestPath}: HTTP ${response.status}`);
  }
  return response.json();
}

let allMovies = [];
let allSecrets = [];

function normalize(value) {
  return String(value ?? "").toLowerCase();
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

function findSecret(query) {
  const normalized = normalizeSecretPhrase(query);
  if (!normalized) return null;

  return allSecrets.find(secret => secret.normalized_phrase === normalized);
}

function renderMovies() {
  const grid = document.getElementById("movie-grid");
  const summary = document.getElementById("results-summary");
  const query = document.getElementById("search-input").value;
  const queryLower = normalize(query);
  const genre = document.getElementById("genre-filter").value;
  const rating = document.getElementById("rating-filter").value;
  const secret = findSecret(query);

  const filtered = allMovies.filter(movie => {
    const haystack = normalize([
      movie.title,
      movie.genre,
      movie.actors,
      movie.director,
      movie.description
    ].join(" "));

    const matchesQuery = !queryLower || haystack.includes(queryLower);
    const matchesGenre = !genre || String(movie.genre || "").split(",").map(g => g.trim()).includes(genre);
    const matchesRating = !rating || movie.mpaa_rating === rating;

    return matchesQuery && matchesGenre && matchesRating;
  });

  const cards = [];

  if (secret && !genre && !rating) {
    cards.push(`
      <a class="movie-card secret-card" href="secret.html?id=${encodeURIComponent(secret.id)}">
        <div class="poster-wrap"><div class="poster-fallback">Detail View<br>${escapeHtml(secret.subtitle)}</div></div>
        <div class="movie-card-body">
          <h2>${escapeHtml(secret.title)}</h2>
          <div class="badges">
            <span class="badge secret-badge">${escapeHtml(secret.classification)}</span>
            <span class="badge secret-badge">${escapeHtml(secret.signal)}</span>
          </div>
        </div>
      </a>
    `);
  }

  cards.push(...filtered.map(movie => `
    <a class="movie-card" href="movie.html?id=${encodeURIComponent(movie.id)}">
      <div class="poster-wrap">${imageHtml(movie)}</div>
      <div class="movie-card-body">
        <h2>${escapeHtml(movie.title)}</h2>
        <div class="badges">
          <span class="badge">${escapeHtml(movie.mpaa_rating || "NR")}</span>
          <span class="badge">${escapeHtml(movie.release_date || "")}</span>
          <span class="badge">${escapeHtml(movie.review_score || "")}</span>
        </div>
      </div>
    </a>
  `));

  const totalShown = cards.length;
  summary.textContent = `${totalShown} result${totalShown === 1 ? "" : "s"} shown`;
  grid.innerHTML = cards.join("");
}

async function init() {
  try {
    const cacheBust = Date.now();
    allMovies = await loadJson(`data/movies.json?_trace=${cacheBust}`);

    /*
      Secrets are loaded silently. Nothing appears on the page unless the user
      enters an exact matching phrase into the normal search box.
    */
    try {
      allSecrets = await fetch(`data/secrets.json?_trace=${cacheBust}`, { cache: "no-store" }).then(r => r.ok ? r.json() : []);
    } catch {
      allSecrets = [];
    }

    populateFilters();
    renderMovies();

    document.getElementById("search-input").addEventListener("input", renderMovies);
    document.getElementById("genre-filter").addEventListener("change", renderMovies);
    document.getElementById("rating-filter").addEventListener("change", renderMovies);
  } catch (err) {
    document.getElementById("movie-grid").innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

init();
