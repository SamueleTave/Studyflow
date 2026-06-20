/* =====================================================
   AUTH.JS — utente, sync localStorage ↔ server
   Incluso PRIMA di shared.js in ogni pagina
   ===================================================== */

const SF_AUTH_KEY  = 'sf_auth';
const _SF_SYNC_KEYS = [
  'sf_coins','sf_garden','sf_widgets','sf_timer','sf_stats',
  'sf_sessions','sf_events','sf_daily_deal','sf_moods',
  'sf_cfg','sf_tasks','sf_theme','sf_subjects','sf_notes','sf_friends',
  'sf_checkins','sf_work_label','sf_accent_color','sf_cs','sf_td','sf_ts','sf_work_dur',
  'sf_countdown','sf_flash','sf_spotify','sf_role_override'
];

/* ── Lettura auth ── */
function getAuth() {
  try { return JSON.parse(sessionStorage.getItem(SF_AUTH_KEY) || 'null'); }
  catch { return null; }
}
function isLoggedIn()    { return !!(getAuth()?.token); }
function isAdmin()       { return !!(getAuth()?.is_admin); }
function getCurrentUser(){ return getAuth(); }

/* ── Guard: redirect se non loggato ── */
function requireLogin() {
  if (!isLoggedIn()) { window.location.replace('login.html'); }
}

/* ── Guard: redirect se non admin ── */
function requireAdmin() {
  const auth = getAuth();
  if (!auth?.token)    { window.location.replace('login.html'); return; }
  if (!auth.is_admin)  { window.location.replace('index.html'); }
}

/* ── Logout ── */
async function logout() {
  /* Salva subito al server prima di pulire — evita perdita tema/sfida/impostazioni */
  if (_sfSyncTimer) { clearTimeout(_sfSyncTimer); _sfSyncTimer = null; }
  try { await syncToServer(); } catch {}
  _SF_SYNC_KEYS.forEach(k => localStorage.removeItem(k));
  ['sf_spotify_token','sf_spotify_token_exp','sf_pkce_verifier','sf_pkce_client_id'].forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem(SF_AUTH_KEY);
  sessionStorage.removeItem('sf_session_loaded');
  window.location.replace('login.html');
}

/* ── Sync tutto verso il server ── */
async function syncToServer() {
  const auth = getAuth();
  if (!auth?.token) return;
  const payload = {};
  _SF_SYNC_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) payload[k] = v;
  });
  try {
    const r = await fetch((window.SF_API_BASE || '/api') + '/user/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + auth.token,
      },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const res = await r.json();
      /* Il server può rimandare correzioni (es. balance ripristinato dall'admin).
         Le scriviamo in localStorage senza triggerare un altro sync. */
      if (res.corrections && typeof res.corrections === 'object' && Object.keys(res.corrections).length) {
        _sfSyncSuppressed = true;
        Object.entries(res.corrections).forEach(([k, v]) => {
          if (_SF_SYNC_KEYS.includes(k)) _sfOrigSetItem(k, v);
        });
        _sfSyncSuppressed = false;
        _sfReinitAll();
      }
    }
  } catch {}
}

/* ── Carica dati dal server → localStorage ──
   Prima pagina della sessione (subito dopo login): carica TUTTO dal server.
   Pagine successive (stessa sessione): ripristina solo le chiavi assenti.
   Questo garantisce che dopo un restore admin i dati arrivino al prossimo login. */
async function loadFromServer() {
  const auth = getAuth();
  if (!auth?.token) return false;
  try {
    const r = await fetch((window.SF_API_BASE || '/api') + '/user/data', {
      headers: { 'Authorization': 'Bearer ' + auth.token },
    });
    if (!r.ok) { if (r.status === 401) logout(); return false; }
    const data = await r.json();
    // Se admin ha modificato i dati (flag dirty), forza reload completo ignorando la cache
    const adminDirty = data['sf_admin_flag'] === 'dirty';
    const isFirstLoad = !sessionStorage.getItem('sf_session_loaded') || adminDirty;
    _SF_SYNC_KEYS.forEach(k => {
      if (data[k] == null) return;
      const localVal = localStorage.getItem(k);
      if (!isFirstLoad && localVal != null) return;
      // sf_timer e sf_garden sono real-time: il dato locale è più fresco del server
      // MA solo nelle sessioni successive (non al primo caricamento dopo login)
      if (!isFirstLoad && (k === 'sf_timer' || k === 'sf_garden') && localVal != null) return;
      // Per sf_coins: merge intelligente — se admin ha aggiornato (_adminTs diverso), server vince su shop/balance.
      // Altrimenti gli acquisti locali recenti vengono preservati.
      if (k === 'sf_coins' && localVal) {
        try {
          const local  = JSON.parse(localVal);
          const server = JSON.parse(data[k]);
          const adminChanged = server._adminTs && server._adminTs !== local._adminTs;
          const merged = Object.assign({}, server, {
            shop:          adminChanged
              ? (server.shop || {})
              : Object.assign({}, server.shop || {}, local.shop || {}),
            activeEffects: Object.assign({}, server.activeEffects || {}, local.activeEffects || {}),
          });
          if (server._adminTs) merged._adminTs = server._adminTs;
          _sfOrigSetItem(k, JSON.stringify(merged));
          return;
        } catch {}
      }
      _sfOrigSetItem(k, data[k]);
    });
    if (isFirstLoad) sessionStorage.setItem('sf_session_loaded', '1');
    // Se era dirty (admin aveva modificato), reinizializza tutta la UI su questa pagina
    if (adminDirty) _sfReinitAll();
    return true;
  } catch { return false; }
}

