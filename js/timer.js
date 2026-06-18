/* =====================================================
   TIMER.JS — Pomodoro timer
   Dipende da shared.js
   ===================================================== */

/* ===== COSTANTI ===== */
const CIRC = 2 * Math.PI * 100; // 628.318... (r=100 nel viewBox 240×240)

/* ===== STATO ===== */
let timerMode  = 'work';
let timeLeft   = 0;
let totalTime  = 0;
let isRunning  = false;
let cycleCount = 0;      // sessioni di lavoro completate nel ciclo corrente
let timerIv    = null;

/* ===== ELEMENTI DOM ===== */
let _ring, _glow, _display, _badge, _dots, _playBtn, _ringWrap;

/* ===== INIT ===== */
function initTimer() {
  _ring     = document.getElementById('ring-progress');
  _glow     = document.getElementById('ring-glow');
  _display  = document.getElementById('timer-display');
  _badge    = document.getElementById('session-badge');
  _dots     = document.getElementById('session-dots');
  _playBtn  = document.getElementById('play-btn');
  _ringWrap = document.getElementById('ring-wrap');

  if (!_ring) return; // non siamo sulla pagina timer

  /* Imposta stroke-dasharray via JS per garantire consistenza */
  _ring.style.strokeDasharray = CIRC;
  _ring.style.strokeDashoffset = 0;
  if (_glow) { _glow.style.strokeDasharray = CIRC; _glow.style.strokeDashoffset = 0; }

  /* Riprendi timer se era in esecuzione (navigazione tra pagine) */
  _restoreTimer();
  _setRunningStyle(isRunning);
  _syncUI();

  /* Riavvia interval se il timer era in esecuzione */
  if (isRunning) {
    timerIv = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        if (timerMode === 'work' && timeLeft % 60 === 0 && typeof tickHydration === 'function') {
          tickHydration(true);
        }
        _syncUI();
      } else {
        clearInterval(timerIv);
        isRunning = false;
        _setRunningStyle(false);
        _onEnd(false);
      }
    }, 1000);
  }

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); toggleTimer(); }
    if (e.code === 'KeyR')  resetTimer();
    if (e.code === 'KeyF')  toggleFocus();
    if (e.code === 'KeyS')  openSettings();
    if (e.code === 'KeyA')  toggleAmbient();
  });
}

/* ===== RIPRISTINO TIMER (localStorage) ===== */
function _restoreTimer() {
  try {
    const saved = localStorage.getItem('sf_timer');
    if (saved) {
      const t = JSON.parse(saved);
      timerMode  = t.mode  || 'work';
      cycleCount = t.cycle || 0;
      totalTime  = _modeSec(timerMode);
      if (t.running && t.savedAt) {
        const elapsed = Math.floor((Date.now() - t.savedAt) / 1000);
        timeLeft = Math.max(0, t.timeLeft - elapsed);
        if (timeLeft === 0) {
          /* Il timer è scaduto mentre eravamo via */
          _onEnd(true);
          return;
        }
        isRunning = true;
      } else {
        timeLeft  = t.timeLeft !== undefined ? t.timeLeft : totalTime;
        isRunning = false;
      }
      _applyModeTabs();
      return;
    }
  } catch (e) {}
  /* Default */
  timerMode  = 'work';
  totalTime  = _modeSec('work');
  timeLeft   = totalTime;
  cycleCount = 0;
}

function _saveTimer() {
  localStorage.setItem('sf_timer', JSON.stringify({
    mode:      timerMode,
    timeLeft,
    totalTime,
    cycle:     cycleCount,
    running:   isRunning,
    savedAt:   Date.now(),
  }));
}

