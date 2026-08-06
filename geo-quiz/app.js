/**
 * Geo Quiz
 *
 * Phases 1–3: shell, map, answer entry with scoring, timer, win detection and the
 * end-of-game reveal. See docs/PLAN.md.
 */

import { COUNTRIES } from './data/countries.js';
import { evaluate, TOTAL } from './match.js';

const MODES = {
  countries: {
    placeholder: 'Name a country…',
    label: 'Enter a country name',
    entry: (country) => country.name,
  },
  capitals: {
    placeholder: 'Name a capital…',
    label: 'Enter a capital city name',
    entry: (country) => `${country.capitals[0]} — ${country.name}`,
  },
};

/** idle -> running (first keystroke) -> finished (all found, or gave up). */
const state = {
  mode: 'countries',
  status: 'idle',
  found: new Set(),
  startedAt: null,
  elapsedMs: 0,
};

let ticker = null;

const el = {
  map: document.getElementById('map'),
  entry: document.getElementById('entry'),
  answer: document.getElementById('answer'),
  giveUp: document.getElementById('give-up'),
  timer: document.getElementById('timer'),
  listTitle: document.getElementById('list-title'),
  count: document.getElementById('count'),
  total: document.getElementById('total'),
  answers: document.getElementById('answers'),
  listEmpty: document.getElementById('list-empty'),
  status: document.getElementById('status'),
  modes: document.querySelectorAll('.mode'),
};

