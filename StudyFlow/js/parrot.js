/* =====================================================
   PARROT.JS — Pappagallo volante
   States: flying | perched | sleeping | happy
   ===================================================== */

const PARROT_W      = 92;
const PARROT_RIGHT  = 32;
const PARROT_TOP    = 90;   // posizione di riposo (top dal bordo)

let _parrotEl         = null;
let _parrotHouseEl    = null;
let _parrotState      = 'perched';
let _parrotFlyIv      = null;
let _parrotPerchedTmr = null;
let _parrotTimerRunning = false;
let _parrotInGarden   = false;

const PARROT_SVG = `
<div class="parrot-dir-wrap">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 150" width="${PARROT_W}" height="${Math.round(PARROT_W*1.15)}" aria-label="Pappagallo">
  <ellipse cx="65" cy="146" rx="26" ry="5" fill="rgba(0,0,0,0.12)"/>
  <!-- Coda piume -->
  <path d="M52,120 Q44,136 47,142 Q52,144 55,132 Q57,124 54,120Z" fill="#1565C0" stroke="#1a0a2e" stroke-width="2.2"/>
  <path d="M65,124 Q63,140 66,144 Q70,144 69,130 Q68,122 65,124Z" fill="#1976D2" stroke="#1a0a2e" stroke-width="2"/>
  <path d="M78,120 Q86,136 83,142 Q78,144 75,132 Q73,124 76,120Z" fill="#1565C0" stroke="#1a0a2e" stroke-width="2.2"/>
  <!-- Ali (solo in volo) -->
  <g class="parrot-wings" style="display:none">
    <g class="parrot-wing-l">
      <path d="M34,86 C18,80 4,72 -2,62 C-4,54 4,46 16,52 C26,57 32,76 34,86Z" fill="#27AE60" stroke="#1a0a2e" stroke-width="2.5"/>
      <path d="M34,86 C20,81 8,74 2,66 C0,60 6,54 16,60 C24,65 30,78 34,86Z" fill="#2ECC71" opacity="0.6"/>
    </g>
    <g class="parrot-wing-r">
      <path d="M96,86 C112,80 126,72 132,62 C134,54 126,46 114,52 C104,57 98,76 96,86Z" fill="#27AE60" stroke="#1a0a2e" stroke-width="2.5"/>
      <path d="M96,86 C110,81 122,74 128,66 C130,60 124,54 114,60 C106,65 100,78 96,86Z" fill="#2ECC71" opacity="0.6"/>
    </g>
  </g>
  <!-- Corpo tondo -->
  <circle cx="65" cy="100" r="34" fill="#27AE60" stroke="#1a0a2e" stroke-width="3.5"/>
  <ellipse cx="65" cy="106" rx="20" ry="20" fill="#A9DFBF" stroke="#1a0a2e" stroke-width="2"/>
  <!-- Braccia piuma -->
  <!-- Zampe (nascoste in volo) -->
  <g class="parrot-feet">
    <line x1="52" y1="130" x2="48" y2="142" stroke="#D4AC0D" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="48" y1="142" x2="40" y2="145" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="48" y1="142" x2="48" y2="148" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="48" y1="142" x2="56" y2="146" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="78" y1="130" x2="82" y2="142" stroke="#D4AC0D" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="82" y1="142" x2="74" y2="146" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="82" y1="142" x2="82" y2="148" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="82" y1="142" x2="90" y2="145" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
  </g>
  <!-- Ciuffo testa -->
  <path d="M56,26 Q54,14 58,8 Q62,4 60,14 Q59,20 58,26Z" fill="#E74C3C" stroke="#1a0a2e" stroke-width="2"/>
  <path d="M65,24 Q65,10 68,4 Q72,0 70,12 Q68,18 67,24Z" fill="#E74C3C" stroke="#1a0a2e" stroke-width="2"/>
  <path d="M74,26 Q76,14 72,8 Q68,4 70,14 Q71,20 72,26Z" fill="#E74C3C" stroke="#1a0a2e" stroke-width="2"/>
  <!-- Testa rotonda rossa -->
  <circle cx="65" cy="54" r="30" fill="#E74C3C" stroke="#1a0a2e" stroke-width="3.5"/>
  <!-- Maschera gialla -->
  <ellipse cx="72" cy="62" rx="16" ry="13" fill="#F39C12" stroke="#1a0a2e" stroke-width="2"/>
  <!-- Becco curvo -->
  <path d="M76,58 Q90,64 82,74 Q74,78 70,68 Q72,58 76,58Z" fill="#C0392B" stroke="#1a0a2e" stroke-width="2.2"/>
  <path d="M76,58 Q88,63 82,71 Q76,74 72,66Z" fill="#E67E22"/>
  <!-- Occhio aperto -->
  <g class="parrot-eye-open">
    <circle cx="60" cy="44" r="10" fill="white" stroke="#1a0a2e" stroke-width="2.5"/>
    <circle cx="61" cy="44" r="6.5" fill="#1a0a2e"/><circle cx="63" cy="41" r="2.4" fill="white"/>
  </g>
  <!-- Occhio chiuso -->
  <g class="parrot-eye-closed" style="display:none">
    <path d="M50,44 Q60,35 70,44" fill="none" stroke="#1a0a2e" stroke-width="3" stroke-linecap="round"/>
  </g>
  <!-- ZZZ -->
  <g class="parrot-zzz" style="display:none">
    <text x="82" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="12">z</text>
    <text x="92" y="10" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="16">z</text>
  </g>
  <!-- Cuore -->
  <g class="parrot-heart" style="display:none">
    <path d="M65,22 C65,22 55,14 48,20 C44,25 46,32 51,35 L65,46 L79,35 C84,32 86,25 82,20 C75,14 65,22 65,22Z" fill="#EC4899" opacity="0.9"/>
  </g>
</svg>
</div>`;

