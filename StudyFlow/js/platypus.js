/* =====================================================
   PLATYPUS.JS — Ornitorinco animato
   States: sleeping | sitting | walking | happy
   ===================================================== */

const PLATYPUS_W      = 90;
const PLATYPUS_BOTTOM = 24;

let _platypusEl        = null;
let _platypusState     = 'sitting';
let _platypusWalkIv    = null;
let _platypusSleepTmr  = null;
let _platypusHappyTmr  = null;
let _platypusPauseNext = false;
let _platypusInGarden  = false;
let _platypusX = 0, _platypusY = 0, _platypusScale = 1;

const PLATYPUS_SVG = `
<div class="platypus-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 170" width="${PLATYPUS_W}" height="${Math.round(PLATYPUS_W * 1.215)}" aria-label="Ornitorinco">
    <!-- Ombra -->
    <ellipse cx="68" cy="156" rx="29" ry="5" fill="rgba(0,0,0,0.12)"/>

    <!-- Coda stile castoro (dietro al corpo) -->
    <path d="M85,130 C96,134 116,140 124,130 C132,120 128,108 118,113 C108,118 100,122 88,122 Z"
          fill="#8B3E0E" stroke="#2a0f00" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M88,124 C100,126 116,128 122,122" fill="none" stroke="#6B2E08" stroke-width="2" stroke-linecap="round"/>
    <path d="M90,132 C102,134 116,134 122,128" fill="none" stroke="#6B2E08" stroke-width="2" stroke-linecap="round"/>

    <!-- Corpo -->
    <ellipse cx="66" cy="106" rx="36" ry="42" fill="#C8722A" stroke="#2a0f00" stroke-width="3.2"/>

    <!-- Pancia -->
    <ellipse cx="62" cy="116" rx="22" ry="27" fill="#D4A870" stroke="#2a0f00" stroke-width="1.8"/>

    <!-- Ala/braccio sinistro -->
    <path d="M33,96 C20,90 12,97 14,108 C18,116 30,113 36,106 Z"
          fill="#A85820" stroke="#2a0f00" stroke-width="2.8" stroke-linejoin="round"/>

    <!-- Ala/braccio destro (poco visibile) -->
    <path d="M99,96 C110,90 115,98 111,108 C107,115 99,110 98,104 Z"
          fill="#A85820" stroke="#2a0f00" stroke-width="2.8" stroke-linejoin="round"/>

    <!-- Testa -->
    <circle cx="66" cy="58" r="34" fill="#C8722A" stroke="#2a0f00" stroke-width="3.2"/>

    <!-- Ciuffo in cima alla testa -->
    <path d="M60,28 C56,18 52,10 55,5 C57,1 62,5 64,12 Q66,5 70,3 C72,0 74,5 72,12 Q74,5 79,8 C82,12 78,22 72,28 Z"
          fill="#C8722A" stroke="#2a0f00" stroke-width="2"/>

    <!-- Becco (punta verso destra) -->
    <path d="M80,60 C90,54 115,60 118,70 C115,80 90,80 80,74 Q77,67 80,60 Z"
          fill="#D4B07A" stroke="#2a0f00" stroke-width="2.8" stroke-linejoin="round"/>
    <!-- Narici -->
    <ellipse cx="108" cy="66" rx="3.5" ry="2.5" fill="#2a0f00" opacity="0.55"/>
    <!-- Linea becco -->
    <line x1="80" y1="68" x2="115" y2="70" stroke="#2a0f00" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/>

    <!-- Occhi aperti -->
    <g class="platypus-eye-open">
      <circle cx="50" cy="50" r="13" fill="white" stroke="#2a0f00" stroke-width="2.8"/>
      <circle cx="51" cy="51" r="9"   fill="#6B5010"/>
      <circle cx="51" cy="51" r="5.5" fill="#1a0500"/>
      <circle cx="55"  cy="46" r="3"  fill="white"/>
      <circle cx="78" cy="50" r="13" fill="white" stroke="#2a0f00" stroke-width="2.8"/>
      <circle cx="79" cy="51" r="9"   fill="#6B5010"/>
      <circle cx="79" cy="51" r="5.5" fill="#1a0500"/>
      <circle cx="83"  cy="46" r="3"  fill="white"/>
    </g>

    <!-- Occhi chiusi (sonno) -->
    <g class="platypus-eye-closed" style="display:none">
      <path d="M38,51 Q50,41 62,51" fill="none" stroke="#2a0f00" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M66,51 Q78,41 90,51" fill="none" stroke="#2a0f00" stroke-width="3.5" stroke-linecap="round"/>
    </g>

    <!-- Piedini (sinistro e destro, teal) -->
    <g class="platypus-foot-l">
      <ellipse cx="48" cy="148" rx="16" ry="8" fill="#4A7A88" stroke="#2a0f00" stroke-width="2.8"/>
      <line x1="36" y1="148" x2="32" y2="155" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="48" y1="150" x2="48" y2="157" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="60" y1="148" x2="64" y2="155" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <g class="platypus-foot-r">
      <ellipse cx="82" cy="148" rx="16" ry="8" fill="#4A7A88" stroke="#2a0f00" stroke-width="2.8"/>
      <line x1="70" y1="148" x2="66" y2="155" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="82" y1="150" x2="82" y2="157" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="94" y1="148" x2="98" y2="155" stroke="#2a0f00" stroke-width="2.2" stroke-linecap="round"/>
    </g>

    <!-- ZZZ (sonno) -->
    <g class="platypus-zzz" style="display:none">
      <text x="92" y="24" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
      <text x="104" y="10" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="17">z</text>
    </g>

    <!-- Cuore (happy) -->
    <g class="platypus-heart" style="display:none">
      <path d="M66,18 C66,18 56,10 49,16 C45,21 47,28 52,31 L66,42 L80,31 C85,28 87,21 83,16 C76,10 66,18 66,18Z"
            fill="#EC4899" opacity="0.9"/>
    </g>
  </svg>
</div>
`;

