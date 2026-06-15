/* =====================================================
   COMPANIONS.JS — Cagnolino e Falò
   ===================================================== */

/* ══════════════════════════
   CAGNOLINO — colori
   ══════════════════════════ */
const DOG_COLORS = {
  dogBrown:  { main:'#C8956C', dark:'#9B6B43', nose:'#1A0800', eye:'#2C1500' },
  dogGolden: { main:'#E8C97A', dark:'#C4A052', nose:'#2A1800', eye:'#3D2800' },
  dogBlack:  { main:'#252525', dark:'#121212', nose:'#111',    eye:'#C87820' },
  dogWhite:  { main:'#F0F0F0', dark:'#D0D0D0', nose:'#C8A4A4', eye:'#2C3E50' },
};

const DOG_W           = 110;
const DOG_RIGHT_HOME  = 150;
const DOG_BOTTOM_HOME = 24;

let _dogEl        = null;
let _dogHouseEl   = null;
let _dogState     = 'sleeping';
let _dogWalkIv    = null;
let _dogSleepTmr  = null;
let _dogHappyTmr  = null;
let _dogPauseNext = false;
let _dogInGarden  = false;

/* ─── SVG cagnolino di profilo (guarda a destra) ─── */
const DOG_SVG = `
<div class="dog-dir-wrap">
  <div class="dog-body-wrap">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="110" height="69" aria-label="Cagnolino">

      <!-- Coda — parte posteriore del corpo, curva verso l'alto -->
      <path class="dog-tail" d="M34,58 C18,52 10,36 16,18"
        fill="none" stroke="var(--dog-main,#C8956C)" stroke-width="7" stroke-linecap="round"/>

      <!-- Zampe posteriori dietro (più scure, disegnate prima del corpo) -->
      <line class="dog-lb1" x1="51" y1="72" x2="49" y2="91"
        stroke="var(--dog-dark,#9B6B43)" stroke-width="7" stroke-linecap="round" opacity="0.65"/>
      <ellipse class="dog-pb1" cx="49" cy="92" rx="7" ry="3"
        fill="var(--dog-dark,#9B6B43)" opacity="0.65"/>

      <!-- Zampe anteriori dietro (più scure) -->
      <line class="dog-lb2" x1="93" y1="72" x2="95" y2="91"
        stroke="var(--dog-dark,#9B6B43)" stroke-width="7" stroke-linecap="round" opacity="0.65"/>
      <ellipse class="dog-pb2" cx="95" cy="92" rx="7" ry="3"
        fill="var(--dog-dark,#9B6B43)" opacity="0.65"/>

      <!-- Corpo allungato -->
      <ellipse cx="80" cy="64" rx="48" ry="19" fill="var(--dog-main,#C8956C)"/>

      <!-- Zampe posteriori davanti -->
      <line class="dog-lf1" x1="55" y1="72" x2="53" y2="91"
        stroke="var(--dog-main,#C8956C)" stroke-width="7" stroke-linecap="round"/>
      <ellipse class="dog-pf1" cx="53" cy="92" rx="7" ry="3"
        fill="var(--dog-main,#C8956C)"/>

      <!-- Zampe anteriori davanti -->
      <line class="dog-lf2" x1="97" y1="72" x2="99" y2="91"
        stroke="var(--dog-main,#C8956C)" stroke-width="7" stroke-linecap="round"/>
      <ellipse class="dog-pf2" cx="99" cy="92" rx="7" ry="3"
        fill="var(--dog-main,#C8956C)"/>

      <!-- Testa -->
      <circle cx="118" cy="45" r="17" fill="var(--dog-main,#C8956C)"/>

      <!-- Orecchio flosco — pende dal lato posteriore della testa -->
      <ellipse cx="108" cy="56" rx="8" ry="15" fill="var(--dog-dark,#9B6B43)"
        transform="rotate(8 108 56)"/>

      <!-- Muso allungato -->
      <ellipse cx="135" cy="51" rx="12" ry="8" fill="var(--dog-main,#C8956C)"/>

      <!-- Naso rotondo scuro -->
      <circle cx="146" cy="49" r="4.5" fill="var(--dog-nose,#1A0800)"/>

      <!-- Bocca -->
      <path d="M134,56 Q138,60 142,56" fill="none"
        stroke="rgba(0,0,0,0.28)" stroke-width="1.5" stroke-linecap="round"/>

      <!-- Occhio aperto -->
      <g class="dog-eye-open">
        <circle cx="123" cy="40" r="5.5" fill="white" opacity="0.9"/>
        <circle cx="123" cy="40" r="4" fill="var(--dog-eye,#2C1500)"/>
        <circle cx="123" cy="40.5" r="2" fill="#080400"/>
        <circle cx="124.5" cy="38.5" r="1.5" fill="white"/>
      </g>
      <!-- Occhio chiuso (sleeping) -->
      <g class="dog-eye-closed" style="display:none">
        <path d="M119,40 Q123,35 127,40" fill="none"
          stroke="var(--dog-eye,#2C1500)" stroke-width="2.2" stroke-linecap="round"/>
      </g>

      <!-- ZZZ -->
      <g class="dog-zzz" style="display:none">
        <text x="148" y="34" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
        <text x="153" y="24" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
        <text x="158" y="13" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">Z</text>
      </g>

      <!-- Cuore (happy) -->
      <g class="dog-heart" style="display:none">
        <path d="M118,26 C118,26 110,18 104,23 C100,27 101,33 105,36 L118,47 L131,36 C135,33 136,27 132,23 C126,18 118,26 118,26Z"
          fill="#EC4899" opacity="0.9"/>
      </g>

    </svg>
  </div>
</div>`;

