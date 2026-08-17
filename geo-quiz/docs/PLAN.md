# Geo Quiz — Development Plan

A front-end-only web game for learning the world's countries and their capitals.
You type names from memory against a world map; correct answers turn green and
join a running list. A timer measures the whole attempt.

**Status:** Complete and wired into the deploy pipeline. Publishes to
`/random-stuff/geo-quiz/` on merge to `main`.
**Last Updated:** 2026-08-07

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
  data/countries.js  217 accepted country spellings, 24 KB (5 KB gzipped)
```

- `data/world.svg` — `<path id="c250">` per country, in four groups: `#countries`
  (playable), `#other` (territories and disputed areas, drawn but inert), `#markers`
  (micro-state pins, `<g id="m336">`), `#leaders` (leader lines, `<line id="l336">`)
- `data/countries.js` — 195 entries `{ m49, name, official, capitals[], aliases[], micro }`

Hand-maintained answer data is kept separately in `tools/aliases.mjs` so regenerating
never clobbers it.

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
- **Naming countries you have not found.** The map↔list link (§6) deliberately stays
  silent on unfound countries, because free identification is free answers. But pure
  learning — browsing the map to *read* it rather than being tested on it — is a real
  thing to want, and the machinery is now all there. Two ways in, either of which could
  come later:
  - a **study mode** with no timer and no score, where every country names itself; the
    honest framing is that it is not the same activity as the quiz, so it should not
    share the quiz's scoreboard
  - **reveals as a currency** during a normal game: a fixed budget of them, or one bought
    for a time penalty. This is the more interesting design and the more delicate one —
    it is the first thing in the game that would put a number on the clock that you did
    not spend typing, which §9 rejected for wrong answers. A reveal is different in kind
    from a typo, though: you are asking for an answer, not fumbling one you knew

---

## 9. Resolved decisions

All the open questions from the first draft are now settled:

| Question | Decision |
|---|---|
| Timer format | `mm:ss`, rolling to `h:mm:ss` past an hour |
| Wrong-answer penalty | None. Wasted time is the cost; penalties are a later idea |
| Labelling missed countries | No labels. Map and list cross-highlight instead — hover names, click travels (§6) |
| Naming unfound countries | Silent while playing, or the map is an answer sheet. Study/reveal modes are a later idea (§8) |
| Matching strictness | Exact after normalisation; no fuzzy matching (§5) |
| Alias policy | Abbreviations, English exonyms, former official names. No `America`, `Britain`, `Holland` (§5) |
