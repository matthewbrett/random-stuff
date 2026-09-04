/**
 * Tests for the identify-mode distractor engine (docs/PLAN.md §10).
 *
 *   npm test
 *
 * Dev-only, so it lives in tools/ rather than beside the module it tests -- the deploy
 * copies the app directory wholesale and there is no reason to ship tests.
 *
 * These assert the *properties* the sample sets in §10 demonstrate rather than the exact
 * strings. Six literal six-country sets would be a wall of red the first time 8d moves a
 * weight, which the plan says it will, and they would be red for a reason nobody cares
 * about: a set can be entirely correct and still not be the one that was written down.
 * What must not change is that Slovakia's hard set contains Slovenia, and that Dominica's
 * is all Caribbean. Determinism is covered separately, by seed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { COUNTRIES } from '../data/countries.js';
import { optionsFor, confusability, isTwin, TIERS } from '../distract.js';
import { isNearMiss, editDistance } from '../match.js';

const by = (name) => {
  const c = COUNTRIES.find((x) => x.name === name);
  assert.ok(c, `no such country: ${name}`);
  return c;
};
const names = (list) => list.map((c) => c.name);

/** Deterministic PRNG, so a failure is reproducible rather than a once-in-ten-runs sulk. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs a question over many seeds, since one draw proves nothing about a sampled set. */
const overSeeds = (fn, runs = 200) => {
  for (let s = 0; s < runs; s++) fn(seeded(s), s);
};

// --- Shape of the result ------------------------------------------------------------

test('always returns the answer, the right count, and no duplicates', () => {
  for (const tier of TIERS) {
    for (const count of [4, 6, 8]) {
      overSeeds((random, seed) => {
        for (const name of ['Slovakia', 'Nauru', 'Brazil', 'United States', 'Japan']) {
          const answer = by(name);
          const opts = optionsFor(answer, { tier, count, random });
          const label = `${name} ${tier} n=${count} seed=${seed}`;

          assert.equal(opts.length, count, `${label}: wrong count`);
          assert.ok(opts.includes(answer), `${label}: answer missing`);
          assert.equal(new Set(opts.map((c) => c.m49)).size, count, `${label}: duplicates`);
        }
      }, 25);
    }
  }
});

test('the answer is not always in the same position', () => {
  const answer = by('Peru');
  const positions = new Set();
  overSeeds((random) => {
    positions.add(optionsFor(answer, { random }).indexOf(answer));
  });
  assert.ok(positions.size >= 5, `answer landed in only ${positions.size} distinct slots`);
});

test('the same seed gives the same set twice', () => {
  const answer = by('Kenya');
  for (const tier of TIERS) {
    const a = names(optionsFor(answer, { tier, random: seeded(42) }));
    const b = names(optionsFor(answer, { tier, random: seeded(42) }));
    assert.deepEqual(a, b, `${tier} is not deterministic for a fixed seed`);
  }
});

test('different seeds give different sets — the band is doing its job', () => {
  const answer = by('Kenya');
  const seen = new Set();
  overSeeds((random) => seen.add(names(optionsFor(answer, { tier: 'hard', random })).sort().join('|')));
  assert.ok(seen.size > 5, `only ${seen.size} distinct hard sets across 200 seeds`);
});

// --- The §10 sample sets, as properties ---------------------------------------------

test('hard sets seat the name twin every time', () => {
  // The *strongest* twin, not just any: Guinea has three (Guinea-Bissau, Equatorial
  // Guinea, Papua New Guinea) and the set is only as hard as the closest one seated.
  const pairs = [
    ['Slovakia', 'Slovenia'],
    ['Niger', 'Nigeria'],
    ['Austria', 'Australia'],
    ['Dominica', 'Dominican Republic'],
    ['Guinea', 'Guinea-Bissau'],
  ];
  for (const [name, twin] of pairs) {
    overSeeds((random, seed) => {
      const opts = names(optionsFor(by(name), { tier: 'hard', random }));
      assert.ok(opts.includes(twin), `${name} seed=${seed}: expected ${twin}, got ${opts.join(', ')}`);
    });
  }
});

test('every country with a twin gets one in its hard set', () => {
  const withTwins = COUNTRIES.filter((a) => COUNTRIES.some((b) => isTwin(a, b)));
  assert.ok(withTwins.length > 20, `only ${withTwins.length} countries have a twin at all`);

  for (const answer of withTwins) {
    const opts = optionsFor(answer, { tier: 'hard', count: 6, random: seeded(3) });
    assert.ok(
      opts.some((c) => c !== answer && isTwin(answer, c)),
      `${answer.name}: no twin in ${names(opts).join(', ')}`
    );
  }
});

