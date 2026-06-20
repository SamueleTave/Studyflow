/* =====================================================
   LION.JS — Leone animato
   States: sleeping | sitting | walking | happy
   ===================================================== */

const LION_W      = 92;
const LION_BOTTOM = 24;
const LION_RIGHT  = 546;

let _lionEl        = null;
let _lionHouseEl   = null;
let _lionState     = 'sitting';
let _lionWalkIv    = null;
let _lionSleepTmr  = null;
let _lionHappyTmr  = null;
let _lionPauseNext = false;
let _lionInGarden  = false;
let _lionX = 0, _lionY = 0, _lionScale = 1;

const LION_SVG = `
<div class="lion-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 158" width="${LION_W}" height="${Math.round(LION_W*1.215)}" aria-label="Leone">
    <ellipse cx="62" cy="154" rx="28" ry="5" fill="rgba(0,0,0,0.12)"/>
    <!-- Coda -->
    <path class="lion-tail" d="M88,98 C106,82 112,60 108,42 C106,34 98,34 98,46 C98,58 94,76 88,96Z" fill="#F5B82E" stroke="#1a0a2e" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="108" cy="38" r="12" fill="#C07818" stroke="#1a0a2e" stroke-width="3"/>
    <circle cx="108" cy="38" r="7" fill="#D99020"/>
    <!-- Corpo -->
    <circle cx="60" cy="108" r="36" fill="#F5B82E" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="60" cy="113" rx="21" ry="22" fill="#FDEAA0" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Zampa sinistra -->
    <g class="lion-paw-l">
      <ellipse cx="42" cy="137" rx="14" ry="8" fill="#E8A020" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="33" y1="141" x2="30" y2="147" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="42" y1="143" x2="42" y2="149" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="51" y1="141" x2="54" y2="147" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <!-- Zampa destra -->
    <g class="lion-paw-r">
      <ellipse cx="78" cy="137" rx="14" ry="8" fill="#E8A020" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="69" y1="141" x2="66" y2="147" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="78" y1="143" x2="78" y2="149" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="87" y1="141" x2="90" y2="147" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <!-- Criniera -->
    <circle cx="60" cy="66" r="40" fill="#C07818" stroke="#1a0a2e" stroke-width="3.5"/>
    <circle cx="60" cy="64" r="32" fill="#D99020" opacity="0.5"/>
    <!-- Orecchie -->
    <circle cx="36" cy="34" r="14" fill="#C07818" stroke="#1a0a2e" stroke-width="3"/>
    <circle cx="36" cy="34" r="8" fill="#F5B82E"/>
    <circle cx="84" cy="34" r="14" fill="#C07818" stroke="#1a0a2e" stroke-width="3"/>
    <circle cx="84" cy="34" r="8" fill="#F5B82E"/>
    <!-- Testa -->
    <circle cx="60" cy="62" r="28" fill="#F5B82E" stroke="#1a0a2e" stroke-width="3"/>
    <!-- Occhi aperti -->
    <g class="lion-eye-open">
      <circle cx="48" cy="58" r="11" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="48" cy="59" r="7" fill="#5A9A18"/><circle cx="48" cy="59" r="4.2" fill="#1a0a2e"/><circle cx="51" cy="55.5" r="2.5" fill="white"/>
      <circle cx="72" cy="58" r="11" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="72" cy="59" r="7" fill="#5A9A18"/><circle cx="72" cy="59" r="4.2" fill="#1a0a2e"/><circle cx="75" cy="55.5" r="2.5" fill="white"/>
    </g>
    <!-- Occhi chiusi -->
    <g class="lion-eye-closed" style="display:none">
      <path d="M37,59 Q48,48 59,59" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M61,59 Q72,48 83,59" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <ellipse cx="28" cy="66" rx="8" ry="6" fill="#F87060" opacity="0.28"/>
    <ellipse cx="92" cy="66" rx="8" ry="6" fill="#F87060" opacity="0.28"/>
    <ellipse cx="60" cy="72" rx="6" ry="4.5" fill="#2A1A08"/>
    <line x1="60" y1="76" x2="60" y2="80" stroke="#2A1A08" stroke-width="2.2"/>
    <path d="M52,80 Q60,88 68,80" fill="none" stroke="#2A1A08" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M22,102 Q10,112 14,124 Q24,126 26,116 Q28,108 24,102Z" fill="#E8A020" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M98,102 Q110,112 106,124 Q96,126 94,116 Q92,108 96,102Z" fill="#E8A020" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <!-- ZZZ -->
    <g class="lion-zzz" style="display:none">
      <text x="90" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
      <text x="102" y="8" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="17">z</text>
    </g>
    <!-- Cuore -->
    <g class="lion-heart" style="display:none">
      <path d="M60,16 C60,16 50,8 43,14 C39,19 41,26 46,29 L60,40 L74,29 C79,26 81,19 77,14 C70,8 60,16 60,16Z" fill="#EC4899" opacity="0.9"/>
    </g>
  </svg>
</div>`;

/* ══════════════════════════
   INIT
   ══════════════════════════ */
