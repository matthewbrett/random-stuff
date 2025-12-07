# Repository Guidelines

## Project Structure & Module Organization
- Core source lives in `src/`: `main.js` bootstraps Phaser, `config.js` holds game constants, `resolution.js` handles display scaling.
- Scenes reside in `src/scenes/` (Boot, Title, Level Select, Settings, Game, Game Over). Systems and managers are under `src/systems/` (input, audio, phase timing, HUD, saving, particles, enemies). Entities are in `src/entities/`.
- Assets (levels, sprites, audio placeholders) live in `assets/`; built output goes to `dist/`.
- Static entry HTML is `index.html`; Vite config is `vite.config.js`.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server with hot reload for quick iteration.
- `npm run build` — production build to `dist/` (used by deploy).
- `npm run preview` — serve the built bundle locally to sanity-check `dist/`.
- `npm run deploy` — publish `dist/` to GitHub Pages via `gh-pages`.
- Playwright is present but no test scripts are wired; add `npm test` when tests exist.

## Coding Style & Naming Conventions
- Language: ES modules (Phaser 3). Stick to modern JS syntax.
- Indentation: 2 spaces; prefer single quotes and trailing commas where natural.
- Use PascalCase for classes (`Player`, `PhaseManager`), camelCase for instances and functions, SCREAMING_SNAKE for constants in `config.js`.
- Keep pixel scale/resolution constants centralized in `resolution.js` and imported where needed.
- Place scene-specific helpers near their scenes; cross-cutting utilities belong in `src/utils/`.

## Testing Guidelines
- No automated tests are defined yet. If adding Playwright or unit tests, keep them close to the feature (e.g., `tests/` or alongside modules) and document new scripts in `package.json`.
- Name tests after the feature under test (e.g., `game-scene.spec.js`), and ensure they run headless in CI-friendly mode.

## Commit & Pull Request Guidelines
- Commit messages: concise imperative summary (e.g., `Add phase indicator tweening`). Group related changes into a single commit where possible.
- Pull requests: include a short description of scope, key changes, and testing performed. Link to relevant issues and add screenshots/GIFs for visible gameplay/UI changes.
- Keep diffs focused: avoid mixing refactors with behavior changes unless necessary, and note any asset additions that affect bundle size.
