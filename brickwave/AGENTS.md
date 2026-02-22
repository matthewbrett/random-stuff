# BRICKWAVE - AI Agent Guidelines

This document provides guidelines for AI agents working on BRICKWAVE.

## Project Structure

- **Entry point:** `src/main.js`
- **Configuration:** `src/config.js` (game constants), `src/resolution.js` (display scaling)
- **Scenes:** `src/scenes/` (Boot, Title, Level Select, Settings, Game, Game Over)
- **Systems/Managers:** `src/systems/` (Phase, Score, Audio, Particle, Save, Input, Enemy, Level Loading, HUD)
- **Entities:** `src/entities/` (Player, enemies, collectibles, phase bricks)
- **Utilities:** `src/utils/` (helpers, constants, text styles)
- **Assets:** `assets/` (levels in Tiled JSON, sprites, audio placeholders)
- **Build output:** `dist/` (production build)
- **Static files:** `index.html` (HTML shell), `vite.config.js` (build config)
- **Documentation:** `docs/` (active docs), `docs/archive/` (completed/superseded plans)

## Build, Test, and Development Commands

All commands run from the `brickwave/` directory:

- **Development:** `npm run dev` - Start Vite dev server with hot reload
- **Production build:** `npm run build` - Build to `dist/` folder
- **Preview build:** `npm run preview` - Serve production bundle locally
- **Deploy:** `npm run deploy` - Publish to GitHub Pages
- **Local network testing:** `npm run dev -- --host` - Expose dev server to local network for mobile testing

**Note:** Playwright is present but no test script is wired. Add `npm test` in `package.json` if tests are introduced.

## Coding Style & Conventions

### Language & Format
- **Language:** JavaScript ES modules (Phaser 3 framework)
- **Indentation:** 2 spaces
- **Quotes:** Prefer single quotes
- **Trailing commas:** Use where natural

### Naming Conventions
- **Classes:** PascalCase (e.g., `Player`, `PhaseManager`, `GameScene`)
- **Instances/Functions:** camelCase (e.g., `scoreManager`, `handleInput`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `TILE_SIZE`, `JUMP_VELOCITY`) - especially in `config.js`

### Code Organization
- **Resolution/Scaling:** Centralize in `resolution.js`, import where needed
- **Scene-specific helpers:** Keep near their scene
- **Cross-cutting utilities:** Place in `src/utils/`
- **Game constants:** Define in `src/config.js`

## Testing Guidelines

**Current state:** No automated tests implemented.

**If adding tests:**
- Keep tests near the feature (e.g., `tests/` folder or alongside modules)
- Name tests after the feature (e.g., `game-scene.spec.js`, `player.spec.js`)
- Ensure headless/CI-friendly defaults for automation
- Document new test scripts in `package.json`
- Update this section with testing instructions

## Development Workflow

### Working with Levels
1. Create/edit maps in Tiled Map Editor (`.tmx` files)
2. Export as JSON to `assets/levels/`
3. LevelLoader system handles loading and parsing

### Adding New Features
1. Check `docs/DEVELOPMENT_PLAN.md` for planned features
2. Review `docs/Game spec.md` for design intent
3. Implement following the coding style above
4. Update relevant documentation
5. Test in browser (desktop + mobile if applicable)

### Performance Targets
- **Desktop:** Locked 60fps, < 50MB initial load
- **Mobile:** Stable 60fps on mid-tier devices (iPhone X, Galaxy S9+)
- **Bundle:** < 5MB total (code + assets)
- **Load time:** < 3 seconds to playable on 4G

## Important Context Files

Before making significant changes, review:
- **[docs/CLAUDE.md](docs/CLAUDE.md)** - Project context and critical success factors
- **[docs/Game spec.md](docs/Game%20spec.md)** - Game design specification
- **[docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)** - Development roadmap and current status

## Commit Message Guidelines

- **Format:** Concise imperative mood (e.g., `Add phase indicator tweening`, `Fix player collision edge case`)
- **Grouping:** Group related changes into single commits where logical
- **Scope:** Keep commits focused on one concern

---

**Last Updated:** 2026-02-23
