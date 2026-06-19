/* =====================================================
   COINS.JS — Monete, achievements, sfide, effetti, shop
   Dipende da: shared.js
   ===================================================== */

const COIN_KEY = 'sf_coins';
let _shopDisabledItems = [];
try { const _c = sessionStorage.getItem('_sfDisabled'); if (_c) _shopDisabledItems = JSON.parse(_c); } catch {}
async function _loadShopDisabled() {
  try {
    const _base = (typeof SF_API_BASE !== 'undefined' && SF_API_BASE) ? SF_API_BASE : '/api';
    const api = _base + '/config';
    const r = await fetch(api);
    const cfg = await r.json();
    _shopDisabledItems = JSON.parse(cfg.shop_disabled_items || '[]');
    try { sessionStorage.setItem('_sfDisabled', JSON.stringify(_shopDisabledItems)); } catch {}
  } catch { _shopDisabledItems = []; }
}

/* Ruolo — costanti globali usate da buyItem, renderShopPage, initCoins */
/* ── Sistema slot dinamico compagni ──────────────────── */
const _GND_SLOT_ORDER = ['cat','dog','rabbit','fox','raccoon','lion','dragon'];
const _SLOT_BASE_RIGHT = 24;
const _SLOT_WIDTH      = 112; // 92px + 20px gap

function _companionSlotRight(id) {
  try {
    const ae = (typeof coinData !== 'undefined' ? coinData : null)?.activeEffects || {};
    const vis = {
      cat: ae.catVisible, dog: ae.dogVisible, rabbit: ae.rabbitVisible,
      fox: ae.foxVisible, raccoon: ae.raccoonVisible,
      lion: ae.lionVisible, dragon: ae.dragonVisible
    };
    const myIdx = _GND_SLOT_ORDER.indexOf(id);
    if (myIdx < 0) return _SLOT_BASE_RIGHT;
    let slot = 0;
    for (let i = 0; i < myIdx; i++) if (vis[_GND_SLOT_ORDER[i]]) slot++;
    return _SLOT_BASE_RIGHT + slot * _SLOT_WIDTH;
  } catch { return _SLOT_BASE_RIGHT; }
}

function repositionAllCompanions() {
  const pairs = [
    ['dog',    () => { if(typeof _stopDogWalking==='function') _stopDogWalking(); if(typeof _dogGoHome==='function') _dogGoHome(900); }],
    ['rabbit', () => { if(typeof _stopRabbit==='function') _stopRabbit(); if(typeof _goRabbitHome==='function') _goRabbitHome(900); }],
    ['fox',    () => { if(typeof _stopFoxWalking==='function') _stopFoxWalking(); if(typeof _foxGoHome==='function') _foxGoHome(900); }],
    ['raccoon',() => { if(typeof _stopRaccoonWalking==='function') _stopRaccoonWalking(); if(typeof _raccoonGoHome==='function') _raccoonGoHome(900); }],
    ['lion',   () => { if(typeof _stopLionWalking==='function') _stopLionWalking(); if(typeof _lionGoHome==='function') _lionGoHome(900); }],
    ['dragon', () => { if(typeof _stopDragonWalking==='function') _stopDragonWalking(); if(typeof _dragonGoHome==='function') _dragonGoHome(900); }],
  ];
  try {
    const ae = coinData?.activeEffects || {};
    const vis = { dog:ae.dogVisible, rabbit:ae.rabbitVisible, fox:ae.foxVisible, raccoon:ae.raccoonVisible, lion:ae.lionVisible, dragon:ae.dragonVisible };
    pairs.forEach(([id, fn]) => { if (vis[id]) fn(); });
  } catch {}
}

const _ROLE_ORDER = ['novizio','studente','applicato','determinato','studioso','esperto','maestro'];
const _ROLE_MINS  = {novizio:0,studente:1,applicato:10,determinato:25,studioso:50,esperto:100,maestro:200};
const _ROLE_META  = {
  novizio:     { color:'#6b7280', emoji:'🌱', name:'Novizio' },
  studente:    { color:'#3b82f6', emoji:'📖', name:'Studente' },
  applicato:   { color:'#8b5cf6', emoji:'🎯', name:'Applicato' },
  determinato: { color:'#f97316', emoji:'🔥', name:'Determinato' },
  studioso:    { color:'#10b981', emoji:'⭐', name:'Studioso' },
  esperto:     { color:'#06b6d4', emoji:'💎', name:'Esperto' },
  maestro:     { color:'#f59e0b', emoji:'🏆', name:'Maestro' },
};
function _shopCurrentRoleKey() {
  let n = 0; try { n = (JSON.parse(localStorage.getItem('sf_sessions')||'[]')||[]).length; } catch {}
  let autoKey = 'novizio';
  for (const k of _ROLE_ORDER) { if (n >= _ROLE_MINS[k]) autoKey = k; }
  // L'override è un MINIMO: se le sessioni superano il ruolo forzato, si usa quello più alto
  const ov = localStorage.getItem('sf_role_override');
  if (!ov || ov === 'auto' || ov === '') return autoKey;
  const autoIdx = _ROLE_ORDER.indexOf(autoKey);
  const ovIdx   = _ROLE_ORDER.indexOf(ov);
  return (ovIdx > autoIdx) ? ov : autoKey;
}

