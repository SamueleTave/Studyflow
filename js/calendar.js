/* =====================================================
   CALENDAR.JS — Calendario e gestione eventi
   Dipende da shared.js
   ===================================================== */

let calYear   = new Date().getFullYear();
let calMonth  = new Date().getMonth();
let selDate   = todayStr();

/* Struttura evento: { id, title, date, time, color } */
let events = [];

const EVENT_COLORS = [
  '#29B6F6','#4CAF50','#FF8F00','#D81B60',
  '#AB47BC','#00ACC1','#EF5350','#8BC34A',
];
let selEventColor = EVENT_COLORS[0];

function loadEvents() {
  try {
    const e = localStorage.getItem('sf_events');
    if (e) events = JSON.parse(e);
  } catch (ex) {}
}
function saveEvents() { localStorage.setItem('sf_events', JSON.stringify(events)); }

/* ===== INIT ===== */
function _updateCalStreak() {
  const ph = document.getElementById('pill-streak');
  if (!ph) return;
  try {
    const s = JSON.parse(localStorage.getItem('sf_stats') || '{}');
    const streak = s.streak || 0;
    const _SL = [
      { min:100, val:'diamond', emoji:'💎' },
      { min:75,  val:'rainbow', emoji:'🌈' },
      { min:60,  val:'cosmic',  emoji:'🌌' },
      { min:50,  val:'teal',    emoji:'🌊' },
      { min:40,  val:'gold',    emoji:'✨' },
      { min:30,  val:'fuchsia', emoji:'💫' },
      { min:21,  val:'violet',  emoji:'⚡' },
      { min:14,  val:'inferno', emoji:'🔥' },
      { min:7,   val:'hot',     emoji:'🔥' },
      { min:3,   val:'warm',    emoji:''   },
    ];
    const lv = _SL.find(l => streak >= l.min) || { val:'', emoji:'' };
    ph.textContent = (streak >= 7 && lv.emoji) ? streak + ' ' + lv.emoji : String(streak);
    ph.className = 'stat-pill-val' + (lv.val ? ' streak-' + lv.val : '');
    const pill = ph.closest('.stat-pill');
    if (pill) pill.className = 'stat-pill' + (lv.val ? ' streak-pill-' + lv.val : '');
  } catch {}
}

function initCalendar() {
  loadEvents();
  renderCal();
  renderEventsPanel();
  _updateCalStreak();

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'KeyS') openSettings();
    if (e.code === 'KeyF') toggleFocus();
    if (e.code === 'KeyA') toggleAmbient();
    if (e.code === 'ArrowLeft')  changeMonth(-1);
    if (e.code === 'ArrowRight') changeMonth(1);
  });

  /* Aggiorna streak al focus per catturare sessioni fatte nel timer */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) _updateCalStreak();
  });
}

/* ===== CAMBIO MESE ===== */
function changeMonth(d) {
  calMonth += d;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  renderCal();
}

/* ===== RENDER CALENDARIO ===== */
function renderCal() {
  const lbl = document.getElementById('cal-month-label');
  if (lbl) lbl.textContent = `${MONTHS_IT[calMonth]} ${calYear}`;

  const today     = new Date();
  const firstDay  = new Date(calYear, calMonth, 1).getDay();
  const daysInMo  = new Date(calYear, calMonth + 1, 0).getDate();
  const startDay  = firstDay === 0 ? 6 : firstDay - 1; // settimana inizia da lunedì

  /* Header DOW */
  const dowEl = document.getElementById('cal-dow');
  if (dowEl) {
    dowEl.innerHTML = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
      .map(d => `<div class="cal-dow">${d}</div>`).join('');
  }

  /* Griglia giorni */
  const gridEl = document.getElementById('cal-grid');
  if (!gridEl) return;

  const isFull = gridEl.classList.contains('cal-full');
  let html = '';

  /* Celle vuote iniziali */
  for (let i = 0; i < startDay; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMo; d++) {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const ds       = `${calYear}-${mm}-${dd}`;
    const isToday  = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const isSel    = selDate === ds;
    /* Se la task ha dueDate, appare SOLO nel giorno della scadenza.
       Se non ha dueDate, appare nel giorno di assegnazione (date). */
    const dayTasks = tasks.filter(t => (t.dueDate ? t.dueDate === ds : t.date === ds) && !t.done);
    const dayEvts  = events.filter(e => e.date === ds);
    const hasItems = dayTasks.length > 0 || dayEvts.length > 0;

    let cls = 'cal-cell';
    if (isToday) cls += ' today';
    else if (isSel) cls += ' selected';
    if (hasItems) cls += ' has-event';

    if (isFull) {
      /* Vista grande con eventi dentro la cella */
      const evtChips = [...dayEvts.slice(0,2).map((e,i) => {
        const c = e.color && e.color.startsWith('#') ? e.color : (EVENT_COLORS[parseInt(e.color)||0] || EVENT_COLORS[0]);
        return `<div class="cal-event-chip" style="background:${c}22;border-left:3px solid ${c};color:${c}">${esc(e.title)}</div>`;
      }),
        ...dayTasks.slice(0, 1).map(t =>
          `<div class="cal-event-chip" style="background:rgba(255,143,0,0.18);color:var(--text)"><span style="width:6px;height:6px;border-radius:50%;background:#FF8F00;flex-shrink:0;display:inline-block"></span>${esc(t.name || t.text || '—')}</div>`)
      ].join('');
      html += `
        <div class="${cls}" onclick="selectDate('${ds}')">
          <div class="cal-cell-num">${d}</div>
          <div class="cal-cell-events">${evtChips}</div>
        </div>`;
    } else {
      html += `<div class="${cls}" onclick="selectDate('${ds}')">${d}</div>`;
    }
  }
  gridEl.innerHTML = html;
}

