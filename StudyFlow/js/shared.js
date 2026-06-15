/* =====================================================
   SHARED.JS — dati, tema, orologio, audio, settings
   Importato da tutte le pagine
   ===================================================== */

/* ===== COSTANTI ===== */
const DAYS_IT   = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const QUOTES = [
  '"La disciplina è il ponte tra gli obiettivi e i risultati." — Jim Rohn',
  '"Il successo è la somma di piccoli sforzi ripetuti ogni giorno." — R. Collier',
  '"Non rimandare a domani quello che puoi imparare oggi." — Benjamin Franklin',
  '"La mente non è un vaso da riempire, ma un fuoco da accendere." — Plutarco',
  '"La pazienza è la compagna della saggezza." — Agostino di Ippona',
  '"Studia non per sembrare intelligente, ma per diventarlo." — Anonimo',
  '"Il sapere è l\'unica cosa che nessuno può toglierti." — Anonimo',
  '"Ogni esperto era una volta un principiante." — Helen Hayes',
  '"Investi in te stesso: il rendimento è per sempre." — Benjamin Franklin',
  '"La difficoltà è ciò che sveglia il genio." — N.N. Taleb',
  '"Un libro, una penna, un bambino possono cambiare il mondo." — Malala',
  '"Quello che impari oggi è chi sarai domani." — Anonimo',
];

/* ===== DEFAULTS SETTINGS ===== */
const DEF_CFG = {
  work: 25, short: 5, long: 15, goal: 4,
  autoBreak: false, autoWork: false, sound: true, hydration: true,
};

/* ===== DATA LAYER ===== */
let cfg   = { ...DEF_CFG };
let tasks = [];
let stats = { sessions: 0, minutes: 0, streak: 0, lastStudy: null, date: '' };

function loadData() {
  try {
    const sc = localStorage.getItem('sf_cfg');
    if (sc) cfg = { ...DEF_CFG, ...JSON.parse(sc) };

    const st = localStorage.getItem('sf_tasks');
    if (st) tasks = JSON.parse(st);

    const ss = localStorage.getItem('sf_stats');
    if (ss) {
      const d = JSON.parse(ss);
      stats.streak    = d.streak    || 0;
      stats.lastStudy = d.lastStudy || null;
      const today = new Date().toDateString();
      if (d.date === today) {
        stats.sessions = d.sessions || 0;
        stats.minutes  = d.minutes  || 0;
        stats.date     = today;
      }
    }

    const th = localStorage.getItem('sf_theme');
    if (th) applyTheme(th, false);
  } catch (e) { console.warn('loadData error:', e); }
}

function saveCfg()   { localStorage.setItem('sf_cfg',   JSON.stringify(cfg)); }
function saveTasks() { localStorage.setItem('sf_tasks', JSON.stringify(tasks)); }
function saveStats() {
  localStorage.setItem('sf_stats', JSON.stringify({
    date: new Date().toDateString(),
    sessions: stats.sessions,
    minutes:  stats.minutes,
    streak:   stats.streak,
    lastStudy: stats.lastStudy,
  }));
}

/* ===== UTILITY ===== */
function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-06-18"
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}

/* ===== STREAK ===== */
function updateStreak() {
  const today = new Date().toDateString();
  if (stats.lastStudy === today) return;
  const yest = new Date(Date.now() - 86400000).toDateString();
  stats.streak   = stats.lastStudy === yest ? stats.streak + 1 : 1;
  stats.lastStudy = today;
}

/* ===== OROLOGIO ===== */
let _quoteIdx = Math.floor(Math.random() * QUOTES.length);

