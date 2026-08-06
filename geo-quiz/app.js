/**
 * Geo Quiz
 *
 * Phases 1–2: shell, map, and answer entry with scoring. The timer, win detection and
 * Give up arrive in Phase 3 — see docs/PLAN.md.
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

const state = {
  mode: 'countries',
  status: 'idle',
  found: new Set(),
};

const el = {
  map: document.getElementById('map'),
  entry: document.getElementById('entry'),
  answer: document.getElementById('answer'),
  giveUp: document.getElementById('give-up'),
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

function addAnswer(country) {
  const li = document.createElement('li');
  li.className = 'answer-row';
  li.id = `row-${country.m49}`;

  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = '✓';
  mark.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = MODES[state.mode].entry(country);

  li.append(mark, label);
  // Newest first, so the last answer is always visible without scrolling.
  el.answers.prepend(li);
}

function flashAnswer(m49) {
  const row = document.getElementById(`row-${m49}`);
  if (!row) return;
  row.classList.remove('flash');
  void row.offsetWidth; // restart the animation
  row.classList.add('flash');
  row.scrollIntoView({ block: 'nearest' });
}

// --- Game ---------------------------------------------------------------------------

function submit(raw) {
  const result = evaluate(raw, state.mode, state.found);

  switch (result.type) {
    case 'empty':
      return;

    case 'correct':
      state.found.add(result.country.m49);
      paint(result.country.m49, 'found');
      addAnswer(result.country);
      render();
      say(`${result.country.name} ✓`);
      el.answer.value = ''; // only a correct answer clears the box
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

function say(message) {
  el.status.textContent = message;
}

function render() {
  el.count.textContent = String(state.found.size);
  el.total.textContent = String(TOTAL);
  el.listEmpty.hidden = state.found.size > 0;
}

function reset() {
  state.found.clear();
  state.status = 'idle';
  clearPaint();
  el.answers.replaceChildren();
  el.answer.value = '';
  render();
  say('');
}

function setMode(mode) {
  if (!MODES[mode] || mode === state.mode) return;
  if (state.found.size > 0 && !confirm('Switching mode starts a new game. Continue?')) {
    return;
  }

  state.mode = mode;
  for (const button of el.modes) {
    button.setAttribute('aria-selected', String(button.dataset.mode === mode));
  }
  el.answer.placeholder = MODES[mode].placeholder;
  el.answer.setAttribute('aria-label', MODES[mode].label);
  reset();
  el.answer.focus();
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

render();

loadMap().then((ok) => {
  if (!ok) return;
  el.answer.disabled = false;
  el.answer.focus();
});