const SHOP_ITEMS = [
  /* ── Compagni ── */
  { id:'cat',        name:'Gatto Compagno',    desc:'Un gattino che cammina per la pagina mentre studi!', price:50,  type:'companion' },
  { id:'cat4legs',   name:'Gatto Cartoon',      desc:'Sblocca il gatto cartoon animato al posto di quello SVG!', price:200, type:'companion', req:'cat' },
  { id:'catWhite',   name:'Gatto Bianco',      desc:'Colora il gatto di bianco elegante.',                price:40,  type:'catcolor',  req:'cat' },
  { id:'catBlack',   name:'Gatto Nero',        desc:'Colora il gatto di un nero misterioso.',             price:50,  type:'catcolor',  req:'cat' },
  { id:'catGrey',    name:'Gatto Grigio',      desc:'Colora il gatto di un grigio soft.',                 price:30,  type:'catcolor',  req:'cat' },
  { id:'dog',       name:'Cagnolino',         desc:'Un cagnolino fedele che ti segue mentre studi!',      price:250, type:'companion' },
  { id:'dogGolden', name:'Pelo Dorato',        desc:'Colore golden retriever luminoso.',                   price:60,  type:'dogcolor',  req:'dog' },
  { id:'dogBlack',  name:'Pelo Nero',          desc:'Elegante pelo nero corvino.',                         price:60,  type:'dogcolor',  req:'dog' },
  { id:'dogWhite',  name:'Pelo Bianco',        desc:'Soffice pelo bianco candido.',                        price:50,  type:'dogcolor',  req:'dog' },
  { id:'campfire',  name:'Falò dello Studio',  desc:'Un fuoco crepitante per le serate di studio.',        price:150, type:'ambient'   },
  { id:'rabbit',    name:'Coniglietto',        desc:'Un coniglietto bianco che salta e gironzola mentre studi!', price:180, type:'companion' },
  { id:'rabbitBrown', name:'Pelo Marrone',     desc:'Un coniglietto marrone e soffice.', price:35, type:'rabbitcolor', req:'rabbit' },
  { id:'rabbitGrey',  name:'Pelo Grigio',      desc:'Un elegante coniglietto grigio cenere.', price:35, type:'rabbitcolor', req:'rabbit' },
  { id:'rabbitBlack', name:'Pelo Nero',        desc:'Un coniglietto nero misterioso.', price:40, type:'rabbitcolor', req:'rabbit' },
  { id:'raccoon',   name:'Procione 🦝',        desc:'Un procione astuto con la coda a strisce che gironzola furtivo mentre studi!', price:280, type:'companion' },
  { id:'parrot',    name:'Pappagallo',         desc:'Un pappagallo colorato che vola e si appollaia sulla pagina!', price:220, type:'companion' },
  { id:'fox',       name:'Volpe',              desc:'Una volpe arancione con la grande coda soffice che gironzola mentre studi!', price:200, type:'companion' },
  { id:'owl',       name:'Gufo',               desc:'Un gufo saggio con grandi occhi gialli che si appollaia e vola occasionalmente.', price:190, type:'companion' },
  { id:'lion',      name:'Leone 🦁',           desc:'Il re della savana! Un leone adorabile che cammina regale mentre studi.', price:400, type:'companion' },
  /* ── Casette animali ── */
  { id:'catHouse',    name:'Casetta Gatto',       desc:'Una casetta dove il gatto dorme al sicuro — appare solo quando riposa!',   price:80, type:'house', req:'cat'    },
  { id:'dogHouse',    name:'Casetta Cagnolino',   desc:'Una casetta accogliente per il cagnolino — visibile solo quando dorme.',   price:80, type:'house', req:'dog'    },
  { id:'rabbitHouse', name:'Casetta Coniglietto', desc:'Un rifugio caldo per il coniglietto — appare quando si riposa.',           price:70, type:'house', req:'rabbit' },
  { id:'raccoonHouse', name:'Tana del Procione',  desc:'Un tronco cavo dove il procione si nasconde quando dorme.',                   price:80, type:'house', req:'raccoon' },
  { id:'parrotHouse', name:'Posatoi Pappagallo',  desc:'Un elegante posatoi dove il pappagallo riposa — sparisce in volo.',       price:70, type:'house', req:'parrot' },
  { id:'foxHouse',    name:'Casetta Volpe',        desc:'Una casetta arancione per la volpe — visibile solo quando dorme.',        price:80, type:'house', req:'fox'    },
  { id:'owlHouse',    name:'Posatoi Gufo',         desc:'Un ramo di legno dove il gufo si appollaia — sparisce quando vola.',      price:70, type:'house', req:'owl'    },
  { id:'lionHouse',   name:'Grotta del Leone',    desc:'Una grotta rocciosa dove il leone riposa — appare solo quando dorme.',       price:90, type:'house', req:'lion'   },
  /* ── Effetti ── */
  { id:'stars',      name:'Stelle Cadenti',    desc:'Stelle che cadono sullo sfondo.',                    price:30,  type:'effect' },
  { id:'bubbles',    name:'Bolle di Sapone',   desc:'Bolle che salgono mentre sei in sessione.',          price:30,  type:'effect' },
  { id:'soundCafe',  name:'Suono Cafe',        desc:'Chiacchiericcio e musica da caffetteria.',           price:40,  type:'sound' },
  { id:'soundOcean', name:'Onde del Mare',     desc:'Suono rilassante delle onde del mare.',              price:40,  type:'sound' },
  { id:'soundForest',name:'Foresta',           desc:'Uccelli, vento tra gli alberi, natura.',             price:40,  type:'sound' },
  { id:'themeNight', name:'Tema Notte',        desc:'Modalita scura per studiare la sera.',               price:80,  type:'theme' },
  { id:'themeSunset',name:'Tema Tramonto',     desc:'Caldi colori arancio e rosa del tramonto.',          price:80,  type:'theme' },
  { id:'glow',       name:'Timer Glow',        desc:'Il ring del timer splende intensamente.',            price:60,  type:'timer' },
  { id:'pulsePro',   name:'Pulse Pro',         desc:'Pulsazione ritmica mentre sei in focus.',            price:60,  type:'timer' },
  /* ── Giardino 🌿 ── */
  { id:'tree',       name:'Albero',            desc:'Un albero frondoso sempreverde per il tuo giardino.',   price:80,  type:'garden' },
  { id:'cherryTree', name:'Ciliegio in Fiore', desc:'Un ciliegio rosa, sboccia mentre studi!',               price:120, type:'garden' },
  { id:'mushroom',   name:'Funghetti Magici',  desc:'Funghetti rossi a pallini bianchi, che carini!',         price:40,  type:'garden' },
  { id:'fountain',   name:'Fontana',           desc:'Una fontana con acqua fresca che scorre e brilla.',      price:180, type:'garden' },
  { id:'bench',      name:'Panchina',          desc:'Una panchina di legno dove riposarsi tra una sessione e l\'altra.', price:90, type:'garden' },
  { id:'rainbow',    name:'Arcobaleno',        desc:'Un arcobaleno colorato che spunta dopo la pioggia.',     price:100, type:'garden' },
  { id:'butterfly',  name:'Farfalle',          desc:'Farfalle arancio che volano felici nel giardino.',       price:60,  type:'garden' },
  { id:'pond',       name:'Laghetto con Ninfee',desc:'Un laghetto sereno con fiori di loto e riflessi.',     price:150, type:'garden' },
  { id:'lantern',    name:'Lanterna',          desc:'Una lanterna arancio che illumina il giardino di sera.', price:70,  type:'garden' },
  { id:'cactus',    name:'Cactus',            desc:'Un cactus con fiore rosa — indistruttibile, come la tua determinazione!', price:35, type:'garden' },
  { id:'bamboo',    name:'Bambù',             desc:'Canne di bambù che oscillano elegantemente nella brezza.', price:55, type:'garden' },
  { id:'birdhouse', name:'Casetta Uccelli',   desc:'Un uccellino giallo che entra ed esce dalla sua casetta!', price:110, type:'garden' },
  { id:'windmill',  name:'Mulino a Vento',    desc:'Le pale girano continuamente — energia pulita in giardino.', price:95, type:'garden' },
  { id:'waterfall', name:'Cascata',           desc:'Acqua che scorre fresca su rocce muschiose. Suono rilassante.', price:160, type:'garden' },
  { id:'swing',     name:'Altalena',          desc:'Una bambina sull\'altalena che dondola su e giù.', price:80, type:'garden' },
  { id:'balloon',   name:'Mongolfiera',       desc:'Una mongolfiera colorata che fluttua lentamente nel cielo.', price:130, type:'garden' },
  { id:'nest',      name:'Nido con Uova',     desc:'Un nido accogliente con tre uova colorate. Quasi come a casa!', price:45, type:'garden' },
  { id:'ball',      name:'Pallina Rossa',     desc:'Una pallina rossa da gioco — il cane la inseguirà felice!',     price:40, type:'garden' },
  { id:'hole',      name:'Tana nel Prato',    desc:'Una tana scavata nel terreno — la volpe non vede l\'ora di esplorarla!', price:50, type:'garden' },

  { id:'dragonHouse', name:'Tana del Drago 🐉',  desc:'Una grotta viola con stalattiti dove il drago riposa — solo per Maestri.',    price:0, type:'house', req:'dragon', roleRequired:'maestro' },
  /* ── Esclusivi di Ruolo (gratis, guadagnati studiando) ── */
  { id:'rabbitOrange', name:'Pelo Arancione ✨',    desc:'Una rara variante arancio solare del coniglietto — animazioni speciali esclusive!',          price:0, type:'rabbitcolor',  req:'rabbit',    roleRequired:'determinato' },
  { id:'dogPurple',    name:'Pelo Viola 💜',          desc:'Colore viola elettrico unico nel gioco — nessun altro cane sarà come il tuo.',                price:0, type:'dogcolor',     req:'dog',       roleRequired:'studioso' },
  { id:'starBalloon',  name:'Mongolfiera Stellata 🌟', desc:'Mongolfiera dorata con scia di stelle e polvere cosmica. Rara, solo per gli Studiosi.',       price:0, type:'garden',                        roleRequired:'studioso' },
  { id:'catSilver',    name:'Gatto Argento 🤍',       desc:'Mantello argento metallizzato, raffinato e raro. Solo gli Esperti possono sbloccarlo.',        price:0, type:'catcolor',    req:'cat',       roleRequired:'esperto' },
  { id:'aurora',       name:'Aurora Boreale 🌌',      desc:'Luci danzanti verdi e viola sullo sfondo mentre studi. Ipnotico ed esclusivo.',                price:0, type:'effect',                        roleRequired:'esperto' },
  { id:'dragon',       name:'Drago 🐉',               desc:'Il compagno più raro. Un drago che vola e cammina mentre studi. Solo i Maestri.',              price:0, type:'companion',                     roleRequired:'maestro' },
  { id:'themeGold',    name:'Tema Oro ✨',             desc:'Interfaccia dorata lussuosa esclusiva per i Maestri. Tutto si illumina d\'oro.',               price:0, type:'theme',                         roleRequired:'maestro' },
];

const ACHIEVEMENTS = [
  { id:'first_session',  name:'Prima Sessione!',   desc:'Completa la tua prima sessione Pomodoro',    coins:10,  icon:'play',         check: (c) => c.totalSessions >= 1 },
  { id:'sessions_10',    name:'Focus Intenso',     desc:'10 sessioni Pomodoro completate',             coins:30,  icon:'zap',          check: (c) => c.totalSessions >= 10 },
  { id:'sessions_50',    name:'Maestro del Focus', desc:'50 sessioni completate, sei imbattibile!',    coins:100, icon:'award',        check: (c) => c.totalSessions >= 50 },
  { id:'streak_3',       name:'3 Giorni di Fila',  desc:'Studia per 3 giorni consecutivi',             coins:25,  icon:'trending-up',  check: (c) => (c.bestStreak || 0) >= 3 },
  { id:'streak_7',       name:'Una Settimana!',    desc:'Studia per 7 giorni di fila',                 coins:50,  icon:'star',         check: (c) => (c.bestStreak || 0) >= 7 },
  { id:'tasks_20',       name:'Task Hunter',       desc:'Completa 20 task in totale',                  coins:40,  icon:'check-square', check: (c) => (c.tasksCompleted || 0) >= 20 },
  { id:'hours_5',        name:'5 Ore di Studio',   desc:'Accumula 5 ore di studio totale',             coins:60,  icon:'clock',        check: (c) => (c.totalMinutes || 0) >= 300 },
  { id:'challenge_done', name:'Prima Sfida!',      desc:'Completa la tua prima sfida del giorno',      coins:20,  icon:'target',       check: (c) => (c.challengesCompleted || 0) >= 1 },
];

const CHALLENGES = [
  { id:'sessions_3',    text:'Completa 3 sessioni Pomodoro oggi',  reward:30, key:'sessionsToday',   target:3 },
  { id:'tasks_5',       text:'Finisci 5 task oggi',                reward:25, key:'tasksToday',      target:5 },
  { id:'study_60min',   text:'Studia per 60 minuti oggi',          reward:20, key:'minutesToday',    target:60 },
  { id:'streak_keep',   text:'Studia almeno 1 sessione oggi',      reward:15, key:'sessionsToday',   target:1 },
  { id:'study_tasks_3', text:'Completa 3 task di studio',          reward:20, key:'studyTasksToday', target:3 },
];

