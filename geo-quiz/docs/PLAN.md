# Geo Quiz — Development Plan

A front-end-only web game for learning the world's countries and their capitals.
You type names from memory against a world map; correct answers turn green and
join a running list. A timer measures the whole attempt.

**Status:** Phases 0–7 complete and wired into the deploy pipeline; publishes to
`/random-stuff/geo-quiz/` on merge to `main`. Phase 8 (identify mode, §10) is designed;
8a is built — the data the engine needs is generated and asserted — and 8b–8d are not
started, so the mode is not yet playable.
**Last Updated:** 2026-09-04

---

## 1. The game

Two modes, same core loop:

| Mode | You type | Effect on a correct answer |
|---|---|---|
| **Countries** | A country name | That country turns green |
| **Capitals** | A capital city name | Its country turns green, list shows `Paris — France` |

The loop:

1. Map loads with all 195 countries in a neutral grey.
2. You type a name and press Enter.
3. Correct → country fills green, name is added to the list on the right, input clears.
4. Incorrect → brief shake / "not recognised" hint, input **keeps** the text so you can fix a typo.
5. Already found → the existing list entry flashes, input clears.
6. Game ends when you get all 195, or press **Give up**.
7. On end, the timer stops and every missing country is added to the list in red and
   filled red on the map.

The timer starts on your **first keystroke**, not on page load, so you can look at the
map and get your bearings first. It reads `mm:ss`.

Wrong answers carry no penalty — guess as often as you like. The only cost is the
seconds spent typing, which is enough to discourage spraying guesses without punishing
someone who simply can't spell Kyrgyzstan.

---

## 2. Decisions locked in

| Decision | Choice |
|---|---|
| Country set | **195** — 193 UN members + Vatican City + Palestine |
| Map | **Inline SVG, no runtime build.** Pre-generated paths, plain static files |
| Answer matching | **Strict.** Exact match after normalisation, plus a small curated alias list (see §5) |
| Zoom / pan | **Not in v1.** Static full-world view |
| Persistence | **None.** Refresh = new game. Revisit later |

---

## 3. Data pipeline (verified)

This was the main technical risk, so it was tested up front. All figures below are
measured, not estimated.

### Sources

| Source | Provides | Licence |
|---|---|---|
| `world-atlas@2` (`countries-50m.json`) | Country geometry, TopoJSON, keyed by UN M49 code | ISC (Natural Earth, public domain) |
| `world-countries@5` (`countries.json`) | Names, official names, capitals, alt spellings, `ccn3` = M49 | ODbL |

`ccn3` and the world-atlas geometry `id` are the same M49 numeric code, which gives a
clean join key between the two datasets.

### Verified coverage

Joining the 195-country target list against the 50m geometry:

- **195/195** countries resolved from the country dataset
- **194/195** have geometry at 50m — **Tuvalu is the only gap** (it exists in
  `countries-10m.json`, so its geometry gets grafted in during generation)
- **195/195** have at least one capital
- **South Africa** is the only country with multiple capitals (Pretoria / Bloemfontein /
  Cape Town) — any one will be accepted

