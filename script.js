// ── Config ──────────────────────────────────────────
const FOCUS_MINS  = 25;
const BREAK_MINS  = 5;
const FOCUS_SECS  = FOCUS_MINS * 60;
const BREAK_SECS  = BREAK_MINS * 60;
const CIRCUMFERENCE = 2 * Math.PI * 95; // r=95

// ── State ───────────────────────────────────────────
let totalSecs    = FOCUS_SECS;
let remainSecs   = FOCUS_SECS;
let isRunning    = false;
let isBreak      = false;
let sessionNum   = 1;
let interval     = null;
let audioCtx     = null;

// ── DOM Refs ─────────────────────────────────────────
const countdown    = document.getElementById('countdown');
const phaseLabel   = document.getElementById('phaseLabel');
const sessionCount = document.getElementById('sessionCount');
const ringProgress = document.getElementById('ringProgress');
const startBtn     = document.getElementById('startBtn');
const btnIcon      = document.getElementById('btnIcon');
const resetBtn     = document.getElementById('resetBtn');
const historyList  = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const focusTab     = document.getElementById('focusTab');
const breakTab     = document.getElementById('breakTab');
const appDiv       = document.querySelector('.app');

// ── Ring setup ───────────────────────────────────────
ringProgress.style.strokeDasharray  = CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = 0;

// ── Helpers ──────────────────────────────────────────
function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function updateRing() {
  const pct    = remainSecs / totalSecs;
  const offset = CIRCUMFERENCE * (1 - pct);
  ringProgress.style.strokeDashoffset = offset;
}

function updateDisplay() {
  countdown.textContent    = fmt(remainSecs);
  phaseLabel.textContent   = isBreak ? 'BREAK' : 'FOCUS';
  sessionCount.textContent = `Session ${sessionNum}`;

  // tick animation
  countdown.classList.remove('tick');
  void countdown.offsetWidth; // reflow
  countdown.classList.add('tick');

  updateRing();

  // Tab highlight
  focusTab.classList.toggle('active', !isBreak);
  breakTab.classList.toggle('active',  isBreak);

  // App break mode
  appDiv.classList.toggle('break-mode', isBreak);
}

// ── Sound ────────────────────────────────────────────
function playBeep(freq = 880, duration = 0.5) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type      = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function playDone() {
  [660, 880, 1100].forEach((f, i) => {
    setTimeout(() => playBeep(f, 0.4), i * 180);
  });
}

// ── History (localStorage) ───────────────────────────
const STORAGE_KEY = 'pomodoro_history';

function todayKey() {
  return new Date().toDateString();
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Reset if different day
    if (data.day !== todayKey()) return [];
    return data.sessions || [];
  } catch { return []; }
}

function saveHistory(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    day: todayKey(),
    sessions
  }));
}

function addHistoryItem(label, mins) {
  const sessions = loadHistory();
  const entry = {
    label,
    mins,
    time: new Date().toISOString()
  };
  sessions.unshift(entry);
  saveHistory(sessions);
  renderHistory();
}

function renderHistory() {
  const sessions = loadHistory();
  historyCount.textContent = `${sessions.length} completed`;

  if (sessions.length === 0) {
    historyList.innerHTML = `<li class="history-empty">No sessions yet — start focusing!</li>`;
    return;
  }

  historyList.innerHTML = sessions.map(s => `
    <li class="history-item">
      <div class="check">✓</div>
      <div class="info">${s.label} — ${s.mins}:00</div>
      <div class="time-stamp">${formatTime(new Date(s.time))}</div>
    </li>
  `).join('');
}

// ── Done Overlay ─────────────────────────────────────
function showDoneOverlay(title, sub) {
  // Create overlay on the fly
  const existing = document.querySelector('.done-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'done-overlay';
  overlay.innerHTML = `
    <div class="done-card">
      <div class="done-emoji">${isBreak ? '☕' : '🎉'}</div>
      <div class="done-title">${title}</div>
      <div class="done-sub">${sub}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Show
  requestAnimationFrame(() => overlay.classList.add('show'));

  // Auto hide after 2.2s
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }, 2200);
}

// ── Timer Logic ──────────────────────────────────────
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  startBtn.classList.add('running');
  btnIcon.textContent = '⏸';

  interval = setInterval(() => {
    remainSecs--;
    updateDisplay();

    if (remainSecs <= 0) {
      clearInterval(interval);
      interval   = null;
      isRunning  = false;
      startBtn.classList.remove('running');

      playDone();

      if (!isBreak) {
        // Focus done → save to history
        addHistoryItem('focus', FOCUS_MINS);
        showDoneOverlay('Focus Complete!', 'Break time — well earned ☕');
        // Switch to break
        setTimeout(() => {
          isBreak    = true;
          totalSecs  = BREAK_SECS;
          remainSecs = BREAK_SECS;
          updateDisplay();
          startTimer(); // auto-start break
        }, 2400);
      } else {
        // Break done → reset everything
        showDoneOverlay('Break Over!', 'Ready for the next session?');
        setTimeout(() => {
          sessionNum++;
          isBreak    = false;
          totalSecs  = FOCUS_SECS;
          remainSecs = FOCUS_SECS;
          btnIcon.textContent = '▶';
          updateDisplay();
        }, 2400);
      }
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(interval);
  interval  = null;
  isRunning = false;
  startBtn.classList.remove('running');
  btnIcon.textContent = '▶';
}

function resetTimer() {
  clearInterval(interval);
  interval   = null;
  isRunning  = false;
  isBreak    = false;
  totalSecs  = FOCUS_SECS;
  remainSecs = FOCUS_SECS;
  startBtn.classList.remove('running');
  btnIcon.textContent = '▶';
  updateDisplay();
}

// ── Event Listeners ──────────────────────────────────
startBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

// Tab clicks (manual switch)
focusTab.addEventListener('click', () => {
  if (isRunning) pauseTimer();
  isBreak    = false;
  totalSecs  = FOCUS_SECS;
  remainSecs = FOCUS_SECS;
  updateDisplay();
});

breakTab.addEventListener('click', () => {
  if (isRunning) pauseTimer();
  isBreak    = true;
  totalSecs  = BREAK_SECS;
  remainSecs = BREAK_SECS;
  updateDisplay();
});

// ── Init ─────────────────────────────────────────────
renderHistory();
updateDisplay();