function initLion() {
  if (_lionEl) return;
  _lionEl           = document.createElement('div');
  _lionEl.className = 'lion-companion lion-hidden';
  _lionEl.innerHTML = LION_SVG;
  _lionEl.title     = 'Clicca il leone!';
  _lionX = window.innerWidth - LION_W - _companionSlotRight('lion');
  _lionY = LION_BOTTOM;
  _lionEl.style.cssText = `position:fixed;left:0;bottom:0;will-change:transform;transform:translate(${_lionX}px,${-_lionY}px);z-index:600;cursor:pointer;`;
  _lionEl.addEventListener('click', _onLionClick);
  (document.querySelector('.app') || document.body).appendChild(_lionEl);

  _lionHouseEl = _createLionCave(LION_RIGHT, LION_BOTTOM);
  _lionHouseEl.classList.add('house-hidden');
}

function _createLionCave(rightPx, bottomPx) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-10}px;bottom:${bottomPx-2}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 70 52" width="70" height="52">
    <!-- Roccia base -->
    <ellipse cx="35" cy="42" rx="32" ry="10" fill="#8B7355" opacity="0.9"/>
    <!-- Grotta -->
    <ellipse cx="35" cy="30" rx="30" ry="22" fill="#7A6448"/>
    <ellipse cx="35" cy="32" rx="26" ry="18" fill="#5C4A30"/>
    <!-- Ingresso scuro -->
    <ellipse cx="35" cy="38" rx="16" ry="12" fill="#2A1F12"/>
    <!-- Dettagli roccia -->
    <ellipse cx="14" cy="18" rx="6" ry="8" fill="#9B8560" opacity="0.7"/>
    <ellipse cx="56" cy="20" rx="5" ry="7" fill="#9B8560" opacity="0.7"/>
    <ellipse cx="35" cy="8"  rx="8" ry="6" fill="#8B7355" opacity="0.6"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

function _lShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setLionState(state) {
  if (!_lionEl) return;
  _lionState = state;
  _lionEl.classList.remove('lion-sleeping','lion-sitting','lion-walking','lion-happy');
  _lionEl.classList.add('lion-' + state);

  const eyeOpen   = _lionEl.querySelector('.lion-eye-open');
  const eyeClosed = _lionEl.querySelector('.lion-eye-closed');
  const zzz       = _lionEl.querySelector('.lion-zzz');
  const heart     = _lionEl.querySelector('.lion-heart');

  _lShow(eyeOpen,   state !== 'sleeping');
  _lShow(eyeClosed, state === 'sleeping');
  _lShow(zzz,       state === 'sleeping');
  _lShow(heart,     state === 'happy');

  _updateLionHouseVisibility();
}