/* ===== HELPERS ===== */
function _modeSec(m) {
  if (m === 'work')  return cfg.work  * 60;
  if (m === 'short') return cfg.short * 60;
  return cfg.long * 60;
}
function _modeLbl(m) {
  if (m === 'work')  return (localStorage.getItem('sf_work_label') || 'LAVORO').toUpperCase();
  if (m === 'short') return 'PAUSA BREVE';
  return 'PAUSA LUNGA';
}
function _fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ===== UI SYNC ===== */
function _syncUI() {
  if (!_display) return;

  _display.textContent  = _fmt(timeLeft);
  if (_badge) _badge.textContent = _modeLbl(timerMode);

  /* Anello */
  const pct = totalTime > 0 ? timeLeft / totalTime : 1;
  const off = CIRC * (1 - pct);
  if (_ring) _ring.style.strokeDashoffset = off;
  if (_glow) _glow.style.strokeDashoffset = off;

  /* Pallini sessione */
  if (_dots) {
    let h = '';
    for (let i = 0; i < cfg.goal; i++) {
      if (i < cycleCount)                           h += '<span class="sdot done"></span>';
      else if (i === cycleCount && timerMode === 'work') h += '<span class="sdot curr"></span>';
      else                                          h += '<span class="sdot"></span>';
    }
    _dots.innerHTML = h;
  }

  /* Stat card */
  const s = document.getElementById('stat-sessions');
  const t = document.getElementById('stat-time');
  const g = document.getElementById('stat-goal');
  if (s) s.textContent = stats.sessions;
  if (t) t.textContent = stats.minutes + 'm';
  if (g) g.textContent = cfg.goal;

  /* Header pills */
  const ph = document.getElementById('pill-streak');
  const pm = document.getElementById('pill-minutes');
  if (ph) ph.textContent = stats.streak;
  if (pm) pm.textContent = stats.minutes + 'm';

  /* Tab titolo */
  document.title = isRunning
    ? `${_fmt(timeLeft)} · StudyFlow ✨`
    : 'StudyFlow ✨';

  if (typeof updateLevelPill === 'function') updateLevelPill();
  _saveTimer();
}

function _applyModeTabs() {
  ['work','short','long'].forEach(k => {
    const el = document.getElementById('tab-' + k);
    if (el) el.classList.toggle('active', k === timerMode);
  });
}

const _PAUSE_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="white"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="white"/></svg>`;
const _PLAY_SVG  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="6 3 20 12 6 21 6 3" fill="white"/></svg>`;

function _setRunningStyle(running) {
  if (_playBtn) _playBtn.innerHTML = running ? _PAUSE_SVG : _PLAY_SVG;
  if (_ringWrap) _ringWrap.classList.toggle('running', running);
  if (_ring) _ring.style.filter = running ? 'drop-shadow(0 0 13px var(--accent))' : '';
}

/* ===== AZIONI PUBBLICHE ===== */
function toggleTimer() {
  if (isRunning) {
    clearInterval(timerIv);
    isRunning = false;
    _setRunningStyle(false);
    if (typeof syncCatToTimer    === 'function') syncCatToTimer(false);
    if (typeof syncDogToTimer    === 'function') syncDogToTimer(false);
    if (typeof syncRabbitToTimer === 'function') syncRabbitToTimer(false);
    if (typeof syncParrotToTimer === 'function') syncParrotToTimer(false);
    if (typeof syncFoxToTimer    === 'function') syncFoxToTimer(false);
    if (typeof syncOwlToTimer    === 'function') syncOwlToTimer(false);
    if (typeof syncHydroToTimer  === 'function') syncHydroToTimer(false, timerMode);
    if (typeof setPresenceStudying === 'function') setPresenceStudying(false);
    _saveTimer();
  } else {
    isRunning = true;
    _setRunningStyle(true);
    if (typeof syncCatToTimer    === 'function') syncCatToTimer(true, timerMode);
    if (typeof syncDogToTimer    === 'function') syncDogToTimer(true, timerMode);
    if (typeof syncRabbitToTimer === 'function') syncRabbitToTimer(true, timerMode);
    if (typeof syncParrotToTimer === 'function') syncParrotToTimer(true, timerMode);
    if (typeof syncFoxToTimer    === 'function') syncFoxToTimer(true, timerMode);
    if (typeof syncOwlToTimer    === 'function') syncOwlToTimer(true, timerMode);
    if (typeof syncHydroToTimer === 'function') syncHydroToTimer(true, timerMode);
    if (typeof setPresenceStudying === 'function') setPresenceStudying(timerMode === 'work');
    timerIv = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        /* Tick idratazione ogni minuto intero in modalità lavoro */
        if (timerMode === 'work' && timeLeft % 60 === 0 && typeof tickHydration === 'function') {
          tickHydration(true);
        }
        _syncUI();
      } else {
        clearInterval(timerIv);
        isRunning = false;
        _setRunningStyle(false);
        _onEnd(false);
      }
    }, 1000);
  }
  _syncUI();
}

