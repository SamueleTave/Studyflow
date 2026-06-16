/* =====================================================
   PARROT.JS — Pappagallo volante
   States: flying | perched | sleeping | happy
   ===================================================== */

const PARROT_W      = 58;
const PARROT_RIGHT  = 32;
const PARROT_TOP    = 90;   // posizione di riposo (top dal bordo)

let _parrotEl         = null;
let _parrotHouseEl    = null;
let _parrotState      = 'perched';
let _parrotFlyIv      = null;
let _parrotPerchedTmr = null;
let _parrotInGarden   = false;

const PARROT_SVG = `
<div class="parrot-dir-wrap">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" width="${PARROT_W}" height="${Math.round(PARROT_W*1.12)}" aria-label="Pappagallo">

  <!-- Coda (dietro corpo) -->
  <path d="M42,83 Q35,97 39,105 Q43,109 45,94" fill="#1565C0"/>
  <path d="M50,85 Q49,101 52,106 Q55,108 53,91" fill="#1976D2"/>
  <path d="M58,83 Q65,97 61,105 Q57,109 55,94" fill="#1565C0"/>

  <!-- Ali aperte (solo in volo) -->
  <g class="parrot-wings" style="display:none">
    <g class="parrot-wing-l">
      <path d="M30,62 C20,60 6,56 0,50 C-2,44 4,38 14,43 C21,47 28,58 30,62Z" fill="#27AE60"/>
      <path d="M30,62 C22,60 12,57 6,53 C4,49 8,45 16,49 C22,53 28,59 30,62Z" fill="#2ECC71" opacity="0.7"/>
    </g>
    <g class="parrot-wing-r">
      <path d="M70,62 C80,60 94,56 100,50 C102,44 96,38 86,43 C79,47 72,58 70,62Z" fill="#27AE60"/>
      <path d="M70,62 C78,60 88,57 94,53 C96,49 92,45 84,49 C78,53 72,59 70,62Z" fill="#2ECC71" opacity="0.7"/>
    </g>
  </g>

  <!-- Corpo -->
  <ellipse cx="50" cy="68" rx="20" ry="23" fill="#2ECC71"/>
  <!-- Pancia più chiara -->
  <ellipse cx="50" cy="73" rx="12" ry="14" fill="#A9DFBF" opacity="0.7"/>

  <!-- Zampe (nascoste in volo) -->
  <g class="parrot-feet">
    <line x1="44" y1="89" x2="41" y2="99" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="41" y1="99" x2="34" y2="102" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="41" y1="99" x2="41" y2="104" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="41" y1="99" x2="47" y2="103" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="56" y1="89" x2="59" y2="99" stroke="#D4AC0D" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="59" y1="99" x2="53" y2="103" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="59" y1="99" x2="59" y2="104" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="59" y1="99" x2="65" y2="102" stroke="#D4AC0D" stroke-width="1.8" stroke-linecap="round"/>
  </g>

  <!-- Testa -->
  <circle cx="50" cy="35" r="20" fill="#E74C3C"/>

  <!-- Maschera gialla -->
  <ellipse cx="55" cy="41" rx="11" ry="9" fill="#F39C12"/>

  <!-- Becco -->
  <path d="M60,37 Q70,42 63,49 Q57,52 55,44 Q57,38 60,37Z" fill="#C0392B"/>
  <path d="M60,37 Q68,41 63,47 Q58,49 56,43Z" fill="#E67E22"/>

  <!-- Occhio aperto -->
  <g class="parrot-eye-open">
    <circle cx="56" cy="29" r="6.5" fill="white"/>
    <circle cx="57" cy="29" r="4.5" fill="#1A1A2E"/>
    <circle cx="58.8" cy="27.5" r="1.6" fill="white"/>
  </g>
  <!-- Occhio chiuso -->
  <g class="parrot-eye-closed" style="display:none">
    <path d="M51,29 Q56,24 62,29" fill="none" stroke="#1A1A2E" stroke-width="2.2" stroke-linecap="round"/>
  </g>

  <!-- ZZZ -->
  <g class="parrot-zzz" style="display:none">
    <text x="68" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
    <text x="74" y="14" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
  </g>
  <!-- Cuore -->
  <g class="parrot-heart" style="display:none">
    <path d="M50,15 C50,15 42,8 37,13 C34,17 35,23 39,26 L50,35 L61,26 C65,23 66,17 63,13 C58,8 50,15 50,15Z" fill="#EC4899" opacity="0.9"/>
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
      _parrotPerchedTmr = setTimeout(() => _startParrot(), 8000 + Math.random() * 4000);
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
      _parrotPerchedTmr = setTimeout(() => _startParrot(), 3000 + Math.random() * 2000);
    }, 1200);
  }, 150);
}

/* ══════════════════════════
   SYNC TIMER
   ══════════════════════════ */
function syncParrotToTimer(running, mode) {
  if (!_parrotEl || _parrotEl.classList.contains('parrot-hidden')) return;
  if (_parrotInGarden) return;
  if (running && (!mode || mode === 'work')) {
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
          if (!_parrotInGarden) _startParrot();
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
      if (!_parrotInGarden) _startParrot();
    }, 2000);
  }, 2200);
}
