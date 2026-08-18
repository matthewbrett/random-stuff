/**
 * Geo Quiz
 *
 * See docs/PLAN.md. Notable constraint: this runs inside sandboxed iframes (the preview
 * build), where window.confirm() is ignored and native form submission is blocked. Both
 * are avoided deliberately — see ask() and the Enter handler.
 */

import { COUNTRIES, CONTINENTS } from './data/countries.js';
import { evaluate } from './match.js';

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

/** Map coordinate space, fixed by the generator. */
const BASE = { w: 2000, h: 1000 };
const MAX_ZOOM = 16;

/** idle -> running (first keystroke) -> finished (all found, or gave up). */
const state = {
  mode: 'countries',
  scope: '', // '' is the whole world, otherwise a continent name
  learning: false, // untimed, and the map will name a country you ask it about
  status: 'idle',
  found: new Set(),
  startedAt: null,
  elapsedMs: 0,
};

const view = { x: 0, y: 0, w: BASE.w, h: BASE.h };

let ticker = null;
let svg = null;
/** Pin tip positions, parsed once so zoom can counter-scale them. */
let pins = [];
/** The pan in progress, if any. Identifying stands down while the map is moving. */
let dragging = null;
/** Layer holding the outline of whichever country is being pointed at. */
let highlight = null;
/** m49 of the outlined country, '' for none. */
let highlighted = '';
/** The list row tied to the outlined country, so it can be un-tied again. */
let linkedRow = null;
/** m49 of a country named because you clicked it, which a hover must not undo. */
let revealed = '';
let tipTimer = null;

const el = {
  map: document.getElementById('map'),
  mapPanel: document.querySelector('.map-panel'),
  tip: document.getElementById('map-tip'),
  entry: document.getElementById('entry'),
  answer: document.getElementById('answer'),
  giveUp: document.getElementById('give-up'),
  learn: document.getElementById('learn'),
  timer: document.getElementById('timer'),
  scope: document.getElementById('scope'),
  listTitle: document.getElementById('list-title'),
  count: document.getElementById('count'),
  total: document.getElementById('total'),
  breakdown: document.getElementById('breakdown'),
  answers: document.getElementById('answers'),
  listEmpty: document.getElementById('list-empty'),
  status: document.getElementById('status'),
  modes: document.querySelectorAll('.mode'),
  ask: document.getElementById('ask'),
  askText: document.getElementById('ask-text'),
  askYes: document.getElementById('ask-yes'),
  askNo: document.getElementById('ask-no'),
  zoomIn: document.getElementById('zoom-in'),
  zoomOut: document.getElementById('zoom-out'),
  zoomReset: document.getElementById('zoom-reset'),
};

// --- Scope --------------------------------------------------------------------------

const inScope = (country) => !state.scope || country.continent === state.scope;
const active = () => COUNTRIES.filter(inScope);

// --- Confirmation -------------------------------------------------------------------

/**
 * Stands in for window.confirm(), which a sandboxed frame ignores outright — it returns
 * false without ever showing anything, which silently swallowed Give up in the preview
 * build. <dialog>.showModal() is not covered by the sandbox modal restriction.
 */
function ask(question) {
  return new Promise((resolve) => {
    el.askText.textContent = question;

    const close = (answer) => {
      el.ask.close();
      el.askYes.removeEventListener('click', yes);
      el.askNo.removeEventListener('click', no);
      el.ask.removeEventListener('cancel', no);
      resolve(answer);
    };
    const yes = () => close(true);
    const no = () => close(false);

    el.askYes.addEventListener('click', yes);
    el.askNo.addEventListener('click', no);
    el.ask.addEventListener('cancel', no); // Esc
    el.ask.showModal();
    el.askNo.focus();
  });
}

// --- Map ----------------------------------------------------------------------------

