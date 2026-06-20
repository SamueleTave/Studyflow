/* =====================================================
   PROCIONE.JS — Procione animato
   States: sleeping | sitting | walking | happy
   ===================================================== */

const RACCOON_W      = 92;
const RACCOON_BOTTOM = 24;
const RACCOON_RIGHT  = 480;

let _raccoonEl        = null;
let _raccoonHouseEl   = null;
let _raccoonState     = 'sitting';
let _raccoonWalkIv    = null;
let _raccoonSleepTmr  = null;
let _raccoonHappyTmr  = null;
let _raccoonPauseNext = false;
let _raccoonInGarden  = false;
let _raccoonX = 0, _raccoonY = 0, _raccoonScale = 1;

const RACCOON_SVG = `
<div class="raccoon-dir-wrap">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 158" width="${RACCOON_W}" height="${Math.round(RACCOON_W*1.215)}" aria-label="Procione">
    <ellipse cx="64" cy="154" rx="28" ry="5" fill="rgba(0,0,0,0.12)"/>
    <path d="M32,106 C12,88 4,58 10,34 C14,20 26,20 24,36 C22,54 24,78 28,104 C30,106 32,106Z" fill="#8B9AAF" stroke="#1a0a2e" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M17,38 C21,48 25,58 27,66" fill="none" stroke="#2E3545" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
    <path d="M17,54 C21,64 25,74 27,82" fill="none" stroke="#2E3545" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
    <path d="M19,70 C23,80 26,88 27,94" fill="none" stroke="#2E3545" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
    <circle cx="64" cy="108" r="36" fill="#8B9AAF" stroke="#1a0a2e" stroke-width="3.5"/>
    <ellipse cx="64" cy="113" rx="21" ry="23" fill="#DCDCD0" stroke="#1a0a2e" stroke-width="2"/>
    <g class="raccoon-paw-l">
      <ellipse cx="46" cy="138" rx="14" ry="8" fill="#4C5568" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="37" y1="142" x2="34" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="46" y1="144" x2="46" y2="150" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="55" y1="142" x2="58" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <g class="raccoon-paw-r">
      <ellipse cx="82" cy="138" rx="14" ry="8" fill="#4C5568" stroke="#1a0a2e" stroke-width="3"/>
      <line x1="73" y1="142" x2="70" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="82" y1="144" x2="82" y2="150" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="91" y1="142" x2="94" y2="148" stroke="#1a0a2e" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <circle cx="36" cy="20" r="17" fill="#8B9AAF" stroke="#1a0a2e" stroke-width="3.2"/>
    <circle cx="36" cy="20" r="10" fill="#DCDCD0"/>
    <circle cx="92" cy="20" r="17" fill="#8B9AAF" stroke="#1a0a2e" stroke-width="3.2"/>
    <circle cx="92" cy="20" r="10" fill="#DCDCD0"/>
    <circle cx="64" cy="62" r="38" fill="#8B9AAF" stroke="#1a0a2e" stroke-width="3.5"/>
    <path d="M22,54 Q64,43 106,54 Q98,75 84,73 Q75,59 64,61 Q53,59 44,73 Q30,75 22,54Z" fill="#2A2E3C" stroke="#1a0a2e" stroke-width="1.8" stroke-linejoin="round"/>
    <g class="raccoon-eye-open">
      <circle cx="44" cy="58" r="14" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="44" cy="59" r="9" fill="#8B5A2B"/><circle cx="44" cy="59" r="5.5" fill="#1a0a2e"/><circle cx="47.5" cy="55" r="3" fill="white"/>
      <circle cx="84" cy="58" r="14" fill="white" stroke="#1a0a2e" stroke-width="2.8"/>
      <circle cx="84" cy="59" r="9" fill="#8B5A2B"/><circle cx="84" cy="59" r="5.5" fill="#1a0a2e"/><circle cx="87.5" cy="55" r="3" fill="white"/>
    </g>
    <g class="raccoon-eye-closed" style="display:none">
      <path d="M30,59 Q44,48 58,59" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M70,59 Q84,48 98,59" fill="none" stroke="#1a0a2e" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <ellipse cx="64" cy="73" rx="18" ry="13" fill="#C8C8BC" stroke="#1a0a2e" stroke-width="2"/>
    <ellipse cx="64" cy="71" rx="4" ry="3" fill="#2A2E3C"/>
    <line x1="64" y1="74" x2="64" y2="78" stroke="#1a0a2e" stroke-width="2"/>
    <path d="M56,78 Q64,86 72,78" fill="none" stroke="#1a0a2e" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="50" y1="73" x2="22" y2="67" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="50" y1="77" x2="20" y2="77" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="78" y1="73" x2="106" y2="67" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="78" y1="77" x2="108" y2="77" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M26,100 Q14,110 18,120 Q28,122 30,112 Q32,106 28,100Z" fill="#4C5568" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M102,100 Q114,110 110,120 Q100,122 98,112 Q96,106 100,100Z" fill="#4C5568" stroke="#1a0a2e" stroke-width="2.8" stroke-linejoin="round"/>
    <g class="raccoon-zzz" style="display:none">
      <text x="90" y="22" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
      <text x="102" y="8" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="17">z</text>
    </g>
    <g class="raccoon-heart" style="display:none">
      <path d="M64,18 C64,18 54,10 47,16 C43,21 45,28 50,31 L64,42 L78,31 C83,28 85,21 81,16 C74,10 64,18 64,18Z" fill="#EC4899" opacity="0.9"/>
    </g>
  </svg>
</div>
`;

