/* =====================================================
   GIRAFFE.JS — Giraffa animata
   States: sleeping | sitting | walking | happy
   ===================================================== */

const GIRAFFE_W      = 92;
const GIRAFFE_BOTTOM = 24;
const GIRAFFE_RIGHT  = 680;

let _giraffeEl        = null;
let _giraffeHouseEl   = null;
let _giraffeState     = 'sitting';
let _giraffeWalkIv    = null;
let _giraffeSleepTmr  = null;
let _giraffeHappyTmr  = null;
let _giraffePauseNext = false;
let _giraffeInGarden  = false;
let _giraffeX = 0, _giraffeY = 0;

const GIRAFFE_SVG = `
<div class="giraffe-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 178" width="${GIRAFFE_W}" height="${Math.round(GIRAFFE_W*1.37)}" aria-label="Giraffa">
    <ellipse cx="64" cy="174" rx="28" ry="5" fill="rgba(0,0,0,0.12)"/>
    <!-- Corpo -->
    <circle cx="64" cy="126" r="34" fill="#F0C035" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="64" cy="131" rx="20" ry="21" fill="#FDE89A" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Zampa sinistra -->
    <g class="giraffe-paw-l">
      <rect x="44" y="154" width="13" height="22" rx="6.5" fill="#C89A20" stroke="#1a0a2e" stroke-width="2.8"/>
    </g>
    <!-- Zampa destra -->
    <g class="giraffe-paw-r">
      <rect x="72" y="154" width="13" height="22" rx="6.5" fill="#C89A20" stroke="#1a0a2e" stroke-width="2.8"/>
    </g>
    <!-- Macchie corpo -->
    <ellipse cx="56" cy="116" rx="10" ry="7" fill="#C07818" opacity="0.55" transform="rotate(-15 56 116)"/>
    <ellipse cx="76" cy="128" rx="9" ry="6" fill="#C07818" opacity="0.55" transform="rotate(10 76 128)"/>
    <ellipse cx="50" cy="134" rx="8" ry="5" fill="#C07818" opacity="0.45" transform="rotate(5 50 134)"/>
    <!-- Collo -->
    <path d="M52,96 C48,72 50,48 54,28 C56,18 72,18 70,28 C68,48 70,72 76,96 C72,100 56,100 52,96Z" fill="#F0C035" stroke="#1a0a2e" stroke-width="3"/>
    <!-- Macchie collo -->
    <ellipse cx="58" cy="70" rx="6" ry="8" fill="#C07818" opacity="0.5" transform="rotate(-5 58 70)"/>
    <ellipse cx="68" cy="48" rx="5" ry="7" fill="#C07818" opacity="0.45" transform="rotate(8 68 48)"/>
    <!-- Orecchie -->
    <ellipse cx="46" cy="20" rx="8" ry="12" fill="#F0C035" stroke="#1a0a2e" stroke-width="2.8" transform="rotate(-20 46 20)"/>
    <ellipse cx="46" cy="20" rx="4.5" ry="7" fill="#FBD5C0" transform="rotate(-20 46 20)"/>
    <ellipse cx="82" cy="20" rx="8" ry="12" fill="#F0C035" stroke="#1a0a2e" stroke-width="2.8" transform="rotate(20 82 20)"/>
    <ellipse cx="82" cy="20" rx="4.5" ry="7" fill="#FBD5C0" transform="rotate(20 82 20)"/>
    <!-- Ossiconi -->
    <rect x="54" y="2" width="7" height="14" rx="3.5" fill="#C07818" stroke="#1a0a2e" stroke-width="2"/>
    <circle cx="57" cy="2" r="4" fill="#C07818" stroke="#1a0a2e" stroke-width="2"/>
    <rect x="68" y="2" width="7" height="14" rx="3.5" fill="#C07818" stroke="#1a0a2e" stroke-width="2"/>
    <circle cx="72" cy="2" r="4" fill="#C07818" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Testa -->
    <circle cx="64" cy="28" r="26" fill="#F0C035" stroke="#1a0a2e" stroke-width="3.5"/>
    <!-- Museruolo -->
    <ellipse cx="64" cy="36" rx="16" ry="12" fill="#FDE89A" stroke="#1a0a2e" stroke-width="2"/>
    <!-- Occhi aperti -->
    <g class="giraffe-eye-open">
      <circle cx="50" cy="22" r="10" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="50" cy="23" r="6.5" fill="#7A4A10"/><circle cx="50" cy="23" r="4" fill="#1a0a2e"/><circle cx="52" cy="20" r="2.2" fill="white"/>
      <circle cx="78" cy="22" r="10" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="78" cy="23" r="6.5" fill="#7A4A10"/><circle cx="78" cy="23" r="4" fill="#1a0a2e"/><circle cx="80" cy="20" r="2.2" fill="white"/>
    </g>
    <!-- Occhi chiusi -->
    <g class="giraffe-eye-closed" style="display:none">
      <path d="M40,23 Q50,13 60,23" fill="none" stroke="#1a0a2e" stroke-width="3" stroke-linecap="round"/>
      <path d="M68,23 Q78,13 88,23" fill="none" stroke="#1a0a2e" stroke-width="3" stroke-linecap="round"/>
    </g>
    <!-- Guance e naso -->
    <ellipse cx="38" cy="28" rx="7" ry="5" fill="#F87060" opacity="0.3"/>
    <ellipse cx="90" cy="28" rx="7" ry="5" fill="#F87060" opacity="0.3"/>
    <ellipse cx="64" cy="38" rx="5" ry="3.5" fill="#2A1A08"/>
    <path d="M57,42 Q64,50 71,42" fill="none" stroke="#2A1A08" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Macchia testa -->
    <ellipse cx="68" cy="18" rx="7" ry="5" fill="#C07818" opacity="0.4" transform="rotate(15 68 18)"/>
    <!-- ZZZ -->
    <g class="giraffe-zzz" style="display:none">
      <text x="88" y="14" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
      <text x="100" y="3" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="15">z</text>
    </g>
    <!-- Cuore -->
    <g class="giraffe-heart" style="display:none">
      <path d="M64,8 C64,8 54,0 47,6 C43,11 45,18 50,21 L64,32 L78,21 C83,18 85,11 81,6 C74,0 64,8 64,8Z" fill="#EC4899" opacity="0.9"/>
    </g>
  </svg>
</div>`;