let coinData = {
  balance: 0,
  totalEarned: 0,
  totalSessions: 0,
  totalMinutes: 0,
  tasksCompleted: 0,
  challengesCompleted: 0,
  achievements: [],
  shop: {},
  activeEffects: { stars:false, bubbles:false, catVisible:false, activeSound:'', glow:false, pulsePro:false, cat4legs:false, dogVisible:false, activeDogColor:'', campfire:false, rabbitVisible:false, activeRabbitColor:'', parrotVisible:false, foxVisible:false, owlVisible:false, lionVisible:false, giraffeVisible:false, raccoonVisible:false, dragonVisible:false, gardenActive:{}, catHouseVisible:false, dogHouseVisible:false, rabbitHouseVisible:false, parrotHouseVisible:false, foxHouseVisible:false, owlHouseVisible:false, lionHouseVisible:false, giraffeHouseVisible:false, raccoonHouseVisible:false, dragonHouseVisible:false },
  challenge: null,
  challengeDate: '',
  challengeProgress: 0,
  rewardedTaskIds: [],   // ID dei task già premiati (evita doppi premi)
  taskCoinDate:    '',   // giorno corrente per il contatore giornaliero
  taskCoinToday:   0,    // quanti task hanno dato monete oggi
};

/* ── Icone inline SVG per achievement ── */
const ACHIEV_ICON_PATHS = {
  'play':        `<polygon points="5 3 19 12 5 21 5 3"/>`,
  'zap':         `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  'award':       `<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>`,
  'trending-up': `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  'star':        `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  'check-square':`<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
  'clock':       `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  'target':      `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
};
function _achievIcon(name) {
  const d = ACHIEV_ICON_PATHS[name] || ACHIEV_ICON_PATHS['star'];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

/* ── Icone inline SVG per lo shop ── */
const SHOP_ICONS = {
  companion:   `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  catcolor:    `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>`,
  dogcolor:    `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>`,
  rabbitcolor: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>`,
  ambient:   `<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="4"/>`,
  effect:    `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  sound:     `<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>`,
  theme:     `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
  timer:     `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  garden:    `<path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6h.01M12 2v4"/><path d="M16 6h.01"/><path d="M8 6c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.1-2 4-4 4S8 7.1 8 6z"/>`,
  house:     `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
};

function _shopIcon(type) {
  const d = SHOP_ICONS[type] || SHOP_ICONS.effect;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

/* ── Persistenza ── */
function loadCoinData() {
  try {
    const d = JSON.parse(localStorage.getItem(COIN_KEY) || '{}');
    Object.assign(coinData, d);
    coinData.shop          = coinData.shop || {};
    coinData.achievements  = coinData.achievements || [];
    coinData.activeEffects    = Object.assign(
      { stars:false, bubbles:false, catVisible:false, activeSound:'', glow:false, pulsePro:false, cat4legs:false, dogVisible:false, activeDogColor:'', campfire:false, rabbitVisible:false, activeRabbitColor:'', parrotVisible:false, foxVisible:false, owlVisible:false, lionVisible:false, giraffeVisible:false, raccoonVisible:false, dragonVisible:false, gardenActive:{}, catHouseVisible:false, dogHouseVisible:false, rabbitHouseVisible:false, parrotHouseVisible:false, foxHouseVisible:false, owlHouseVisible:false, lionHouseVisible:false, giraffeHouseVisible:false, raccoonHouseVisible:false, dragonHouseVisible:false },
      coinData.activeEffects || {}
    );
    coinData.rewardedTaskIds  = coinData.rewardedTaskIds || [];
    coinData.taskCoinDate     = coinData.taskCoinDate    || '';
    coinData.taskCoinToday    = coinData.taskCoinToday   || 0;
  } catch {}
  // Azzera item disabilitati dall'admin
  if (_shopDisabledItems.length) {
    const _ae = coinData.activeEffects;
    const _DM = {
      cat:'catVisible', dog:'dogVisible', rabbit:'rabbitVisible', fox:'foxVisible',
      raccoon:'raccoonVisible', parrot:'parrotVisible', owl:'owlVisible',
      lion:'lionVisible', dragon:'dragonVisible',
      catHouse:'catHouseVisible', dogHouse:'dogHouseVisible', rabbitHouse:'rabbitHouseVisible',
      foxHouse:'foxHouseVisible', raccoonHouse:'raccoonHouseVisible', parrotHouse:'parrotHouseVisible',
      owlHouse:'owlHouseVisible', lionHouse:'lionHouseVisible', dragonHouse:'dragonHouseVisible',
      stars:'stars', bubbles:'bubbles', campfire:'campfire', aurora:'aurora',
      glow:'glow', pulsePro:'pulsePro', cat4legs:'cat4legs',
    };
    _shopDisabledItems.forEach(id => { const k = _DM[id]; if (k && _ae[k]) _ae[k] = false; });
  }
}

function saveCoinData() {
  localStorage.setItem(COIN_KEY, JSON.stringify(coinData));
}

/* ── Guadagna monete ── */
function earnCoins(amount) {
  loadCoinData();
  coinData.balance     += amount;
  coinData.totalEarned += amount;
  saveCoinData();
  _showCoinPopup('+' + amount);
  _updateCoinDisplay();
}

/* ── Spendi monete ── */
function spendCoins(amount) {
  loadCoinData();
  if (coinData.balance < amount) return false;
  coinData.balance -= amount;
  saveCoinData();
  _updateCoinDisplay();
  return true;
}

/* ── Guadagna monete da un task (con protezione anti-farming) ── */
function tryEarnTaskCoins(taskId, createdAt) {
  loadCoinData();
  const today = new Date().toISOString().slice(0, 10);

  /* Reset contatore giornaliero se è un nuovo giorno */
  if (coinData.taskCoinDate !== today) {
    coinData.taskCoinDate  = today;
    coinData.taskCoinToday = 0;
  }

  /* Pulizia IDs più vecchi di 30 giorni */
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  coinData.rewardedTaskIds = coinData.rewardedTaskIds.filter(id => id > cutoff);

  /* 1. Questo task ha già dato monete? */
  if (coinData.rewardedTaskIds.includes(taskId)) return false;

  /* 2. Cap giornaliero: max 8 task/giorno danno monete */
  if (coinData.taskCoinToday >= 8) return false;

  /* 3. Il task deve avere almeno 1 minuto di vita */
  if (createdAt && (Date.now() - new Date(createdAt).getTime()) < 60000) return false;

  /* Tutto ok — premia */
  coinData.rewardedTaskIds.push(taskId);
  coinData.taskCoinToday++;
  saveCoinData();
  earnCoins(5);
  return true;
}

/* ── Aggiorna contatori monete nel DOM ── */
function _updateCoinDisplay() {
  const bal = coinData.balance;
  document.querySelectorAll('.js-coin-count').forEach(el => { el.textContent = bal; });
}

const _COIN_ICON = `<svg width="13" height="13" viewBox="0 0 16 16" fill="#F59E0B"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg>`;

/* ── Popup "+N monete" ── */
function _showCoinPopup(text) {
  const el = document.createElement('div');
  el.innerHTML = _COIN_ICON + ' ' + text;
  el.style.cssText = `
    position:fixed;right:22px;bottom:140px;z-index:999;
    background:linear-gradient(135deg,var(--accent),var(--accent-2));
    color:white;font-weight:700;font-size:0.84rem;gap:5px;
    padding:8px 16px;border-radius:20px;pointer-events:none;
    box-shadow:0 4px 18px rgba(0,0,0,0.18);display:flex;align-items:center;`;
  el.classList.add('coin-popup');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/* ══════════════════════════════════════
   SFIDA GIORNALIERA
═══════════════════════════════════════ */
function initChallenge() {
  loadCoinData();
  const today = new Date().toISOString().slice(0,10);
  if (coinData.challengeDate !== today) {
    coinData.challenge         = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    coinData.challengeDate     = today;
    coinData.challengeProgress = 0;
    saveCoinData();
  }
  _renderChallenge();
}

function _renderChallenge() {
  const el = document.getElementById('challenge-bar');
  if (!el || !coinData.challenge) return;
  const ch   = coinData.challenge;
  const pct  = Math.min(100, Math.round((coinData.challengeProgress / ch.target) * 100));
  const done = coinData.challengeProgress >= ch.target;
  el.innerHTML = `
    <div class="challenge-icon">${done ? '🏆' : '🎯'}</div>
    <div class="challenge-info">
      <div class="challenge-title">Sfida del giorno${done ? ' — Completata!' : ''}</div>
      <div class="challenge-desc">${ch.text} <span style="font-weight:700;color:var(--text)">${coinData.challengeProgress}/${ch.target}</span></div>
    </div>
    <div class="challenge-prog-wrap"><div class="challenge-prog-fill" style="width:${pct}%"></div></div>
    <div class="challenge-reward">${_COIN_ICON} +${ch.reward}</div>`;
}

/* Aggiorna il progresso della sfida con il valore assoluto corrente */
function updateChallengeProgress(key, value) {
  loadCoinData();
  const ch = coinData.challenge;
  if (!ch || ch.key !== key) return;
  if (coinData.challengeProgress >= ch.target) return; // già completata

  const prev = coinData.challengeProgress;
  coinData.challengeProgress = Math.max(prev, value); // solo incrementa
  saveCoinData();

  if (prev < ch.target && coinData.challengeProgress >= ch.target) {
    earnCoins(ch.reward);
    coinData.challengesCompleted = (coinData.challengesCompleted || 0) + 1;
    saveCoinData();
    _showAchievNotif('Sfida completata!', ch.text, 'Ottimo lavoro! +' + ch.reward + ' monete!');
    checkAchievements();
  }
  _renderChallenge();
}

/* ══════════════════════════════════════
   ACHIEVEMENTS
═══════════════════════════════════════ */
/* Aggiorna contatori cumulativi (chiamato da timer.js/tasks.js) */
function addSessionStats(minutes) {
  loadCoinData();
  coinData.totalSessions = (coinData.totalSessions || 0) + 1;
  coinData.totalMinutes  = (coinData.totalMinutes  || 0) + minutes;
  /* Aggiorna bestStreak leggendo il valore corrente dallo stats */
  try {
    const s = JSON.parse(localStorage.getItem('sf_stats') || '{}');
    const streak = s.streak || 0;
    if (streak > (coinData.bestStreak || 0)) coinData.bestStreak = streak;
  } catch {}
  saveCoinData();
}

function checkAchievements() {
  loadCoinData();
  ACHIEVEMENTS.forEach(a => {
    if (coinData.achievements.includes(a.id)) return;
    if (a.check(coinData)) {
      coinData.achievements.push(a.id);
      saveCoinData();
      earnCoins(a.coins);
      setTimeout(() => _showAchievNotif('Traguardo sbloccato!', a.name, a.desc + ' · +' + a.coins + ' monete'), 900);
    }
  });
}

function _showAchievNotif(tag, name, desc) {
  const old = document.querySelector('.achiev-notif');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'achiev-notif';
  el.innerHTML = `<div class="achiev-tag">${tag}</div>
    <div class="achiev-name">${name}</div>
    <div class="achiev-desc">${desc}</div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.animation = 'none'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3600);
}

