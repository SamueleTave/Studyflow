/* =====================================================
   DRAGON.JS — Drago animato (walking + wings when happy)
   States: sleeping | sitting | walking | happy
   ===================================================== */

const DRAGON_W      = 92;
const DRAGON_BOTTOM = 24;
const DRAGON_RIGHT  = 800;

let _dragonEl        = null;
let _dragonHouseEl   = null;
let _dragonState     = 'sitting';
let _dragonWalkIv    = null;
let _dragonSleepTmr  = null;
let _dragonHappyTmr  = null;
let _dragonPauseNext = false;
let _dragonInGarden  = false;

const DRAGON_SVG = `
<div class="dragon-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${DRAGON_W}" height="${Math.round(DRAGON_W*1.167)}" aria-label="Drago">
    <ellipse cx="60" cy="136" rx="30" ry="5" fill="rgba(0,0,0,0.12)"/>
    <path d="M82,95 C100,85 108,68 103,55 C99,45 90,48 90,58 C90,68 88,80 82,92Z" fill="#7C3AED" stroke="#1a0a2e" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="103,53 111,42 96,43" fill="#A78BFA" stroke="#1a0a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <g class="dragon-wing-l">
      <path d="M34,75 C16,58 10,36 18,18 C24,8 35,12 34,28 C33,44 34,62 34,75Z" fill="#6D28D9" stroke="#1a0a2e" stroke-width="3" stroke-linejoin="round"/>
      <path d="M34,75 C20,62 16,42 22,22" fill="none" stroke="#4C1D95" stroke-width="1.5" opacity="0.6"/>
      <path d="M34,75 C26,62 24,46 28,28" fill="none" stroke="#4C1D95" stroke-width="1.2" opacity="0.5"/>
    </g>
    <g class="dragon-wing-r">
      <path d="M86,75 C104,58 110,36 102,18 C96,8 85,12 86,28 C87,44 86,62 86,75Z" fill="#6D28D9" stroke="#1a0a2e" stroke-width="3" stroke-linejoin="round"/>
      <path d="M86,75 C100,62 104,42 98,22" fill="none" stroke="#4C1D95" stroke-width="1.5" opacity="0.6"/>
    </g>
    <circle cx="60" cy="96" r="34" fill="#7C3AED" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="60" cy="100" rx="20" ry="22" fill="#C4B5FD" stroke="#1a0a2e" stroke-width="2"/>
    <g class="dragon-paw-l">
      <ellipse cx="42" cy="126" rx="13" ry="9" fill="#6D28D9" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="35" y1="131" x2="32" y2="136" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="42" y1="133" x2="42" y2="138" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="49" y1="131" x2="52" y2="136" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <g class="dragon-paw-r">
      <ellipse cx="78" cy="126" rx="13" ry="9" fill="#6D28D9" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="71" y1="131" x2="68" y2="136" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="78" y1="133" x2="78" y2="138" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="85" y1="131" x2="88" y2="136" stroke="#1a0a2e" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <circle cx="60" cy="54" r="36" fill="#7C3AED" stroke="#1a0a2e" stroke-width="3.5"/>
    <path d="M42,26 C36,14 34,6 38,2 C42,8 44,18 44,26Z" fill="#5B21B6" stroke="#1a0a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M78,26 C84,14 86,6 82,2 C78,8 76,18 76,26Z" fill="#5B21B6" stroke="#1a0a2e" stroke-width="2.5" stroke-linejoin="round"/>
    <g class="dragon-eye-open">
      <circle cx="43" cy="54" r="14" fill="white" stroke="#1a0a2e" stroke-width="3"/>
      <circle cx="43" cy="55" r="9" fill="#0D9488"/><circle cx="43" cy="55" r="5.5" fill="#1a0a2e"/><circle cx="46" cy="51" r="3" fill="white"/><circle cx="41" cy="58" r="1.2" fill="white" opacity="0.7"/>
      <circle cx="77" cy="54" r="14" fill="white" stroke="#1a0a2e" stroke-width="3"/>
      <circle cx="77" cy="55" r="9" fill="#0D9488"/><circle cx="77" cy="55" r="5.5" fill="#1a0a2e"/><circle cx="80" cy="51" r="3" fill="white"/><circle cx="75" cy="58" r="1.2" fill="white" opacity="0.7"/>
    </g>
    <g class="dragon-eye-closed" style="display:none">
      <path d="M29,55 Q43,44 57,55" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M63,55 Q77,44 91,55" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <circle cx="28" cy="64" r="8" fill="#F472B6" opacity="0.55"/>
    <circle cx="92" cy="64" r="8" fill="#F472B6" opacity="0.55"/>
    <ellipse cx="54" cy="70" rx="3.5" ry="2.5" fill="#4C1D95" opacity="0.7"/>
    <ellipse cx="66" cy="70" rx="3.5" ry="2.5" fill="#4C1D95" opacity="0.7"/>
    <path d="M48,76 Q60,86 72,76" fill="none" stroke="#1a0a2e" stroke-width="3" stroke-linecap="round"/>
    <rect x="57" y="76" width="6" height="7" rx="2" fill="white" stroke="#1a0a2e" stroke-width="1.5"/>
    <path d="M26,90 Q18,96 20,104 Q26,106 28,100 Q30,94 30,90Z" fill="#6D28D9" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M94,90 Q102,96 100,104 Q94,106 92,100 Q90,94 90,90Z" fill="#6D28D9" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <g class="dragon-zzz" style="display:none">
      <text x="90" y="18" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
      <text x="102" y="5" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="17">z</text>
    </g>
    <g class="dragon-heart" style="display:none">
      <path d="M55,16 C52,6 56,0 60,0 C64,0 68,6 65,16 C63,22 60,28 60,28 C60,28 57,22 55,16Z" fill="#FF6B00" opacity="0.9"/>
      <path d="M58,18 C56,10 59,5 60,5 C61,5 64,10 62,18" fill="#FFD700" opacity="0.8"/>
    </g>
  </svg>
</div>
`;

