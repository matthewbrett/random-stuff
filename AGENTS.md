# Repository Guidelines for AI Agents

This document provides guidelines for AI agents working with this repository.

## Repository Structure

### Root Layout
- Root docs: `Overview.md` (repo description), `Game spec.md`, `DEVELOPMENT_PLAN.md`, `CLAUDE.md` (AI context), `BUILD_NARRATIVE.md` (development story), `AGENTS.md` (this file)
- Main project: `brickwave/` (browser platformer game)

### BRICKWAVE Project Structure
- **Entry point:** `brickwave/src/main.js`
- **Configuration:** `brickwave/src/config.js` (game constants), `brickwave/src/resolution.js` (display scaling)
- **Scenes:** `brickwave/src/scenes/` (Boot, Title, Level Select, Settings, Game, Game Over)
- **Systems/Managers:** `brickwave/src/systems/` (Phase, Score, Audio, Particle, Save, Input, Enemy, Level Loading, HUD)
- **Entities:** `brickwave/src/entities/` (Player, enemies, collectibles, phase bricks)
- **Utilities:** `brickwave/src/utils/` (helpers, constants, text styles)
- **Assets:** `brickwave/assets/` (levels in Tiled JSON, sprites, audio placeholders)
- **Build output:** `brickwave/dist/` (production build)
- **Static files:** `brickwave/index.html` (HTML shell), `brickwave/vite.config.js` (build config)
- **Documentation:** `brickwave/docs/` (active docs), `brickwave/docs/archive/` (completed/superseded plans)

## Build, Test, and Development Commands

All commands run from `brickwave/` directory:

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

## Commit & Pull Request Guidelines

### Commit Messages
- **Format:** Concise imperative mood (e.g., `Add phase indicator tweening`, `Fix player collision edge case`)
- **Grouping:** Group related changes into single commits where logical
- **Scope:** Keep commits focused on one concern

### Pull Requests
- **Description:** Short scope description, key changes, testing performed
- **Issue linking:** Link to relevant issues if applicable
- **Visuals:** Include screenshots/GIFs for gameplay or UI updates
- **Bundle size:** Call out asset additions that affect bundle size
- **Diffs:** Keep focused; avoid mixing refactors with behavior changes unless necessary

## Documentation Standards

### Active Documentation
- Keep in `brickwave/docs/` or root level
- Update when implementing features or making architectural changes
- Mark superseded sections clearly

### Completed/Superseded Plans
- Move to `brickwave/docs/archive/`
- Mark as "COMPLETED" or "SUPERSEDED" at the top
- Include completion date

### Cross-References
- Use relative paths for internal doc links
- Update references when moving files
- Verify links work after reorganization

## Development Workflow

### Working with Levels
1. Create/edit maps in Tiled Map Editor (`.tmx` files)
2. Export as JSON to `assets/levels/`
3. LevelLoader system handles loading and parsing

### Adding New Features
1. Check `DEVELOPMENT_PLAN.md` for planned features
2. Review `Game spec.md` for design intent
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
- **[CLAUDE.md](CLAUDE.md)** - Project context and critical success factors
- **[Game spec.md](Game%20spec.md)** - Game design specification
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - Development roadmap and current status

---

**Last Updated:** 2025-12-08
