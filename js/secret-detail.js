function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
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

function getSecretKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get("key");
}

function isValidLookupKey(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
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
        <dt>Lookup:</dt><dd><code>${escapeHtml(String(secret.lookup_key || "").slice(0, 16))}...</code></dd>
        <dt>Next step:</dt><dd>${escapeHtml(secret.next_step)}</dd>
      </dl>
    </div>
  `;
}

async function init() {
  const key = getSecretKey();

  if (!isValidLookupKey(key)) {
    document.getElementById("secret-detail").innerHTML = `<div class="error">No valid secret lookup key was provided.</div>`;
    return;
  }

  try {
    const secret = await loadJson(`data/secret-entries/${encodeURIComponent(key)}.json?_trace=${Date.now()}`);
    renderSecret(secret);
  } catch (err) {
    document.getElementById("secret-detail").innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

init();
