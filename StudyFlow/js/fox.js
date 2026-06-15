/* =====================================================
   FOX.JS — Volpe animata
   States: sleeping | sitting | walking | happy
   ===================================================== */

const FOX_W      = 68;
const FOX_BOTTOM = 24;
const FOX_RIGHT  = 414;

let _foxEl        = null;
let _foxHouseEl   = null;
let _foxState     = 'sitting';
let _foxWalkIv    = null;
let _foxSleepTmr  = null;
let _foxHappyTmr  = null;
let _foxPauseNext = false;
let _foxInGarden  = false;

const FOX_SVG = `
<div class="fox-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${FOX_W}" height="${Math.round(FOX_W*1.2)}" aria-label="Volpe">

    <!-- Coda grande (destra, dietro corpo) -->
    <path d="M66,78 C84,66 96,44 90,24 C86,12 76,16 74,30 C72,44 76,64 68,76Z" fill="#E87B2A"/>
    <ellipse cx="85" cy="20" rx="9" ry="12" fill="white" opacity="0.88" transform="rotate(15 85 20)"/>
    <path d="M78,60 C82,46 84,32 80,22" fill="none" stroke="#F5A050" stroke-width="3.5" opacity="0.4" stroke-linecap="round"/>

    <!-- Corpo -->
    <ellipse cx="50" cy="87" rx="26" ry="22" fill="#E87B2A"/>
    <!-- Pancia bianca -->
    <ellipse cx="50" cy="91" rx="18" ry="14" fill="white" opacity="0.82"/>

    <!-- Zampa sinistra -->
    <g class="fox-paw-l">
      <ellipse cx="37" cy="108" rx="11" ry="7" fill="#D06828"/>
      <line x1="33" y1="108" x2="33" y2="112" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="37" y1="110" x2="37" y2="114" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="41" y1="108" x2="41" y2="112" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <!-- Zampa destra -->
    <g class="fox-paw-r">
      <ellipse cx="63" cy="108" rx="11" ry="7" fill="#D06828"/>
      <line x1="59" y1="108" x2="59" y2="112" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="63" y1="110" x2="63" y2="114" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="67" y1="108" x2="67" y2="112" stroke="#B85820" stroke-width="1.8" stroke-linecap="round"/>
    </g>

    <!-- Testa -->
    <circle cx="50" cy="43" r="27" fill="#E87B2A"/>

    <!-- Orecchie appuntite -->
    <polygon points="26,28 17,3 44,22" fill="#E87B2A"/>
    <polygon points="74,28 83,3 56,22" fill="#E87B2A"/>
    <polygon points="28,25 21,8 42,21" fill="#FF9AB3"/>
    <polygon points="72,25 79,8 58,21" fill="#FF9AB3"/>

    <!-- Museruolo chiaro -->
    <ellipse cx="50" cy="57" rx="17" ry="12" fill="#F8D29A" opacity="0.88"/>

    <!-- Occhi aperti (tondi patatini teneri) -->
    <g class="fox-eye-open">
      <circle cx="39" cy="41" r="7.0" fill="#1C0E00"/>
      <circle cx="39" cy="41" r="5.8" fill="#E8A820"/>
      <circle cx="39" cy="41.5" r="3.2" fill="#0A0400"/>
      <circle cx="40.6" cy="39.4" r="1.6" fill="white"/>
      <circle cx="37.6" cy="43.0" r="0.8" fill="rgba(255,255,255,0.5)"/>
      <circle cx="61" cy="41" r="7.0" fill="#1C0E00"/>
      <circle cx="61" cy="41" r="5.8" fill="#E8A820"/>
      <circle cx="61" cy="41.5" r="3.2" fill="#0A0400"/>
      <circle cx="62.6" cy="39.4" r="1.6" fill="white"/>
      <circle cx="59.6" cy="43.0" r="0.8" fill="rgba(255,255,255,0.5)"/>
    </g>
    <!-- Occhi chiusi (dormendo) -->
    <g class="fox-eye-closed" style="display:none">
      <path d="M33,41 Q39,35 45,41" fill="none" stroke="#3A2800" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M55,41 Q61,35 67,41" fill="none" stroke="#3A2800" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <!-- Naso -->
    <ellipse cx="50" cy="60" rx="4.5" ry="3" fill="#1A0A00"/>
    <ellipse cx="49" cy="59" rx="1.8" ry="1.2" fill="rgba(255,255,255,0.45)"/>
    <!-- Bocca -->
    <path d="M45,63 Q50,68 55,63" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.5" stroke-linecap="round"/>

    <!-- ZZZ (dormendo) -->
    <g class="fox-zzz" style="display:none">
      <text x="64" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
      <text x="70" y="14" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
    </g>
    <!-- Cuore (felice) -->
    <g class="fox-heart" style="display:none">
      <path d="M50,15 C50,15 42,8 37,13 C34,17 35,23 39,26 L50,35 L61,26 C65,23 66,17 63,13 C58,8 50,15 50,15Z" fill="#EC4899" opacity="0.9"/>
    </g>
  </svg>
</div>`;

