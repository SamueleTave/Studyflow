/* =====================================================
   GARDEN.JS — Il Giardino dello Studio
   ===================================================== */

const GARDEN_KEY = 'sf_garden';

/* ── Catalogo oggetti acquistabili ── */
const GARDEN_CATALOG = {
  tree:       { label: 'Albero',       render: _gTree,       w: 80,  h: 100, defY: 36,  moves: false },
  cherryTree: { label: 'Ciliegio',     render: _gCherryTree, w: 75,  h: 95,  defY: 36,  moves: false },
  mushroom:   { label: 'Funghetti',    render: _gMushroom,   w: 45,  h: 55,  defY: 36,  moves: false },
  fountain:   { label: 'Fontana',      render: _gFountain,   w: 70,  h: 65,  defY: 36,  moves: false },
  bench:      { label: 'Panchina',     render: _gBench,      w: 80,  h: 50,  defY: 36,  moves: false },
  rainbow:    { label: 'Arcobaleno',   render: _gRainbow,    w: 140, h: 70,  defY: 170, moves: false },
  butterfly:  { label: 'Farfalle',     render: _gButterfly,  w: 42,  h: 38,  defY: 150, moves: 'fly' },
  pond:       { label: 'Laghetto',     render: _gPond,       w: 100, h: 55,  defY: 36,  moves: false },
  lantern:    { label: 'Lanterna',     render: _gLantern,    w: 32,  h: 62,  defY: 36,  moves: false },
  /* ── Nuovi oggetti ── */
  cactus:     { label: 'Cactus',       render: _gCactus,     w: 48,  h: 72,  defY: 36,  moves: false },
  bamboo:     { label: 'Bambù',        render: _gBamboo,     w: 44,  h: 96,  defY: 36,  moves: false },
  birdhouse:  { label: 'Casetta',      render: _gBirdhouse,  w: 58,  h: 72,  defY: 36,  moves: false },
  windmill:   { label: 'Mulino',       render: _gWindmill,   w: 68,  h: 88,  defY: 36,  moves: false },
  waterfall:  { label: 'Cascata',      render: _gWaterfall,  w: 78,  h: 92,  defY: 90,  moves: false },
  swing:      { label: 'Altalena',     render: _gSwing,      w: 74,  h: 68,  defY: 36,  moves: false },
  balloon:    { label: 'Mongolfiera',  render: _gBalloon,    w: 88,  h: 102, defY: 188, moves: 'fly' },
  starBalloon:{ label: 'Mongolfiera Stellata', render: _gStarBalloon, w: 92, h: 108, defY: 178, moves: 'fly' },
  nest:       { label: 'Nido',         render: _gNest,       w: 46,  h: 36,  defY: 36,  moves: false },
  ball:       { label: 'Pallina',      render: _gBall,       w: 38,  h: 38,  defY: 36,  moves: false },
  hole:       { label: 'Tana',         render: _gHole,       w: 60,  h: 30,  defY: 36,  moves: false },
};

/* ── Compagni nel giardino (versioni statiche) ── */
const GARDEN_COMPANIONS = {
  _campfire: { label: 'Falò', render: _gFireMini, w: 52, h: 68, defY: 36 },
};

let _gardenExpanded = false;
let _gardenItems    = {};  // { id: { x: 0–100 %, y: 30–200 px from bottom } }
let _moveIntervals  = {};  // { id: intervalId } — per animali/oggetti in movimento

/* ── Persistenza ── */
function loadGardenState() {
  try { _gardenItems = JSON.parse(localStorage.getItem(GARDEN_KEY) || '{}'); } catch {}
}
function saveGardenState() {
  localStorage.setItem(GARDEN_KEY, JSON.stringify(_gardenItems));
}

/* ── Init ── */
function initGarden() {
  loadGardenState();
  _syncOwnership();
  /* Apri automaticamente se URL contiene ?garden=1 */
  if (location.search.includes('garden=1') || location.hash === '#garden') {
    setTimeout(openGarden, 320);
  }
}

function _syncOwnership() {
  if (typeof loadCoinData === 'function') loadCoinData();
  const shop = (typeof coinData !== 'undefined' && coinData.shop) ? coinData.shop : {};
  const ga   = (typeof coinData !== 'undefined' && coinData.activeEffects?.gardenActive) || {};
  Object.keys(GARDEN_CATALOG).forEach(id => {
    /* Piazza solo se undefined (mai piazzato) — null significa rimosso con X, non ri-piazzare */
    if (shop[id] && ga[id] !== false && _gardenItems[id] === undefined) {
      _gardenItems[id] = { x: 8 + Math.random() * 76, y: GARDEN_CATALOG[id].defY };
      saveGardenState();
    }
  });
}

