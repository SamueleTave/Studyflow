/* =====================================================
   WIDGETS.JS — Sistema widget personalizzabile
   Right column timer page
   ===================================================== */

const WIDGET_KEY = 'sf_widgets';

/* Catalogo completo — free = visibile di default nel picker */
const WIDGET_CATALOG = [
  { id: 'deal',      label: 'Offerta del Giorno',   icon: '⚡', free: true  },
  { id: 'cal',       label: 'Calendario',            icon: '📅', free: true  },
  { id: 'tasks',     label: 'Task di Oggi',           icon: '✅', free: true  },
  { id: 'quote',     label: 'Citazione del Giorno',  icon: '💬', free: true  },
  { id: 'focusgoal', label: 'Obiettivo Focus',       icon: '🎯', free: true  },
  { id: 'music',     label: 'Suoni Ambientali',      icon: '🎵', free: false, price: 80 },
  { id: 'stats',     label: 'Mini Statistiche',      icon: '📊', free: false, price: 50 },
  { id: 'mood',      label: 'Mood Tracker',          icon: '😊', free: false, price: 60 },
  { id: 'postit',     label: 'Bacheca Post-it',        icon: '📌', free: true  },
  { id: 'countdown',  label: 'Countdown Scadenza',    icon: '⏳', free: false, price: 70 },
  { id: 'flash',      label: 'Sfida Flash',           icon: '⚡', free: true  },
  { id: 'spotify',    label: 'Spotify',               icon: '🎵', free: false, price: 100 },
  { id: 'taskrandom', label: 'Task Casuale',          icon: '🎲', free: true  },
  { id: 'calc',       label: 'Calcolatrice',          icon: '🔢', free: true  },
];

/* Stato: order, hidden, unlocked, sizes = { id: 'sm'|'md'|'lg' } */
let _wState = {
  order:    ['deal', 'cal', 'tasks'],
  hidden:   [],
  unlocked: [],
  sizes:    {},
};

function _loadWidgetState() {
  try {
    const raw = localStorage.getItem(WIDGET_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.order)    _wState.order    = s.order;
    if (s.hidden)   _wState.hidden   = s.hidden;
    if (s.unlocked) _wState.unlocked = s.unlocked;
    if (s.sizes)    _wState.sizes    = s.sizes;
  } catch {}
}

function _saveWidgetState() {
  try { localStorage.setItem(WIDGET_KEY, JSON.stringify(_wState)); } catch {}
}

function setWidgetSize(id, size) {
  _wState.sizes[id] = size;
  _saveWidgetState();
  const col = document.getElementById('widget-column');
  const el  = col && col.querySelector(`[data-widget-id="${id}"]`);
  if (el) _applyWidgetSize(el, id);
  _refreshPickerList();
}

function _applyWidgetSize(el, id) {
  el.classList.remove('wcard-sm', 'wcard-md', 'wcard-lg');
  const sz = _wState.sizes[id] || 'sm';
  if (sz !== 'sm') el.classList.add('wcard-' + sz);
  /* aggiorna pulsanti resize attivi */
  el.querySelectorAll('.wrs-btn').forEach(btn => {
    btn.classList.toggle('wrs-active', btn.dataset.size === sz);
  });
}

function _isUnlocked(id) {
  const w = WIDGET_CATALOG.find(c => c.id === id);
  return !!(w && (w.free || _wState.unlocked.includes(id)));
}

/* ── INIT ── */
function initWidgets() {
  _loadWidgetState();
  _applyStaticWidgetState();
  _renderOrderedDynamicWidgets();
  _addPersonalizeButton();
  _enableDragDrop();
}

function _resizeBtnsHTML(id) {
  const sz = _wState.sizes[id] || 'sm';
  return `<div class="wrs-bar">
    <button class="wrs-btn${sz==='sm'?' wrs-active':''}" data-size="sm" onclick="setWidgetSize('${id}','sm')" title="Compatto">▬</button>
    <button class="wrs-btn${sz==='md'?' wrs-active':''}" data-size="md" onclick="setWidgetSize('${id}','md')" title="Medio">▭</button>
    <button class="wrs-btn${sz==='lg'?' wrs-active':''}" data-size="lg" onclick="setWidgetSize('${id}','lg')" title="Grande">□</button>
  </div>`;
}

/* Applica ordine, visibilità e size ai widget STATICI (già in HTML) */
function _applyStaticWidgetState() {
  const col = document.getElementById('widget-column');
  if (!col) return;

  col.querySelectorAll('[data-widget-id]').forEach(el => {
    const id  = el.dataset.widgetId;
    const idx = _wState.order.indexOf(id);
    el.style.order   = idx >= 0 ? String(idx * 10) : '0';
    el.style.display = _wState.hidden.includes(id) ? 'none' : '';
    _applyWidgetSize(el, id);
    /* Inietta pulsanti resize se non già presenti */
    if (!el.querySelector('.wrs-bar')) {
      el.insertAdjacentHTML('beforeend', _resizeBtnsHTML(id));
    }
  });
}

/* Crea SOLO i widget dinamici che l'utente ha esplicitamente aggiunto (_wState.order) */
function _renderOrderedDynamicWidgets() {
  const col = document.getElementById('widget-column');
  if (!col) return;

  const dynamicIds = ['quote', 'focusgoal', 'music', 'stats', 'mood', 'postit', 'countdown', 'flash', 'spotify', 'taskrandom', 'calc'];

  dynamicIds.forEach(id => {
    const inOrder    = _wState.order.includes(id);
    const isHidden   = _wState.hidden.includes(id);
    const unlocked   = _isUnlocked(id);
    const alreadyDOM = !!col.querySelector(`[data-widget-id="${id}"]`);

    if (!inOrder || alreadyDOM) return;        /* non aggiunto dall'utente */
    if (!unlocked) return;                     /* non sbloccato */

    const el = document.createElement('div');
    el.className = 'card w-card';
    el.dataset.widgetId = id;
    el.style.display = isHidden ? 'none' : '';
    el.style.order   = String(_wState.order.indexOf(id) * 10);
    el.innerHTML = _buildWidgetHTML(id) + _resizeBtnsHTML(id);
    col.appendChild(el);
    _applyWidgetSize(el, id);
    _initDynamicWidget(id);
  });
}

