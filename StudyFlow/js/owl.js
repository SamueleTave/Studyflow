/* =====================================================
   OWL.JS — Gufo animato
   States: perched | flying | sleeping | happy
   ===================================================== */

const OWL_W     = 56;
const OWL_RIGHT = 108;
const OWL_TOP   = 100;

let _owlEl         = null;
let _owlHouseEl    = null;
let _owlState      = 'perched';
let _owlFlyIv      = null;
let _owlPerchedTmr = null;
let _owlTimerRunning = false;
let _owlBlinkTmr   = null;
let _owlInGarden   = false;
let _owlX = 0, _owlY = 0, _owlScale = 1;

const OWL_SVG = `
<div class="owl-dir-wrap">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="${OWL_W}" height="${Math.round(OWL_W*90/80)}" aria-label="Gufo">
  <!-- Ali aperte -->
  <g class="owl-wings">
    <ellipse class="owl-wing-l" cx="10" cy="52" rx="18" ry="7" fill="#7B5E3A" transform="rotate(-20 10 52)"/>
    <ellipse class="owl-wing-r" cx="70" cy="52" rx="18" ry="7" fill="#7B5E3A" transform="rotate(20 70 52)"/>
    <ellipse cx="9"  cy="54" rx="12" ry="5" fill="#9B7D4A" transform="rotate(-15 9 54)" opacity="0.8"/>
    <ellipse cx="71" cy="54" rx="12" ry="5" fill="#9B7D4A" transform="rotate(15 71 54)" opacity="0.8"/>
  </g>
  <!-- Corpo arrotondato -->
  <ellipse cx="40" cy="60" rx="20" ry="24" fill="#7B5E3A"/>
  <!-- Pancia chiara maculata -->
  <ellipse cx="40" cy="65" rx="14" ry="17" fill="#C8A96A" opacity="0.85"/>
  <ellipse cx="40" cy="62" rx="10" ry="12" fill="#9B7D4A" opacity="0.38"/>
  <!-- Coda -->
  <path d="M28,80 Q24,90 30,88 Q35,86 36,78" fill="#6B4E2A"/>
  <path d="M40,82 Q38,92 42,92 Q46,92 44,82" fill="#7B5E3A"/>
  <path d="M52,80 Q56,90 50,88 Q45,86 44,78" fill="#6B4E2A"/>
  <!-- Testa grande rotonda -->
  <circle cx="40" cy="30" r="22" fill="#7B5E3A"/>
  <!-- Ciuffi orecchie -->
  <polygon points="24,14 20,3 29,12" fill="#6B4E2A"/>
  <polygon points="56,14 60,3 51,12" fill="#6B4E2A"/>
  <polygon points="25,13 22,6 28,12" fill="#9B7D4A"/>
  <polygon points="55,13 58,6 52,12" fill="#9B7D4A"/>
  <!-- Disco facciale -->
  <ellipse cx="40" cy="32" rx="18" ry="16" fill="#C8A96A" opacity="0.45"/>
  <!-- Occhi aperti grandi -->
  <g class="owl-eyes-open">
    <circle cx="31" cy="28" r="8"   fill="#F5F5F5"/>
    <circle cx="31" cy="28" r="5.5" fill="#E8C14A"/>
    <circle cx="31" cy="28" r="3.5" fill="#1A1A1A"/>
    <circle cx="32.5" cy="26.5" r="1.3" fill="white"/>
    <circle cx="49" cy="28" r="8"   fill="#F5F5F5"/>
    <circle cx="49" cy="28" r="5.5" fill="#E8C14A"/>
    <circle cx="49" cy="28" r="3.5" fill="#1A1A1A"/>
    <circle cx="50.5" cy="26.5" r="1.3" fill="white"/>
  </g>
  <!-- Occhi chiusi (dormendo) -->
  <g class="owl-eyes-closed" style="display:none">
    <path d="M26,28 Q31,23 36,28" fill="none" stroke="#5D4037" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M44,28 Q49,23 54,28" fill="none" stroke="#5D4037" stroke-width="2.2" stroke-linecap="round"/>
  </g>
  <!-- Becco -->
  <polygon points="40,35 36,42 44,42" fill="#E8B44A"/>
  <polygon points="40,35 37,40 43,40" fill="#F5C86A"/>
  <!-- Zampe -->
  <line x1="33" y1="82" x2="29" y2="90" stroke="#E8B44A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="29" y1="90" x2="23" y2="88" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <line x1="29" y1="90" x2="27" y2="94" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <line x1="29" y1="90" x2="33" y2="92" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <line x1="47" y1="82" x2="51" y2="90" stroke="#E8B44A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="51" y1="90" x2="57" y2="88" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <line x1="51" y1="90" x2="53" y2="94" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <line x1="51" y1="90" x2="47" y2="92" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/>
  <!-- ZZZ (dormendo) -->
  <g class="owl-zzz" style="display:none">
    <text x="62" y="20" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
    <text x="68" y="12" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
  </g>
  <!-- Cuore -->
  <g class="owl-heart" style="display:none">
    <path d="M40,10 C40,10 32,3 27,8 C24,12 25,18 29,21 L40,30 L51,21 C55,18 56,12 53,8 C48,3 40,10 40,10Z" fill="#EC4899" opacity="0.9"/>
  </g>
</svg>
</div>`;