One caveat found in the data: `world-countries` flags Vatican City as `unMember: true`,
which is wrong (it's an observer state). The generator therefore builds the 195 list
explicitly and asserts the count, rather than trusting that flag.

### Output size

Rendered with `geoNaturalEarth1` fitted to a 1000×500 viewBox:

| Variant | Paths | Raw | Gzipped |
|---|---|---|---|
| 110m @ 1dp | 177 | 123 KB | 43 KB |
| **50m @ 0dp (chosen)** | **241** | **737 KB** | **82 KB** |
| 50m @ 1dp | 241 | 1118 KB | 311 KB |

110m is ruled out — only 177 shapes, so ~18 of our 195 countries have no geometry at
all. 50m rounded to integer coordinates is the sweet spot: full coverage, and 82 KB over
the wire once GitHub Pages gzips it.

Those figures are from the 1000×500 exploration. The map actually shipped is fitted to
**2000×1000**, which measures **789 KB raw, 138 KB gzipped**. Quote that number, not the
82 KB above, when weighing anything against the size budget — see §11 for what higher
precision would cost on top of it.

### The micro-state problem

At this projection **68 of the 241 shapes render smaller than 4px²** — Vatican, Monaco,
Singapore, Malta, Bahrain, and most island states are effectively invisible. Turning
them green would produce no visible feedback at all.

**Mitigation:** countries below the area threshold get a **map pin** in an overlay layer —
a teardrop whose tip sits on the country and whose bulb floats above it, styled with the
same neutral/green/red states as the filled shapes. This is a v1 requirement, not polish:
without it a sixth of the game has no visual response.

A pin rather than a plain dot because a dot on a 2px island tells you *something is here*
without telling you where — the pin's tip marks the exact spot while the bulb is big
enough to see and to colour.

Three things make the pins actually work:

- **Anchor on the largest landmass, not the centroid.** For island nations scattered
  across an ocean the centroid falls in open water. Kiribati is the worst case: it
  straddles the antimeridian, so its centroid lands ~630 units away in empty Pacific,
  nowhere near any of its islands. Anchoring to the biggest island always lands on
  actual land.
- **Declutter.** The eastern Caribbean has eight micro-states within a few pixels and is
  an illegible clump if pins are drawn where they fall. Overlapping pins are pushed apart
  by iterative pairwise separation, each tethered to within 70 units of what it marks.
  Positions are static, so this is solved once at build time and costs nothing at runtime.
- **Leader lines.** Any pin nudged off its anchor gets a line back to the true spot, so a
  displaced pin still reads as pointing somewhere specific. 11 of 34 currently need one.

Pins are also clamped inside the viewBox — Tuvalu sits at x=1997 of 2000 and would
otherwise have its bulb sliced off by the edge. Assertions cover all of it: every
micro-state has a pin, and no pin is clipped.

### Generator — built ✓

`tools/build-data.mjs`, run manually with `node`. Output is committed, so the app has
**no build step and no runtime dependencies**. Actual output:

```
· drew 5 unidentified areas as inert
· grafted Tuvalu geometry from the 10m dataset
✓ 195/195 countries, all with geometry and a capital
  data/world.svg     195 playable + 45 inert paths, 34 pins (11 nudged), 790 KB
  data/countries.js  217 accepted country spellings, 47 KB (8 KB gzipped)
  18 sub-regions, all inside one continent; 195 anchors and shape descriptors
```

`countries.js` grew from 27 KB to 47 KB raw (5 KB to 8 KB gzipped) when Phase 8a added
the regions, anchors and shape descriptors. `world.svg` is byte-identical across that
change — no geometry was touched.

- `data/world.svg` — `<path id="c250">` per country, in four groups: `#countries`
  (playable), `#other` (territories and disputed areas, drawn but inert), `#markers`
  (micro-state pins, `<g id="m336">`), `#leaders` (leader lines, `<line id="l336">`)
- `data/countries.js` — 195 entries `{ m49, name, official, capitals[], aliases[],
  continent, region, micro, anchor, area, aspect, compact, pieces }`. The last six landed
  with Phase 8a; everything from `region` on exists for the identify-mode engine (§10)

Hand-maintained data is kept separately so regenerating never clobbers it:
`tools/aliases.mjs` for answer spellings, `tools/regions.mjs` for the sub-region table.

Note: the npm registry is reachable from this environment but `unpkg.com` is blocked by
the network policy, so fetch source data via `npm pack`, not a CDN URL.

### Two traps in the source geometry

Both were found by rendering the map and looking at it, not from the numbers — the
country count was a clean 195/195 while both bugs were live.

1. **M49 codes are not unique.** Australia shares `036` with Ashmore and Cartier Islands.
   Keying a map by id last-wins silently replaced Australia with a speck, which then got
   classified as a micro-state. Features sharing a code are now merged into one
   MultiPolygon — geographically correct, since the territory really does belong to that
   country's code.
2. **Some features have no id at all** — Kosovo, Somaliland, Northern Cyprus, Siachen
   Glacier, Indian Ocean Territories. `String(undefined)` collapsed all five onto one key
   and dropped four of them, leaving a hole in the Balkans. They now get synthetic keys
   and render as inert background.

The generator asserts against both: a fixed list of large countries must never be
classified as micro, alias keys must reference a real country, and no alias may collide
with another answer.

### Verification

The generated map was rendered headless with fake found/missed states applied. Confirmed:
Australia whole, no holes in Europe, Greenland correctly inert, and the micro-state pins
for Vatican City, Malta, Singapore, Monaco and Bahrain all sitting in the right place and
taking the state colour. The Caribbean and Mediterranean clusters were checked at detail
crop level — eight overlapping pins in the eastern Caribbean separate cleanly, each with a
leader line back to its island.

One CSS gotcha surfaced there, worth carrying into Phase 1: `#countries path` outranks
`#c250` on specificity, so **state must be applied as a class**
(`#countries path.found`), never by styling the id directly.

---

## 4. Architecture

```
geo-quiz/
├── index.html          # shell + nav + map container + list panel
├── styles.css
├── app.js              # game state machine, matching, timer, rendering
├── data/
│   ├── world.svg       # generated — do not hand-edit
│   └── countries.js    # generated — do not hand-edit
├── tools/
│   └── build-data.mjs  # dev-only generator
├── docs/
│   └── PLAN.md         # this file
└── README.md
```

Vanilla HTML/CSS/JS, matching `time-marker/`. No framework, no bundler. The SVG is
fetched once and injected inline so its paths are styleable and addressable.

Deployment is a file copy — add one line to `.github/workflows/deploy.yml`:

```yaml
cp -r geo-quiz deploy/geo-quiz
```

### State

```js
{
  mode: 'countries' | 'capitals',
  status: 'idle' | 'running' | 'finished',
  found: Set<m49>,
  startedAt: number | null,
  elapsedMs: number
}
```

Single `render()` driven by state changes. Map fill is done with CSS classes on the
paths (`.found`, `.missed`), never inline styles, so theming stays in one place.

---

## 5. Answer matching

### Normalisation

Applied to both input and every candidate before comparison:

1. Lowercase
2. Unicode NFD, strip combining marks (`Côte` → `cote`)
3. Strip punctuation, hyphens, apostrophes, periods
4. Collapse whitespace
5. Drop a leading `the`

### Aliases

Small and hand-maintained. The test an alias must pass: **it has to be a legitimate short
form of the country's name**, not a colloquialism that names the wrong thing.

Three categories are accepted:

**1. Abbreviations and standard short names**

`USA`, `US`, `UK`, `UAE`, `DRC`, `CAR` (Central African Republic), and the conventional
short names — `United Kingdom` for *United Kingdom of Great Britain and Northern
Ireland*, `Russia` for *Russian Federation*, `Bolivia`, `Tanzania`, `Venezuela`, `Iran`,
`Syria`, `Laos`, `Vietnam`, `Brunei`, `North Korea` / `South Korea`. These are real
abbreviations of the full name, so they're in.

**2. Established English exonyms**

Where English has its own long-standing name for the country: `Ivory Coast`
(Côte d'Ivoire), `East Timor` (Timor-Leste), `Cape Verde` (Cabo Verde), `Holy See`
(Vatican City). Both forms are current and correct.

**3. Former official names**

`Burma`, `Swaziland`, `Macedonia`, `Turkey`. Accepted, but the list always renders the
**current** canonical name — so typing `Burma` scores the point and shows you *Myanmar*,
which is the behaviour you want from a learning tool. Easy to switch off if you'd rather
they be rejected outright.

**Explicitly rejected** — these name something other than the country:

| Rejected | Why |
|---|---|
| `America` | A continent, or two. Not a country name |
| `Britain`, `Great Britain`, `England` | GB is the island, excluding Northern Ireland; England is one of four nations |
| `Holland` | Two provinces of twelve. Same error as Great Britain |

**Capitals need their own alternates table** — several countries have a genuinely
contested or dual capital, and all of these should be accepted:

- Netherlands → Amsterdam *or* The Hague
- Bolivia → Sucre *or* La Paz
- Sri Lanka → Sri Jayawardenepura Kotte *or* Colombo
- Tanzania → Dodoma *or* Dar es Salaam
- Côte d'Ivoire → Yamoussoukro *or* Abidjan
- Myanmar → Naypyidaw *or* Yangon
- South Africa → any of its three

### Strict matching — no typo tolerance

An answer must match a canonical name or an alias **exactly** once normalised. No
Levenshtein, no fuzzy fallback. `Nigera` is simply wrong.

This is a real simplification, and it removes a whole class of bug: the most confusable
country pairs are only one or two edits apart, so any fuzzy matcher risks silently
crediting the wrong country.

> Niger / Nigeria · Austria / Australia · Iran / Iraq · Zambia / Gambia ·
> Slovakia / Slovenia · Mali / Malawi · Guinea / Guyana

With strict matching these need no special handling at all — the confusable-set flag and
the uniqueness rule both disappear. Matching becomes a single hash lookup against a
prebuilt `normalised string → m49` map, built once at load.

Two consequences worth carrying into the UI:

- **Keeping the text in the box on a wrong answer becomes essential**, not a nicety. It's
  the only way to recover from a near-miss spelling without retyping the whole name.
- **Say *why* it failed.** "Not recognised" is ambiguous between *wrong spelling* and
  *not a country*. Since matching is exact, an unrecognised entry that's within one edit
  of a real name can still be detected and reported as a **spelling** hint —
  *"Close — check your spelling"* — without ever auto-accepting it. The leniency goes
  into the feedback, not the scoring.

Ambiguous-by-design inputs still get a nudge rather than a flat rejection: typing
`Congo` returns *"Which one? Try 'DR Congo' or 'Republic of the Congo'."*, and `Korea`
asks north or south.

---

## 6. Layout

```
┌────────────────────────────────────────────────────────┐
│  Geo Quiz    [ Countries | Capitals ]        02:47     │  nav
├──────────────────────────────────────┬─────────────────┤
│                                      │  Found  42/195  │
│                                      │  ─────────────  │
│          world map (SVG)             │  ✓ France       │
│                                      │  ✓ Japan        │
│                                      │  ✓ Peru         │
│                                      │  ...            │
│                                      │  ✗ Chad         │  (after end)
├──────────────────────────────────────┤  ✗ Oman         │
│  [ type a country…      ]  [Give up] │                 │
└──────────────────────────────────────┴─────────────────┘
```

- Switching mode restarts the game (with a confirm if one is in progress).
- The list is newest-first while playing, so the last answer is always visible without
  scrolling. On finish it re-sorts alphabetically, found and missing grouped.
- Mobile: map on top, list collapses to a counter that expands on tap.
- **Timer** reads `mm:ss`, rolling to `h:mm:ss` past an hour.

### Linking the map to the list

A red country tells you *where* you went wrong but not *what* it was. Rather than
permanently labelling the map — which gets unreadable fast around Europe, the Caribbean
and West Africa — the two panels cross-highlight:

- Hovering (or tapping) a country shows a tooltip with its name, and highlights the
  matching list row.
- Hovering a list row outlines that country on the map; clicking it travels there.

This works during play too: hovering a found country confirms what you named it. On
touch, tap-to-identify is the same gesture. No labels, no clutter, and it answers "which
one is that?" in both directions.

**Hovering names, clicking travels.** Splitting the two verbs is what makes the list →
map direction work on touch, which has no hover to offer: a tap is a click, so the map
can still be driven from the list. It also keeps the view from lurching about under a
pointer that was only passing over the list on its way somewhere else.

**Only countries you have found will name themselves.** Otherwise the map is an answer
sheet — sweep the pointer across Europe and read off the ones you are missing.
Out-of-scope countries are the exception: playing a single continent they are never valid
answers, so naming them costs nothing and helps you get your bearings. Once the game
ends, everything names itself, which is the point at which a red country most needs to
say what it was.

### Learning mode

A toggle in the nav, next to the clock it switches off. It is not a third tab: it is
orthogonal to countries/capitals — you can learn either — so it reads as its own switch.

- **The clock is off**, dimmed rather than removed so the layout does not jump and it is
  obvious which thing has been disabled. The run still starts on the first keystroke; it
  is only the timer that stays dark, and the end-of-game line reports no time.
- **Clicking a country names it**, whether or not you have found it. Hovering still does
  not — the split is the whole design. A pointer wandering across Europe should not
  strip-mine the answers; a click is a question you asked, and in this mode it gets
  answered.
- **A reveal is not an answer.** It does not score, does not paint the country green and
  does not join the list. Typing still does all three, so the counter keeps meaning what
  it says.

Turning it on or off starts a fresh game, like any other change to what is being asked of
you — the same confirm as switching mode or region. It is a setting rather than a game
state, so it survives *Play again*.

### Accessibility

- Never rely on colour alone — list entries carry ✓ / ✗ glyphs, and missing countries get
  a distinct hatch pattern on the map as well as red fill.
- `aria-live="polite"` region announcing each result.
- Focus stays in the input for the whole game.
- Honour `prefers-reduced-motion` for the shake and fill transitions.

---

## 7. Build phases

| Phase | Deliverable |
|---|---|
| **0** ✓ | `tools/build-data.mjs` → committed `world.svg` + `countries.js`. Asserts 195/195 |
| **1** ✓ | Shell, nav, map renders neutral, responsive layout |
| **2** ✓ | Input + matching engine + green fill + list + counter |
| **3** ✓ | Timer, win detection, Give up, red reveal of missing |
| **4** ✓ | Capitals mode + mode switch *(landed with Phase 2 — both modes share one index)* |
| **5** ✓ | Micro-state pins ✓, zoom/pan ✓, continent scoping ✓, reduced motion ✓, map↔list cross-highlight ✓ |
| **6** ✓ | `README.md`, `Overview.md` entry, `index.html` card, deploy workflow line |
| **7** ✓ | Learning mode: clock off, click-to-name (§6) |
| **8** | Identify mode: highlight a country, pick its name from buttons (§10). Depends on the map fixes in §11 |

Phase 0 is complete (§3). Phase 1 is complete: `index.html`, `styles.css` and `app.js`
render the nav, the neutral map and the (inert) entry and list panels.

### Layout notes from Phase 1

Two CSS traps worth recording, both found by measuring rather than eyeballing:

- **The app is pinned to exactly one viewport on desktop** (`height: 100dvh; overflow:
  hidden`). With `min-height` instead, a short window (1280×600) let the column grow past
  the viewport and pushed the input row and status bar below the fold rather than
  shrinking the map.
- **The mobile breakpoint needs `align-content: start`.** Grid's default is `stretch`,
  which shares body's leftover `min-height` space between the two auto rows and
  re-inflated the map to nearly double its natural height.

State colours are defined for `.found` and `.missed` already, so Phase 2 only has to add
and remove classes.

### Phase 2 notes

The matcher lives in `match.js`, separate from the UI, and is exercised by a scripted
browser pass covering casing, accents, punctuation, leading "the", every alias category,
both rejected colloquialisms and ambiguous inputs, and each confusable pair
(Niger/Nigeria, Austria/Australia, Iran/Iraq, Zambia/Gambia, Mali/Malawi) resolving to
itself.

**Near-miss hints include transpositions.** "Austrai" for "Austria" is Levenshtein
distance 2, so the original one-edit check missed one of the commonest typing slips. The
check is now Damerau — one insertion, deletion, substitution *or* adjacent transposition.
This is safe precisely because the near-miss branch is only reached after exact matching
has already failed, and it only chooses the wording of the feedback. It can never credit
an answer.

Feedback is layered rather than a single "not recognised":

| Input | Response |
|---|---|
| `Nigera` | Close — check your spelling. |
| `Paris` in countries mode | That's a capital city — name the country it belongs to. |
| `Holland` | Holland is two provinces of twelve. Try the country's name. |
| `Congo` | Which one? Try 'DR Congo' or 'Republic of the Congo'. |
| `France` when already found | Already found France. *(row flashes)* |

Only a correct answer clears the input. Everything else keeps the text so a near-miss is
cheap to fix, which matters more under strict matching.

### Phase 3 notes

The game is a three-state machine — `idle → running → finished`. The timer starts on the
first keystroke, is recomputed from its start time on every tick rather than accumulated
(so it cannot drift), and freezes on finish. Verified: it stays at `00:00` while the page
sits idle, starts on the first character, and rolls `59:59 → 1:00:00` past the hour.

Ending the game reveals everything at once: missing countries painted red on the map and
listed with a ✗, the list re-sorted alphabetically with found above missed. Group headings
appear only when there is something to separate — a clean sweep is one uniform list.

Two additions the plan did not call for but the phase needed:

- **Play again.** Winning or giving up otherwise leaves no way back to a fresh game short
  of a page reload. The Give up button becomes the restart, styled as the primary action
  since by then it is the only thing left to do.
- **Give up confirms first.** It is a one-click end to a long run, so it asks.

The panel header switches from *Found* to *Result* when the game ends, which also stops it
duplicating the "Found — n" group heading directly beneath it.

### Phase 5 notes

Three details the cross-highlight (§6) needed that the design did not anticipate:

- **Outlines are drawn into a layer of their own.** SVG has no `z-index`, so outlining a
  country in place leaves the outline overdrawn by every country painted after it —
  France's eastern border would sit underneath Germany. `#highlight` holds *copies* of
  the pointed-at shape, appended last. Copies rather than `<use>` references: CSS
  selectors that match the original also match a `<use>` instance, so `#countries path`
  would keep winning over any outline style. A copy sits outside `#countries` and takes
  the outline cleanly. A copied pin holds a snapshot of the transform that zooming
  rewrites, so `applyView()` re-syncs it.
- **A tap is resolved by point, not by `event.target`.** Pointer capture — which the pan
  needs — retargets every event of a drag to the map itself, so a tap while zoomed in
  would identify nothing. `document.elementFromPoint()` answers correctly either way. A
  tap is only a tap if the pointer moved less than 6px, or every pan would end in a name.
- **A click on a list row has to hand focus back to the input.** Clicking an `<li>`
  leaves focus on `<body>`, and the next thing typed would go nowhere — a nasty way to
  lose a run. Not on touch, where refocusing throws the keyboard back over the map.

Rows become focusable only once the game is over. During play focus belongs in the input,
and 195 tab stops would bury every other control; afterwards the input is disabled and
tabbing the list to walk the map is the natural way to study it.

---

## 8. Deliberately out of v1

Held back to keep the first version small — each is easy to add later:

- Persistence (best times, resume) — would need `localStorage`
- Zoom / pan
- **A penalty system for wrong answers.** For v1 a wrong guess costs only the seconds it
  took to type, which is penalty enough. Worth revisiting once there's a sense of how the
  game actually plays — a time penalty would need care, since it punishes typos as hard
  as genuine blanks
- Hints, per-continent games, streaks
- Flags mode
- Sharing a result card
- **Locate mode** — prompt a name, tap the country on the map. The obvious mobile mode,
  measured and deferred: at world zoom on a phone 189 of 195 countries are smaller than
  the 24px minimum touch target, and the median one needs 12× zoom to reach 44px. It is
  not unbuildable, but it needs regional framing, screen-sized pins, a tolerant hit test
  and an aim-then-confirm gesture before it is playable — where identify mode (§10)
  reaches the same goal, a phone-first mode with no typing, with none of that. Full
  measurements in §11
- **Reveals as a currency** during a *timed* game: a fixed budget of them, or one bought
  for a time penalty. Learning mode (§6) now covers wanting to read the map rather than
  be tested by it, and it sidesteps the pricing question by switching the clock off
  entirely. Charging for a reveal is the harder design: it would be the first thing in
  the game to put a number on the clock that you did not spend typing, which §9 rejected
  for wrong answers. A reveal is different in kind from a typo — you are asking for an
  answer, not fumbling one you knew — but it needs a sense of how the game actually
  plays before a price can be picked

---

## 9. Resolved decisions

All the open questions from the first draft are now settled:

| Question | Decision |
|---|---|
| Timer format | `mm:ss`, rolling to `h:mm:ss` past an hour |
| Wrong-answer penalty | None. Wasted time is the cost; penalties are a later idea |
| Labelling missed countries | No labels. Map and list cross-highlight instead — hover names, click travels (§6) |
| Naming unfound countries | Silent on hover, always. In learning mode a *click* names any country, because you asked (§6) |
| Pricing a reveal | Not priced — learning mode switches the clock off instead. Reveals as a timed currency stay a later idea (§8) |
| Matching strictness | Exact after normalisation; no fuzzy matching (§5) |
| Alias policy | Abbreviations, English exonyms, former official names. No `America`, `Britain`, `Holland` (§5) |

### Identify mode decisions (design in §10)

| Question | Decision |
|---|---|
| Tap the map, or pick a name? | Pick a name. Tapping was measured and deferred — see §8 and §11 |
| Option count | Six by default, 4 / 6 / 8 selectable. Tightness matters more than count (§10) |
| Difficulty | A picker, not adaptive. Adaptive is a later idea |
| Framing vs difficulty | Bound together — one dial, with the shape clamp overriding (§10) |
| Capitals variant | Not now. Countries only for the first cut |
| Mexico | Grouped with Canada and the US in `Northern America`. UN M49 would put it in Central America; either works for the engine |

---

## 10. Identify mode (Phase 8)

A third way to play, aimed squarely at the phone: **the map frames and highlights one
country, and you pick its name from a short list of buttons.** No typing, no precise
tapping, and — unlike everything proposed for locate mode (§8) — no fight with the size
of the target.

It is recognition rather than recall, so it complements the typing modes rather than
replacing them. It is also the only mode that is fully keyboard-operable, since the
answers are buttons: 1–8 select, and the map never needs to be pointed at.

### The loop

The active set is shuffled into a queue and each country is asked exactly once, so
`found.size / active().length` keeps precisely the meaning it has in the typing modes.
That is what lets the list panel, the continent breakdown, the timer, Give up, Play again
and the end-of-game reveal carry over untouched.

1. Frame the country, highlight it, render N option buttons.
2. Tap one. Right: the country fills green and joins the list. Wrong: the button you
   chose goes red, the correct one goes green, both are named.
3. Advance. **One shot per question** — no retries, no elimination.
4. The run ends when the queue empties or you give up, exactly as it does today.

The option grid takes the `.entry` row's slot. Measured on a 390px phone: two columns,
buttons 181 × 58px, six of them 210px tall in total — comfortably past the 44px touch
minimum, and *Saint Vincent and the Grenadines*, the longest name at 32 characters, wraps
to two lines without breaking the box. Eight fit in ~280px, twelve in ~420px, so layout is
not what caps the option count.

**Open:** how the mode is selected. It is a third *way to play* rather than a third answer
type, but unlike Learn it is not orthogonal — it replaces the input entirely, and for now
it only asks countries. A third tab beside Countries and Capitals is the obvious fit and
the least new furniture in an already-crowded nav; it does mean `MODES` stops being a
uniform map, since identify has no `placeholder` or `entry`.

### Three dials, and the one that inverts

| Dial | Easy → Hard |
|---|---|
| Distractor tightness | different continents → same continent → same sub-region → sub-region plus shape, size and name matched |
| Map framing | wide context → tight on the country |
| Option count | 4 → 6 → 8 |

Raw guess rates run 25% / 17% / 13% for four, six and eight options, but that only bites
when the distractors are plausible. Against one-per-continent distractors anyone who
roughly knows where things are scores near 100% at *any* count. **Count sets the floor;
tightness sets the difficulty.** Six is the default because it is enough to stop a coin
flip while still being read at a glance.

The framing dial is the one that surprises. Zoomed to fit, Slovakia is a crisp,
unmistakable shape — hard but entirely fair. Zoomed to fit, **Saint Lucia is a pin in
empty ocean**: not hard, unanswerable. Framed instead on the Lesser Antilles it becomes
fair again, because the answer comes from position in the island chain.

So the clamp, which matters more than the dial:

> **A country with no usable shape must never be framed tight.** If it renders below the
> pin threshold, the frame is widened until it holds at least a handful of neighbours.

Measured: **7 of the 13 Caribbean countries have under 3 square units of geometry** —
Antigua, Barbados, Dominica, Grenada, Saint Kitts, Saint Lucia and Saint Vincent are 1–2
unit blobs. Most of Oceania is the same. For those, hard mode shows *more* map, not less.
This is the single easiest thing in the mode to build backwards.

### The distractor engine

A confusability score between two countries, blended from four parts:

```
0.45 · proximity   same sub-region 1.0 / same continent 0.5 / otherwise 0
0.25 · size        1 − |log₁₀(areaA) − log₁₀(areaB)| / 2
0.20 · shape       compactness (4πA/P²), aspect ratio, landmass count
0.10 · name        Damerau distance ≤ 2, or a shared significant token
```

The name term is close to `match.js`'s `isNearMiss` but **must not reuse it as it
stands**. That function is deliberately tight — one insertion, deletion, substitution or
adjacent transposition — because §5 uses it to phrase spelling hints, where being loose
would risk crediting the wrong country. Run against the classic confusable pairs it
catches only two of eight:

```
yes  iran / iraq          NO   slovakia / slovenia     NO   mali / malawi
yes  zambia / gambia      NO   niger / nigeria         NO   guinea / guyana
                          NO   austria / australia     NO   dominica / dominican republic
```

The distractor engine needs a **distance of 2**, plus a shared-significant-token check to
catch the pairs edit distance never will — Guinea / Equatorial Guinea, Dominica /
Dominican Republic, Sudan / South Sudan. So: generalise `isNearMiss` to take a maximum
distance, export it (it is currently module-private), and add the token check alongside.
The one-edit behaviour §5 depends on stays as the default.

Two rules that pure sampling gets wrong, both found by running the prototype:

- **Force the name twin.** Slovenia sat in Slovakia's candidate band and lost the random
  draw. If a twin exists it is seated deterministically, not sampled.
- **Region first, then degrade.** Fill from the sub-region, fall through to the continent,
  then to nearest-by-anchor. Required: East Asia offers only 4 in-region distractors and
  Northern America only 2, so neither can fill a six-set alone.

Sample output with both rules applied — these double as the engine's test fixtures:

```
Slovakia    [Slovakia] · Czechia · Bosnia and Herzegovina · Hungary · Albania · Slovenia
Niger       Nigeria · Mali · Mauritania · [Niger] · Ivory Coast · Burkina Faso
Guinea      Senegal · [Guinea] · Equatorial Guinea · Burkina Faso · Ghana · Ivory Coast
Austria     Netherlands · [Austria] · Switzerland · Belgium · Germany · Australia
Dominica    Barbados · Saint Vincent and the Grenadines · [Dominica] · Saint Lucia ·
            Saint Kitts and Nevis · Antigua and Barbuda
Nauru       Tonga · Marshall Islands · Micronesia · Kiribati · [Nauru] · Palau
```

Austria pulling in Australia is the engine working as intended. Dominica's set is the
case that *must* get a context frame or it is a coin flip.

### Sub-regions

The engine needs a finer grain than the six continents. Eighteen sub-regions, each
wholly inside one continent:

| Continent | Sub-regions |
|---|---|
| Africa | Central & East Africa 18 · West Africa 16 · Southern Africa 14 · North Africa 6 |
| Asia | Middle East 15 · Southeast Asia 11 · South Asia 8 · Caucasus & Central Asia 8 · East Asia 5 |
| Europe | Eastern Europe & Russia 17 · Northern Europe 10 · Western Europe 10 · Southern Europe 8 |
| North America | Caribbean 13 · Central America 7 · Northern America 3 |
| Oceania | Oceania 14 |
| South America | South America 12 |

Two invariants the generator must assert, both of which caught a real bug in the first
draft of this table:

- **No sub-region name may collide with a continent name over a different set.** The
  first draft called Canada/US/Mexico "North America", while the `continent` field uses
  that name for all 23 — Canada, the US, Mexico, the 7 Central American countries and the
  13 Caribbean ones. Renamed to `Northern America`.
- **No sub-region may span two continents.** "Russia, Caucasus & Central Asia" did:
  Russia's continent is Europe, the other eight are Asia. That silently breaks the medium
  tier, which is defined as *same continent, different sub-region*. Split into
  `Eastern Europe & Russia` and `Caucasus & Central Asia`.

Region membership does not dictate the round's frame — frames are hand-tuned constants,
which §11 shows is forced anyway. Russia sitting in Eastern Europe therefore costs that
round's frame nothing.

### Data the mode adds

Per country in `countries.js`, roughly 40 bytes each and ~8 KB in total, all derived from
geometry `build-data.mjs` already holds. No new sources:

- `region` — the sub-continental group above
- `anchor` `[x, y]` — already computed for the 34 pins, extended to all 195
- `area`, `aspect`, `compact`, `pieces` — the shape descriptor the engine scores on

### Two rules that stop the map leaking the answer

- **Do not paint progress on the map during play.** In this mode a green neighbour is a
  hint, and a lone grey country in a green sea gives the answer away outright. Keep the
  map neutral while playing and paint the whole result at the end.
- **Pins narrow the field.** If only the 34 micro-states carry pins, a pin-highlighted
  target is instantly one of 34. The dynamic pin rule in §11 dilutes this by pinning
  whatever is too small in the *current* view rather than a fixed list.

### Worth having, nearly free

Every wrong answer records which distractor was chosen, so the end of a run can say
*"you confused Slovakia with Slovenia twice"*. That is the most useful thing a learning
tool can tell you and it costs a `Map` and a sort.

### Build order

| Step | Deliverable |
|---|---|
| **8a** ✓ | Sub-region table + shape descriptors + anchors in `build-data.mjs`, with both invariants asserted |
| 8b | `distract.js` — the scoring engine, standalone and testable with no UI. The sample sets above are the fixtures |
| 8c | Question loop, option grid, framing. Countries only |
| 8d | Difficulty picker wired to tightness, framing and count together |

8d comes last deliberately: where the line between *hard* and *unfair* actually falls is
not knowable until the thing is played.

### Phase 8a notes

The table lives in `tools/regions.mjs`, keyed by country name rather than M49 — it is a
table a human reads, and the generator asserts every name resolves, so a typo fails the
build instead of quietly dropping a country out of the engine.

Five failure modes were tested by deliberately breaking the table, and each is caught with
its own message: an unknown country name, a country in two regions, a country in none, a
region spanning two continents, and a region shadowing a continent's name. That last one
reports *"region "North America" shares a continent's name but holds 3 of its 23"*, which
is precisely the bug that prompted the invariant.

Two things worth knowing if you touch `describe()`:

- **Everything except `area` measures the largest landmass only.** That is what makes the
  descriptor antimeridian-safe without special-casing: Fiji, Kiribati and New Zealand have
  islands against both edges of the map, so any measure spanning all their pieces is
  meaningless. `focusCountry()` still has this bug (§11); the descriptor does not.
- **`aspect` needs its floor on both sides of the ratio.** With the floor on the divisor
  alone, a country narrower than half a unit reports an aspect below 1 — Vatican City came
  out at 0.11 — which a max/min ratio can never legitimately be, and the engine's
  `log(aspect)` then swings the wrong way. Floored both ways it reads 1.0: too small to
  tell, so call it square.

---

## 11. Map interaction — measured limits

Everything here was measured against the shipped map, on a 390×844 phone viewport (the
map renders 374×187 there, so **0.19 px per map unit**) and a ~1100px desktop map panel.
Recorded because it governs both Phase 8 and anything that revisits locate mode.

### Tap targets

Effective target size is the square root of the largest landmass's area.

| | median target | under 24px | under 44px |
|---|---|---|---|
| Phone, world zoom | 3.7px | 189/195 | 194/195 |
| Desktop, world zoom | 10.8px | 133/195 | 176/195 |

Belgium is 3.4 × 2.2px on a phone, Switzerland 4.1 × 2.2, Israel 1.5 × 4.7. The median
country needs **12× zoom** to reach a 44px target; the ceiling is 16×. Framing each of the
18 sub-regions of §10 is the biggest single lever — it takes the under-24px count from 189
to 112 on a phone and from 133 to 51 on desktop — but it cannot rescue the archipelagos:
framed on its own region, the Caribbean still has 12 of 13 under 24px and Oceania 13 of 14.

Those frames have to be hand-tuned constants, not computed bounding boxes. A continent's
bbox is dominated by its outliers — Europe's reaches the Urals, North America's spans
Canada to Trinidad, Oceania's crosses the antimeridian — so all three fit at barely more
than 1×, which is no better than the whole-world view.

### Pins are already screen-space, and sized for a desktop

`applyView()` counter-scales the pins so they hold a constant size on screen at every
zoom. That size is 20 map units, which was tuned against a ~1100px map: **11px on
desktop, but 3.7 × 5.6px on a phone** (measured, not derived). Making the pin a constant
CSS size rather than a constant map size is a small change to `applyView()` and roughly
triples it on a phone. It improves the existing modes too — a 3.7px green dot is thin
feedback for finding Malta.

The natural follow-on is to make the *rule* dynamic as well: pin whatever renders below
about 24px in the current view, rather than the fixed `micro` flag. Simulated across the
18 regional frames that is 112 pins in total, at most 13 in any one region, and at worst
28% of the screen covered — it fits, and the dense regions need the leader lines the
generator already emits.

One thing checked because it would have been a silent killer: the pin path carries an
`evenodd` hole in the bulb, but hit-testing the bulb centre at high zoom does resolve to
the pin. The hole is not a dead zone.

### Three defects this surfaced

- **Pinch-to-zoom does not exist.** `enablePanZoom()` tracks a single pointer, and
  `touch-action: none` stops the browser doing it instead. Verified by dispatching two
  touch pointers: the viewBox does not move. On a phone the only zoom is the +/− buttons,
  which zoom about the centre.
- **Double-tap zooms all the way out.** `dblclick` is bound to `resetView()`, and a
  double-tap fires `dblclick`. The instinctive gesture does the opposite of what is
  wanted. Reset belongs on the button alone.
- **`focusCountry()` breaks across the antimeridian.** It frames non-pinned countries by
  bounding box, and Fiji spans x 0→1992, Kiribati 19→1975 and New Zealand 33→1928 (the
  Chatham Islands wrap). Clicking any of the three in the answer list travels to the whole
  world instead of to the country. Any framing code added for Phase 8 inherits this unless
  it is fixed.

### Higher resolution does not help, and costs

Rebuilt four ways and measured, counting countries whose geometry is negligible *relative
to a fixed 2000-wide reference*, so the variants are comparable:

| Variant | Raw | Gzipped | Countries with negligible geometry |
|---|---|---|---|
| **shipped — 2000 wide, 0dp** | 789 KB | 138 KB | 13 |
| 2000 wide, 1dp | 1146 KB | 356 KB | 13 |
| 8000 wide, 0dp | 884 KB | 275 KB | 13 |
| 8000 wide, 0dp + 10m source for the 35 smallest | 931 KB | 281 KB | 13 |

**The count never moves.** Integer rounding at 2000 wide does collapse ten countries to
degenerate paths, but restoring them changes nothing, because the constraint is real area
rather than encoding: Vatican City is 0.44 km², which is 0.002 units across on a
2000-unit world. No precision makes that tappable, and 1dp costs 2.6× the wire size.

What precision does buy is shape fidelity when zoomed in — at 16× on a phone one map unit
is about 3px, so coastlines visibly stair-step, and Phase 8 zooms in far more than the
typing modes ever do. The targeted variant, 10m geometry for the small countries only, is
the good-value one. Cosmetic, and last in the queue.