function _pShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

function initPlatypus() {
  if (_platypusEl) return;
  _platypusEl           = document.createElement('div');
  _platypusEl.className = 'platypus-companion platypus-hidden';
  _platypusEl.innerHTML = PLATYPUS_SVG;
  _platypusEl.title     = 'Clicca l\'ornitorinco!';
  _platypusX = window.innerWidth - PLATYPUS_W - _companionSlotRight('platypus');
  _platypusY = PLATYPUS_BOTTOM;
  _platypusEl.style.cssText = `position:fixed;left:0;bottom:0;will-change:transform;transform:translate(${_platypusX}px,${-_platypusY}px);z-index:600;cursor:pointer;`;
  _platypusEl.addEventListener('click', _onPlatypusClick);
  (document.querySelector('.app') || document.body).appendChild(_platypusEl);
}

function setPlatypusState(state) {
  if (!_platypusEl) return;
  _platypusState = state;
  _platypusEl.classList.remove('platypus-sleeping','platypus-sitting','platypus-walking','platypus-happy');
  _platypusEl.classList.add('platypus-' + state);
  const eyeOpen   = _platypusEl.querySelector('.platypus-eye-open');
  const eyeClosed = _platypusEl.querySelector('.platypus-eye-closed');
  const zzz       = _platypusEl.querySelector('.platypus-zzz');
  const heart     = _platypusEl.querySelector('.platypus-heart');
  _pShow(eyeOpen,   state !== 'sleeping');
  _pShow(eyeClosed, state === 'sleeping');
  _pShow(zzz,       state === 'sleeping');
  _pShow(heart,     state === 'happy');
}

function _platypusGetLeft()   { return _platypusX; }
function _platypusGetBottom() { return _platypusY; }