function _createRaccoonHouse(rightPx, bottomPx) {
  const h = document.createElement('div');
  h.className = 'animal-house';
  h.style.cssText = `position:fixed;right:${rightPx-8}px;bottom:${bottomPx-2}px;z-index:598;pointer-events:none;`;
  h.innerHTML = `<svg viewBox="0 0 60 50" width="60" height="50">
    <ellipse cx="30" cy="44" rx="28" ry="8" fill="#4A3728" opacity="0.7"/>
    <ellipse cx="30" cy="34" rx="26" ry="18" fill="#6B4E3B"/>
    <ellipse cx="30" cy="36" rx="14" ry="10" fill="#2A1A10"/>
    <ellipse cx="14" cy="22" rx="5" ry="7" fill="#7B5E4A" opacity="0.7"/>
    <ellipse cx="46" cy="24" rx="4" ry="6" fill="#7B5E4A" opacity="0.7"/>
  </svg>`;
  (document.querySelector('.app') || document.body).appendChild(h);
  return h;
}

function _rShow(el, visible) { if (el) el.style.display = visible ? '' : 'none'; }

function initRaccoon() {
  if (_raccoonEl) return;
  _raccoonEl           = document.createElement('div');
  _raccoonEl.className = 'raccoon-companion raccoon-hidden';
  _raccoonEl.innerHTML = RACCOON_SVG;
  _raccoonEl.title     = 'Clicca il procione!';
  _raccoonX = window.innerWidth - RACCOON_W - _companionSlotRight('raccoon');
  _raccoonY = RACCOON_BOTTOM;
  _raccoonEl.style.cssText = `position:fixed;left:0;bottom:0;will-change:transform;transform:translate(${_raccoonX}px,${-_raccoonY}px);z-index:600;cursor:pointer;`;
  _raccoonEl.addEventListener('click', _onRaccoonClick);
  (document.querySelector('.app') || document.body).appendChild(_raccoonEl);
  _raccoonHouseEl = _createRaccoonHouse(RACCOON_RIGHT, RACCOON_BOTTOM);
  _raccoonHouseEl.classList.add('house-hidden');
}

function setRaccoonState(state) {
  if (!_raccoonEl) return;
  _raccoonState = state;
  _raccoonEl.classList.remove('raccoon-sleeping','raccoon-sitting','raccoon-walking','raccoon-happy');
  _raccoonEl.classList.add('raccoon-' + state);
  const eyeOpen   = _raccoonEl.querySelector('.raccoon-eye-open');
  const eyeClosed = _raccoonEl.querySelector('.raccoon-eye-closed');
  const zzz       = _raccoonEl.querySelector('.raccoon-zzz');
  const heart     = _raccoonEl.querySelector('.raccoon-heart');
  _rShow(eyeOpen,   state !== 'sleeping');
  _rShow(eyeClosed, state === 'sleeping');
  _rShow(zzz,       state === 'sleeping');
  _rShow(heart,     state === 'happy');
  _updateRaccoonHouseVisibility();
}