/* ══════════════════════════
   HOUSE HELPER (branch/perch for owl)
   ══════════════════════════ */
function _createPerchHouse(rightPx, topPx, color) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-8}px;top:${topPx + OWL_W + 8}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 70 24" width="70" height="24">
    <rect x="0" y="6" width="70" height="10" rx="5" fill="${color}" opacity="0.9"/>
    <rect x="4" y="6" width="9" height="20" rx="4" fill="${color}" opacity="0.8"/>
    <rect x="57" y="6" width="9" height="20" rx="4" fill="${color}" opacity="0.8"/>
    <rect x="0" y="6" width="70" height="10" rx="5" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

/* ══════════════════════════
   INIT
   ══════════════════════════ */
function initOwl() {
  if (_owlEl) return;
  _owlEl           = document.createElement('div');
  _owlEl.className = 'owl-companion owl-hidden';
  _owlEl.innerHTML = OWL_SVG;
  _owlEl.title     = 'Clicca il gufo!';
  _owlX = window.innerWidth - OWL_W - OWL_RIGHT;
  _owlY = OWL_TOP;
  _owlEl.style.cssText = `position:fixed;left:0;top:0;will-change:transform;transform:translate(${_owlX}px,${_owlY}px);z-index:600;cursor:pointer;`;
  _owlEl.addEventListener('click', _onOwlClick);
  (document.querySelector('.app') || document.body).appendChild(_owlEl);

  _owlHouseEl = _createPerchHouse(OWL_RIGHT, OWL_TOP, '#9B8B6E');
  _owlHouseEl.classList.add('house-hidden');

  _owlBlinkTmr = setInterval(_owlBlink, 3500 + Math.random() * 3000);
}

function _oShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setOwlState(state) {
  if (!_owlEl) return;
  _owlState = state;
  _owlEl.classList.remove('owl-perched','owl-flying','owl-sleeping','owl-happy');
  _owlEl.classList.add('owl-' + state);

  const eyesOpen   = _owlEl.querySelector('.owl-eyes-open');
  const eyesClosed = _owlEl.querySelector('.owl-eyes-closed');
  const zzz        = _owlEl.querySelector('.owl-zzz');
  const heart      = _owlEl.querySelector('.owl-heart');

  _oShow(eyesOpen,   state !== 'sleeping');
  _oShow(eyesClosed, state === 'sleeping');
  _oShow(zzz,        state === 'sleeping');
  _oShow(heart,      state === 'happy');

  _updateOwlHouseVisibility();
}