function _sfReinitAll() {
  if (typeof initCoins            === 'function') initCoins();
  if (typeof initWidgets          === 'function') initWidgets();
  if (typeof updateLevelPill      === 'function') updateLevelPill();
  if (typeof initTheme            === 'function') initTheme();
  if (typeof renderShopPage       === 'function') renderShopPage();
  if (typeof renderDailyDeal      === 'function') renderDailyDeal();
  if (typeof _fetchNotifications  === 'function') _fetchNotifications();
}

/* ── Auto-sync debounced su ogni setItem sf_ ── */
const _sfOrigSetItem = localStorage.setItem.bind(localStorage);
let _sfSyncSuppressed = false;   /* true durante il render iniziale */
localStorage.setItem = function(key, value) {
  _sfOrigSetItem(key, value);
  if (!_sfSyncSuppressed && _SF_SYNC_KEYS.includes(key) && isLoggedIn()) _triggerSync();
};
let _sfSyncTimer = null;
function _triggerSync() {
  clearTimeout(_sfSyncTimer);
  _sfSyncTimer = setTimeout(syncToServer, 2500);
}

/* ── Inietta pill utente + link admin nella sidebar ── */
function _initSidebarUser() {
  const bottom = document.querySelector('.sidebar-bottom');
  if (!bottom) return;
  const auth = getAuth();
  if (!auth) return;

  const pill = document.createElement('div');
  pill.className = 'sidebar-user-pill';
  pill.innerHTML =
    '<span class="sidebar-user-name">' + auth.username + '</span>' +
    '<button class="sidebar-logout-btn" onclick="logout()">Esci</button>';
  bottom.insertBefore(pill, bottom.firstChild);

  if (auth.is_admin) {
    const nav = document.querySelector('.sidebar');
    if (nav) {
      const a = document.createElement('a');
      a.href = 'admin.html';
      a.className = 'nav-link';
      a.innerHTML =
        '<i data-feather="shield" class="nav-icon"></i>' +
        '<span class="nav-label">Admin</span>';
      const spacer = nav.querySelector('.sidebar-spacer');
      if (spacer) nav.insertBefore(a, spacer);
    }
  }
}

function _initSettingsUser() {
  const label = document.getElementById('settings-user-label');
  if (!label) return;
  const auth = getAuth();
  if (auth?.username) label.textContent = '@' + auth.username;
}

document.addEventListener('DOMContentLoaded', async () => {
  _initSidebarUser();
  _initSettingsUser();

  /* Ripristina dati dal server (widget sbloccati, monete, tasks, ecc.)
     Chiamato qui così ogni pagina parte con i dati aggiornati dopo login/logout */
  if (isLoggedIn()) {
    const loaded = await loadFromServer();
    if (loaded) {
      /* Sopprime il sync durante il render iniziale: le funzioni sotto
         possono scrivere in localStorage (es. initCoins normalizza lo stato)
         e non vogliamo inviare dati al server in questo momento */
      _sfSyncSuppressed = true;
      if (typeof loadData  === 'function') loadData();
      if (typeof initCoins === 'function') initCoins();
      if (typeof _updateStreakBadge === 'function') _updateStreakBadge();
      if (typeof _loadWidgetState            === 'function') _loadWidgetState();
      if (typeof _renderOrderedDynamicWidgets === 'function') _renderOrderedDynamicWidgets();
      if (typeof renderMiniTasks             === 'function') renderMiniTasks();
      /* Ricarica giardino con le posizioni aggiornate dal server */
      if (typeof initGarden === 'function') initGarden();
      _sfSyncSuppressed = false;
      /* Re-renderizza stats con i dati corretti dal server */
      if (typeof loadPage === 'function') loadPage();
    }
  }
});