/* ══════════════════════════
   HOUSE HELPER — savana
   ══════════════════════════ */
function _createGiraffeSavana(rightPx, bottomPx) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-10}px;bottom:${bottomPx-2}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 80 58" width="80" height="58">
    <rect x="0" y="40" width="80" height="18" rx="3" fill="#C8A850" opacity="0.7"/>
    <rect x="34" y="14" width="12" height="28" rx="6" fill="#8B5A2B" opacity="0.9"/>
    <circle cx="40" cy="14" r="18" fill="#3E8A1A" stroke="#1a0a2e" stroke-width="2"/>
    <circle cx="32" cy="20" r="10" fill="#4CAA22"/>
    <circle cx="48" cy="20" r="10" fill="#4CAA22"/>
    <circle cx="40" cy="4"  r="9" fill="#5AC828"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

function _gShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   INIT
   ══════════════════════════ */
function initGiraffe() {
  if (_giraffeEl) return;
  _giraffeEl           = document.createElement('div');
  _giraffeEl.className = 'giraffe-companion giraffe-hidden';
  _giraffeEl.innerHTML = GIRAFFE_SVG;
  _giraffeEl.title     = 'Clicca la giraffa!';
  _giraffeX = window.innerWidth - GIRAFFE_W - GIRAFFE_RIGHT;
  _giraffeY = GIRAFFE_BOTTOM;
  _giraffeEl.style.cssText = `position:fixed;left:0;bottom:0;will-change:transform;transform:translate(${_giraffeX}px,${-_giraffeY}px);z-index:600;cursor:pointer;`;
  _giraffeEl.addEventListener('click', _onGiraffeClick);
  (document.querySelector('.app') || document.body).appendChild(_giraffeEl);
  _giraffeHouseEl = _createGiraffeSavana(GIRAFFE_RIGHT, GIRAFFE_BOTTOM);
  _giraffeHouseEl.classList.add('house-hidden');
}

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setGiraffeState(state) {
  if (!_giraffeEl) return;
  _giraffeState = state;
  _giraffeEl.classList.remove('giraffe-sleeping','giraffe-sitting','giraffe-walking','giraffe-happy');
  _giraffeEl.classList.add('giraffe-' + state);
  const eyeOpen   = _giraffeEl.querySelector('.giraffe-eye-open');
  const eyeClosed = _giraffeEl.querySelector('.giraffe-eye-closed');
  const zzz       = _giraffeEl.querySelector('.giraffe-zzz');
  const heart     = _giraffeEl.querySelector('.giraffe-heart');
  _gShow(eyeOpen,   state !== 'sleeping');
  _gShow(eyeClosed, state === 'sleeping');
  _gShow(zzz,       state === 'sleeping');
  _gShow(heart,     state === 'happy');
  _updateGiraffeHouseVisibility();
}

