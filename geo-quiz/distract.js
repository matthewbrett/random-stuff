/**
 * Distractor selection for identify mode.
 *
 * The map highlights a country and you pick its name from a handful of buttons. The
 * whole difficulty of that lives here: against one-per-continent wrong answers anyone who
 * roughly knows where things are scores near 100% whatever the option count, so it is how
 * *plausible* the wrong answers are that makes the question, not how many there are.
 * See docs/PLAN.md §10.
 *
 * No DOM, no game state -- given a country and a tier it returns countries. That is what
 * makes it testable on its own, which matters because the weights below are tuning
 * numbers and will be revisited once the mode has actually been played.
 */

import { COUNTRIES } from './data/countries.js';
import { isNearMiss, normalise } from './match.js';

export const TIERS = ['easy', 'medium', 'hard'];

/**
 * How much each dimension contributes to "these two are easy to mix up". They sum to 1,
 * so a score is always 0..1 and the bands below are readable as percentages.
 *
 * Proximity dominates deliberately: geography is what the player is being tested on, and
 * four countries from one corner of one continent is the hard question. Shape and size
 * are what makes a set feel deliberate rather than merely local -- a Sahel set of
 * similarly sized landlocked blocks beats one that happens to include a tiny island.
 */
const WEIGHT = { proximity: 0.45, size: 0.25, shape: 0.2, name: 0.1 };

/** Within these bounds two values count as different; beyond them, equally different. */
const SPAN = {
  /** Orders of magnitude of area. Vatican to Russia is about 7, so 2 is "a lot bigger". */
  area: 2,
  /** Compactness runs 0.04 (Chile) to 0.88, so 0.6 covers nearly the whole range. */
  compact: 0.6,
  /** Natural-log aspect ratio. 1.2 is roughly square vs. three times as long. */
  aspect: 1.2,
  /** Separate landmasses. Beyond six the difference stops registering. */
  pieces: 6,
};

/** How many typos apart two names can be and still read as the same name. */
const TWIN_EDITS = 2;
/** Shortest prefix that means anything: "Dominica" inside "Dominican Republic". */
const TWIN_PREFIX = 5;

/**
 * Words too common to make two names look alike. Without these, every "Republic of ..."
 * would twin with every other, and the direction words would tie North Korea to North
 * Macedonia -- names that share a word but nothing a player would confuse.
 */
const STOPWORDS = new Set([
  'republic', 'democratic', 'saint', 'the', 'and', 'of',
  'north', 'south', 'east', 'west', 'central', 'new',
]);

/** Precomputed once: normalising 195 names on every pairwise score would be 38k of it. */
const NAMES = new Map(
  COUNTRIES.map((c) => {
    const key = normalise(c.name);
    return [c.m49, { key, tokens: new Set(key.split(' ').filter(isSignificant)) }];
  })
);

function isSignificant(word) {
  return word.length > 3 && !STOPWORDS.has(word);
}

/** Distance from 0 (identical) to 1 (as different as this dimension gets). */
function apart(a, b, span) {
  return Math.min(1, Math.abs(a - b) / span);
}

/**
 * Whether two names are the kind of pair that catches people out: Slovakia/Slovenia,
 * Niger/Nigeria, Austria/Australia, Guinea/Equatorial Guinea, Dominica/Dominican Republic.
 *
 * Three ways to qualify, because no one of them catches all of those. Edit distance finds
 * the near-anagrams but not the ones differing by a whole word; a shared significant word
 * finds those but not "Dominica" against "Dominican", which is neither a shared token nor
 * within two edits -- so a prefix counts too.
 */
export function isTwin(a, b) {
  if (a.m49 === b.m49) return false;
  const x = NAMES.get(a.m49);
  const y = NAMES.get(b.m49);
  if (!x || !y) return false;

  if (isNearMiss(x.key, y.key, TWIN_EDITS)) return true;
  for (const token of x.tokens) if (y.tokens.has(token)) return true;

  const [short, long] = x.key.length <= y.key.length ? [x.key, y.key] : [y.key, x.key];
  return short.length >= TWIN_PREFIX && long.startsWith(short);
}

/**
 * How easily `b` could be mistaken for `a`, from 0 to 1. Symmetric.
 *
 * Exported because it is the knob: 8d tunes difficulty by moving the weights above, and
 * being able to score a pair without building a whole question is how that gets checked.
 */
export function confusability(a, b) {
  if (a.m49 === b.m49) return 1;

  const proximity = a.region === b.region ? 1 : a.continent === b.continent ? 0.5 : 0;

  // Log area, offset so the sub-unit countries -- Vatican at 0.003 -- do not spread
  // themselves across orders of magnitude that mean nothing at map scale.
  const size = 1 - apart(Math.log10(a.area + 0.5), Math.log10(b.area + 0.5), SPAN.area);

  const shape =
    0.5 * (1 - apart(a.compact, b.compact, SPAN.compact)) +
    0.3 * (1 - apart(Math.log(a.aspect), Math.log(b.aspect), SPAN.aspect)) +
    0.2 * (1 - apart(a.pieces, b.pieces, SPAN.pieces));

  return (
    WEIGHT.proximity * proximity +
    WEIGHT.size * size +
    WEIGHT.shape * shape +
    WEIGHT.name * (isTwin(a, b) ? 1 : 0)
  );
}

