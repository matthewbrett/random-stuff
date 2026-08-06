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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = (p) => JSON.parse(readFileSync(join(ROOT, 'node_modules', p), 'utf8'));

// --- Tunables ---------------------------------------------------------------------

const WIDTH = 2000;
const HEIGHT = 1000;
/** Coordinate decimal places. 0 keeps the file small; the viewBox is scaled up to
 *  compensate, so integer precision still gives ~0.5px accuracy on a 1000px render. */
const PRECISION = 0;
/** Countries rendering smaller than this (px² at the above size) also get a dot marker,
 *  otherwise turning them green produces no visible feedback at all. */
const MICRO_AREA = 30;
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
const micro = new Set();

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

  const area = path.area(f);
  const [cx, cy] = path.centroid(f);
  if (area < MICRO_AREA && Number.isFinite(cx)) {
    micro.add(m49);
    markers.push(`<circle id="m${m49}" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="6"/>`);
  }
}

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" id="world-map">`,
  `<g id="other">${otherPaths.join('')}</g>`,
  `<g id="countries">${playablePaths.join('')}</g>`,
  `<g id="markers">${markers.join('')}</g>`,
  `</svg>`,
].join('\n');

// --- Emit the answer set ----------------------------------------------------------

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
      micro: micro.has(m49),
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

// Regression guard. Australia once came out as a micro-state because it shares its M49
// code with Ashmore and Cartier Is. and was being overwritten by it. Any of these
// showing up as a dot means geometry is being lost somewhere upstream.
for (const name of ['Australia', 'Russia', 'Canada', 'Brazil', 'China', 'India', 'United States']) {
  const c = countries.find((x) => x.name === name);
  assert(c, `expected ${name} in the country set`);
  assert(!c.micro, `${name} was classified as a micro-state -- its geometry is wrong`);
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

const js = `// GENERATED by tools/build-data.mjs -- do not edit by hand.
// Country names, capitals and aliases for the 195-country answer set.

export const COUNTRIES = ${JSON.stringify(countries, null, 0)};

export const AMBIGUOUS = ${JSON.stringify(AMBIGUOUS, null, 0)};

export const REJECTED = ${JSON.stringify(REJECTED, null, 0)};
`;
writeFileSync(join(ROOT, 'data/countries.js'), js);

// --- Report -----------------------------------------------------------------------

const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
console.log(`✓ ${countries.length}/195 countries, all with geometry and a capital`);
console.log(`  data/world.svg     ${playablePaths.length} playable + ${otherPaths.length} inert paths, ${markers.length} markers, ${kb(svg)}`);
console.log(`  data/countries.js  ${seen.size} accepted country spellings, ${kb(js)}`);

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