/* ──────────────────────────
   HOUSE HELPER
   ────────────────────────── */
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

/* ──────────────────────────
   INIT
   ────────────────────────── */
function initDog() {
  if (_dogEl) return;
  _dogEl           = document.createElement('div');
  _dogEl.className = 'dog-companion dog-hidden';
  _dogEl.innerHTML = DOG_SVG;
  _dogEl.title     = 'Clicca il cagnolino!';
  _dogEl.style.position = 'fixed';
  _dogEl.style.right    = DOG_RIGHT_HOME + 'px';
  _dogEl.style.bottom   = DOG_BOTTOM_HOME + 'px';
  _dogEl.style.left     = 'auto';
  _dogEl.style.zIndex   = '600';
  _dogEl.addEventListener('click', _onDogClick);
  document.body.appendChild(_dogEl);

  _dogHouseEl = _createGroundHouse(DOG_RIGHT_HOME, DOG_BOTTOM_HOME, '#C4A882');
  _dogHouseEl.classList.add('house-hidden');

  if (typeof coinData !== 'undefined' && coinData.shop) {
    ['dogGolden','dogBlack','dogWhite'].forEach(id => {
      if (coinData.shop[id] && coinData.activeEffects && coinData.activeEffects.activeDogColor === id) {
        _applyDogColor(id);
      }
    });
  }
}

/* ──────────────────────────
   MOSTRA / NASCONDI
   ────────────────────────── */
