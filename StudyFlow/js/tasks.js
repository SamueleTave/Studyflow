/* =====================================================
   TASKS.JS — Gestione task con priorità e materie
   ===================================================== */

/* ===== MATERIE ===== */
let subjects = [];
const SUBJ_PALETTE = [
  '#E91E63','#9C27B0','#3F51B5','#2196F3','#009688',
  '#4CAF50','#FF9800','#FF5722','#795548','#607D8B'
];

const PRIORITY_ORDER = { alta: 0, media: 1, normale: 2, bassa: 3 };
const PRIORITY_META  = {
  alta:    { label: 'Alta',    color: '#EF5350' },
  media:   { label: 'Media',   color: '#FF9800' },
  normale: { label: 'Normale', color: '#29B6F6' },
  bassa:   { label: 'Bassa',   color: '#66BB6A' },
};

function loadSubjects() {
  try { subjects = JSON.parse(localStorage.getItem('sf_subjects') || '[]'); }
  catch { subjects = []; }
}

function saveSubjects() {
  localStorage.setItem('sf_subjects', JSON.stringify(subjects));
}

function findSubject(name) {
  if (!name) return null;
  return subjects.find(s => s.name.toLowerCase() === (name || '').toLowerCase()) || null;
}

function addSubject(name, color) {
  name = (name || '').trim();
  if (!name || findSubject(name)) return null;
  const s = {
    id: Date.now(),
    name,
    color: color || SUBJ_PALETTE[subjects.length % SUBJ_PALETTE.length],
  };
  subjects.push(s);
  saveSubjects();
  return s;
}

function deleteSubject(id) {
  subjects = subjects.filter(s => s.id !== id);
  saveSubjects();
}

function updateSubjectColor(id, color) {
  const s = subjects.find(x => x.id === id);
  if (s) { s.color = color; saveSubjects(); }
}

/* ===== FILTRO ===== */
let currentFilter = 'all';

function setTaskFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn[data-filter]').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === f)
  );
  renderAllTasks();
}

/* ===== INIT ===== */
function initTasks() {
  loadSubjects();
  renderProgress();
  renderAllTasks();

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'KeyS') openSettings();
    if (e.code === 'KeyF') toggleFocus();
    if (e.code === 'KeyA') toggleAmbient();
  });
}

/* ===== PROGRESS BAR ===== */
function renderProgress() {
  const today    = todayStr();
  const all      = tasks.filter(t => t.date === today);
  const done     = all.filter(t => t.done).length;
  const total    = all.length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;

  const bar   = document.getElementById('progress-fill');
  const label = document.getElementById('progress-pct');
  const count = document.getElementById('progress-label');
  if (bar)   bar.style.width   = pct + '%';
  if (label) label.textContent = pct + '%';
  if (count) count.textContent = `${done}/${total} task completati oggi`;
}

/* ===== RENDER PRINCIPALE ===== */
function renderAllTasks() {
  const mainList = document.getElementById('main-task-list');
  if (!mainList) return;

  let list;
  switch (currentFilter) {
    case 'daily': list = tasks.filter(t => t.type === 'daily' && !t.done); break;
    case 'study': list = tasks.filter(t => t.type === 'study' && !t.done); break;
    case 'done':  list = tasks.filter(t => t.done); break;
    default:      list = tasks.filter(t => !t.done); break;
  }

  /* Ordina: alta → media → normale → bassa, poi per scadenza */
  list.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || 'normale'] ?? 2;
    const pb = PRIORITY_ORDER[b.priority || 'normale'] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (b.id || 0) - (a.id || 0);
  });

  const countEl = document.getElementById('task-total-count');
  if (countEl) countEl.textContent = list.length;

  if (!list.length) {
    mainList.innerHTML =
      '<div class="tasks-empty">' +
      (currentFilter === 'done' ? 'Nessun task completato ancora.' : 'Tutto libero! 🎉') +
      '</div>';
    renderProgress();
    updateCalIfPresent();
    return;
  }

  const today = todayStr();
  mainList.innerHTML = list.map(t => _taskHTML(t, today)).join('');
  renderProgress();
  updateCalIfPresent();
}