/* ── Toggle ── */
function toggleGarden() {
  _gardenExpanded = !_gardenExpanded;
  const zone  = document.getElementById('garden-zone');
  const arrow = document.getElementById('garden-arrow');
  if (zone)  zone.classList.toggle('open', _gardenExpanded);
  if (arrow) arrow.style.transform = _gardenExpanded ? 'rotate(180deg)' : '';
  if (_gardenExpanded) {
    renderGarden();
    initGardenSky();
    _startNightStars();
    // Porta il giardino in vista così il canvas è nel viewport quando gli animali calcolano la posizione
    setTimeout(() => {
      const gz = document.getElementById('garden-zone');
      if (gz) gz.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    if (typeof catEnterGarden    === 'function') catEnterGarden();
    if (typeof dogEnterGarden    === 'function') dogEnterGarden();
    if (typeof rabbitEnterGarden === 'function') rabbitEnterGarden();
    if (typeof parrotEnterGarden === 'function') parrotEnterGarden();
    if (typeof foxEnterGarden    === 'function') foxEnterGarden();
    if (typeof owlEnterGarden    === 'function') owlEnterGarden();
    if (typeof lionEnterGarden    === 'function') lionEnterGarden();
    if (typeof raccoonEnterGarden   === 'function') raccoonEnterGarden();
    if (typeof dragonEnterGarden    === 'function') dragonEnterGarden();
    if (typeof platypusEnterGarden  === 'function') platypusEnterGarden();
    if (typeof giraffeEnterGarden   === 'function') giraffeEnterGarden();
  } else {
    destroyGardenSky();
    _stopNightStars();
    if (typeof catExitGarden    === 'function') catExitGarden();
    if (typeof dogExitGarden    === 'function') dogExitGarden();
    if (typeof rabbitExitGarden === 'function') rabbitExitGarden();
    if (typeof parrotExitGarden === 'function') parrotExitGarden();
    if (typeof foxExitGarden    === 'function') foxExitGarden();
    if (typeof owlExitGarden    === 'function') owlExitGarden();
    if (typeof lionExitGarden    === 'function') lionExitGarden();
    if (typeof raccoonExitGarden  === 'function') raccoonExitGarden();
    if (typeof dragonExitGarden   === 'function') dragonExitGarden();
    if (typeof platypusExitGarden  === 'function') platypusExitGarden();
    if (typeof giraffeExitGarden   === 'function') giraffeExitGarden();
  }
}

function openGarden() {
  if (!_gardenExpanded) toggleGarden();
}

/* ── Piazza un oggetto ── */
function placeGardenItem(id) {
  if (!GARDEN_CATALOG[id]) return;
  /* Segna come attivo in coinData */
  if (typeof coinData !== 'undefined' && coinData.activeEffects) {
    if (!coinData.activeEffects.gardenActive) coinData.activeEffects.gardenActive = {};
    coinData.activeEffects.gardenActive[id] = true;
    if (typeof saveCoinData === 'function') saveCoinData();
  }
  if (!_gardenItems[id]) {
    _gardenItems[id] = { x: 8 + Math.random() * 76, y: GARDEN_CATALOG[id].defY };
    saveGardenState();
  }
  _updateGardenBadge();
  if (_gardenExpanded) renderGarden();
}

/* ── Rimuovi un oggetto ── */
function removeGardenItem(id) {
  /* Segna come disattivo in coinData — questo è il dato che persiste */
  if (typeof coinData !== 'undefined' && coinData.activeEffects) {
    if (!coinData.activeEffects.gardenActive) coinData.activeEffects.gardenActive = {};
    coinData.activeEffects.gardenActive[id] = false;
    if (typeof saveCoinData === 'function') saveCoinData();
  }
  _gardenItems[id] = null;
  saveGardenState();
  _updateGardenBadge();
  renderGarden();
  _playPop(0.06);
}

/* ── Render canvas ── */
function renderGarden() {
  const canvas = document.getElementById('garden-canvas');
  if (!canvas) return;
  _clearAllMovements();
  loadGardenState();
  _syncOwnership();

  canvas.querySelectorAll('.garden-item').forEach(el => el.remove());
  canvas.querySelectorAll('.garden-empty').forEach(el => el.remove());

  if (typeof loadCoinData === 'function') loadCoinData();
  const shop    = (typeof coinData !== 'undefined' && coinData.shop) ? coinData.shop : {};
  const effects = (typeof coinData !== 'undefined' && coinData.activeEffects) ? coinData.activeEffects : {};

  /* Oggetti acquistabili — solo quelli attivi (gardenActive[id] !== false) */
  const _ga = effects.gardenActive || {};
  const allItems = [];
  Object.keys(GARDEN_CATALOG).forEach(id => {
    if (shop[id] && _ga[id] !== false && _gardenItems[id]) allItems.push({ id, cat: GARDEN_CATALOG[id], data: _gardenItems[id] });
  });

  /* Compagni nel giardino — solo se non ancora piazzati (undefined), non se rimossi (null) */
  if (shop.campfire && effects.campfire && _gardenItems._campfire === undefined)
    _gardenItems._campfire = { x: 6, y: 36 };

  if (shop.campfire && effects.campfire && _gardenItems._campfire)
    allItems.push({ id: '_campfire', cat: GARDEN_COMPANIONS._campfire, data: _gardenItems._campfire });

  if (allItems.length === 0) {
    const em = document.createElement('div');
    em.className = 'garden-empty';
    em.innerHTML = `<div class="garden-empty-icon">🌱</div>
      <div class="garden-empty-text">Il tuo giardino è vuoto<br>
      <span>Acquista piante nello shop per iniziare!</span></div>`;
    canvas.appendChild(em);
    return;
  }

  /* Ordina per Y crescente (oggetti più lontani prima = z-index più basso) */
  allItems.sort((a, b) => (b.data.y || 36) - (a.data.y || 36));

  allItems.forEach(({ id, cat, data }) => {
    const el = _createItem(canvas, id, cat, data, effects);
    canvas.appendChild(el);
  });
}

function _createItem(canvas, id, cat, data, effects) {
  const el = document.createElement('div');
  el.className  = 'garden-item';
  el.dataset.id = id;

  const cW     = canvas.offsetWidth || 800;
  const maxPct = Math.max(0, 100 - (cat.w / cW) * 100);
  const xPct   = Math.max(0, Math.min(maxPct, data.x || 0));
  const yPx    = Math.max(30, Math.min(200, data.y || 36));

  /* Profondità: scala e z-index diminuiscono man mano che l'oggetto va in alto */
  const depth = Math.max(0.22, 1 - ((yPx - 30) / 170) * 0.72); // 1.0 → 0.28
  const zIdx  = Math.round(500 - yPx * 2);

  el.style.cssText = `
    left: ${xPct}%;
    bottom: ${yPx}px;
    width: ${cat.w}px;
    height: ${cat.h}px;
    transform: scale(${depth.toFixed(3)});
    transform-origin: bottom center;
    z-index: ${zIdx};
  `;

  el.innerHTML = cat.render();

  /* Colori compagni */
  if (id === '_cat') {
    const col = effects.catColor;
    const palette = { catWhite:'#F0F0F0', catBlack:'#252525', catGrey:'#9E9E9E' };
    const main = palette[col] || '#9E9E9E';
    el.style.setProperty('--cat-main', main);
    el.style.setProperty('--cat-dark', col === 'catBlack' ? '#121212' : col === 'catWhite' ? '#D8D8D8' : '#757575');
  }
  if (id === '_dog') {
    const dogPalettes = {
      dogGolden: { main:'#E8C97A', dark:'#C4A052' },
      dogBlack:  { main:'#252525', dark:'#121212' },
      dogWhite:  { main:'#F0F0F0', dark:'#D0D0D0' },
    };
    const col = effects.activeDogColor;
    const p   = dogPalettes[col] || { main:'#C8956C', dark:'#9B6B43' };
    el.style.setProperty('--dog-main', p.main);
    el.style.setProperty('--dog-dark', p.dark);
  }

  el.title = cat.label + ' — trascina per spostare';

  /* Pulsante rimuovi — counter-scale per mantenerlo leggibile a qualsiasi profondità */
  const rmBtn = document.createElement('button');
  rmBtn.className = 'g-remove-btn';
  rmBtn.innerHTML = '×';
  rmBtn.title = 'Rimuovi dal giardino';
  rmBtn.style.transform = `scale(${(1 / depth).toFixed(3)})`;
  rmBtn.style.transformOrigin = 'top right';
  rmBtn.addEventListener('mousedown',  e => { e.stopPropagation(); });
  rmBtn.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  rmBtn.addEventListener('touchend',   e => { e.stopPropagation(); e.preventDefault(); removeGardenItem(id); }, { passive: false });
  rmBtn.addEventListener('click',      e => { e.stopPropagation(); e.preventDefault(); removeGardenItem(id); });
  el.appendChild(rmBtn);

  _makeDraggable(el, id, cat);

  /* Avvia movimento per oggetti/animali dinamici */
  if (cat.moves === 'fly') {
    setTimeout(() => _startFlight(el, id, cat), 500 + Math.random() * 800);
  }

  return el;
}

/* ── Drag & drop (X% + Y px) ── */
function _makeDraggable(el, id, cat) {
  let sX, sY, sLeft, sBottom, cW, cH;

  const start = (clientX, clientY) => {
    const canvas = document.getElementById('garden-canvas');
    cW      = canvas.offsetWidth;
    cH      = canvas.offsetHeight;
    sX      = clientX;
    sY      = clientY;
    sLeft   = (_gardenItems[id].x / 100) * cW;
    sBottom = _gardenItems[id].y || 36;
    el.classList.add('dragging');
  };

  const move = (clientX, clientY) => {
    const maxPct = 100 - (cat.w / cW) * 100;
    const newX   = Math.max(0, Math.min(maxPct, ((sLeft + clientX - sX) / cW) * 100));
    const yMax   = (id === 'balloon' || id === 'starBalloon') ? 290 : 200;
    const newY   = Math.max(30, Math.min(yMax, sBottom - (clientY - sY)));
    const depth  = Math.max(0.22, 1 - ((newY - 30) / 170) * 0.72);
    el.style.left      = newX + '%';
    el.style.bottom    = newY + 'px';
    el.style.transform = `scale(${depth.toFixed(3)})`;
    el.style.zIndex    = Math.round(500 - newY * 2);
  };

  const end = (clientX, clientY) => {
    el.classList.remove('dragging');
    const maxPct = 100 - (cat.w / cW) * 100;
    _gardenItems[id].x = Math.max(0, Math.min(maxPct, ((sLeft + clientX - sX) / cW) * 100));
    _gardenItems[id].y = Math.max(30, Math.min(200, sBottom - (clientY - sY)));
    saveGardenState();
  };

  el.addEventListener('mousedown', e => {
    if (e.target.closest && e.target.closest('.g-remove-btn')) return;
    if (e.target.classList && e.target.classList.contains('g-remove-btn')) return;
    e.preventDefault();
    start(e.clientX, e.clientY);
    const mm = ev => move(ev.clientX, ev.clientY);
    const mu = ev => { end(ev.clientX, ev.clientY); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });

  el.addEventListener('touchstart', e => {
    if (e.target.closest && e.target.closest('.g-remove-btn')) return;
    if (e.target.classList && e.target.classList.contains('g-remove-btn')) return;
    e.preventDefault();
    start(e.touches[0].clientX, e.touches[0].clientY);
    const tm = ev => { ev.preventDefault(); move(ev.touches[0].clientX, ev.touches[0].clientY); };
    const te = ev => { end(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); };
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
  }, { passive: false });
}

/* ── Badge giardino ── */
function _updateGardenBadge() {
  loadGardenState();
  if (typeof loadCoinData === 'function') loadCoinData();
  const shop     = (typeof coinData !== 'undefined' && coinData.shop) ? coinData.shop : {};
  const effects  = (typeof coinData !== 'undefined' && coinData.activeEffects) ? coinData.activeEffects : {};
  const gardenIds = Object.keys(GARDEN_CATALOG);
  const count    = gardenIds.filter(id => shop[id]).length;

  /* Aggiorna il badge numerico */
  const badge = document.getElementById('garden-badge');
  if (badge) badge.textContent = count;

  /* Indicatore motivazionale */
  const hint = document.getElementById('garden-coin-hint');
  if (!hint) return;
  const balance = (typeof coinData !== 'undefined') ? (coinData.balance || 0) : 0;
  const next = gardenIds
    .filter(id => !shop[id])
    .map(id => {
      const item = (typeof SHOP_ITEMS !== 'undefined') && SHOP_ITEMS.find(i => i.id === id);
      return item ? { name: item.name, price: item.price } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.price - b.price)[0];
  if (!next) {
    hint.textContent = count + ' oggetti · giardino completo!';
  } else {
    const gap = next.price - balance;
    hint.textContent = gap <= 0
      ? 'Puoi acquistare: ' + next.name + '!'
      : 'Ancora ' + gap + ' monete per ' + next.name;
  }
}

/* ══════════════════════════════════
   SISTEMA DI MOVIMENTO ANIMALI
══════════════════════════════════ */

function _clearAllMovements() {
  Object.values(_moveIntervals).forEach(id => clearInterval(id));
  _moveIntervals = {};
}

/* Volo — farfalla e mongolfiera: percorso casuale lento */
function _startFlight(el, id, cat) {
  if (_moveIntervals[id]) return;
  const canvas = document.getElementById('garden-canvas');
  if (!canvas) return;

  const isBalloon   = (id === 'balloon' || id === 'starBalloon');
  const minY = isBalloon ? 200 : 100;
  const maxY = isBalloon ? 290 : 200;
  const speed = isBalloon ? 5500 : 2200;

  let tX = _gardenItems[id]?.x || 50;
  let tY = _gardenItems[id]?.y || cat.defY;

  const fly = () => {
    if (el.classList.contains('dragging')) return;
    const cW = canvas.offsetWidth || 800;
    const maxXPct = Math.max(0, 100 - (cat.w / cW) * 100);

    tX = Math.max(2, Math.min(maxXPct, tX + (Math.random() - 0.5) * (isBalloon ? 18 : 32)));
    tY = Math.max(minY, Math.min(maxY, tY + (Math.random() - 0.5) * (isBalloon ? 25 : 45)));

    const dur = speed + Math.random() * 1400;
    const depth = Math.max(0.22, 1 - ((tY - 30) / 170) * 0.72);

    el.style.transition    = `left ${dur}ms ease-in-out, bottom ${dur}ms ease-in-out`;
    el.style.left          = tX + '%';
    el.style.bottom        = tY + 'px';
    el.style.transform     = `scale(${depth.toFixed(3)})`;
    el.style.zIndex        = Math.round(500 - tY * 2);

    /* Gira la farfalla nella direzione del volo */
    if (!isBalloon) {
      const inner = el.querySelector('svg');
      if (inner) inner.style.transform = tX < (parseFloat(el.style.left) || tX) ? 'scaleX(-1)' : '';
    }

    setTimeout(() => {
      el.style.transition = '';
      if (!el.classList.contains('dragging') && _gardenItems[id]) {
        _gardenItems[id].x = tX;
        _gardenItems[id].y = tY;
        saveGardenState();
      }
    }, dur + 80);
  };

  fly();
  _moveIntervals[id] = setInterval(fly, isBalloon ? 5500 + Math.random() * 2000 : 2600 + Math.random() * 800);
}

/* Cammina — gatto e cagnolino: spostamento orizzontale */
function _startAnimalWander(el, id, cat) {
  if (_moveIntervals[id]) return;
  const canvas = document.getElementById('garden-canvas');
  if (!canvas) return;

  const wander = () => {
    if (el.classList.contains('dragging')) return;
    const cW    = canvas.offsetWidth || 800;
    const maxX  = Math.max(0, 100 - (cat.w / cW) * 100);
    const curX  = parseFloat(el.style.left) || (_gardenItems[id]?.x || 50);
    const newX  = Math.max(2, Math.min(maxX - 2, curX + (Math.random() - 0.5) * 42));
    const dur   = 2800 + Math.random() * 2400;
    const going = newX > curX ? 1 : -1;

    el.classList.add('g-animal-walking');
    el.classList.toggle('g-face-left', going < 0);

    el.style.transition = `left ${dur}ms ease-in-out`;
    el.style.left = newX + '%';

    setTimeout(() => {
      el.classList.remove('g-animal-walking');
      el.style.transition = '';
      if (!el.classList.contains('dragging') && _gardenItems[id]) {
        _gardenItems[id].x = newX;
        saveGardenState();
      }
    }, dur + 50);
  };

  setTimeout(wander, 1200 + Math.random() * 1500);
  _moveIntervals[id] = setInterval(wander, 5500 + Math.random() * 4500);
}

/* ── Garden cresce dopo ogni sessione ── */
function gardenSessionGrowth() {
  const canvas = document.getElementById('garden-canvas');
  if (!canvas || !_gardenExpanded) return;

  /* Seleziona un item casuale e fa scintillare */
  const items = Array.from(canvas.querySelectorAll('.garden-item'));
  if (items.length === 0) return;
  const target = items[Math.floor(Math.random() * items.length)];

  const spark = document.createElement('div');
  spark.className = 'g-session-spark';
  spark.innerHTML = ['🌸','✨','⭐','🌟','💫'][Math.floor(Math.random() * 5)];
  target.appendChild(spark);
  setTimeout(() => spark.remove(), 1800);

  /* Incrementa il "livello" dell'oggetto in _gardenItems */
  const id = target.dataset.id;
  if (_gardenItems[id]) {
    _gardenItems[id].growLevel = Math.min(3, (_gardenItems[id].growLevel || 0) + 1);
    saveGardenState();
    /* Applicare visivamente il livello */
    target.dataset.grow = _gardenItems[id].growLevel;
  }
}

/* ── Stelle notturne animate ── */
let _nightStarIv = null;
function _startNightStars() {
  const canvas = document.getElementById('garden-canvas');
  if (!canvas) return;
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme !== 'night') return;
  if (_nightStarIv) return;
  _nightStarIv = setInterval(() => {
    if (document.documentElement.getAttribute('data-theme') !== 'night') return;
    const s = document.createElement('div');
    s.className = 'g-night-star';
    s.style.cssText = `left:${Math.random()*95}%;top:${Math.random()*45}%;animation-delay:${Math.random()*2}s;width:${2+Math.random()*2}px;height:${2+Math.random()*2}px;opacity:0`;
    canvas.appendChild(s);
    setTimeout(() => s.remove(), 4000);
  }, 400);
}
function _stopNightStars() {
  clearInterval(_nightStarIv);
  _nightStarIv = null;
}

/* ── Trova un oggetto del giardino (usato dagli animali per interagire) ── */
function gardenFindItem(id) {
  const canvas = document.getElementById('garden-canvas');
  if (!canvas) return null;
  const el = canvas.querySelector(`.garden-item[data-id="${id}"]`);
  return el ? el.getBoundingClientRect() : null;
}

/* ── Pop sound ── */
function _playPop(vol) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

/* ══════════════════════════════════════
   SVG GENERATORS
═══════════════════════════════════════ */

function _gTree() {
  return `<svg viewBox="0 0 80 100" width="80" height="100" style="overflow:visible">
    <ellipse cx="40" cy="95" rx="12" ry="4" fill="rgba(0,0,0,0.12)"/>
    <rect x="33" y="60" width="14" height="40" rx="5" fill="#6D4C41"/>
    <rect x="30" y="58" width="20" height="7" rx="3" fill="#5D4037"/>
    <ellipse cx="40" cy="48" rx="33" ry="32" fill="#2E7D32"/>
    <ellipse cx="40" cy="39" rx="26" ry="25" fill="#388E3C"/>
    <ellipse cx="40" cy="28" rx="19" ry="18" fill="#43A047"/>
    <ellipse cx="40" cy="17" rx="12" ry="12" fill="#66BB6A"/>
    <ellipse cx="28" cy="36" rx="8" ry="8" fill="#A5D6A7" opacity="0.38"/>
    <ellipse cx="52" cy="30" rx="6" ry="6" fill="#C8E6C9" opacity="0.3"/>
  </svg>`;
}

function _gCherryTree() {
  return `<svg viewBox="0 0 75 95" width="75" height="95" style="overflow:visible">
    <ellipse cx="37" cy="92" rx="11" ry="4" fill="rgba(0,0,0,0.12)"/>
    <rect x="30" y="58" width="15" height="37" rx="4" fill="#8D6E63"/>
    <ellipse cx="37" cy="42" rx="30" ry="28" fill="#AD1457"/>
    <ellipse cx="37" cy="33" rx="24" ry="22" fill="#E91E8C"/>
    <ellipse cx="37" cy="24" rx="17" ry="16" fill="#F06292"/>
    <ellipse cx="37" cy="15" rx="11" ry="11" fill="#F48FB1"/>
    <circle cx="24" cy="43" r="4.5" fill="white" opacity="0.26"/>
    <circle cx="50" cy="37" r="3.5" fill="white" opacity="0.26"/>
    <circle cx="38" cy="52" r="4" fill="white" opacity="0.26"/>
  </svg>`;
}

function _gSunflower() {
  return `<svg viewBox="0 0 50 88" width="50" height="88" style="overflow:visible">
    <!-- ombra a terra -->
    <ellipse cx="25" cy="86" rx="13" ry="4" fill="rgba(0,0,0,0.18)"/>
    <!-- stelo con curva -->
    <path d="M25 88 C24 72 23 58 25 34" stroke="#2E7D32" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    <!-- foglia destra -->
    <path d="M25 62 C36 55 42 48 38 42 C34 50 28 56 25 62Z" fill="#4CAF50"/>
    <path d="M25 62 C36 55 38 42" stroke="#388E3C" stroke-width="1" fill="none" stroke-linecap="round"/>
    <!-- foglia sinistra -->
    <path d="M25 52 C14 46 8 40 10 34 C14 42 20 48 25 52Z" fill="#4CAF50"/>
    <path d="M25 52 C14 46 10 34" stroke="#388E3C" stroke-width="1" fill="none" stroke-linecap="round"/>
    <!-- petali posteriori (vista dall'alto, ellisse piatto) -->
    <ellipse cx="25" cy="16" rx="4" ry="9" fill="#F9A825" opacity="0.75"/>
    <ellipse cx="25" cy="36" rx="4" ry="9" fill="#F9A825" opacity="0.75"/>
    <ellipse cx="6"  cy="26" rx="9" ry="4" fill="#F9A825" opacity="0.75"/>
    <ellipse cx="44" cy="26" rx="9" ry="4" fill="#F9A825" opacity="0.75"/>
    <ellipse cx="12" cy="13" rx="4" ry="8" fill="#F9A825" opacity="0.75" transform="rotate(-45 12 13)"/>
    <ellipse cx="38" cy="13" rx="4" ry="8" fill="#F9A825" opacity="0.75" transform="rotate(45 38 13)"/>
    <ellipse cx="12" cy="39" rx="4" ry="8" fill="#F9A825" opacity="0.75" transform="rotate(45 12 39)"/>
    <ellipse cx="38" cy="39" rx="4" ry="8" fill="#F9A825" opacity="0.75" transform="rotate(-45 38 39)"/>
    <!-- petali anteriori più vivaci -->
    <ellipse cx="25" cy="14" rx="3.5" ry="8" fill="#FDD835"/>
    <ellipse cx="25" cy="38" rx="3.5" ry="8" fill="#FDD835"/>
    <ellipse cx="7"  cy="26" rx="8" ry="3.5" fill="#FDD835"/>
    <ellipse cx="43" cy="26" rx="8" ry="3.5" fill="#FDD835"/>
    <ellipse cx="11" cy="12" rx="3.5" ry="7" fill="#FFEE58" transform="rotate(-45 11 12)"/>
    <ellipse cx="39" cy="12" rx="3.5" ry="7" fill="#FFEE58" transform="rotate(45 39 12)"/>
    <ellipse cx="11" cy="40" rx="3.5" ry="7" fill="#FFEE58" transform="rotate(45 11 40)"/>
    <ellipse cx="39" cy="40" rx="3.5" ry="7" fill="#FFEE58" transform="rotate(-45 39 40)"/>
    <!-- disco centrale ellittico (prospettiva dall'alto) -->
    <ellipse cx="25" cy="24" rx="11" ry="9" fill="#5D4037"/>
    <ellipse cx="25" cy="23" rx="8.5" ry="6.5" fill="#4E342E"/>
    <!-- luci sul disco -->
    <circle cx="20" cy="20" r="2.2" fill="#8D6E63" opacity="0.5"/>
    <circle cx="27" cy="18" r="1.6" fill="#8D6E63" opacity="0.4"/>
    <circle cx="30" cy="25" r="1.4" fill="#795548" opacity="0.35"/>
  </svg>`;
}

function _gMushroom() {
  return `<svg viewBox="0 0 45 55" width="45" height="55" style="overflow:visible">
    <ellipse cx="22" cy="53" rx="8" ry="3" fill="rgba(0,0,0,0.1)"/>
    <rect x="17" y="31" width="11" height="22" rx="3" fill="#EFEBE9"/>
    <rect x="11" y="38" width="23" height="6" rx="3" fill="#D7CCC8"/>
    <ellipse cx="22" cy="28" rx="21" ry="16" fill="#B71C1C"/>
    <ellipse cx="22" cy="26" rx="19" ry="13" fill="#C62828"/>
    <ellipse cx="22" cy="24" rx="17" ry="11" fill="#D32F2F"/>
    <circle cx="13" cy="20" r="5" fill="white" opacity="0.9"/>
    <circle cx="26" cy="17" r="4" fill="white" opacity="0.9"/>
    <circle cx="22" cy="28" r="3.5" fill="white" opacity="0.88"/>
    <circle cx="33" cy="23" r="4" fill="white" opacity="0.88"/>
  </svg>`;
}

function _gFountain() {
  return `<svg viewBox="0 0 70 65" width="70" height="65" style="overflow:visible">
    <ellipse cx="35" cy="63" rx="22" ry="5" fill="rgba(0,0,0,0.12)"/>
    <ellipse cx="35" cy="59" rx="30" ry="7" fill="#90A4AE"/>
    <rect x="8" y="34" width="54" height="26" rx="6" fill="#B0BEC5"/>
    <rect x="12" y="37" width="46" height="21" rx="5" fill="#B3E5FC"/>
    <rect x="29" y="16" width="12" height="20" rx="4" fill="#78909C"/>
    <ellipse cx="35" cy="16" rx="16" ry="5" fill="#90A4AE"/>
    <ellipse cx="35" cy="14" rx="11" ry="4" fill="#E3F2FD"/>
    <ellipse cx="35" cy="4"  rx="2.5" ry="11" fill="#64B5F6" opacity="0.85" class="g-fountain-water"/>
    <ellipse cx="26" cy="9"  rx="2"   ry="8"  fill="#64B5F6" opacity="0.65" class="g-fountain-water" transform="rotate(-25 26 9)"/>
    <ellipse cx="44" cy="9"  rx="2"   ry="8"  fill="#64B5F6" opacity="0.65" class="g-fountain-water" transform="rotate(25 44 9)"/>
    <ellipse cx="35" cy="51" rx="20" ry="4.5" fill="#81D4FA" opacity="0.5"/>
  </svg>`;
}

function _gBench() {
  return `<svg viewBox="0 0 80 50" width="80" height="50" style="overflow:visible">
    <ellipse cx="40" cy="49" rx="28" ry="4" fill="rgba(0,0,0,0.1)"/>
    <rect x="5"  y="19" width="70" height="8" rx="3" fill="#8D6E63"/>
    <rect x="8"  y="19" width="64" height="5" rx="2" fill="#A1887F"/>
    <rect x="5"  y="7"  width="70" height="7" rx="2" fill="#795548"/>
    <line x1="16" y1="7" x2="16" y2="27" stroke="#6D4C41" stroke-width="5.5" stroke-linecap="round"/>
    <line x1="64" y1="7" x2="64" y2="27" stroke="#6D4C41" stroke-width="5.5" stroke-linecap="round"/>
    <rect x="11" y="27" width="9"  height="22" rx="3" fill="#795548"/>
    <rect x="60" y="27" width="9"  height="22" rx="3" fill="#795548"/>
    <rect x="20" y="35" width="40" height="5"  rx="2" fill="#6D4C41"/>
  </svg>`;
}

function _gRainbow() {
  return `<svg viewBox="0 0 140 72" width="140" height="72" style="overflow:visible">
    <path d="M4 70 Q70 -10 136 70" fill="none" stroke="#EF5350" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M11 70 Q70 1 129 70"  fill="none" stroke="#FF9800" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M18 70 Q70 10 122 70" fill="none" stroke="#FDD835" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M26 70 Q70 19 114 70" fill="none" stroke="#66BB6A" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M33 70 Q70 27 107 70" fill="none" stroke="#42A5F5" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M41 70 Q70 35 99 70"  fill="none" stroke="#AB47BC" stroke-width="6.5" stroke-linecap="round" opacity="0.85"/>
  </svg>`;
}

function _gButterfly() {
  return `<svg viewBox="0 0 42 36" width="42" height="36" style="overflow:visible">
    <ellipse cx="21" cy="19" rx="2"  ry="10" fill="#3E2723"/>
    <circle  cx="21" cy="9"  r="3"   fill="#3E2723"/>
    <line x1="21" y1="7" x2="15" y2="1" stroke="#4E342E" stroke-width="1.2"/>
    <line x1="21" y1="7" x2="27" y2="1" stroke="#4E342E" stroke-width="1.2"/>
    <circle cx="15" cy="1" r="2" fill="#4E342E"/>
    <circle cx="27" cy="1" r="2" fill="#4E342E"/>
    <g class="g-butterfly-wings">
      <ellipse cx="10" cy="14" rx="10" ry="12" fill="#FF6F00" opacity="0.92" transform="rotate(-15 10 14)"/>
      <ellipse cx="32" cy="14" rx="10" ry="12" fill="#FF6F00" opacity="0.92" transform="rotate(15 32 14)"/>
      <ellipse cx="11" cy="25" rx="7.5" ry="8" fill="#FFB300" opacity="0.92" transform="rotate(12 11 25)"/>
      <ellipse cx="31" cy="25" rx="7.5" ry="8" fill="#FFB300" opacity="0.92" transform="rotate(-12 31 25)"/>
      <circle cx="9"  cy="12" r="3.5" fill="#BF360C" opacity="0.4"/>
      <circle cx="33" cy="12" r="3.5" fill="#BF360C" opacity="0.4"/>
    </g>
  </svg>`;
}

function _gPond() {
  return `<svg viewBox="0 0 100 55" width="100" height="55" style="overflow:visible">
    <ellipse cx="50" cy="36" rx="47" ry="18" fill="#1565C0" opacity="0.75"/>
    <ellipse cx="50" cy="33" rx="43" ry="14" fill="#1E88E5" opacity="0.7"/>
    <ellipse cx="50" cy="30" rx="38" ry="11" fill="#42A5F5" opacity="0.6"/>
    <ellipse cx="34" cy="33" rx="10" ry="7.5" fill="#388E3C"/>
    <ellipse cx="67" cy="36" rx="9"  ry="7"   fill="#2E7D32"/>
    <circle cx="27" cy="27" r="2.5" fill="#F48FB1"/>
    <circle cx="32" cy="25" r="2.5" fill="#F48FB1"/>
    <circle cx="37" cy="27" r="2.5" fill="#F48FB1"/>
    <circle cx="32" cy="30" r="2.5" fill="#F48FB1"/>
    <circle cx="32" cy="27" r="3"   fill="#FCE4EC"/>
    <circle cx="68" cy="31" r="2"   fill="#EC407A"/>
    <circle cx="72" cy="29" r="2"   fill="#EC407A"/>
    <circle cx="70" cy="33" r="2"   fill="#EC407A"/>
    <circle cx="70" cy="31" r="2.5" fill="#FCE4EC"/>
    <ellipse cx="50" cy="40" rx="24" ry="4.5" fill="white" opacity="0.12"/>
  </svg>`;
}

function _gLantern() {
  return `<svg viewBox="0 0 32 62" width="32" height="62" style="overflow:visible">
    <ellipse cx="16" cy="61" rx="8" ry="3" fill="rgba(0,0,0,0.1)"/>
    <rect x="14" y="37" width="4" height="24" rx="2" fill="#607D8B"/>
    <path d="M4 13 L16 5 L28 13 Z" fill="#455A64"/>
    <rect x="11" y="2" width="10" height="5" rx="2" fill="#546E7A"/>
    <rect x="4" y="13" width="24" height="25" rx="5" fill="#F57C00"/>
    <rect x="6" y="15" width="20" height="21" rx="4" fill="#FFE0B2"/>
    <rect x="7" y="16" width="18" height="19" rx="3" fill="#FFF9C4" opacity="0.55"/>
    <path d="M4 38 L16 45 L28 38 Z" fill="#455A64"/>
    <line x1="16" y1="13" x2="16" y2="38" stroke="#EF6C00" stroke-width="1.2" opacity="0.5"/>
    <line x1="4"  y1="24" x2="28" y2="24" stroke="#EF6C00" stroke-width="1.2" opacity="0.5"/>
    <line x1="4"  y1="30" x2="28" y2="30" stroke="#EF6C00" stroke-width="1.2" opacity="0.5"/>
    <ellipse cx="16" cy="26" rx="5" ry="5" fill="#FFECB3" opacity="0.6"/>
  </svg>`;
}

/* ── Compagni garden-version ── */
function _gCatSit() {
  return `<svg viewBox="0 0 54 64" width="54" height="64" style="overflow:visible">
    <ellipse cx="27" cy="62" rx="14" ry="4" fill="rgba(0,0,0,0.1)"/>
    <!-- body -->
    <ellipse cx="27" cy="46" rx="15" ry="13" fill="var(--cat-main,#9E9E9E)"/>
    <!-- tail -->
    <path d="M40,50 C50,42 52,34 47,27" fill="none" stroke="var(--cat-main,#9E9E9E)" stroke-width="5" stroke-linecap="round"/>
    <!-- head -->
    <circle cx="27" cy="26" r="13" fill="var(--cat-main,#9E9E9E)"/>
    <!-- ears -->
    <polygon points="16,17 13,6 22,15" fill="var(--cat-main,#9E9E9E)"/>
    <polygon points="38,17 41,6 32,15" fill="var(--cat-main,#9E9E9E)"/>
    <polygon points="17,16 15,8 22,15" fill="#F8BBD9" opacity="0.65"/>
    <polygon points="37,16 39,8 32,15" fill="#F8BBD9" opacity="0.65"/>
    <!-- eyes -->
    <circle cx="22" cy="24" r="3.5" fill="#1A1A1A"/>
    <circle cx="32" cy="24" r="3.5" fill="#1A1A1A"/>
    <circle cx="23" cy="23" r="1.2" fill="white"/>
    <circle cx="33" cy="23" r="1.2" fill="white"/>
    <!-- nose -->
    <ellipse cx="27" cy="29" rx="2" ry="1.5" fill="#EF9A9A"/>
    <!-- paws -->
    <ellipse cx="20" cy="57" rx="6" ry="3.5" fill="var(--cat-main,#9E9E9E)"/>
    <ellipse cx="34" cy="57" rx="6" ry="3.5" fill="var(--cat-main,#9E9E9E)"/>
    <!-- zzz sleeping -->
    <text x="41" y="20" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="8" class="cat-garden-zzz">z</text>
    <text x="46" y="13" font-family="Arial,sans-serif" font-weight="800" fill="#94A3B8" font-size="10" class="cat-garden-zzz">z</text>
  </svg>`;
}

function _gDogSit() {
  return `<svg viewBox="0 0 66 67" width="66" height="67" style="overflow:visible">
    <ellipse cx="33" cy="65" rx="16" ry="4" fill="rgba(0,0,0,0.1)"/>
    <!-- body -->
    <ellipse cx="33" cy="48" rx="17" ry="15" fill="var(--dog-main,#C8956C)"/>
    <!-- tail -->
    <path d="M48,46 C58,38 60,28 54,20" fill="none" stroke="var(--dog-main,#C8956C)" stroke-width="6" stroke-linecap="round"/>
    <!-- head -->
    <circle cx="33" cy="24" r="15" fill="var(--dog-main,#C8956C)"/>
    <!-- ears -->
    <ellipse cx="20" cy="31" rx="7.5" ry="14" fill="var(--dog-dark,#9B6B43)" transform="rotate(-10 20 31)"/>
    <ellipse cx="46" cy="31" rx="7.5" ry="14" fill="var(--dog-dark,#9B6B43)" transform="rotate(10 46 31)"/>
    <!-- muzzle -->
    <ellipse cx="33" cy="30" rx="9" ry="6.5" fill="var(--dog-main,#C8956C)"/>
    <!-- nose -->
    <circle cx="33" cy="28" r="4.5" fill="#1A0800"/>
    <circle cx="32" cy="27" r="1.5" fill="white" opacity="0.55"/>
    <!-- eyes -->
    <circle cx="25" cy="19" r="4" fill="#2C1500"/>
    <circle cx="41" cy="19" r="4" fill="#2C1500"/>
    <circle cx="26" cy="18" r="1.4" fill="white"/>
    <circle cx="42" cy="18" r="1.4" fill="white"/>
    <!-- paws -->
    <ellipse cx="24" cy="60" rx="7" ry="4" fill="var(--dog-main,#C8956C)"/>
    <ellipse cx="42" cy="60" rx="7" ry="4" fill="var(--dog-main,#C8956C)"/>
  </svg>`;
}

function _gFireMini() {
  return `<svg viewBox="0 0 52 68" width="52" height="68" style="overflow:visible">
    <ellipse cx="26" cy="66" rx="16" ry="4" fill="rgba(0,0,0,0.12)"/>
    <circle class="cf-spark cf-spark1" cx="22" cy="48" r="2"   fill="#FF8C00"/>
    <circle class="cf-spark cf-spark2" cx="33" cy="44" r="1.5" fill="#FFD700"/>
    <circle class="cf-spark cf-spark3" cx="18" cy="50" r="1.8" fill="#FF6B1A"/>
    <path class="cf-flame-outer" d="M26,54 C14,50 9,39 11,27 C13,17 19,9 26,3 C33,9 39,17 41,27 C43,39 38,50 26,54Z" fill="#E03000" opacity="0.76"/>
    <path class="cf-flame-mid"   d="M26,54 C17,51 13,42 15,33 C17,24 21,16 26,11 C31,16 35,24 37,33 C39,42 35,51 26,54Z" fill="#FF7A00" opacity="0.85"/>
    <path class="cf-flame-inner" d="M26,54 C20,52 17,45 19,38 C21,31 24,25 26,20 C28,25 31,31 33,38 C35,45 32,52 26,54Z" fill="#FFD700" opacity="0.92"/>
    <rect x="5"  y="54" width="21" height="8" rx="4" fill="#5D4037" transform="rotate(-20 15 58)"/>
    <rect x="26" y="54" width="21" height="8" rx="4" fill="#4E342E" transform="rotate(20 37 58)"/>
    <ellipse cx="26" cy="60" rx="13" ry="3.5" fill="#FF5000" opacity="0.28"/>
  </svg>`;
}

/* ══════════════════════════════════════
   NUOVI OGGETTI SVG
═══════════════════════════════════════ */

function _gCactus() {
  return `<svg viewBox="0 0 48 72" width="48" height="72" style="overflow:visible">
    <ellipse cx="24" cy="70" rx="9" ry="3" fill="rgba(0,0,0,0.1)"/>
    <!-- braccio sx -->
    <rect x="8" y="28" width="9" height="18" rx="4" fill="#2E7D32"/>
    <rect x="3" y="20" width="9" height="14" rx="4" fill="#388E3C"/>
    <!-- braccio dx -->
    <rect x="31" y="22" width="9" height="20" rx="4" fill="#2E7D32"/>
    <rect x="36" y="14" width="9" height="14" rx="4" fill="#388E3C"/>
    <!-- tronco -->
    <rect x="16" y="4" width="16" height="66" rx="7" fill="#388E3C"/>
    <rect x="18" y="4" width="12" height="64" rx="6" fill="#43A047"/>
    <!-- spine sx -->
    <line x1="15" y1="38" x2="7"  y2="35" stroke="#1B5E20" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="15" y1="44" x2="7"  y2="47" stroke="#1B5E20" stroke-width="1.5" stroke-linecap="round"/>
    <!-- spine dx -->
    <line x1="33" y1="30" x2="41" y2="27" stroke="#1B5E20" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="33" y1="36" x2="41" y2="39" stroke="#1B5E20" stroke-width="1.5" stroke-linecap="round"/>
    <!-- fiore in cima -->
    <circle cx="24" cy="6" r="6" fill="#E91E8C"/>
    <circle cx="24" cy="6" r="3.5" fill="#FCE4EC"/>
    <circle cx="24" cy="6" r="1.5" fill="#E91E8C"/>
  </svg>`;
}

function _gBamboo() {
  return `<svg viewBox="0 0 44 96" width="44" height="96" style="overflow:visible">
    <ellipse cx="22" cy="94" rx="12" ry="3.5" fill="rgba(0,0,0,0.1)"/>
    <!-- 3 canne -->
    <g class="g-bamboo-sway">
      <!-- canna sinistra -->
      <rect x="4"  y="8"  width="11" height="86" rx="5" fill="#558B2F"/>
      <line x1="4"  y1="22" x2="15" y2="22" stroke="#33691E" stroke-width="2"/>
      <line x1="4"  y1="40" x2="15" y2="40" stroke="#33691E" stroke-width="2"/>
      <line x1="4"  y1="58" x2="15" y2="58" stroke="#33691E" stroke-width="2"/>
      <line x1="4"  y1="76" x2="15" y2="76" stroke="#33691E" stroke-width="2"/>
      <!-- foglie sx -->
      <ellipse cx="3" cy="20" rx="10" ry="5" fill="#7CB342" transform="rotate(-30 3 20)"/>
      <ellipse cx="14" cy="38" rx="10" ry="5" fill="#8BC34A" transform="rotate(20 14 38)"/>
    </g>
    <!-- canna centrale (più alta) -->
    <rect x="17" y="0"  width="11" height="96" rx="5" fill="#689F38"/>
    <line x1="17" y1="14" x2="28" y2="14" stroke="#33691E" stroke-width="2"/>
    <line x1="17" y1="30" x2="28" y2="30" stroke="#33691E" stroke-width="2"/>
    <line x1="17" y1="48" x2="28" y2="48" stroke="#33691E" stroke-width="2"/>
    <line x1="17" y1="66" x2="28" y2="66" stroke="#33691E" stroke-width="2"/>
    <line x1="17" y1="82" x2="28" y2="82" stroke="#33691E" stroke-width="2"/>
    <ellipse cx="28" cy="12" rx="10" ry="5" fill="#8BC34A" transform="rotate(25 28 12)"/>
    <ellipse cx="17" cy="46" rx="10" ry="5" fill="#7CB342" transform="rotate(-20 17 46)"/>
    <!-- canna destra -->
    <rect x="30" y="12" width="11" height="84" rx="5" fill="#558B2F"/>
    <line x1="30" y1="26" x2="41" y2="26" stroke="#33691E" stroke-width="2"/>
    <line x1="30" y1="44" x2="41" y2="44" stroke="#33691E" stroke-width="2"/>
    <line x1="30" y1="62" x2="41" y2="62" stroke="#33691E" stroke-width="2"/>
    <line x1="30" y1="78" x2="41" y2="78" stroke="#33691E" stroke-width="2"/>
    <ellipse cx="42" cy="24" rx="10" ry="5" fill="#8BC34A" transform="rotate(30 42 24)"/>
    <ellipse cx="31" cy="60" rx="10" ry="5" fill="#7CB342" transform="rotate(-25 31 60)"/>
  </svg>`;
}

function _gBirdhouse() {
  return `<svg viewBox="0 0 58 72" width="58" height="72" style="overflow:visible">
    <ellipse cx="29" cy="70" rx="8" ry="3" fill="rgba(0,0,0,0.1)"/>
    <!-- palo -->
    <rect x="25" y="36" width="8" height="34" rx="3" fill="#795548"/>
    <!-- casetta - corpo -->
    <rect x="8" y="22" width="42" height="22" rx="4" fill="#EFEBE9"/>
    <rect x="10" y="23" width="38" height="20" rx="3" fill="#E0D5CD"/>
    <!-- casetta - tetto -->
    <polygon points="4,23 29,6 54,23" fill="#8D6E63"/>
    <polygon points="7,23 29,8 51,23" fill="#A1887F"/>
    <!-- buco ingresso -->
    <circle cx="29" cy="33" r="7" fill="#4E342E"/>
    <circle cx="29" cy="33" r="5.5" fill="#3E2723"/>
    <!-- righello -->
    <rect x="27" y="22" width="4" height="4" rx="1" fill="#795548"/>
    <!-- uccellino (animato) -->
    <g class="g-birdhouse-bird">
      <ellipse cx="29" cy="17" rx="5" ry="4" fill="#FF8F00"/>
      <circle  cx="29" cy="14" r="3.5"       fill="#FFA000"/>
      <path d="M32 13 L36 11 L34 14Z"          fill="#FFD54F"/>
      <circle  cx="27.5" cy="13.5" r="1.2"   fill="#1A1A1A"/>
    </g>
  </svg>`;
}

function _gWindmill() {
  return `<svg viewBox="0 0 68 88" width="68" height="88" style="overflow:visible">
    <ellipse cx="34" cy="86" rx="11" ry="4" fill="rgba(0,0,0,0.1)"/>
    <!-- torre -->
    <polygon points="27,84 41,84 38,36 30,36" fill="#BDBDBD"/>
    <polygon points="29,84 39,84 37,38 31,38" fill="#E0E0E0"/>
    <!-- porte/finestre -->
    <rect x="31" y="70" width="6" height="9" rx="3" fill="#795548"/>
    <rect x="32" y="52" width="4" height="4" rx="1" fill="#90A4AE"/>
    <!-- pale mulino (rotazione CSS) -->
    <g class="g-windmill-blades" transform-origin="34 36">
      <rect x="32" y="6"  width="4" height="28" rx="2" fill="#9E9E9E" transform="rotate(0  34 36)"/>
      <rect x="32" y="6"  width="4" height="28" rx="2" fill="#9E9E9E" transform="rotate(90 34 36)"/>
      <rect x="32" y="6"  width="4" height="28" rx="2" fill="#9E9E9E" transform="rotate(180 34 36)"/>
      <rect x="32" y="6"  width="4" height="28" rx="2" fill="#9E9E9E" transform="rotate(270 34 36)"/>
    </g>
    <circle cx="34" cy="36" r="5" fill="#E0E0E0"/>
    <circle cx="34" cy="36" r="3" fill="#9E9E9E"/>
  </svg>`;
}

function _gWaterfall() {
  return `<svg viewBox="0 0 78 92" width="78" height="92" style="overflow:visible">
    <ellipse cx="39" cy="90" rx="28" ry="5" fill="rgba(0,0,0,0.12)"/>
    <!-- rocce sfondo -->
    <ellipse cx="14" cy="52" rx="14" ry="12" fill="#78909C"/>
    <ellipse cx="64" cy="58" rx="13" ry="11" fill="#607D8B"/>
    <ellipse cx="39" cy="18" rx="28" ry="16" fill="#607D8B"/>
    <ellipse cx="39" cy="16" rx="24" ry="13" fill="#78909C"/>
    <!-- cascata acqua centrale -->
    <rect x="20" y="30" width="38" height="44" rx="4" fill="#42A5F5" opacity="0.5" class="g-waterfall-flow"/>
    <rect x="25" y="30" width="6"  height="44" rx="3" fill="#64B5F6" opacity="0.7" class="g-waterfall-flow"/>
    <rect x="46" y="30" width="6"  height="44" rx="3" fill="#64B5F6" opacity="0.7" class="g-waterfall-flow"/>
    <!-- schiuma in basso -->
    <ellipse cx="39" cy="76" rx="22" ry="8" fill="#E3F2FD" opacity="0.9"/>
    <ellipse cx="39" cy="75" rx="18" ry="6" fill="white" opacity="0.7"/>
    <!-- spruzzi -->
    <ellipse cx="24" cy="72" rx="5" ry="3" fill="white" opacity="0.55" class="g-waterfall-splash"/>
    <ellipse cx="52" cy="73" rx="5" ry="3" fill="white" opacity="0.55" class="g-waterfall-splash"/>
    <!-- laghetto -->
    <ellipse cx="39" cy="82" rx="26" ry="7" fill="#1565C0" opacity="0.45"/>
    <ellipse cx="39" cy="81" rx="20" ry="5" fill="#1E88E5" opacity="0.35"/>
  </svg>`;
}

function _gSwing() {
  return `<svg viewBox="0 0 74 68" width="74" height="68" style="overflow:visible">
    <ellipse cx="37" cy="66" rx="16" ry="3" fill="rgba(0,0,0,0.1)"/>
    <!-- pali laterali -->
    <rect x="6"  y="0" width="7" height="55" rx="3" fill="#8D6E63"/>
    <rect x="61" y="0" width="7" height="55" rx="3" fill="#8D6E63"/>
    <!-- traversa superiore -->
    <rect x="4"  y="0" width="66" height="8" rx="3" fill="#795548"/>
    <!-- corde e sedile (animati) -->
    <g class="g-swing-seat" transform-origin="37 4">
      <line x1="20" y1="8" x2="18" y2="42" stroke="#5D4037" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="54" y1="8" x2="56" y2="42" stroke="#5D4037" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="14" y="42" width="46" height="9" rx="4" fill="#A1887F"/>
      <rect x="16" y="43" width="42" height="6" rx="3" fill="#BCAAA4"/>
    </g>
    <!-- bambino seduto -->
    <g class="g-swing-seat" transform-origin="37 4">
      <circle cx="37" cy="34" r="8"  fill="#FFCC80"/>
      <ellipse cx="37" cy="44" rx="9" ry="8" fill="#42A5F5"/>
      <line x1="29" y1="46" x2="24" y2="54" stroke="#FFCC80" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="45" y1="46" x2="50" y2="54" stroke="#FFCC80" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="33" cy="31" r="2" fill="#5D4037"/>
      <circle cx="41" cy="31" r="2" fill="#5D4037"/>
      <path d="M34 36 Q37 38 40 36" fill="none" stroke="#795548" stroke-width="1.5" stroke-linecap="round"/>
    </g>
  </svg>`;
}

function _gBalloon() {
  return `<svg viewBox="0 0 88 102" width="88" height="102" style="overflow:visible">
    <!-- cesta -->
    <rect x="29" y="76" width="30" height="22" rx="5" fill="#A1887F"/>
    <rect x="31" y="77" width="26" height="20" rx="4" fill="#BCAAA4"/>
    <line x1="29" y1="77" x2="29" y2="98" stroke="#795548" stroke-width="2"/>
    <line x1="59" y1="77" x2="59" y2="98" stroke="#795548" stroke-width="2"/>
    <line x1="31" y1="84" x2="57" y2="84" stroke="#A1887F" stroke-width="1.2"/>
    <line x1="31" y1="90" x2="57" y2="90" stroke="#A1887F" stroke-width="1.2"/>
    <!-- corde -->
    <line x1="44" y1="76" x2="30" y2="62" stroke="#8D6E63" stroke-width="1.8"/>
    <line x1="44" y1="76" x2="58" y2="62" stroke="#8D6E63" stroke-width="1.8"/>
    <line x1="44" y1="76" x2="23" y2="58" stroke="#8D6E63" stroke-width="1.8"/>
    <line x1="44" y1="76" x2="65" y2="58" stroke="#8D6E63" stroke-width="1.8"/>
    <!-- pallone -->
    <ellipse cx="44" cy="38" rx="38" ry="40" fill="#EF5350"/>
    <!-- spicchi -->
    <path d="M44 0 Q60 20 44 76 Q28 20 44 0Z" fill="#FF8A65" opacity="0.6"/>
    <path d="M44 0 Q68 28 70 60 Q60 20 44 76 Q28 20 18 60 Q20 28 44 0Z" fill="transparent"/>
    <path d="M6 38  Q10 10 44 0  Q20 18 14 45Z"  fill="#FFCC02" opacity="0.55"/>
    <path d="M82 38 Q78 10 44 0  Q68 18 74 45Z"  fill="#AB47BC" opacity="0.55"/>
    <path d="M44 76 Q10 60 6  38  Q18 65 44 76Z" fill="#FFCC02" opacity="0.45"/>
    <path d="M44 76 Q78 60 82 38  Q70 65 44 76Z" fill="#AB47BC" opacity="0.45"/>
    <ellipse cx="30" cy="22" rx="10" ry="12" fill="rgba(255,255,255,0.2)"/>
  </svg>`;
}

function _gBall() {
  return `<svg viewBox="0 0 38 38" width="38" height="38" style="overflow:visible">
    <ellipse cx="19" cy="36" rx="10" ry="3" fill="rgba(0,0,0,0.12)"/>
    <circle cx="19" cy="19" r="17" fill="#E53935"/>
    <path d="M3,19 Q19,3 35,19" fill="none" stroke="white" stroke-width="2.5" opacity="0.65" stroke-linecap="round"/>
    <path d="M3,19 Q19,35 35,19" fill="none" stroke="white" stroke-width="2.5" opacity="0.65" stroke-linecap="round"/>
    <path d="M19,2 Q33,19 19,36" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="11" cy="10" rx="6" ry="5" fill="rgba(255,255,255,0.18)" transform="rotate(-30 11 10)"/>
  </svg>`;
}

function _gHole() {
  return `<svg viewBox="0 0 60 30" width="60" height="30" style="overflow:visible">
    <ellipse cx="47" cy="24" rx="13" ry="6.5" fill="#6D4C41" transform="rotate(-8 47 24)"/>
    <ellipse cx="44" cy="21" rx="9" ry="4.5" fill="#795548" transform="rotate(-4 44 21)"/>
    <circle cx="50" cy="18" r="3.5" fill="#8D6E63" opacity="0.7"/>
    <ellipse cx="26" cy="22" rx="22" ry="8" fill="#1A0D05"/>
    <ellipse cx="26" cy="20" rx="19" ry="7" fill="#110803"/>
    <ellipse cx="26" cy="19" rx="16" ry="5.5" fill="#080401"/>
    <path d="M4,22 Q14,13 26,14 Q38,13 48,22" fill="none" stroke="#5D4037" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function _gNest() {
  return `<svg viewBox="0 0 46 36" width="46" height="36" style="overflow:visible">
    <ellipse cx="23" cy="34" rx="12" ry="3.5" fill="rgba(0,0,0,0.1)"/>
    <!-- nido -->
    <path d="M4 30 Q5 16 23 14 Q41 16 42 30Z" fill="#8D6E63"/>
    <path d="M6 30 Q8 18 23 16 Q38 18 40 30Z" fill="#A1887F"/>
    <!-- intreccio ramoscelli -->
    <path d="M6 28 Q14 22 22 26" fill="none" stroke="#6D4C41" stroke-width="2" stroke-linecap="round"/>
    <path d="M40 28 Q32 22 24 26" fill="none" stroke="#6D4C41" stroke-width="2" stroke-linecap="round"/>
    <path d="M10 30 Q23 24 36 30" fill="none" stroke="#795548" stroke-width="1.5" stroke-linecap="round"/>
    <!-- uova -->
    <ellipse cx="16" cy="25" rx="6"   ry="5"   fill="#E3F2FD"/>
    <ellipse cx="23" cy="22" rx="6"   ry="5"   fill="#C8E6C9"/>
    <ellipse cx="30" cy="25" rx="5.5" ry="4.5" fill="#FFF9C4"/>
    <!-- macchiette sulle uova -->
    <circle cx="14" cy="24" r="1.2" fill="#90CAF9" opacity="0.6"/>
    <circle cx="22" cy="21" r="1.2" fill="#A5D6A7" opacity="0.6"/>
    <circle cx="28" cy="24" r="1.2" fill="#FFF176" opacity="0.6"/>
  </svg>`;
}

/* ══════════════════════════════════════════════
   MONGOLFIERA STELLATA (Ruolo: Studioso)
══════════════════════════════════════════════ */
function _gStarBalloon() {
  return `<svg viewBox="0 0 92 108" width="92" height="108" style="overflow:visible">
    <!-- scia stellare -->
    <ellipse cx="46" cy="108" rx="14" ry="4" fill="rgba(245,158,11,0.18)"/>
    <!-- cesta dorata -->
    <rect x="30" y="80" width="32" height="24" rx="6" fill="#92400E"/>
    <rect x="32" y="81" width="28" height="22" rx="5" fill="#D97706"/>
    <rect x="32" y="87" width="28" height="2" fill="#B45309" opacity="0.6"/>
    <rect x="32" y="93" width="28" height="2" fill="#B45309" opacity="0.6"/>
    <!-- corde dorate -->
    <line x1="46" y1="80" x2="28" y2="66" stroke="#F59E0B" stroke-width="1.8"/>
    <line x1="46" y1="80" x2="64" y2="66" stroke="#F59E0B" stroke-width="1.8"/>
    <line x1="46" y1="80" x2="20" y2="62" stroke="#F59E0B" stroke-width="1.5"/>
    <line x1="46" y1="80" x2="72" y2="62" stroke="#F59E0B" stroke-width="1.5"/>
    <!-- pallone gradiente oro -->
    <defs>
      <radialGradient id="sgBallGrad" cx="38%" cy="35%">
        <stop offset="0%"   stop-color="#FDE68A"/>
        <stop offset="45%"  stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </radialGradient>
    </defs>
    <ellipse cx="46" cy="40" rx="40" ry="42" fill="url(#sgBallGrad)"/>
    <!-- spicchi scuri -->
    <path d="M46 0 Q64 22 46 80 Q28 22 46 0Z" fill="rgba(180,83,9,0.28)"/>
    <path d="M6 40 Q12 8 46 0 Q18 20 12 48Z" fill="rgba(253,230,138,0.45)"/>
    <path d="M86 40 Q80 8 46 0 Q74 20 80 48Z" fill="rgba(253,230,138,0.35)"/>
    <!-- lucido -->
    <ellipse cx="30" cy="22" rx="12" ry="14" fill="rgba(255,255,255,0.22)"/>
    <!-- stelle decorative -->
    <text x="40" y="32" font-size="10" fill="rgba(255,255,255,0.85)" text-anchor="middle">★</text>
    <text x="56" y="48" font-size="7"  fill="rgba(255,255,255,0.70)" text-anchor="middle">✦</text>
    <text x="34" y="52" font-size="6"  fill="rgba(255,255,255,0.65)" text-anchor="middle">✦</text>
    <text x="52" y="24" font-size="8"  fill="rgba(255,255,255,0.75)" text-anchor="middle">★</text>
  </svg>`;
}

/* ══════════════════════════════════════════════
   CIELO DINAMICO — Sole che si muove con l'ora
   + Tema cielo per ruolo
══════════════════════════════════════════════ */

/* Palettes cielo per fascia oraria — mid = terzo stop gradiente opzionale */
const _SKY_TIMES = [
  { h:  0, top: '#080E1A', mid: null,      bot: '#162540',  night: true,  label: 'notte',    sunSize: 50, sunCore: null,       sunMid: null,      sunOuter: null,        glow1: null,                   glow2: null },
  { h:  5, top: '#1A1040', mid: null,      bot: '#3D1B6E',  night: true,  label: 'alba0',    sunSize: 50, sunCore: null,       sunMid: null,      sunOuter: null,        glow1: null,                   glow2: null },
  { h:  6, top: '#C2523C', mid: null,      bot: '#FF9A3C',  night: false, label: 'alba',     sunSize: 60, sunCore: '#FFECB3',  sunMid: '#FFB74D', sunOuter: '#E64A1988', glow1: 'rgba(255,152,0,0.22)', glow2: 'rgba(255,112,67,0.45)' },
  { h:  7, top: '#FF8A65', mid: null,      bot: '#FFCC80',  night: false, label: 'mattina0', sunSize: 54, sunCore: '#FFF9C4',  sunMid: '#FFCA28', sunOuter: '#FFCC0255', glow1: 'rgba(255,235,59,0.22)', glow2: 'rgba(255,200,0,0.38)' },
  { h:  8, top: '#42A5F5', mid: null,      bot: '#B3E5FC',  night: false, label: 'mattina',  sunSize: 50, sunCore: '#FFFDE7',  sunMid: '#FFE082', sunOuter: '#FFD60055', glow1: 'rgba(255,224,82,0.18)', glow2: 'rgba(253,216,53,0.32)' },
  { h: 12, top: '#1E88E5', mid: null,      bot: '#B3E5FC',  night: false, label: 'mezzodì',  sunSize: 48, sunCore: '#FFFDE7',  sunMid: '#FFD600', sunOuter: '#FDD83566', glow1: 'rgba(255,214,0,0.18)',  glow2: 'rgba(253,216,53,0.35)' },
  { h: 16, top: '#1565C0', mid: null,      bot: '#90CAF9',  night: false, label: 'pomeri',   sunSize: 52, sunCore: '#FFF8E1',  sunMid: '#FFCA28', sunOuter: '#FBC02D66', glow1: 'rgba(251,192,45,0.22)', glow2: 'rgba(253,216,53,0.38)' },
  { h: 17, top: '#1B5E8F', mid: '#E65100', bot: '#FFA000',  night: false, label: 'dorata',   sunSize: 64, sunCore: '#FFF3E0',  sunMid: '#FF8F00', sunOuter: '#E65100AA', glow1: 'rgba(255,143,0,0.38)', glow2: 'rgba(230,81,0,0.58)' },
  { h: 18, top: '#6A1B9A', mid: '#E91E63', bot: '#FF7043',  night: false, label: 'tramonto', sunSize: 74, sunCore: '#FFCCBC',  sunMid: '#FF6D00', sunOuter: '#BF360CCC', glow1: 'rgba(255,109,0,0.42)', glow2: 'rgba(191,54,12,0.68)' },
  { h: 19, top: '#311B92', mid: '#AD1457', bot: '#C62828',  night: false, label: 'crepusc',  sunSize: 68, sunCore: '#FFAB91',  sunMid: '#FF5722', sunOuter: '#BF360CCC', glow1: 'rgba(255,87,34,0.38)', glow2: 'rgba(191,54,12,0.55)' },
  { h: 20, top: '#0D0620', mid: '#2D1B6E', bot: '#4A148C',  night: true,  label: 'sera',     sunSize: 50, sunCore: null,       sunMid: null,      sunOuter: null,        glow1: null,                   glow2: null },
  { h: 21, top: '#080E1A', mid: null,      bot: '#162540',  night: true,  label: 'notte0',   sunSize: 50, sunCore: null,       sunMid: null,      sunOuter: null,        glow1: null,                   glow2: null },
];

/* Overlay ruolo sul cielo: tint addizionale */
const _SKY_ROLE_TINT = {
  novizio:     null,
  studente:    'rgba(59,130,246,0.22)',
  applicato:   'rgba(139,92,246,0.25)',
  determinato: 'rgba(249,115,22,0.25)',
  studioso:    'rgba(16,185,129,0.22)',
  esperto:     'rgba(6,182,212,0.25)',
  maestro:     'rgba(245,158,11,0.28)',
};

let _skyUpdateInterval = null;

function _getSkyPhase(hour) {
  let phase = _SKY_TIMES[0];
  for (const t of _SKY_TIMES) { if (hour >= t.h) phase = t; }
  return phase;
}

function _getSunPosition(hour, minute) {
  const t = hour + minute / 60;
  // Sole: alba 6h → affondata sotto l'orizzonte entro le 20h
  if (t < 6 || t > 20.5) return { x: 50, y: 400 };
  const elapsed = t - 6;
  const pct     = elapsed / 14; // 0→1 su 14h (6→20)
  const x       = 5 + pct * 84;
  // Arco parabolico ampio: 20px al culmine (13h), 230px all'orizzonte (6h/20h)
  const arc = 1 - (2 * pct - 1) ** 2;
  let y = 20 + (1 - arc) * 210;
  // Affondamento accelerato sotto l'orizzonte dopo le 18:30h
  if (t > 18.5) {
    const s = (t - 18.5) / 1.5; // 0→1 in 1.5h
    y += s * s * 300;
  }
  return { x, y };
}

function _getMoonPosition(hour, minute) {
  const t  = hour + minute / 60;
  const mt = t < 6 ? t + 24 : t; // 0-5h → 24-29h per il confronto continuo
  // Luna: sorge verso le 20:30h, tramonta verso le 6h del mattino
  if (mt < 20.5 || mt > 30) return { x: 50, y: 400 };
  const elapsed = mt - 20.5;
  const pct     = elapsed / 9.5; // 0→1 su 9.5h (20:30→6h)
  // X: da destra (86%) a sinistra (10%)
  const x   = 86 - pct * 76;
  const arc = 1 - (2 * pct - 1) ** 2;
  let y = 20 + (1 - arc) * 180; // 20px al culmine, 200px ai bordi
  // Salita da sotto all'inizio
  if (pct < 0.14) { const r = pct / 0.14; y += (1 - r) * (1 - r) * 260; }
  // Discesa sotto l'orizzonte alla fine
  if (pct > 0.86) { const s = (pct - 0.86) / 0.14; y += s * s * 260; }
  return { x, y };
}

function updateGardenSky() {
  const sky = document.querySelector('.g-sky');
  const sun = document.querySelector('.g-sun');
  const moon = document.querySelector('.g-moon');
  const stars = document.querySelector('.g-stars-container');
  if (!sky) return;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const phase = _getSkyPhase(h);

  // Cielo (3 stop se presente mid)
  sky.style.background = phase.mid
    ? `linear-gradient(180deg, ${phase.top} 0%, ${phase.mid} 48%, ${phase.bot} 100%)`
    : `linear-gradient(180deg, ${phase.top} 0%, ${phase.bot} 100%)`;

  // Tint ruolo (disattivabile dalle impostazioni)
  let tintEl = sky.querySelector('.g-sky-role-tint');
  const _skyTintEnabled = (typeof cfg === 'undefined') || cfg.skyRoleTint !== false;
  const roleKey = (typeof _shopCurrentRoleKey === 'function') ? _shopCurrentRoleKey() : 'novizio';
  const tint = _skyTintEnabled ? _SKY_ROLE_TINT[roleKey] : null;
  if (tint) {
    if (!tintEl) {
      tintEl = document.createElement('div');
      tintEl.className = 'g-sky-role-tint';
      tintEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;transition:background 3s ease';
      sky.appendChild(tintEl);
    }
    tintEl.style.background = tint;
  } else if (tintEl) {
    tintEl.style.background = 'transparent';
  }

  // Sole e Luna — dinamici, possono coesistere durante la transizione tramonto/notte
  const SKY_H   = sky.offsetHeight || 314;
  const sunPos  = _getSunPosition(h, m);
  const moonPos = _getMoonPosition(h, m);

  if (sun) {
    const sunVis = sunPos.y < SKY_H && !phase.night;
    sun.style.display = sunVis ? 'block' : 'none';
    if (sunVis) {
      const size = phase.sunSize || 50;
      sun.style.left   = `calc(${sunPos.x}% - ${size/2}px)`;
      sun.style.top    = sunPos.y + 'px';
      sun.style.right  = 'auto';
      sun.style.width  = size + 'px';
      sun.style.height = size + 'px';
      if (phase.sunCore) {
        sun.style.background = `radial-gradient(circle, ${phase.sunCore} 0%, ${phase.sunMid} 45%, ${phase.sunOuter || phase.sunMid+'44'} 100%)`;
        sun.style.boxShadow  = `0 0 0 ${Math.round(size*0.22)}px ${phase.glow1 || 'rgba(253,216,53,0.12)'}, 0 0 ${size*1.1}px ${phase.glow2 || 'rgba(253,216,53,0.4)'}`;
      }
      _updateSunHaze(sky, phase, sunPos, size);
    } else {
      _updateSunHaze(sky, null);
    }
  }

  if (moon) {
    const moonVis = moonPos.y < SKY_H;
    moon.style.display = moonVis ? 'block' : 'none';
    if (moonVis) {
      const mSize = 44;
      moon.style.position = 'absolute';
      moon.style.left     = `calc(${moonPos.x}% - ${mSize/2}px)`;
      moon.style.top      = moonPos.y + 'px';
      moon.style.right    = 'auto';
      moon.style.width    = mSize + 'px';
      moon.style.height   = mSize + 'px';
    }
  }

  if (stars) stars.style.display = phase.night ? 'block' : 'none';
}

function _updateSunHaze(sky, phase, pos, size) {
  let haze = sky.querySelector('.g-sun-haze');
  if (!phase || !phase.glow2 || (phase.h < 17)) {
    if (haze) haze.style.opacity = '0';
    return;
  }
  if (!haze) {
    haze = document.createElement('div');
    haze.className = 'g-sun-haze';
    sky.appendChild(haze);
  }
  const hazeSize = size * 3.5;
  haze.style.width   = hazeSize + 'px';
  haze.style.height  = hazeSize + 'px';
  haze.style.left    = `calc(${pos.x}% - ${hazeSize/2}px)`;
  haze.style.top     = (pos.y - hazeSize/2 + size/2) + 'px';
  haze.style.background = `radial-gradient(circle, ${phase.glow2} 0%, ${phase.glow1} 40%, transparent 70%)`;
  haze.style.opacity = '1';
}

function initGardenSky() {
  updateGardenSky();
  _skyUpdateInterval = setInterval(updateGardenSky, 30000);
  _fetchGardenWeather();
  setInterval(_fetchGardenWeather, 30 * 60 * 1000);
}

function destroyGardenSky() {
  if (_skyUpdateInterval) { clearInterval(_skyUpdateInterval); _skyUpdateInterval = null; }
}

/* ══════════════════════════════════════
   METEO REALE — Open-Meteo (no API key)
═══════════════════════════════════════ */
const _WEATHER_KEY = 'sf_weather_cache';
const _WEATHER_TTL = 30 * 60 * 1000;

async function _fetchGardenWeather() {
  try {
    const cached = JSON.parse(localStorage.getItem(_WEATHER_KEY) || 'null');
    if (cached && (Date.now() - cached.ts) < _WEATHER_TTL) {
      _applyGardenWeather(cached.data); return;
    }
  } catch {}

  let lat = 41.9, lon = 12.5; // fallback Roma
  try {
    await new Promise(res => navigator.geolocation.getCurrentPosition(
      p => { lat = p.coords.latitude; lon = p.coords.longitude; res(); },
      () => res(), { timeout: 3000 }
    ));
  } catch {}

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=weathercode,precipitation,cloudcover&timezone=auto`;
    const r   = await fetch(url);
    const d   = await r.json();
    const data = { code: d.current?.weathercode || 0, precip: d.current?.precipitation || 0, clouds: d.current?.cloudcover || 0 };
    try { localStorage.setItem(_WEATHER_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
    _applyGardenWeather(data);
  } catch {}
}

function _applyGardenWeather(data) {
  const sky = document.querySelector('.g-sky');
  if (!sky) return;
  sky.querySelectorAll('.g-weather-overlay, .g-rain-layer, .g-storm-layer').forEach(el => el.remove());
  if (window._gStormInterval) { clearInterval(window._gStormInterval); window._gStormInterval = null; }

  const isStorm    = data.code >= 95;
  const isRaining  = !isStorm && (data.code >= 51 || data.precip > 0.1);
  const isOvercast = !isStorm && !isRaining && data.clouds > 70;

  if (!document.getElementById('g-rain-style')) {
    const s = document.createElement('style');
    s.id = 'g-rain-style';
    s.textContent =
      '@keyframes gRainFall{0%{transform:rotate(12deg) translateY(-10%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:rotate(12deg) translateY(130%);opacity:0}}' +
      '@keyframes gFlash{0%{opacity:0}8%{opacity:1}18%{opacity:0}26%{opacity:.7}36%{opacity:0}100%{opacity:0}}' +
      '@keyframes gBoltIn{0%{opacity:0;transform:scaleY(0.4)}15%{opacity:1;transform:scaleY(1)}80%{opacity:1}100%{opacity:0}}';
    document.head.appendChild(s);
  }

  if (isStorm) {
    /* overlay molto scuro */
    const dark = document.createElement('div');
    dark.className = 'g-weather-overlay';
    dark.style.cssText = 'position:absolute;inset:0;background:rgba(20,25,45,0.52);border-radius:inherit;pointer-events:none;z-index:2';
    sky.appendChild(dark);

    /* pioggia intensa */
    const rain = document.createElement('div');
    rain.className = 'g-rain-layer';
    rain.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:3';
    let drops = '';
    for (let i = 0; i < 70; i++) {
      const x   = (Math.random() * 120 - 10).toFixed(1);
      const dur  = (0.38 + Math.random() * 0.38).toFixed(2);
      const del  = (Math.random() * 1.5).toFixed(2);
      const op   = (0.35 + Math.random() * 0.45).toFixed(2);
      const h    = Math.round(10 + Math.random() * 12);
      drops += `<div style="position:absolute;left:${x}%;top:-12%;width:1.5px;height:${h}px;background:rgba(190,215,255,${op});border-radius:1px;animation:gRainFall ${dur}s ${del}s linear infinite"></div>`;
    }
    rain.innerHTML = drops;
    sky.appendChild(rain);

    /* layer fulmini */
    const stormLayer = document.createElement('div');
    stormLayer.className = 'g-storm-layer';
    stormLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:4';
    sky.appendChild(stormLayer);

    function _spawnLightning() {
      if (!stormLayer.isConnected) return;
      /* flash schermo */
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:rgba(220,230,255,0.55);animation:gFlash 0.7s ease forwards;pointer-events:none';
      stormLayer.appendChild(flash);
      setTimeout(() => flash.remove(), 700);

      /* saetta SVG */
      const x = 15 + Math.random() * 70;
      const bolt = document.createElement('div');
      bolt.style.cssText = `position:absolute;left:${x.toFixed(1)}%;top:0;width:18px;animation:gBoltIn 0.65s ease forwards;transform-origin:top center`;
      bolt.innerHTML = `<svg viewBox="0 0 18 48" width="18" height="48" fill="none">
        <polygon points="10,0 3,26 9,26 6,48 16,18 10,18" fill="#FFE44D" stroke="#FFF9C4" stroke-width="0.8" stroke-linejoin="round"/>
      </svg>`;
      stormLayer.appendChild(bolt);
      setTimeout(() => bolt.remove(), 650);
    }

    /* primo fulmine subito, poi a intervalli casuali 4-12s */
    setTimeout(_spawnLightning, 600 + Math.random() * 1200);
    window._gStormInterval = setInterval(() => {
      if (!stormLayer.isConnected) { clearInterval(window._gStormInterval); return; }
      _spawnLightning();
      /* doppio lampo occasionale */
      if (Math.random() < 0.3) setTimeout(_spawnLightning, 300);
    }, 4000 + Math.random() * 8000);

  } else if (isRaining) {
    const overlay = document.createElement('div');
    overlay.className = 'g-weather-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(55,75,105,0.28);border-radius:inherit;pointer-events:none;z-index:2';
    sky.appendChild(overlay);

    const rain = document.createElement('div');
    rain.className = 'g-rain-layer';
    rain.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:3';
    let drops = '';
    for (let i = 0; i < 45; i++) {
      const x   = (Math.random() * 110 - 5).toFixed(1);
      const dur  = (0.55 + Math.random() * 0.55).toFixed(2);
      const del  = (Math.random() * 2).toFixed(2);
      const op   = (0.28 + Math.random() * 0.38).toFixed(2);
      const h    = Math.round(7 + Math.random() * 9);
      drops += `<div style="position:absolute;left:${x}%;top:-12%;width:1.5px;height:${h}px;background:rgba(190,215,255,${op});border-radius:1px;animation:gRainFall ${dur}s ${del}s linear infinite"></div>`;
    }
    rain.innerHTML = drops;
    sky.appendChild(rain);

  } else if (isOvercast) {
    const overlay = document.createElement('div');
    overlay.className = 'g-weather-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(110,120,140,0.22);border-radius:inherit;pointer-events:none;z-index:2';
    sky.appendChild(overlay);
  }
}
