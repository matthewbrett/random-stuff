/**
 * Generates the two data files the game ships with:
 *
 *   data/world.svg     -- one <path> per country, keyed by UN M49 code
 *   data/countries.js  -- the 195-country answer set
 *
 * Run manually after `npm install`; the output is committed so the game itself has no
 * build step and no runtime dependencies.
 *
 *   node tools/build-data.mjs
 *
 * Source data (see docs/PLAN.md §3):
 *   world-atlas     -- geometry, TopoJSON, keyed by M49          (ISC / public domain)
 *   world-countries -- names, capitals, ISO codes; ccn3 == M49   (ODbL)
 */

import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { COUNTRY_ALIASES, CAPITAL_ALIASES, AMBIGUOUS, REJECTED } from './aliases.mjs';
import { REGIONS } from './regions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = (p) => JSON.parse(readFileSync(join(ROOT, 'node_modules', p), 'utf8'));

// --- Tunables ---------------------------------------------------------------------

const WIDTH = 2000;
const HEIGHT = 1000;
/** Coordinate decimal places. 0 keeps the file small; the viewBox is scaled up to
 *  compensate, so integer precision still gives ~0.5px accuracy on a 1000px render. */
const PRECISION = 0;
/** Countries rendering smaller than this (px² at the above size) also get a map pin,
 *  otherwise turning them green produces no visible feedback at all. */
const MICRO_AREA = 30;
/** Pin geometry, in viewBox units. Tip sits on the country; bulb floats above it. */
const PIN_HEIGHT = 30;
const PIN_RADIUS = 10;
/** Declutter: bulbs closer than this get pushed apart, up to MAX_NUDGE from the anchor.
 *  Beyond that a leader line is drawn so the pin still reads as pointing somewhere. */
const PIN_GAP = 23;
const MAX_NUDGE = 70;
/** Antarctica: drawn by Natural Earth but not playable, and it dominates the projection
 *  if included in the fit. Excluded from both. */
const ANTARCTICA = '010';

// --- Load sources -----------------------------------------------------------------

const topo50 = require('world-atlas/countries-50m.json');
const topo10 = require('world-atlas/countries-10m.json');
const allCountries = require('world-countries/countries.json');

// --- Build the 195-country answer set ---------------------------------------------

// NOTE: world-countries flags Vatican City as unMember: true, which is wrong -- it is an
// observer state, not a member. So the target set is built explicitly and asserted,
// rather than trusting that flag. 193 members + Vatican + Palestine = 195.
const PALESTINE = '275';
const VATICAN = '336';

const target = allCountries.filter(
  (c) => c.unMember || c.ccn3 === PALESTINE || c.ccn3 === VATICAN
);

const trueMembers = target.filter(
  (c) => c.ccn3 !== PALESTINE && c.ccn3 !== VATICAN
).length;

assert(trueMembers === 193, `expected 193 UN members, got ${trueMembers}`);
assert(target.length === 195, `expected 195 countries, got ${target.length}`);

// --- Geometry ---------------------------------------------------------------------

const fc50 = feature(topo50, topo50.objects.countries);
const fc10 = feature(topo10, topo10.objects.countries);

// Two traps in this dataset, both from assuming one geometry per M49 code:
//
//  1. Some codes appear twice -- Australia shares 036 with Ashmore and Cartier Is.
//     Naive last-wins would replace Australia with a speck, so same-id features are
//     merged into a single MultiPolygon. That is also geographically correct: the
//     external territory really is part of that country's code.
//  2. Some features have no id at all (Kosovo, Somaliland, N. Cyprus, Siachen Glacier,
//     Indian Ocean Ter.). String(undefined) would collapse them onto one key and drop
//     all but the last, leaving holes in the map. They get synthetic keys instead and
//     are drawn as inert.
const geoms = new Map();
let unidentified = 0;

for (const f of fc50.features) {
  if (String(f.id) === ANTARCTICA) continue;

  if (f.id === undefined || f.id === null) {
    geoms.set(`x${unidentified++}`, f);
    continue;
  }

  const key = String(f.id);
  const existing = geoms.get(key);
  geoms.set(key, existing ? mergeFeatures(existing, f) : f);
}

if (unidentified) console.log(`· drew ${unidentified} unidentified areas as inert`);

// Tuvalu is absent from the 50m dataset but present at 10m. Graft it in so all 195
// countries are actually on the map.
const TUVALU = '798';
if (!geoms.has(TUVALU)) {
  const tv = fc10.features.find((f) => String(f.id) === TUVALU);
  assert(tv, 'Tuvalu missing from both 50m and 10m datasets');
  geoms.set(TUVALU, tv);
  console.log('· grafted Tuvalu geometry from the 10m dataset');
}

