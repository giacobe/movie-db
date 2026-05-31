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

function getSecretId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderSecret(secret) {
  const detail = document.getElementById("secret-detail");

  detail.innerHTML = `
    <div class="secret-portal-art">
      <div>
        <strong>Detail View</strong>
        <span>${escapeHtml(secret.subtitle)}</span>
      </div>
    </div>
    <div class="detail-content">
      <h2>${escapeHtml(secret.title)}</h2>
      <div class="badges">
        <span class="badge secret-badge">${escapeHtml(secret.classification)}</span>
        <span class="badge secret-badge">${escapeHtml(secret.signal)}</span>
        <span class="badge secret-badge">${escapeHtml(secret.risk)}</span>
      </div>

      <p class="description">${escapeHtml(secret.description)}</p>

      <dl class="facts">
        <dt>Discovery ID:</dt><dd>${escapeHtml(secret.id)}</dd>
        <dt>Phrase:</dt><dd>${escapeHtml(secret.phrase)}</dd>
        <dt>Normalized:</dt><dd><code>${escapeHtml(secret.normalized_phrase)}</code></dd>
        <dt>Next step:</dt><dd>${escapeHtml(secret.next_step)}</dd>
      </dl>
    </div>
  `;
}

async function init() {
  const id = getSecretId();

  if (!id) {
    document.getElementById("secret-detail").innerHTML = `<div class="error">No movie ID was provided.</div>`;
    return;
  }

  try {
    const secrets = await loadJson(`data/secrets.json?id=${encodeURIComponent(id)}&_trace=${Date.now()}`);
    const secret = secrets.find(item => String(item.id) === String(id));

    if (!secret) {
      document.getElementById("secret-detail").innerHTML = `<div class="error">No matching entry found.</div>`;
      return;
    }

    renderSecret(secret);
  } catch (err) {
    document.getElementById("secret-detail").innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

init();