function shuffle(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draws `n` from a list already ordered best-first, sampling from a band twice that wide
 * rather than taking the top n outright.
 *
 * Straight top-n would make every asking of a country produce the same six buttons, which
 * a quiz you replay would wear out fast. The band keeps every pick a plausible one while
 * leaving the set different each time.
 */
function sample(ordered, n, random) {
  if (n <= 0) return [];
  const band = ordered.slice(0, Math.max(n * 2, n));
  return shuffle(band, random).slice(0, n);
}

/**
 * Fills `n` places from a list of preference stages, exhausting each before moving on.
 *
 * The stages are what makes degradation graceful. A hard set wants its wrong answers from
 * the same sub-region, but Northern America has two others in it and East Asia four, so
 * neither can fill six places alone -- they fall through to the continent and then to
 * whatever is nearest. Without stages those regions would simply have no hard mode.
 */
function fill(stages, n, random) {
  const picked = [];
  const taken = new Set();

  for (const stage of stages) {
    if (picked.length >= n) break;
    const fresh = stage.filter((c) => !taken.has(c.m49));
    for (const c of sample(fresh, n - picked.length, random)) {
      picked.push(c);
      taken.add(c.m49);
    }
  }
  return picked;
}

const byScore = (answer) => (a, b) => confusability(answer, b) - confusability(answer, a);

function distance(a, b) {
  return Math.hypot(a.anchor[0] - b.anchor[0], a.anchor[1] - b.anchor[1]);
}

/**
 * The hardest wrong answers available: same sub-region first, and a name twin seated
 * deterministically rather than left to the draw.
 *
 * Forcing the twin is the difference between a hard set and a merely local one. Slovenia
 * sat in Slovakia's candidate band and lost the sampling more often than not, which threw
 * away the single best wrong answer in the set.
 */
function hardStages(answer, others) {
  const region = others.filter((c) => c.region === answer.region).sort(byScore(answer));
  const continent = others.filter((c) => c.continent === answer.continent).sort(byScore(answer));
  const rest = [...others].sort(
    (a, b) => byScore(answer)(a, b) || distance(answer, a) - distance(answer, b)
  );
  return [region, continent, rest];
}

/**
 * Same continent but a different corner of it -- plausible without being next door.
 *
 * Two continents have no other corner: South America and Oceania are each a single
 * sub-region, so "same continent, different sub-region" is empty for every country in
 * them. Falling straight through to another continent would make medium *easier* than
 * easy there. Instead they take the far end of their own region -- still South American,
 * just not Peru's neighbours -- which is what medium is supposed to feel like.
 */
function mediumStages(answer, others) {
  const sameContinent = others.filter((c) => c.continent === answer.continent);
  const elsewhere = sameContinent
    .filter((c) => c.region !== answer.region)
    .sort(byScore(answer));
  const farInRegion = sameContinent
    .filter((c) => c.region === answer.region)
    .sort((a, b) => confusability(answer, a) - confusability(answer, b));
  const offContinent = others.filter((c) => c.continent !== answer.continent).sort(byScore(answer));
  return [elsewhere, farInRegion, offContinent];
}

/**
 * One from each corner of the world: the least confusable answers available, spread so no
 * two share a continent. Scoped play collapses that -- a Europe-only game has one
 * continent to choose from -- so it falls back to spreading across sub-regions instead.
 */
function easyPicks(answer, others, n, random) {
  const ordered = [...others].sort((a, b) => confusability(answer, a) - confusability(answer, b));
  const picked = [];

  for (const key of ['continent', 'region']) {
    const used = new Set([answer[key]]);
    for (const c of ordered) {
      if (picked.length >= n) break;
      if (used.has(c[key]) || picked.includes(c)) continue;
      used.add(c[key]);
      picked.push(c);
    }
  }

  // Still short only when the pool is smaller than the option count.
  for (const c of ordered) {
    if (picked.length >= n) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return shuffle(picked, random).slice(0, n);
}

/**
 * The options for one question, shuffled, always including the answer.
 *
 * @param {object} answer            the country being asked
 * @param {object} [options]
 * @param {string} [options.tier]    'easy' | 'medium' | 'hard'
 * @param {number} [options.count]   how many buttons, answer included
 * @param {object[]} [options.pool]  countries in play -- the active scope, so a
 *                                   Europe-only game never offers a Peruvian distractor
 * @param {function} [options.random] injectable for tests; defaults to Math.random
 * @returns {object[]} `count` countries, or fewer if the pool cannot supply that many
 */
export function optionsFor(answer, { tier = 'hard', count = 6, pool = COUNTRIES, random = Math.random } = {}) {
  const others = pool.filter((c) => c.m49 !== answer.m49);
  const wanted = Math.min(count - 1, others.length);
  if (wanted <= 0) return [answer];

  if (tier === 'easy') {
    return shuffle([answer, ...easyPicks(answer, others, wanted, random)], random);
  }

  const forced = [];
  let candidates = others;

  if (tier === 'hard') {
    const twin = others.filter((c) => isTwin(answer, c)).sort(byScore(answer))[0];
    if (twin) {
      forced.push(twin);
      candidates = others.filter((c) => c.m49 !== twin.m49);
    }
  }

  const stages = tier === 'hard'
    ? hardStages(answer, candidates)
    : mediumStages(answer, candidates);

  const picks = fill(stages, wanted - forced.length, random);
  return shuffle([answer, ...forced, ...picks], random);
}