function startClock() {
  const timeEl  = document.getElementById('clockTime');
  const dateEl  = document.getElementById('clockDate');
  const quoteEl = document.getElementById('clockQuote');

  if (!timeEl) return;

  function tick() {
    const n = new Date();
    timeEl.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
      .map(x => String(x).padStart(2, '0')).join(':');
    if (dateEl) dateEl.textContent =
      `${DAYS_IT[n.getDay()]}, ${n.getDate()} ${MONTHS_IT[n.getMonth()]} ${n.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);

  if (quoteEl) {
    quoteEl.textContent = QUOTES[_quoteIdx];
    setInterval(() => {
      _quoteIdx = (_quoteIdx + 1) % QUOTES.length;
      quoteEl.style.opacity = '0';
      setTimeout(() => { quoteEl.textContent = QUOTES[_quoteIdx]; quoteEl.style.opacity = '1'; }, 350);
    }, 30000);
  }
}

/* ===== TEMA ===== */
function applyTheme(t, save = true) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.tdot').forEach(d =>
    d.classList.toggle('active', d.dataset.t === t));
  if (save) localStorage.setItem('sf_theme', t);
}

function initThemeDots() {
  document.querySelectorAll('.tdot').forEach(d => {
    d.addEventListener('click', () => applyTheme(d.dataset.t));
  });
  const saved = localStorage.getItem('sf_theme');
  if (saved) applyTheme(saved, false);
}

/* ===== ACTIVE NAV ===== */
function setActivePage(page) {
  document.querySelectorAll('.nav-link[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
}

/* ===== FOCUS MODE ===== */
let focusMode = false;
function toggleFocus() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
  const btn = document.getElementById('focusBtn');
  if (btn) btn.classList.toggle('active', focusMode);
}

/* ===== AUDIO ===== */
let audioCtx    = null;
let ambientSrc  = null;
let ambientGain = null;
let isAmbient   = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep() {
  if (!cfg.sound) return;
  try {
    const ctx = getAudioCtx();
    [[880, 0, 0.55], [1100, 0.32, 0.4]].forEach(([freq, when, dur]) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + when;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.26, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  } catch (e) { /* silenzio */ }
}

function toggleAmbient() {
  const btn = document.getElementById('ambientBtn');
  if (isAmbient) {
    if (ambientGain) {
      ambientGain.gain.linearRampToValueAtTime(0, getAudioCtx().currentTime + 0.9);
    }
    setTimeout(() => {
      if (ambientSrc) { try { ambientSrc.stop(); } catch (e) {} ambientSrc = null; }
    }, 1000);
    isAmbient = false;
    if (btn) btn.classList.remove('active');
  } else {
    try {
      const ctx = getAudioCtx();
      const sr  = ctx.sampleRate;
      const buf = ctx.createBuffer(2, sr * 4, sr);
      for (let c = 0; c < 2; c++) {
        const data = buf.getChannelData(c);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      ambientSrc         = ctx.createBufferSource();
      ambientSrc.buffer  = buf;
      ambientSrc.loop    = true;

      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = 650;
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 70;
      ambientGain        = ctx.createGain(); ambientGain.gain.value = 0;

      ambientSrc.connect(lpf); lpf.connect(hpf); hpf.connect(ambientGain);
      ambientGain.connect(ctx.destination);
      ambientSrc.start();
      ambientGain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 1.2);
      isAmbient = true;
      if (btn) btn.classList.add('active');
    } catch (e) { console.warn('Web Audio non disponibile'); }
  }
}

/* ===== CONFETTI ===== */
const C_COLORS = ['var(--accent)','var(--accent-2)','#FFD700','#FF6B6B','#A8E6CF','#B5EAD7','#FFB7C5'];

function celebrate(count = 45) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => _spawnConf(), i * 38);
  }
}
function _spawnConf() {
  const el   = document.createElement('div');
  el.className = 'cfp';
  const sz = 5 + Math.random() * 7;
  el.style.cssText = `
    left:${Math.random()*100}vw; top:0;
    background:${C_COLORS[Math.floor(Math.random()*C_COLORS.length)]};
    width:${sz}px; height:${sz}px;
    --cd:${1.4 + Math.random() * 0.9}s;
    border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
    animation-delay:${Math.random() * 0.25}s;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2700);
}

/* ===== SETTINGS MODAL ===== */
function openSettings() {
  const el = document.getElementById('settingsModal');
  if (!el) return;
  ['work','short','long','goal'].forEach(k => {
    const sv = document.getElementById('sv-' + k);
    if (sv) sv.textContent = cfg[k];
  });
  ['autoBreak','autoWork','sound','hydration'].forEach(k => {
    const tog = document.getElementById('tog-' + k);
    if (tog) tog.classList.toggle('on', cfg[k] !== false);
  });
  el.classList.add('open');
}
function closeSettings() {
  const el = document.getElementById('settingsModal');
  if (el) el.classList.remove('open');
  if (typeof onSettingsClosed === 'function') onSettingsClosed();
}
function overlayClick(e) {
  if (e.target === e.currentTarget) closeSettings();
}
function changeSetting(k, d) {
  const bounds = { work:[1,120], short:[1,60], long:[1,60], goal:[1,10] };
  if (!bounds[k]) return;
  const [mn, mx] = bounds[k];
  cfg[k] = Math.max(mn, Math.min(mx, cfg[k] + d));
  const el = document.getElementById('sv-' + k);
  if (el) el.textContent = cfg[k];
  saveCfg();
}
function toggleSetting(k) {
  cfg[k] = !cfg[k];
  const tog = document.getElementById('tog-' + k);
  if (tog) tog.classList.toggle('on', cfg[k]);
  saveCfg();
  if (k === 'hydration') updateHydroDrop();
}