function _platypusMoveTo(targetLeft, targetBottom, durationMs) {
  const goLeft = targetLeft < _platypusX;
  _platypusEl.style.transition = 'none';
  _platypusEl.style.transform = _platypusScale !== 1
    ? `translate(${_platypusX}px, ${-_platypusY}px) scale(${_platypusScale})`
    : `translate(${_platypusX}px, ${-_platypusY}px)`;
  void _platypusEl.offsetWidth;
  _platypusEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.42,0,0.58,1)`;
  _platypusEl.style.transform = _platypusScale !== 1
    ? `translate(${targetLeft}px, ${-targetBottom}px) scale(${_platypusScale})`
    : `translate(${targetLeft}px, ${-targetBottom}px)`;
  _platypusX = targetLeft; _platypusY = targetBottom;
  const dir = _platypusEl.querySelector('.platypus-dir-wrap');
  if (dir) { dir.style.transition = 'transform 0.18s ease'; dir.style.transform = `scaleX(${goLeft ? -1 : 1})`; }
}

function _platypusGoHome(durationMs) {
  const homeLeft = window.innerWidth - PLATYPUS_W - _companionSlotRight('platypus');
  if (durationMs > 0) {
    _platypusMoveTo(homeLeft, PLATYPUS_BOTTOM, durationMs);
  } else {
    _platypusX = homeLeft; _platypusY = PLATYPUS_BOTTOM;
    _platypusEl.style.transition = 'none';
    _platypusEl.style.transform = `translate(${_platypusX}px, ${-_platypusY}px)`;
  }
}

function _stopPlatypusWalking() { clearInterval(_platypusWalkIv); clearTimeout(_platypusSleepTmr); _platypusWalkIv = null; }

function _startPlatypusWalking() {
  clearInterval(_platypusWalkIv);
  clearTimeout(_platypusSleepTmr);
  _platypusPauseNext = false;
  setPlatypusState('walking');
  const step = () => {
    if (_platypusPauseNext) {
      _platypusPauseNext = false;
      setPlatypusState('sitting');
      setTimeout(() => { if (_platypusState === 'sitting' && _platypusWalkIv) setPlatypusState('walking'); }, 900 + Math.random() * 600);
      return;
    }
    if (Math.random() < 0.10) _platypusPauseNext = true;
    const margin = 60;
    const maxX = window.innerWidth - PLATYPUS_W - margin;
    const maxY = Math.min(220, window.innerHeight * 0.28);
    const tL = margin + Math.random() * (maxX - margin);
    const tB = PLATYPUS_BOTTOM + Math.random() * maxY;
    const dist = Math.abs(tL - _platypusGetLeft());
    _platypusMoveTo(tL, tB, Math.min(400 + dist * 1.5, 2200));
  };
  step();
  _platypusWalkIv = setInterval(step, 1700);
}

function showPlatypus() {
  if (!_platypusEl) initPlatypus();
  _platypusEl.classList.remove('platypus-hidden');
  _platypusGoHome(0);
  setPlatypusState('sitting');
  clearTimeout(_platypusSleepTmr);
  _platypusSleepTmr = setTimeout(() => { if (_platypusState === 'sitting') setPlatypusState('sleeping'); }, 4500);
}

function hidePlatypus() {
  if (!_platypusEl) return;
  _stopPlatypusWalking();
  _platypusEl.classList.add('platypus-hidden');
}

function setPlatypusHappy() {
  if (!_platypusEl || _platypusEl.classList.contains('platypus-hidden')) return;
  clearTimeout(_platypusSleepTmr);
  clearTimeout(_platypusHappyTmr);
  _stopPlatypusWalking();
  setPlatypusState('happy');
  _platypusHappyTmr = setTimeout(() => {
    _startPlatypusWalking();
    setTimeout(() => {
      if (!_platypusEl.classList.contains('platypus-hidden')) {
        _stopPlatypusWalking();
        _platypusGoHome(1200);
        setTimeout(() => {
          setPlatypusState('sitting');
          _platypusSleepTmr = setTimeout(() => { if (_platypusState === 'sitting') setPlatypusState('sleeping'); }, 4000);
        }, 1300);
      }
    }, 3500 + Math.random() * 1500);
  }, 1200);
}

function _onPlatypusClick() {
  clearTimeout(_platypusHappyTmr); clearTimeout(_platypusSleepTmr); _stopPlatypusWalking();
  setPlatypusState('happy'); _startPlatypusWalking();

  /* Limite monete: max 2 al giorno */
  const today = new Date().toISOString().slice(0, 10);
  const tapKey = 'sf_plat_tap_' + today;
  const taps = parseInt(localStorage.getItem(tapKey) || '0', 10);
  if (taps < 2 && typeof earnCoins === 'function') {
    earnCoins(1);
    localStorage.setItem(tapKey, taps + 1);
    if (typeof checkAchievements === 'function') checkAchievements();
    if (typeof showAnimalBubble === 'function')
      showAnimalBubble(['Bek bek! 🦆','Sono un platipus!','Nuoto veloce!','Trovato un verme!','Studia bene! 🌟'][Math.floor(Math.random()*5)]);
  } else {
    if (typeof showAnimalBubble === 'function')
      showAnimalBubble(taps === 0 ? 'Studia ancora! 📚' : 'Già dato oggi! 😄');
  }

  if (typeof checkAnimalMood === 'function') checkAnimalMood(false);
  _platypusHappyTmr = setTimeout(() => {
    if (_platypusState === 'happy') {
      _stopPlatypusWalking(); _platypusGoHome(0); setPlatypusState('sitting');
      _platypusSleepTmr = setTimeout(() => { if (_platypusState === 'sitting') setPlatypusState('sleeping'); }, 5000);
    }
  }, 3000);
}

function syncPlatypusToTimer(running, mode) {
  if (!_platypusEl || _platypusEl.classList.contains('platypus-hidden')) return;
  if (_platypusInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopPlatypusWalking(); _platypusGoHome(1000);
      clearTimeout(_platypusSleepTmr);
      _platypusSleepTmr = setTimeout(() => {
        setPlatypusState('sitting');
        _platypusSleepTmr = setTimeout(() => setPlatypusState('sleeping'), 2500);
      }, 1100);
    } else {
      _startPlatypusWalking();
    }
  } else {
    _stopPlatypusWalking(); _platypusGoHome(1200);
    clearTimeout(_platypusSleepTmr);
    _platypusSleepTmr = setTimeout(() => {
      if (_platypusState !== 'happy') setPlatypusState('sitting');
      _platypusSleepTmr = setTimeout(() => { if (_platypusState === 'sitting') setPlatypusState('sleeping'); }, 4000);
    }, 1350);
  }
}

/* Entrata/uscita giardino */
function platypusEnterGarden() {
  if (!_platypusEl || _platypusEl.classList.contains('platypus-hidden')) return;
  _stopPlatypusWalking();
  clearTimeout(_platypusSleepTmr);
  _platypusInGarden = true;
  setTimeout(() => {
    if (!_platypusInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    const SCALE   = 0.45;
    const GRASS_H = 100;
    const pad     = 14;
    const minL = rect.left  + pad;
    const maxL = rect.right - PLATYPUS_W * SCALE - pad;
    const minB = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
    const maxB = minB + 8;
    _platypusScale = SCALE;
    _platypusEl.style.transform = `translate(${_platypusX}px, ${-_platypusY}px) scale(${SCALE})`;
    _platypusEl.style.transformOrigin = 'left bottom';
    setPlatypusState('walking');
    const _gstep = () => {
      if (!_platypusInGarden) return;
      if (Math.random() < 0.18) {
        setPlatypusState('sitting');
        setTimeout(() => { if (_platypusInGarden) setPlatypusState('walking'); }, 1000 + Math.random() * 700);
        return;
      }
      const tL = minL + Math.random() * (maxL - minL);
      const tB = minB + Math.random() * (maxB - minB);
      const dist = Math.abs(tL - _platypusGetLeft());
      _platypusMoveTo(tL, tB, Math.min(500 + dist * 2.2, 2000));
    };
    _gstep();
    _platypusWalkIv = setInterval(_gstep, 1900 + Math.random() * 600);
  }, 900);
}

function platypusExitGarden() {
  if (!_platypusEl || _platypusEl.classList.contains('platypus-hidden')) return;
  if (!_platypusInGarden) return;
  _platypusInGarden = false;
  _platypusScale = 1;
  _platypusEl.style.transition = 'none';
  _platypusEl.style.transform = `translate(${_platypusX}px, ${-_platypusY}px)`;
  _platypusEl.style.transformOrigin = '';
  _stopPlatypusWalking();
  clearTimeout(_platypusSleepTmr);
  setPlatypusState('walking');
  setTimeout(() => {
    _platypusGoHome(1300);
    setTimeout(() => {
      if (_platypusInGarden) return;
      setPlatypusState('sitting');
      _platypusSleepTmr = setTimeout(() => { if (_platypusState === 'sitting') setPlatypusState('sleeping'); }, 4000);
    }, 1400);
  }, 100);
}
