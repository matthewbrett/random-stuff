# Repository Guidelines

## Scope & Layout
- Root docs: `Overview.md` (repo description), `Game spec.md`, `DEVELOPMENT_PLAN.md`, `CLAUDE.md` (context), plus project folder `brickwave/` (main game).
- Work primarily inside `brickwave/`; core entry is `brickwave/src/main.js`, constants in `brickwave/src/config.js`, scaling in `brickwave/src/resolution.js`.
- Scenes: `brickwave/src/scenes/` (Boot, Title, Level Select, Settings, Game, Game Over). Systems/managers: `brickwave/src/systems/`. Entities: `brickwave/src/entities/`. Helpers: `brickwave/src/utils/`.
- Assets live in `brickwave/assets/`; production build outputs to `brickwave/dist/`; static shell is `brickwave/index.html`; build config is `brickwave/vite.config.js`.

## Build, Test, and Development Commands
- From `brickwave/`: `npm run dev` (Vite dev server), `npm run build` (prod build to `dist/`), `npm run preview` (serve built bundle), `npm run deploy` (publish to GitHub Pages).
- Playwright is present but no test script is wired; add `npm test` if you introduce tests.

## Coding Style
- JS ES modules (Phaser 3). Two-space indent, prefer single quotes and trailing commas when natural.
- Naming: PascalCase classes, camelCase instances/functions, SCREAMING_SNAKE constants (especially in `config.js`).
- Keep resolution/scaling logic centralized in `resolution.js`; import where needed.
- Place scene-specific helpers near their scene; cross-cutting utilities go in `src/utils/`.

## Testing Guidelines
- No automated tests yet. If you add unit/e2e tests, keep them near the feature (e.g., `tests/` or alongside modules) and document new scripts in `package.json`.
- Name tests after the feature (`game-scene.spec.js`) and ensure headless/CI-friendly defaults.

## Commit & PR Guidelines
- Commit messages: concise imperative (e.g., `Add phase indicator tweening`). Group related changes.
- PRs: short scope description, key changes, testing performed; link issues; include visuals for gameplay/UI updates.
- Keep diffs focused; call out asset additions that affect bundle size.
