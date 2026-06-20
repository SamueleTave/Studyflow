/* =====================================================
   FOX.JS — Volpe animata
   States: sleeping | sitting | walking | happy
   ===================================================== */

const FOX_W      = 92;
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
let _foxX = 0, _foxY = 0, _foxScale = 1;

const FOX_SVG = `
<div class="fox-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 0 138 158" width="${FOX_W}" height="${Math.round(FOX_W*1.215)}" aria-label="Volpe">
    <ellipse cx="64" cy="154" rx="28" ry="5" fill="rgba(0,0,0,0.12)"/>
    <!-- Coda -->
    <path d="M18,102 C0,84 -6,58 2,34 C7,20 19,20 17,37 C15,54 17,78 18,100Z" fill="#E8722A" stroke="#1a0a2e" stroke-width="3.2" stroke-linejoin="round"/>
    <ellipse cx="3" cy="37" rx="7" ry="10" fill="white" stroke="#1a0a2e" stroke-width="2.4" transform="rotate(-12 3 37)"/>
    <!-- Corpo -->
    <circle cx="64" cy="108" r="36" fill="#E8722A" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="64" cy="113" rx="22" ry="23" fill="#FFF0E0" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Zampa sinistra -->
    <g class="fox-paw-l">
      <ellipse cx="46" cy="138" rx="14" ry="8" fill="#C85A10" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="37" y1="142" x2="34" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="46" y1="144" x2="46" y2="150" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="55" y1="142" x2="58" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <!-- Zampa destra -->
    <g class="fox-paw-r">
      <ellipse cx="82" cy="138" rx="14" ry="8" fill="#C85A10" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="73" y1="142" x2="70" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="82" y1="144" x2="82" y2="150" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="91" y1="142" x2="94" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <!-- Orecchie -->
    <polygon points="28,46 50,32 30,2" fill="#E8722A" stroke="#1a0a2e" stroke-width="3.2" stroke-linejoin="round"/>
    <polygon points="33,43 47,35 32,8" fill="#F4907A"/>
    <polygon points="100,46 78,32 98,2" fill="#E8722A" stroke="#1a0a2e" stroke-width="3.2" stroke-linejoin="round"/>
    <polygon points="95,43 81,35 96,8" fill="#F4907A"/>
    <!-- Testa -->
    <circle cx="64" cy="62" r="38" fill="#E8722A" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="64" cy="70" rx="27" ry="22" fill="#FFF0E0" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Occhi aperti -->
    <g class="fox-eye-open">
      <circle cx="46" cy="62" r="13" fill="white" stroke="#1a0a2e" stroke-width="3"/>
      <circle cx="46" cy="63" r="8.5" fill="#3A9A3A"/><circle cx="46" cy="63" r="5" fill="#1a0a2e"/><circle cx="49" cy="59" r="2.8" fill="white"/>
      <circle cx="82" cy="62" r="13" fill="white" stroke="#1a0a2e" stroke-width="3"/>
      <circle cx="82" cy="63" r="8.5" fill="#3A9A3A"/><circle cx="82" cy="63" r="5" fill="#1a0a2e"/><circle cx="85" cy="59" r="2.8" fill="white"/>
    </g>
    <!-- Occhi chiusi -->
    <g class="fox-eye-closed" style="display:none">
      <path d="M33,63 Q46,52 59,63" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M69,63 Q82,52 95,63" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <ellipse cx="27" cy="73" rx="10" ry="7" fill="#F06050" opacity="0.4"/>
    <ellipse cx="101" cy="73" rx="10" ry="7" fill="#F06050" opacity="0.4"/>
    <polygon points="64,76 58,82 70,82" fill="#1a0a2e"/>
    <line x1="64" y1="82" x2="64" y2="86" stroke="#1a0a2e" stroke-width="2.2"/>
    <path d="M56,86 Q64,94 72,86" fill="none" stroke="#1a0a2e" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="52" y1="78" x2="22" y2="72" stroke="#1a0a2e" stroke-width="2" stroke-linecap="round"/>
    <line x1="52" y1="82" x2="20" y2="82" stroke="#1a0a2e" stroke-width="2" stroke-linecap="round"/>
    <line x1="76" y1="78" x2="106" y2="72" stroke="#1a0a2e" stroke-width="2" stroke-linecap="round"/>
    <line x1="76" y1="82" x2="108" y2="82" stroke="#1a0a2e" stroke-width="2" stroke-linecap="round"/>
    <path d="M26,100 Q14,110 18,120 Q28,122 30,112 Q32,106 28,100Z" fill="#C85A10" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M102,100 Q114,110 110,120 Q100,122 98,112 Q96,106 100,100Z" fill="#C85A10" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <!-- ZZZ -->
    <g class="fox-zzz" style="display:none">
      <text x="90" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
      <text x="102" y="8" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="17">z</text>
    </g>
    <!-- Cuore -->
    <g class="fox-heart" style="display:none">
      <path d="M64,18 C64,18 54,10 47,16 C43,21 45,28 50,31 L64,42 L78,31 C83,28 85,21 81,16 C74,10 64,18 64,18Z" fill="#EC4899" opacity="0.9"/>
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
  (document.querySelector('.app') || document.body).appendChild(h);
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
  _foxX = window.innerWidth - FOX_W - _companionSlotRight('fox');
  _foxY = FOX_BOTTOM;
  _foxEl.style.cssText = `position:fixed;left:0;bottom:0;will-change:transform;transform:translate(${_foxX}px,${-_foxY}px);z-index:600;cursor:pointer;`;
  _foxEl.addEventListener('click', _onFoxClick);
  (document.querySelector('.app') || document.body).appendChild(_foxEl);

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
  _foxEl.classList.remove('fox-hidden')
  if (_foxHouseEl) _foxHouseEl.style.right = (_companionSlotRight('fox') - 8) + 'px';;
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
function _foxGetLeft()   { return _foxX; }
function _foxGetBottom() { return _foxY; }

function _foxMoveTo(targetLeft, targetBottom, durationMs) {
  const goLeft = targetLeft < _foxX;
  _foxEl.style.transition = 'none';
  _foxEl.style.transform = _foxScale !== 1
    ? `translate(${_foxX}px, ${-_foxY}px) scale(${_foxScale})`
    : `translate(${_foxX}px, ${-_foxY}px)`;
  void _foxEl.offsetWidth;
  _foxEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.42,0,0.58,1)`;
  _foxEl.style.transform = _foxScale !== 1
    ? `translate(${targetLeft}px, ${-targetBottom}px) scale(${_foxScale})`
    : `translate(${targetLeft}px, ${-targetBottom}px)`;
  _foxX = targetLeft; _foxY = targetBottom;
  const dir = _foxEl.querySelector('.fox-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _foxGoHome(durationMs) {
  const homeLeft = window.innerWidth - FOX_W - _companionSlotRight('fox');
  if (durationMs > 0) {
    _foxMoveTo(homeLeft, FOX_BOTTOM, durationMs);
  } else {
    _foxX = homeLeft; _foxY = FOX_BOTTOM;
    _foxEl.style.transition = 'none';
    _foxEl.style.transform = `translate(${_foxX}px, ${-_foxY}px)`;
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
    _foxScale = 0.45;
    _foxEl.style.transform = `translate(${_foxX}px, ${-_foxY}px) scale(0.45)`;
    _foxEl.style.transformOrigin = 'left bottom';
    _startGardenWalkFox(rect);
  }, 900);
}

function _startGardenWalkFox(rect) {
  const SCALE   = 0.45;
  const pad     = 14;
  const GRASS_H = 100;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - FOX_W * SCALE - pad;
  const minB  = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
  const maxB  = minB + 8;

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
  _foxScale = 1;
  _foxEl.style.transition = 'none';
  _foxEl.style.transform = `translate(${_foxX}px, ${-_foxY}px)`;
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