/** Loads the generated map and injects it inline so its paths are styleable. */
async function loadMap() {
  try {
    const res = await fetch('data/world.svg');
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    el.map.innerHTML = await res.text();
    el.map.dataset.state = 'ready';

    const svg = el.map.querySelector('svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'World map');
    return true;
  } catch (err) {
    el.map.dataset.state = 'error';
    // Most likely cause by far is opening index.html straight off disk, where fetch is
    // blocked by CORS. Say so rather than showing a bare failure.
    el.map.innerHTML =
      `<p class="map-message">Could not load the map (${escapeHtml(err.message)}).<br><br>` +
      `If you opened this file directly, serve it over HTTP instead: ` +
      `<code>npm run serve</code></p>`;
    return false;
  }
}

// --- Timer --------------------------------------------------------------------------

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Starts on the first keystroke, not on page load, so you can study the map first. */
function startTimer() {
  if (state.status !== 'idle') return;

  state.status = 'running';
  state.startedAt = Date.now();
  el.timer.classList.add('running');
  // Recomputed from the start time rather than accumulated, so it cannot drift.
  ticker = setInterval(() => {
    state.elapsedMs = Date.now() - state.startedAt;
    el.timer.textContent = formatTime(state.elapsedMs);
  }, 250);
}

function stopTimer() {
  clearInterval(ticker);
  ticker = null;
  if (state.startedAt !== null) state.elapsedMs = Date.now() - state.startedAt;
  el.timer.textContent = formatTime(state.elapsedMs);
  el.timer.classList.remove('running');
}

// --- Map painting -------------------------------------------------------------------

/** A country is up to three elements: its shape, and for micro-states a pin and leader. */
function paint(m49, className) {
  for (const prefix of ['c', 'm', 'l']) {
    document.getElementById(prefix + m49)?.classList.add(className);
  }
}

function clearPaint() {
  for (const node of el.map.querySelectorAll('.found, .missed')) {
    node.classList.remove('found', 'missed');
  }
}

// --- Answer list --------------------------------------------------------------------

function answerRow(country, missed = false) {
  const li = document.createElement('li');
  li.className = missed ? 'answer-row is-missed' : 'answer-row';
  li.id = `row-${country.m49}`;

  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = missed ? '✗' : '✓';
  mark.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = MODES[state.mode].entry(country);

  li.append(mark, label);
  return li;
}

function groupRow(text) {
  const li = document.createElement('li');
  li.className = 'answer-group';
  li.textContent = text;
  return li;
}

function flashAnswer(m49) {
  const row = document.getElementById(`row-${m49}`);
  if (!row) return;
  row.classList.remove('flash');
  void row.offsetWidth; // restart the animation
  row.classList.add('flash');
  row.scrollIntoView({ block: 'nearest' });
}

/**
 * Rebuilds the list for the end of a game: alphabetical, found above missed. During play
 * the list is newest-first, which is right for spotting your last answer but useless for
 * reading back what you missed.
 */
function revealList() {
  const found = COUNTRIES.filter((c) => state.found.has(c.m49));
  const missed = COUNTRIES.filter((c) => !state.found.has(c.m49));

  // Headings only earn their place when there is something to separate: a clean sweep or
  // a blank game is one uniform list.
  const grouped = found.length > 0 && missed.length > 0;

  el.answers.replaceChildren();
  if (found.length) {
    if (grouped) el.answers.append(groupRow(`Found — ${found.length}`));
    for (const c of found) el.answers.append(answerRow(c));
  }
  if (missed.length) {
    if (grouped) el.answers.append(groupRow(`Missed — ${missed.length}`));
    for (const c of missed) el.answers.append(answerRow(c, true));
  }
  el.answers.scrollTop = 0;
}

// --- Game ---------------------------------------------------------------------------

function submit(raw) {
  if (state.status === 'finished') return;
  const result = evaluate(raw, state.mode, state.found);

  switch (result.type) {
    case 'empty':
      return;

    case 'correct':
      state.found.add(result.country.m49);
      paint(result.country.m49, 'found');
      el.answers.prepend(answerRow(result.country)); // newest first while playing
      render();
      say(`${result.country.name} ✓`);
      el.answer.value = ''; // only a correct answer clears the box
      if (state.found.size === TOTAL) finish(true);
      return;

    case 'duplicate':
      flashAnswer(result.country.m49);
      say(`Already found ${result.country.name}.`);
      el.answer.select();
      return;

    case 'ambiguous':
    case 'rejected':
    case 'wrong-mode':
      reject(result.message);
      return;

    case 'near-miss':
      reject('Close — check your spelling.');
      return;

    default:
      reject('Not recognised.');
  }
}

/**
 * Wrong answers keep the text in the box. With strict matching that is the only way to
 * fix a near-miss spelling without retyping the whole name.
 */
function reject(message) {
  say(message);
  el.answer.classList.remove('shake');
  void el.answer.offsetWidth;
  el.answer.classList.add('shake');
}

function finish(won) {
  if (state.status === 'finished') return;

  stopTimer();
  state.status = 'finished';

  for (const c of COUNTRIES) {
    if (!state.found.has(c.m49)) paint(c.m49, 'missed');
  }
  revealList();
  render();

  const time = formatTime(state.elapsedMs);
  say(
    won
      ? `All ${TOTAL} in ${time}. Every last one.`
      : `${state.found.size} of ${TOTAL} in ${time}. The rest are shown in red.`
  );
}

function say(message) {
  el.status.textContent = message;
}

function render() {
  const finished = state.status === 'finished';

  el.count.textContent = String(state.found.size);
  el.total.textContent = String(TOTAL);
  el.listEmpty.hidden = state.found.size > 0 || finished;

  el.listTitle.textContent = finished ? 'Result' : 'Found';

  el.answer.disabled = finished;
  el.giveUp.textContent = finished ? 'Play again' : 'Give up';
  el.giveUp.classList.toggle('is-primary', finished);
  // Nothing to give up on before the first keystroke.
  el.giveUp.disabled = state.status === 'idle';
}

function reset() {
  stopTimer();
  state.status = 'idle';
  state.found.clear();
  state.startedAt = null;
  state.elapsedMs = 0;

  clearPaint();
  el.answers.replaceChildren();
  el.answer.value = '';
  el.timer.textContent = formatTime(0);
  render();
  say('');
  el.answer.focus();
}

function setMode(mode) {
  if (!MODES[mode] || mode === state.mode) return;
  if (state.status === 'running' && !confirm('Switching mode starts a new game. Continue?')) {
    return;
  }

  state.mode = mode;
  for (const button of el.modes) {
    button.setAttribute('aria-selected', String(button.dataset.mode === mode));
  }
  el.answer.placeholder = MODES[mode].placeholder;
  el.answer.setAttribute('aria-label', MODES[mode].label);
  reset();
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`
  );
}

// --- Wire up ------------------------------------------------------------------------

for (const button of el.modes) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

el.entry.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(el.answer.value);
});

el.answer.addEventListener('input', () => {
  if (el.answer.value) startTimer();
  render();
});

el.giveUp.addEventListener('click', () => {
  if (state.status === 'finished') {
    reset();
    return;
  }
  if (confirm('End the game and reveal the countries you missed?')) finish(false);
});

render();

loadMap().then((ok) => {
  if (!ok) return;
  el.answer.disabled = false;
  el.answer.focus();
});