function _createDragonCave(rightPx, bottomPx) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-10}px;bottom:${bottomPx-2}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 80 58" width="80" height="58">
    <ellipse cx="40" cy="52" rx="36" ry="8" fill="#3B0764" opacity="0.8"/>
    <ellipse cx="40" cy="38" rx="34" ry="24" fill="#4C1D95"/>
    <ellipse cx="40" cy="42" rx="22" ry="16" fill="#2E1065"/>
    <ellipse cx="40" cy="50" rx="14" ry="10" fill="#1a0a2e"/>
    <path d="M20,20 L14,6 L26,12Z" fill="#6D28D9" opacity="0.7"/>
    <path d="M60,20 L66,6 L54,12Z" fill="#6D28D9" opacity="0.7"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

function _dShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

function initDragon() {
  if (_dragonEl) return;
  _dragonEl           = document.createElement('div');
  _dragonEl.className = 'dragon-companion dragon-hidden';
  _dragonEl.innerHTML = DRAGON_SVG;
  _dragonEl.title     = 'Clicca il drago!';
  _dragonEl.style.cssText = `position:fixed;right:${_companionSlotRight('dragon')}px;bottom:${DRAGON_BOTTOM}px;left:auto;z-index:600;cursor:pointer;`;
  _dragonEl.addEventListener('click', _onDragonClick);
  (document.querySelector('.app') || document.body).appendChild(_dragonEl);
  _dragonHouseEl = _createDragonCave(DRAGON_RIGHT, DRAGON_BOTTOM);
  _dragonHouseEl.classList.add('house-hidden');
}

function setDragonState(state) {
  if (!_dragonEl) return;
  _dragonState = state;
  _dragonEl.classList.remove('dragon-sleeping','dragon-sitting','dragon-walking','dragon-happy');
  _dragonEl.classList.add('dragon-' + state);
  const eyeOpen   = _dragonEl.querySelector('.dragon-eye-open');
  const eyeClosed = _dragonEl.querySelector('.dragon-eye-closed');
  const zzz       = _dragonEl.querySelector('.dragon-zzz');
  const heart     = _dragonEl.querySelector('.dragon-heart');
  _dShow(eyeOpen,   state !== 'sleeping');
  _dShow(eyeClosed, state === 'sleeping');
  _dShow(zzz,       state === 'sleeping');
  _dShow(heart,     state === 'happy');
  _updateDragonHouseVisibility();
}

