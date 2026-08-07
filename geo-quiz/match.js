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
 * True if `a` and `b` are one typo apart: a single insertion, deletion, substitution, or
 * a transposition of two adjacent characters.
 *
 * Transpositions ("Austrai" for "Austria") are Levenshtein distance 2 but are one of the
 * commonest typing slips. Including them is free here because this only ever chooses the
 * wording of the feedback -- it never credits an answer.
 */
function isNearMiss(a, b) {
  if (withinOneEdit(a, b)) return true;
  if (a.length !== b.length) return false;

  const diff = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && diff.push(i) > 2) return false;
  }
  return (
    diff.length === 2 &&
    diff[1] === diff[0] + 1 &&
    a[diff[0]] === b[diff[1]] &&
    a[diff[1]] === b[diff[0]]
  );
}

/** True if `a` and `b` are at most one insertion, deletion or substitution apart. */
function withinOneEdit(a, b) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;

  let i = 0;
  let j = 0;
  let slack = 1;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
      continue;
    }
    if (slack-- === 0) return false;
    if (short.length === long.length) i++;
    j++;
  }
  return true;
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