function _buildWidgetHTML(id) {
  if (id === 'quote')     return _quoteHTML();
  if (id === 'focusgoal') return _focusGoalHTML();
  if (id === 'music')     return _musicHTML();
  if (id === 'stats')     return _statsHTML();
  if (id === 'mood')      return _moodHTML();
  if (id === 'postit')     return _postitHTML();
  if (id === 'countdown')  return _countdownHTML();
  if (id === 'flash')      return _flashHTML();
  if (id === 'spotify')    return _spotifyHTML();
  if (id === 'taskrandom') return _taskRandomHTML();
  if (id === 'calc')       return _calcHTML();
  return '';
}

function _initDynamicWidget(id) {
  if (id === 'quote')     _refreshQuote();
  if (id === 'focusgoal') _refreshFocusGoal();
  if (id === 'stats')     _refreshStats();
  if (id === 'mood')      _initMoodWidget();
  if (id === 'postit')     _initPostit();
  if (id === 'countdown')  _initCountdown();
  if (id === 'flash')      _initFlash();
  if (id === 'spotify')    _initSpotify();
  if (id === 'taskrandom') _initTaskRandom();
  if (id === 'calc')       _initCalc();
}

/* ── Pulsante Personalizza ── */
function _addPersonalizeButton() {
  const col = document.getElementById('widget-column');
  if (!col || col.querySelector('.w-customize-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'w-customize-btn';
  btn.textContent = '✦ Personalizza pagina';
  btn.style.order = '9999';
  btn.onclick = openWidgetPicker;
  col.appendChild(btn);
}

/* ── WIDGET PICKER ── */
function openWidgetPicker() {
  _refreshPickerList();
  const m = document.getElementById('widget-picker-modal');
  if (m) m.classList.add('active');
}

function closeWidgetPicker() {
  const m = document.getElementById('widget-picker-modal');
  if (m) m.classList.remove('active');
}

function _refreshPickerList() {
  const list = document.getElementById('widget-picker-list');
  if (!list) return;
  let balance = 0;
  try { balance = (typeof coinData !== 'undefined') ? (coinData.balance || 0) : 0; } catch {}

  list.innerHTML = WIDGET_CATALOG.map(w => {
    const unlocked = _isUnlocked(w.id);
    const inOrder  = _wState.order.includes(w.id);
    const hidden   = _wState.hidden.includes(w.id);
    const active   = inOrder && !hidden;

    if (!unlocked) {
      return `<div class="wpl-row wpl-locked">
        <span class="wpl-icon">${w.icon}</span>
        <div class="wpl-info"><div class="wpl-label">${w.label}</div><div class="wpl-sub">Premium</div></div>
        <button class="wpl-buy ${balance >= w.price ? '' : 'wpl-poor'}"
          onclick="unlockWidget('${w.id}',${w.price})">🪙 ${w.price}</button>
      </div>`;
    }

    return `<div class="wpl-row">
      <span class="wpl-icon">${w.icon}</span>
      <div class="wpl-info"><div class="wpl-label">${w.label}</div><div class="wpl-sub">${active ? 'Visibile' : inOrder ? 'Nascosto' : 'Non aggiunto'}</div></div>
      <button class="wpl-toggle ${active ? 'wpl-on' : 'wpl-off'}"
        onclick="toggleWidget('${w.id}')">${active ? 'Attivo' : inOrder ? 'Nascosto' : '+ Aggiungi'}</button>
    </div>`;
  }).join('');
}

function toggleWidget(id) {
  const col = document.getElementById('widget-column');
  const el  = col && col.querySelector(`[data-widget-id="${id}"]`);
  const inOrder = _wState.order.includes(id);

  if (!inOrder) {
    _wState.order.push(id);
    _wState.hidden = _wState.hidden.filter(x => x !== id);
    _saveWidgetState();
    _renderOrderedDynamicWidgets();
    _applyStaticWidgetState();
    _enableDragDrop();
  } else if (!_wState.hidden.includes(id)) {
    _wState.hidden.push(id);
    if (el) el.style.display = 'none';
    _saveWidgetState();
  } else {
    _wState.hidden = _wState.hidden.filter(x => x !== id);
    if (el) el.style.display = '';
    _saveWidgetState();
  }
  _refreshPickerList();
}

function unlockWidget(id, price) {
  if (typeof spendCoins !== 'function') return;
  if (!spendCoins(price)) { _refreshPickerList(); return; }
  if (!_wState.unlocked.includes(id)) _wState.unlocked.push(id);
  if (!_wState.order.includes(id)) _wState.order.push(id);
  _wState.hidden = _wState.hidden.filter(x => x !== id);
  _saveWidgetState();
  _renderOrderedDynamicWidgets();
  _applyStaticWidgetState();
  _enableDragDrop();
  _refreshPickerList();
}

/* ──────────────────────
   HTML dei widget
────────────────────── */
const _QUOTES = [
  { t: 'La mente non è un vaso da riempire, ma un fuoco da accendere.', a: 'Plutarco' },
  { t: 'Non cercare il tempo — crea il tempo.', a: 'Charles Buxton' },
  { t: 'Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.', a: 'Robert Collier' },
  { t: 'Non importa quanto vai piano, l\'importante è non fermarsi.', a: 'Confucio' },
  { t: 'Studiare non è mai sprecato: prima o poi, tutto torna utile.', a: '—' },
  { t: 'Sii il cambiamento che vuoi vedere nel mondo.', a: 'Gandhi' },
  { t: 'Ogni giorno è un\'occasione per imparare qualcosa di nuovo.', a: '—' },
  { t: 'Non hai mai fallito finché non smetti di provare.', a: 'Albert Einstein' },
  { t: 'Il talento è un punto di partenza; l\'impegno è ciò che ti porta lontano.', a: '—' },
  { t: 'Ogni sessione conta. Ogni pagina, ogni esercizio — costruisce qualcosa.', a: '—' },
];

function _quoteHTML() {
  const ds  = new Date().toDateString();
  const idx = [...ds].reduce((a, c) => a + c.charCodeAt(0), 0) % _QUOTES.length;
  const q   = _QUOTES[idx];
  return `<div class="card-title">💬 Citazione del Giorno</div>
    <div class="wq-text">"${q.t}"</div>
    <div class="wq-author">— ${q.a}</div>`;
}
function _refreshQuote() {
  const el = document.querySelector('[data-widget-id="quote"]');
  if (el) el.innerHTML = _quoteHTML();
}

function _focusGoalHTML() {
  let todaySess = 0, goal = 4;
  try {
    goal = (typeof cfg !== 'undefined' && cfg.goal) ? cfg.goal : 4;
    const sessions = JSON.parse(localStorage.getItem('sf_sessions') || '[]');
    const today    = new Date().toISOString().slice(0, 10);
    todaySess = sessions.filter(s => (s.date || s.endedAt || '').slice(0, 10) === today).length;
  } catch {}
  const pct  = Math.min(100, Math.round((todaySess / goal) * 100));
  const done = todaySess >= goal;
  return `<div class="card-title">🎯 Obiettivo Focus</div>
    <div class="wfg-count">${todaySess} <span>/ ${goal}</span></div>
    <div class="wfg-track"><div class="wfg-fill" style="width:${pct}%"></div></div>
    <div class="wfg-note">${done ? '🎉 Obiettivo raggiunto!' : pct + '% — forza!'}</div>`;
}
function _refreshFocusGoal() {
  const el = document.querySelector('[data-widget-id="focusgoal"]');
  if (el) el.innerHTML = _focusGoalHTML();
}
function refreshFocusGoalWidget() { _refreshFocusGoal(); }

function _statsHTML() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('sf_stats') || '{}'); } catch {}
  return `<div class="card-title">📊 Statistiche</div>
    <div class="wst-grid">
      <div class="wst-cell"><div class="wst-v">${s.sessions || 0}</div><div class="wst-l">Sessioni</div></div>
      <div class="wst-cell"><div class="wst-v">${Math.round((s.minutes || 0) / 60)}h</div><div class="wst-l">Totale</div></div>
      <div class="wst-cell"><div class="wst-v">${s.streak || 0}🔥</div><div class="wst-l">Streak</div></div>
      <div class="wst-cell"><div class="wst-v">${s.coins || 0}🪙</div><div class="wst-l">Monete</div></div>
    </div>`;
}
function _refreshStats() {
  const el = document.querySelector('[data-widget-id="stats"]');
  if (el) el.innerHTML = _statsHTML();
}