/* ===== INIT (chiamato da ogni pagina) ===== */
function initShared() {
  loadData();
  initThemeDots();
  startClock();
  _initAdminDot();
  _initQuickNote();
  _initCheckin();
  _injectHydrationToggle();
}

/* ══════════════════════════════════════
   FEATURE 1 — NOTA VELOCE (tasto N)
═══════════════════════════════════════ */
function _initQuickNote() {
  const panel = document.createElement('div');
  panel.id = 'qnote-panel';
  panel.innerHTML = `
    <div class="qnote-hdr">
      <span class="qnote-title">Note veloci</span>
      <span class="qnote-hint">N per aprire/chiudere</span>
      <button class="qnote-close" onclick="_toggleQuickNote()">✕</button>
    </div>
    <textarea id="qnote-area" class="qnote-area" placeholder="Dubbi, appunti veloci, cose da rivedere..."></textarea>`;
  document.body.appendChild(panel);

  /* Auto-salva ad ogni keystroke */
  panel.querySelector('#qnote-area').addEventListener('input', _saveQuickNote);

  /* Shortcut N (solo se non si sta digitando in un input) */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey) _toggleQuickNote();
  });

  _loadQuickNote();
}

function _toggleQuickNote() {
  const panel = document.getElementById('qnote-panel');
  if (!panel) return;
  const opening = !panel.classList.contains('qnote-open');
  panel.classList.toggle('qnote-open', opening);
  if (opening) {
    const area = document.getElementById('qnote-area');
    if (area) { area.focus(); area.selectionStart = area.value.length; }
  }
}

function _saveQuickNote() {
  const area = document.getElementById('qnote-area');
  if (!area) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const notes = JSON.parse(localStorage.getItem('sf_notes') || '{}');
    notes[today] = area.value;
    /* Tieni solo gli ultimi 30 giorni */
    const keys = Object.keys(notes).sort().slice(-30);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = notes[k]; });
    localStorage.setItem('sf_notes', JSON.stringify(trimmed));
  } catch {}
}

function _loadQuickNote() {
  const area = document.getElementById('qnote-area');
  if (!area) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const notes = JSON.parse(localStorage.getItem('sf_notes') || '{}');
    area.value = notes[today] || '';
  } catch {}
}

/* ══════════════════════════════════════
   FEATURE 2 — CHECK-IN FINE SESSIONE
═══════════════════════════════════════ */
const _MOODS = ['😫','😕','😐','😊','🤩'];

function _initCheckin() {
  const overlay = document.createElement('div');
  overlay.id = 'checkin-overlay';
  overlay.innerHTML = `
    <div class="checkin-card">
      <div class="checkin-title">Sessione completata!</div>
      <div class="checkin-sub">Come è andata?</div>
      <div class="checkin-moods" id="checkin-moods">
        ${_MOODS.map((m,i) => `<button class="checkin-mood" data-idx="${i}" onclick="_selectMood(${i})">${m}</button>`).join('')}
      </div>
      <input id="checkin-note" class="checkin-note" type="text" placeholder="Cosa hai studiato? (facoltativo)" maxlength="80">
      <div class="checkin-footer">
        <button class="checkin-skip" onclick="_closeCheckin()">Salta</button>
        <button class="checkin-confirm" onclick="_confirmCheckin()">Conferma</button>
      </div>
      <div class="checkin-timer-bar"><div class="checkin-timer-fill" id="checkin-timer-fill"></div></div>
    </div>`;
  document.body.appendChild(overlay);
}

let _checkinTimeout = null;
let _checkinCallback = null;
let _selectedMood = -1;

function showSessionCheckin(sessionSubject, callback) {
  const overlay = document.getElementById('checkin-overlay');
  if (!overlay) { if (callback) callback(null); return; }

  _checkinCallback = callback;
  _selectedMood = -1;

  /* Pre-popola materia */
  const noteEl = document.getElementById('checkin-note');
  if (noteEl) noteEl.value = sessionSubject || '';

  /* Reset mood buttons */
  overlay.querySelectorAll('.checkin-mood').forEach(b => b.classList.remove('selected'));

  overlay.classList.add('open');

  /* Auto-chiudi dopo 8 secondi */
  const fill = document.getElementById('checkin-timer-fill');
  if (fill) { fill.style.transition = 'none'; fill.style.width = '100%'; void fill.offsetWidth; fill.style.transition = 'width 8s linear'; fill.style.width = '0%'; }
  clearTimeout(_checkinTimeout);
  _checkinTimeout = setTimeout(() => _closeCheckin(), 8000);
}