function _updateLionHouseVisibility() {
  if (!_lionHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.lionHouseVisible;
  if (!owned) { _lionHouseEl.classList.add('house-hidden'); return; }
  _lionHouseEl.classList.toggle('house-hidden', _lionInGarden || _lionState !== 'sleeping');
}
function showLionHouse() { _updateLionHouseVisibility(); }
function hideLionHouse() { if (_lionHouseEl) _lionHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   CLICK
   ══════════════════════════ */
function _onLionClick() {
  clearTimeout(_lionHappyTmr);
  setLionState('happy');
  const phrases = [
    'RUAAAH! 🦁', 'Sono il re della savana! 👑',
    'Studiamo insieme! 🎓', 'Sei forte come un leone! 💪',
    'Grande cacciatore di conoscenza! 🌟',
  ];
  const msg = phrases[Math.floor(Math.random() * phrases.length)];
  if (typeof showAnimalThought === 'function') showAnimalThought(msg, 3500);
  _lionHappyTmr = setTimeout(() => { setLionState('sitting'); }, 2000);
}

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showLion() {
  if (!_lionEl) initLion();
  _lionEl.classList.remove('lion-hidden')
  if (_lionHouseEl) _lionHouseEl.style.right = (_companionSlotRight('lion') - 8) + 'px';;
  _lionGoHome(0);
  setLionState('sitting');
  clearTimeout(_lionSleepTmr);
  _lionSleepTmr = setTimeout(() => { if (_lionState === 'sitting') setLionState('sleeping'); }, 5000);
}

function hideLion() {
  if (!_lionEl) return;
  _stopLionWalking();
  _lionEl.classList.add('lion-hidden');
  hideLionHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _lionGetLeft()   { return _lionX; }
function _lionGetBottom() { return _lionY; }

function _lionMoveTo(targetLeft, targetBottom, durationMs) {
  const goLeft = targetLeft < _lionX;
  _lionEl.style.transition = 'none';
  _lionEl.style.transform = _lionScale !== 1
    ? `translate(${_lionX}px, ${-_lionY}px) scale(${_lionScale})`
    : `translate(${_lionX}px, ${-_lionY}px)`;
  void _lionEl.offsetWidth;
  _lionEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.42,0,0.58,1)`;
  _lionEl.style.transform = _lionScale !== 1
    ? `translate(${targetLeft}px, ${-targetBottom}px) scale(${_lionScale})`
    : `translate(${targetLeft}px, ${-targetBottom}px)`;
  _lionX = targetLeft; _lionY = targetBottom;
  const dir = _lionEl.querySelector('.lion-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _lionGoHome(durationMs) {
  const homeLeft = window.innerWidth - LION_W - _companionSlotRight('lion');
  if (durationMs > 0) {
    _lionMoveTo(homeLeft, LION_BOTTOM, durationMs);
  } else {
    _lionX = homeLeft; _lionY = LION_BOTTOM;
    _lionEl.style.transition = 'none';
    _lionEl.style.transform = `translate(${_lionX}px, ${-_lionY}px)`;
  }
}

/* ══════════════════════════
   CAMMINA
   ══════════════════════════ */
function _startLionWalking() {
  clearInterval(_lionWalkIv);
  clearTimeout(_lionSleepTmr);
  _lionPauseNext = false;
  setLionState('walking');

  const step = () => {
    if (_lionPauseNext) {
      _lionPauseNext = false;
      setLionState('sitting');
      setTimeout(() => { if (_lionState === 'sitting' && _lionWalkIv) setLionState('walking'); }, 1100 + Math.random()*700);
      return;
    }
    if (Math.random() < 0.10) _lionPauseNext = true;

    const margin  = 60;
    const maxX    = window.innerWidth - LION_W - margin;
    const maxY    = Math.min(200, window.innerHeight * 0.25);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetB = LION_BOTTOM + Math.random() * maxY;
    const dist    = Math.abs(targetL - _lionGetLeft());
    _lionMoveTo(targetL, targetB, Math.min(500 + dist * 1.6, 2400));
  };

  step();
  _lionWalkIv = setInterval(step, 1800);
}

function _stopLionWalking() {
  clearInterval(_lionWalkIv);
  clearTimeout(_lionSleepTmr);
  _lionWalkIv = null;
}

/* ══════════════════════════
   SYNC COL TIMER
   ══════════════════════════ */
function setLionHappy() {
  if (!_lionEl || _lionEl.classList.contains('lion-hidden')) return;
  clearTimeout(_lionSleepTmr);
  clearTimeout(_lionHappyTmr);
  _stopLionWalking();
  setLionState('happy');
  _startLionWalking();
  _lionHappyTmr = setTimeout(() => {
    if (_lionState === 'happy') setLionState('walking');
  }, 3000);
}

function syncLionToTimer(running, mode) {
  if (!_lionEl || _lionEl.classList.contains('lion-hidden')) return;
  if (_lionInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopLionWalking();
      _lionGoHome(1000);
      setTimeout(() => { if (!_lionInGarden) setLionState('sleeping'); }, 1100);
    } else {
      clearTimeout(_lionSleepTmr);
      _startLionWalking();
    }
  } else {
    _stopLionWalking();
    _lionGoHome(1100);
    setTimeout(() => {
      if (!_lionInGarden) {
        setLionState('sitting');
        _lionSleepTmr = setTimeout(() => { if (_lionState === 'sitting') setLionState('sleeping'); }, 5000);
      }
    }, 1200);
  }
}

/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function lionEnterGarden() {
  if (!_lionEl || _lionEl.classList.contains('lion-hidden')) return;
  _lionInGarden = true;
  _stopLionWalking();
  clearTimeout(_lionSleepTmr);
  setTimeout(() => {
    if (!_lionInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _lionScale = 0.45;
    _lionEl.style.transform = `translate(${_lionX}px, ${-_lionY}px) scale(0.45)`;
    _lionEl.style.transformOrigin = 'left bottom';
    _startGardenWalkLion(rect);
  }, 900);
}

function _startGardenWalkLion(rect) {
  const SCALE   = 0.45;
  const pad     = 14;
  const GRASS_H = 100;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - LION_W * SCALE - pad;
  const minB  = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
  const maxB  = minB + 8;

  setLionState('walking');
  const _gstep = () => {
    if (!_lionInGarden) return;

    if (Math.random() < 0.20) {
      setLionState('sitting');
      setTimeout(() => { if (_lionInGarden) setLionState('walking'); }, 1200 + Math.random() * 800);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _lionGetLeft());
    _lionMoveTo(tL, tB, Math.min(500 + dist * 2.2, 2400));
  };
  _gstep();
  _lionWalkIv = setInterval(_gstep, 2000 + Math.random() * 700);
}

function lionExitGarden() {
  if (!_lionEl || _lionEl.classList.contains('lion-hidden')) return;
  if (!_lionInGarden) return;
  _lionInGarden = false;
  _lionScale = 1;
  _lionEl.style.transition = 'none';
  _lionEl.style.transform = `translate(${_lionX}px, ${-_lionY}px)`;
  _lionEl.style.transformOrigin = '';
  _stopLionWalking();
  clearTimeout(_lionSleepTmr);
  setLionState('walking');
  setTimeout(() => {
    _lionGoHome(1300);
    setTimeout(() => {
      if (_lionInGarden) return;
      setLionState('sitting');
      _lionSleepTmr = setTimeout(() => { if (_lionState === 'sitting') setLionState('sleeping'); }, 4000);
    }, 1400);
  }, 150);
}
