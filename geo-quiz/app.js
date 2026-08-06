/**
 * Geo Quiz
 *
 * Phase 1: shell, nav and a neutral map. Answer entry, scoring and the timer arrive in
 * later phases -- see docs/PLAN.md.
 */

import { COUNTRIES } from './data/countries.js';

const MODES = {
  countries: { placeholder: 'Name a country…', label: 'Enter a country name' },
  capitals: { placeholder: 'Name a capital…', label: 'Enter a capital city name' },
};

const state = {
  mode: 'countries',
  status: 'idle',
  found: new Set(),
};

const el = {
  map: document.getElementById('map'),
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
    // The most likely cause by far is opening index.html straight off disk, where fetch
    // is blocked by CORS. Say so rather than showing a bare failure.
    el.map.innerHTML =
      `<p class="map-message">Could not load the map (${escapeHtml(err.message)}).<br><br>` +
      `If you opened this file directly, serve it over HTTP instead: ` +
      `<code>npm run serve</code></p>`;
    return false;
  }
}

function setMode(mode) {
  if (!MODES[mode] || mode === state.mode) return;

  state.mode = mode;
  for (const button of el.modes) {
    button.setAttribute('aria-selected', String(button.dataset.mode === mode));
  }
  el.answer.placeholder = MODES[mode].placeholder;
  el.answer.setAttribute('aria-label', MODES[mode].label);
}

function render() {
  el.count.textContent = String(state.found.size);
  el.total.textContent = String(COUNTRIES.length);
  el.listEmpty.hidden = state.found.size > 0;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
}

// --- Wire up ------------------------------------------------------------------------

for (const button of el.modes) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

render();

loadMap().then((ok) => {
  if (!ok) return;
  el.status.textContent =
    `Map loaded — ${COUNTRIES.length} countries. Answer entry arrives in the next phase.`;
});