function _musicHTML() {
  return `<div class="card-title">🎵 Suoni Ambientali</div>
    <div class="wm-grid">
      <button class="wm-btn" data-s="rain"   onclick="playWidgetSound('rain')">🌧️<span>Pioggia</span></button>
      <button class="wm-btn" data-s="cafe"   onclick="playWidgetSound('cafe')">☕<span>Caffè</span></button>
      <button class="wm-btn" data-s="ocean"  onclick="playWidgetSound('ocean')">🌊<span>Oceano</span></button>
      <button class="wm-btn" data-s="forest" onclick="playWidgetSound('forest')">🌲<span>Foresta</span></button>
    </div>
    <div class="wm-note" id="wm-note">Nessun suono attivo</div>`;
}

let _wACtx = null, _wASrc = null, _wACur = null;
function playWidgetSound(type) {
  if (_wACur === type) { _stopWidgetSound(); return; }
  _stopWidgetSound();
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f   = ctx.createBiquadFilter();
    const cfg2 = { rain:[900,'bandpass',0.5], cafe:[350,'lowpass',1.2], ocean:[180,'lowpass',0.3], forest:[650,'bandpass',0.9] };
    const [fr, tp, q] = cfg2[type] || [400,'lowpass',0.8];
    f.type = tp; f.frequency.value = fr; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0.13;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    _wACtx = ctx; _wASrc = src; _wACur = type;
    const names = { rain:'🌧️ Pioggia', cafe:'☕ Caffè', ocean:'🌊 Oceano', forest:'🌲 Foresta' };
    const note = document.getElementById('wm-note');
    if (note) note.textContent = names[type] + ' — clicca di nuovo per stop';
    document.querySelectorAll('.wm-btn').forEach(b => b.classList.toggle('wm-active', b.dataset.s === type));
  } catch { const n = document.getElementById('wm-note'); if (n) n.textContent = 'Audio non supportato'; }
}
function _stopWidgetSound() {
  try { _wASrc && _wASrc.stop(); } catch {}
  try { _wACtx && _wACtx.close(); } catch {}
  _wASrc = _wACtx = _wACur = null;
  const n = document.getElementById('wm-note'); if (n) n.textContent = 'Nessun suono attivo';
  document.querySelectorAll('.wm-btn').forEach(b => b.classList.remove('wm-active'));
}

const _WMOODS = ['😴','😕','😐','😊','🔥'];
const _MLBL   = ['Stanco','Giù','Neutro','Bene','Al massimo!'];
function _moodHTML() {
  return `<div class="card-title">😊 Come stai oggi?</div>
    <div class="wmd-btns">
      ${_WMOODS.map((m,i) => `<button class="wmd-btn" title="${_MLBL[i]}" onclick="setTodayMood(${i})">${m}</button>`).join('')}
    </div>
    <div class="wmd-lbl" id="wmd-lbl">Toccami per salvare il tuo umore</div>`;
}
function _initMoodWidget() {
  const today = new Date().toISOString().slice(0,10);
  try {
    const m = JSON.parse(localStorage.getItem('sf_moods') || '{}');
    if (m[today] !== undefined) _setMoodUI(m[today]);
  } catch {}
}
function setTodayMood(idx) {
  const today = new Date().toISOString().slice(0,10);
  try { const m = JSON.parse(localStorage.getItem('sf_moods') || '{}'); m[today] = idx; localStorage.setItem('sf_moods', JSON.stringify(m)); } catch {}
  _setMoodUI(idx);
}
function _setMoodUI(idx) {
  const lbl = document.getElementById('wmd-lbl');
  if (lbl) lbl.textContent = _WMOODS[idx] + ' ' + _MLBL[idx];
  document.querySelectorAll('.wmd-btn').forEach((b, i) => b.classList.toggle('wmd-active', i === idx));
}

