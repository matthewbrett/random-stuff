# Geo Quiz — Development Plan

A front-end-only web game for learning the world's countries and their capitals.
You type names from memory against a world map; correct answers turn green and
join a running list. A timer measures the whole attempt.

**Status:** Planned, not yet built
**Last Updated:** 2026-08-06

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
map and get your bearings first.

---

## 2. Decisions locked in

| Decision | Choice |
|---|---|
| Country set | **195** — 193 UN members + Vatican City + Palestine |
| Map | **Inline SVG, no runtime build.** Pre-generated paths, plain static files |
| Answer matching | **Aliases + light typo tolerance**, with hard guards (see §5) |
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

**Mitigation:** the generator also emits a projected centroid for every country. Any
country below the area threshold gets a small circle marker in an overlay layer, styled
with the same neutral/green/red states as the filled shapes. This is a v1 requirement,
not polish — without it a sixth of the game has no visual response.

### Generator

A one-off dev script, `tools/build-data.mjs`, run manually with `node`. Its output is
committed, so the app itself has **no build step and no runtime dependencies**.

It emits:
- `data/world.svg` — one `<path id="m49-250">` per country, plus the marker layer
- `data/countries.js` — 195 entries: `{ m49, name, official, capitals[], aliases[] }`

Note: the npm registry is reachable from this environment but `unpkg.com` is blocked by
the network policy, so fetch source data via `npm pack`, not a CDN URL.

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

A hand-maintained table on top of `altSpellings`, covering what people actually type:
`USA` / `US` / `America`, `UK` / `Britain` / `Great Britain`, `UAE`, `Holland`,
`Ivory Coast`, `Burma`, `Czechia`, `Swaziland`, `Cape Verde`, `East Timor`, `Macedonia`,
`South Korea` / `North Korea`, `Holy See`, `DRC` / `Congo-Kinshasa`.

**Capitals need their own alternates table** — several countries have a genuinely
contested or dual capital, and all of these should be accepted:

- Netherlands → Amsterdam *or* The Hague
- Bolivia → Sucre *or* La Paz
- Sri Lanka → Sri Jayawardenepura Kotte *or* Colombo
- Tanzania → Dodoma *or* Dar es Salaam
- Côte d'Ivoire → Yamoussoukro *or* Abidjan
- Myanmar → Naypyidaw *or* Yangon
- South Africa → any of its three

### Typo tolerance, and its guard rails

Levenshtein distance ≤ 1, and **only** for candidates ≥ 6 characters.

This needs a hard guard, because some of the most confusable country pairs are exactly
one or two edits apart:

> Niger / Nigeria · Austria / Australia · Iran / Iraq · Zambia / Gambia ·
> Slovakia / Slovenia · Mali / Malawi · Guinea / Guyana

Two rules prevent the game from silently accepting the wrong country:

1. **Uniqueness.** If a fuzzy input is within threshold of more than one country, reject
   it — no guessing which was meant.
2. **Confusable set.** Countries on the list above are flagged in the data and require an
   **exact** normalised match. No fuzzy path at all.

Ambiguous-by-design inputs are rejected with a nudge rather than a plain "wrong":
typing `Congo` alone returns *"Which one? Try 'DR Congo' or 'Republic of the Congo'."*

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
| **0** | `tools/build-data.mjs` → committed `world.svg` + `countries.js`. Assert 195/195 |
| **1** | Shell, nav, map renders neutral, responsive layout |
| **2** | Input + matching engine + green fill + list + counter |
| **3** | Timer, win detection, Give up, red reveal of missing |
| **4** | Capitals mode + mode switch |
| **5** | Micro-state markers, a11y pass, mobile, reduced motion |
| **6** | `README.md`, `Overview.md` entry, `index.html` card, deploy workflow line |

Phase 0 is largely proven already by the spike in §3.

---

## 8. Deliberately out of v1

Held back to keep the first version small — each is easy to add later:

- Persistence (best times, resume) — would need `localStorage`
- Zoom / pan
- Hints, per-continent games, streaks
- Flags mode
- "Reveal one" button
- Sharing a result card

---

## 9. Open questions

1. **Timer format** — plain `mm:ss`, or centiseconds for time-attack feel?
2. **On finish, should the map label the countries you missed?** Red fill tells you
   *where* but not *what*; labels would help learning but clutter the map.
3. **Should a wrong answer cost anything?** Currently it's free — unlimited guessing.