test('hard sets stay in the sub-region where one is big enough to fill them', () => {
  for (const name of ['Dominica', 'Nauru', 'Chad', 'Slovakia']) {
    const answer = by(name);
    overSeeds((random, seed) => {
      const opts = optionsFor(answer, { tier: 'hard', count: 6, random });
      // The forced twin may legitimately come from outside -- Austria's is Australia.
      const strays = opts.filter((c) => c.region !== answer.region && !isTwin(answer, c));
      assert.equal(strays.length, 0, `${name} seed=${seed}: strayed to ${names(strays).join(', ')}`);
    });
  }
});

test('easy sets spread across continents', () => {
  for (const name of ['Slovakia', 'Saint Lucia', 'Chad']) {
    overSeeds((random, seed) => {
      const opts = optionsFor(by(name), { tier: 'easy', count: 6, random });
      const continents = new Set(opts.map((c) => c.continent));
      assert.equal(continents.size, 6, `${name} seed=${seed}: ${[...continents].join(', ')}`);
    });
  }
});

test('medium sets stay on the continent', () => {
  for (const name of ['Slovakia', 'Chad', 'Peru', 'Fiji', 'Japan']) {
    const answer = by(name);
    overSeeds((random, seed) => {
      const opts = optionsFor(answer, { tier: 'medium', count: 6, random }).filter((c) => c !== answer);
      const offContinent = opts.filter((c) => c.continent !== answer.continent);
      assert.equal(offContinent.length, 0, `${name} seed=${seed}: ${names(offContinent).join(', ')}`);
    });
  }
});

test('medium leaves the sub-region wherever the continent has another one', () => {
  // South America and Oceania are each a single sub-region, so there is nowhere to go;
  // they are covered by the "stay on the continent" test above instead.
  const multiRegion = (answer) =>
    new Set(COUNTRIES.filter((c) => c.continent === answer.continent).map((c) => c.region)).size > 1;

  for (const name of ['Slovakia', 'Chad', 'Japan', 'Cuba']) {
    const answer = by(name);
    assert.ok(multiRegion(answer), `${name}'s continent has only one sub-region`);
    overSeeds((random, seed) => {
      const opts = optionsFor(answer, { tier: 'medium', count: 6, random }).filter((c) => c !== answer);
      const nextDoor = opts.filter((c) => c.region === answer.region);
      assert.equal(nextDoor.length, 0, `${name} seed=${seed}: ${names(nextDoor).join(', ')}`);
    });
  }
});

test('hard is harder than easy, measured', () => {
  for (const name of ['Slovakia', 'Chad', 'Peru', 'Nauru']) {
    const answer = by(name);
    const mean = (tier) => {
      let total = 0;
      overSeeds((random) => {
        const opts = optionsFor(answer, { tier, count: 6, random }).filter((c) => c !== answer);
        total += opts.reduce((s, c) => s + confusability(answer, c), 0) / opts.length;
      }, 50);
      return total / 50;
    };
    const [easy, medium, hard] = TIERS.map(mean);
    assert.ok(easy < medium, `${name}: easy ${easy.toFixed(3)} !< medium ${medium.toFixed(3)}`);
    assert.ok(medium < hard, `${name}: medium ${medium.toFixed(3)} !< hard ${hard.toFixed(3)}`);
  }
});

// --- Degradation --------------------------------------------------------------------

test('regions too small to fill a set fall through instead of returning short', () => {
  // Northern America has 3 members, East Asia 5 -- neither can supply 5 distractors.
  for (const name of ['United States', 'Japan']) {
    overSeeds((random, seed) => {
      const opts = optionsFor(by(name), { tier: 'hard', count: 6, random });
      assert.equal(opts.length, 6, `${name} seed=${seed}: got ${opts.length}`);
    }, 50);
  }
});

test('a scoped pool never leaks a country from outside it', () => {
  const europe = COUNTRIES.filter((c) => c.continent === 'Europe');
  for (const tier of TIERS) {
    overSeeds((random, seed) => {
      const opts = optionsFor(by('Slovakia'), { tier, count: 6, pool: europe, random });
      const outside = opts.filter((c) => c.continent !== 'Europe');
      assert.equal(outside.length, 0, `${tier} seed=${seed}: leaked ${names(outside).join(', ')}`);
    }, 50);
  }
});