function setWorkDuration(mins) {
  if (!mins || isNaN(mins)) return;
  cfg.work = mins;
  if (typeof saveCfg === 'function') saveCfg();
  if (timerMode === 'work' && !isRunning) {
    totalTime = cfg.work * 60;
    timeLeft  = totalTime;
    _syncUI();
  }
}

function resetTimer() {
  clearInterval(timerIv);
  isRunning = false;
  _setRunningStyle(false);
  timeLeft = totalTime;
  _syncUI();
}

function skipSession() {
  clearInterval(timerIv);
  isRunning = false;
  _setRunningStyle(false);
  timeLeft = 0;
  _syncUI();
  _onEnd(false);
}

function switchMode(m) {
  /* Blocca il passaggio da lavoro a pausa se il timer sta girando */
  if (timerMode === 'work' && isRunning && m !== 'work') {
    if (typeof _openModeGuard === 'function') _openModeGuard(m);
    return;
  }
  _doSwitchMode(m);
}
function _doSwitchMode(m) {
  clearInterval(timerIv);
  isRunning = false;
  _setRunningStyle(false);
  timerMode = m;
  totalTime = _modeSec(m);
  timeLeft  = totalTime;
  _applyModeTabs();
  _syncUI();
  if (typeof syncHydroToTimer === 'function') syncHydroToTimer(false, m);
}

/* ===== FINE SESSIONE ===== */
function _onEnd(silent) {
  if (!silent) {
    playBeep();
    celebrate();
  }

  if (timerMode === 'work') {
    cycleCount++;
    stats.sessions++;
    stats.minutes += cfg.work;
    updateStreak();
    saveStats();
    if (typeof saveSession === 'function') {
      const subject = document.getElementById('study-subject')?.value?.trim() || '';
      saveSession(cfg.work, subject);
    }
    /* Monete + sfida + stats cumulative */
    if (typeof addSessionStats === 'function') addSessionStats(cfg.work);
    /* Monete proporzionali alla durata — minimo 5 min per ricevere qualcosa */
    const _sessionCoins = cfg.work < 5 ? 0 : Math.max(3, Math.round(15 * cfg.work / 25));
    if (_sessionCoins > 0 && typeof earnCoins === 'function') earnCoins(_sessionCoins);
    if (typeof updateChallengeProgress === 'function') {
      updateChallengeProgress('sessionsToday', stats.sessions);
      updateChallengeProgress('minutesToday', stats.minutes);
    }
    /* Aggiorna progresso sfide amici (friend challenges nel DB) */
    _updateFriendChallengesProgress(cfg.work);
    if (typeof checkAchievements === 'function') checkAchievements();
    if (typeof setCatState    === 'function') setCatState('happy');
    if (typeof setDogState    === 'function') setDogState('happy');
    if (typeof setRabbitHappy === 'function') setRabbitHappy();
    if (typeof _onParrotClick === 'function') _onParrotClick();
    if (typeof setFoxHappy    === 'function') setFoxHappy();
    if (typeof _onOwlClick    === 'function') _onOwlClick();
    if (typeof gardenSessionGrowth  === 'function') gardenSessionGrowth();
    if (typeof syncCatToTimer    === 'function') setTimeout(() => syncCatToTimer(false), 2200);
    if (typeof syncDogToTimer    === 'function') setTimeout(() => syncDogToTimer(false), 2200);
    if (typeof syncRabbitToTimer === 'function') setTimeout(() => syncRabbitToTimer(false), 2200);
    if (typeof syncParrotToTimer === 'function') setTimeout(() => syncParrotToTimer(false), 2200);
    if (typeof syncFoxToTimer    === 'function') setTimeout(() => syncFoxToTimer(false), 2200);
    if (typeof syncOwlToTimer    === 'function') setTimeout(() => syncOwlToTimer(false), 2200);
    if (typeof resetHydrationCounter === 'function') resetHydrationCounter();

    const nextMode = cycleCount >= cfg.goal ? 'long' : 'short';
    if (cycleCount >= cfg.goal) cycleCount = 0;

    /* Check-in fine sessione, poi passa alla pausa */
    const _subject = document.getElementById('study-subject')?.value?.trim() || '';
    if (!silent && typeof showSessionCheckin === 'function') {
      showSessionCheckin(_subject, () => {
        switchMode(nextMode);
        if (cfg.autoBreak) setTimeout(() => toggleTimer(), 800);
      });
    } else {
      switchMode(nextMode);
      if (cfg.autoBreak) setTimeout(() => toggleTimer(), 800);
    }
  } else {
    switchMode('work');
    if (cfg.autoWork) setTimeout(() => toggleTimer(), 800);
  }
}

