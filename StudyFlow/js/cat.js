/* =====================================================
   CAT.JS — Gatto animato: cammina per la pagina
   States: sleeping | sitting | walking | playing | happy
   ===================================================== */

const CAT_W = 92;
const CAT_BOTTOM_HOME = 24;
const CAT_RIGHT_HOME  = 24;

let _catEl       = null;
let _catHouseEl  = null;
let _catState    = 'sleeping';
let _walkIv      = null;
let _sleepTmr    = null;
let _happyTmr    = null;
let _blinkTmr    = null;
let _catInGarden = false;

/* ══════════════════════════
   SVG con CSS custom props per i colori
   ══════════════════════════ */
const CAT_SVG = `
<div class="cat-dir-wrap">
  <div class="cat-body-wrap cat-svg-wrap">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${CAT_W}" height="${Math.round(CAT_W*1.2)}" aria-label="Gatto">

      <!-- Tail -->
      <path class="cat-tail" d="M28,86 Q5,74 9,53 Q13,32 27,68"
        fill="none" stroke="var(--cat-shadow,#E8A87C)" stroke-width="9" stroke-linecap="round"/>

      <!-- Body -->
      <ellipse cx="52" cy="87" rx="26" ry="22" fill="var(--cat-main,#F4C996)"/>

      <!-- Front paw left -->
      <g class="cat-paw-l">
        <ellipse cx="37" cy="108" rx="11" ry="7" fill="var(--cat-main,#F4C996)"/>
        <line x1="33" y1="108" x2="33" y2="112" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="37" y1="110" x2="37" y2="114" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="41" y1="108" x2="41" y2="112" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
      </g>

      <!-- Front paw right -->
      <g class="cat-paw-r">
        <ellipse cx="65" cy="108" rx="11" ry="7" fill="var(--cat-main,#F4C996)"/>
        <line x1="61" y1="108" x2="61" y2="112" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="65" y1="110" x2="65" y2="114" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="69" y1="108" x2="69" y2="112" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
      </g>

      <!-- Head -->
      <circle cx="52" cy="43" r="27" fill="var(--cat-main,#F4C996)"/>

      <!-- Ears outer -->
      <polygon points="27,30 20,7 43,24" fill="var(--cat-main,#F4C996)"/>
      <polygon points="77,30 80,7 57,24" fill="var(--cat-main,#F4C996)"/>
      <!-- Ears inner -->
      <polygon points="29,27 24,12 41,23" fill="var(--cat-ear-inner,#FFB3C6)"/>
      <polygon points="75,27 76,12 59,23" fill="var(--cat-ear-inner,#FFB3C6)"/>

      <!-- Eyes open -->
      <g class="cat-eyes-open">
        <ellipse cx="41" cy="42" rx="6.5" ry="7" fill="var(--cat-eye,#2C3E50)"/>
        <ellipse cx="41" cy="42" rx="3.8" ry="4.5" fill="#050A0E"/>
        <circle  cx="43.5" cy="39.5" r="1.7" fill="white"/>

        <ellipse cx="63" cy="42" rx="6.5" ry="7" fill="var(--cat-eye,#2C3E50)"/>
        <ellipse cx="63" cy="42" rx="3.8" ry="4.5" fill="#050A0E"/>
        <circle  cx="65.5" cy="39.5" r="1.7" fill="white"/>
      </g>

      <!-- Eyes half (playing/watching) -->
      <g class="cat-eyes-half" style="display:none">
        <ellipse cx="41" cy="43" rx="6.5" ry="4" fill="var(--cat-eye,#2C3E50)"/>
        <ellipse cx="63" cy="43" rx="6.5" ry="4" fill="var(--cat-eye,#2C3E50)"/>
      </g>

      <!-- Eyes closed (sleeping) -->
      <g class="cat-eyes-closed" style="display:none">
        <path d="M35,43 Q41,37 47,43" fill="none" stroke="var(--cat-eye,#2C3E50)" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M57,43 Q63,37 69,43" fill="none" stroke="var(--cat-eye,#2C3E50)" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Nose -->
      <polygon points="49,51 52,56 55,51" fill="var(--cat-nose,#FF8FAB)"/>

      <!-- Mouth -->
      <path d="M49,56 Q52,61 55,56" fill="none" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.8" stroke-linecap="round"/>

      <!-- Whiskers left -->
      <g opacity="0.6">
        <line x1="47" y1="52" x2="22" y2="47" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="46" y1="55" x2="21" y2="55" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="47" y1="58" x2="22" y2="63" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="57" y1="52" x2="82" y2="47" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="58" y1="55" x2="83" y2="55" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="57" y1="58" x2="82" y2="63" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
      </g>

      <!-- ZZZ (sleeping) -->
      <g class="cat-zzz" style="display:none">
        <text x="73" y="32" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
        <text x="79" y="24" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">z</text>
        <text x="87" y="15" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="15">z</text>
      </g>

      <!-- Cuore (happy) -->
      <g class="cat-heart" style="display:none">
        <path d="M52,14 C52,14 43,5 37,11 C33,15 33,22 37,26 L52,40 L67,26 C71,22 71,15 67,11 C61,5 52,14 52,14Z"
          fill="#EC4899" opacity="0.9"/>
      </g>

      <!-- Play paw (playing state) — raised left paw -->
      <g class="cat-play-paw" style="display:none">
        <ellipse cx="25" cy="72" rx="9" ry="7" fill="var(--cat-main,#F4C996)"
          transform="rotate(-30 25 72)"/>
        <line x1="21" y1="70" x2="18" y2="67" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="25" y1="68" x2="24" y2="64" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="29" y1="70" x2="30" y2="66" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
      </g>

      <!-- Zampe posteriori (modalità 4 zampe, nascoste di default) -->
      <g class="cat-rear-l" style="display:none">
        <ellipse cx="27" cy="106" rx="10" ry="6" fill="var(--cat-shadow,#E8A87C)" opacity="0.75"/>
        <line x1="23" y1="106" x2="23" y2="111" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="27" y1="108" x2="27" y2="113" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="31" y1="106" x2="31" y2="111" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
      </g>
      <g class="cat-rear-r" style="display:none">
        <ellipse cx="73" cy="106" rx="10" ry="6" fill="var(--cat-shadow,#E8A87C)" opacity="0.75"/>
        <line x1="69" y1="106" x2="69" y2="111" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="73" y1="108" x2="73" y2="113" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="77" y1="106" x2="77" y2="111" stroke="var(--cat-shadow,#E8A87C)" stroke-width="1.8" stroke-linecap="round"/>
      </g>

    </svg>
  </div>
  <div class="cat-body-wrap cat-4legs-wrap" style="display:none">
    <!--
      Gatto di PROFILO che guarda a DESTRA.
      Testa a destra: orecchio in cima-sinistra della testa, occhio/naso/bocca sul MUSO (lato destro).
      Coda a sinistra. 4 zampe con animazione walking.
      Questo SVG appare SOLO durante cat-walking; negli altri stati torna il frontale.
      ViewBox: 0 0 145 98
    -->
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 145 98" width="110" height="74" aria-label="Gatto che cammina">

      <!-- ── CODA ── inizia dalla parte posteriore del corpo, curva su-sinistra -->
      <path class="cat4-tail" d="M36,53 C16,49 7,37 13,21"
            fill="none" stroke="var(--cat-shadow,#E8A87C)" stroke-width="8" stroke-linecap="round"/>

      <!-- ── ZAMPE POSTERIORI layer dietro (disegnate prima del corpo) ── -->
      <line class="cat4-lb1" x1="47" y1="70" x2="45" y2="92"
            stroke="var(--cat-shadow,#E8A87C)" stroke-width="7.5" stroke-linecap="round" opacity="0.65"/>
      <ellipse class="cat4-pb1" cx="45" cy="93" rx="7.5" ry="3.5" fill="var(--cat-shadow,#E8A87C)" opacity="0.65"/>

      <!-- ── ZAMPA ANTERIORE layer dietro ── -->
      <line class="cat4-lb2" x1="88" y1="70" x2="90" y2="92"
            stroke="var(--cat-shadow,#E8A87C)" stroke-width="7.5" stroke-linecap="round" opacity="0.65"/>
      <ellipse class="cat4-pb2" cx="90" cy="93" rx="7.5" ry="3.5" fill="var(--cat-shadow,#E8A87C)" opacity="0.65"/>

      <!-- ── CORPO ── -->
      <ellipse cx="66" cy="54" rx="30" ry="17" fill="var(--cat-main,#F4C996)"/>

      <!-- ── ZAMPA POSTERIORE layer davanti ── -->
      <line class="cat4-lf1" x1="51" y1="70" x2="49" y2="92"
            stroke="var(--cat-main,#F4C996)" stroke-width="7.5" stroke-linecap="round"/>
      <ellipse class="cat4-pf1" cx="49" cy="93" rx="7.5" ry="3.5" fill="var(--cat-main,#F4C996)"/>

      <!-- ── ZAMPA ANTERIORE layer davanti ── -->
      <line class="cat4-lf2" x1="92" y1="70" x2="94" y2="92"
            stroke="var(--cat-main,#F4C996)" stroke-width="7.5" stroke-linecap="round"/>
      <ellipse class="cat4-pf2" cx="94" cy="93" rx="7.5" ry="3.5" fill="var(--cat-main,#F4C996)"/>

      <!-- ── TESTA (cerchio grande, si sovrappone al corpo per formare il collo) ── -->
      <circle cx="103" cy="31" r="18" fill="var(--cat-main,#F4C996)"/>

      <!-- ── ORECCHIO: in cima-SINISTRA della testa (lato posteriore, verso il corpo) ── -->
      <polygon points="88,23 97,4 108,18" fill="var(--cat-main,#F4C996)"/>
      <polygon points="91,22 98,8 106,19" fill="var(--cat-ear-inner,#FFB3C6)"/>

      <!-- ── OCCHIO: sul MUSO, lato DESTRO della testa (cat guarda a destra) ── -->
      <g class="cat4-eye-open">
        <ellipse cx="112" cy="26" rx="5" ry="5.5" fill="var(--cat-eye,#2C3E50)"/>
        <ellipse cx="112" cy="26" rx="2.8" ry="3.2" fill="#050A0E"/>
        <circle  cx="113.5" cy="24" r="1.3" fill="white"/>
      </g>
      <g class="cat4-eye-closed" style="display:none">
        <path d="M107,26 Q112,20 117,26" fill="none" stroke="var(--cat-eye,#2C3E50)" stroke-width="2.2" stroke-linecap="round"/>
      </g>

      <!-- ── NASO + BOCCA: punta del muso, all'estremo destro della testa ── -->
      <polygon points="118,34 120,39 122,34" fill="var(--cat-nose,#FF8FAB)"/>
      <path d="M118,39 Q120,42 122,39" fill="none" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.5" stroke-linecap="round"/>

      <!-- ── BAFFI: si estendono solo verso SINISTRA (indietro) dal naso ── -->
      <g opacity="0.52">
        <line x1="117" y1="36" x2="98"  y2="32" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="117" y1="38" x2="96"  y2="38" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="117" y1="40" x2="98"  y2="44" stroke="var(--cat-shadow,#8B6355)" stroke-width="1.3" stroke-linecap="round"/>
      </g>

      <!-- ── ZZZ (dormendo) ── -->
      <g class="cat4-zzz" style="display:none">
        <text x="124" y="20" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="9">z</text>
        <text x="130" y="13" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="11">z</text>
        <text x="136" y="5"  font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="13">Z</text>
      </g>
      <!-- ── CUORE (happy) ── -->
      <g class="cat4-heart" style="display:none">
        <path d="M103,11 C103,11 95,4 90,9 C87,13 88,19 92,22 L103,31 L114,22 C118,19 119,13 116,9 C111,4 103,11 103,11Z"
              fill="#EC4899" opacity="0.9"/>
      </g>

    </svg>
  </div>
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
function initCat() {
  if (_catEl) return;
  _catEl           = document.createElement('div');
  _catEl.className = 'cat-companion cat-hidden';
  _catEl.innerHTML = CAT_SVG;
  _catEl.title     = 'Clicca il gatto!';
  _catEl.style.position = 'fixed';
  _catEl.style.right  = CAT_RIGHT_HOME + 'px';
  _catEl.style.bottom = CAT_BOTTOM_HOME + 'px';
  _catEl.style.left   = 'auto';
  _catEl.style.zIndex = '600';
  _catEl.addEventListener('click', _onCatClick);
  document.body.appendChild(_catEl);

  _catHouseEl = _createGroundHouse(CAT_RIGHT_HOME, CAT_BOTTOM_HOME, '#F4C996');
  _catHouseEl.classList.add('house-hidden');

  /* Blink casuale */
  _blinkTmr = setInterval(_blink, 4000 + Math.random() * 4000);

  /* Ripristina colore */
  if (typeof coinData !== 'undefined' && coinData.shop) {
    ['catWhite','catBlack','catGrey'].forEach(id => {
      if (coinData.shop[id] && coinData.activeEffects && coinData.activeEffects.catColor === id) {
        _applyCatColor(id);
      }
    });
  }
}

/* ══════════════════════════
   STATO
   ══════════════════════════ */
function _updateCatHouseVisibility() {
  if (!_catHouseEl) return;
  const owned = typeof coinData !== 'undefined' && coinData.activeEffects?.catHouseVisible;
  if (!owned) { _catHouseEl.classList.add('house-hidden'); return; }
  _catHouseEl.classList.toggle('house-hidden', _catInGarden || _catState !== 'sleeping');
}
function showCatHouse() { _updateCatHouseVisibility(); }
function hideCatHouse() { if (_catHouseEl) _catHouseEl.classList.add('house-hidden'); }

function setCatState(state) {
  if (!_catEl) return;
  _catState = state;

  /* Rimuovi tutte le classi di stato */
  _catEl.classList.remove('cat-sleeping','cat-sitting','cat-walking','cat-playing','cat-happy');
  _catEl.classList.add('cat-' + state);

  const eyesOpen   = _catEl.querySelector('.cat-eyes-open');
  const eyesHalf   = _catEl.querySelector('.cat-eyes-half');
  const eyesClosed = _catEl.querySelector('.cat-eyes-closed');
  const zzz        = _catEl.querySelector('.cat-zzz');
  const heart      = _catEl.querySelector('.cat-heart');
  const playPaw    = _catEl.querySelector('.cat-play-paw');

  _show(eyesOpen,   state !== 'sleeping');
  _show(eyesHalf,   state === 'playing' || state === 'walking');
  _show(eyesClosed, state === 'sleeping');
  _show(zzz,        state === 'sleeping');
  _show(heart,      state === 'happy');
  _show(playPaw,    state === 'playing');

  if (eyesOpen && (state === 'sitting' || state === 'walking' || state === 'happy')) {
    _show(eyesOpen, true);
    _show(eyesHalf, false);
  }

  _updateCatHouseVisibility();

  /* Aggiorna anche il gatto a 4 zampe (SVG laterale) */
  _show(_catEl.querySelector('.cat4-eye-open'),   state !== 'sleeping');
  _show(_catEl.querySelector('.cat4-eye-closed'), state === 'sleeping');
  _show(_catEl.querySelector('.cat4-zzz'),        state === 'sleeping');
  _show(_catEl.querySelector('.cat4-heart'),      state === 'happy');

  /* Quando cat4legs è attivo: il profilo compare SOLO durante walking.
     In tutti gli altri stati si torna al gatto frontale (che si siede, dorme, ecc.) */
  if (_catEl.classList.contains('cat-4legs')) {
    const svgWrap  = _catEl.querySelector('.cat-svg-wrap');
    const fourWrap = _catEl.querySelector('.cat-4legs-wrap');
    const useProfile = (state === 'walking');
    if (svgWrap)  svgWrap.style.display  = useProfile ? 'none' : '';
    if (fourWrap) fourWrap.style.display = useProfile ? '' : 'none';
  }
}

function _show(el, visible) {
  if (el) el.style.display = visible ? '' : 'none';
}

/* ══════════════════════════
   MOSTRA / NASCONDI
   ══════════════════════════ */
function showCat() {
  if (!_catEl) initCat();
  _catEl.classList.remove('cat-hidden');
  _goHome(0);
  setCatState('sitting');
  clearTimeout(_sleepTmr);
  _sleepTmr = setTimeout(() => { if (_catState === 'sitting') setCatState('sleeping'); }, 4000);
}

function hideCat() {
  if (!_catEl) return;
  _stopWalking();
  _catEl.classList.add('cat-hidden');
  hideCatHouse();
}

/* ══════════════════════════
   POSIZIONE
   ══════════════════════════ */
function _getCurrentLeft() {
  /* Usa la posizione visiva reale (non lo stile inline che è già il target) */
  return _catEl.getBoundingClientRect().left;
}

function _getCurrentBottom() {
  const rect = _catEl.getBoundingClientRect();
  return window.innerHeight - rect.bottom;
}

function _moveTo(targetLeft, targetBottom, durationMs) {
  const curLeft   = _getCurrentLeft();
  const curBottom = _getCurrentBottom();
  const goLeft    = targetLeft < curLeft;

  /* 1. Congela il gatto alla posizione visiva attuale senza transition */
  _catEl.style.transition = 'none';
  _catEl.style.right  = 'auto';
  _catEl.style.left   = curLeft + 'px';
  _catEl.style.bottom = curBottom + 'px';

  /* 2. Force-reflow: il browser applica i valori precedenti prima di continuare */
  void _catEl.offsetWidth;

  /* 3. Ora imposta la transizione e il target — il browser anima dal punto attuale */
  _catEl.style.transition = `left ${durationMs}ms cubic-bezier(0.42,0,0.58,1), bottom ${Math.round(durationMs * 0.75)}ms ease-in-out`;
  _catEl.style.left   = targetLeft + 'px';
  _catEl.style.bottom = targetBottom + 'px';

  /* Flip direzione */
  const dir = _catEl.querySelector('.cat-dir-wrap');
  if (dir) {
    dir.style.transition = 'transform 0.18s ease';
    dir.style.transform  = `scaleX(${goLeft ? -1 : 1})`;
  }
}

function _goHome(durationMs = 1200) {
  const homeLeft = window.innerWidth - CAT_W - CAT_RIGHT_HOME;
  if (durationMs > 0) {
    _moveTo(homeLeft, CAT_BOTTOM_HOME, durationMs);
  } else {
    _catEl.style.transition = 'none';
    _catEl.style.right  = CAT_RIGHT_HOME + 'px';
    _catEl.style.left   = 'auto';
    _catEl.style.bottom = CAT_BOTTOM_HOME + 'px';
    return;
  }
  /* Dopo l'arrivo riancora a right per resistere al resize */
  setTimeout(() => {
    if (!_catEl) return;
    _catEl.style.transition = 'none';
    _catEl.style.left   = 'auto';
    _catEl.style.right  = CAT_RIGHT_HOME + 'px';
    _catEl.style.bottom = CAT_BOTTOM_HOME + 'px';
  }, durationMs + 80);
}

/* ══════════════════════════
   CAMMINA
   ══════════════════════════ */
let _pauseNext = false;

function _startWalking() {
  clearInterval(_walkIv);
  clearTimeout(_sleepTmr);
  _pauseNext = false;
  setCatState('walking');

  const _step = () => {
    /* Ogni ~4 passi fa una pausa breve (si siede e guarda) */
    if (_pauseNext) {
      _pauseNext = false;
      setCatState('sitting');
      setTimeout(() => {
        if (_catState === 'sitting' && _walkIv) setCatState('walking');
      }, 900 + Math.random() * 600);
      return;
    }
    if (Math.random() < 0.10) _pauseNext = true;

    const margin  = 60;
    const maxX    = window.innerWidth  - CAT_W - margin;
    const maxY    = Math.min(220, window.innerHeight * 0.28);
    const targetL = margin + Math.random() * (maxX - margin);
    const targetB = CAT_BOTTOM_HOME + Math.random() * maxY;
    const dist    = Math.abs(targetL - _getCurrentLeft());
    const dur     = 400 + dist * 1.5;
    _moveTo(targetL, targetB, Math.min(dur, 2200));
  };

  _step();
  _walkIv = setInterval(_step, 1600);
}

function _stopWalking() {
  clearInterval(_walkIv);
  clearTimeout(_sleepTmr);
  _walkIv = null;
}

/* ══════════════════════════
   SYNC COL TIMER
   ══════════════════════════ */
/* ══════════════════════════
   GARDEN ENTER / EXIT
   ══════════════════════════ */
function catEnterGarden() {
  if (!_catEl || _catEl.classList.contains('cat-hidden')) return;
  _catInGarden = true;
  _stopWalking();
  clearTimeout(_sleepTmr);
  setTimeout(() => {
    if (!_catInGarden) return;
    const canvas = document.getElementById('garden-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.height < 10) return;
    // Shrink in garden
    _catEl.style.transform = 'scale(0.45)';
    _catEl.style.transformOrigin = 'left bottom';
    // Walk around garden
    _startGardenWalkCat(rect);
  }, 580);
}

function _startGardenWalkCat(rect) {
  const SCALE = 0.45;
  const pad   = 14;
  const minL  = rect.left   + pad;
  const maxL  = rect.right  - CAT_W * SCALE - pad;
  const minB  = window.innerHeight - rect.bottom + 4;
  const maxB  = minB + rect.height * 0.38;

  setCatState('walking');
  const _gstep = () => {
    if (!_catInGarden) return;
    if (Math.random() < 0.18) {
      setCatState('sitting');
      setTimeout(() => { if (_catInGarden) setCatState('walking'); }, 1000 + Math.random()*700);
      return;
    }
    const tL = minL + Math.random() * (maxL - minL);
    const tB = minB + Math.random() * (maxB - minB);
    const dist = Math.abs(tL - _getCurrentLeft());
    _moveTo(tL, tB, Math.min(500 + dist * 2.2, 2000));
  };
  _gstep();
  _walkIv = setInterval(_gstep, 1900 + Math.random()*600);
}

function catExitGarden() {
  if (!_catEl || _catEl.classList.contains('cat-hidden')) return;
  if (!_catInGarden) return;
  _catInGarden = false;
  _catEl.style.transform = '';
  _catEl.style.transformOrigin = '';
  _stopWalking();
  clearTimeout(_sleepTmr);
  setCatState('walking');
  setTimeout(() => {
    _goHome(1200);
    setTimeout(() => {
      if (_catInGarden) return;
      setCatState('sitting');
      _sleepTmr = setTimeout(() => { if (_catState === 'sitting') setCatState('sleeping'); }, 3500);
    }, 1300);
  }, 150);
}

function syncCatToTimer(running, mode) {
  if (!_catEl || _catEl.classList.contains('cat-hidden')) return;
  if (_catInGarden) return;
  if (running) {
    if (mode && mode !== 'work') {
      /* Pausa — il gatto va a casa e dorme */
      _stopWalking();
      _goHome(1000);
      clearTimeout(_sleepTmr);
      _sleepTmr = setTimeout(() => {
        setCatState('sitting');
        _sleepTmr = setTimeout(() => setCatState('sleeping'), 2500);
      }, 1100);
    } else {
      /* Lavoro — il gatto cammina */
      _startWalking();
    }
  } else {
    _stopWalking();
    _goHome(1200);
    clearTimeout(_sleepTmr);
    _sleepTmr = setTimeout(() => {
      if (_catState !== 'happy') setCatState('sitting');
      _sleepTmr = setTimeout(() => {
        if (_catState === 'sitting') setCatState('sleeping');
      }, 4000);
    }, 1350);
  }
}

/* ══════════════════════════
   AZIONI
   ══════════════════════════ */
function _onCatClick() {
  clearTimeout(_happyTmr);
  _stopWalking();
  setCatState('happy');
  if (typeof celebrate === 'function') celebrate(12);
  _happyTmr = setTimeout(() => {
    setCatState('sitting');
    _sleepTmr = setTimeout(() => { if (_catState === 'sitting') setCatState('sleeping'); }, 4000);
  }, 4000);
}

function _blink() {
  if (!_catEl || _catState === 'sleeping') return;
  const open = _catEl.querySelector('.cat-eyes-open');
  const closed = _catEl.querySelector('.cat-eyes-closed');
  if (!open || !closed) return;
  if (_catState !== 'sitting' && _catState !== 'walking') return;
  open.style.display   = 'none';
  closed.style.display = '';
  setTimeout(() => {
    if (open)   open.style.display   = '';
    if (closed) closed.style.display = 'none';
  }, 140);
}

/* ══════════════════════════
   COLORI GATTO
   ══════════════════════════ */
const CAT_COLORS = {
  catOrange: { main:'#F4C996', shadow:'#E8A87C', earInner:'#FFB3C6', nose:'#FF8FAB', eye:'#2C3E50' },
  catWhite:  { main:'#F5F5F5', shadow:'#DCDCDC', earInner:'#FFB3C6', nose:'#FF8FAB', eye:'#3D5A80' },
  catBlack:  { main:'#2A2A2A', shadow:'#1A1A1A', earInner:'#C2185B', nose:'#EF5350', eye:'#E0E0E0' },
  catGrey:   { main:'#9E9E9E', shadow:'#757575', earInner:'#FFB3C6', nose:'#FF8FAB', eye:'#2C3E50' },
};

function _applyCatColor(id) {
  if (!_catEl) return;
  const c = CAT_COLORS[id] || CAT_COLORS.catOrange;
  _catEl.style.setProperty('--cat-main',      c.main);
  _catEl.style.setProperty('--cat-shadow',    c.shadow);
  _catEl.style.setProperty('--cat-ear-inner', c.earInner);
  _catEl.style.setProperty('--cat-nose',      c.nose);
  _catEl.style.setProperty('--cat-eye',       c.eye);
}

function setCatColor(id) {
  if (!_catEl) return;
  _applyCatColor(id);
  if (typeof coinData !== 'undefined' && coinData.activeEffects) {
    coinData.activeEffects.catColor = id;
    if (typeof saveCoinData === 'function') saveCoinData();
  }
}

/* ══════════════════════════
   MODALITÀ 4 ZAMPE
   ══════════════════════════ */
function setCat4Legs(active) {
  if (!_catEl) return;
  _catEl.classList.toggle('cat-4legs', !!active);
  if (!active) {
    /* Torna sempre al frontale quando si disattiva */
    const svgWrap  = _catEl.querySelector('.cat-svg-wrap');
    const fourWrap = _catEl.querySelector('.cat-4legs-wrap');
    if (svgWrap)  svgWrap.style.display  = '';
    if (fourWrap) fourWrap.style.display = 'none';
  } else {
    /* Attivato: sincronizza con lo stato corrente */
    setCatState(_catState);
  }
}
