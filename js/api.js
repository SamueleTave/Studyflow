/* =====================================================
   API.JS — Client per il backend Flask
   Fallback automatico a localStorage se offline
   ===================================================== */

const API_BASE = window.SF_API_BASE || '/api';
let backendOk = false;

function _authHeaders(extra) {
  const auth = typeof getAuth === 'function' ? getAuth() : null;
  const h = { ...(extra || {}) };
  if (auth?.token) h['Authorization'] = 'Bearer ' + auth.token;
  return h;
}

/* Controlla se il backend è attivo */
async function checkBackend() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(API_BASE + "/status", { signal: ctrl.signal });
    backendOk = r.ok;
  } catch {
    backendOk = false;
  }
  _updateStatusDot();
}

function _updateStatusDot() {
  const bar = document.getElementById("backend-status-bar");
  const auth = typeof getAuth === 'function' ? getAuth() : null;
  if (bar) bar.style.display = auth?.is_admin ? 'flex' : 'none';
  const dot = document.getElementById("backend-dot");
  if (!dot) return;
  if (backendOk) {
    dot.style.background = "var(--accent-2)";
    dot.title = "Backend connesso — dati salvati nel database";
  } else {
    dot.style.background = "#BDBDBD";
    dot.title = "Modalita offline — dati salvati nel browser";
  }
}

/* Richieste generiche */
async function apiGet(path) {
  if (!backendOk) return null;
  try {
    const r = await fetch(API_BASE + path, { headers: _authHeaders(), cache: 'no-store' });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function apiPost(path, data) {
  if (!backendOk) return null;
  try {
    const r = await fetch(API_BASE + path, {
      method: "POST",
      headers: _authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function apiDelete(path) {
  if (!backendOk) return null;
  try {
    const r = await fetch(API_BASE + path, {
      method: "DELETE",
      headers: _authHeaders(),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

/* ── Sessioni ── */
async function saveSession(duration, subject = "") {
  const _today = new Date().toISOString().split('T')[0];
  /* Salva sempre in localStorage per le statistiche offline */
  try {
    const sess = JSON.parse(localStorage.getItem('sf_sessions') || '[]');
    sess.push({ date: _today, duration, subject: subject || '', ts: Date.now() });
    if (sess.length > 500) sess.splice(0, sess.length - 500);
    localStorage.setItem('sf_sessions', JSON.stringify(sess));
  } catch {}
  /* Salva sempre sul backend — anche se backendOk è false (cold start Render) */
  try {
    const auth = typeof getAuth === 'function' ? getAuth() : null;
    const hdrs = { 'Content-Type': 'application/json' };
    if (auth?.token) hdrs['Authorization'] = 'Bearer ' + auth.token;
    fetch(API_BASE + '/sessions', {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ date: _today, duration, subject: subject || '' }),
    }).then(r => { if (r.ok) backendOk = true; }).catch(() => {});
  } catch {}
}

/* ── Statistiche ── */
async function loadStatsOverview() {
  return await apiGet("/stats/overview");
}

async function loadStudyHistory(days = 14) {
  return await apiGet(`/stats/history?days=${days}`);
}

async function loadSubjectStats() {
  return await apiGet("/stats/subjects");
}

/* ── Materie ── */
async function loadSubjects() {
  return (await apiGet("/subjects")) || [];
}

async function addSubjectApi(name, color, goalMin) {
  return await apiPost("/subjects", { name, color, goal_min: goalMin });
}

async function deleteSubjectApi(id) {
  return await apiDelete(`/subjects/${id}`);
}

/* ── Export ── */
function getExportUrl() {
  return API_BASE + "/export/csv";
}

/* Avvio check */
checkBackend();