/* ===== NAV GUARD ===== */
let _navGuardDest = '';
let _modeGuardTarget = null;
function _openModeGuard(m) {
  _modeGuardTarget = m;
  const modal = document.getElementById('mode-guard-modal');
  if (modal) modal.classList.add('active');
}
function _closeModeGuard() {
  const modal = document.getElementById('mode-guard-modal');
  if (modal) modal.classList.remove('active');
  _modeGuardTarget = null;
}
function _confirmModeSwitch() {
  const m = _modeGuardTarget;
  _closeModeGuard();
  if (m) _doSwitchMode(m);
}

function _openNavGuard(dest) {
  _navGuardDest = dest;
  const m = document.getElementById('nav-guard-modal');
  if (m) m.classList.add('active');
}
function _closeNavGuard() {
  const m = document.getElementById('nav-guard-modal');
  if (m) m.classList.remove('active');
}
function _confirmNavLeave() {
  _closeNavGuard();
  window.location.href = _navGuardDest;
}

/* ===== CALLBACK DA SHARED QUANDO SI CHIUDONO SETTINGS ===== */
function onSettingsClosed() {
  if (!isRunning) {
    totalTime = _modeSec(timerMode);
    timeLeft  = totalTime;
    _syncUI();
  }
  const g = document.getElementById('stat-goal');
  if (g) g.textContent = cfg.goal;
  if (_dots) {
    let h = '';
    for (let i = 0; i < cfg.goal; i++) h += '<span class="sdot"></span>';
    _dots.innerHTML = h;
  }
}

/* Aggiorna il progresso di tutte le sfide amici attive dopo una sessione */
async function _updateFriendChallengesProgress(sessionMins) {
  const auth = (typeof _getAuth === 'function') ? _getAuth() : null;
  if (!auth || !auth.token) return;
  const api = (typeof window.SF_API_BASE !== 'undefined') ? window.SF_API_BASE : '/api';
  try {
    const r = await fetch(api + '/challenges', { headers: { 'Authorization': 'Bearer ' + auth.token } });
    if (!r.ok) return;
    const challenges = await r.json();
    const active = challenges.filter(ch => !ch.my_completed && ch.am_member);
    for (const ch of active) {
      const newMins = (ch.my_minutes || 0) + sessionMins;
      await fetch(api + '/challenges/' + ch.id + '/progress', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: newMins })
      });
    }
  } catch {}
}