/* ══════════════════════════════════════
   SHOP
═══════════════════════════════════════ */
function buyItem(id) {
  loadCoinData();
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return;

  if (coinData.shop[id]) {
    _toggleShopEffect(id);
    if (typeof renderShopPage === 'function') renderShopPage();
    return;
  }

  /* Controlla se è bloccato da ruolo */
  if (item.roleRequired) {
    const curKey = _shopCurrentRoleKey();
    if (_ROLE_ORDER.indexOf(curKey) < _ROLE_ORDER.indexOf(item.roleRequired)) {
      const rm = _ROLE_META[item.roleRequired] || {};
      _showAchievNotif('🔒 Bloccato', 'Sblocca con Ruolo ' + (rm.name||item.roleRequired), 'Continua a studiare per sbloccare questo oggetto esclusivo!');
      return;
    }
  }

  if (item.req && !coinData.shop[item.req]) {
    const reqNames = { cat:'Gatto', dog:'Cagnolino', rabbit:'Coniglietto' };
    const reqName  = reqNames[item.req] || item.req;
    _showAchievNotif(
      'Requisito mancante',
      'Devi prima acquistare il ' + reqName,
      'Acquista prima il compagno base per sbloccare le varianti!'
    );
    return;
  }

  if (coinData.balance < item.price) {
    _showAchievNotif(
      'Monete insufficienti',
      'Ti mancano ' + (item.price - coinData.balance) + ' monete',
      'Completa sessioni e task per guadagnarne altre!'
    );
    return;
  }

  if (!spendCoins(item.price)) return;
  loadCoinData();
  coinData.shop[id] = true;
  saveCoinData();
  _activateShopEffect(id);
  if (typeof syncToServer === 'function') syncToServer();
  _showAchievNotif('Acquistato!', item.name, item.desc);
  if (typeof _updateGardenBadge === 'function') _updateGardenBadge();
  if (typeof renderShopPage === 'function') renderShopPage();
}

function _activateShopEffect(id) {
  loadCoinData();
  switch (id) {
    case 'cat':
      coinData.activeEffects.catVisible = true;
      if (typeof showCat === 'function') showCat();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'cat4legs':
      coinData.activeEffects.cat4legs = true;
      if (typeof setCat4Legs === 'function') setCat4Legs(true);
      break;
    case 'catWhite': case 'catBlack': case 'catGrey':
      if (!coinData.shop.cat) break; // richiede il gatto
      coinData.activeEffects.catColor = id;
      if (typeof setCatColor === 'function') setCatColor(id);
      break;
    case 'stars':
      coinData.activeEffects.stars = true;
      startStarEffect();
      break;
    case 'bubbles':
      coinData.activeEffects.bubbles = true;
      startBubbleEffect();
      break;
    case 'soundCafe':
      coinData.activeEffects.activeSound = 'cafe';
      _playAmbientCoin('cafe');
      break;
    case 'soundOcean':
      coinData.activeEffects.activeSound = 'ocean';
      _playAmbientCoin('ocean');
      break;
    case 'soundForest':
      coinData.activeEffects.activeSound = 'forest';
      _playAmbientCoin('forest');
      break;
    case 'themeNight':
      applyTheme('night', true);
      break;
    case 'themeSunset':
      applyTheme('sunset', true);
      break;
    case 'glow':
      coinData.activeEffects.glow = true;
      document.body.classList.add('glow-intense');
      break;
    case 'pulsePro':
      coinData.activeEffects.pulsePro = true;
      document.body.classList.add('pulse-mode');
      break;
    case 'dog':
      coinData.activeEffects.dogVisible = true;
      if (typeof showDog === 'function') showDog();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'dogGolden': case 'dogBlack': case 'dogWhite':
      coinData.activeEffects.activeDogColor = id;
      if (typeof setDogColor === 'function') setDogColor(id);
      break;
    case 'campfire':
      coinData.activeEffects.campfire = true;
      if (typeof showCampfire === 'function') showCampfire();
      break;
    case 'rabbit':
      coinData.activeEffects.rabbitVisible = true;
      if (typeof showRabbit === 'function') showRabbit();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'rabbitBrown': case 'rabbitGrey': case 'rabbitBlack':
      coinData.activeEffects.activeRabbitColor = id;
      if (typeof setRabbitColor === 'function') setRabbitColor(id);
      break;
    case 'raccoon':
      coinData.activeEffects.raccoonVisible = true;
      if (typeof showRaccoon === 'function') showRaccoon();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'parrot':
      coinData.activeEffects.parrotVisible = true;
      if (typeof showParrot === 'function') showParrot();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'fox':
      coinData.activeEffects.foxVisible = true;
      if (typeof showFox === 'function') showFox();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'owl':
      coinData.activeEffects.owlVisible = true;
      if (typeof showOwl === 'function') showOwl();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'catHouse':    coinData.activeEffects.catHouseVisible = true;    if (typeof showCatHouse    === 'function') showCatHouse();    break;
    case 'dogHouse':    coinData.activeEffects.dogHouseVisible = true;    if (typeof showDogHouse    === 'function') showDogHouse();    break;
    case 'rabbitHouse': coinData.activeEffects.rabbitHouseVisible = true;  if (typeof showRabbitHouse === 'function') showRabbitHouse(); break;
    case 'raccoonHouse': coinData.activeEffects.raccoonHouseVisible = true; if (typeof showRaccoonHouse === 'function') showRaccoonHouse(); break;
    case 'parrotHouse': coinData.activeEffects.parrotHouseVisible = true;  if (typeof showParrotHouse === 'function') showParrotHouse(); break;
    case 'foxHouse':    coinData.activeEffects.foxHouseVisible = true;     if (typeof showFoxHouse    === 'function') showFoxHouse();    break;
    case 'owlHouse':    coinData.activeEffects.owlHouseVisible = true;     if (typeof showOwlHouse    === 'function') showOwlHouse();    break;
    case 'lion':
      coinData.activeEffects.lionVisible = true;
      if (typeof showLion === 'function') showLion();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'lionHouse':   coinData.activeEffects.lionHouseVisible = true;    if (typeof showLionHouse   === 'function') showLionHouse();   break;
    case 'giraffe':
      coinData.activeEffects.giraffeVisible = true;
      if (typeof showGiraffe === 'function') showGiraffe();
      break;
    case 'giraffeHouse': coinData.activeEffects.giraffeHouseVisible = true; if (typeof showGiraffeHouse === 'function') showGiraffeHouse(); break;
    case 'dragon':
      coinData.activeEffects.dragonVisible = true;
      if (typeof showDragon === 'function') showDragon();
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'dragonHouse': coinData.activeEffects.dragonHouseVisible = true; if (typeof showDragonHouse === 'function') showDragonHouse(); break;
    case 'aurora':
      coinData.activeEffects.aurora = true;
      _showAurora();
      break;
    case 'themeGold':
      applyTheme('gold', true);
      break;
    case 'rabbitOrange':
      coinData.activeEffects.activeRabbitColor = 'rabbitOrange';
      if (typeof setRabbitColor === 'function') setRabbitColor('rabbitOrange');
      break;
    case 'dogPurple':
      coinData.activeEffects.activeDogColor = 'dogPurple';
      if (typeof setDogColor === 'function') setDogColor('dogPurple');
      break;
    case 'catSilver':
      coinData.activeEffects.catColor = 'catSilver';
      if (typeof setCatColor === 'function') setCatColor('catSilver');
      break;
    default:
      if (typeof GARDEN_CATALOG !== 'undefined' && GARDEN_CATALOG[id]) {
        if (!coinData.activeEffects.gardenActive) coinData.activeEffects.gardenActive = {};
        coinData.activeEffects.gardenActive[id] = true;
        if (typeof placeGardenItem === 'function') placeGardenItem(id);
      }
  }
  saveCoinData();
  if (typeof syncToServer === 'function') syncToServer();
}