/* ══════════════════════════
   HOUSE HELPER (perch for parrot)
   ══════════════════════════ */
function _createPerchHouse(rightPx, topPx, color) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-8}px;top:${topPx + PARROT_W + 10}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 60 50" width="60" height="50">
    <polygon points="4,26 30,4 56,26" fill="${color}" opacity="0.85"/>
    <rect x="10" y="26" width="40" height="22" rx="2" fill="${color}" opacity="0.9"/>
    <rect x="22" y="30" width="16" height="18" rx="2" fill="rgba(0,0,0,0.25)"/>
    <rect x="10" y="26" width="40" height="22" rx="2" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

/* ══════════════════════════
   INIT
   ══════════════════════════ */
function initParrot() {
  if (_parrotEl) return;
  _parrotEl = document.createElement('div');
  _parrotEl.className = 'parrot-companion parrot-hidden';
  _parrotEl.innerHTML = PARROT_SVG;
  _parrotEl.style.cssText = `position:fixed;right:${PARROT_RIGHT}px;top:${PARROT_TOP}px;left:auto;z-index:600;cursor:pointer;`;
  _parrotEl.addEventListener('click', _onParrotClick);
  (document.querySelector('.app') || document.body).appendChild(_parrotEl);

  _parrotHouseEl = _createPerchHouse(PARROT_RIGHT, PARROT_TOP, '#27AE60');
  _parrotHouseEl.classList.add('house-hidden');
}

function _pShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setParrotState(state) {
  if (!_parrotEl) return;
  _parrotState = state;
  _parrotEl.classList.remove('parrot-flying','parrot-perched','parrot-happy','parrot-sleeping');
  _parrotEl.classList.add('parrot-' + state);

  const heart      = _parrotEl.querySelector('.parrot-heart');
  const eyeOpen    = _parrotEl.querySelector('.parrot-eye-open');
  const eyeClosed  = _parrotEl.querySelector('.parrot-eye-closed');
  const zzz        = _parrotEl.querySelector('.parrot-zzz');
  const wings      = _parrotEl.querySelector('.parrot-wings');
  const feet       = _parrotEl.querySelector('.parrot-feet');

  _pShow(heart,     state === 'happy');
  _pShow(eyeOpen,   state !== 'sleeping');
  _pShow(eyeClosed, state === 'sleeping');
  _pShow(zzz,       state === 'sleeping');
  _pShow(wings,     state === 'flying');
  _pShow(feet,      state !== 'flying');

  _updateParrotHouseVisibility();
}

