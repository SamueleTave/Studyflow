/* =====================================================
   RABBIT.JS — Coniglietto animato
   States: sleeping | sitting | hopping | happy
   ===================================================== */

const RABBIT_W      = 62;
const RABBIT_BOTTOM = 24;
const RABBIT_RIGHT  = 282;

let _rabbitEl       = null;
let _rabbitHouseEl  = null;
let _rabbitState    = 'sitting';
let _rabbitWalkIv   = null;
let _rabbitSleepTmr = null;
let _rabbitInGarden = false;

const RABBIT_SVG = `
<div class="rabbit-dir-wrap">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -12 80 122" width="${RABBIT_W}" height="${Math.round(RABBIT_W*122/80)}" aria-label="Coniglietto">
  <!-- Coda soffice -->
  <circle cx="26" cy="83" r="10" fill="white" opacity="0.95"/>
  <circle cx="26" cy="83" r="7"  fill="var(--rabbit-shadow, #F0ECEA)" opacity="0.8"/>
  <!-- Corpo -->
  <ellipse cx="50" cy="82" rx="24" ry="22" fill="var(--rabbit-main, #F5F0EC)"/>
  <!-- Testa -->
  <circle cx="50" cy="48" r="19" fill="var(--rabbit-main, #F5F0EC)"/>
  <!-- Orecchie -->
  <ellipse cx="37" cy="17" rx="7"   ry="22" fill="var(--rabbit-shadow, #F0ECEA)"/>
  <ellipse cx="37" cy="17" rx="4.5" ry="19" fill="var(--rabbit-ear, #F4B8CB)"/>
  <ellipse cx="59" cy="15" rx="7"   ry="22" fill="var(--rabbit-shadow, #F0ECEA)"/>
  <ellipse cx="59" cy="15" rx="4.5" ry="19" fill="var(--rabbit-ear, #F4B8CB)"/>
  <!-- Occhi aperti -->
  <g class="rabbit-eyes-open">
    <circle cx="42" cy="47" r="5"   fill="#2C3E50"/>
    <circle cx="43.8" cy="45" r="1.7" fill="white"/>
    <circle cx="58" cy="47" r="5"   fill="#2C3E50"/>
    <circle cx="59.8" cy="45" r="1.7" fill="white"/>
  </g>
  <!-- Occhi chiusi -->
  <g class="rabbit-eyes-closed" style="display:none">
    <path d="M38,47 Q42,42 46,47" fill="none" stroke="#2C3E50" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M54,47 Q58,42 62,47" fill="none" stroke="#2C3E50" stroke-width="2.2" stroke-linecap="round"/>
  </g>
  <!-- Naso -->
  <ellipse cx="50" cy="55" rx="3.5" ry="2.5" fill="#FF9AB3"/>
  <!-- Bocca -->
  <path d="M47,58 Q50,62 53,58" fill="none" stroke="#D4A0B0" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Baffi -->
  <line x1="47" y1="55" x2="27" y2="51" stroke="#CCC" stroke-width="1.1" stroke-linecap="round"/>
  <line x1="47" y1="58" x2="25" y2="58" stroke="#CCC" stroke-width="1.1" stroke-linecap="round"/>
  <line x1="53" y1="55" x2="73" y2="51" stroke="#CCC" stroke-width="1.1" stroke-linecap="round"/>
  <line x1="53" y1="58" x2="75" y2="58" stroke="#CCC" stroke-width="1.1" stroke-linecap="round"/>
  <!-- Zampe anteriori -->
  <ellipse cx="38" cy="101" rx="11" ry="6" fill="var(--rabbit-shadow, #EDE8E4)"/>
  <ellipse cx="62" cy="101" rx="11" ry="6" fill="var(--rabbit-shadow, #EDE8E4)"/>
  <!-- ZZZ -->
  <g class="rabbit-zzz" style="display:none">
    <text x="68" y="38" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
    <text x="74" y="29" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
    <text x="80" y="19" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">Z</text>
  </g>
  <!-- Cuore -->
  <g class="rabbit-heart" style="display:none">
    <path d="M50,27 C50,27 42,20 37,25 C34,29 35,35 39,38 L50,47 L61,38 C65,35 66,29 63,25 C58,20 50,27 50,27Z" fill="#EC4899" opacity="0.9"/>
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
function initRabbit() {
  if (_rabbitEl) return;
  _rabbitEl = document.createElement('div');
  _rabbitEl.className = 'rabbit-companion rabbit-hidden';
  _rabbitEl.innerHTML = RABBIT_SVG;
  _rabbitEl.style.cssText = `position:fixed;right:${RABBIT_RIGHT}px;bottom:${RABBIT_BOTTOM}px;left:auto;z-index:600;cursor:pointer;`;
  _rabbitEl.addEventListener('click', _onRabbitClick);
  (document.querySelector('.app') || document.body).appendChild(_rabbitEl);

  _rabbitHouseEl = _createGroundHouse(RABBIT_RIGHT, RABBIT_BOTTOM, '#E8E0D8');
  _rabbitHouseEl.classList.add('house-hidden');
}

function _rShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

/* ══════════════════════════
   STATI
   ══════════════════════════ */
function setRabbitState(state) {
  if (!_rabbitEl) return;
  _rabbitState = state;
  _rabbitEl.classList.remove('rabbit-sleeping','rabbit-sitting','rabbit-hopping','rabbit-happy');
  _rabbitEl.classList.add('rabbit-' + state);

  const eyesOpen   = _rabbitEl.querySelector('.rabbit-eyes-open');
  const eyesClosed = _rabbitEl.querySelector('.rabbit-eyes-closed');
  const zzz        = _rabbitEl.querySelector('.rabbit-zzz');
  const heart      = _rabbitEl.querySelector('.rabbit-heart');

  _rShow(eyesOpen,   state !== 'sleeping');
  _rShow(eyesClosed, state === 'sleeping');
  _rShow(zzz,        state === 'sleeping');
  _rShow(heart,      state === 'happy');

  _updateRabbitHouseVisibility();
}

function _updateRabbitHouseVisibility() {
  if (!_rabbitHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.rabbitHouseVisible;
  if (!owned) { _rabbitHouseEl.classList.add('house-hidden'); return; }
  _rabbitHouseEl.classList.toggle('house-hidden', _rabbitInGarden || _rabbitState !== 'sleeping');
}
function showRabbitHouse() { _updateRabbitHouseVisibility(); }
function hideRabbitHouse() { if (_rabbitHouseEl) _rabbitHouseEl.classList.add('house-hidden'); }

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showRabbit() {
  if (!_rabbitEl) initRabbit();
  _rabbitEl.classList.remove('rabbit-hidden');
  _goRabbitHome(0);
  setRabbitState('sitting');
  clearTimeout(_rabbitSleepTmr);
  _rabbitSleepTmr = setTimeout(() => { if (_rabbitState === 'sitting') setRabbitState('sleeping'); }, 5000);
}

function hideRabbit() {
  if (!_rabbitEl) return;
  _stopRabbit();
  _rabbitEl.classList.add('rabbit-hidden');
  hideRabbitHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _getRabbitLeft() { return _rabbitEl.getBoundingClientRect().left; }
function _getRabbitBottom() {
  const r = _rabbitEl.getBoundingClientRect();
  return window.innerHeight - r.bottom;
}

function _moveRabbitTo(targetLeft, targetBottom, durationMs) {
  const curLeft   = _getRabbitLeft();
  const curBottom = _getRabbitBottom();
  const goLeft    = targetLeft < curLeft;

  _rabbitEl.style.transition = 'none';
  _rabbitEl.style.right  = 'auto';
  _rabbitEl.style.left   = curLeft + 'px';
  _rabbitEl.style.bottom = curBottom + 'px';
  void _rabbitEl.offsetWidth;

  _rabbitEl.style.transition = `left ${durationMs}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(durationMs*0.8)}ms ease-in-out`;
  _rabbitEl.style.left   = targetLeft + 'px';
  _rabbitEl.style.bottom = targetBottom + 'px';

  const dir = _rabbitEl.querySelector('.rabbit-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.15s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _goRabbitHome(ms = 1200) {
  const homeLeft = window.innerWidth - RABBIT_W - RABBIT_RIGHT;
  if (ms > 0) {
    _moveRabbitTo(homeLeft, RABBIT_BOTTOM, ms);
    setTimeout(() => {
      if (!_rabbitEl) return;
      _rabbitEl.style.transition = 'none';
      _rabbitEl.style.left   = 'auto';
      _rabbitEl.style.right  = RABBIT_RIGHT + 'px';
      _rabbitEl.style.bottom = RABBIT_BOTTOM + 'px';
    }, ms + 80);
  } else {
    _rabbitEl.style.transition = 'none';
    _rabbitEl.style.right  = RABBIT_RIGHT + 'px';
    _rabbitEl.style.left   = 'auto';
    _rabbitEl.style.bottom = RABBIT_BOTTOM + 'px';
  }
}

/* ══════════════════════════
   SALTA
   ══════════════════════════ */
function _startRabbit() {
  clearInterval(_rabbitWalkIv);
  clearTimeout(_rabbitSleepTmr);
  setRabbitState('hopping');

  const _hop = () => {
    if (Math.random() < 0.15) {
      setRabbitState('sitting');
      setTimeout(() => { if (_rabbitState === 'sitting' && _rabbitWalkIv) setRabbitState('hopping'); }, 800 + Math.random() * 700);
      return;
    }
    const margin  = 50;
    const maxX    = window.innerWidth  - RABBIT_W - margin;
    const maxY    = Math.min(140, window.innerHeight * 0.18);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetB = RABBIT_BOTTOM + Math.random() * maxY;
    const dist    = Math.abs(targetL - _getRabbitLeft());
    _moveRabbitTo(targetL, targetB, 320 + dist * 1.2);
  };

  _hop();
  _rabbitWalkIv = setInterval(_hop, 1400);
}

function _stopRabbit() {
  clearInterval(_rabbitWalkIv);
  clearTimeout(_rabbitSleepTmr);
  _rabbitWalkIv = null;
}

/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function rabbitEnterGarden() {
  if (!_rabbitEl || _rabbitEl.classList.contains('rabbit-hidden')) return;
  _rabbitInGarden = true;
  _stopRabbit();
  clearTimeout(_rabbitSleepTmr);
  setTimeout(() => {
    if (!_rabbitInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _rabbitEl.style.transform = 'scale(0.45)';
    _rabbitEl.style.transformOrigin = 'left bottom';
    _startGardenWalkRabbit(rect);
  }, 900);
}

function _startGardenWalkRabbit(rect) {
  const SCALE   = 0.45;
  const pad     = 14;
  const GRASS_H = 100;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - RABBIT_W * SCALE - pad;
  const minB  = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
  const maxB  = minB + 8;

  let _rabbitBusy = false;
  setRabbitState('hopping');
  const _gstep = () => {
    if (!_rabbitInGarden || _rabbitBusy) return;

    if (Math.random() < 0.22) {
      const benchRect = gardenFindItem('bench');
      if (benchRect && benchRect.width > 0) {
        _rabbitBusy = true;
        const tL = benchRect.left + benchRect.width / 2 - RABBIT_W * SCALE / 2;
        const tB = window.innerHeight - benchRect.bottom;
        const dist = Math.abs(tL - _getRabbitLeft());
        const moveDur = Math.min(400 + dist * 1.5, 1800);
        setRabbitState('hopping');
        _moveRabbitTo(tL, tB, moveDur);
        clearTimeout(_rabbitSleepTmr);
        _rabbitSleepTmr = setTimeout(() => {
          if (!_rabbitInGarden) { _rabbitBusy = false; return; }
          setRabbitState('sitting');
          _rabbitSleepTmr = setTimeout(() => {
            _rabbitBusy = false;
            if (!_rabbitInGarden) return;
            setRabbitState('hopping');
          }, 3000 + Math.random() * 2000);
        }, moveDur + 80);
        return;
      }
    }

    if (Math.random() < 0.18) {
      setRabbitState('sitting');
      setTimeout(() => { if (_rabbitInGarden) setRabbitState('hopping'); }, 1000 + Math.random() * 700);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _getRabbitLeft());
    _moveRabbitTo(tL, tB, Math.min(400 + dist * 1.5, 2000));
  };
  _gstep();
  _rabbitWalkIv = setInterval(_gstep, 1700 + Math.random() * 600);
}

function rabbitExitGarden() {
  if (!_rabbitEl || _rabbitEl.classList.contains('rabbit-hidden')) return;
  if (!_rabbitInGarden) return;
  _rabbitInGarden = false;
  _rabbitEl.style.transform = '';
  _rabbitEl.style.transformOrigin = '';
  _stopRabbit();
  setRabbitState('hopping');
  setTimeout(() => {
    _goRabbitHome(1200);
    setTimeout(() => {
      if (_rabbitInGarden) return;
      setRabbitState('sitting');
      _rabbitSleepTmr = setTimeout(() => { if (_rabbitState === 'sitting') setRabbitState('sleeping'); }, 4000);
    }, 1300);
  }, 150);
}

/* ══════════════════════════
   SYNC TIMER
   ══════════════════════════ */
function syncRabbitToTimer(running, mode) {
  if (!_rabbitEl || _rabbitEl.classList.contains('rabbit-hidden')) return;
  if (_rabbitInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      _stopRabbit();
      _goRabbitHome(900);
      setTimeout(() => { if (!_rabbitInGarden) setRabbitState('sleeping'); }, 1000);
    } else {
      _startRabbit();
    }
  } else {
    _stopRabbit();
    _goRabbitHome(900);
    setTimeout(() => {
      if (_rabbitInGarden) return;
      if (_rabbitState !== 'happy') setRabbitState('sitting');
      _rabbitSleepTmr = setTimeout(() => { if (_rabbitState === 'sitting') setRabbitState('sleeping'); }, 5000);
    }, 1000);
  }
}

function setRabbitHappy() {
  setRabbitState('happy');
  clearTimeout(_rabbitSleepTmr);
  setTimeout(() => { if (_rabbitState === 'happy') setRabbitState('sitting'); }, 2500);
}

function _onRabbitClick() {
  if (_rabbitState === 'sleeping') { setRabbitState('sitting'); return; }
  setRabbitState('happy');
  setTimeout(() => { if (_rabbitState === 'happy') setRabbitState('sitting'); }, 2000);
}

/* ══════════════════════════
   COLORI
   ══════════════════════════ */
const RABBIT_COLORS = {
  rabbitBrown: { main:'#C4813A', shadow:'#A06628', ear:'#D4956B' },
  rabbitGrey:  { main:'#9E9E9E', shadow:'#757575', ear:'#BDBDBD' },
  rabbitBlack: { main:'#333333', shadow:'#1A1A1A', ear:'#555555' },
};

function setRabbitColor(id) {
  if (!_rabbitEl) return;
  if (!id) {
    _rabbitEl.style.removeProperty('--rabbit-main');
    _rabbitEl.style.removeProperty('--rabbit-shadow');
    _rabbitEl.style.removeProperty('--rabbit-ear');
  } else {
    const c = RABBIT_COLORS[id];
    if (c) {
      _rabbitEl.style.setProperty('--rabbit-main',   c.main);
      _rabbitEl.style.setProperty('--rabbit-shadow', c.shadow);
      _rabbitEl.style.setProperty('--rabbit-ear',    c.ear);
    }
  }
  if (typeof coinData !== 'undefined' && coinData.activeEffects) {
    coinData.activeEffects.activeRabbitColor = id || '';
    if (typeof saveCoinData === 'function') saveCoinData();
  }
}