function _updateOwlHouseVisibility() {
  if (!_owlHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.owlHouseVisible;
  if (!owned) { _owlHouseEl.classList.add('house-hidden'); return; }
  const atRest = !_owlInGarden && (_owlState === 'sleeping' || _owlState === 'perched');
  _owlHouseEl.classList.toggle('house-hidden', !atRest);
}
function showOwlHouse() { _updateOwlHouseVisibility(); }
function hideOwlHouse() { if (_owlHouseEl) _owlHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showOwl() {
  if (!_owlEl) initOwl();
  _owlEl.classList.remove('owl-hidden');
  _goOwlHome(0);
  setOwlState('perched');
  clearTimeout(_owlPerchedTmr);
  _owlPerchedTmr = setTimeout(() => {
    if (_owlState === 'perched') {
      setOwlState('sleeping');
      _owlPerchedTmr = setTimeout(() => { if (_owlTimerRunning) _startOwl(); }, 8000 + Math.random() * 4000);
    }
  }, 6000);
}

function hideOwl() {
  if (!_owlEl) return;
  _stopOwl();
  _owlEl.classList.add('owl-hidden');
  hideOwlHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _getOwlLeft() { return _owlX; }
function _getOwlTop()  { return _owlY; }

function _moveOwlTo(targetLeft, targetTop, durationMs) {
  const goLeft = targetLeft < _owlX;
  _owlEl.style.transition = 'none';
  _owlEl.style.transform = _owlScale !== 1
    ? `translate(${_owlX}px, ${_owlY}px) scale(${_owlScale})`
    : `translate(${_owlX}px, ${_owlY}px)`;
  void _owlEl.offsetWidth;
  _owlEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.4,0,0.6,1)`;
  _owlEl.style.transform = _owlScale !== 1
    ? `translate(${targetLeft}px, ${targetTop}px) scale(${_owlScale})`
    : `translate(${targetLeft}px, ${targetTop}px)`;
  _owlX = targetLeft; _owlY = targetTop;
  const dir = _owlEl.querySelector('.owl-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _goOwlHome(ms = 1000) {
  const homeLeft = window.innerWidth - OWL_W - OWL_RIGHT;
  if (ms > 0) {
    _moveOwlTo(homeLeft, OWL_TOP, ms);
  } else {
    _owlX = homeLeft; _owlY = OWL_TOP;
    _owlEl.style.transition = 'none';
    _owlEl.style.transform = `translate(${_owlX}px, ${_owlY}px)`;
  }
}

/* ══════════════════════════
   VOLA
   ══════════════════════════ */
function _startOwl() {
  clearInterval(_owlFlyIv);
  clearTimeout(_owlPerchedTmr);
  setOwlState('flying');

  const _fly = () => {
    if (Math.random() < 0.20) {
      setOwlState('perched');
      clearInterval(_owlFlyIv);
      _owlFlyIv = null;
      _owlPerchedTmr = setTimeout(() => {
        if (_owlInGarden) return;
        setOwlState('flying');
        _owlFlyIv = setInterval(_fly, 2000 + Math.random() * 700);
      }, 1500 + Math.random() * 1500);
      return;
    }
    const margin  = 60;
    const maxX    = window.innerWidth - OWL_W - margin;
    const maxTop  = Math.min(320, window.innerHeight * 0.4);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetT = 30 + Math.random() * maxTop;
    const dist    = Math.hypot(targetL - _getOwlLeft(), targetT - _getOwlTop());
    _moveOwlTo(targetL, targetT, Math.min(700 + dist * 0.9, 2200));
  };

  _fly();
  _owlFlyIv = setInterval(_fly, 2000 + Math.random() * 700);
}

function _stopOwl() {
  clearInterval(_owlFlyIv);
  clearTimeout(_owlPerchedTmr);
  _owlFlyIv = null;
}

/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function owlEnterGarden() {
  if (!_owlEl || _owlEl.classList.contains('owl-hidden')) return;
  _owlInGarden = true;
  _stopOwl();
  setTimeout(() => {
    if (!_owlInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _owlScale = 0.5;
    _owlEl.style.transform = `translate(${_owlX}px, ${_owlY}px) scale(0.5)`;
    _owlEl.style.transformOrigin = 'right top';
    const targetLeft = rect.left + rect.width * 0.7 - OWL_W / 2;
    const targetTop  = rect.top + 8;
    setOwlState('flying');
    _moveOwlTo(targetLeft, targetTop, 1200);
    setTimeout(() => {
      if (_owlInGarden) {
        setOwlState('perched');
        _startGardenFlyOwl(rect);
      }
    }, 1300);
  }, 900);
}

function _startGardenFlyOwl(rect) {
  const _tryPerchRoost = () => {
    clearInterval(_owlFlyIv);
    _owlFlyIv = null;
    const tr = gardenFindItem('birdhouse') || gardenFindItem('nest');
    if (!tr || !_owlInGarden) {
      _owlFlyIv = setInterval(_gfly, 2400 + Math.random() * 900);
      return;
    }
    const tL = tr.left + tr.width / 2 - OWL_W * 0.5 / 2;
    const tT = tr.top + 2;
    const dist = Math.hypot(tL - _getOwlLeft(), tT - _getOwlTop());
    const moveDur = Math.min(600 + dist * 0.9, 2000);
    setOwlState('flying');
    _moveOwlTo(tL, tT, moveDur);
    setTimeout(() => {
      if (!_owlInGarden) return;
      setOwlState('sleeping');
      setTimeout(() => {
        if (!_owlInGarden) return;
        setOwlState('flying');
        _owlFlyIv = setInterval(_gfly, 2400 + Math.random() * 900);
      }, 4000 + Math.random() * 2000);
    }, moveDur + 80);
  };

  const _gfly = () => {
    if (!_owlInGarden) return;
    if (Math.random() < 0.30) { setOwlState('perched'); return; }
    if (Math.random() < 0.25) { _tryPerchRoost(); return; }
    setOwlState('flying');
    const tL = rect.left + Math.random() * (rect.width * 0.8);
    const tT = rect.top + Math.random() * (rect.height * 0.5);
    const dist = Math.hypot(tL - _getOwlLeft(), tT - _getOwlTop());
    _moveOwlTo(tL, tT, Math.min(700 + dist * 0.9, 2200));
  };
  _gfly();
  _owlFlyIv = setInterval(_gfly, 2400 + Math.random() * 900);
}

function owlExitGarden() {
  if (!_owlEl || _owlEl.classList.contains('owl-hidden')) return;
  if (!_owlInGarden) return;
  _owlInGarden = false;
  _owlScale = 1;
  _owlEl.style.transition = 'none';
  _owlEl.style.transform = `translate(${_owlX}px, ${_owlY}px)`;
  _owlEl.style.transformOrigin = '';
  _stopOwl();
  setOwlState('flying');
  setTimeout(() => {
    _goOwlHome(1100);
    setTimeout(() => {
      if (_owlInGarden) return;
      setOwlState('perched');
      _owlPerchedTmr = setTimeout(() => { if (_owlTimerRunning) _startOwl(); }, 3000 + Math.random() * 2000);
    }, 1200);
  }, 150);
}

/* ══════════════════════════
   SYNC TIMER
   ══════════════════════════ */
function syncOwlToTimer(running, mode) {
  if (!_owlEl || _owlEl.classList.contains('owl-hidden')) return;
  if (_owlInGarden) return;
  _owlTimerRunning = running && (!mode || mode === 'work');
  if (_owlTimerRunning) {
    _startOwl();
  } else {
    _stopOwl();
    _goOwlHome(1000);
    setTimeout(() => {
      if (_owlInGarden) return;
      setOwlState('perched');
      _owlPerchedTmr = setTimeout(() => {
        if (_owlInGarden) return;
        setOwlState('sleeping');
        _owlPerchedTmr = setTimeout(() => {
          if (!_owlInGarden && _owlTimerRunning) _startOwl();
        }, 7000 + Math.random() * 4000);
      }, 3000 + Math.random() * 2000);
    }, 1100);
  }
}

function _owlBlink() {
  if (!_owlEl || _owlState === 'sleeping' || _owlState === 'flying') return;
  const open   = _owlEl.querySelector('.owl-eyes-open');
  const closed = _owlEl.querySelector('.owl-eyes-closed');
  if (!open || !closed) return;
  open.style.display   = 'none';
  closed.style.display = '';
  setTimeout(() => {
    if (open)   open.style.display   = '';
    if (closed) closed.style.display = 'none';
  }, 120);
}

function _onOwlClick() {
  setOwlState('happy');
  _stopOwl();
  if (typeof celebrate === 'function') celebrate(8);
  setTimeout(() => {
    if (_owlState === 'happy') setOwlState('perched');
    _owlPerchedTmr = setTimeout(() => {
      if (!_owlInGarden && _owlTimerRunning) _startOwl();
    }, 2000);
  }, 2500);
}