// Fit the projection to everything we draw, Antarctica already excluded.
const drawn = { type: 'FeatureCollection', features: [...geoms.values()] };
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], drawn);
const path = geoPath(projection);

const round = (d) => d.replace(/-?\d+\.\d+/g, (m) => (+m).toFixed(PRECISION));

// --- Emit the SVG -----------------------------------------------------------------

const playable = new Set(target.map((c) => c.ccn3));
const playablePaths = [];
const otherPaths = [];
const markers = [];
const leaders = [];
const pins = [];
const micro = new Set();
/** m49 -> { anchor, area, aspect, compact, pieces }, for every playable country. */
const shapes = new Map();

const r0 = (n) => n.toFixed(0);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Teardrop with its tip at the origin and a hole in the bulb (needs fill-rule=evenodd). */
const PIN_PATH = [
  `M0,0`,
  `C-4,-8 -${PIN_RADIUS},-${PIN_HEIGHT - PIN_RADIUS - 4} -${PIN_RADIUS},-${PIN_HEIGHT - PIN_RADIUS}`,
  `a${PIN_RADIUS},${PIN_RADIUS} 0 1,1 ${PIN_RADIUS * 2},0`,
  `C${PIN_RADIUS},-${PIN_HEIGHT - PIN_RADIUS - 4} 4,-8 0,0`,
  `Z`,
  `M0,-${PIN_HEIGHT - PIN_RADIUS - 4.5}`,
  `a4.5,4.5 0 1,0 0.01,0`,
  `Z`,
].join(' ');

for (const [m49, f] of [...geoms].sort(([a], [b]) => a.localeCompare(b))) {
  const d = path(f);
  if (!d) {
    console.warn(`! no path rendered for ${m49} (${f.properties?.name})`);
    continue;
  }
  const el = `<path id="c${m49}" d="${round(d)}"/>`;

  if (!playable.has(m49)) {
    // Territories, disputed areas and non-UN states. Drawn so the map looks like a
    // world map, but inert -- never a valid answer, never coloured.
    otherPaths.push(el);
    continue;
  }

  playablePaths.push(el);

  // Every country gets an anchor and a shape descriptor, not just the pinned ones --
  // the identify-mode engine scores similarity across all 195 (docs/PLAN.md §10).
  shapes.set(m49, describe(f));

  if (path.area(f) < MICRO_AREA) {
    const [ax, ay] = anchorOf(f);
    if (Number.isFinite(ax)) {
      micro.add(m49);
      pins.push({ m49, ax, ay, x: ax, y: ay });
    }
  }
}

// Spread overlapping pins apart. Positions are static, so this is solved once here
// rather than in the browser.
declutter(pins);

for (const p of pins.sort((a, b) => a.y - b.y)) {
  const nudged = Math.hypot(p.x - p.ax, p.y - p.ay);
  if (nudged > 2) {
    leaders.push(
      `<line id="l${p.m49}" x1="${r0(p.ax)}" y1="${r0(p.ay)}" x2="${r0(p.x)}" y2="${r0(p.y)}"/>`
    );
  }
  markers.push(
    `<g id="m${p.m49}" transform="translate(${r0(p.x)},${r0(p.y)})">` +
      `<path d="${PIN_PATH}" fill-rule="evenodd"/></g>`
  );
}

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" id="world-map">`,
  `<g id="other">${otherPaths.join('')}</g>`,
  `<g id="countries">${playablePaths.join('')}</g>`,
  `<g id="leaders">${leaders.join('')}</g>`,
  `<g id="markers">${markers.join('')}</g>`,
  `</svg>`,
].join('\n');

// --- Emit the answer set ----------------------------------------------------------

const regionOf = regionIndex(new Map(target.map((c) => [c.name.common, c])));