async function loadMap() {
  try {
    // A single-file build ships the map already inlined; nothing to fetch.
    if (!el.map.querySelector('svg')) {
      const res = await fetch('data/world.svg');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      el.map.innerHTML = await res.text();
    }
    el.map.dataset.state = 'ready';

    svg = el.map.querySelector('svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'World map');

    pins = [...svg.querySelectorAll('#markers > g')].map((node) => {
      const [x, y] = node.getAttribute('transform').match(/-?[\d.]+/g).map(Number);
      return { node, x, y };
    });

    // Outlines are drawn into a layer of their own, above every country. SVG has no
    // z-index, so outlining a country in place leaves it overdrawn by its neighbours --
    // France's eastern border would sit under Germany.
    highlight = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    highlight.id = 'highlight';
    svg.append(highlight);

    applyView();
    enablePanZoom();
    enableIdentify();
    return true;
  } catch (err) {
    el.map.dataset.state = 'error';
    el.map.innerHTML =
      `<p class="map-message">Could not load the map (${escapeHtml(err.message)}).<br><br>` +
      `If you opened this file directly, serve it over HTTP instead: ` +
      `<code>npm run serve</code></p>`;
    return false;
  }
}

/** Pushes the current view to the SVG and keeps pins a constant size on screen. */
function applyView() {
  if (!svg) return;
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  // Pins are drawn in map units, so without this they would balloon as you zoom in.
  // Scaling about the tip (their transform origin) keeps them pointing at the same spot.
  const scale = view.w / BASE.w;
  for (const pin of pins) {
    pin.node.setAttribute('transform', `translate(${pin.x},${pin.y}) scale(${scale})`);
  }
  syncHighlight(); // an outlined pin holds a copy of the transform just rewritten
  el.map.classList.toggle('is-zoomed', view.w < BASE.w);
}

function clampView() {
  view.w = Math.min(BASE.w, Math.max(BASE.w / MAX_ZOOM, view.w));
  view.h = view.w / 2;
  view.x = Math.min(BASE.w - view.w, Math.max(0, view.x));
  view.y = Math.min(BASE.h - view.h, Math.max(0, view.y));
}

/** Zooms by `factor` about a fixed point given in map coordinates. */
function zoomAbout(factor, fx, fy) {
  const before = view.w;
  view.w = view.w * factor;
  clampView();
  const ratio = view.w / before;

  view.x = fx - (fx - view.x) * ratio;
  view.y = fy - (fy - view.y) * ratio;
  clampView();
  applyView();
}

/** Screen coordinates -> map coordinates. */
function toMap(event) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: view.x + view.w / 2, y: view.y + view.h / 2 };
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  return { x: point.x, y: point.y };
}

function enablePanZoom() {
  // Non-passive so the page itself never scrolls or zooms underneath the map.
  el.map.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const at = toMap(event);
      zoomAbout(event.deltaY > 0 ? 1.2 : 1 / 1.2, at.x, at.y);
    },
    { passive: false }
  );

  el.map.addEventListener('pointerdown', (event) => {
    if (view.w >= BASE.w) return; // nothing to pan while fully zoomed out
    dragging = { ...toMap(event), id: event.pointerId };
    el.map.setPointerCapture(event.pointerId);
    el.map.classList.add('is-panning');
  });

  el.map.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const at = toMap(event);
    view.x += dragging.x - at.x;
    view.y += dragging.y - at.y;
    clampView();
    applyView();
  });

  const endDrag = (event) => {
    if (!dragging) return;
    el.map.releasePointerCapture(dragging.id);
    dragging = null;
    el.map.classList.remove('is-panning');
  };
  el.map.addEventListener('pointerup', endDrag);
  el.map.addEventListener('pointercancel', endDrag);

  el.map.addEventListener('dblclick', () => resetView());
}

function resetView() {
  view.x = 0;
  view.y = 0;
  view.w = BASE.w;
  view.h = BASE.h;
  applyView();
}

// --- Painting -----------------------------------------------------------------------

/** A country is up to three elements: its shape, and for micro-states a pin and leader. */
function paint(m49, className) {
  for (const prefix of ['c', 'm', 'l']) {
    document.getElementById(prefix + m49)?.classList.add(className);
  }
}