function _selectMood(idx) {
  _selectedMood = idx;
  document.querySelectorAll('.checkin-mood').forEach((b, i) => b.classList.toggle('selected', i === idx));
}

function _confirmCheckin() {
  const noteEl = document.getElementById('checkin-note');
  const note = noteEl ? noteEl.value.trim() : '';
  _saveCheckinData(_selectedMood, note);
  _closeCheckin();
}

function _closeCheckin() {
  clearTimeout(_checkinTimeout);
  const overlay = document.getElementById('checkin-overlay');
  if (overlay) overlay.classList.remove('open');
  if (_checkinCallback) { _checkinCallback(); _checkinCallback = null; }
}

function _saveCheckinData(mood, note) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const checkins = JSON.parse(localStorage.getItem('sf_checkins') || '[]');
    checkins.push({ date: today, ts: Date.now(), mood, note });
    if (checkins.length > 200) checkins.splice(0, checkins.length - 200);
    localStorage.setItem('sf_checkins', JSON.stringify(checkins));
  } catch {}
}

/* ══════════════════════════════════════
   FEATURE 4 — PROMEMORIA IDRATAZIONE
═══════════════════════════════════════ */
let _hydroWorkMinutes = 0;
const HYDRO_INTERVAL  = 30; /* minuti */

function tickHydration(isRunningWork) {
  if (!isRunningWork || cfg.hydration === false) return;
  _hydroWorkMinutes++;
  updateHydroDrop();
  if (_hydroWorkMinutes >= HYDRO_INTERVAL) {
    _hydroWorkMinutes = 0;
    const wrap = document.getElementById('hydro-large-wrap');
    if (wrap) {
      wrap.classList.add('full');
      setTimeout(() => { wrap.classList.remove('full'); updateHydroDrop(); }, 1400);
    }
    _showHydrationToast();
  }
}

function resetHydrationCounter() {
  _hydroWorkMinutes = 0;
  updateHydroDrop();
}

function updateHydroDrop() {
  const wrap = document.getElementById('hydro-large-wrap');
  if (!wrap) return;
  if (cfg.hydration === false) { wrap.style.opacity = '0'; return; }
  wrap.style.opacity = '';
  const ring  = document.getElementById('hydro-large-fill');
  const label = document.getElementById('hydro-large-min');
  if (ring) {
    const progress = Math.min(1, _hydroWorkMinutes / HYDRO_INTERVAL);
    const circ = 175.9;
    ring.style.strokeDashoffset = String(circ * (1 - progress));
  }
  if (label) {
    const mins = Math.max(0, HYDRO_INTERVAL - _hydroWorkMinutes);
    label.innerHTML = `${mins}<span class="hydro-large-unit">m</span>`;
  }
}

function syncHydroToTimer(running, mode) {
  const wrap = document.getElementById('hydro-large-wrap');
  if (!wrap) return;
  wrap.classList.toggle('wave', !!(running && mode === 'work'));
}

/* ══════════════════════════════════════
   LIVELLO GIORNALIERO
═══════════════════════════════════════ */
const STUDY_LEVELS = [
  { min:   0, icon: '📚', name: 'Novizio' },
  { min:  30, icon: '🔥', name: 'Studente' },
  { min:  60, icon: '⚡', name: 'Concentrato' },
  { min: 120, icon: '💪', name: 'Studioso' },
  { min: 180, icon: '🌟', name: 'Ricercatore' },
  { min: 240, icon: '👑', name: 'Genio' },
];
let _lastLevelIdx = -1;

function updateLevelPill() {
  const pill   = document.getElementById('level-pill');
  const iconEl = document.getElementById('level-icon');
  const nameEl = document.getElementById('level-name');
  if (!pill || !iconEl || !nameEl) return;

  const mins = (typeof stats !== 'undefined' && stats) ? (stats.minutes || 0) : 0;
  let level = STUDY_LEVELS[0], levelIdx = 0;
  for (let i = 0; i < STUDY_LEVELS.length; i++) {
    if (mins >= STUDY_LEVELS[i].min) { level = STUDY_LEVELS[i]; levelIdx = i; }
  }

  if (levelIdx !== _lastLevelIdx && _lastLevelIdx !== -1) {
    pill.classList.remove('levelup');
    void pill.offsetWidth;
    pill.classList.add('levelup');
    if (typeof celebrate === 'function') celebrate(15);
  }
  _lastLevelIdx = levelIdx;
  iconEl.textContent = level.icon;
  nameEl.textContent = level.name;
}