const countries = target
  .map((c) => {
    const m49 = c.ccn3;
    const capitals = [...(c.capital ?? []), ...(CAPITAL_ALIASES[m49] ?? [])];
    return {
      m49,
      name: c.name.common,
      official: c.name.official,
      capitals,
      aliases: COUNTRY_ALIASES[m49] ?? [],
      continent: continentOf(c),
      region: regionOf.get(m49),
      micro: micro.has(m49),
      ...shapes.get(m49),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// --- Assertions -------------------------------------------------------------------

const withoutGeometry = countries.filter((c) => !geoms.has(c.m49));
assert(
  withoutGeometry.length === 0,
  `no geometry for: ${withoutGeometry.map((c) => c.name).join(', ')}`
);

const withoutCapital = countries.filter((c) => c.capitals.length === 0);
assert(
  withoutCapital.length === 0,
  `no capital for: ${withoutCapital.map((c) => c.name).join(', ')}`
);

// Every micro-state must actually have a pin, or it has no visible state at all.
const pinned = new Set(pins.map((p) => p.m49));
const unpinned = countries.filter((c) => c.micro && !pinned.has(c.m49));
assert(unpinned.length === 0, `no pin for: ${unpinned.map((c) => c.name).join(', ')}`);

// The declutter aims for PIN_GAP between bulb centres but tethers each pin to within
// MAX_NUDGE of what it marks, so a crowded pair settles just inside the target rather
// than at it. app.js caps how large it draws a pin by this distance, to keep bulbs from
// overlapping at world zoom, so the achieved minimum is a contract rather than a detail.
// Measured on the rounded coordinates, because those are what ships and what the browser
// draws: the declutter settles Saint Vincent and Barbados at 23.0 units apart, and
// rounding both to integers takes that to 22.6.
const PIN_FLOOR = 22;
const at = (p) => [Math.round(p.x), Math.round(p.y)];
let closest = Infinity;
for (let i = 0; i < pins.length; i++) {
  for (let j = i + 1; j < pins.length; j++) {
    const [ax, ay] = at(pins[i]);
    const [bx, by] = at(pins[j]);
    closest = Math.min(closest, Math.hypot(ax - bx, ay - by));
  }
}
assert(
  closest >= PIN_FLOOR,
  `closest pins are ${closest.toFixed(1)} units apart, below the ${PIN_FLOOR} app.js draws to`
);

// No pin may be sliced off by the edge of the viewBox.
const clipped = pins.filter(
  (p) =>
    p.x - PIN_RADIUS < 0 || p.x + PIN_RADIUS > WIDTH || p.y - PIN_HEIGHT < 0 || p.y > HEIGHT
);
assert(clipped.length === 0, `pins clipped by the viewBox: ${clipped.map((p) => p.m49).join(', ')}`);

// Regression guard. Australia once came out as a micro-state because it shares its M49
// code with Ashmore and Cartier Is. and was being overwritten by it. Any of these
// showing up as a dot means geometry is being lost somewhere upstream.
for (const name of ['Australia', 'Russia', 'Canada', 'Brazil', 'China', 'India', 'United States']) {
  const c = countries.find((x) => x.name === name);
  assert(c, `expected ${name} in the country set`);
  assert(!c.micro, `${name} was classified as a micro-state -- its geometry is wrong`);
}

// --- Sub-region invariants (docs/PLAN.md §10) -------------------------------------

// Every country must be in exactly one region. regionIndex() already rejects unknown
// names and doubles; this catches the other direction, a country nobody listed.
const unregioned = countries.filter((c) => !c.region);
assert(
  unregioned.length === 0,
  `no region for: ${unregioned.map((c) => c.name).join(', ')}`
);

// Every country in a region must share its continent. A region that straddles two
// breaks the medium difficulty tier, which is defined as "same continent, different
// region" -- for a straddling region that phrase names two different sets depending on
// which member you started from. "Russia, Caucasus & Central Asia" did exactly this.
for (const region of new Set(countries.map((c) => c.region))) {
  const members = countries.filter((c) => c.region === region);
  const continents = [...new Set(members.map((c) => c.continent))];
  assert(
    continents.length === 1,
    `region "${region}" spans ${continents.join(' and ')}: ` +
      members.map((c) => `${c.name} (${c.continent})`).join(', ')
  );

  // A region may share a continent's name only if it holds exactly that continent.
  // Oceania and South America legitimately do; "North America" for Canada/US/Mexico did
  // not, and would have put two different meanings behind one label in the picker.
  const sameName = countries.filter((c) => c.continent === region);
  assert(
    sameName.length === 0 || sameName.length === members.length,
    `region "${region}" shares a continent's name but holds ${members.length} of its ${sameName.length}`
  );
}

// Every alias key must correspond to a country actually in the set, or it is silently
// doing nothing -- a typo in aliases.mjs should fail the build, not vanish.
for (const [table, name] of [[COUNTRY_ALIASES, 'COUNTRY_ALIASES'], [CAPITAL_ALIASES, 'CAPITAL_ALIASES']]) {
  for (const m49 of Object.keys(table)) {
    assert(playable.has(m49), `${name} has key ${m49}, which is not one of the 195`);
  }
}

// An alias must not collide with a real country name or another alias.
const seen = new Map();
for (const c of countries) {
  for (const n of [c.name, ...c.aliases]) {
    const k = normalise(n);
    assert(!seen.has(k), `duplicate country answer "${n}" (${c.name} vs ${seen.get(k)})`);
    seen.set(k, c.name);
  }
}
for (const k of Object.keys({ ...AMBIGUOUS, ...REJECTED })) {
  assert(!seen.has(k), `"${k}" is listed as ambiguous/rejected but is also a valid answer`);
}

// --- Write ------------------------------------------------------------------------

mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(join(ROOT, 'data/world.svg'), svg + '\n');

// Largest first, so the continent picker leads with the meatiest challenges.
const CONTINENTS = [...new Set(countries.map((c) => c.continent))].sort(
  (a, b) =>
    countries.filter((c) => c.continent === b).length -
      countries.filter((c) => c.continent === a).length || a.localeCompare(b)
);

const js = `// GENERATED by tools/build-data.mjs -- do not edit by hand.
// Country names, capitals and aliases for the 195-country answer set.

export const COUNTRIES = ${JSON.stringify(countries, null, 0)};

export const CONTINENTS = ${JSON.stringify(CONTINENTS, null, 0)};

export const AMBIGUOUS = ${JSON.stringify(AMBIGUOUS, null, 0)};

export const REJECTED = ${JSON.stringify(REJECTED, null, 0)};
`;
writeFileSync(join(ROOT, 'data/countries.js'), js);

// --- Report -----------------------------------------------------------------------

const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
console.log(`✓ ${countries.length}/195 countries, all with geometry and a capital`);
console.log(`  data/world.svg     ${playablePaths.length} playable + ${otherPaths.length} inert paths, ${markers.length} pins (${leaders.length} nudged), ${kb(svg)}`);
console.log(`  data/countries.js  ${seen.size} accepted country spellings, ${kb(js)}`);
console.log(`  ${new Set(countries.map((c) => c.region)).size} sub-regions, all inside one continent; 195 anchors and shape descriptors`);

/**
 * The source data has five UN regions, but "Americas" as a single bucket of 35 is too
 * coarse to practise against, so it is split on subregion. Central America and the
 * Caribbean group with North America, which is the usual continental reading.
 */
function continentOf(c) {
  if (c.region !== 'Americas') return c.region;
  return c.subregion === 'South America' ? 'South America' : 'North America';
}

/**
 * Splits a feature into its polygons, each as a Feature of its own so d3's path
 * measurements apply to it alone. Largest first.
 */
function landmasses(f) {
  const polys =
    f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  return polys
    .map((coordinates) => {
      const poly = { type: 'Feature', geometry: { type: 'Polygon', coordinates } };
      return { poly, area: path.area(poly) };
    })
    .sort((a, b) => b.area - a.area);
}

/**
 * What a country looks like on the map, for the identify-mode distractor engine
 * (docs/PLAN.md §10). Measured on the *projected* geometry rather than the geographic,
 * because "these two look alike" has to mean alike as drawn.
 *
 * Everything but `area` describes the largest landmass only, which also makes the
 * descriptor antimeridian-safe for free: Fiji, Kiribati and New Zealand have islands on
 * both edges of the map, so any measure spanning all of their pieces is meaningless.
 */
function describe(f) {
  const parts = landmasses(f);
  const area = parts.reduce((sum, p) => sum + p.area, 0);
  const biggest = parts[0];
  const [[x0, y0], [x1, y1]] = path.bounds(biggest.poly);
  const w = x1 - x0;
  const h = y1 - y0;
  const perimeter = path.measure(biggest.poly);
  const [ax, ay] = anchorOf(f);

  return {
    // Rounded hard: the engine only ever compares these, and log-area at three
    // significant figures is far finer than "do these two feel similar".
    anchor: [roundTo(ax, 0), roundTo(ay, 0)],
    // The largest landmass only, which is what makes this usable for framing where
    // getBBox() is not: the union of Fiji's islands spans x 0..1992, so framing a
    // country by its full extent shows the whole world (docs/PLAN.md §11).
    bbox: [roundTo(x0, 0), roundTo(y0, 0), roundTo(x1, 0), roundTo(y1, 0)],
    area: roundTo(area, 3),
    // How elongated -- Chile and Norway score high, Poland and Uruguay low. The floor
    // goes on BOTH sides, not just the divisor: with it on the divisor alone a country
    // smaller than half a unit reports an aspect below 1, which a max/min ratio can
    // never legitimately be, and the engine's log(aspect) then swings negative. Floored
    // both ways a sub-unit country reads 1.0 -- too small to tell, so call it square.
    aspect: roundTo(Math.max(w, h, 0.5) / Math.max(Math.min(w, h), 0.5), 2),
    // 4πA/P²: 1.0 is a perfect circle, and a ragged coastline drives it toward 0.
    compact: perimeter > 0 ? roundTo((4 * Math.PI * biggest.area) / (perimeter * perimeter), 3) : 0,
    // Islands that actually read as separate at this scale, not every rock.
    pieces: parts.filter((p) => p.area > 0.02 * area).length,
  };
}

/**
 * Trims a single number. Not the path-string `round` above, which rewrites every
 * coordinate in a `d` attribute. Declared as a function so it hoists above describe().
 */
function roundTo(n, dp) {
  return Number.isFinite(n) ? +n.toFixed(dp) : 0;
}

/** m49 -> sub-region name, inverted from the hand-maintained table in regions.mjs. */
function regionIndex(byName) {
  const index = new Map();
  for (const [region, names] of Object.entries(REGIONS)) {
    for (const name of names) {
      const country = byName.get(name);
      assert(country, `REGIONS lists "${name}" in ${region}, which is not one of the 195`);
      assert(
        !index.has(country.ccn3),
        `"${name}" is in two regions (${region} and ${index.get(country.ccn3)})`
      );
      index.set(country.ccn3, region);
    }
  }
  return index;
}

/**
 * Where a pin should point. NOT the centroid of the whole country: for island nations
 * scattered across an ocean the centroid lands in open water. Kiribati is the worst case
 * -- it straddles the antimeridian, so its centroid sits ~630 units away in empty
 * Pacific, nowhere near any of its islands. Anchoring to the largest landmass instead
 * always puts the pin on actual land.
 */
function anchorOf(f) {
  const polys =
    f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  if (polys.length === 1) return path.centroid(f);

  let best = [NaN, NaN];
  let bestArea = -1;
  for (const coordinates of polys) {
    const poly = { type: 'Feature', geometry: { type: 'Polygon', coordinates } };
    const area = path.area(poly);
    if (area > bestArea) {
      bestArea = area;
      best = path.centroid(poly);
    }
  }
  return best;
}

/**
 * Pushes overlapping pins apart so clustered ones stay individually readable -- without
 * this the eastern Caribbean is a single illegible clump. Iterative pairwise separation,
 * with each pin tethered to within MAX_NUDGE of the place it actually marks.
 */
function declutter(pins) {
  const bulb = (p) => [p.x, p.y - (PIN_HEIGHT - PIN_RADIUS)];

  for (let pass = 0; pass < 200; pass++) {
    let moved = false;

    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const [ax, ay] = bulb(pins[i]);
        const [bx, by] = bulb(pins[j]);
        let dx = bx - ax;
        let dy = by - ay;
        let dist = Math.hypot(dx, dy);
        if (dist >= PIN_GAP) continue;

        // Exactly coincident: nudge along a deterministic axis so the result is stable.
        if (dist < 0.001) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const push = (PIN_GAP - dist) / 2;
        const ux = (dx / dist) * push;
        const uy = (dy / dist) * push;

        pins[i].x -= ux;
        pins[i].y -= uy;
        pins[j].x += ux;
        pins[j].y += uy;
        moved = true;
      }
    }

    // Tether each pin back toward what it marks, then keep it inside the viewBox --
    // Tuvalu sits at x=1997, so its bulb would otherwise be sliced off by the edge.
    for (const p of pins) {
      const dx = p.x - p.ax;
      const dy = p.y - p.ay;
      const d = Math.hypot(dx, dy);
      if (d > MAX_NUDGE) {
        p.x = p.ax + (dx / d) * MAX_NUDGE;
        p.y = p.ay + (dy / d) * MAX_NUDGE;
      }
      p.x = clamp(p.x, PIN_RADIUS + 2, WIDTH - PIN_RADIUS - 2);
      p.y = clamp(p.y, PIN_HEIGHT + 2, HEIGHT - 2);
    }

    if (!moved) return pass;
  }
  return 200;
}

/** Combines two features sharing an M49 code into one MultiPolygon. */
function mergeFeatures(a, b) {
  const rings = (f) =>
    f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  return {
    type: 'Feature',
    id: a.id,
    properties: a.properties,
    geometry: { type: 'MultiPolygon', coordinates: [...rings(a), ...rings(b)] },
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

/** Must stay in step with the matcher in app.js. */
function normalise(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
