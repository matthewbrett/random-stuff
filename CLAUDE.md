# CLAUDE.md - Project Context for AI Assistant

## Project Overview

**BRICKWAVE** is a browser-based pixel platformer game inspired by 80s underground runners, featuring a unique "phase brick" mechanic where blocks toggle between solid and ghost states on a rhythmic cycle.

**Current Status**: Phase 5 Complete - Collectibles & Scoring system fully implemented with coins, HUD, and Echo Charges, ready for Phase 6 (Enemies & Combat)

## Key Information

### Project Details
- **Name**: BRICKWAVE
- **Platform**: Web (Desktop + Mobile)
- **Framework**: Phaser 3
- **Target**: 60fps on mid-tier mobile devices
- **Resolution**: 320×180 internal (scaled with letterboxing)
- **Art Style**: Pixel art with limited palette (cool blues/purples)
- **MVP Timeline**: 2-4 weeks of evening development

### Repository Structure
```
/random-stuff/
├── Overview.md              # Brief repository description
├── Game spec.md             # Complete game specification
├── DEVELOPMENT_PLAN.md      # Phased development roadmap
├── CLAUDE.md                # This file
└── brickwave/               # Main game project directory
    ├── src/                 # Source code
    │   ├── scenes/          # Game scenes (Boot, Menu, Game, etc.)
    │   ├── entities/        # Player, enemies, collectibles
    │   ├── systems/         # Managers (Phase, Score, Audio, etc.)
    │   └── utils/           # Helper functions and constants
    ├── assets/              # Game assets
    │   ├── sprites/         # Pixel art graphics
    │   ├── audio/           # Music and SFX
    │   └── levels/          # Tiled JSON maps
    ├── package.json         # NPM dependencies
    └── vite.config.js       # Build configuration
```

## Core Game Mechanics

### 1. Phase Bricks (Signature Feature)
- Tiles that toggle between SOLID and GHOST states on a timed cycle (e.g., 2s solid / 2s ghost)
- Visual feedback via two-frame shimmer animation
- Synchronized phase groups for complex puzzles
- Creates dynamic route planning and timing challenges

### 2. Player Movement
- Feel-first controls (this is CRITICAL!)
- Horizontal movement with acceleration/deceleration
- Variable jump height (hold for higher)
- **Coyote time**: ~100ms grace period after leaving platform
- **Jump buffer**: ~100ms input memory
- **Dash mechanic**: Consumes Echo charge, short and snappy
- Crouch/drop-through for thin platforms

### 3. Echo Charge System
- Every 10 coins = +1 dash charge (max 3)
- Dash is a core movement tool, not just combat

### 4. Enemies
- **Skitter**: Ground beetle, reverses at edges
- **Blink Bat**: Only appears during ghost phase windows
- **Sentry Orb**: Patrols in arcs, bounceable
- **Brick Mimic**: Disguised as normal block (future)

### 5. Scoring & Collectibles
- Coins: +100 score, contribute to Echo charges
- Key Shards: 3 per level, unlock bonus stages
- Time bonus for fast completion
- Style bonus for continuous movement

## Development Phases

The project follows a 10-phase plan outlined in `DEVELOPMENT_PLAN.md`:

**Phase 1**: Project Setup & Core Infrastructure ✅
**Phase 2**: Core Player Movement ✅
**Phase 3**: Level System & Tiles ✅
**Phase 4**: Phase Bricks Mechanic ✅
**Phase 5**: Collectibles & Scoring ✅
**Phase 6**: Enemies & Combat ⭐ ⬜
**Phase 7**: Level Content (World 1-1 to 1-3) ⬜
**Phase 8**: UI & Menus ⬜
**Phase 9**: Persistence & Polish ⬜
**Phase 10**: Accessibility & Final MVP ⬜

See `DEVELOPMENT_PLAN.md` for detailed task lists per phase.

## Technical Stack

- **Game Engine**: Phaser 3
- **Build Tool**: Vite (hot reload for fast iteration)
- **Level Editor**: Tiled (exports to JSON)
- **Rendering**: HTML5 Canvas 2D
- **Physics**: Phaser's Arcade Physics with fixed timestep (60fps)
- **Audio**: WebAudio API
- **Persistence**: localStorage
- **Asset Format**: Pixel art (8×8 or 16×16 tiles), nearest-neighbor scaling

## Critical Success Factors

1. **Feel-first controls** - If movement doesn't feel good, nothing else matters
2. **Phase timing clarity** - Players must understand the phase cycle instantly
3. **60fps performance** - Non-negotiable for platformer precision
4. **Instant restart** - Speedrunners need quick retry loops

## Common Development Tasks

### Setting Up Dev Environment
```bash
cd brickwave
npm install
npm run dev  # Starts Vite dev server with hot reload
```