/* ══════════════════════════════════
   WIDGET: BACHECA POST-IT  (id='postit')
══════════════════════════════════ */
const _WBA_COLORS = ['yellow','pink','blue','green','purple'];
let _wbaSelColor = 'yellow';

function _loadBachecaNotes() {
  try {
    const raw = localStorage.getItem('sf_notes') || '[]';
    const p   = JSON.parse(raw);
    if (Array.isArray(p)) return p;
    if (typeof p === 'string' && p.trim()) return [{ id: Date.now(), text: p, color: 'yellow' }];
    return [];
  } catch {
    const raw = localStorage.getItem('sf_notes') || '';
    return raw.trim() ? [{ id: Date.now(), text: raw, color: 'yellow' }] : [];
  }
}
function _saveBachecaNotes(notes) {
  try { localStorage.setItem('sf_notes', JSON.stringify(notes)); } catch {}
}
function _renderBacheca() {
  const board = document.getElementById('wba-board');
  const empty = document.getElementById('wba-empty');
  if (!board) return;
  const notes = _loadBachecaNotes();
  if (notes.length === 0) {
    board.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  board.innerHTML = notes.map(n => `
    <div class="wba-note" data-color="${n.color}" data-id="${n.id}">
      <button class="wba-note-del" onclick="deleteBachecaNote(${n.id})">✕</button>
      <div class="wba-note-text">${String(n.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>
    </div>`).join('');
}
function _postitHTML() {
  return `<div class="card-title" style="justify-content:space-between">
    📌 Bacheca
    <button class="wba-add-btn" onclick="openBachecaAdd()">+ Nota</button>
  </div>
  <div class="wba-board" id="wba-board"></div>
  <div class="wba-empty" id="wba-empty">Nessuna nota — aggiungi la prima! ✨</div>
  <div class="wba-add-form" id="wba-add-form" style="display:none">
    <textarea class="wba-add-input" id="wba-add-input" maxlength="150" placeholder="Scrivi la nota..."></textarea>
    <div class="wba-color-row">
      ${_WBA_COLORS.map((c,i)=>`<div class="wba-cdot" data-c="${c}" onclick="selectBachecaColor('${c}')" style="${i===0?'outline:2px solid var(--accent);outline-offset:2px':''}"></div>`).join('')}
    </div>
    <div style="display:flex;gap:6px">
      <button class="wba-cancel-btn" onclick="closeBachecaAdd()">Annulla</button>
      <button class="wba-save-btn"   onclick="saveBachecaNote()">Aggiungi ✓</button>
    </div>
  </div>`;
}
function _initPostit() { _renderBacheca(); }

function openBachecaAdd() {
  const f = document.getElementById('wba-add-form');
  if (f) f.style.display = '';
  const inp = document.getElementById('wba-add-input');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 50); }
  _wbaSelColor = 'yellow';
  document.querySelectorAll('.wba-cdot').forEach((d, i) => {
    d.style.outline = i === 0 ? '2px solid var(--accent)' : '';
    d.style.outlineOffset = i === 0 ? '2px' : '';
  });
}
function closeBachecaAdd() {
  const f = document.getElementById('wba-add-form');
  if (f) f.style.display = 'none';
}
function selectBachecaColor(color) {
  _wbaSelColor = color;
  document.querySelectorAll('.wba-cdot').forEach(d => {
    const on = d.dataset.c === color;
    d.style.outline = on ? '2px solid var(--accent)' : '';
    d.style.outlineOffset = on ? '2px' : '';
  });
}
function saveBachecaNote() {
  const inp  = document.getElementById('wba-add-input');
  const text = (inp?.value || '').trim();
  if (!text) return;
  const notes = _loadBachecaNotes();
  notes.push({ id: Date.now(), text, color: _wbaSelColor });
  _saveBachecaNotes(notes);
  _renderBacheca();
  closeBachecaAdd();
}
function deleteBachecaNote(id) {
  const notes = _loadBachecaNotes().filter(n => n.id !== id);
  _saveBachecaNotes(notes);
  _renderBacheca();
}