test('a pool smaller than the option count returns what there is, not a crash', () => {
  const tiny = [by('Chad'), by('Peru'), by('Japan')];
  for (const tier of TIERS) {
    const opts = optionsFor(by('Chad'), { tier, count: 6, pool: tiny, random: seeded(1) });
    assert.equal(opts.length, 3, tier);
    assert.ok(opts.includes(by('Chad')), tier);
  }
  assert.deepEqual(optionsFor(by('Chad'), { pool: [by('Chad')], random: seeded(1) }), [by('Chad')]);
});

test('every country can be asked at every tier', () => {
  for (const answer of COUNTRIES) {
    for (const tier of TIERS) {
      const opts = optionsFor(answer, { tier, count: 6, random: seeded(7) });
      assert.equal(opts.length, 6, `${answer.name} ${tier}`);
      assert.ok(opts.includes(answer), `${answer.name} ${tier}: answer missing`);
    }
  }
});

// --- Scoring ------------------------------------------------------------------------

test('confusability is symmetric and bounded', () => {
  for (const a of COUNTRIES) {
    for (const b of COUNTRIES) {
      const s = confusability(a, b);
      assert.ok(s >= 0 && s <= 1, `${a.name}/${b.name} = ${s}`);
      assert.ok(Math.abs(s - confusability(b, a)) < 1e-12, `${a.name}/${b.name} asymmetric`);
    }
  }
});

test('a neighbour outscores a country on another continent', () => {
  const slovakia = by('Slovakia');
  assert.ok(
    confusability(slovakia, by('Hungary')) > confusability(slovakia, by('Ecuador')),
    'Hungary should be more confusable with Slovakia than Ecuador is'
  );
});

test('isTwin catches the classic pairs and not the merely adjacent', () => {
  const twins = [
    ['Slovakia', 'Slovenia'], ['Niger', 'Nigeria'], ['Austria', 'Australia'],
    ['Iran', 'Iraq'], ['Zambia', 'Gambia'], ['Mali', 'Malawi'],
    ['Dominica', 'Dominican Republic'], ['Guinea', 'Guinea-Bissau'],
    ['Guinea', 'Equatorial Guinea'], ['Sudan', 'South Sudan'],
    ['North Korea', 'South Korea'],
    // One edit apart, and confused constantly by actual people.
    ['Ireland', 'Iceland'],
  ];
  for (const [a, b] of twins) {
    assert.ok(isTwin(by(a), by(b)), `${a}/${b} should be twins`);
    assert.ok(isTwin(by(b), by(a)), `${b}/${a} should be twins (symmetry)`);
  }

  const not = [
    ['France', 'Germany'], ['Chad', 'Niger'], ['Peru', 'Chile'],
    // Share a direction word only -- a stopword, so not a twin.
    ['North Korea', 'North Macedonia'],
    // Both "Republic of ..." officially, but the common names share no significant word.
    ['Chad', 'Cuba'],
  ];
  for (const [a, b] of not) {
    assert.equal(isTwin(by(a), by(b)), false, `${a}/${b} should not be twins`);
  }

  assert.equal(isTwin(by('Chad'), by('Chad')), false, 'a country is not its own twin');
});

// --- match.js, which this leans on ---------------------------------------------------

test('isNearMiss still defaults to one edit, so the spelling hint is unchanged', () => {
  assert.ok(isNearMiss('austrai', 'austria'), 'transposition is one edit');
  assert.ok(isNearMiss('nigera', 'nigeria'), 'deletion is one edit');
  // The pairs the distractor engine wants are exactly the ones §5 must keep rejecting.
  assert.equal(isNearMiss('slovakia', 'slovenia'), false, 'two edits is not a typo');
  assert.equal(isNearMiss('niger', 'nigeria'), false);
  assert.ok(isNearMiss('slovakia', 'slovenia', 2), 'but is reachable at max=2');
});

test('editDistance is bounded and gives up cleanly', () => {
  assert.equal(editDistance('chad', 'chad', 2), 0);
  assert.equal(editDistance('chad', 'chat', 2), 1);
  assert.equal(editDistance('chad', 'cahd', 2), 1, 'adjacent transposition costs 1');
  assert.equal(editDistance('chad', 'peru', 2), 3, 'over budget reports max + 1');
  assert.equal(editDistance('', 'chad', 2), 3, 'length gap over budget');
  assert.equal(editDistance('', '', 1), 0);
});