function _updateParrotHouseVisibility() {
  if (!_parrotHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.parrotHouseVisible;
  if (!owned) { _parrotHouseEl.classList.add('house-hidden'); return; }
  const atRest = !_parrotInGarden && (_parrotState === 'sleeping' || _parrotState === 'perched');
  _parrotHouseEl.classList.toggle('house-hidden', !atRest);
}
function showParrotHouse() { _updateParrotHouseVisibility(); }
function hideParrotHouse() { if (_parrotHouseEl) _parrotHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showParrot() {
  if (!_parrotEl) initParrot();
  _parrotEl.classList.remove('parrot-hidden');
  _goParrotHome(0);
  setParrotState('perched');
  clearTimeout(_parrotPerchedTmr);
  _parrotPerchedTmr = setTimeout(() => {
    if (_parrotState === 'perched') {
      setParrotState('sleeping');
      _parrotPerchedTmr = setTimeout(() => { if (_parrotTimerRunning) _startParrot(); }, 8000 + Math.random() * 4000);
    }
  }, 6000);
}

function hideParrot() {
  if (!_parrotEl) return;
  _stopParrot();
  _parrotEl.classList.add('parrot-hidden');
  hideParrotHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _getParrotLeft()  { return _parrotEl.getBoundingClientRect().left; }
function _getParrotTop()   { return _parrotEl.getBoundingClientRect().top; }

function _moveParrotTo(targetLeft, targetTop, durationMs) {
  const curLeft = _getParrotLeft();
  const curTop  = _getParrotTop();
  const goLeft  = targetLeft < curLeft;

  _parrotEl.style.transition = 'none';
  _parrotEl.style.right = 'auto';
  _parrotEl.style.left  = curLeft + 'px';
  _parrotEl.style.top   = curTop  + 'px';
  void _parrotEl.offsetWidth;

  _parrotEl.style.transition = `left ${durationMs}ms cubic-bezier(0.4,0,0.6,1), top ${durationMs}ms cubic-bezier(0.4,0,0.6,1)`;
  _parrotEl.style.left = targetLeft + 'px';
  _parrotEl.style.top  = targetTop  + 'px';

  const dir = _parrotEl.querySelector('.parrot-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _goParrotHome(ms = 1000) {
  const homeLeft = window.innerWidth - PARROT_W - PARROT_RIGHT;
  if (ms > 0) {
    _moveParrotTo(homeLeft, PARROT_TOP, ms);
    setTimeout(() => {
      if (!_parrotEl) return;
      _parrotEl.style.transition = 'none';
      _parrotEl.style.left  = 'auto';
      _parrotEl.style.right = PARROT_RIGHT + 'px';
      _parrotEl.style.top   = PARROT_TOP + 'px';
    }, ms + 80);
  } else {
    _parrotEl.style.transition = 'none';
    _parrotEl.style.right = PARROT_RIGHT + 'px';
    _parrotEl.style.left  = 'auto';
    _parrotEl.style.top   = PARROT_TOP + 'px';
  }
}

/* ══════════════════════════
   VOLA
   ══════════════════════════ */
function _startParrot() {
  clearInterval(_parrotFlyIv);
  clearTimeout(_parrotPerchedTmr);
  setParrotState('flying');

  const _fly = () => {
    if (Math.random() < 0.18) {
      setParrotState('perched');
      clearInterval(_parrotFlyIv);
      _parrotFlyIv = null;
      _parrotPerchedTmr = setTimeout(() => {
        if (_parrotInGarden) return;
        setParrotState('flying');
        _parrotFlyIv = setInterval(_fly, 1800 + Math.random() * 600);
      }, 1200 + Math.random() * 1400);
      return;
    }
    const margin   = 60;
    const maxX     = window.innerWidth - PARROT_W - margin;
    const maxTop   = Math.min(280, window.innerHeight * 0.35);
    const targetL  = margin + Math.random() * (maxX - margin);
    const targetT  = 30 + Math.random() * maxTop;
    const dist     = Math.hypot(targetL - _getParrotLeft(), targetT - _getParrotTop());
    const dur      = 600 + dist * 0.9;
    _moveParrotTo(targetL, targetT, Math.min(dur, 2000));
  };

  _fly();
  _parrotFlyIv = setInterval(_fly, 1800 + Math.random() * 600);
}

function _stopParrot() {
  clearInterval(_parrotFlyIv);
  clearTimeout(_parrotPerchedTmr);
  _parrotFlyIv = null;
}

/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function parrotEnterGarden() {
  if (!_parrotEl || _parrotEl.classList.contains('parrot-hidden')) return;
  _parrotInGarden = true;
  _stopParrot();
  setTimeout(() => {
    if (!_parrotInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _parrotEl.style.transform = 'scale(0.5)';
    _parrotEl.style.transformOrigin = 'right top';
    const targetLeft = rect.left + rect.width * 0.55 - PARROT_W / 2;
    const targetTop  = rect.top + 10;
    setParrotState('flying');
    _moveParrotTo(targetLeft, targetTop, 1300);
    setTimeout(() => {
      if (_parrotInGarden) {
        setParrotState('perched');
        _startGardenFlyParrot(rect);
      }
    }, 1400);
  }, 900);
}

function _startGardenFlyParrot(rect) {
  const _tryPerchTree = () => {
    clearInterval(_parrotFlyIv);
    _parrotFlyIv = null;
    const treeIds = ['tree', 'cherryTree', 'birdhouse', 'bamboo'];
    let tr = null;
    for (const tid of treeIds) { tr = gardenFindItem(tid); if (tr) break; }
    if (!tr || !_parrotInGarden) {
      _parrotFlyIv = setInterval(_gfly, 2200 + Math.random() * 800);
      return;
    }
    const tL = tr.left + tr.width / 2 - PARROT_W * 0.5 / 2;
    const tT = tr.top + 2;
    const dist = Math.hypot(tL - _getParrotLeft(), tT - _getParrotTop());
    const moveDur = Math.min(500 + dist * 0.9, 1800);
    setParrotState('flying');
    _moveParrotTo(tL, tT, moveDur);
    clearTimeout(_parrotPerchedTmr);
    _parrotPerchedTmr = setTimeout(() => {
      if (!_parrotInGarden) return;
      setParrotState('perched');
      _parrotPerchedTmr = setTimeout(() => {
        if (!_parrotInGarden) return;
        setParrotState('flying');
        _parrotFlyIv = setInterval(_gfly, 2200 + Math.random() * 800);
      }, 3000 + Math.random() * 2000);
    }, moveDur + 80);
  };

  const _gfly = () => {
    if (!_parrotInGarden) return;
    if (Math.random() < 0.25) { setParrotState('perched'); return; }
    if (Math.random() < 0.30) { _tryPerchTree(); return; }
    setParrotState('flying');
    const tL = rect.left + Math.random() * (rect.width * 0.8);
    const tT = rect.top + Math.random() * (rect.height * 0.5);
    const dist = Math.hypot(tL - _getParrotLeft(), tT - _getParrotTop());
    _moveParrotTo(tL, tT, Math.min(600 + dist * 0.9, 2000));
  };
  _gfly();
  _parrotFlyIv = setInterval(_gfly, 2200 + Math.random() * 800);
}

function parrotExitGarden() {
  if (!_parrotEl || _parrotEl.classList.contains('parrot-hidden')) return;
  if (!_parrotInGarden) return;
  _parrotInGarden = false;
  _parrotEl.style.transform = '';
  _parrotEl.style.transformOrigin = '';
  _stopParrot();
  setParrotState('flying');
  setTimeout(() => {
    _goParrotHome(1100);
    setTimeout(() => {
      if (_parrotInGarden) return;
      setParrotState('perched');
      _parrotPerchedTmr = setTimeout(() => { if (_parrotTimerRunning) _startParrot(); }, 3000 + Math.random() * 2000);
    }, 1200);
  }, 150);
}

/* ══════════════════════════
   SYNC TIMER
   ══════════════════════════ */
function syncParrotToTimer(running, mode) {
  if (!_parrotEl || _parrotEl.classList.contains('parrot-hidden')) return;
  if (_parrotInGarden) return;
  _parrotTimerRunning = running && (!mode || mode === 'work');
  if (_parrotTimerRunning) {
    _startParrot();
  } else {
    _stopParrot();
    _goParrotHome(1000);
    setTimeout(() => {
      if (_parrotInGarden) return;
      setParrotState('perched');
      _parrotPerchedTmr = setTimeout(() => {
        if (_parrotInGarden) return;
        setParrotState('sleeping');
        _parrotPerchedTmr = setTimeout(() => {
          if (!_parrotInGarden && _parrotTimerRunning) _startParrot();
        }, 7000 + Math.random() * 4000);
      }, 3000 + Math.random() * 2000);
    }, 1100);
  }
}

function _onParrotClick() {
  setParrotState('happy');
  _stopParrot();
  setTimeout(() => {
    if (_parrotState === 'happy') setParrotState('perched');
    _parrotPerchedTmr = setTimeout(() => {
      if (!_parrotInGarden && _parrotTimerRunning) _startParrot();
    }, 2000);
  }, 2200);
}