function _showHydrationToast() {
  const existing = document.getElementById('hydro-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'hydro-toast';
  t.innerHTML = `<span>💧 Bevi un bicchiere d'acqua!</span>
    <button onclick="document.getElementById('hydro-toast').remove()">✕</button>`;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 8000);
}

/* Inietta il toggle idratazione nel modale impostazioni se non c'è */
function _injectHydrationToggle() {
  /* Aspetta che il DOM sia pronto */
  requestAnimationFrame(() => {
    const modal = document.querySelector('#settingsModal .modal');
    if (!modal || document.getElementById('tog-hydration')) return;
    const row = document.createElement('div');
    row.className = 's-row';
    row.innerHTML = `<div><div class="s-label">Promemoria acqua</div><div class="s-sub">ogni 30 min</div></div>
      <button class="toggle ${cfg.hydration !== false ? 'on' : ''}" id="tog-hydration" onclick="toggleSetting('hydration')"></button>`;
    modal.appendChild(row);
  });
}

/* ══════════════════════════════════════
   ADMIN DOT — pannello debug monete
   Piccolo dot colorato nell'angolo in basso a sinistra
═══════════════════════════════════════ */
function _initAdminDot() {
  /* Dot */
  const dot = document.createElement('button');
  dot.id = 'admin-dot';
  dot.setAttribute('aria-label', 'Admin');
  document.body.appendChild(dot);

  /* Pannello */
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div class="adm-title">Admin</div>
    <div class="adm-row">
      <input id="adm-amount" type="number" value="100" min="1" max="9999" class="adm-input" placeholder="Monete">
      <button class="adm-btn adm-add" onclick="_adminAdd()">+ Aggiungi</button>
    </div>
    <div class="adm-row">
      <button class="adm-btn adm-set" onclick="_adminSet()">Imposta saldo</button>
      <button class="adm-btn adm-reset" onclick="_adminReset()">Reset tutto</button>
    </div>
    <div class="adm-balance" id="adm-balance-display">Saldo: 0</div>
  `;
  document.body.appendChild(panel);

  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('adm-open');
    if (open) _adminRefreshDisplay();
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== dot) {
      panel.classList.remove('adm-open');
    }
  });
}

function _adminRefreshDisplay() {
  if (typeof loadCoinData === 'function') loadCoinData();
  const bal = (typeof coinData !== 'undefined') ? coinData.balance : 0;
  const el = document.getElementById('adm-balance-display');
  if (el) el.textContent = 'Saldo: ' + bal + ' monete';
}

function _adminAdd() {
  const n = parseInt(document.getElementById('adm-amount')?.value) || 0;
  if (n <= 0) return;
  if (typeof earnCoins === 'function') {
    earnCoins(n);
  } else {
    if (typeof loadCoinData === 'function') loadCoinData();
    if (typeof coinData !== 'undefined') {
      coinData.balance = (coinData.balance || 0) + n;
      if (typeof saveCoinData === 'function') saveCoinData();
      if (typeof _updateCoinDisplay === 'function') _updateCoinDisplay();
    }
  }
  _adminRefreshDisplay();
  if (typeof renderShopPage === 'function') renderShopPage();
}

function _adminSet() {
  const n = parseInt(document.getElementById('adm-amount')?.value);
  if (isNaN(n) || n < 0) return;
  if (typeof loadCoinData === 'function') loadCoinData();
  if (typeof coinData !== 'undefined') {
    coinData.balance = n;
    if (typeof saveCoinData === 'function') saveCoinData();
    if (typeof _updateCoinDisplay === 'function') _updateCoinDisplay();
  }
  _adminRefreshDisplay();
  if (typeof renderShopPage === 'function') renderShopPage();
}

function _adminReset() {
  localStorage.removeItem('sf_coins');
  if (typeof loadCoinData === 'function') loadCoinData();
  if (typeof _updateCoinDisplay === 'function') _updateCoinDisplay();
  _adminRefreshDisplay();
  if (typeof renderShopPage === 'function') renderShopPage();
}
