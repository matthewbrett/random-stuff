Game Spec: BRICKWAVE (browser platformer inspired by 80s underground runners)

1) High concept

A fast, tight 2D pixel platformer with classic “run/jump/coins/secrets” vibes—but the level itself pulses: blocks phase, lights flicker, and routes open/close on a rhythmic cycle. It’s retro at first glance, modern in feel.

Target platform: Web (desktop + mobile)
Target session length: 3–10 minutes (perfect for quick runs and speedrunning)

⸻

2) Core loop
	1.	Spawn at level start (HUD shows Score / Coins / World / Time in chunky pixel text).
	2.	Run platforming challenges (timed, but not punishing).
	3.	Collect coins + shards to build score and unlock secrets.
	4.	Find hidden routes (breakable bricks, fake walls, timed phasing).
	5.	Reach flag/exit door → results screen with time, collectibles, rank.
	6.	Optional: replay with ghost / chase higher rank / discover shortcuts.

⸻

3) Player controls (feel-first)

Keyboard
	•	Move: ← → or A D
	•	Jump: Z / Space
	•	Dash: X (consumes 1 “Echo” charge)
	•	Down: ↓ (crouch / drop through thin platforms)
	•	Pause: Esc

Mobile
	•	Left/right thumb zones + jump + dash buttons
	•	Optional “swipe up to jump, swipe right to dash” mode

Movement tuning targets
	•	60fps fixed-timestep simulation
	•	Coyote time: ~100ms
	•	Jump buffer: ~100ms
	•	Variable jump height (hold = higher)
	•	Dash: short, snappy, cancels on hit

⸻

4) Signature mechanic: Phase Bricks

Inspired by the screenshot’s brick corridors and coin lines, but with a twist:
	•	Certain bricks toggle between Solid and Ghost on a repeating cycle (e.g., 2s solid, 2s ghost).
	•	The rhythm is visible via subtle animation (two-frame shimmer) and an optional HUD “beat” indicator.
	•	Some coins and enemies also phase, creating route planning: wait for safe passage or take a riskier shortcut.

Power-up interaction
	•	“Phase Anchor” power-up: temporarily freezes phase bricks near the player for 3 seconds.
	•	“Spectral Boots”: lets you stand on ghost blocks briefly (0.5s grace).

⸻

5) World structure

World 1: Catacombs (blue-brick underground vibe)
	•	8 levels, each 60–120 seconds for an average player
	•	Level themes:
	•	1-1: Basics + secrets introduction
	•	1-2: Long corridors, coin arcs, phasing tutorial
	•	1-3: Vertical wells + moving lifts
	•	1-4: Mini-boss + escape sprint
	•	1-5 to 1-8: Remix mechanics + harder secrets

Secrets
	•	Hidden rooms behind breakable bricks
	•	Fake walls (subtle misaligned pixel cue)
	•	Timed “phase gates” that only open on-beat
	•	Optional collectible: Key Shards (3 per level) unlock a bonus stage

⸻

6) Enemies (simple silhouettes, readable patterns)
	•	Skitter: beetle-like ground enemy; reverses at edges
	•	Blink Bat: appears only during “ghost” phase windows
	•	Brick Mimic: looks like a normal block until approached
	•	Sentry Orb: patrols short arcs; can be bounced on

Combat philosophy
	•	Classic stomp/bounce is primary
	•	Dash can “tag” lighter enemies
	•	No fiddly weapon swaps—keep it platformer-first

⸻

7) Items & scoring
	•	Coins: +100 score; contribute to “Echo” charge
	•	Echo Charge: every 10 coins = +1 dash charge (max 3)
	•	Time bonus at level end (encourages flow)
	•	Style bonus for continuous movement (no stopping for >2s)

⸻

8) UI / HUD (retro, but clean)

Top HUD (like the screenshot):
	•	Player name/icon
	•	Score
	•	Coins ×##
	•	World #-#
	•	Time ###

Menus:
	•	Minimal pixel panels
	•	Instant restart (speedrunner-friendly)
	•	Toggleable assists (see Accessibility)

⸻

9) Art & audio direction

Visual
	•	Pixel art, limited palette (cool blues/purples for catacombs)
	•	Nearest-neighbor scaling, integer zoom steps
	•	Small modern flair: soft “neon fog” layer behind tiles (optional toggle)

Audio
	•	Chiptune soundtrack with a clear beat (supports phase timing)
	•	Punchy SFX: coin ping, brick thunk, dash whoosh
	•	WebAudio with low-latency playback

⸻

10) Browser tech spec (implementation-ready)

Rendering
	•	HTML5 Canvas (2D) or WebGL via Phaser/Pixi (recommended: Phaser 3 for fast iteration)
	•	Fixed internal resolution (e.g., 320×180), scaled up with letterboxing
	•	Deterministic fixed timestep physics (e.g., 1/60)

Level format
	•	Tile-based maps (Tiled editor) exported to JSON
	•	Layers:
	•	Solid tiles
	•	One-way platforms
	•	Phase tiles (with phase group + schedule)
	•	Entities (spawn points, enemies, pickups)
	•	Triggers (doors, secrets, checkpoints)

Persistence
	•	localStorage for:
	•	Best times per level
	•	Collectibles
	•	Settings (controls, assists)
	•	Optional export/import of save as JSON (copy/paste)

Performance budgets
	•	Mobile: stable 60fps on mid devices
	•	Asset streaming: preload per-world, not entire game
	•	Avoid heavy shaders; keep particles lightweight

⸻

11) Accessibility & assists
	•	Remappable controls
	•	“Reduced timing pressure” mode (slower phase cycle)
	•	Optional infinite time (still records as “Assisted”)
	•	Colorblind-friendly phase indicator (pattern overlay, not just color)
	•	Screen shake toggle

⸻

12) MVP scope (what to build first)

MVP (2–4 weeks of evenings)
	•	One world (1-1 to 1-3), one mini-boss
	•	Core movement + dash + coins
	•	Phase bricks (single schedule, single group)
	•	3 enemies
	•	Title screen + level select + results screen
	•	Save best times

Nice-to-have next
	•	Ghost replay (record inputs, deterministically replay)
	•	Daily seed “challenge run”
	•	Simple in-browser level editor for community maps