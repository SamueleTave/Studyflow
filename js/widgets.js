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
];

/* Stato: order = lista ordinata di widget AGGIUNTI dall'utente,
   hidden = nascosti, unlocked = widget premium sbloccati */
let _wState = {
  order:    ['deal', 'cal', 'tasks'],
  hidden:   [],
  unlocked: [],
};

function _loadWidgetState() {
  try {
    const raw = localStorage.getItem(WIDGET_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.order)    _wState.order    = s.order;
    if (s.hidden)   _wState.hidden   = s.hidden;
    if (s.unlocked) _wState.unlocked = s.unlocked;
  } catch {}
}

function _saveWidgetState() {
  try { localStorage.setItem(WIDGET_KEY, JSON.stringify(_wState)); } catch {}
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
}

/* Applica ordine e visibilità ai widget STATICI (già in HTML) */
function _applyStaticWidgetState() {
  const col = document.getElementById('widget-column');
  if (!col) return;

  col.querySelectorAll('[data-widget-id]').forEach(el => {
    const id  = el.dataset.widgetId;
    const idx = _wState.order.indexOf(id);
    el.style.order   = idx >= 0 ? String(idx * 10) : '0';
    el.style.display = _wState.hidden.includes(id) ? 'none' : '';
  });
}

/* Crea SOLO i widget dinamici che l'utente ha esplicitamente aggiunto (_wState.order) */
function _renderOrderedDynamicWidgets() {
  const col = document.getElementById('widget-column');
  if (!col) return;

  const dynamicIds = ['quote', 'focusgoal', 'music', 'stats', 'mood'];

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
    el.innerHTML = _buildWidgetHTML(id);
    col.appendChild(el);
    _initDynamicWidget(id);
  });
}

function _buildWidgetHTML(id) {
  if (id === 'quote')     return _quoteHTML();
  if (id === 'focusgoal') return _focusGoalHTML();
  if (id === 'music')     return _musicHTML();
  if (id === 'stats')     return _statsHTML();
  if (id === 'mood')      return _moodHTML();
  return '';
}

function _initDynamicWidget(id) {
  if (id === 'quote')     _refreshQuote();
  if (id === 'focusgoal') _refreshFocusGoal();
  if (id === 'stats')     _refreshStats();
  if (id === 'mood')      _initMoodWidget();
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
    /* Aggiunge il widget per la prima volta */
    _wState.order.push(id);
    _wState.hidden = _wState.hidden.filter(x => x !== id);
    _saveWidgetState();
    _renderOrderedDynamicWidgets();
    _applyStaticWidgetState();
  } else if (!_wState.hidden.includes(id)) {
    /* Nasconde widget già visibile */
    _wState.hidden.push(id);
    if (el) el.style.display = 'none';
    _saveWidgetState();
  } else {
    /* Mostra widget nascosto */
    _wState.hidden = _wState.hidden.filter(x => x !== id);
    if (el) el.style.display = '';
    _saveWidgetState();
  }
  _refreshPickerList();
}

function unlockWidget(id, price) {
  if (typeof spendCoins !== 'function') return;
  if (!spendCoins(price)) {
    _refreshPickerList(); /* aggiorna per mostrare saldo aggiornato */
    return;
  }
  if (!_wState.unlocked.includes(id)) _wState.unlocked.push(id);
  /* Aggiunge automaticamente il widget appena sbloccato */
  if (!_wState.order.includes(id)) _wState.order.push(id);
  _wState.hidden = _wState.hidden.filter(x => x !== id);
  _saveWidgetState();
  _renderOrderedDynamicWidgets();
  _applyStaticWidgetState();
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