/* ===== SELEZIONE DATA ===== */
function selectDate(ds) {
  selDate = ds;
  renderCal();
  renderEventsPanel();
  /* aggiorna placeholder input */
  const inp = document.getElementById('event-title-input');
  if (inp) {
    const [y,m,d] = ds.split('-');
    inp.placeholder = `Evento per ${d}/${m}/${y}…`;
  }
}

/* ===== PANEL EVENTI (sidebar destra) ===== */
function renderEventsPanel() {
  const el = document.getElementById('events-list');
  if (!el) return;

  const [y, m, d] = (selDate || todayStr()).split('-');
  const titleEl = document.getElementById('events-day-title');
  if (titleEl) {
    const dt = new Date(Number(y), Number(m)-1, Number(d));
    titleEl.textContent = `${DAYS_IT[dt.getDay()]} ${d}/${m}/${y}`;
  }

  const dayEvts  = events.filter(e => e.date === selDate);
  const dayTasks = tasks.filter(t => t.dueDate ? t.dueDate === selDate : t.date === selDate);

  if (dayEvts.length === 0 && dayTasks.length === 0) {
    el.innerHTML = `<div class="tasks-empty">Nessun evento per questo giorno</div>`;
    return;
  }

  let html = '';
  dayEvts.forEach((ev, i) => {
    const col = ev.color && ev.color.startsWith('#') ? ev.color : (EVENT_COLORS[parseInt(ev.color) || 0] || EVENT_COLORS[0]);
    html += `
      <div class="event-item">
        <div class="event-dot" style="background:${col}"></div>
        <div class="event-text">${esc(ev.title)}</div>
        ${ev.time ? `<div class="event-time">${ev.time}</div>` : ''}
        <button class="event-del" onclick="deleteEvent(${ev.id})" title="Elimina">✕</button>
      </div>`;
  });
  dayTasks.forEach(t => {
    html += `
      <div class="event-item">
        <div class="event-dot" style="background:${t.done ? '#9E9E9E' : '#FF8F00'}"></div>
        <div class="event-text">${t.done ? '<s>' : ''}${esc(t.name || t.text || '—')}${t.done ? '</s>' : ''}</div>
        <button class="event-del" onclick="deleteTask(${t.id}); renderEventsPanel()" title="Elimina">✕</button>
      </div>`;
  });
  el.innerHTML = html;
}

/* ===== CRUD EVENTI ===== */
function addEvent() {
  const titleInp = document.getElementById('event-title-input');
  const timeInp  = document.getElementById('event-time-input');
  const title    = titleInp ? titleInp.value.trim() : '';
  if (!title) return;

  events.push({
    id:    Date.now(),
    title,
    date:  selDate || todayStr(),
    time:  timeInp ? timeInp.value : '',
    color: selEventColor,
  });
  if (titleInp) titleInp.value = '';
  if (timeInp)  timeInp.value  = '';
  saveEvents();
  renderCal();
  renderEventsPanel();
}

function selectEventColor(color) {
  selEventColor = color;
  document.querySelectorAll('.ecol').forEach(el =>
    el.classList.toggle('selected', el.dataset.color === color));
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveEvents();
  renderCal();
  renderEventsPanel();
}

/* Enter su form evento */
function eventFormKeydown(e) {
  if (e.key === 'Enter') addEvent();
}
