/* =====================================================
   LION.JS — Leone animato
   States: sleeping | sitting | walking | happy
   ===================================================== */

const LION_W      = 80;
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

const LION_SVG = `
<div class="lion-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${LION_W}" height="${Math.round(LION_W*1.2)}" aria-label="Leone">

    <!-- Coda con ciuffo -->
    <path class="lion-tail" d="M68,80 C82,70 88,52 83,36"
      fill="none" stroke="#D4851D" stroke-width="6.5" stroke-linecap="round"/>
    <ellipse cx="82" cy="30" rx="9" ry="12" fill="#C47020" transform="rotate(22 82 30)"/>
    <ellipse cx="82" cy="30" rx="5.5" ry="7.5" fill="#D4851D" transform="rotate(22 82 30)"/>

    <!-- Corpo -->
    <ellipse cx="50" cy="87" rx="27" ry="22" fill="#F5B842"/>

    <!-- Pancia chiara -->
    <ellipse cx="50" cy="92" rx="18" ry="13" fill="#FAD888" opacity="0.55"/>

    <!-- Zampa sinistra -->
    <g class="lion-paw-l">
      <ellipse cx="37" cy="108" rx="12" ry="7.5" fill="#E8A832"/>
      <line x1="32" y1="108" x2="32" y2="113" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="37" y1="110" x2="37" y2="115" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="42" y1="108" x2="42" y2="113" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
    </g>

    <!-- Zampa destra -->
    <g class="lion-paw-r">
      <ellipse cx="63" cy="108" rx="12" ry="7.5" fill="#E8A832"/>
      <line x1="58" y1="108" x2="58" y2="113" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="63" y1="110" x2="63" y2="115" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="68" y1="108" x2="68" y2="113" stroke="#C07828" stroke-width="1.8" stroke-linecap="round"/>
    </g>

    <!-- CRINIERA (dietro testa) -->
    <circle cx="50" cy="46" r="31" fill="#C47020"/>
    <circle cx="50" cy="46" r="28" fill="#D4851D"/>

    <!-- Orecchie (davanti criniera, dietro testa) -->
    <circle cx="28" cy="22" r="10" fill="#F5B842"/>
    <circle cx="28" cy="22" r="6.5" fill="#FFCCB0"/>
    <circle cx="72" cy="22" r="10" fill="#F5B842"/>
    <circle cx="72" cy="22" r="6.5" fill="#FFCCB0"/>

    <!-- TESTA -->
    <circle cx="50" cy="46" r="23" fill="#F5B842"/>

    <!-- Museruolo -->
    <ellipse cx="50" cy="56" rx="15" ry="11" fill="#FAD888"/>

    <!-- Occhi aperti -->
    <g class="lion-eye-open">
      <circle cx="39" cy="41" r="6.5" fill="#1A0E00"/>
      <circle cx="39" cy="41" r="5"   fill="#C47B20"/>
      <circle cx="39" cy="41.5" r="2.8" fill="#080300"/>
      <circle cx="40.5" cy="39.4" r="1.5" fill="white"/>
      <circle cx="37.5" cy="43"   r="0.7" fill="rgba(255,255,255,0.5)"/>

      <circle cx="61" cy="41" r="6.5" fill="#1A0E00"/>
      <circle cx="61" cy="41" r="5"   fill="#C47B20"/>
      <circle cx="61" cy="41.5" r="2.8" fill="#080300"/>
      <circle cx="62.5" cy="39.4" r="1.5" fill="white"/>
      <circle cx="59.5" cy="43"   r="0.7" fill="rgba(255,255,255,0.5)"/>
    </g>

    <!-- Occhi chiusi (dormendo) -->
    <g class="lion-eye-closed" style="display:none">
      <path d="M33,41 Q39,35 45,41" fill="none" stroke="#3A2800" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M55,41 Q61,35 67,41" fill="none" stroke="#3A2800" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <!-- Naso -->
    <path d="M46,60 L54,60 L50,65Z" fill="#1A0A00"/>
    <ellipse cx="48" cy="59" rx="1.8" ry="1.2" fill="rgba(255,255,255,0.4)"/>

    <!-- Bocca -->
    <path d="M44,65 Q50,71 56,65" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.5" stroke-linecap="round"/>

    <!-- Baffi -->
    <line x1="27" y1="57" x2="43" y2="58" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="27" y1="61" x2="43" y2="60" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="57" y1="58" x2="73" y2="57" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="57" y1="60" x2="73" y2="61" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>

    <!-- Guance -->
    <circle cx="31" cy="53" r="5.5" fill="#FF9AB3" opacity="0.36"/>
    <circle cx="69" cy="53" r="5.5" fill="#FF9AB3" opacity="0.36"/>

    <!-- ZZZ (dormendo) -->
    <g class="lion-zzz" style="display:none">
      <text x="64" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
      <text x="70" y="14" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
    </g>

    <!-- Cuore (felice) -->
    <g class="lion-heart" style="display:none">
      <path d="M50,14 C50,14 42,7 37,12 C34,16 35,22 39,25 L50,34 L61,25 C65,22 66,16 63,12 C58,7 50,14 50,14Z" fill="#EC4899" opacity="0.9"/>
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
  _lionEl.style.cssText = `position:fixed;right:${LION_RIGHT}px;bottom:${LION_BOTTOM}px;left:auto;z-index:600;cursor:pointer;`;
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
  _lionEl.classList.remove('lion-hidden');
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
function _lionGetLeft()   { return _lionEl.getBoundingClientRect().left; }
function _lionGetBottom() { const r = _lionEl.getBoundingClientRect(); return window.innerHeight - r.bottom; }

function _lionMoveTo(targetLeft, targetBottom, durationMs) {
  const curLeft   = _lionGetLeft();
  const curBottom = _lionGetBottom();
  const goLeft    = targetLeft < curLeft;

  _lionEl.style.transition = 'none';
  _lionEl.style.right      = 'auto';
  _lionEl.style.left       = curLeft + 'px';
  _lionEl.style.bottom     = curBottom + 'px';
  void _lionEl.offsetWidth;

  _lionEl.style.transition = `left ${durationMs}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(durationMs*0.75)}ms ease-in-out`;
  _lionEl.style.left   = targetLeft + 'px';
  _lionEl.style.bottom = targetBottom + 'px';

  const dir = _lionEl.querySelector('.lion-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _lionGoHome(durationMs) {
  const homeLeft = window.innerWidth - LION_W - LION_RIGHT;
  if (durationMs > 0) {
    _lionMoveTo(homeLeft, LION_BOTTOM, durationMs);
    setTimeout(() => {
      if (!_lionEl) return;
      _lionEl.style.transition = 'none';
      _lionEl.style.left   = 'auto';
      _lionEl.style.right  = LION_RIGHT + 'px';
      _lionEl.style.bottom = LION_BOTTOM + 'px';
    }, durationMs + 80);
  } else {
    _lionEl.style.transition = 'none';
    _lionEl.style.right  = LION_RIGHT + 'px';
    _lionEl.style.left   = 'auto';
    _lionEl.style.bottom = LION_BOTTOM + 'px';
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
    _lionEl.style.transform = 'scale(0.45)';
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
  _lionEl.style.transform = '';
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
