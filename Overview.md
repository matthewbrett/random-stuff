# random-stuff

Experimental repository for various projects and prototypes.

## Projects

### 🎮 BRICKWAVE
A browser-based pixel platformer with a unique "phase brick" mechanic. **[MVP COMPLETE]**

- **Location:** `/brickwave/`
- **Status:** Fully playable, deployed to GitHub Pages
- **Play:** https://matthewbrett.github.io/random-stuff/brickwave/
- **Tech:** Phaser 3, Vite, WebAudio
- **Features:** 5 levels, mobile support, accessibility features, difficulty scaling
- **Docs:** See [brickwave/docs/](brickwave/docs/) for all BRICKWAVE documentation

### ⏱️ Time Marker
A simple, elegant clock web app that displays the current time and lets you mark moments. **[COMPLETE]**

- **Location:** `/time-marker/`
- **Status:** Fully functional
- **Tech:** Vanilla HTML/CSS/JavaScript (single file)
- **Features:**
  - Live clock display (hh:mm:ss format)
  - Mark moments in time with a button
  - Track elapsed time since most recent mark
  - Add optional descriptions to each mark
  - Delete marks individually
  - Mobile responsive design

### 🌍 Geo Quiz
A geography game: name all 195 countries or their capitals from memory, against the clock. **[PLAYABLE]**

- **Location:** `/geo-quiz/`
- **Status:** Playable end to end; polish ongoing
- **Play:** https://matthewbrett.github.io/random-stuff/geo-quiz/
- **Tech:** Vanilla HTML/CSS/JS, no build step and no runtime dependencies
- **Features:**
  - Two modes — name countries, or name capitals
  - World map with per-country borders; correct answers fill green, missed ones red
  - Map pins for the 34 countries too small to see at world scale
  - Strict matching with common abbreviations (`USA`, `UK`, `UAE`) and spelling hints
  - Timer, give up and full reveal of what you missed
  - Play the whole world or scope to one of six continents
  - Pan and zoom the map without zooming the page
- **Docs:** [geo-quiz/docs/PLAN.md](geo-quiz/docs/PLAN.md)

## Repository Documentation

- **[AGENTS.md](AGENTS.md)** - Repository guidelines and coding conventions for AI agents

## BRICKWAVE Documentation

All BRICKWAVE-specific documentation is in [brickwave/docs/](brickwave/docs/):

- **[Game spec.md](brickwave/docs/Game%20spec.md)** - Complete game design specification
- **[DEVELOPMENT_PLAN.md](brickwave/docs/DEVELOPMENT_PLAN.md)** - Phased development roadmap (all 10 phases complete)
- **[CLAUDE.md](brickwave/docs/CLAUDE.md)** - AI assistant context and project guidelines
- **[BUILD_NARRATIVE.md](brickwave/docs/BUILD_NARRATIVE.md)** - Story of building BRICKWAVE in 3 days with AI
- **[DEPLOYMENT.md](brickwave/docs/DEPLOYMENT.md)** - Deployment and sharing guide
- **[DIFFICULTY_ENHANCEMENT.md](brickwave/docs/DIFFICULTY_ENHANCEMENT.md)** - Difficulty scaling system plan

## Quick Start

```bash
# BRICKWAVE development
cd brickwave
npm install
npm run dev  # Start dev server at http://localhost:3001
```

**Last Updated:** 2026-08-07