function _updateGiraffeHouseVisibility() {
  if (!_giraffeHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.giraffeHouseVisible;
  if (!owned) { _giraffeHouseEl.classList.add('house-hidden'); return; }
  _giraffeHouseEl.classList.toggle('house-hidden', _giraffeInGarden || _giraffeState !== 'sleeping');
}
function showGiraffeHouse() { _updateGiraffeHouseVisibility(); }
function hideGiraffeHouse() { if (_giraffeHouseEl) _giraffeHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showGiraffe() {
  if (!_giraffeEl) initGiraffe();
  _giraffeEl.classList.remove('giraffe-hidden');
  _giraffeGoHome(0);
  setGiraffeState('sitting');
  clearTimeout(_giraffeSleepTmr);
  _giraffeSleepTmr = setTimeout(() => { if (_giraffeState === 'sitting') setGiraffeState('sleeping'); }, 4500);
}
function hideGiraffe() {
  if (!_giraffeEl) return;
  _stopGiraffeWalking();
  _giraffeEl.classList.add('giraffe-hidden');
  hideGiraffeHouse();
}

function _giraffeGoHome(delay) {
  clearInterval(_giraffeWalkIv);
  _giraffeWalkIv = null;
  setTimeout(() => {
    if (!_giraffeEl) return;
    const homeX = window.innerWidth - GIRAFFE_W - GIRAFFE_RIGHT;
    _giraffeX = homeX; _giraffeY = GIRAFFE_BOTTOM;
    _giraffeEl.style.transition = 'transform 1.2s ease';
    _giraffeEl.style.transform = `translate(${_giraffeX}px, ${-_giraffeY}px)`;
    setTimeout(() => { if (_giraffeEl) _giraffeEl.style.transition = ''; }, 1300);
  }, delay);
}

function _stopGiraffeWalking() {
  clearInterval(_giraffeWalkIv);
  _giraffeWalkIv = null;
}

function _startGiraffeWalking() {
  if (_giraffeWalkIv) return;
  setGiraffeState('walking');
  let dir = -1;
  _giraffeX = _giraffeX || (window.innerWidth - GIRAFFE_W - GIRAFFE_RIGHT);
  _giraffeY = GIRAFFE_BOTTOM;
  const margin = 20;
  const maxX = window.innerWidth - GIRAFFE_W - margin;
  _giraffeWalkIv = setInterval(() => {
    _giraffeX += dir * 1.5;
    if (_giraffeX > maxX) {
      _giraffeX = maxX; dir = -1;
      const dw = _giraffeEl.querySelector('.giraffe-dir-wrap');
      if (dw) dw.style.transform = '';
    }
    if (_giraffeX < margin) {
      _giraffeX = margin; dir = 1;
      const dw = _giraffeEl.querySelector('.giraffe-dir-wrap');
      if (dw) dw.style.transform = 'scaleX(-1)';
    }
    if (_giraffeEl) _giraffeEl.style.transform = `translate(${_giraffeX}px, ${-_giraffeY}px)`;
  }, 16);
}

function _onGiraffeClick() {
  clearTimeout(_giraffeHappyTmr);
  clearTimeout(_giraffeSleepTmr);
  _stopGiraffeWalking();
  setGiraffeState('happy');
  _startGiraffeWalking();
  if (typeof showAnimalBubble === 'function') showAnimalBubble(['Ciao! 🦒','Sono alta!','Guarda che collo!','Miam, foglie! 🌿','Buono studio! ✨'][Math.floor(Math.random()*5)]);
  _giraffeHappyTmr = setTimeout(() => {
    if (_giraffeState === 'happy') {
      setGiraffeState('walking');
      setTimeout(() => {
        _stopGiraffeWalking();
        _giraffeGoHome(0);
        setGiraffeState('sitting');
        _giraffeSleepTmr = setTimeout(() => { if (_giraffeState === 'sitting') setGiraffeState('sleeping'); }, 5000);
      }, 6000);
    }
  }, 3000);
}

/* Integrazione timer StudyFlow */
function onGiraffePomodoroStart() {
  if (!_giraffeEl || _giraffeEl.classList.contains('giraffe-hidden')) return;
  clearTimeout(_giraffeSleepTmr);
  _startGiraffeWalking();
}
function onGiraffePomodoroEnd() {
  if (!_giraffeEl || _giraffeEl.classList.contains('giraffe-hidden')) return;
  _stopGiraffeWalking();
  _giraffeGoHome(0);
  setGiraffeState('happy');
  _giraffeHappyTmr = setTimeout(() => {
    setGiraffeState('sitting');
    _giraffeSleepTmr = setTimeout(() => { if (_giraffeState === 'sitting') setGiraffeState('sleeping'); }, 5000);
  }, 3000);
}
function onGiraffePause() {
  if (!_giraffeEl || _giraffeEl.classList.contains('giraffe-hidden')) return;
  _stopGiraffeWalking();
  _giraffeGoHome(0);
  setGiraffeState('sleeping');
}

function setGiraffeHappy() {
  if (!_giraffeEl || _giraffeEl.classList.contains('giraffe-hidden')) return;
  clearTimeout(_giraffeSleepTmr);
  clearTimeout(_giraffeHappyTmr);
  _stopGiraffeWalking();
  setGiraffeState('happy');
  _startGiraffeWalking();
  _giraffeHappyTmr = setTimeout(() => {
    if (_giraffeState === 'happy') setGiraffeState('walking');
  }, 3000);
}

function syncGiraffeToTimer(running, mode) {
  if (!_giraffeEl || _giraffeEl.classList.contains('giraffe-hidden')) return;
  if (_giraffeInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopGiraffeWalking();
      _giraffeGoHome(1000);
      setTimeout(() => { if (!_giraffeInGarden) setGiraffeState('sleeping'); }, 1100);
    } else {
      clearTimeout(_giraffeSleepTmr);
      _startGiraffeWalking();
    }
  } else {
    _stopGiraffeWalking();
    _giraffeGoHome(1100);
    setTimeout(() => {
      if (!_giraffeInGarden) {
        setGiraffeState('sitting');
        _giraffeSleepTmr = setTimeout(() => { if (_giraffeState === 'sitting') setGiraffeState('sleeping'); }, 5000);
      }
    }, 1200);
  }
}
