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

function getMovieId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderDetail(movie) {
  const detail = document.getElementById("movie-detail");

  detail.innerHTML = `
    <div class="detail-poster">${imageHtml(movie)}</div>
    <div class="detail-content">
      <h2>${escapeHtml(movie.title)}</h2>
      <div class="badges">
        <span class="badge">${escapeHtml(movie.mpaa_rating || "NR")}</span>
        <span class="badge">${escapeHtml(movie.release_date || "")}</span>
        <span class="badge">${escapeHtml(movie.review_score || "")}</span>
      </div>

      <p class="description">${escapeHtml(movie.description)}</p>

      <dl class="facts">
        <dt>Genre:</dt><dd>${escapeHtml(movie.genre)}</dd>
        <dt>Director:</dt><dd>${escapeHtml(movie.director)}</dd>
        <dt>Actors:</dt><dd>${escapeHtml(movie.actors)}</dd>
        <dt>Runtime:</dt><dd>${escapeHtml(movie.runtime_minutes)} minutes</dd>
        <dt>Movie ID:</dt><dd>${escapeHtml(movie.id)}</dd>
      </dl>
    </div>
  `;
}

async function init() {
  const id = getMovieId();

  if (!id) {
    document.getElementById("movie-detail").innerHTML = `<div class="error">No movie ID was provided.</div>`;
    return;
  }

  try {
    const movies = await loadJson(`data/movies.json?id=${encodeURIComponent(id)}&_trace=${Date.now()}`);
    const movie = movies.find(item => String(item.id) === String(id));

    if (!movie) {
      document.getElementById("movie-detail").innerHTML = `<div class="error">No movie found with ID ${escapeHtml(id)}.</div>`;
      return;
    }

    renderDetail(movie);
  } catch (err) {
    document.getElementById("movie-detail").innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

init();