function _taskHTML(t, today) {
  const p     = t.priority || 'normale';
  const pMeta = PRIORITY_META[p] || PRIORITY_META.normale;
  const subj  = findSubject(t.subject || '');
  const color = subj ? subj.color : (t.subjectColor || null);

  let dueBadge = '';
  if (t.dueDate) {
    const over   = !t.done && t.dueDate < today;
    const dLabel = _formatDue(t.dueDate);
    dueBadge = `<span class="task-due-tag${over ? ' overdue' : ''}">${over ? '⚠️' : '📅'} ${dLabel}</span>`;
  }

  const subjChip = t.subject
    ? `<span class="task-subj-chip">${color ? `<span class="task-subj-dot" style="background:${color}"></span>` : ''}${esc(t.subject)}</span>`
    : '';

  return `<div class="task-item${t.done ? ' done' : ''}" id="task-${t.id}" data-priority="${p}">
    <div class="task-check${t.done ? ' done' : ''}" onclick="toggleTask(${t.id})">${t.done ? '✓' : ''}</div>
    <div class="task-body">
      <div class="task-text">${esc(t.text)}</div>
      <div class="task-meta">
        ${subjChip}
        <span class="task-priority-badge ${p}">${pMeta.label}</span>
        <span class="task-tag">${t.type === 'study' ? '📚 Studio' : '📋 Giornaliera'}</span>
        ${dueBadge}
      </div>
    </div>
    <button class="task-del" onclick="deleteTask(${t.id})" title="Elimina">✕</button>
  </div>`;
}

/* ===== RENDER LISTA GENERICA (usata da index.html) ===== */
function renderTaskList(containerId, filterFn) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const today = todayStr();
  const list  = tasks.filter(filterFn).sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || 'normale'] ?? 2;
    const pb = PRIORITY_ORDER[b.priority || 'normale'] ?? 2;
    return pa - pb;
  });

  if (!list.length) {
    el.innerHTML = '<div class="tasks-empty">Tutto libero!</div>';
    return;
  }
  el.innerHTML = list.map(t => _taskHTML(t, today)).join('');
}

/* ===== MINI TASKS (timer page) ===== */
function renderMiniTasks() {
  const el = document.getElementById('mini-task-list');
  if (!el) return;
  const today = todayStr();
  const list  = tasks.filter(t => !t.done && t.date === today).slice(0, 6);

  if (!list.length) {
    el.innerHTML = '<div class="tasks-empty">Nessun task per oggi!</div>';
    return;
  }
  el.innerHTML = list.map(t =>
    `<div class="task-item${t.done ? ' done' : ''}" data-priority="${t.priority || 'normale'}">
      <div class="task-check${t.done ? ' done' : ''}"
           onclick="toggleTask(${t.id}); renderMiniTasks()">${t.done ? '✓' : ''}</div>
      <div class="task-text">${esc(t.text)}</div>
      <button class="task-del" onclick="deleteTask(${t.id}); renderMiniTasks()" title="Elimina">✕</button>
    </div>`
  ).join('');
}

/* ===== CRUD ===== */
function addDailyTask() {
  const inp  = document.getElementById('daily-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  tasks.push({
    id: Date.now(), text, done: false,
    type: 'daily', date: todayStr(),
    priority: document.getElementById('daily-priority')?.value || 'normale',
    createdAt: new Date().toISOString(),
  });
  if (inp) inp.value = '';
  saveTasks(); renderAllTasks();
}

function addStudyTask() {
  const inp  = document.getElementById('study-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  tasks.push({
    id: Date.now(), text, done: false,
    type: 'study', date: todayStr(),
    subject:  document.getElementById('study-subject')?.value  || '',
    priority: document.getElementById('study-priority')?.value || 'normale',
    createdAt: new Date().toISOString(),
  });
  if (inp) inp.value = '';
  saveTasks(); renderAllTasks();
}

function addQuickTask() {
  const inp  = document.getElementById('quick-task-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  tasks.push({
    id: Date.now(), text, done: false,
    type: 'daily', date: todayStr(),
    priority: 'normale',
    createdAt: new Date().toISOString(),
  });
  if (inp) inp.value = '';
  saveTasks(); renderMiniTasks();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  if (t.done) {
    celebrate(14);
    if (typeof tryEarnTaskCoins === 'function')        tryEarnTaskCoins(t.id, t.createdAt);
    if (typeof updateChallengeProgress === 'function') {
      const today      = todayStr();
      const doneToday  = tasks.filter(x => x.done && x.date === today).length;
      const studyToday = tasks.filter(x => x.done && x.date === today && x.type === 'study').length;
      updateChallengeProgress('tasksToday',      doneToday);
      updateChallengeProgress('studyTasksToday', studyToday);
    }
    if (typeof coinData !== 'undefined') {
      coinData.tasksCompleted = (coinData.tasksCompleted || 0) + 1;
      if (typeof saveCoinData === 'function') saveCoinData();
    }
    if (typeof checkAchievements === 'function') checkAchievements();
  }
  renderAllTasks();
  renderMiniTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(); renderAllTasks(); renderMiniTasks();
}

function updateCalIfPresent() {
  if (typeof renderCal === 'function') renderCal();
}

/* ===== UTILITY ===== */
function _formatDue(dateStr) {
  if (!dateStr) return '';
  try {
    const d     = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff  = Math.round((d - today) / 86400000);
    if (diff === 0)  return 'Oggi';
    if (diff === 1)  return 'Domani';
    if (diff === -1) return 'Ieri';
    if (diff < 0)    return `${Math.abs(diff)}gg fa`;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  } catch { return dateStr; }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