function _toggleShopEffect(id) {
  loadCoinData();
  switch (id) {
    case 'cat':
      coinData.activeEffects.catVisible = !coinData.activeEffects.catVisible;
      if (coinData.activeEffects.catVisible) { if (typeof showCat === 'function') showCat(); }
      else { if (typeof hideCat === 'function') hideCat(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'cat4legs':
      coinData.activeEffects.cat4legs = !coinData.activeEffects.cat4legs;
      if (typeof setCat4Legs === 'function') setCat4Legs(coinData.activeEffects.cat4legs);
      break;
    case 'catWhite': case 'catBlack': case 'catGrey':
      if (coinData.activeEffects.catColor === id) {
        coinData.activeEffects.catColor = '';
        if (typeof setCatColor === 'function') setCatColor(null);
      } else {
        coinData.activeEffects.catColor = id;
        if (typeof setCatColor === 'function') setCatColor(id);
      }
      break;
    case 'stars':
      coinData.activeEffects.stars = !coinData.activeEffects.stars;
      coinData.activeEffects.stars ? startStarEffect() : stopStarEffect();
      break;
    case 'bubbles':
      coinData.activeEffects.bubbles = !coinData.activeEffects.bubbles;
      coinData.activeEffects.bubbles ? startBubbleEffect() : stopBubbleEffect();
      break;
    case 'soundCafe':
    case 'soundOcean':
    case 'soundForest': {
      const snd = id === 'soundCafe' ? 'cafe' : id === 'soundOcean' ? 'ocean' : 'forest';
      if (coinData.activeEffects.activeSound === snd) {
        coinData.activeEffects.activeSound = '';
        _stopAmbientCoin();
      } else {
        coinData.activeEffects.activeSound = snd;
        _playAmbientCoin(snd);
      }
      break;
    }
    case 'themeNight': {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'night' ? 'ocean' : 'night', true);
      break;
    }
    case 'themeSunset': {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'sunset' ? 'ocean' : 'sunset', true);
      break;
    }
    case 'glow':
      coinData.activeEffects.glow = !coinData.activeEffects.glow;
      document.body.classList.toggle('glow-intense', coinData.activeEffects.glow);
      break;
    case 'pulsePro':
      coinData.activeEffects.pulsePro = !coinData.activeEffects.pulsePro;
      document.body.classList.toggle('pulse-mode', coinData.activeEffects.pulsePro);
      break;
    case 'dog':
      coinData.activeEffects.dogVisible = !coinData.activeEffects.dogVisible;
      if (coinData.activeEffects.dogVisible) { if (typeof showDog === 'function') showDog(); }
      else { if (typeof hideDog === 'function') hideDog(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'dogGolden': case 'dogBlack': case 'dogWhite':
      if (coinData.activeEffects.activeDogColor === id) {
        coinData.activeEffects.activeDogColor = '';
        if (typeof setDogColor === 'function') setDogColor(null);
      } else {
        coinData.activeEffects.activeDogColor = id;
        if (typeof setDogColor === 'function') setDogColor(id);
      }
      break;
    case 'campfire':
      coinData.activeEffects.campfire = !coinData.activeEffects.campfire;
      if (coinData.activeEffects.campfire) { if (typeof showCampfire === 'function') showCampfire(); }
      else { if (typeof hideCampfire === 'function') hideCampfire(); }
      break;
    case 'rabbit':
      coinData.activeEffects.rabbitVisible = !coinData.activeEffects.rabbitVisible;
      if (coinData.activeEffects.rabbitVisible) { if (typeof showRabbit === 'function') showRabbit(); }
      else { if (typeof hideRabbit === 'function') hideRabbit(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'rabbitBrown': case 'rabbitGrey': case 'rabbitBlack':
      if (coinData.activeEffects.activeRabbitColor === id) {
        coinData.activeEffects.activeRabbitColor = '';
        if (typeof setRabbitColor === 'function') setRabbitColor(null);
      } else {
        coinData.activeEffects.activeRabbitColor = id;
        if (typeof setRabbitColor === 'function') setRabbitColor(id);
      }
      break;
    case 'raccoon':
      coinData.activeEffects.raccoonVisible = !coinData.activeEffects.raccoonVisible;
      if (coinData.activeEffects.raccoonVisible) { if (typeof showRaccoon === 'function') showRaccoon(); }
      else { if (typeof hideRaccoon === 'function') hideRaccoon(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'parrot':
      coinData.activeEffects.parrotVisible = !coinData.activeEffects.parrotVisible;
      if (coinData.activeEffects.parrotVisible) { if (typeof showParrot === 'function') showParrot(); }
      else { if (typeof hideParrot === 'function') hideParrot(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'fox':
      coinData.activeEffects.foxVisible = !coinData.activeEffects.foxVisible;
      if (coinData.activeEffects.foxVisible) { if (typeof showFox === 'function') showFox(); }
      else { if (typeof hideFox === 'function') hideFox(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'owl':
      coinData.activeEffects.owlVisible = !coinData.activeEffects.owlVisible;
      if (coinData.activeEffects.owlVisible) { if (typeof showOwl === 'function') showOwl(); }
      else { if (typeof hideOwl === 'function') hideOwl(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'catHouse':
      coinData.activeEffects.catHouseVisible = !coinData.activeEffects.catHouseVisible;
      if (coinData.activeEffects.catHouseVisible) { if (typeof showCatHouse === 'function') showCatHouse(); }
      else { if (typeof hideCatHouse === 'function') hideCatHouse(); }
      break;
    case 'dogHouse':
      coinData.activeEffects.dogHouseVisible = !coinData.activeEffects.dogHouseVisible;
      if (coinData.activeEffects.dogHouseVisible) { if (typeof showDogHouse === 'function') showDogHouse(); }
      else { if (typeof hideDogHouse === 'function') hideDogHouse(); }
      break;
    case 'rabbitHouse':
      coinData.activeEffects.rabbitHouseVisible = !coinData.activeEffects.rabbitHouseVisible;
      if (coinData.activeEffects.rabbitHouseVisible) { if (typeof showRabbitHouse === 'function') showRabbitHouse(); }
      else { if (typeof hideRabbitHouse === 'function') hideRabbitHouse(); }
      break;
    case 'raccoonHouse':
      coinData.activeEffects.raccoonHouseVisible = !coinData.activeEffects.raccoonHouseVisible;
      if (coinData.activeEffects.raccoonHouseVisible) { if (typeof showRaccoonHouse === 'function') showRaccoonHouse(); }
      else { if (typeof hideRaccoonHouse === 'function') hideRaccoonHouse(); }
      break;
    case 'parrotHouse':
      coinData.activeEffects.parrotHouseVisible = !coinData.activeEffects.parrotHouseVisible;
      if (coinData.activeEffects.parrotHouseVisible) { if (typeof showParrotHouse === 'function') showParrotHouse(); }
      else { if (typeof hideParrotHouse === 'function') hideParrotHouse(); }
      break;
    case 'foxHouse':
      coinData.activeEffects.foxHouseVisible = !coinData.activeEffects.foxHouseVisible;
      if (coinData.activeEffects.foxHouseVisible) { if (typeof showFoxHouse === 'function') showFoxHouse(); }
      else { if (typeof hideFoxHouse === 'function') hideFoxHouse(); }
      break;
    case 'owlHouse':
      coinData.activeEffects.owlHouseVisible = !coinData.activeEffects.owlHouseVisible;
      if (coinData.activeEffects.owlHouseVisible) { if (typeof showOwlHouse === 'function') showOwlHouse(); }
      else { if (typeof hideOwlHouse === 'function') hideOwlHouse(); }
      break;
    case 'lion':
      coinData.activeEffects.lionVisible = !coinData.activeEffects.lionVisible;
      if (coinData.activeEffects.lionVisible) { if (typeof showLion === 'function') showLion(); }
      else { if (typeof hideLion === 'function') hideLion(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'lionHouse':
      coinData.activeEffects.lionHouseVisible = !coinData.activeEffects.lionHouseVisible;
      if (coinData.activeEffects.lionHouseVisible) { if (typeof showLionHouse === 'function') showLionHouse(); }
      else { if (typeof hideLionHouse === 'function') hideLionHouse(); }
      break;
    case 'giraffe':
      coinData.activeEffects.giraffeVisible = !coinData.activeEffects.giraffeVisible;
      if (coinData.activeEffects.giraffeVisible) { if (typeof showGiraffe === 'function') showGiraffe(); }
      else { if (typeof hideGiraffe === 'function') hideGiraffe(); }
      break;
    case 'giraffeHouse':
      coinData.activeEffects.giraffeHouseVisible = !coinData.activeEffects.giraffeHouseVisible;
      if (coinData.activeEffects.giraffeHouseVisible) { if (typeof showGiraffeHouse === 'function') showGiraffeHouse(); }
      else { if (typeof hideGiraffeHouse === 'function') hideGiraffeHouse(); }
      break;
    case 'dragon':
      coinData.activeEffects.dragonVisible = !coinData.activeEffects.dragonVisible;
      if (coinData.activeEffects.dragonVisible) { if (typeof showDragon === 'function') showDragon(); }
      else { if (typeof hideDragon === 'function') hideDragon(); }
      setTimeout(repositionAllCompanions, 150);
      break;
    case 'dragonHouse':
      coinData.activeEffects.dragonHouseVisible = !coinData.activeEffects.dragonHouseVisible;
      if (coinData.activeEffects.dragonHouseVisible) { if (typeof showDragonHouse === 'function') showDragonHouse(); }
      else { if (typeof hideDragonHouse === 'function') hideDragonHouse(); }
      break;
    case 'aurora':
      coinData.activeEffects.aurora = !coinData.activeEffects.aurora;
      if (coinData.activeEffects.aurora) _showAurora(); else _hideAurora();
      break;
    case 'themeGold': {
      const _curTheme = document.documentElement.getAttribute('data-theme');
      applyTheme(_curTheme === 'gold' ? 'ocean' : 'gold', true);
      break;
    }
    case 'rabbitOrange':
      if (coinData.activeEffects.activeRabbitColor === 'rabbitOrange') {
        coinData.activeEffects.activeRabbitColor = '';
        if (typeof setRabbitColor === 'function') setRabbitColor(null);
      } else {
        coinData.activeEffects.activeRabbitColor = 'rabbitOrange';
        if (typeof setRabbitColor === 'function') setRabbitColor('rabbitOrange');
      }
      break;
    case 'dogPurple':
      if (coinData.activeEffects.activeDogColor === 'dogPurple') {
        coinData.activeEffects.activeDogColor = '';
        if (typeof setDogColor === 'function') setDogColor(null);
      } else {
        coinData.activeEffects.activeDogColor = 'dogPurple';
        if (typeof setDogColor === 'function') setDogColor('dogPurple');
      }
      break;
    case 'catSilver':
      if (coinData.activeEffects.catColor === 'catSilver') {
        coinData.activeEffects.catColor = '';
        if (typeof setCatColor === 'function') setCatColor(null);
      } else {
        coinData.activeEffects.catColor = 'catSilver';
        if (typeof setCatColor === 'function') setCatColor('catSilver');
      }
      break;
    default:
      if (typeof GARDEN_CATALOG !== 'undefined' && GARDEN_CATALOG[id]) {
        if (!coinData.activeEffects.gardenActive) coinData.activeEffects.gardenActive = {};
        const _wasActive = coinData.activeEffects.gardenActive[id] !== false;
        coinData.activeEffects.gardenActive[id] = !_wasActive;
        if (!_wasActive) {
          if (typeof placeGardenItem === 'function') placeGardenItem(id);
          else if (typeof openGarden === 'function') openGarden();
          else window.location.href = 'index.html?garden=1';
        } else {
          if (typeof removeGardenItem === 'function') removeGardenItem(id);
        }
      }
  }
  saveCoinData();
  if (typeof syncToServer === 'function') syncToServer();
}

/* ── Effetto stelle ── */
let _starIv = null;
function startStarEffect() {
  if (_starIv) return;
  _starIv = setInterval(() => {
    const s = document.createElement('div');
    s.className = 'falling-star';
    const dur = 1.4 + Math.random() * 2.2;
    s.style.cssText = `left:${Math.random() * window.innerWidth}px;--sd:${dur}s`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), dur * 1000 + 300);
  }, 700);
}
function stopStarEffect() { clearInterval(_starIv); _starIv = null; }

/* ── Effetto bolle ── */
let _bubbleIv = null;
const _BUBBLE_DRIFTS = ['drift-a', 'drift-b', 'drift-c'];
function _spawnBubble() {
  const b   = document.createElement('div');
  const sz  = 6 + Math.random() * Math.random() * 52; // più piccole frequenti, grandi rare
  const dur = 5 + Math.random() * 6;
  const drift = _BUBBLE_DRIFTS[Math.floor(Math.random() * 3)];
  b.className = `rising-bubble ${drift}`;
  b.style.cssText = `left:${8 + Math.random() * (window.innerWidth - 80)}px;width:${sz}px;height:${sz}px;--bd:${dur}s`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), dur * 1000 + 400);
}
function startBubbleEffect() {
  if (_bubbleIv) return;
  _bubbleIv = setInterval(() => {
    _spawnBubble();
    if (Math.random() < 0.65) setTimeout(_spawnBubble, 180 + Math.random() * 220);
    if (Math.random() < 0.30) setTimeout(_spawnBubble, 450 + Math.random() * 250);
  }, 650);
}
function stopBubbleEffect() { clearInterval(_bubbleIv); _bubbleIv = null; }

/* ── Suoni ambient extra (cafe, ocean, forest) ── */
let _coinAmbCtx = null;
let _coinAmbSrc = null;

function _playAmbientCoin(type) {
  _stopAmbientCoin();
  try {
    _coinAmbCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sr    = _coinAmbCtx.sampleRate;
    const buf   = _coinAmbCtx.createBuffer(1, sr * 4, sr);
    const data  = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.14;

    const lp = _coinAmbCtx.createBiquadFilter();
    lp.type  = 'lowpass';
    lp.frequency.value = type === 'cafe' ? 2600 : type === 'ocean' ? 380 : 1100;
    lp.Q.value = type === 'ocean' ? 2.5 : 0.8;

    const gain = _coinAmbCtx.createGain();
    gain.gain.value = 0;

    _coinAmbSrc        = _coinAmbCtx.createBufferSource();
    _coinAmbSrc.buffer = buf;
    _coinAmbSrc.loop   = true;
    _coinAmbSrc.connect(lp);
    lp.connect(gain);
    gain.connect(_coinAmbCtx.destination);
    _coinAmbSrc.start();
    gain.gain.linearRampToValueAtTime(0.16, _coinAmbCtx.currentTime + 1.2);
  } catch {}
}

function _stopAmbientCoin() {
  try { if (_coinAmbSrc) { _coinAmbSrc.stop(); _coinAmbSrc = null; } } catch {}
  try { if (_coinAmbCtx) { _coinAmbCtx.close(); _coinAmbCtx = null; } } catch {}
}

/* ── Ripristina effetti al caricamento ── */
function restoreActiveEffects() {
  loadCoinData();
  if (coinData.activeEffects.stars)       startStarEffect();
  if (coinData.activeEffects.bubbles)     startBubbleEffect();
  if (coinData.activeEffects.glow)        document.body.classList.add('glow-intense');
  if (coinData.activeEffects.pulsePro)    document.body.classList.add('pulse-mode');
  if (coinData.activeEffects.catVisible && coinData.shop.cat && typeof showCat === 'function') showCat();
  const catCol = coinData.activeEffects.catColor;
  if (catCol && coinData.shop[catCol] && coinData.shop.cat && typeof setCatColor === 'function') setCatColor(catCol);
  if (coinData.activeEffects.cat4legs && coinData.shop.cat4legs && typeof setCat4Legs === 'function') setCat4Legs(true);
  const snd = coinData.activeEffects.activeSound;
  if (snd && ['cafe','ocean','forest'].includes(snd)) _playAmbientCoin(snd);
  if (coinData.activeEffects.dogVisible && coinData.shop.dog && typeof showDog === 'function') showDog();
  const dogCol = coinData.activeEffects.activeDogColor;
  if (dogCol && coinData.shop[dogCol] && coinData.shop.dog && typeof setDogColor === 'function') setDogColor(dogCol);
  if (coinData.activeEffects.campfire && coinData.shop.campfire && typeof showCampfire === 'function') showCampfire();
  if (coinData.activeEffects.rabbitVisible && coinData.shop.rabbit && typeof showRabbit === 'function') showRabbit();
  const rabbitCol = coinData.activeEffects.activeRabbitColor;
  if (rabbitCol && coinData.shop[rabbitCol] && coinData.shop.rabbit && typeof setRabbitColor === 'function') setRabbitColor(rabbitCol);
  if (coinData.activeEffects.parrotVisible && coinData.shop.parrot && typeof showParrot === 'function') showParrot();
  if (coinData.activeEffects.foxVisible && coinData.shop.fox && typeof showFox === 'function') showFox();
  if (coinData.activeEffects.owlVisible && coinData.shop.owl && typeof showOwl === 'function') showOwl();
  if (coinData.activeEffects.lionVisible && coinData.shop.lion && typeof showLion === 'function') showLion();
  if (coinData.activeEffects.catHouseVisible    && coinData.shop.catHouse    && typeof showCatHouse    === 'function') showCatHouse();
  if (coinData.activeEffects.dogHouseVisible    && coinData.shop.dogHouse    && typeof showDogHouse    === 'function') showDogHouse();
  if (coinData.activeEffects.rabbitHouseVisible && coinData.shop.rabbitHouse && typeof showRabbitHouse === 'function') showRabbitHouse();
  if (coinData.activeEffects.parrotHouseVisible && coinData.shop.parrotHouse && typeof showParrotHouse === 'function') showParrotHouse();
  if (coinData.activeEffects.foxHouseVisible    && coinData.shop.foxHouse    && typeof showFoxHouse    === 'function') showFoxHouse();
  if (coinData.activeEffects.owlHouseVisible    && coinData.shop.owlHouse    && typeof showOwlHouse    === 'function') showOwlHouse();
  if (coinData.activeEffects.lionHouseVisible   && coinData.shop.lionHouse   && typeof showLionHouse   === 'function') showLionHouse();
  if (coinData.activeEffects.giraffeVisible     && coinData.shop.giraffe    && typeof showGiraffe     === 'function') showGiraffe();
  if (coinData.activeEffects.giraffeHouseVisible && coinData.shop.giraffeHouse && typeof showGiraffeHouse === 'function') showGiraffeHouse();
  if (coinData.activeEffects.raccoonVisible    && coinData.shop.raccoon    && typeof showRaccoon    === 'function') showRaccoon();
  if (coinData.activeEffects.dragonVisible      && coinData.shop.dragon      && typeof showDragon     === 'function') showDragon();
  if (coinData.activeEffects.raccoonHouseVisible && coinData.shop.raccoonHouse && typeof showRaccoonHouse === 'function') showRaccoonHouse();
  if (coinData.activeEffects.dragonHouseVisible  && coinData.shop.dragonHouse  && typeof showDragonHouse  === 'function') showDragonHouse();
  if (coinData.activeEffects.aurora             && coinData.shop.aurora)     _showAurora();
  /* Ripristina oggetti giardino — solo quelli non esplicitamente disattivati */
  if (typeof GARDEN_CATALOG !== 'undefined' && typeof placeGardenItem === 'function') {
    const _ga = coinData.activeEffects.gardenActive || {};
    Object.keys(coinData.shop || {}).forEach(id => {
      if (coinData.shop[id] && GARDEN_CATALOG[id] && _ga[id] !== false) placeGardenItem(id);
    });
  }
}

/* ══════════════════════════════════════
   AURORA BOREALE
═══════════════════════════════════════ */
function _showAurora() {
  if (document.getElementById('sf-aurora')) return;
  const el = document.createElement('div');
  el.id = 'sf-aurora';
  el.innerHTML =
    '<div class="ab ab-1"></div>' +
    '<div class="ab ab-2"></div>' +
    '<div class="ab ab-3"></div>' +
    '<div class="ab ab-4"></div>';
  document.body.appendChild(el);
}
function _hideAurora() {
  const el = document.getElementById('sf-aurora');
  if (el) el.remove();
}

/* ══════════════════════════════════════
   RENDER SHOP PAGE
═══════════════════════════════════════ */
async function renderShopPage() {
  await _loadShopDisabled();
  loadCoinData();

  /* Balance */
  const balVal = document.getElementById('shop-balance-val');
  const balTot = document.getElementById('shop-balance-total');
  if (balVal) balVal.textContent = coinData.balance;
  if (balTot) balTot.textContent = coinData.totalEarned + ' guadagnate in totale';

  /* Griglia items */
  const grid       = document.getElementById('shop-items-grid');
  const gardenGrid = document.getElementById('shop-garden-grid');
  /* non uscire se grid è null — potrebbe essere la nuova struttura a sezioni */

  const curTheme = document.documentElement.getAttribute('data-theme');
  const _currentRoleIdx = _ROLE_ORDER.indexOf(_shopCurrentRoleKey());

  function _buildCard(item, idx) {
    const owned  = !!coinData.shop[item.id];
    const reqMet = !item.req || !!coinData.shop[item.req];
    /* Controllo ruolo richiesto */
    const roleReqIdx   = item.roleRequired ? _ROLE_ORDER.indexOf(item.roleRequired) : -1;
    const roleUnlocked = roleReqIdx === -1 || _currentRoleIdx >= roleReqIdx;
    const roleMeta     = item.roleRequired ? _ROLE_META[item.roleRequired] : null;
    const canBuy = coinData.balance >= item.price && reqMet;
    let btnLabel, btnClass;

    if (!owned) {
      if (!roleUnlocked) {
        btnLabel = `${roleMeta.emoji} Ruolo ${roleMeta.name}`;
        btnClass = 'btn-buy disabled-buy';
      } else if (item.req && !reqMet) {
        const reqLabels = { cat:'Richiede Gatto', dog:'Richiede Cagnolino', rabbit:'Richiede Coniglietto', parrot:'Richiede Pappagallo', fox:'Richiede Volpe', owl:'Richiede Gufo', lion:'Richiede Leone', giraffe:'Richiede Giraffa', raccoon:'Richiede Procione', dragon:'Richiede Drago' };
        btnLabel = reqLabels[item.req] || ('Richiede ' + item.req);
        btnClass = 'btn-buy disabled-buy';
      } else if (item.type === 'garden') {
        btnLabel = '🌿 Acquista';
        btnClass = 'btn-buy garden-buy' + (canBuy ? '' : ' disabled-buy');
      } else {
        btnLabel = 'Acquista';
        btnClass = 'btn-buy' + (canBuy ? '' : ' disabled-buy');
      }
    } else if (item.type === 'garden') {
      const _ga = coinData.activeEffects.gardenActive || {};
      const inGarden = _ga[item.id] !== false;
      btnLabel = inGarden ? '✓ In Giardino' : '+ Aggiungi';
      btnClass = 'btn-buy ' + (inGarden ? 'btn-toggle-on' : 'btn-toggle-off');
    } else {
      let active = false;
      if (item.id === 'stars')       active = !!coinData.activeEffects.stars;
      if (item.id === 'bubbles')     active = !!coinData.activeEffects.bubbles;
      if (item.id === 'cat')         active = !!coinData.activeEffects.catVisible;
      if (item.id === 'glow')        active = !!coinData.activeEffects.glow;
      if (item.id === 'pulsePro')    active = !!coinData.activeEffects.pulsePro;
      if (item.id === 'soundCafe')   active = coinData.activeEffects.activeSound === 'cafe';
      if (item.id === 'soundOcean')  active = coinData.activeEffects.activeSound === 'ocean';
      if (item.id === 'soundForest') active = coinData.activeEffects.activeSound === 'forest';
      if (item.id === 'themeNight')  active = curTheme === 'night';
      if (item.id === 'themeSunset') active = curTheme === 'sunset';
      if (item.id === 'cat4legs')    active = !!coinData.activeEffects.cat4legs;
      if (item.type === 'catcolor')  active = coinData.activeEffects.catColor === item.id;
      if (item.id === 'dog')         active = !!coinData.activeEffects.dogVisible;
      if (item.id === 'campfire')    active = !!coinData.activeEffects.campfire;
      if (item.id === 'rabbit')         active = !!coinData.activeEffects.rabbitVisible;
      if (item.type === 'rabbitcolor')  active = coinData.activeEffects.activeRabbitColor === item.id;
      if (item.id === 'parrot')         active = !!coinData.activeEffects.parrotVisible;
      if (item.id === 'fox')            active = !!coinData.activeEffects.foxVisible;
      if (item.id === 'owl')            active = !!coinData.activeEffects.owlVisible;
      if (item.id === 'lion')           active = !!coinData.activeEffects.lionVisible;
      if (item.id === 'raccoon')        active = !!coinData.activeEffects.raccoonVisible;
      if (item.id === 'dragon')         active = !!coinData.activeEffects.dragonVisible;
      if (item.id === 'raccoonHouse')   active = !!coinData.activeEffects.raccoonHouseVisible;
      if (item.id === 'dragonHouse')    active = !!coinData.activeEffects.dragonHouseVisible;
      if (item.id === 'aurora')         active = !!coinData.activeEffects.aurora;
      if (item.id === 'themeGold')      active = curTheme === 'gold';
      if (item.type === 'dogcolor')     active = coinData.activeEffects.activeDogColor === item.id;
      if (item.id === 'catHouse')    active = !!coinData.activeEffects.catHouseVisible;
      if (item.id === 'dogHouse')    active = !!coinData.activeEffects.dogHouseVisible;
      if (item.id === 'rabbitHouse') active = !!coinData.activeEffects.rabbitHouseVisible;
      if (item.id === 'parrotHouse') active = !!coinData.activeEffects.parrotHouseVisible;
      if (item.id === 'foxHouse')    active = !!coinData.activeEffects.foxHouseVisible;
      if (item.id === 'owlHouse')    active = !!coinData.activeEffects.owlHouseVisible;
      if (item.id === 'lionHouse')   active = !!coinData.activeEffects.lionHouseVisible;
      if (item.id === 'giraffe')      active = !!coinData.activeEffects.giraffeVisible;
      if (item.id === 'giraffeHouse') active = !!coinData.activeEffects.giraffeHouseVisible;
      const _colorTypes = ['catcolor', 'dogcolor', 'rabbitcolor'];
      btnLabel = active ? 'Attivo' : (_colorTypes.includes(item.type) ? 'Applica' : 'Attiva');
      btnClass = 'btn-buy ' + (active ? 'btn-toggle-on' : 'btn-toggle-off');
    }

    const disabledAttr = (!owned && (!roleUnlocked || !canBuy || (item.req && !reqMet))) ? ' disabled' : '';
    const ownedClass   = owned ? ' owned' + (item.type === 'garden' ? ' garden-card' : '') : '';
    const roleBorderStyle = roleMeta && roleUnlocked
      ? `border:1.5px solid ${roleMeta.color}55; box-shadow:0 2px 12px ${roleMeta.color}22`
      : roleMeta && !roleUnlocked
      ? `opacity:0.72`
      : '';

    const roleBadge = roleMeta ? (roleUnlocked
      ? `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:8px;font-size:0.62rem;font-weight:700;background:${roleMeta.color}18;color:${roleMeta.color};border:1px solid ${roleMeta.color}33;margin-bottom:6px">${roleMeta.emoji} Esclusivo ${roleMeta.name}</div>`
      : `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:8px;font-size:0.62rem;font-weight:700;background:rgba(0,0,0,0.05);color:#9ca3af;border:1px solid rgba(0,0,0,0.08);margin-bottom:6px">🔒 Sblocca con Ruolo ${roleMeta.name}</div>`)
      : '';

    return `<div class="shop-card${ownedClass}" style="animation-delay:${idx * 0.06}s;${roleBorderStyle}">
      ${roleMeta && !roleUnlocked ? `<div style="position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,0.45);backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);z-index:2;pointer-events:none"></div>` : ''}
      <div class="shop-icon" style="position:relative;z-index:3">${_shopIcon(item.type)}</div>
      ${roleBadge ? `<div style="position:relative;z-index:3">${roleBadge}</div>` : ''}
      <div class="shop-name" style="position:relative;z-index:3">${item.name}</div>
      <div class="shop-desc" style="position:relative;z-index:3">${item.desc}</div>
      <div class="shop-footer" style="position:relative;z-index:3">
        <div class="shop-price">
          ${owned ? '' : item.price === 0 && roleMeta ? `<span style="color:${roleMeta.color};font-size:0.72rem;font-weight:700">Gratis con ruolo</span>` : `<svg width="14" height="14" viewBox="0 0 16 16" fill="#F59E0B"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg> ${item.price}`}
          ${owned ? '<span style="color:var(--accent);font-size:0.75rem">In possesso</span>' : ''}
        </div>
        <button class="${btnClass}" onclick="buyItem('${item.id}')"${disabledAttr}>${btnLabel}</button>
      </div>
    </div>`;
  }

  const gardenItems    = SHOP_ITEMS.filter(i => i.type === 'garden' && !_shopDisabledItems.includes(i.id));
  const companionItems = SHOP_ITEMS.filter(i => i.type === 'companion' && !_shopDisabledItems.includes(i.id));
  const houseItems     = SHOP_ITEMS.filter(i => (i.type === 'house' || i.type === 'ambient') && !_shopDisabledItems.includes(i.id));
  const colorItems     = SHOP_ITEMS.filter(i => ['catcolor','dogcolor','rabbitcolor'].includes(i.type) && !_shopDisabledItems.includes(i.id));
  const effectItems    = SHOP_ITEMS.filter(i => (i.type === 'effect' || i.type === 'timer') && !_shopDisabledItems.includes(i.id));
  const soundItems     = SHOP_ITEMS.filter(i => (i.type === 'sound' || i.type === 'theme') && !_shopDisabledItems.includes(i.id));

  const _fill = (id, items) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = items.map((item, idx) => _buildCard(item, idx)).join('');
  };

  if (document.getElementById('shop-companions-grid')) {
    /* Nuova struttura a sezioni */
    _fill('shop-companions-grid', companionItems);
    _fill('shop-houses-grid',     houseItems);
    _fill('shop-colors-grid',     colorItems);
    _fill('shop-effects-grid',    effectItems);
    _fill('shop-sounds-grid',     soundItems);
  } else if (grid) {
    /* Fallback vecchia struttura */
    const mainItems = SHOP_ITEMS.filter(i => i.type !== 'garden' && !_shopDisabledItems.includes(i.id));
    grid.innerHTML  = mainItems.map((item, idx) => _buildCard(item, idx)).join('');
  }

  if (gardenGrid) {
    gardenGrid.innerHTML = gardenItems.map((item, idx) => _buildCard(item, idx)).join('');
    const gCount = document.getElementById('garden-shop-count');
    if (gCount) {
      const n = gardenItems.filter(i => !!coinData.shop[i.id]).length;
      gCount.textContent = n + '/' + gardenItems.length + ' posseduti';
    }
  }

  /* Achievements */
  const agrid = document.getElementById('shop-achiev-grid');
  if (!agrid) return;

  agrid.innerHTML = ACHIEVEMENTS.map((a, idx) => {
    const unlocked = coinData.achievements.includes(a.id);
    return `<div class="achiev-card ${unlocked ? 'unlocked' : 'locked'}" style="animation-delay:${idx * 0.05}s">
      <div class="achiev-badge">${_achievIcon(a.icon)}</div>
      <div>
        <div class="achiev-body-name">${a.name}</div>
        <div class="achiev-body-desc">${a.desc}</div>
        <div class="achiev-body-coins">${unlocked ? 'Sbloccato — ' : ''}+${a.coins} monete</div>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
function initCoins() {
  loadCoinData();
  _updateCoinDisplay();
  initChallenge();
  restoreActiveEffects();
}

/* ══════════════════════════════════════
   OFFERTA DEL GIORNO (daily deal)
═══════════════════════════════════════ */
const DAILY_DEAL_KEY = 'sf_daily_deal';

function getDailyDeal() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_DEAL_KEY) || '{}');
    if (saved.date === today && saved.itemId) return saved;
  } catch {}
  /* Seleziona un nuovo item casuale (non già posseduto se possibile) */
  loadCoinData();
  const candidates = SHOP_ITEMS.filter(i => !i.req && i.price >= 30);
  const notOwned   = candidates.filter(i => !coinData.shop[i.id]);
  const pool       = notOwned.length > 0 ? notOwned : candidates;
  const item       = pool[Math.floor(Math.random() * pool.length)];
  const deal       = { date: today, itemId: item.id, discount: 30 };
  localStorage.setItem(DAILY_DEAL_KEY, JSON.stringify(deal));
  return deal;
}

function buyDailyDeal() {
  const deal = getDailyDeal();
  if (!deal) return;
  loadCoinData();
  const item = SHOP_ITEMS.find(i => i.id === deal.itemId);
  if (!item || coinData.shop[item.id]) return;
  const salePrice = Math.round(item.price * (1 - deal.discount / 100));
  if (coinData.balance < salePrice) {
    _showAchievNotif('Monete insufficienti', 'Ti mancano ' + (salePrice - coinData.balance) + ' monete', 'Studia per guadagnarne di più!');
    return;
  }
  if (!spendCoins(salePrice)) return;
  loadCoinData();
  coinData.shop[item.id] = true;
  saveCoinData();
  _activateShopEffect(item.id);
  _showAchievNotif('Offerta riscattata! 🎉', item.name + ' (-' + deal.discount + '%)', 'Hai pagato solo ' + salePrice + ' monete!');
  if (typeof _updateGardenBadge === 'function') _updateGardenBadge();
  if (typeof renderShopPage    === 'function') renderShopPage();
  if (typeof renderDailyDeal   === 'function') renderDailyDeal();
}

function renderDailyDeal() {
  const el = document.getElementById('daily-deal-card');
  if (!el) return;
  const deal = getDailyDeal();
  if (!deal) return;
  loadCoinData();
  const item      = SHOP_ITEMS.find(i => i.id === deal.itemId);
  if (!item) return;
  const owned     = !!coinData.shop[item.id];
  const salePrice = Math.round(item.price * (1 - deal.discount / 100));
  const canBuy    = !owned && coinData.balance >= salePrice;
  const coinSvg = `<svg width="13" height="13" viewBox="0 0 16 16" fill="#F59E0B" style="vertical-align:middle;flex-shrink:0"><circle cx="8" cy="8" r="8"/><circle cx="8" cy="8" r="5" fill="#D97706"/><circle cx="8" cy="8" r="3" fill="#F59E0B"/></svg>`;
  const saved = Math.round(item.price * deal.discount / 100);
  el.innerHTML = `
    <div class="deal-head">
      <span class="deal-badge"><span class="deal-badge-bolt">⚡</span> OFFERTA DEL GIORNO &nbsp;·&nbsp; -${deal.discount}%</span>
      <span class="deal-timer" id="deal-timer"></span>
    </div>
    <div class="deal-body">
      <div class="deal-icon">${_shopIcon(item.type).replace('<svg ', '<svg width="26" height="26" ')}</div>
      <div class="deal-info">
        <div class="deal-name">${item.name}</div>
        <div class="deal-desc">${item.desc}</div>
        <div class="deal-price">
          <span class="deal-original">${item.price}</span>${coinSvg}
          <span class="deal-save-badge">-${saved} 🪙</span>
          <span class="deal-sale">${salePrice}</span>${coinSvg}
        </div>
      </div>
    </div>
    <div class="deal-foot">
      <button class="deal-btn ${owned ? 'deal-owned' : canBuy ? '' : 'deal-poor'}"
        onclick="buyDailyDeal()" ${owned || !canBuy ? 'disabled' : ''}>
        ${owned ? '✓ Già in tuo possesso' : canBuy ? `🛒 Acquista ora — ${salePrice} ${coinSvg}` : '🪙 Monete insufficienti'}
      </button>
    </div>`;
}

// Ogni pagina: aggiorna disabled list e nasconde animali attivi ma disabilitati
(async function _enforceAdminDisabled() {
  const _HIDE = {
    cat:'hideCat', dog:'hideDog', rabbit:'hideRabbit', fox:'hideFox',
    raccoon:'hideRaccoon', parrot:'hideParrot', owl:'hideOwl',
    lion:'hideLion', dragon:'hideDragon',
    catHouse:'hideCatHouse', dogHouse:'hideDogHouse', rabbitHouse:'hideRabbitHouse',
    foxHouse:'hideFoxHouse', raccoonHouse:'hideRaccoonHouse', parrotHouse:'hideParrotHouse',
    owlHouse:'hideOwlHouse', lionHouse:'hideLionHouse', dragonHouse:'hideDragonHouse',
  };
  const _DM = {
    cat:'catVisible', dog:'dogVisible', rabbit:'rabbitVisible', fox:'foxVisible',
    raccoon:'raccoonVisible', parrot:'parrotVisible', owl:'owlVisible',
    lion:'lionVisible', dragon:'dragonVisible',
    catHouse:'catHouseVisible', dogHouse:'dogHouseVisible', rabbitHouse:'rabbitHouseVisible',
    foxHouse:'foxHouseVisible', raccoonHouse:'raccoonHouseVisible', parrotHouse:'parrotHouseVisible',
    owlHouse:'owlHouseVisible', lionHouse:'lionHouseVisible', dragonHouse:'dragonHouseVisible',
    stars:'stars', bubbles:'bubbles', campfire:'campfire', aurora:'aurora',
    glow:'glow', pulsePro:'pulsePro', cat4legs:'cat4legs',
  };
  await _loadShopDisabled();
  if (!_shopDisabledItems.length) return;
  loadCoinData();
  const ae = coinData.activeEffects;
  let changed = false;
  _shopDisabledItems.forEach(id => {
    const k = _DM[id];
    if (k && ae[k]) {
      ae[k] = false;
      changed = true;
      const fn = _HIDE[id];
      if (fn && typeof window[fn] === 'function') window[fn]();
    }
  });
  if (changed) saveCoinData();
})();