function repaintScope() {
  for (const c of COUNTRIES) {
    for (const prefix of ['c', 'm', 'l']) {
      document.getElementById(prefix + c.m49)?.classList.toggle('out-of-scope', !inScope(c));
    }
  }
}

function clearPaint() {
  for (const node of el.map.querySelectorAll('.found, .missed')) {
    node.classList.remove('found', 'missed');
  }
}

// --- Identify -----------------------------------------------------------------------

/**
 * The two panels answer each other: point at the map to get a name, point at a name to
 * get the place. Hovering names, clicking travels -- splitting the two verbs is what
 * lets the list drive the map on touch, which has no hover to offer.
 */

const BY_M49 = new Map(COUNTRIES.map((c) => [c.m49, c]));

/** The country behind a map element -- null for ocean and for inert territories. */
function countryAt(node) {
  const owner = node?.closest?.('#countries path, #markers g[id], #leaders line');
  return (owner && BY_M49.get(owner.id.slice(1))) || null;
}

/**
 * Whether a country will give up its name. Not the ones you have yet to find: sweeping
 * the pointer over Europe would otherwise read out the answer sheet. Out-of-scope
 * countries are never answers, so they name themselves freely and help you get your
 * bearings while playing a single continent.
 *
 * `asked` marks a deliberate click rather than a pointer passing over. In learning mode
 * that is enough to name anything -- you have to ask for an answer, and asking is the
 * whole point of the mode.
 */
function names(country, asked = false) {
  if (!country) return false;
  return (
    !inScope(country) ||
    state.status === 'finished' ||
    state.found.has(country.m49) ||
    (asked && state.learning)
  );
}

/** Outlines a country on the map: its shape, and for a micro-state its pin and leader. */
function setHighlight(m49) {
  if (!highlight || m49 === highlighted) return;
  highlighted = m49;
  highlight.replaceChildren();
  if (!m49) return;

  for (const prefix of ['c', 'm', 'l']) {
    const source = document.getElementById(prefix + m49);
    if (!source) continue;
    const copy = source.cloneNode(true);
    copy.removeAttribute('id'); // ids must stay unique -- paint() looks countries up by id
    copy.removeAttribute('class'); // the copy is styled by #highlight alone
    highlight.append(copy);
  }
}

/** A copied pin carries the transform it had when copied; zooming rewrites the original. */
function syncHighlight() {
  if (!highlighted) return;
  const source = document.getElementById('m' + highlighted);
  const copy = highlight?.querySelector('g');
  if (source && copy) copy.setAttribute('transform', source.getAttribute('transform'));
}

function showTip(country, clientX, clientY) {
  const panel = el.mapPanel.getBoundingClientRect();
  el.tip.textContent = MODES[state.mode].entry(country);
  el.tip.hidden = false;

  // Measured after unhiding, then held clear of both edges: countries reach the sides of
  // the map, and a name running off the panel is no use.
  const half = el.tip.offsetWidth / 2;
  const x = clientX - panel.left;
  const y = clientY - panel.top;
  const below = y < 44; // no room above the pointer -- flip under it instead
  el.tip.classList.toggle('is-below', below);
  el.tip.style.left = `${Math.min(panel.width - half - 8, Math.max(half + 8, x))}px`;
  el.tip.style.top = `${below ? y + 20 : y - 14}px`;
}

function hideTip() {
  if (el.tip.hidden) return;
  el.tip.hidden = true;
  el.tip.textContent = '';
}

/** Marks the list row for a country the map is naming, and scrolls it into view. */
function linkRow(m49) {
  const row = m49 ? document.getElementById(`row-${m49}`) : null;
  if (row === linkedRow) return;

  linkedRow?.classList.remove('is-linked');
  linkedRow = row;
  if (!row) return;

  row.classList.add('is-linked');
  row.scrollIntoView({ block: 'nearest' });
}

function identify(country, event) {
  if (!country) {
    clearIdentify();
    return;
  }
  setHighlight(country.m49);
  linkRow(country.m49);
  showTip(country, event.clientX, event.clientY);
}

