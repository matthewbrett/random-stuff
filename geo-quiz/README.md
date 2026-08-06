# Geo Quiz

A front-end-only web game for learning the world's countries and their capitals. Name as
many as you can from memory against a world map; correct answers turn green and a timer
measures the attempt.

**Status:** Playable end to end in both modes, with a timer and an end-of-game reveal.
Remaining work is polish and deployment — see [docs/PLAN.md](docs/PLAN.md).

## How to play

Pick **Countries** or **Capitals**, then type names and press Enter. Correct answers turn
green and join the list on the right. The timer starts on your first keystroke and stops
when you have all 195 or press **Give up**, which reveals everything you missed in red.

Matching is strict — accents, case and punctuation are ignored, and common abbreviations
like `USA`, `UK` and `UAE` are accepted, but spelling has to be right.

## Running it

The game is plain HTML/CSS/JS with no build step and no runtime dependencies. It does
fetch `data/world.svg`, so it needs to be served over HTTP rather than opened from disk:

```bash
npm run serve      # http://localhost:8080
```

## Regenerating the map and answer data

`data/world.svg` and `data/countries.js` are **generated and committed**. You only need
to rebuild them when changing the country set, the projection, or the alias tables.

```bash
npm install
npm run build-data
```

Sources are `world-atlas` (geometry, ISC/public domain) and `world-countries` (names and
capitals, ODbL), joined on the UN M49 code. The generator asserts 195/195 countries with
geometry and a capital, and fails the build if an alias table references an unknown
country or collides with a real name.

Hand-maintained answer data lives in [`tools/aliases.mjs`](tools/aliases.mjs) — country
aliases, alternate capitals, and the ambiguous/rejected input tables. Edit that, not the
generated files.

### Two quirks in the source geometry

Both are handled by the generator, but worth knowing if you touch it:

- **M49 codes are not unique.** Australia shares `036` with Ashmore and Cartier Islands.
  Features sharing a code are merged into one MultiPolygon.
- **Some features have no code at all** (Kosovo, Somaliland, Northern Cyprus, Siachen
  Glacier, Indian Ocean Territories). They get synthetic keys and are drawn as inert
  background so the map has no holes.
- **A country's centroid is not always on the country.** Island nations scattered across
  an ocean can have a centroid in open water — Kiribati straddles the antimeridian, so
  its centroid is ~630 units out in the empty Pacific. Pins anchor to the largest
  landmass instead.
