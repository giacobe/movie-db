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

  // crypto.subtle is unavailable in some classroom/demo setups, especially
  // when the site is opened as file:// or served from a non-secure origin.
  // Use it when present, but fall back to a local SHA-256 implementation so
  // the secret lookup still works on ordinary Apache/Nginx lab servers.
  if (window.crypto && window.crypto.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  return sha256HexFallback(bytes);
}

function sha256HexFallback(bytes) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bitLen = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 4, bitLen >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < data.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  return H.map(h => h.toString(16).padStart(8, "0")).join("");
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