### Building for Production
```bash
npm run build  # Creates dist/ folder
npm run preview  # Preview production build
```

### Running Tests
```bash
npm test  # (TODO: Set up when test framework is added)
```

### Working with Tiled Maps
1. Create/edit maps in Tiled Map Editor
2. Export as JSON to `assets/levels/`
3. Load via `LevelLoader.js` system

## Key Files to Reference

- **Game spec.md**: Complete game design document with all mechanics
- **DEVELOPMENT_PLAN.md**: Phased roadmap with task breakdowns and time estimates
- **brickwave/PROJECT_STRUCTURE.md**: Detailed architecture and file organization
- **brickwave/src/config.js**: Game constants and Phaser configuration

## Performance Targets

- **Desktop**: Locked 60fps, < 50MB initial load
- **Mobile**: Stable 60fps on mid-tier devices (iPhone X, Galaxy S9)
- **Bundle**: < 5MB total
- **Load time**: < 3 seconds to playable on 4G

## Design Principles

### Code
- Keep it simple - avoid over-engineering
- Don't add features beyond what's requested
- Test movement feel constantly (player feedback is instant)
- Profile performance frequently on mobile

### Scope
- Stick to MVP - resist feature creep
- Three levels (1-1, 1-2, 1-3) for MVP
- Get phase mechanics right before adding complexity

### Accessibility
- Remappable controls
- Colorblind-friendly indicators (patterns, not just color)
- Optional assist modes (slower phase timing, infinite time)
- Mobile touch controls

## Git Workflow

- **Main branch**: `main` (stable)
- **Development branch**: `claude/init-claude-md-01QYYphsE29gMXboAY8ptGYv`
- Commit messages should be descriptive and focused
- Push to development branch when changes are complete

## Helpful Context

### Why "Phase Bricks"?
The core innovation is environmental timing - traditional platformers have static levels, but BRICKWAVE's world pulses with rhythm. This creates strategic depth: do you wait for safe passage or risk the shortcut?

### Retro Aesthetic, Modern Feel
Visually inspired by 80s games (think Lode Runner, Boulder Dash), but movement should feel contemporary (Celeste, Meat Boy). Tight, responsive, and fair.

### MVP Definition of Done
- ✅ 3 levels fully playable (1-1, 1-2, 1-3)
- ✅ All core mechanics work (movement, dash, phase bricks, coins, enemies)
- ✅ Full menu flow (title → play → results)
- ✅ Saves persist (best times, collectibles)
- ✅ Audio integrated (music + SFX)
- ✅ Works on desktop AND mobile
- ✅ 60fps stable
- ✅ No critical bugs

## Current State

As of 2025-12-05:
- ✅ **Phase 1 Complete**: Project structure, Phaser 3 setup, Vite dev environment
- ✅ **Phase 2 Complete**: Full player movement with all mechanics (jump, dash, coyote time, jump buffer)
- ✅ **Phase 3 Complete**: Level system with Tiled JSON loader, tile collision, one-way platforms, camera system
- ✅ **Phase 4 Complete**: Phase brick mechanic with timing system, visual feedback, HUD indicator, and phase groups
- ✅ **Phase 5 Complete**: Collectibles & Scoring system with coins, HUD, Echo Charges, and bonus tracking
- 🎯 **Next Up**: Phase 6 - Implement Enemies & Combat

**Key Files**:
- `src/entities/Player.js` - Complete player movement system (integrated with ScoreManager)
- `src/entities/PhaseBrick.js` - Phase brick with visual feedback and collision states
- `src/entities/Coin.js` - Collectible coins with pulsing/floating animation
- `src/systems/LevelLoader.js` - Tiled map loader with multi-layer support (including Phase layer)
- `src/systems/PhaseManager.js` - Phase timing and group management system
- `src/systems/PhaseIndicator.js` - HUD element showing phase progress
- `src/systems/ScoreManager.js` - Score, coins, Echo Charges, and bonus tracking
- `src/systems/GameHUD.js` - Complete HUD display with all game information
- `src/scenes/GameScene.js` - Main game scene with level loading, phase management, and coin collection
- `assets/levels/test-level-1.json` - Test level with phase mechanics and coins

## When Working on This Project

1. **Always read the relevant phase** in `DEVELOPMENT_PLAN.md` before starting work
2. **Test movement feel constantly** - this is the foundation of everything
3. **Check Game spec.md** for design intent and mechanics details
4. **Profile performance early** - 60fps is non-negotiable
5. **Keep scope tight** - MVP first, then iterate

## Questions to Ask

- Does this movement feel good?
- Is the phase timing immediately clear to a new player?
- Does this run at 60fps on mobile?
- Is this feature in the MVP scope?
- Can this be simplified?

---

**Last Updated**: 2025-12-05
**For Questions**: See `Game spec.md` and `DEVELOPMENT_PLAN.md`