/* ══════════════════════════════════
   WIDGET: COUNTDOWN  (id='countdown')
══════════════════════════════════ */
function _countdownHTML() {
  return `<div class="card-title">⏳ Countdown Scadenza</div>
    <div class="wcd-setup" id="wcd-setup">
      <input class="wcd-input" id="wcd-title" maxlength="30" placeholder="Nome (es. Esame Matematica)...">
      <input class="wcd-date"  id="wcd-date"  type="date">
      <button class="wcd-save-btn" onclick="saveCountdown()">✓ Salva</button>
    </div>
    <div class="wcd-display" id="wcd-display" style="display:none">
      <div class="wcd-name" id="wcd-name">—</div>
      <div class="wcd-timer" id="wcd-timer">00:00:00:00</div>
      <div class="wcd-labels"><span>giorni</span><span>ore</span><span>min</span><span>sec</span></div>
      <button class="wcd-reset-btn" onclick="resetCountdown()">✕ Cambia</button>
    </div>`;
}
let _wcdInterval = null;
function _initCountdown() {
  try {
    const raw = localStorage.getItem('sf_countdown');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.date) _showCountdownDisplay(data);
  } catch {}
}
function saveCountdown() {
  const title = (document.getElementById('wcd-title')?.value || '').trim();
  const date  = document.getElementById('wcd-date')?.value;
  if (!date) return;
  const data = { title: title || 'Scadenza', date };
  try { localStorage.setItem('sf_countdown', JSON.stringify(data)); } catch {}
  _showCountdownDisplay(data);
}
function _showCountdownDisplay(data) {
  const setup   = document.getElementById('wcd-setup');
  const display = document.getElementById('wcd-display');
  const nameEl  = document.getElementById('wcd-name');
  if (setup)   setup.style.display   = 'none';
  if (display) display.style.display = 'flex';
  if (nameEl)  nameEl.textContent    = data.title;
  clearInterval(_wcdInterval);
  _tickCountdown(data.date);
  _wcdInterval = setInterval(() => _tickCountdown(data.date), 1000);
}
function _tickCountdown(dateStr) {
  const el  = document.getElementById('wcd-timer');
  if (!el) { clearInterval(_wcdInterval); return; }
  const parts = dateStr.split('-').map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59); // fine giornata, fuso locale
  const diff = target - Date.now();
  if (diff <= 0) {
    el.className = 'wcd-timer wcd-expired';
    el.textContent = '🎉 Giorno dell\'evento!';
    const labels = el.nextElementSibling;
    if (labels) labels.style.display = 'none';
    clearInterval(_wcdInterval);
    return;
  }
  const dd = Math.floor(diff / 86400000);
  const h  = Math.floor((diff % 86400000) / 3600000);
  const m  = Math.floor((diff % 3600000)  / 60000);
  const s  = Math.floor((diff % 60000)    / 1000);
  el.className = 'wcd-timer';
  el.textContent = `${String(dd).padStart(2,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function resetCountdown() {
  clearInterval(_wcdInterval);
  try { localStorage.removeItem('sf_countdown'); } catch {}
  const setup   = document.getElementById('wcd-setup');
  const display = document.getElementById('wcd-display');
  if (setup)   setup.style.display   = 'flex';
  if (display) display.style.display = 'none';
  const ti = document.getElementById('wcd-title');
  const dt = document.getElementById('wcd-date');
  if (ti) ti.value = '';
  if (dt) dt.value = '';
}

/* ══════════════════════════════════
   WIDGET: SFIDA FLASH  (id='flash')
══════════════════════════════════ */
const _FLASH_CHALLENGES = [
  { t: '💧 Bevi un bicchiere d\'acqua prima di iniziare la sessione.' },
  { t: '🧘 Fai 5 respiri profondi. Inspira 4s, tieni 4s, espira 6s.' },
  { t: '🚶 Alzati e cammina per 2 minuti. Poi torna pronto a studiare.' },
  { t: '📱 Metti il telefono in un altro stanza per la prossima ora.' },
  { t: '✍️ Scrivi 3 cose che vuoi capire bene oggi.' },
  { t: '🪟 Apri la finestra e prenditi 30 secondi d\'aria fresca.' },
  { t: '🎯 Scegli UN concetto difficile da capire OGGI a fondo.' },
  { t: '🌱 Fai 10 salti o 10 flessioni — muovi il corpo, attiva il cervello!' },
  { t: '📖 Leggi la prima pagina del capitolo di oggi ad alta voce.' },
  { t: '🍎 Mangia qualcosa di sano prima di studiare. Il cervello ha fame.' },
  { t: '🔕 Attiva la modalità silenziosa. Niente notifiche per 25 minuti.' },
  { t: '🕯️ Sistema la scrivania. Un ambiente ordinato = una mente ordinata.' },
  { t: '⏰ Decidi esattamente a che ora finisci di studiare oggi.' },
  { t: '📝 Scrivi la cosa più importante che hai imparato ieri.' },
  { t: '🤝 Spiega ad alta voce come se lo spiegassi a un amico l\'argomento di oggi.' },
];
function _flashHTML() {
  return `<div class="card-title">⚡ Sfida Flash</div>
    <div class="wfl-body">
      <div class="wfl-challenge-text" id="wfl-text">...</div>
      <div style="display:flex;gap:6px">
        <button class="wfl-skip-btn" id="wfl-skip" onclick="skipFlash()">🔀 Salta</button>
        <button class="wfl-btn" id="wfl-btn" onclick="completeFlash()">Completa ✓</button>
      </div>
    </div>`;
}
function _getFlashData() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const d = JSON.parse(localStorage.getItem('sf_flash') || '{}');
    if (d.date === today) return d;
  } catch {}
  return { date: today, done: false, skips: 0 };
}
function _initFlash() {
  const data   = _getFlashData();
  const seed   = [...data.date].reduce((a,c) => a + c.charCodeAt(0), 0);
  const idx    = (seed + (data.skips || 0)) % _FLASH_CHALLENGES.length;
  const textEl = document.getElementById('wfl-text');
  const btnEl  = document.getElementById('wfl-btn');
  const skipEl = document.getElementById('wfl-skip');
  if (textEl) textEl.textContent = _FLASH_CHALLENGES[idx].t;
  if (data.done) {
    if (btnEl)  { btnEl.textContent = '✅ Fatto! +3 🪙'; btnEl.classList.add('wfl-done'); }
    if (skipEl) skipEl.style.display = 'none';
  } else {
    if (btnEl)  { btnEl.textContent = 'Completa ✓'; btnEl.classList.remove('wfl-done'); }
    if (skipEl) skipEl.style.display = '';
  }
}
function skipFlash() {
  const data = _getFlashData();
  if (data.done) return;
  data.skips = (data.skips || 0) + 1;
  try { localStorage.setItem('sf_flash', JSON.stringify(data)); } catch {}
  /* piccola animazione */
  const textEl = document.getElementById('wfl-text');
  if (textEl) { textEl.style.opacity = '0.2'; setTimeout(() => { textEl.style.opacity='1'; _initFlash(); }, 180); }
  else _initFlash();
}
function completeFlash() {
  const data = _getFlashData();
  data.done = true;
  try { localStorage.setItem('sf_flash', JSON.stringify(data)); } catch {}
  if (typeof addCoins === 'function') addCoins(3);
  _initFlash();
}

/* ══════════════════════════════════
   WIDGET: SPOTIFY  (id='spotify')
══════════════════════════════════ */
/* ══════════════════════════════════════
   WIDGET: SPOTIFY  (id='spotify')
   Connetti account (OAuth) o incolla link embed.
   Client ID gestito dall'admin — utenti vedono solo "Connetti".
══════════════════════════════════════ */
function _spotifyHTML() {
  return `<div class="card-title">🎵 Spotify</div>
  <div id="wsp-root">
    <div id="wsp-loading" style="color:var(--text-soft);font-size:0.8rem;padding:10px 0">Caricamento...</div>
    <div id="wsp-choose" style="display:none;flex-direction:column;gap:10px">
      <button class="wsp-connect-btn" onclick="spotifyOAuthConnect()" id="wsp-oauth-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Connetti Spotify
      </button>
      <div id="wsp-no-cid" style="display:none;font-size:0.72rem;color:var(--text-soft);text-align:center;padding:4px 0">🔧 Collegamento in configurazione</div>
      <div style="text-align:center;font-size:0.7rem;color:var(--text-soft)">oppure</div>
      <button onclick="wspModeLink()" style="padding:9px;border-radius:10px;border:1px solid var(--card-border);background:rgba(255,255,255,0.3);cursor:pointer;font-size:0.8rem;color:var(--text);font-family:Poppins,sans-serif">
        🔗 Incolla link playlist
      </button>
    </div>
    <div id="wsp-link-mode" style="display:none">
      <input class="wsp-url-input" id="wsp-url" type="url" placeholder="https://open.spotify.com/playlist/...">
      <div class="wsp-hint">Playlist, album o canzone</div>
      <div style="display:flex;gap:8px">
        <button class="wsp-save-btn" onclick="saveSpotify()" style="flex:1">▶ Carica</button>
        <button onclick="wspModeChoose()" style="padding:9px 14px;border-radius:10px;border:1px solid var(--card-border);background:none;cursor:pointer;color:var(--text-soft);font-size:0.78rem;font-family:Poppins,sans-serif">← Indietro</button>
      </div>
    </div>
    <div id="wsp-playlists" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:0.78rem;font-weight:600;color:var(--text)">Le tue playlist</span>
        <button onclick="wspLogout()" style="font-size:0.68rem;color:var(--text-soft);background:none;border:none;cursor:pointer">Disconnetti</button>
      </div>
      <div id="wsp-playlist-list" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto"></div>
    </div>
    <div id="wsp-embed-wrap" style="display:none">
      <iframe id="wsp-iframe" class="wsp-iframe" height="352"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy" frameborder="0" allowfullscreen></iframe>
      <button class="wsp-reset-btn" onclick="resetSpotify()">✕ Cambia</button>
    </div>
  </div>`;
}

function _parseSpotifyURL(url) {
  const m = url.match(/open\.spotify\.com\/(track|playlist|album|episode|artist)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

let _wspClientId = null;

async function _initSpotify() {
  /* 1. Ripristina embed salvato */
  try {
    const raw = localStorage.getItem('sf_spotify');
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.embedURL) { _showSpotifyEmbed(data); return; }
    }
  } catch {}
  /* 2. Ripristina token OAuth valido → mostra playlist */
  const token = _wspGetToken();
  if (token) {
    _wspHideAll();
    _wspShowPlaylistsPanel();
    _wspFetchPlaylists(token);
    return;
  }
  /* 3. Fetch client_id dal backend (impostato dall'admin) */
  try {
    const apiBase = window.SF_API_BASE || '/api';
    const r = await fetch(apiBase + '/config');
    if (r.ok) {
      const d = await r.json();
      _wspClientId = d.spotify_client_id || null;
    }
  } catch {}
  /* 4. Mostra scelta */
  wspModeChoose();
}

function _wspHideAll() {
  ['wsp-loading', 'wsp-choose', 'wsp-link-mode', 'wsp-playlists', 'wsp-embed-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function wspModeChoose() {
  _wspHideAll();
  const choose = document.getElementById('wsp-choose');
  if (choose) choose.style.display = 'flex';
  /* Nascondi pulsante OAuth se non c'è il client_id */
  const oauthBtn = document.getElementById('wsp-oauth-btn');
  const noCid   = document.getElementById('wsp-no-cid');
  if (oauthBtn) oauthBtn.style.display = _wspClientId ? '' : 'none';
  if (noCid)   noCid.style.display    = _wspClientId ? 'none' : '';
}

function wspModeLink() {
  _wspHideAll();
  const el = document.getElementById('wsp-link-mode');
  if (el) el.style.display = '';
}

function _wspShowPlaylistsPanel() {
  _wspHideAll();
  const el = document.getElementById('wsp-playlists');
  if (el) el.style.display = '';
}

let _wspPopup = null;
function spotifyOAuthConnect() {
  if (!_wspClientId) return;
  const redirectUri = encodeURIComponent(window.location.origin + '/spotify-callback.html');
  const scopes = encodeURIComponent('playlist-read-private playlist-read-collaborative user-library-read user-read-private');
  const url = `https://accounts.spotify.com/authorize?client_id=${_wspClientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&show_dialog=false`;
  _wspPopup = window.open(url, 'SpotifyLogin', 'width=480,height=660');
  window.addEventListener('message', _wspHandleMessage, { once: true });
}