function _updateDragonHouseVisibility() {
  if (!_dragonHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.dragonHouseVisible;
  if (!owned) { _dragonHouseEl.classList.add('house-hidden'); return; }
  _dragonHouseEl.classList.toggle('house-hidden', _dragonInGarden || _dragonState !== 'sleeping');
}
function showDragonHouse() { _updateDragonHouseVisibility(); }
function hideDragonHouse() { if (_dragonHouseEl) _dragonHouseEl.classList.add('house-hidden'); }

function _dragonGetLeft() {
  if (_dragonEl.style.left && _dragonEl.style.left !== 'auto') return parseFloat(_dragonEl.style.left);
  return window.innerWidth - DRAGON_W - parseFloat(_dragonEl.style.right || _companionSlotRight('dragon'));
}
function _dragonMoveTo(tL, tB, dur) {
  const cL = _dragonGetLeft(); const goLeft = tL < cL;
  _dragonEl.style.transition = 'none'; _dragonEl.style.right = 'auto'; _dragonEl.style.left = cL + 'px'; _dragonEl.style.bottom = (parseFloat(_dragonEl.style.bottom)||DRAGON_BOTTOM) + 'px';
  void _dragonEl.offsetWidth;
  _dragonEl.style.transition = `left ${dur}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(dur*0.75)}ms ease-in-out`;
  _dragonEl.style.left = tL + 'px'; _dragonEl.style.bottom = tB + 'px';
  const dir = _dragonEl.querySelector('.dragon-dir-wrap');
  if (dir) { dir.style.transition = 'transform 0.18s ease'; dir.style.transform = `scaleX(${goLeft ? -1 : 1})`; }
}
function _dragonGoHome(dur) {
  const hL = window.innerWidth - DRAGON_W - _companionSlotRight('dragon');
  if (dur > 0) { _dragonMoveTo(hL, DRAGON_BOTTOM, dur); setTimeout(() => { if (!_dragonEl) return; _dragonEl.style.transition = 'none'; _dragonEl.style.left = 'auto'; _dragonEl.style.right = _companionSlotRight('dragon') + 'px'; _dragonEl.style.bottom = DRAGON_BOTTOM + 'px'; }, dur + 80); }
  else { _dragonEl.style.transition = 'none'; _dragonEl.style.right = _companionSlotRight('dragon') + 'px'; _dragonEl.style.left = 'auto'; _dragonEl.style.bottom = DRAGON_BOTTOM + 'px'; }
}
function _stopDragonWalking() { clearInterval(_dragonWalkIv); clearTimeout(_dragonSleepTmr); _dragonWalkIv = null; }
function _startDragonWalking() {
  clearInterval(_dragonWalkIv); clearTimeout(_dragonSleepTmr); _dragonPauseNext = false; setDragonState('walking');
  const step = () => {
    if (_dragonPauseNext) { _dragonPauseNext = false; setDragonState('sitting'); setTimeout(() => { if (_dragonState === 'sitting' && _dragonWalkIv) setDragonState('walking'); }, 900 + Math.random()*600); return; }
    if (Math.random() < 0.10) _dragonPauseNext = true;
    const mg = 60; const maxX = window.innerWidth - DRAGON_W - mg; const maxY = Math.min(220, window.innerHeight*0.28);
    const tL = mg + Math.random()*(maxX-mg); const tB = DRAGON_BOTTOM + Math.random()*maxY;
    _dragonMoveTo(tL, tB, Math.min(400 + Math.abs(tL-_dragonGetLeft())*1.5, 2200));
  };
  step(); _dragonWalkIv = setInterval(step, 1600);
}

function showDragon() {
  if (!_dragonEl) initDragon();
  _dragonEl.classList.remove('dragon-hidden')
  if (_dragonHouseEl) _dragonHouseEl.style.right = (_companionSlotRight('dragon') - 8) + 'px';;
  _dragonGoHome(0); setDragonState('sitting');
  clearTimeout(_dragonSleepTmr);
  _dragonSleepTmr = setTimeout(() => { if (_dragonState === 'sitting') setDragonState('sleeping'); }, 4500);
}
function hideDragon() { if (!_dragonEl) return; _stopDragonWalking(); _dragonEl.classList.add('dragon-hidden'); hideDragonHouse(); }
function setDragonHappy() {
  if (!_dragonEl || _dragonEl.classList.contains('dragon-hidden')) return;
  clearTimeout(_dragonSleepTmr); clearTimeout(_dragonHappyTmr); _stopDragonWalking();
  setDragonState('happy'); _startDragonWalking();
  _dragonHappyTmr = setTimeout(() => { if (_dragonState === 'happy') setDragonState('walking'); }, 3000);
}
function _onDragonClick() {
  clearTimeout(_dragonHappyTmr); clearTimeout(_dragonSleepTmr); _stopDragonWalking();
  setDragonState('happy'); _startDragonWalking();
  if (typeof showAnimalBubble === 'function') showAnimalBubble(['RUAAAAR! 🐉','Sono il più raro!','🔥 Fuoco!','Studio con te!','⚡ Potere!'][Math.floor(Math.random()*5)]);
  _dragonHappyTmr = setTimeout(() => { if (_dragonState === 'happy') { setDragonState('walking'); setTimeout(() => { _stopDragonWalking(); _dragonGoHome(0); setDragonState('sitting'); _dragonSleepTmr = setTimeout(() => { if (_dragonState === 'sitting') setDragonState('sleeping'); }, 5000); }, 6000); } }, 3000);
}
function syncDragonToTimer(running, mode) {
  if (!_dragonEl || _dragonEl.classList.contains('dragon-hidden')) return;
  if (_dragonInGarden) return;
  if (running) {
    if (mode && mode !== 'work') { _stopDragonWalking(); _dragonGoHome(1000); clearTimeout(_dragonSleepTmr); _dragonSleepTmr = setTimeout(() => { setDragonState('sitting'); _dragonSleepTmr = setTimeout(() => setDragonState('sleeping'), 2500); }, 1100); }
    else { _startDragonWalking(); }
  } else {
    _stopDragonWalking(); _dragonGoHome(1200); clearTimeout(_dragonSleepTmr);
    _dragonSleepTmr = setTimeout(() => { if (_dragonState !== 'happy') setDragonState('sitting'); _dragonSleepTmr = setTimeout(() => { if (_dragonState === 'sitting') setDragonState('sleeping'); }, 4000); }, 1350);
  }
}

function dragonEnterGarden() {
  if (!_dragonEl || _dragonEl.classList.contains('dragon-hidden')) return;
  _dragonInGarden = true;
  _stopDragonWalking();
  clearTimeout(_dragonSleepTmr);
  setTimeout(() => {
    if (!_dragonInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _dragonEl.style.transform = 'scale(0.45)';
    _dragonEl.style.transformOrigin = 'left bottom';
    _startGardenWalkDragon(rect);
  }, 900);
}

function _startGardenWalkDragon(rect) {
  const SCALE   = 0.45;
  const pad     = 14;
  const GRASS_H = 100;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - DRAGON_W * SCALE - pad;
  const minB  = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
  const maxB  = minB + 8;

  setDragonState('walking');
  const _gstep = () => {
    if (!_dragonInGarden) return;
    if (Math.random() < 0.20) {
      setDragonState('sitting');
      setTimeout(() => { if (_dragonInGarden) setDragonState('walking'); }, 1200 + Math.random() * 800);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _dragonGetLeft());
    _dragonMoveTo(tL, tB, Math.min(500 + dist * 2.2, 2400));
  };
  _gstep();
  _dragonWalkIv = setInterval(_gstep, 2000 + Math.random() * 700);
}

function dragonExitGarden() {
  if (!_dragonEl || _dragonEl.classList.contains('dragon-hidden')) return;
  if (!_dragonInGarden) return;
  _dragonInGarden = false;
  _dragonEl.style.transform = '';
  _dragonEl.style.transformOrigin = '';
  _stopDragonWalking();
  clearTimeout(_dragonSleepTmr);
  setDragonState('walking');
  setTimeout(() => {
    _dragonGoHome(1300);
    setTimeout(() => {
      if (_dragonInGarden) return;
      setDragonState('sitting');
      _dragonSleepTmr = setTimeout(() => { if (_dragonState === 'sitting') setDragonState('sleeping'); }, 4000);
    }, 1400);
  }, 150);
}
