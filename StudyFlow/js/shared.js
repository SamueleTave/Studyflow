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

function _makeBeepNote(ctx, freq, when, dur, vol) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.value = freq;
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function _playSoundBell() {
  try {
    const ctx = getAudioCtx();
    /* campanella: armonici che si smorzano lentamente */
    [[880,0,0.9,0.18],[1760,0,0.65,0.10],[2640,0.01,0.45,0.07]].forEach(([f,w,d,v]) => _makeBeepNote(ctx,f,w,d,v));
  } catch(e){}
}

function _playSoundChime() {
  try {
    const ctx = getAudioCtx();
    /* carillon: sequenza di note C-E-G-C */
    [[523,0,0.55,0.22],[659,0.19,0.55,0.20],[784,0.38,0.55,0.18],[1047,0.57,0.7,0.22]].forEach(([f,w,d,v]) => _makeBeepNote(ctx,f,w,d,v));
  } catch(e){}
}

function _playSoundGong() {
  try {
    const ctx = getAudioCtx();
    /* gong zen: bassa frequenza, lunga coda */
    [[110,0,2.8,0.20],[220,0,2.0,0.14],[330,0.02,1.4,0.08]].forEach(([f,w,d,v]) => _makeBeepNote(ctx,f,w,d,v));
  } catch(e){}
}

function _playSoundSoft() {
  try {
    const ctx = getAudioCtx();
    /* ding soft: delicato e discreto */
    [[660,0,0.38,0.10],[990,0.22,0.30,0.07]].forEach(([f,w,d,v]) => _makeBeepNote(ctx,f,w,d,v));
  } catch(e){}
}