function clearIdentify() {
  clearTimeout(tipTimer);
  revealed = '';
  setHighlight('');
  linkRow('');
  hideTip();
}

/**
 * Frames a country. Zooming to its bounding box is wrong for island nations scattered
 * across the Pacific -- Kiribati's box is most of the map -- so anything with a pin is
 * centred on the pin instead, which the generator already placed on actual land.
 */
function focusCountry(m49) {
  const shape = document.getElementById('c' + m49);
  if (!shape || !svg) return;

  const pin = pins.find((p) => p.node.id === 'm' + m49);
  const box = shape.getBBox();
  const at = pin ? pin : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const span = pin ? 0 : Math.max(box.width, box.height * 2);

  view.w = span * 2.2; // clamped below, so a micro-state lands at full zoom
  clampView();
  view.x = at.x - view.w / 2;
  view.y = at.y - view.h / 2;
  clampView();
  applyView();
  setHighlight(m49);
  el.map.scrollIntoView({ block: 'nearest' }); // stacked layout: the map may be off-screen
}

function enableIdentify() {
  el.map.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return; // touch identifies by tap, below
    if (dragging) {
      clearIdentify();
      return;
    }

    const country = countryAt(event.target);
    // A name you asked for stays up until you leave that country -- otherwise the first
    // twitch of the mouse after the click would wipe it.
    if (country && country.m49 === revealed) {
      identify(country, event);
      return;
    }
    revealed = '';
    identify(names(country) ? country : null, event);
  });

  el.map.addEventListener('pointerleave', clearIdentify);

  // Tap to identify. Tracked from pointerdown so a pan is not mistaken for a tap, and
  // resolved by point rather than by event.target, which pointer capture retargets to
  // the map itself for the whole of a drag.
  let tapFrom = null;
  el.map.addEventListener('pointerdown', (event) => {
    tapFrom = { x: event.clientX, y: event.clientY };
  });

  el.map.addEventListener('pointerup', (event) => {
    const from = tapFrom;
    tapFrom = null;
    if (!from || Math.hypot(event.clientX - from.x, event.clientY - from.y) > 6) return;

    const at = countryAt(document.elementFromPoint(event.clientX, event.clientY));
    const country = names(at, true) ? at : null;
    identify(country, event);
    if (country) {
      revealed = country.m49;
      say(MODES[state.mode].entry(country)); // you asked, so it is worth announcing
    }

    clearTimeout(tipTimer);
    // Touch has no pointer to move away, so the name has to time itself out.
    if (country && event.pointerType !== 'mouse') tipTimer = setTimeout(clearIdentify, 3000);
  });
}