function _updateRaccoonHouseVisibility() {
  if (!_raccoonHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.raccoonHouseVisible;
  if (!owned) { _raccoonHouseEl.classList.add('house-hidden'); return; }
  _raccoonHouseEl.classList.toggle('house-hidden', _raccoonInGarden || _raccoonState !== 'sleeping');
}
function showRaccoonHouse() { _updateRaccoonHouseVisibility(); }
function hideRaccoonHouse() { if (_raccoonHouseEl) _raccoonHouseEl.classList.add('house-hidden'); }

function _raccoonGetLeft()   { return _raccoonX; }
function _raccoonGetBottom() { return _raccoonY; }

function _raccoonMoveTo(targetLeft, targetBottom, durationMs) {
  const goLeft = targetLeft < _raccoonX;
  _raccoonEl.style.transition = 'none';
  _raccoonEl.style.transform = _raccoonScale !== 1
    ? `translate(${_raccoonX}px, ${-_raccoonY}px) scale(${_raccoonScale})`
    : `translate(${_raccoonX}px, ${-_raccoonY}px)`;
  void _raccoonEl.offsetWidth;
  _raccoonEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.42,0,0.58,1)`;
  _raccoonEl.style.transform = _raccoonScale !== 1
    ? `translate(${targetLeft}px, ${-targetBottom}px) scale(${_raccoonScale})`
    : `translate(${targetLeft}px, ${-targetBottom}px)`;
  _raccoonX = targetLeft; _raccoonY = targetBottom;
  const dir = _raccoonEl.querySelector('.raccoon-dir-wrap');
  if (dir) { dir.style.transition = 'transform 0.18s ease'; dir.style.transform = `scaleX(${goLeft ? -1 : 1})`; }
}

function _raccoonGoHome(durationMs) {
  const homeLeft = window.innerWidth - RACCOON_W - _companionSlotRight('raccoon');
  if (durationMs > 0) {
    _raccoonMoveTo(homeLeft, RACCOON_BOTTOM, durationMs);
  } else {
    _raccoonX = homeLeft; _raccoonY = RACCOON_BOTTOM;
    _raccoonEl.style.transition = 'none';
    _raccoonEl.style.transform = `translate(${_raccoonX}px, ${-_raccoonY}px)`;
  }
}
function _stopRaccoonWalking() { clearInterval(_raccoonWalkIv); clearTimeout(_raccoonSleepTmr); _raccoonWalkIv = null; }
function _startRaccoonWalking() {
  clearInterval(_raccoonWalkIv);
  clearTimeout(_raccoonSleepTmr);
  _raccoonPauseNext = false;
  setRaccoonState('walking');
  const step = () => {
    if (_raccoonPauseNext) { _raccoonPauseNext = false; setRaccoonState('sitting'); setTimeout(() => { if (_raccoonState === 'sitting' && _raccoonWalkIv) setRaccoonState('walking'); }, 900 + Math.random()*600); return; }
    if (Math.random() < 0.10) _raccoonPauseNext = true;
    const margin = 60; const maxX = window.innerWidth - RACCOON_W - margin; const maxY = Math.min(220, window.innerHeight * 0.28);
    const tL = margin + Math.random() * (maxX - margin); const tB = RACCOON_BOTTOM + Math.random() * maxY;
    const dist = Math.abs(tL - _raccoonGetLeft());
    _raccoonMoveTo(tL, tB, Math.min(400 + dist * 1.5, 2200));
  };
  step(); _raccoonWalkIv = setInterval(step, 1600);
}

function showRaccoon() {
  if (!_raccoonEl) initRaccoon();
  _raccoonEl.classList.remove('raccoon-hidden')
  if (_raccoonHouseEl) _raccoonHouseEl.style.right = (_companionSlotRight('raccoon') - 8) + 'px';;
  _raccoonGoHome(0);
  setRaccoonState('sitting');
  clearTimeout(_raccoonSleepTmr);
  _raccoonSleepTmr = setTimeout(() => { if (_raccoonState === 'sitting') setRaccoonState('sleeping'); }, 4500);
}
function hideRaccoon() {
  if (!_raccoonEl) return;
  _stopRaccoonWalking();
  _raccoonEl.classList.add('raccoon-hidden');
  hideRaccoonHouse();
}
function setRaccoonHappy() {
  if (!_raccoonEl || _raccoonEl.classList.contains('raccoon-hidden')) return;
  clearTimeout(_raccoonSleepTmr); clearTimeout(_raccoonHappyTmr); _stopRaccoonWalking();
  setRaccoonState('happy'); _startRaccoonWalking();
  _raccoonHappyTmr = setTimeout(() => { if (_raccoonState === 'happy') setRaccoonState('walking'); }, 3000);
}
function _onRaccoonClick() {
  clearTimeout(_raccoonHappyTmr); clearTimeout(_raccoonSleepTmr); _stopRaccoonWalking();
  setRaccoonState('happy'); _startRaccoonWalking();
  if (typeof showAnimalBubble === 'function') showAnimalBubble(['Eheh! 🦝','Che bello!','Ho trovato qualcosa...','Furbo io!','Studia bene! 🌟'][Math.floor(Math.random()*5)]);
  _raccoonHappyTmr = setTimeout(() => { if (_raccoonState === 'happy') { setRaccoonState('walking'); setTimeout(() => { _stopRaccoonWalking(); _raccoonGoHome(0); setRaccoonState('sitting'); _raccoonSleepTmr = setTimeout(() => { if (_raccoonState === 'sitting') setRaccoonState('sleeping'); }, 5000); }, 6000); } }, 3000);
}
function syncRaccoonToTimer(running, mode) {
  if (!_raccoonEl || _raccoonEl.classList.contains('raccoon-hidden')) return;
  if (_raccoonInGarden) return;
  if (running) {
    if (mode && mode !== 'work') { _stopRaccoonWalking(); _raccoonGoHome(1000); clearTimeout(_raccoonSleepTmr); _raccoonSleepTmr = setTimeout(() => { setRaccoonState('sitting'); _raccoonSleepTmr = setTimeout(() => setRaccoonState('sleeping'), 2500); }, 1100); }
    else { _startRaccoonWalking(); }
  } else {
    _stopRaccoonWalking(); _raccoonGoHome(1200); clearTimeout(_raccoonSleepTmr);
    _raccoonSleepTmr = setTimeout(() => { if (_raccoonState !== 'happy') setRaccoonState('sitting'); _raccoonSleepTmr = setTimeout(() => { if (_raccoonState === 'sitting') setRaccoonState('sleeping'); }, 4000); }, 1350);
  }
}

function raccoonEnterGarden() {
  if (!_raccoonEl || _raccoonEl.classList.contains('raccoon-hidden')) return;
  _raccoonInGarden = true;
  _stopRaccoonWalking();
  clearTimeout(_raccoonSleepTmr);
  setTimeout(() => {
    if (!_raccoonInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    _raccoonScale = 0.45;
    _raccoonEl.style.transform = `translate(${_raccoonX}px, ${-_raccoonY}px) scale(0.45)`;
    _raccoonEl.style.transformOrigin = 'left bottom';
    _startGardenWalkRaccoon(rect);
  }, 900);
}

function _startGardenWalkRaccoon(rect) {
  const SCALE   = 0.45;
  const pad     = 14;
  const GRASS_H = 100;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - RACCOON_W * SCALE - pad;
  const minB  = Math.max(4, window.innerHeight - rect.bottom + GRASS_H);
  const maxB  = minB + 8;

  setRaccoonState('walking');
  const _gstep = () => {
    if (!_raccoonInGarden) return;
    if (Math.random() < 0.20) {
      setRaccoonState('sitting');
      setTimeout(() => { if (_raccoonInGarden) setRaccoonState('walking'); }, 1200 + Math.random() * 800);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _raccoonGetLeft());
    _raccoonMoveTo(tL, tB, Math.min(500 + dist * 2.2, 2400));
  };
  _gstep();
  _raccoonWalkIv = setInterval(_gstep, 2000 + Math.random() * 700);
}

function raccoonExitGarden() {
  if (!_raccoonEl || _raccoonEl.classList.contains('raccoon-hidden')) return;
  if (!_raccoonInGarden) return;
  _raccoonInGarden = false;
  _raccoonScale = 1;
  _raccoonEl.style.transition = 'none';
  _raccoonEl.style.transform = `translate(${_raccoonX}px, ${-_raccoonY}px)`;
  _raccoonEl.style.transformOrigin = '';
  _stopRaccoonWalking();
  clearTimeout(_raccoonSleepTmr);
  setRaccoonState('walking');
  setTimeout(() => {
    _raccoonGoHome(1300);
    setTimeout(() => {
      if (_raccoonInGarden) return;
      setRaccoonState('sitting');
      _raccoonSleepTmr = setTimeout(() => { if (_raccoonState === 'sitting') setRaccoonState('sleeping'); }, 4000);
    }, 1400);
  }, 150);
}