function _updateDogHouseVisibility() {
  if (!_dogHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.dogHouseVisible;
  if (!owned) { _dogHouseEl.classList.add('house-hidden'); return; }
  _dogHouseEl.classList.toggle('house-hidden', _dogInGarden || _dogState !== 'sleeping');
}
function showDogHouse() { _updateDogHouseVisibility(); }
function hideDogHouse() { if (_dogHouseEl) _dogHouseEl.classList.add('house-hidden'); }

function showDog() {
  if (!_dogEl) initDog();
  _dogEl.classList.remove('dog-hidden');
  _dogGoHome(0);
  setDogState('sitting');
  clearTimeout(_dogSleepTmr);
  _dogSleepTmr = setTimeout(() => { if (_dogState === 'sitting') setDogState('sleeping'); }, 4000);
}

function hideDog() {
  if (!_dogEl) return;
  _stopDogWalking();
  _dogEl.classList.add('dog-hidden');
  hideDogHouse();
}

/* ──────────────────────────
   STATO
   ────────────────────────── */
function setDogState(state) {
  if (!_dogEl) return;
  _dogState = state;
  _dogEl.classList.remove('dog-sleeping','dog-sitting','dog-walking','dog-happy');
  _dogEl.classList.add('dog-' + state);

  const eyeOpen   = _dogEl.querySelector('.dog-eye-open');
  const eyeClosed = _dogEl.querySelector('.dog-eye-closed');
  const zzz       = _dogEl.querySelector('.dog-zzz');
  const heart     = _dogEl.querySelector('.dog-heart');

  if (eyeOpen)   eyeOpen.style.display   = state === 'sleeping' ? 'none' : '';
  if (eyeClosed) eyeClosed.style.display = state === 'sleeping' ? '' : 'none';
  if (zzz)       zzz.style.display       = state === 'sleeping' ? '' : 'none';
  if (heart)     heart.style.display     = state === 'happy'    ? '' : 'none';

  _updateDogHouseVisibility();
}

/* ──────────────────────────
   POSIZIONE
   ────────────────────────── */
function _dogGetLeft() {
  return _dogEl.getBoundingClientRect().left;
}
function _dogGetBottom() {
  const r = _dogEl.getBoundingClientRect();
  return window.innerHeight - r.bottom;
}

function _dogMoveTo(targetLeft, targetBottom, durationMs) {
  const curLeft   = _dogGetLeft();
  const curBottom = _dogGetBottom();
  const goLeft    = targetLeft < curLeft;

  _dogEl.style.transition = 'none';
  _dogEl.style.right      = 'auto';
  _dogEl.style.left       = curLeft + 'px';
  _dogEl.style.bottom     = curBottom + 'px';
  void _dogEl.offsetWidth;

  _dogEl.style.transition = `left ${durationMs}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(durationMs*0.75)}ms ease-in-out`;
  _dogEl.style.left   = targetLeft + 'px';
  _dogEl.style.bottom = targetBottom + 'px';

  const dir = _dogEl.querySelector('.dog-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _dogGoHome(durationMs) {
  const homeLeft = window.innerWidth - DOG_W - DOG_RIGHT_HOME;
  if (durationMs > 0) {
    _dogMoveTo(homeLeft, DOG_BOTTOM_HOME, durationMs);
    setTimeout(() => {
      if (!_dogEl) return;
      _dogEl.style.transition = 'none';
      _dogEl.style.left       = 'auto';
      _dogEl.style.right      = DOG_RIGHT_HOME + 'px';
      _dogEl.style.bottom     = DOG_BOTTOM_HOME + 'px';
    }, durationMs + 80);
  } else {
    _dogEl.style.transition = 'none';
    _dogEl.style.right      = DOG_RIGHT_HOME + 'px';
    _dogEl.style.left       = 'auto';
    _dogEl.style.bottom     = DOG_BOTTOM_HOME + 'px';
  }
}

/* ──────────────────────────
   CAMMINA
   ────────────────────────── */
function _startDogWalking() {
  clearInterval(_dogWalkIv);
  clearTimeout(_dogSleepTmr);
  _dogPauseNext = false;
  setDogState('walking');

  const step = () => {
    if (_dogPauseNext) {
      _dogPauseNext = false;
      setDogState('sitting');
      setTimeout(() => { if (_dogState === 'sitting' && _dogWalkIv) setDogState('walking'); }, 900 + Math.random()*600);
      return;
    }
    if (Math.random() < 0.10) _dogPauseNext = true;

    const margin  = 60;
    const maxX    = window.innerWidth - DOG_W - margin;
    const maxY    = Math.min(220, window.innerHeight * 0.28);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetB = DOG_BOTTOM_HOME + Math.random() * maxY;
    const dist    = Math.abs(targetL - _dogGetLeft());
    const dur     = 400 + dist * 1.5;
    _dogMoveTo(targetL, targetB, Math.min(dur, 2200));
  };

  step();
  _dogWalkIv = setInterval(step, 1600);
}

function _stopDogWalking() {
  clearInterval(_dogWalkIv);
  clearTimeout(_dogSleepTmr);
  _dogWalkIv = null;
}

/* ──────────────────────────
   SYNC COL TIMER
   ────────────────────────── */
/* ──────────────────────────
   GARDEN ENTER / EXIT
   ────────────────────────── */
function dogEnterGarden() {
  if (!_dogEl || _dogEl.classList.contains('dog-hidden')) return;
  _dogInGarden = true;
  _stopDogWalking();
  clearTimeout(_dogSleepTmr);
  setTimeout(() => {
    if (!_dogInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _dogEl.style.transform = 'scale(0.45)';
    _dogEl.style.transformOrigin = 'left bottom';
    _startGardenWalkDog(rect);
  }, 560);
}

function _startGardenWalkDog(rect) {
  const SCALE = 0.45;
  const pad   = 14;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - DOG_W * SCALE - pad;
  const minB  = window.innerHeight - rect.bottom + 4;
  const maxB  = minB + rect.height * 0.38;

  let _dogBusy = false;
  setDogState('walking');
  const _gstep = () => {
    if (!_dogInGarden || _dogBusy) return;

    if (Math.random() < 0.22) {
      const ballRect = gardenFindItem('ball');
      if (ballRect && ballRect.width > 0) {
        _dogBusy = true;
        const tL = ballRect.left + ballRect.width / 2 - DOG_W * SCALE / 2;
        const tB = window.innerHeight - ballRect.bottom;
        const dist = Math.abs(tL - _dogGetLeft());
        const moveDur = Math.min(500 + dist * 2.0, 2000);
        setDogState('walking');
        _dogMoveTo(tL, tB, moveDur);
        clearTimeout(_dogSleepTmr);
        _dogSleepTmr = setTimeout(() => {
          if (!_dogInGarden) { _dogBusy = false; return; }
          setDogState('happy');
          _dogSleepTmr = setTimeout(() => {
            _dogBusy = false;
            if (!_dogInGarden) return;
            setDogState('walking');
          }, 2200);
        }, moveDur + 100);
        return;
      }
    }

    if (Math.random() < 0.18) {
      setDogState('sitting');
      setTimeout(() => { if (_dogInGarden) setDogState('walking'); }, 1000 + Math.random()*700);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _dogGetLeft());
    _dogMoveTo(tL, tB, Math.min(500 + dist * 2.0, 2200));
  };
  _gstep();
  _dogWalkIv = setInterval(_gstep, 1900 + Math.random()*600);
}

function dogExitGarden() {
  if (!_dogEl || _dogEl.classList.contains('dog-hidden')) return;
  if (!_dogInGarden) return;
  _dogInGarden = false;
  _dogEl.style.transform = '';
  _dogEl.style.transformOrigin = '';
  _stopDogWalking();
  clearTimeout(_dogSleepTmr);
  setDogState('walking');
  setTimeout(() => {
    _dogGoHome(1200);
    setTimeout(() => {
      if (_dogInGarden) return;
      setDogState('sitting');
      _dogSleepTmr = setTimeout(() => { if (_dogState === 'sitting') setDogState('sleeping'); }, 3500);
    }, 1300);
  }, 150);
}

function syncDogToTimer(running, mode) {
  if (!_dogEl || _dogEl.classList.contains('dog-hidden')) return;
  if (_dogInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopDogWalking();
      _dogGoHome(1000);
      clearTimeout(_dogSleepTmr);
      _dogSleepTmr = setTimeout(() => {
        setDogState('sitting');
        _dogSleepTmr = setTimeout(() => setDogState('sleeping'), 2500);
      }, 1100);
    } else {
      _startDogWalking();
    }
  } else {
    _stopDogWalking();
    _dogGoHome(1200);
    clearTimeout(_dogSleepTmr);
    _dogSleepTmr = setTimeout(() => {
      if (_dogState !== 'happy') setDogState('sitting');
      _dogSleepTmr = setTimeout(() => { if (_dogState === 'sitting') setDogState('sleeping'); }, 4000);
    }, 1350);
  }
}

/* ──────────────────────────
   AZIONI / CLICK
   ────────────────────────── */
function _onDogClick() {
  clearTimeout(_dogHappyTmr);
  _stopDogWalking();
  setDogState('happy');
  if (typeof celebrate === 'function') celebrate(8);
  _dogHappyTmr = setTimeout(() => {
    setDogState('sitting');
    _dogSleepTmr = setTimeout(() => { if (_dogState === 'sitting') setDogState('sleeping'); }, 4000);
  }, 4000);
}

/* ──────────────────────────
   COLORI CAGNOLINO
   ────────────────────────── */
function _applyDogColor(id) {
  if (!_dogEl) return;
  const c = DOG_COLORS[id] || DOG_COLORS.dogBrown;
  _dogEl.style.setProperty('--dog-main', c.main);
  _dogEl.style.setProperty('--dog-dark', c.dark);
  _dogEl.style.setProperty('--dog-nose', c.nose);
  _dogEl.style.setProperty('--dog-eye',  c.eye);
}

function setDogColor(id) {
  if (!_dogEl) return;
  _applyDogColor(id);
  if (typeof coinData !== 'undefined' && coinData.activeEffects) {
    coinData.activeEffects.activeDogColor = id;
    if (typeof saveCoinData === 'function') saveCoinData();
  }
}

/* ══════════════════════════
   FALÒ
   ══════════════════════════ */
let _campfireEl = null;

const CAMPFIRE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" width="70" height="90"
  style="overflow:visible" aria-label="Falò">

  <!-- Scintille che si alzano -->
  <circle class="cf-spark cf-spark1" cx="28" cy="60" r="2.5" fill="#FF8C00"/>
  <circle class="cf-spark cf-spark2" cx="44" cy="56" r="1.8" fill="#FFD700"/>
  <circle class="cf-spark cf-spark3" cx="22" cy="62" r="2"   fill="#FF6B1A"/>

  <!-- Fiamma esterna (rosso-arancio) -->
  <path class="cf-flame-outer"
    d="M35,72 C19,66 12,52 14,36 C16,22 24,12 35,4 C46,12 54,22 56,36 C58,52 51,66 35,72Z"
    fill="#E03000" opacity="0.76"/>

  <!-- Fiamma centrale (arancio) -->
  <path class="cf-flame-mid"
    d="M35,72 C23,68 17,56 19,43 C21,31 28,22 35,15 C42,22 49,31 51,43 C53,56 47,68 35,72Z"
    fill="#FF7A00" opacity="0.85"/>

  <!-- Fiamma interna (giallo brillante) -->
  <path class="cf-flame-inner"
    d="M35,72 C27,69 23,60 25,50 C27,41 31,33 35,27 C39,33 43,41 45,50 C47,60 43,69 35,72Z"
    fill="#FFD700" opacity="0.92"/>

  <!-- Ciocchi incrociati -->
  <rect x="7"  y="72" width="28" height="10" rx="5" fill="#5D4037"
    transform="rotate(-20 21 77)"/>
  <rect x="35" y="72" width="28" height="10" rx="5" fill="#4E342E"
    transform="rotate(20 49 77)"/>

  <!-- Brace incandescente -->
  <ellipse cx="35" cy="80" rx="17" ry="4.5" fill="#FF5000" opacity="0.28"/>

</svg>`;

function initCampfire() {
  if (_campfireEl) return;
  _campfireEl           = document.createElement('div');
  _campfireEl.className = 'campfire-wrap campfire-hidden';
  _campfireEl.innerHTML = CAMPFIRE_SVG;
  _campfireEl.style.cssText =
    'position:fixed;bottom:20px;left:80px;z-index:598;pointer-events:none;' +
    'filter:drop-shadow(0 0 14px rgba(255,120,0,0.55))';
  document.body.appendChild(_campfireEl);
}

function showCampfire() {
  if (!_campfireEl) initCampfire();
  _campfireEl.classList.remove('campfire-hidden');
}

function hideCampfire() {
  if (!_campfireEl) return;
  _campfireEl.classList.add('campfire-hidden');
}