/** The list row an event landed on, if any. Delegated: the list is rebuilt as you play. */
function rowOf(event) {
  return event.target.closest?.('.answer-row');
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

/** Per-continent progress, so you can see which region is letting you down. */
function renderBreakdown() {
  // Playing a single continent, this would just restate the header count.
  el.breakdown.replaceChildren();
  if (state.scope) return;

  for (const continent of CONTINENTS) {
    const all = COUNTRIES.filter((c) => c.continent === continent);
    const got = all.filter((c) => state.found.has(c.m49)).length;

    const li = document.createElement('li');
    li.className = 'breakdown-row' + (got === all.length ? ' is-complete' : '');

    const name = document.createElement('span');
    name.className = 'breakdown-name';
    name.textContent = continent;

    const bar = document.createElement('span');
    bar.className = 'breakdown-bar';
    const fill = document.createElement('span');
    fill.style.width = `${(got / all.length) * 100}%`;
    bar.append(fill);

    const num = document.createElement('span');
    num.className = 'breakdown-num';
    num.textContent = `${got}/${all.length}`;

    li.append(name, bar, num);
    el.breakdown.append(li);
  }
}

/**
 * End-of-game list, grouped by continent — much easier to study one region at a time
 * than to read 195 names in one alphabetical run. Found first within each group.
 */
function revealList() {
  el.answers.replaceChildren();

  for (const continent of CONTINENTS) {
    const all = active().filter((c) => c.continent === continent);
    if (!all.length) continue;

    const found = all.filter((c) => state.found.has(c.m49));
    const missed = all.filter((c) => !state.found.has(c.m49));

    el.answers.append(groupRow(`${continent} — ${found.length}/${all.length}`));
    for (const c of found) el.answers.append(answerRow(c));
    for (const c of missed) el.answers.append(answerRow(c, true));
  }

  // The game is over, so the input no longer holds focus: this is the point at which
  // tabbing the list to walk the map is worth having.
  for (const row of el.answers.querySelectorAll('.answer-row')) row.tabIndex = 0;
  el.answers.scrollTop = 0;
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

/**
 * The run starts on the first keystroke, not on page load, so you can study the map
 * first. Learning mode is untimed: the run still starts, but the clock stays dark --
 * a number you are not being measured against is just something to feel bad about.
 */
function startRun() {
  if (state.status !== 'idle') return;

  state.status = 'running';
  if (state.learning) return;

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

// --- Game ---------------------------------------------------------------------------

function submit(raw) {
  if (state.status === 'finished') return;
  const result = evaluate(raw, state.mode, state.found);

  switch (result.type) {
    case 'empty':
      return;

    case 'correct':
      // Right answer, wrong region: worth saying so rather than calling it unknown.
      if (!inScope(result.country)) {
        reject(`${result.country.name} is not in ${state.scope}.`);
        return;
      }
      state.found.add(result.country.m49);
      paint(result.country.m49, 'found');
      el.answers.prepend(answerRow(result.country)); // newest first while playing
      render();
      say(`${result.country.name} ✓`);
      el.answer.value = ''; // only a correct answer clears the box
      if (state.found.size === active().length) finish(true);
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
let shakeTimer = null;

function reject(message) {
  say(message);
  el.answer.classList.remove('shake');
  void el.answer.offsetWidth; // restart the animation
  el.answer.classList.add('shake');

  // The class carries a red border as well as the animation, so it has to come off
  // again or the box stays red for the rest of the game. Driven by a timer rather than
  // animationend, which never fires under prefers-reduced-motion.
  clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => el.answer.classList.remove('shake'), 400);
}

function finish(won) {
  if (state.status === 'finished') return;

  stopTimer();
  state.status = 'finished';

  for (const c of active()) {
    if (!state.found.has(c.m49)) paint(c.m49, 'missed');
  }
  revealList();
  render();

  const total = active().length;
  const where = state.scope || 'the world';
  const time = state.learning ? '' : ` in ${formatTime(state.elapsedMs)}`;
  say(
    won
      ? `All ${total} of ${where}${time}. Every last one.`
      : `${state.found.size} of ${total}${time}. The rest are shown in red.`
  );
}

function say(message) {
  el.status.textContent = message;
}

function render() {
  const finished = state.status === 'finished';

  el.count.textContent = String(state.found.size);
  el.total.textContent = String(active().length);
  el.listTitle.textContent = finished ? 'Result' : 'Found';
  el.listEmpty.hidden = state.found.size > 0 || finished;

  el.learn.setAttribute('aria-pressed', String(state.learning));
  el.timer.classList.toggle('is-off', state.learning);
  el.timer.setAttribute('aria-label', state.learning ? 'Timer off in learning mode' : 'Elapsed time');

  el.answer.disabled = finished;
  el.giveUp.textContent = finished ? 'Play again' : 'Give up';
  el.giveUp.classList.toggle('is-primary', finished);
  // Nothing to give up on before the first keystroke.
  el.giveUp.disabled = state.status === 'idle';

  renderBreakdown();
}

function reset() {
  stopTimer();
  state.status = 'idle';
  state.found.clear();
  state.startedAt = null;
  state.elapsedMs = 0;

  clearPaint();
  clearIdentify();
  repaintScope();
  el.answers.replaceChildren();
  el.answer.value = '';
  el.timer.textContent = formatTime(0);
  render();
  say('');
  el.answer.focus();
}

/** Any change that alters the answer set has to start a fresh game. */
async function change(apply) {
  if (state.status === 'running' && !(await ask('This starts a new game. Continue?'))) {
    return false;
  }
  apply();
  reset();
  return true;
}

function setMode(mode) {
  if (!MODES[mode] || mode === state.mode) return;
  change(() => {
    state.mode = mode;
    for (const button of el.modes) {
      button.setAttribute('aria-selected', String(button.dataset.mode === mode));
    }
    el.answer.placeholder = MODES[mode].placeholder;
    el.answer.setAttribute('aria-label', MODES[mode].label);
  });
}

/**
 * Learning mode is a setting, not a game state: it survives Play again, and turning it
 * on or off starts a fresh game like any other change to what is being asked of you.
 */
async function setLearning(on) {
  if (on === state.learning) return;
  const ok = await change(() => {
    state.learning = on;
  });
  // reset() has just cleared the status line, so the hint goes in after it.
  if (ok && on) say('Learning mode. The clock is off, and clicking a country names it.');
}

async function setScope(scope) {
  if (scope === state.scope) return;
  const ok = await change(() => {
    state.scope = scope;
  });
  if (!ok) el.scope.value = state.scope; // put the select back
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`
  );
}

// --- Wire up ------------------------------------------------------------------------

for (const continent of CONTINENTS) {
  const option = document.createElement('option');
  option.value = continent;
  option.textContent = `${continent} (${COUNTRIES.filter((c) => c.continent === continent).length})`;
  el.scope.append(option);
}

for (const button of el.modes) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

el.scope.addEventListener('change', () => setScope(el.scope.value));

el.learn.addEventListener('click', () => setLearning(!state.learning));

// Enter is handled on keydown rather than via form submission: sandboxed frames block
// native submission outright, which would make the game unplayable in the preview build.
el.answer.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  submit(el.answer.value);
});

el.entry.addEventListener('submit', (event) => event.preventDefault());

el.answer.addEventListener('input', () => {
  if (el.answer.value) startRun();
  render();
});

el.giveUp.addEventListener('click', async () => {
  if (state.status === 'finished') {
    reset();
    return;
  }
  if (await ask('End the game and reveal the countries you missed?')) finish(false);
});

// Row -> map. Hovering outlines the country, clicking travels to it -- so the link works
// on touch, which has no hover to offer.
el.answers.addEventListener('pointerover', (event) => {
  const row = rowOf(event);
  setHighlight(row ? row.id.slice(4) : ''); // group headings clear it again
});

el.answers.addEventListener('pointerleave', () => setHighlight(''));

el.answers.addEventListener('click', (event) => {
  const row = rowOf(event);
  if (!row) return;
  focusCountry(row.id.slice(4));
  // Clicking an <li> leaves focus on the body, which would send the next keystrokes
  // nowhere. Not on touch, where refocusing throws the keyboard back over the map.
  if (state.status !== 'finished' && event.pointerType !== 'touch') el.answer.focus();
});

// Rows become focusable once the game ends (see revealList) -- during play focus belongs
// in the input, and 195 tab stops would bury every other control.
el.answers.addEventListener('focusin', (event) => {
  const row = rowOf(event);
  if (row) setHighlight(row.id.slice(4));
});

el.answers.addEventListener('focusout', () => setHighlight(''));

el.answers.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = rowOf(event);
  if (!row) return;
  event.preventDefault();
  focusCountry(row.id.slice(4));
});

el.zoomIn.addEventListener('click', () => zoomAbout(1 / 1.4, view.x + view.w / 2, view.y + view.h / 2));
el.zoomOut.addEventListener('click', () => zoomAbout(1.4, view.x + view.w / 2, view.y + view.h / 2));
el.zoomReset.addEventListener('click', resetView);

render();

loadMap().then((ok) => {
  if (!ok) return;
  repaintScope();
  el.answer.disabled = false;
  el.answer.focus();
});