function _wspHandleMessage(e) {
  if (!e.data || e.data.type !== 'sf_spotify_token') return;
  const token = e.data.token;
  if (!token) return;
  const expires = Date.now() + (parseInt(e.data.expires_in || 3600) - 60) * 1000;
  localStorage.setItem('sf_spotify_token', token);
  localStorage.setItem('sf_spotify_token_exp', String(expires));
  if (_wspPopup) { try { _wspPopup.close(); } catch {} _wspPopup = null; }
  _wspShowPlaylistsPanel();
  _wspFetchPlaylists(token);
}

function _wspGetToken() {
  const token = localStorage.getItem('sf_spotify_token');
  const exp   = parseInt(localStorage.getItem('sf_spotify_token_exp') || '0');
  if (!token || Date.now() > exp) {
    localStorage.removeItem('sf_spotify_token');
    localStorage.removeItem('sf_spotify_token_exp');
    return null;
  }
  return token;
}

async function _wspFetchPlaylists(token) {
  const listEl = document.getElementById('wsp-playlist-list');
  if (listEl) listEl.innerHTML = '<div style="color:var(--text-soft);font-size:0.8rem;padding:8px 0">Caricamento...</div>';
  try {
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { wspLogout(); return; }
    const data = await res.json();
    const items = data.items || [];
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = '<div style="color:var(--text-soft);font-size:0.8rem">Nessuna playlist trovata</div>';
      return;
    }
    listEl.innerHTML = items.map(p => {
      const img = (p.images && p.images[0])
        ? `<img src="${p.images[0].url}" width="36" height="36" style="border-radius:6px;object-fit:cover;flex-shrink:0">`
        : '<span style="width:36px;height:36px;border-radius:6px;background:var(--card-border);display:inline-block;flex-shrink:0"></span>';
      return `<div onclick="wspLoadPlaylist('${p.id}')" style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--card-border);background:rgba(255,255,255,0.3);transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.55)'" onmouseout="this.style.background='rgba(255,255,255,0.3)'">
        ${img}
        <div style="min-width:0">
          <div style="font-size:0.8rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          <div style="font-size:0.68rem;color:var(--text-soft)">${p.tracks?.total || 0} brani</div>
        </div>
      </div>`;
    }).join('');
  } catch { if (listEl) listEl.innerHTML = '<div style="color:#ef4444;font-size:0.8rem">Errore caricamento</div>'; }
}