function playBeep() {
  if (!cfg.sound) return;
  try {
    /* Controlla suono timer attivo */
    const activeSnd = (typeof coinData !== 'undefined') ? (coinData.activeEffects.activeTimerSound || '') : '';
    if (activeSnd === 'bell')  { _playSoundBell();  return; }
    if (activeSnd === 'chime') { _playSoundChime(); return; }
    if (activeSnd === 'gong')  { _playSoundGong();  return; }
    if (activeSnd === 'soft')  { _playSoundSoft();  return; }
    /* Default: doppio beep */
    const ctx = getAudioCtx();
    [[880, 0, 0.55, 0.26], [1100, 0.32, 0.4, 0.22]].forEach(([f,w,d,v]) => _makeBeepNote(ctx,f,w,d,v));
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
  _renderSettingsWidgetList();
  initAccentSwatches('accent-swatches');
  const ul = document.getElementById('settings-user-label');
  if (ul) {
    try {
      const a = JSON.parse(sessionStorage.getItem('sf_auth') || 'null');
      if (a?.username) ul.textContent = a.username;
    } catch {}
  }
  el.classList.add('open');
}

function _renderSettingsWidgetList() {
  const list = document.getElementById('settings-widget-list');
  if (!list || typeof _wState === 'undefined' || typeof WIDGET_CATALOG === 'undefined') return;
  const added = _wState.order.filter(id => {
    const w = WIDGET_CATALOG.find(c => c.id === id);
    return w && _isUnlocked(id);
  });
  if (!added.length) {
    list.innerHTML = '<div style="font-size:0.78rem;color:var(--text-soft);padding:6px 0">Nessun widget aggiunto ancora</div>';
    return;
  }
  const _sb = (active) => `padding:3px 9px;border-radius:7px;border:1.5px solid ${active?'var(--accent)':'var(--card-border)'};background:${active?'var(--accent)':'rgba(255,255,255,0.45)'};color:${active?'#fff':'var(--text-soft)'};font-size:0.68rem;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s`;
  list.innerHTML = added.map(id => {
    const w      = WIDGET_CATALOG.find(c => c.id === id);
    const sz     = (_wState.sizes && _wState.sizes[id]) || 'sm';
    const hidden = _wState.hidden.includes(id);
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;border:1px solid var(--card-border);background:${hidden?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.35)'};opacity:${hidden?'0.6':'1'}">
      <span style="font-size:1rem;flex-shrink:0">${w.icon}</span>
      <span style="flex:1;font-size:0.8rem;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.label}</span>
      <div style="display:flex;gap:3px;align-items:center;flex-shrink:0">
        <button onclick="setWidgetSize('${id}','sm');_renderSettingsWidgetList()" style="${_sb(sz==='sm')}">S</button>
        <button onclick="setWidgetSize('${id}','md');_renderSettingsWidgetList()" style="${_sb(sz==='md')}">M</button>
        <button onclick="setWidgetSize('${id}','lg');_renderSettingsWidgetList()" style="${_sb(sz==='lg')}">L</button>
        <button onclick="toggleWidget('${id}');_renderSettingsWidgetList()" title="${hidden?'Mostra':'Nascondi'}"
          style="margin-left:4px;width:28px;height:28px;border-radius:8px;border:1px solid var(--card-border);background:rgba(255,255,255,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.9rem;transition:background 0.15s"
          onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.5)'">${hidden?'👁':'🚫'}</button>
      </div>
    </div>`;
  }).join('');
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
  if (k === 'skyRoleTint' && typeof updateGardenSky === 'function') updateGardenSky();
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
  _injectSkyRoleTintToggle();
  checkAnimalMood();
  _initPresence();
  _initHelpButton();
  _initNotifications();
  _initStreakBadge();
  _initCustomTheme();
  // _injectLeaderboardLink(); // classifica già presente in friends.html
  _initMobileHamburger();
}

/* ══════════════════════════════════════
   MOBILE HAMBURGER MENU
═══════════════════════════════════════ */
function _initMobileHamburger() {
  if (document.getElementById('sf-hamburger')) return;

  /* Overlay */
  var overlay = document.createElement('div');
  overlay.id = 'sf-mob-overlay';
  overlay.onclick = _closeMobileMenu;
  document.body.appendChild(overlay);

  /* Hamburger button */
  var btn = document.createElement('button');
  btn.id = 'sf-hamburger';
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML =
    '<span class="hb-line"></span>' +
    '<span class="hb-line"></span>' +
    '<span class="hb-line"></span>';
  btn.onclick = _toggleMobileMenu;
  document.body.appendChild(btn);

  /* Pulsante ✕ interno alla sidebar (visibile solo su mobile schermo intero) */
  var sidebar = document.querySelector('aside.sidebar');
  if (sidebar) {
    var closeBtn = document.createElement('button');
    closeBtn.id = 'sf-sidebar-close';
    closeBtn.setAttribute('aria-label', 'Chiudi menu');
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = _closeMobileMenu;
    closeBtn.style.cssText =
      'display:none;position:absolute;top:16px;right:16px;width:36px;height:36px;' +
      'border-radius:10px;border:none;background:rgba(0,0,0,0.06);color:var(--text);' +
      'font-size:1.05rem;cursor:pointer;align-items:center;justify-content:center;' +
      'font-family:inherit;z-index:2;transition:background 0.15s;';
    closeBtn.onmouseenter = function(){ this.style.background = 'rgba(0,0,0,0.12)'; };
    closeBtn.onmouseleave = function(){ this.style.background = 'rgba(0,0,0,0.06)'; };
    sidebar.appendChild(closeBtn);

    /* Chiudi menu quando si clicca un link nella sidebar */
    sidebar.addEventListener('click', function(e) {
      var link = e.target.closest('a[href], button.nav-link');
      if (link && window.innerWidth <= 960) _closeMobileMenu();
    });
  }
}

function _toggleMobileMenu() {
  var sidebar = document.querySelector('aside.sidebar');
  var open = sidebar && sidebar.classList.toggle('mob-open');
  var overlay  = document.getElementById('sf-mob-overlay');
  var btn      = document.getElementById('sf-hamburger');
  var closeBtn = document.getElementById('sf-sidebar-close');
  if (overlay)  overlay.classList.toggle('mob-open', open);
  if (btn)      btn.classList.toggle('mob-open', open);
  if (closeBtn) closeBtn.style.display = open ? 'flex' : 'none';
  document.body.style.overflow = open ? 'hidden' : '';
}

function _closeMobileMenu() {
  var sidebar  = document.querySelector('aside.sidebar');
  var overlay  = document.getElementById('sf-mob-overlay');
  var btn      = document.getElementById('sf-hamburger');
  var closeBtn = document.getElementById('sf-sidebar-close');
  if (sidebar)  sidebar.classList.remove('mob-open');
  if (overlay)  overlay.classList.remove('mob-open');
  if (btn)      btn.classList.remove('mob-open');
  if (closeBtn) closeBtn.style.display = 'none';
  document.body.style.overflow = '';
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
      <div class="checkin-compreh-label">Quanto hai capito?</div>
      <div class="checkin-compreh" id="checkin-compreh">
        <button class="compreh-btn" onclick="_selectCompreh(1)">😵<span>Poco</span></button>
        <button class="compreh-btn" onclick="_selectCompreh(2)">😐<span>Abbastanza</span></button>
        <button class="compreh-btn" onclick="_selectCompreh(3)">🙂<span>Bene</span></button>
        <button class="compreh-btn" onclick="_selectCompreh(4)">😊<span>Molto</span></button>
        <button class="compreh-btn" onclick="_selectCompreh(5)">🤩<span>Perfetto!</span></button>
      </div>
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
let _selectedCompreh = -1;

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
  _selectedCompreh = -1;
  overlay.querySelectorAll('.compreh-btn').forEach(b => b.classList.remove('selected'));

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

function _selectCompreh(v) {
  _selectedCompreh = v;
  document.querySelectorAll('.compreh-btn').forEach((b, i) => b.classList.toggle('selected', (i + 1) === v));
}

function _confirmCheckin() {
  const noteEl = document.getElementById('checkin-note');
  const note = noteEl ? noteEl.value.trim() : '';
  _saveCheckinData(_selectedMood, note, _selectedCompreh);
  _closeCheckin();
}

function _closeCheckin() {
  clearTimeout(_checkinTimeout);
  const overlay = document.getElementById('checkin-overlay');
  if (overlay) overlay.classList.remove('open');
  if (_checkinCallback) { _checkinCallback(); _checkinCallback = null; }
}

function _saveCheckinData(mood, note, compreh) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const checkins = JSON.parse(localStorage.getItem('sf_checkins') || '[]');
    checkins.push({ date: today, ts: Date.now(), mood, note, compreh });
    if (checkins.length > 200) checkins.splice(0, checkins.length - 200);
    localStorage.setItem('sf_checkins', JSON.stringify(checkins));
  } catch {}
}

/* ══════════════════════════════════════
   FEATURE 4 — PROMEMORIA IDRATAZIONE
═══════════════════════════════════════ */
let _hydroWorkMinutes = 0;
const HYDRO_INTERVAL  = 30; /* minuti */

function _playWaterSound() {
  if (!cfg.sound) return;
  try {
    const ctx = getAudioCtx();
    [[1400, 0, 0.35], [1050, 0.22, 0.38]].forEach(([freq, when, dur]) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = ctx.currentTime + when;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
  } catch (e) {}
}

function tickHydration(isRunningWork) {
  if (!isRunningWork || cfg.hydration === false) return;
  _hydroWorkMinutes++;
  updateHydroDrop();
  if (_hydroWorkMinutes >= HYDRO_INTERVAL) {
    _hydroWorkMinutes = 0;
    _playWaterSound();
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
/* ── Ruoli backend (specchiati da app.py) ── */
const SF_ROLES = [
  { min:   0, key: 'novizio',
    emoji: '🌱', name: 'Novizio',
    color: '#6b7280', bg: 'rgba(107,114,128,0.12)',
    grad: ['#9ca3af','#6b7280'], coinBonus: 0,
    perk: 'Punto di partenza',
    perks: ['⏱ Timer Pomodoro base', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> Monete standard per sessione'] },

  { min:   1, key: 'studente',
    emoji: '📖', name: 'Studente',
    color: '#3b82f6', bg: 'rgba(59,130,246,0.13)',
    grad: ['#60a5fa','#3b82f6'], coinBonus: 2,
    perk: 'Widget Citazione sbloccato',
    perks: ['💬 Widget Citazione motivazionale', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +2 monete per sessione', '🤝 Accesso alle sfide amici'] },

  { min:  10, key: 'applicato',
    emoji: '🎯', name: 'Applicato',
    color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)',
    grad: ['#a78bfa','#8b5cf6'], coinBonus: 3,
    perk: 'Tema Viola sbloccato',
    perks: ['🎨 Tema Viola e Smeraldo', '🐰 Coniglio compagno', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +3 monete per sessione', '📊 Statistiche avanzate'] },

  { min:  25, key: 'determinato',
    emoji: '🔥', name: 'Determinato',
    color: '#f97316', bg: 'rgba(249,115,22,0.15)',
    grad: ['#fb923c','#f97316'], coinBonus: 5,
    perk: 'Coniglio compagno interattivo',
    perks: ['🔥 Animali interattivi sbloccati', '⚡ Sfide premium accesso', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +5 monete per sessione', '🏅 Badge fuoco in classifica'] },

  { min:  50, key: 'studioso',
    emoji: '⭐', name: 'Studioso',
    color: '#10b981', bg: 'rgba(16,185,129,0.14)',
    grad: ['#34d399','#10b981'], coinBonus: 8,
    perk: 'Tema Foresta sbloccato',
    perks: ['🌲 Tema Foresta esclusivo', '🦉 Tutti gli animali base', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +8 monete per sessione', '🥇 Bordo verde in classifica'] },

  { min: 100, key: 'esperto',
    emoji: '💎', name: 'Esperto',
    color: '#06b6d4', bg: 'rgba(6,182,212,0.14)',
    grad: ['#22d3ee','#06b6d4'], coinBonus: 12,
    perk: 'Tutti gli animali sbloccati',
    perks: ['💎 Tutti gli animali premium', '📐 Widget taglia XL', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +12 monete per sessione', '✨ Frame speciale profilo classifica'] },

  { min: 200, key: 'maestro',
    emoji: '🏆', name: 'Maestro',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',
    grad: ['#fcd34d','#f59e0b'], coinBonus: 20,
    perk: 'Tutto sbloccato — titolo esclusivo',
    perks: ['👑 Titolo Maestro nel profilo', '🏆 Bordo oro in classifica', '<svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> +20 monete per sessione', '🎁 Tutto sbloccato per sempre'] },
];

function _getBackendRole(sessionCount) {
  // Controlla prima l'override admin
  const override = localStorage.getItem('sf_role_override');
  if (override && override !== 'auto' && override !== '') {
    const found = SF_ROLES.find(r => r.key === override);
    if (found) return found;
  }
  let role = SF_ROLES[0];
  for (const r of SF_ROLES) { if (sessionCount >= r.min) role = r; }
  return role;
}

let _lastRoleKey = (() => {
  try {
    const ov = localStorage.getItem('sf_role_override');
    if (ov && ov !== 'auto' && ov !== '') return ov;
    const sessions = JSON.parse(localStorage.getItem('sf_sessions') || '[]');
    const n = Array.isArray(sessions) ? sessions.length : 0;
    let key = SF_ROLES[0].key;
    for (const r of SF_ROLES) { if (n >= r.min) key = r.key; }
    return key;
  } catch { return ''; }
})();

function updateLevelPill() {
  const pill   = document.getElementById('level-pill');
  const iconEl = document.getElementById('level-icon');
  const nameEl = document.getElementById('level-name');
  if (!pill || !iconEl || !nameEl) return;

  let sessionCount = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('sf_sessions') || '[]');
    sessionCount = Array.isArray(sessions) ? sessions.length : 0;
  } catch {}

  const role = _getBackendRole(sessionCount);

  if (_lastRoleKey && _lastRoleKey !== role.key) {
    pill.classList.remove('levelup');
    void pill.offsetWidth;
    pill.classList.add('levelup');
    if (typeof celebrate === 'function') celebrate(20);
    _showRoleLevelUpToast(role);
  }
  _lastRoleKey = role.key;

  iconEl.textContent = role.emoji;
  nameEl.textContent = role.name;
  pill.style.background = role.bg;
  pill.style.borderColor = role.color + '55';
  nameEl.style.color = role.color;
}

function _showRoleLevelUpToast(role) {
  // Unlock description: prima riga = perk, seconda = item sbloccato nello shop
  const ROLE_UNLOCKS = {
    studente:    'Widget Citazione gratis sbloccato!',
    applicato:   'Tema Tramonto sbloccato nello shop!',
    determinato: 'Pelo Arancione del Coniglio sbloccato!',
    studioso:    'Mongolfiera Stellata + Pelo Viola sbloccati!',
    esperto:     'Gatto Argento + Aurora Boreale sbloccati!',
    maestro:     'Drago 🐉 + Tema Oro ✨ sbloccati!',
  };
  const unlockText = ROLE_UNLOCKS[role.key] || role.perk;

  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);z-index:9000;' +
    'background:rgba(255,255,255,0.95);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);' +
    'border:2px solid ' + role.color + '55;border-radius:20px;padding:16px 24px 14px;max-width:320px;width:90%;' +
    'box-shadow:0 12px 40px ' + role.color + '33,0 4px 16px rgba(0,0,0,0.12);' +
    'font-family:Poppins,sans-serif;transition:transform 0.5s cubic-bezier(0.32,0.72,0,1),opacity 0.5s;opacity:0';
  t.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
      '<span style="font-size:2rem;line-height:1;filter:drop-shadow(0 2px 8px ' + role.color + '66)">' + role.emoji + '</span>' +
      '<div>' +
        '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:' + role.color + ';margin-bottom:1px">Ruolo sbloccato!</div>' +
        '<div style="font-weight:800;color:' + role.color + ';font-size:1.05rem">' + role.name + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="height:1px;background:' + role.color + '25;margin-bottom:8px"></div>' +
    '<div style="font-size:0.75rem;color:#374151;font-weight:600">🎁 ' + unlockText + '</div>' +
    '<div style="font-size:0.7rem;color:#9ca3af;margin-top:3px">' + (role.coinBonus > 0 ? '+' + role.coinBonus + ' <svg width="11" height="11" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;display:inline-block"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> per ogni sessione da ora in poi' : '') + '</div>';
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.transform = 'translateX(-50%) translateY(0)';
    t.style.opacity = '1';
  });
  setTimeout(() => {
    t.style.transform = 'translateX(-50%) translateY(80px)';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 500);
  }, 5500);

  // Salva notifica nel server
  const auth = typeof getAuth === 'function' ? getAuth() : null;
  if (auth && auth.token && role.key !== 'novizio') {
    fetch((window.SF_API_BASE || '/api') + '/notifications/role-up', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleKey: role.key, roleName: role.name, perk: role.perk, unlock: unlockText })
    }).then(() => { setTimeout(_fetchNotifications, 600); }).catch(() => {});
  }
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

/* Inietta il toggle tint cielo ruolo nel modale impostazioni */
function _injectSkyRoleTintToggle() {
  requestAnimationFrame(() => {
    const modal = document.querySelector('#settingsModal .modal');
    if (!modal || document.getElementById('tog-skyRoleTint')) return;
    const row = document.createElement('div');
    row.className = 's-row';
    row.innerHTML = `<div><div class="s-label">🌤 Cielo ruolo</div><div class="s-sub">tint colorato nel giardino</div></div>
      <button class="toggle ${cfg.skyRoleTint !== false ? 'on' : ''}" id="tog-skyRoleTint" onclick="toggleSetting('skyRoleTint')"></button>`;
    modal.appendChild(row);
  });
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

/* ══════════════════════════════════════
   FEATURE — PENSIERI ANIMALI
═══════════════════════════════════════ */
function showAnimalThought(text, duration) {
  duration = duration || 5000;
  var b = document.getElementById('animal-bubble');
  if (!b) {
    b = document.createElement('div');
    b.id = 'animal-bubble';
    (document.querySelector('.app') || document.body).appendChild(b);
  }
  clearTimeout(b._hideTimer);
  b.textContent = text;
  b.className = 'animal-bubble ab-show';
  b._hideTimer = setTimeout(function() {
    b.classList.remove('ab-show');
    b.classList.add('ab-hide');
    setTimeout(function() { b.className = 'animal-bubble'; }, 400);
  }, duration);
}

function checkAnimalMood() {
  if (sessionStorage.getItem('sf_mood_shown')) return;
  // Mostra il fumetto solo se c'è almeno un animale attivo
  if (typeof coinData === 'undefined' || !coinData || !coinData.activeEffects) return;
  var fx = coinData.activeEffects;
  if (!fx.catVisible && !fx.dogVisible && !fx.rabbitVisible && !fx.foxVisible && !fx.parrotVisible && !fx.owlVisible && !fx.lionVisible) return;

  var s         = (typeof stats !== 'undefined') ? stats : {};
  var sessions  = s.sessions  || 0;
  var streak    = s.streak    || 0;
  var lastStudy = s.lastStudy || null;
  var today     = new Date().toDateString();
  var yesterday = new Date(Date.now() - 86400000).toDateString();

  var msg = '';
  if (lastStudy && lastStudy !== today && lastStudy !== yesterday) {
    var daysAgo = Math.round((Date.now() - new Date(lastStudy)) / 86400000);
    msg = daysAgo <= 2
      ? 'Ieri non ti ho visto… torna a studiare! 🥺'
      : daysAgo + ' giorni senza studiare… mi manchi! 😿';
  } else if (streak >= 7) {
    msg = streak + ' giorni di streak — sei inarrestabile! 👑';
  } else if (streak >= 3) {
    msg = streak + ' giorni di fila, continua cos\xEC! 🔥';
  } else if (sessions >= 4) {
    msg = sessions + ' sessioni oggi — sei in modalit\xE0 genio! 🌟';
  } else if (sessions >= 2) {
    msg = 'Bene! Gi\xE0 ' + sessions + ' sessioni completate 💪';
  } else if (sessions === 1) {
    msg = 'Prima sessione completata, ottimo inizio! ✨';
  } else {
    var h = new Date().getHours();
    if (h < 10)       msg = 'Buongiorno! Inizia con una sessione 📚';
    else if (h >= 21) msg = "Un’ultima sessione prima di dormire? 🌙";
    else              msg = 'Dai, inizia la prima sessione di oggi! 🎯';
  }
  if (msg) {
    sessionStorage.setItem('sf_mood_shown', '1');
    setTimeout(function() { showAnimalThought(msg); }, 2000);
  }
}

/* ══════════════════════════════════════
   FEATURE — PRESENZA SOCIALE
═══════════════════════════════════════ */
var _presenceStudying = false;

function setPresenceStudying(v) {
  const changed = (_presenceStudying !== !!v);
  _presenceStudying = !!v;
  if (changed) _pingPresence(); // ping immediato al cambio di stato
}

function _getAuth() {
  try { return JSON.parse(sessionStorage.getItem('sf_auth')); } catch(e) { return null; }
}

function _pingPresence() {
  var auth = _getAuth();
  if (!auth || !auth.token) return;
  var api  = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  var page = (window.location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
  fetch(api + '/presence/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth.token },
    body: JSON.stringify({ page: page, studying: _presenceStudying }),
  }).catch(function() {});
}

function _fetchOnline() {
  var auth = _getAuth();
  if (!auth || !auth.token) return;
  var api = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  fetch(api + '/presence/online', {
    headers: { 'Authorization': 'Bearer ' + auth.token },
  })
  .then(function(r) { return r.ok ? r.json() : []; })
  .then(function(users) { _renderOnlineWidget(users); })
  .catch(function() {});
}

function _renderOnlineWidget(users) {
  var el = document.getElementById('presence-widget');
  if (!el) return;
  var auth   = _getAuth();
  var me     = auth ? auth.username : null;
  var others = users.filter(function(u) { return u.username !== me; });
  if (!others.length) {
    el.innerHTML = '<span class="presence-empty">Nessun amico online</span>';
    return;
  }
  var studying  = others.filter(function(u) { return u.studying; });
  var countText = others.length === 1 ? '1 amico online' : others.length + ' amici online';
  if (studying.length) countText += ' \xB7 ' + studying.length + (studying.length === 1 ? ' studia' : ' studiano');
  el.innerHTML = '<div class="presence-count">' + countText + '</div>' +
    others.slice(0, 4).map(function(u) {
      return '<div class="presence-user">' +
        '<span class="presence-dot ' + (u.studying ? 'studying' : 'idle') + '"></span>' +
        '<span class="presence-name">' + esc(u.username) + '</span>' +
        '</div>';
    }).join('');
}

function _initPresence() {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  var spacer = sidebar.querySelector('.sidebar-spacer');
  if (!spacer) return;

  var section = document.createElement('div');
  section.className = 'presence-section';
  section.innerHTML =
    '<div class="presence-label">Chi studia ora</div>' +
    '<div id="presence-widget"><span class="presence-empty">—</span></div>';
  sidebar.insertBefore(section, spacer);

  var auth = _getAuth();
  if (!auth || !auth.token) return;
  _pingPresence();
  _fetchOnline();
  setInterval(function() { _pingPresence(); _fetchOnline(); }, 60000);
}

/* ══════════════════════════════════════
   FEATURE — NOTIFICHE
═══════════════════════════════════════ */
var _notifsData = [];

function _initNotifications() {
  var sidebarBottom = document.querySelector('.sidebar-bottom');
  if (sidebarBottom && !document.getElementById('notif-btn')) {
    var btn = document.createElement('button');
    btn.id = 'notif-btn';
    btn.className = 'nav-link';
    btn.setAttribute('onclick', 'openNotifications()');
    btn.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="nav-icon">' +
        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
        '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
      '</svg>' +
      '<span class="nav-label">Notifiche</span>' +
      '<span class="notif-badge" id="notif-badge" style="display:none"></span>';
    sidebarBottom.insertBefore(btn, sidebarBottom.firstChild);
  }

  if (!document.getElementById('notif-modal-overlay')) {
    var overlay = document.createElement('div');
    overlay.id = 'notif-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.32);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML =
      '<div style="background:var(--card);border:1px solid var(--card-border);border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,0.18);max-width:420px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:22px 24px 16px;border-bottom:1px solid var(--card-border)">' +
          '<div style="font-size:1.05rem;font-weight:700;color:var(--text)">🔔 Notifiche</div>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<button onclick="markAllNotifsRead()" style="font-size:0.78rem;color:var(--accent);background:none;border:none;cursor:pointer;font-family:Poppins,sans-serif;padding:4px 8px;border-radius:8px;font-weight:500">Segna tutte lette</button>' +
            '<button onclick="closeNotifications()" style="width:32px;height:32px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.5);cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center">×</button>' +
          '</div>' +
        '</div>' +
        '<div id="sf-notif-list" style="overflow-y:auto;flex:1;padding:14px 18px;display:flex;flex-direction:column;gap:8px">' +
          '<div style="text-align:center;color:var(--text-soft);font-size:0.85rem;padding:24px 0">Caricamento...</div>' +
        '</div>' +
      '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeNotifications(); });
    document.body.appendChild(overlay);
  }

  _fetchNotifications();
  setInterval(_fetchNotifications, 60000);
}

function _fetchNotifications() {
  var auth = _getAuth();
  if (!auth || !auth.token) return;
  var api = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  fetch(api + '/notifications', { headers: { 'Authorization': 'Bearer ' + auth.token } })
    .then(function(r) { return r.ok ? r.json() : []; })
    .then(function(data) {
      _notifsData = Array.isArray(data) ? data : [];
      var unread = _notifsData.filter(function(n) { return !n.is_read; }).length;
      var badge = document.getElementById('notif-badge');
      if (badge) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = unread ? 'inline-flex' : 'none';
      }
      var overlay = document.getElementById('notif-modal-overlay');
      if (overlay && overlay.style.display !== 'none') _renderNotifList();
    })
    .catch(function() {
      _notifsData = [];
      var el = document.getElementById('sf-notif-list');
      if (el) el.innerHTML = '<div style="text-align:center;color:var(--text-soft);font-size:0.85rem;padding:30px 0">Errore nel caricamento 😕</div>';
    });
}

function openNotifications() {
  var overlay = document.getElementById('notif-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  _renderNotifList();
}

function closeNotifications() {
  var overlay = document.getElementById('notif-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _renderNotifList() {
  var el = document.getElementById('sf-notif-list');
  if (!el) return;
  if (!_notifsData.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-soft);font-size:0.85rem;padding:30px 0">Nessuna notifica 🎉</div>';
    return;
  }
  el.innerHTML = _notifsData.map(function(n) {
    var unread = !n.is_read;
    var bg   = unread ? 'background:rgba(99,102,241,0.06);border-left:3px solid var(--accent);' : '';
    return '<div data-nid="' + n.id + '" style="padding:12px 14px;border-radius:12px;border:1px solid var(--card-border);' + bg + 'cursor:pointer;transition:background 0.15s" onclick="markNotifRead(' + n.id + ', this)">' +
      '<div style="display:flex;align-items:flex-start;gap:10px">' +
        '<span style="font-size:1.25rem;line-height:1.2">' + esc(n.emoji || '🔔') + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:0.87rem;color:var(--text);line-height:1.45">' + esc(n.message) + '</div>' +
          '<div style="font-size:0.71rem;color:var(--text-soft);margin-top:3px">' + _fmtNotifDate(n.created_at) + '</div>' +
        '</div>' +
        (unread ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:5px"></span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function markNotifRead(id, el) {
  var n = null;
  for (var i = 0; i < _notifsData.length; i++) { if (_notifsData[i].id === id) { n = _notifsData[i]; break; } }
  if (!n || n.is_read) return;
  n.is_read = true;
  if (el) {
    el.style.background = '';
    el.style.borderLeft = '';
    var dot = el.querySelector('[style*="border-radius:50%"]');
    if (dot) dot.remove();
  }
  var unread = _notifsData.filter(function(x) { return !x.is_read; }).length;
  var badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.style.display = unread ? 'inline-flex' : 'none';
  }
  var auth = _getAuth();
  if (!auth) return;
  var api = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  fetch(api + '/notifications/' + id + '/read', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + auth.token }
  }).catch(function() {});
}

function markAllNotifsRead() {
  _notifsData.forEach(function(n) { n.is_read = true; });
  var badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
  _renderNotifList();
  var auth = _getAuth();
  if (!auth) return;
  var api = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  fetch(api + '/notifications/read-all', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + auth.token }
  }).catch(function() {});
}

function _fmtNotifDate(dt) {
  if (!dt) return '';
  var d = new Date(dt.replace(' ', 'T'));
  var diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60)     return 'Adesso';
  if (diff < 3600)   return Math.floor(diff / 60) + ' min fa';
  if (diff < 86400)  return Math.floor(diff / 3600) + (Math.floor(diff / 3600) === 1 ? ' ora fa' : ' ore fa');
  if (diff < 604800) return Math.floor(diff / 86400) + ' giorni fa';
  return d.toLocaleDateString('it-IT');
}

/* ══════════════════════════════════════
   FEATURE — SEGNALA PROBLEMA
═══════════════════════════════════════ */
function _initHelpButton() {
  /* Inietta bottone nel fondo sidebar */
  var sidebarBottom = document.querySelector('.sidebar-bottom');
  if (sidebarBottom && !document.getElementById('help-report-btn')) {
    var btn = document.createElement('button');
    btn.id = 'help-report-btn';
    btn.className = 'nav-link';
    btn.setAttribute('onclick', 'openHelpModal()');
    btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="nav-icon"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="nav-label">Problemi</span>';
    sidebarBottom.insertBefore(btn, sidebarBottom.firstChild);
  }

  /* Crea modal help se non esiste */
  if (!document.getElementById('help-modal-overlay')) {
    var overlay = document.createElement('div');
    overlay.id = 'help-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.32);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = '<div style="background:var(--card);border:1px solid var(--card-border);border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,0.18);padding:30px 28px;max-width:440px;width:100%">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">' +
        '<div style="font-size:1.05rem;font-weight:700;color:var(--text)">🛠️ Segnala un problema</div>' +
        '<button onclick="closeHelpModal()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--text-soft);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center">✕</button>' +
      '</div>' +
      '<div style="font-size:0.82rem;color:var(--text-soft);margin-bottom:14px">Descrivi il problema o lascia un suggerimento. Lo riceverò direttamente nel pannello admin.</div>' +
      '<textarea id="help-modal-text" style="width:100%;min-height:110px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--card-border);background:var(--bg);color:var(--text);font-family:Poppins,sans-serif;font-size:0.88rem;resize:vertical;outline:none;transition:border-color 0.2s" placeholder="Descrivi il problema..." maxlength="2000"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">' +
        '<button onclick="closeHelpModal()" style="padding:9px 18px;border-radius:10px;border:1.5px solid var(--card-border);background:rgba(255,255,255,0.4);color:var(--text-soft);font-family:Poppins,sans-serif;font-size:0.83rem;font-weight:600;cursor:pointer">Annulla</button>' +
        '<button onclick="submitHelpReport()" id="help-submit-btn" style="padding:9px 20px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-family:Poppins,sans-serif;font-size:0.83rem;font-weight:600;cursor:pointer">Invia</button>' +
      '</div>' +
      '<div id="help-modal-msg" style="font-size:0.8rem;margin-top:10px;text-align:center;display:none"></div>' +
    '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeHelpModal(); });
    document.body.appendChild(overlay);
  }
}

function openHelpModal() {
  var overlay = document.getElementById('help-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  var ta = document.getElementById('help-modal-text');
  if (ta) { ta.value = ''; ta.focus(); }
  var msg = document.getElementById('help-modal-msg');
  if (msg) msg.style.display = 'none';
}

function closeHelpModal() {
  var overlay = document.getElementById('help-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function submitHelpReport() {
  var ta  = document.getElementById('help-modal-text');
  var msg = (ta ? ta.value : '').trim();
  if (!msg || msg.length < 5) {
    var info = document.getElementById('help-modal-msg');
    if (info) { info.textContent = 'Scrivi almeno qualche parola!'; info.style.color = '#dc2626'; info.style.display = 'block'; }
    return;
  }
  var btn = document.getElementById('help-submit-btn');
  if (btn) { btn.textContent = 'Invio...'; btn.disabled = true; }

  var auth = _getAuth();
  var api  = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  fetch(api + '/help', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (auth ? auth.token : '') },
    body: JSON.stringify({ message: msg }),
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (btn) { btn.textContent = 'Invia'; btn.disabled = false; }
    var info = document.getElementById('help-modal-msg');
    if (data.ok) {
      if (info) { info.textContent = 'Messaggio inviato! Grazie per il feedback 🙏'; info.style.color = '#16a34a'; info.style.display = 'block'; }
      if (ta) ta.value = '';
      setTimeout(closeHelpModal, 2000);
    } else {
      if (info) { info.textContent = data.error || 'Errore invio'; info.style.color = '#dc2626'; info.style.display = 'block'; }
    }
  })
  .catch(function() {
    if (btn) { btn.textContent = 'Invia'; btn.disabled = false; }
    var info = document.getElementById('help-modal-msg');
    if (info) { info.textContent = 'Errore di connessione'; info.style.color = '#dc2626'; info.style.display = 'block'; }
  });
}

/* ══════════════════════════════════════
   FEATURE: STREAK BADGE SIDEBAR
══════════════════════════════════════ */
function _streakLevel(s) {
  if (!s || s <= 0) return 0;
  if (s <= 2)  return 1;
  if (s <= 6)  return 2;
  if (s <= 13) return 3;
  return 4;
}

function _initStreakBadge() {
  var sidebarBottom = document.querySelector('.sidebar-bottom');
  if (!sidebarBottom || document.getElementById('streak-badge')) return;
  var badge = document.createElement('div');
  badge.id = 'streak-badge';
  badge.className = 'streak-badge';
  badge.setAttribute('data-lvl', '0');
  badge.innerHTML =
    '<span class="streak-fire" id="streak-fire">🔥</span>' +
    '<div class="streak-info">' +
      '<span class="streak-count" id="streak-count">0</span>' +
      '<span class="streak-label" id="streak-label">inizia oggi!</span>' +
    '</div>';
  sidebarBottom.insertBefore(badge, sidebarBottom.firstChild);
  _updateStreakBadge();
}

function _updateStreakBadge() {
  var el = document.getElementById('streak-count');
  if (!el) return;
  var s   = stats.streak || 0;
  var lvl = _streakLevel(s);
  el.textContent = s;

  var badge = document.getElementById('streak-badge');
  if (badge) {
    badge.setAttribute('data-lvl', lvl);
    badge.style.display = 'flex';  /* sempre visibile */
  }

  /* Label motivazionale per livello */
  var lbl = document.getElementById('streak-label');
  if (lbl) {
    var labels = [
      'inizia oggi!',
      'giorni di fila 🌱',
      'giorni consecutivi ⚡',
      'giorni — fantastico! 🌟',
      'giorni — sei una leggenda! 👑'
    ];
    lbl.textContent = labels[lvl] || 'giorni di fila';
  }
}

/* ══════════════════════════════════════
   FEATURE: ACCENT COLOR CUSTOM
══════════════════════════════════════ */
var _SF_ACCENT_PRESETS = [
  { hex: '#6366f1', rgb: '99,102,241' },  // indigo
  { hex: '#8b5cf6', rgb: '139,92,246' },  // violet
  { hex: '#ec4899', rgb: '236,72,153' },  // pink
  { hex: '#f97316', rgb: '249,115,22' },  // orange
  { hex: '#10b981', rgb: '16,185,129' },  // emerald
  { hex: '#06b6d4', rgb: '6,182,212'  },  // cyan
  { hex: '#f59e0b', rgb: '245,158,11' },  // amber
  { hex: '#ef4444', rgb: '239,68,68'  },  // red
];

function _initCustomTheme() {
  var saved = localStorage.getItem('sf_accent_color');
  if (saved) _applyAccentColor(saved, false);
}

function _applyAccentColor(hex, save) {
  var preset = _SF_ACCENT_PRESETS.find(function(p) { return p.hex === hex; });
  var rgb = preset ? preset.rgb : _hexToRgb(hex);
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-2', hex);
  document.documentElement.style.setProperty('--accent-rgb', rgb);
  if (save !== false) {
    localStorage.setItem('sf_accent_color', hex);
  }
  _syncAccentSwatches(hex);
}

function _hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return r + ',' + g + ',' + b;
}

function initAccentSwatches(containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var saved = localStorage.getItem('sf_accent_color') || '#6366f1';
  el.innerHTML = _SF_ACCENT_PRESETS.map(function(p) {
    return '<button class="accent-swatch' + (p.hex === saved ? ' active' : '') + '" ' +
      'style="background:' + p.hex + '" ' +
      'onclick="_applyAccentColor(\'' + p.hex + '\')" ' +
      'title="' + p.hex + '"></button>';
  }).join('');
}

function _syncAccentSwatches(hex) {
  document.querySelectorAll('.accent-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.style.background === hex || sw.getAttribute('style') === 'background:' + hex);
  });
}

/* ══════════════════════════════════════
   FEATURE: LEADERBOARD NAV LINK
══════════════════════════════════════ */
function _injectLeaderboardLink() {
  var nav = document.querySelector('.sidebar nav, aside.sidebar');
  if (!nav) return;
  if (document.querySelector('[data-page="leaderboard"]')) return;
  var friendsLink = document.querySelector('[data-page="friends"]');
  if (!friendsLink) return;
  var lb = document.createElement('a');
  lb.href = 'leaderboard.html';
  lb.className = 'nav-link';
  lb.setAttribute('data-page', 'leaderboard');
  lb.innerHTML = '<i data-feather="award" class="nav-icon"></i><span class="nav-label">Classifica</span>';
  friendsLink.parentNode.insertBefore(lb, friendsLink.nextSibling);
  if (typeof feather !== 'undefined') feather.replace();
  if (window.location.pathname.includes('leaderboard')) lb.classList.add('active');
}