/* ══════════════════════════
   HOUSE HELPER
   ══════════════════════════ */
function _createGroundHouse(rightPx, bottomPx, color) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-8}px;bottom:${bottomPx-2}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 60 50" width="60" height="50">
    <polygon points="4,26 30,4 56,26" fill="${color}" opacity="0.85"/>
    <rect x="10" y="26" width="40" height="22" rx="2" fill="${color}" opacity="0.9"/>
    <rect x="22" y="30" width="16" height="18" rx="2" fill="rgba(0,0,0,0.25)"/>
    <rect x="10" y="26" width="40" height="22" rx="2" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
  </svg>`;
  document.body.appendChild(h);
  return h;
}

/* ══════════════════════════
   INIT
   ══════════════════════════ */
function initFox() {
  if (_foxEl) return;
  _foxEl           = document.createElement('div');
  _foxEl.className = 'fox-companion fox-hidden';
  _foxEl.innerHTML = FOX_SVG;
  _foxEl.title     = 'Clicca la volpe!';
  _foxEl.style.cssText = `position:fixed;right:${FOX_RIGHT}px;bottom:${FOX_BOTTOM}px;left:auto;z-index:600;cursor:pointer;`;
  _foxEl.addEventListener('click', _onFoxClick);
  document.body.appendChild(_foxEl);

  _foxHouseEl = _createGroundHouse(FOX_RIGHT, FOX_BOTTOM, '#E8845A');
  _foxHouseEl.classList.add('house-hidden');
}

function _fShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setFoxState(state) {
  if (!_foxEl) return;
  _foxState = state;
  _foxEl.classList.remove('fox-sleeping','fox-sitting','fox-walking','fox-happy');
  _foxEl.classList.add('fox-' + state);

  const eyeOpen   = _foxEl.querySelector('.fox-eye-open');
  const eyeClosed = _foxEl.querySelector('.fox-eye-closed');
  const zzz       = _foxEl.querySelector('.fox-zzz');
  const heart     = _foxEl.querySelector('.fox-heart');

  _fShow(eyeOpen,   state !== 'sleeping');
  _fShow(eyeClosed, state === 'sleeping');
  _fShow(zzz,       state === 'sleeping');
  _fShow(heart,     state === 'happy');

  _updateFoxHouseVisibility();
}

function _updateFoxHouseVisibility() {
  if (!_foxHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.foxHouseVisible;
  if (!owned) { _foxHouseEl.classList.add('house-hidden'); return; }
  _foxHouseEl.classList.toggle('house-hidden', _foxInGarden || _foxState !== 'sleeping');
}
function showFoxHouse() { _updateFoxHouseVisibility(); }
function hideFoxHouse() { if (_foxHouseEl) _foxHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showFox() {
  if (!_foxEl) initFox();
  _foxEl.classList.remove('fox-hidden');
  _foxGoHome(0);
  setFoxState('sitting');
  clearTimeout(_foxSleepTmr);
  _foxSleepTmr = setTimeout(() => { if (_foxState === 'sitting') setFoxState('sleeping'); }, 4500);
}

function hideFox() {
  if (!_foxEl) return;
  _stopFoxWalking();
  _foxEl.classList.add('fox-hidden');
  hideFoxHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _foxGetLeft()   { return _foxEl.getBoundingClientRect().left; }
function _foxGetBottom() { const r = _foxEl.getBoundingClientRect(); return window.innerHeight - r.bottom; }

function _foxMoveTo(targetLeft, targetBottom, durationMs) {
  const curLeft   = _foxGetLeft();
  const curBottom = _foxGetBottom();
  const goLeft    = targetLeft < curLeft;

  _foxEl.style.transition = 'none';
  _foxEl.style.right      = 'auto';
  _foxEl.style.left       = curLeft + 'px';
  _foxEl.style.bottom     = curBottom + 'px';
  void _foxEl.offsetWidth;

  _foxEl.style.transition = `left ${durationMs}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(durationMs*0.75)}ms ease-in-out`;
  _foxEl.style.left   = targetLeft + 'px';
  _foxEl.style.bottom = targetBottom + 'px';

  const dir = _foxEl.querySelector('.fox-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _foxGoHome(durationMs) {
  const homeLeft = window.innerWidth - FOX_W - FOX_RIGHT;
  if (durationMs > 0) {
    _foxMoveTo(homeLeft, FOX_BOTTOM, durationMs);
    setTimeout(() => {
      if (!_foxEl) return;
      _foxEl.style.transition = 'none';
      _foxEl.style.left   = 'auto';
      _foxEl.style.right  = FOX_RIGHT + 'px';
      _foxEl.style.bottom = FOX_BOTTOM + 'px';
    }, durationMs + 80);
  } else {
    _foxEl.style.transition = 'none';
    _foxEl.style.right  = FOX_RIGHT + 'px';
    _foxEl.style.left   = 'auto';
    _foxEl.style.bottom = FOX_BOTTOM + 'px';
  }
}

/* ══════════════════════════
   CAMMINA
   ══════════════════════════ */
function _startFoxWalking() {
  clearInterval(_foxWalkIv);
  clearTimeout(_foxSleepTmr);
  _foxPauseNext = false;
  setFoxState('walking');

  const step = () => {
    if (_foxPauseNext) {
      _foxPauseNext = false;
      setFoxState('sitting');
      setTimeout(() => { if (_foxState === 'sitting' && _foxWalkIv) setFoxState('walking'); }, 900 + Math.random()*600);
      return;
    }
    if (Math.random() < 0.10) _foxPauseNext = true;

    const margin  = 60;
    const maxX    = window.innerWidth - FOX_W - margin;
    const maxY    = Math.min(220, window.innerHeight * 0.28);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetB = FOX_BOTTOM + Math.random() * maxY;
    const dist    = Math.abs(targetL - _foxGetLeft());
    _foxMoveTo(targetL, targetB, Math.min(400 + dist * 1.5, 2200));
  };

  step();
  _foxWalkIv = setInterval(step, 1600);
}

function _stopFoxWalking() {
  clearInterval(_foxWalkIv);
  clearTimeout(_foxSleepTmr);
  _foxWalkIv = null;
}

/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function foxEnterGarden() {
  if (!_foxEl || _foxEl.classList.contains('fox-hidden')) return;
  _foxInGarden = true;
  _stopFoxWalking();
  clearTimeout(_foxSleepTmr);
  setTimeout(() => {
    if (!_foxInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _foxEl.style.transform = 'scale(0.45)';
    _foxEl.style.transformOrigin = 'left bottom';
    _startGardenWalkFox(rect);
  }, 560);
}

function _startGardenWalkFox(rect) {
  const SCALE = 0.45;
  const pad   = 14;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - FOX_W * SCALE - pad;
  const minB  = window.innerHeight - rect.bottom + 4;
  const maxB  = minB + rect.height * 0.38;

  let _foxBusy = false;
  setFoxState('walking');
  const _gstep = () => {
    if (!_foxInGarden || _foxBusy) return;

    if (Math.random() < 0.22) {
      const holeRect = gardenFindItem('hole');
      if (holeRect && holeRect.width > 0) {
        _foxBusy = true;
        const tL = holeRect.left + holeRect.width / 2 - FOX_W * SCALE / 2;
        const tB = window.innerHeight - holeRect.bottom;
        const dist = Math.abs(tL - _foxGetLeft());
        const moveDur = Math.min(500 + dist * 2.0, 2000);
        setFoxState('walking');
        _foxMoveTo(tL, tB, moveDur);
        clearTimeout(_foxSleepTmr);
        _foxSleepTmr = setTimeout(() => {
          if (!_foxInGarden) { _foxBusy = false; return; }
          setFoxState('happy');
          _foxSleepTmr = setTimeout(() => {
            _foxBusy = false;
            if (!_foxInGarden) return;
            setFoxState('walking');
          }, 2200);
        }, moveDur + 100);
        return;
      }
    }

    if (Math.random() < 0.18) {
      setFoxState('sitting');
      setTimeout(() => { if (_foxInGarden) setFoxState('walking'); }, 1000 + Math.random()*700);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _foxGetLeft());
    _foxMoveTo(tL, tB, Math.min(500 + dist * 2.0, 2200));
  };
  _gstep();
  _foxWalkIv = setInterval(_gstep, 1900 + Math.random()*600);
}

function foxExitGarden() {
  if (!_foxEl || _foxEl.classList.contains('fox-hidden')) return;
  if (!_foxInGarden) return;
  _foxInGarden = false;
  _foxEl.style.transform = '';
  _foxEl.style.transformOrigin = '';
  _stopFoxWalking();
  setFoxState('walking');
  setTimeout(() => {
    _foxGoHome(1200);
    setTimeout(() => {
      if (_foxInGarden) return;
      setFoxState('sitting');
      _foxSleepTmr = setTimeout(() => { if (_foxState === 'sitting') setFoxState('sleeping'); }, 3500);
    }, 1300);
  }, 150);
}

/* ══════════════════════════
   SYNC TIMER
   ══════════════════════════ */
function syncFoxToTimer(running, mode) {
  if (!_foxEl || _foxEl.classList.contains('fox-hidden')) return;
  if (_foxInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopFoxWalking();
      _foxGoHome(1000);
      clearTimeout(_foxSleepTmr);
      _foxSleepTmr = setTimeout(() => {
        setFoxState('sitting');
        _foxSleepTmr = setTimeout(() => setFoxState('sleeping'), 2500);
      }, 1100);
    } else {
      _startFoxWalking();
    }
  } else {
    _stopFoxWalking();
    _foxGoHome(1200);
    clearTimeout(_foxSleepTmr);
    _foxSleepTmr = setTimeout(() => {
      if (_foxState !== 'happy') setFoxState('sitting');
      _foxSleepTmr = setTimeout(() => { if (_foxState === 'sitting') setFoxState('sleeping'); }, 4000);
    }, 1350);
  }
}

function setFoxHappy() {
  setFoxState('happy');
  clearTimeout(_foxSleepTmr);
  setTimeout(() => { if (_foxState === 'happy') setFoxState('sitting'); }, 2500);
}

function _onFoxClick() {
  clearTimeout(_foxHappyTmr);
  _stopFoxWalking();
  setFoxState('happy');
  if (typeof celebrate === 'function') celebrate(10);
  _foxHappyTmr = setTimeout(() => {
    setFoxState('sitting');
    _foxSleepTmr = setTimeout(() => { if (_foxState === 'sitting') setFoxState('sleeping'); }, 4000);
  }, 4000);
}