function wspLoadPlaylist(playlistId) {
  const data = { embedURL: `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0` };
  try { localStorage.setItem('sf_spotify', JSON.stringify(data)); } catch {}
  _showSpotifyEmbed(data);
}

function wspLogout() {
  localStorage.removeItem('sf_spotify_token');
  localStorage.removeItem('sf_spotify_token_exp');
  wspModeChoose();
}

function saveSpotify() {
  const inp    = document.getElementById('wsp-url');
  const url    = (inp?.value || '').trim();
  const parsed = _parseSpotifyURL(url);
  if (!parsed) {
    if (inp) { inp.style.borderColor = '#ef4444'; setTimeout(() => { inp.style.borderColor = ''; }, 1600); }
    return;
  }
  const embedURL = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=0`;
  const data = { embedURL };
  try { localStorage.setItem('sf_spotify', JSON.stringify(data)); } catch {}
  _showSpotifyEmbed(data);
}

function _showSpotifyEmbed(data) {
  _wspHideAll();
  const wrap  = document.getElementById('wsp-embed-wrap');
  const frame = document.getElementById('wsp-iframe');
  if (wrap)  wrap.style.display = '';
  if (frame) frame.src = data.embedURL;
}

function resetSpotify() {
  try { localStorage.removeItem('sf_spotify'); } catch {}
  const frame = document.getElementById('wsp-iframe');
  if (frame) frame.src = '';
  wspModeChoose();
}

/* ══════════════════════════════════
   WIDGET: TASK CASUALE  (id='taskrandom')
══════════════════════════════════ */
let _wtrIdx = 0;

function _taskRandomHTML() {
  return `<div class="card-title" style="justify-content:space-between">
    🎲 Task Casuale
    <button class="wtr-shuffle-btn" onclick="shuffleRandomTask()" title="Pesca un'altra task">🔀</button>
  </div>
  <div class="wtr-body" id="wtr-body"></div>`;
}
function _initTaskRandom() { _refreshTaskRandom(); }
function _refreshTaskRandom() {
  const body = document.getElementById('wtr-body');
  if (!body) return;
  try {
    const tasks   = JSON.parse(localStorage.getItem('sf_tasks') || '[]');
    const pending = tasks.filter(t => !t.done);
    if (!pending.length) {
      body.innerHTML = '<div class="wtr-empty">🎉 Nessuna task pendente!<br><span style="font-size:0.68rem">Aggiungile dalla sezione Task.</span></div>';
      return;
    }
    _wtrIdx = _wtrIdx % pending.length;
    const task = pending[_wtrIdx];
    const priCl = { alta:'wtr-pri-high', media:'wtr-pri-med', normale:'wtr-pri-norm', bassa:'wtr-pri-low' };
    const cl = priCl[task.priority] || 'wtr-pri-norm';
    body.innerHTML = `<div class="wtr-card">
      <div class="wtr-name">${_wEsc(task.name || '—')}</div>
      ${task.subject ? `<div class="wtr-subject">📚 ${_wEsc(task.subject)}</div>` : ''}
      <div class="wtr-meta">
        <span class="wtr-pri ${cl}">${task.priority || 'normale'}</span>
        ${task.dueDate ? `<span class="wtr-due">📅 ${task.dueDate}</span>` : ''}
      </div>
      <button class="wtr-done-btn" onclick="completeRandomTask('${task.id}')">✓ Fatto</button>
    </div>`;
  } catch {
    body.innerHTML = '<div class="wtr-empty">Errore nel caricamento task.</div>';
  }
}
function shuffleRandomTask() {
  try {
    const tasks   = JSON.parse(localStorage.getItem('sf_tasks') || '[]');
    const pending = tasks.filter(t => !t.done);
    if (pending.length <= 1) { _refreshTaskRandom(); return; }
    _wtrIdx = (_wtrIdx + 1) % pending.length;
  } catch { _wtrIdx = 0; }
  const body = document.getElementById('wtr-body');
  if (body) { body.style.opacity = '0'; setTimeout(() => { body.style.opacity = '1'; _refreshTaskRandom(); }, 140); }
  else _refreshTaskRandom();
}
function completeRandomTask(id) {
  try {
    const tasks = JSON.parse(localStorage.getItem('sf_tasks') || '[]');
    const t = tasks.find(t => String(t.id) === String(id));
    if (t) t.done = true;
    localStorage.setItem('sf_tasks', JSON.stringify(tasks));
    if (typeof addCoins === 'function') addCoins(5);
    _wtrIdx = 0;
  } catch {}
  _refreshTaskRandom();
  if (typeof renderMiniTasks === 'function') renderMiniTasks();
}
function _wEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════════════════════
   WIDGET: CALCOLATRICE  (id='calc')
══════════════════════════════════ */
function _calcHTML() {
  return `<div class="card-title">🔢 Calcolatrice</div>
  <div class="calc-wrap">
    <div class="calc-display" id="calc-disp">0</div>
    <div class="calc-grid">
      <button class="calc-btn calc-fn"  onclick="calcInput('AC')">AC</button>
      <button class="calc-btn calc-fn"  onclick="calcInput('±')">±</button>
      <button class="calc-btn calc-fn"  onclick="calcInput('%')">%</button>
      <button class="calc-btn calc-op"  onclick="calcInput('÷')">÷</button>
      <button class="calc-btn"          onclick="calcInput('7')">7</button>
      <button class="calc-btn"          onclick="calcInput('8')">8</button>
      <button class="calc-btn"          onclick="calcInput('9')">9</button>
      <button class="calc-btn calc-op"  onclick="calcInput('×')">×</button>
      <button class="calc-btn"          onclick="calcInput('4')">4</button>
      <button class="calc-btn"          onclick="calcInput('5')">5</button>
      <button class="calc-btn"          onclick="calcInput('6')">6</button>
      <button class="calc-btn calc-op"  onclick="calcInput('−')">−</button>
      <button class="calc-btn"          onclick="calcInput('1')">1</button>
      <button class="calc-btn"          onclick="calcInput('2')">2</button>
      <button class="calc-btn"          onclick="calcInput('3')">3</button>
      <button class="calc-btn calc-op"  onclick="calcInput('+')">+</button>
      <button class="calc-btn calc-zero" onclick="calcInput('0')">0</button>
      <button class="calc-btn"          onclick="calcInput('.')">.</button>
      <button class="calc-btn calc-op"  onclick="calcInput('=')">=</button>
    </div>
  </div>`;
}
let _cSt = { disp: '0', first: null, op: null, wait: false, afterEq: false };
function _initCalc() { _cRender(); }
function _cRender() {
  const el = document.getElementById('calc-disp');
  if (!el) return;
  const v = _cSt.disp;
  el.textContent = (v.length > 11) ? (+v).toPrecision(7) : v;
}
function calcInput(k) {
  const s = _cSt;
  if (k === 'AC') {
    s.disp = '0'; s.first = null; s.op = null; s.wait = false; s.afterEq = false;
  } else if (k === '±') {
    s.afterEq = false;
    s.disp = String(-parseFloat(s.disp || 0) || 0);
  } else if (k === '%') {
    s.afterEq = false;
    s.disp = String(parseFloat(s.disp || 0) / 100);
  } else if ('÷×−+'.includes(k)) {
    s.first = parseFloat(s.disp); s.op = k; s.wait = true; s.afterEq = false;
  } else if (k === '=') {
    if (s.op !== null && s.first !== null) {
      const b = parseFloat(s.disp);
      let r;
      if (s.op==='+') r = s.first + b;
      if (s.op==='−') r = s.first - b;
      if (s.op==='×') r = s.first * b;
      if (s.op==='÷') r = b !== 0 ? s.first / b : 'Err';
      s.disp  = typeof r === 'number' ? String(parseFloat(r.toFixed(10))) : r;
      s.op = null; s.first = null; s.wait = false; s.afterEq = true;
    }
  } else if (k === '.') {
    if (s.wait || s.afterEq) { s.disp = '0.'; s.wait = false; s.afterEq = false; }
    else if (!s.disp.includes('.')) s.disp += '.';
  } else {
    if (s.wait || s.afterEq) { s.disp = k; s.wait = false; s.afterEq = false; }
    else { s.disp = (s.disp === '0' || s.disp === 'Err') ? k : s.disp + k; }
    if (s.disp.length > 14) return;
  }
  _cRender();
}

/* ══════════════════════════════════
   DRAG & DROP — riordinamento widget
══════════════════════════════════ */
let _wDragSrc = null;

function _enableDragDrop() {
  const col = document.getElementById('widget-column');
  if (!col) return;

  col.querySelectorAll('[data-widget-id]').forEach(card => {
    if (card.querySelector('.w-drag-handle')) return; // già inizializzato
    card.draggable = true;

    const handle = document.createElement('div');
    handle.className = 'w-drag-handle';
    handle.innerHTML = '⠿ ⠿ ⠿';
    handle.title = 'Trascina per riordinare';
    card.insertBefore(handle, card.firstChild);

    card.addEventListener('dragstart', e => {
      _wDragSrc = card;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('w-dragging'), 0);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('w-dragging');
      col.querySelectorAll('[data-widget-id]').forEach(c => c.classList.remove('w-dragover'));
      _wDragSrc = null;
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (card !== _wDragSrc) {
        col.querySelectorAll('[data-widget-id]').forEach(c => c.classList.remove('w-dragover'));
        card.classList.add('w-dragover');
      }
    });
    card.addEventListener('dragleave', () => card.classList.remove('w-dragover'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (!_wDragSrc || _wDragSrc === card) return;
      const srcId = _wDragSrc.dataset.widgetId;
      const dstId = card.dataset.widgetId;
      const order = [..._wState.order];
      let si = order.indexOf(srcId), di = order.indexOf(dstId);
      /* Se uno dei due non è nell'order, aggiungilo */
      if (si < 0) { order.push(srcId); si = order.length - 1; }
      if (di < 0) { order.push(dstId); di = order.length - 1; }
      order.splice(si, 1);
      order.splice(di, 0, srcId);
      _wState.order = order;
      _saveWidgetState();
      _reapplyWidgetOrder();
      card.classList.remove('w-dragover');
    });
  });
}

function _reapplyWidgetOrder() {
  const col = document.getElementById('widget-column');
  if (!col) return;
  col.querySelectorAll('[data-widget-id]').forEach(el => {
    const idx = _wState.order.indexOf(el.dataset.widgetId);
    el.style.order = idx >= 0 ? String(idx * 10) : '990';
  });
}
