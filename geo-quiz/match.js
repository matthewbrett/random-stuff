/**
 * Answer matching.
 *
 * Strict by design: an answer must match a canonical name, an alias or a capital exactly
 * once normalised. There is no fuzzy acceptance -- see docs/PLAN.md §5. Edit distance is
 * used only to phrase better feedback, never to credit an answer.
 */

import { COUNTRIES, AMBIGUOUS, REJECTED } from './data/countries.js';

/**
 * Must stay in step with `normalise` in tools/build-data.mjs, which uses it to assert
 * that no two answers collide.
 */
export function normalise(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Damerau edit distance between `a` and `b` -- insertion, deletion, substitution, or a
 * transposition of two adjacent characters. Optimal string alignment, so a substring is
 * never edited twice; that distinction cannot arise between two country names.
 *
 * Bounded: it gives up as soon as a whole row exceeds `max` and returns `max + 1`. The
 * caller only ever asks "is this within N", so the exact distance beyond N is wasted work.
 */
export function editDistance(a, b, max = 1) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let twoBack = null;
  let oneBack = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const row = new Array(b.length + 1);
    row[0] = i;
    let best = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(oneBack[j] + 1, row[j - 1] + 1, oneBack[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, twoBack[j - 2] + 1);
      }
      row[j] = d;
      if (d < best) best = d;
    }

    if (best > max) return max + 1;
    twoBack = oneBack;
    oneBack = row;
  }

  return oneBack[b.length];
}

/**
 * True if `a` and `b` are at most `max` typos apart.
 *
 * The default of one is what the near-miss hint below needs, and it must stay one: the
 * most confusable country pairs are two edits apart, so a looser default here would start
 * calling Niger/Nigeria a spelling slip. Transpositions ("Austrai" for "Austria") are
 * distance 2 under plain Levenshtein but one of the commonest typing slips, which is why
 * this is Damerau -- and it is free, because this only ever chooses the wording of the
 * feedback and never credits an answer.
 *
 * The identify-mode distractor engine (docs/PLAN.md §10) is the caller that passes a
 * larger `max`: it wants exactly the confusable pairs this one is careful to exclude.
 */
export function isNearMiss(a, b, max = 1) {
  return editDistance(a, b, max) <= max;
}

const byM49 = new Map(COUNTRIES.map((c) => [c.m49, c]));

/** normalised answer -> m49, one index per mode. */
const INDEX = {
  countries: index((c) => [c.name, ...c.aliases]),
  capitals: index((c) => c.capitals),
};

function index(keysOf) {
  const map = new Map();
  for (const c of COUNTRIES) {
    for (const key of keysOf(c)) map.set(normalise(key), c.m49);
  }
  return map;
}

export const TOTAL = COUNTRIES.length;

/**
 * Evaluates one submitted answer.
 *
 * @param {string} raw    what was typed
 * @param {string} mode   'countries' | 'capitals'
 * @param {Set<string>} found  m49 codes already scored
 * @returns {{type: string, country?: object, message?: string}}
 */
export function evaluate(raw, mode, found) {
  const key = normalise(raw);
  if (!key) return { type: 'empty' };

  // Exact match first, so genuine country names that happen to be a prefix of others --
  // Sudan, Guinea, Samoa, Niger -- score normally and never reach the ambiguity check.
  const m49 = INDEX[mode].get(key);
  if (m49) {
    const country = byM49.get(m49);
    return found.has(m49) ? { type: 'duplicate', country } : { type: 'correct', country };
  }

  if (AMBIGUOUS[key]) return { type: 'ambiguous', message: AMBIGUOUS[key] };
  if (REJECTED[key]) return { type: 'rejected', message: REJECTED[key] };

  // Right answer, wrong mode. Cheap to detect and much more useful than "not recognised".
  const other = mode === 'countries' ? 'capitals' : 'countries';
  const otherM49 = INDEX[other].get(key);
  if (otherM49) {
    const country = byM49.get(otherM49);
    return {
      type: 'wrong-mode',
      message:
        mode === 'countries'
          ? `That's a capital city — name the country it belongs to.`
          : `${country.name} is a country — name its capital instead.`,
    };
  }

  // Near miss. Reported as a spelling hint, never accepted: the most confusable country
  // pairs (Niger/Nigeria, Austria/Australia, Iran/Iraq) are one or two edits apart, so
  // auto-accepting would silently credit the wrong country.
  for (const candidate of INDEX[mode].keys()) {
    if (isNearMiss(key, candidate)) return { type: 'near-miss' };
  }

  return { type: 'unknown' };
}
