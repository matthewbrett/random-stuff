# BRICKWAVE - Development Plan

This document outlines the phased development approach for building BRICKWAVE, a browser-based pixel platformer with phase brick mechanics.

---

## 🎉 Current Status: MVP COMPLETE (as of 2025-12-07)

**All 10 core development phases completed!** BRICKWAVE is fully playable with:
- ✅ **3 main levels** (1-1, 1-2, 1-3) plus intro (0-0) and bonus level (1-bonus)
- ✅ **Complete player movement system** with dash, coyote time, jump buffer
- ✅ **Phase brick mechanic** with visual feedback and timing system
- ✅ **4 enemy types** (Skitter, BlinkBat, SentryOrb, BrickMimic)
- ✅ **Full menu system** (Title, Level Select, Settings, Pause, Results, Game Over)
- ✅ **Save/load system** with export/import and persistence
- ✅ **Procedural audio** (WebAudio-based SFX, no external files)
- ✅ **Particle effects** for all actions
- ✅ **Accessibility features** (touch controls, colorblind mode, assist modes, control remapping)
- ✅ **Mobile support** with touch controls and responsive scaling
- ✅ **Health system** with difficulty-based hearts (Easy: 5♥, Medium: 4♥, Hard: 3♥)
- ✅ **Difficulty scaling** (Phase 1 complete: key shard requirements, enemy speed/count scaling)

**Deployed:** https://matthewbrett.github.io/random-stuff/brickwave/

**Next Steps:** See Post-MVP Roadmap (Phase 11+) for future content and features.

---

## 🎯 Project Overview

**Game**: BRICKWAVE
**Platform**: Web (Desktop + Mobile)
**Framework**: Phaser 3
**Timeline**: MVP in 2-4 weeks of evenings
**Target Performance**: 60fps on mid-tier mobile devices

---

## 📋 Development Phases

### **Phase 1: Project Setup & Core Infrastructure** ✅
**Goal**: Establish the technical foundation

**Tasks**:
- [x] Create project structure with organized folders
- [x] Set up package.json and dependencies (Phaser 3, build tools)
- [x] Configure build system (Vite/Webpack for hot reload)
- [x] Initialize Phaser 3 game instance with proper config
- [x] Set up fixed internal resolution (320×180) with letterboxing
- [x] Implement fixed timestep physics (60fps)
- [x] Create basic canvas rendering test
- [x] Set up Git workflow and version control

**Deliverables**:
- ✅ Working dev environment with hot reload
- ✅ Black screen with Phaser running at 60fps
- ✅ Project documentation (README)

**Estimated Time**: 2-3 days

---

### **Phase 2: Core Player Movement** ✅
**Goal**: Nail the feel-first controls

**Tasks**:
- [x] Create player sprite placeholder (8×8 or 16×16 pixel)
- [x] Implement keyboard input handling (← → A D for movement)
- [x] Add horizontal movement with acceleration/deceleration
- [x] Implement gravity and ground detection
- [x] Add jump mechanic with variable height (hold for higher)
- [x] Implement coyote time (~100ms grace period)
- [x] Add jump buffer (~100ms input memory)
- [x] Create dash mechanic (consumes Echo charge)
- [x] Add crouch/drop-through for thin platforms
- [x] Fine-tune movement physics to feel tight and responsive

**Deliverables**:
- ✅ Playable character with smooth, responsive controls
- ✅ Movement feels "right" - this is critical!

**Estimated Time**: 4-5 days

**Implementation Notes**:
- Created `Player` class in `src/entities/Player.js`
- All core movement mechanics implemented and working
- Feel-first controls with proper acceleration/deceleration
- Coyote time and jump buffer make platforming feel forgiving
- Dash mechanic consumes Echo charges
- Drop-through support for one-way platforms

---

### **Phase 3: Level System & Tiles** ✅
**Goal**: Build the world structure

**Tasks**:
- [x] Integrate Tiled map editor workflow
- [x] Create tile map loader (JSON import from Tiled)
- [x] Implement solid tile collision detection
- [x] Add one-way platform support (can jump through, land on top)
- [x] Create camera system that follows player
- [x] Add level boundaries and wrapping prevention
- [x] Build simple test level (single screen) for iteration
- [x] Add tile layers: Background, Solid, One-Way, Foreground

**Deliverables**:
- ✅ Working tile-based level system
- ✅ At least one test level loaded from Tiled JSON
- ✅ Smooth camera movement

**Estimated Time**: 3-4 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `LevelLoader` system in `src/systems/LevelLoader.js`
- Supports multiple tile layers (Background, Solid, One-Way, Foreground)
- Implemented one-way platform collision with drop-through support (press Down)
- Camera automatically follows player with level boundaries
- Test level created at `assets/levels/test-level-1.json`
- Player spawn points loaded from object layers

---

### **Phase 4: Phase Bricks Mechanic** ✅
**Goal**: Implement the signature feature

**Tasks**:
- [x] Create Phase Brick tile type with timing system
- [x] Implement 2s solid / 2s ghost cycle (configurable)
- [x] Add visual feedback: two-frame shimmer animation
- [x] Create HUD beat indicator (optional pulse graphic)
- [x] Handle collision state changes (solid ↔ ghost)
- [x] Test edge cases (player standing on brick when it phases)
- [x] Add phase groups (multiple bricks synced)
- [x] Implement phase schedule system for variety
- [x] Create test level showcasing phase mechanics

**Deliverables**:
- ✅ Fully functional phase brick system
- ✅ Clear visual feedback for phase timing
- ✅ Test level demonstrating the mechanic

**Estimated Time**: 4-5 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `PhaseManager` system in `src/systems/PhaseManager.js` to handle phase timing
- Created `PhaseBrick` class in `src/entities/PhaseBrick.js` for individual phase bricks
- Supports multiple phase groups (up to 4) with configurable timing
- Phase bricks have visual shimmer animation and color changes (blue for solid, purple for ghost)
- Created `PhaseIndicator` HUD element showing phase progress and timing
- Updated `LevelLoader` to support "Phase" tile layers from Tiled
- Integrated collision handling that respects phase states (solid vs ghost)
- Test level includes multiple phase brick platforms demonstrating the mechanic

---

### **Phase 5: Collectibles & Scoring** ✅
**Goal**: Add progression and feedback systems

**Tasks**:
- [x] Create coin sprite and animation
- [x] Implement coin collection (+100 score)
- [x] Add Echo Charge system (10 coins = +1 dash, max 3)
- [x] Build HUD display:
  - Score counter
  - Coins ×##
  - World #-#
  - Time ###
  - Echo Charges (●●●)
- [x] Add level timer (tracks play time)
- [x] Implement time bonus calculation at level end
- [x] Create style bonus (continuous movement detection)
- [x] Add visual/audio feedback for collection

**Deliverables**:
- ✅ Working coin and scoring system
- ✅ Complete HUD with all elements
- ✅ Reward feedback that feels satisfying

**Estimated Time**: 3-4 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `Coin` entity class in `src/entities/Coin.js` with pulsing/floating animation
- Created `ScoreManager` system in `src/systems/ScoreManager.js` for tracking scores, coins, Echo Charges, and bonuses
- Created `GameHUD` system in `src/systems/GameHUD.js` displaying all game information
- Integrated coin collection into `GameScene` with overlap detection
- Updated `Player` class to use ScoreManager's Echo Charges instead of internal tracking
- Echo Charge system: Every 10 coins awards +1 dash charge (max 3)
- Style bonus tracks continuous movement with combo system
- Time bonus calculated based on target completion time
- Visual feedback on coin collection with flash/sparkle effect
- Test level updated with 15 coins placed throughout

---

### **Phase 6: Enemies & Combat** ✅
**Goal**: Add challenge and variety

**Tasks**:
- [x] Create Enemy base class with common behaviors
- [x] Implement Skitter (beetle ground enemy):
  - Patrols back and forth
  - Reverses at edges
  - Can be stomped
- [x] Add Blink Bat (phase-based enemy):
  - Only appears during "ghost" phase windows
  - Simple flying pattern
- [x] Implement Sentry Orb (patrol enemy):
  - Moves in short arcs
  - Bounceable
- [x] Add stomp/bounce combat mechanic
- [x] Implement dash-to-tag for lighter enemies
- [x] Add enemy death animations and feedback
- [x] Create enemy spawn system from Tiled entities layer

**Deliverables**:
- ✅ At least 3 working enemy types
- ✅ Satisfying combat feel (stomp bounce)
- ✅ Enemy patterns are readable and fair

**Estimated Time**: 4-5 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `Enemy` base class in `src/entities/Enemy.js` with common behaviors (movement, combat, death)
- Created `Skitter` ground enemy in `src/entities/Skitter.js` (patrols, edge detection, beetle visual)
- Created `BlinkBat` phase-synced enemy in `src/entities/BlinkBat.js` (appears during ghost phase, flying pattern)
- Created `SentryOrb` patrol enemy in `src/entities/SentryOrb.js` (arc/circle/figure-8 patterns, glowing visual)
- Created `EnemyManager` system in `src/systems/EnemyManager.js` for spawning and collision management
- Stomp mechanic bounces player and kills enemy with satisfying death animation
- Dash attack kills enemies with different visual feedback
- Enemies spawn from "Enemies" object layer in Tiled JSON
- Test level updated with all 3 enemy types demonstrating behaviors

---

### **Phase 7: Level Content (World 1 - Catacombs)** ✅
**Goal**: Build the actual game content

**Tasks**:
- [x] Design and build Level 1-1 (Basics + secrets intro)
  - 60-90 second clear time
  - Introduce movement, coins, simple secrets
- [x] Design and build Level 1-2 (Phase tutorial)
  - Long corridors, coin arcs
  - Teach phase brick timing
- [x] Design and build Level 1-3 (Vertical wells)
  - Vertical platforming challenges
  - Phase brick integration for timing puzzles
- [x] Add secrets to all levels:
  - Hidden Key Shards in challenging locations
  - Timed phase gates
- [x] Place Key Shards (3 per level)
- [x] Add level exit flag/door
- [x] Create KeyShard collectible entity
- [x] Create LevelExit entity with portal visual
- [x] Update GameScene for multi-level support

**Deliverables**:
- ✅ 3 complete, polished levels (1-1, 1-2, 1-3)
- ✅ Key Shards hidden in each level (3 per level)
- ✅ Level exit system with visual feedback
- ✅ Dynamic level loading support

**Estimated Time**: 6-8 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `KeyShard` entity in `src/entities/KeyShard.js` with glowing/shimmering effect
- Created `LevelExit` entity in `src/entities/LevelExit.js` with portal appearance
- Updated `ScoreManager` to track Key Shards (3 per level, 500 points each)
- Updated `GameHUD` to display Key Shards collected
- Updated `GameScene` with `init()` method for dynamic level loading
- Level 1-1: Catacomb Entrance (60x23 tiles, 26 coins, 2 enemies)
- Level 1-2: Phase Corridors (80x23 tiles, 33 coins, 4 enemies, heavy phase brick usage)
- Level 1-3: The Vertical Descent (50x40 tiles, 30 coins, 5 enemies, vertical challenge)

---

### **Phase 8: UI & Menus** ✅
**Goal**: Complete the user experience

**Tasks**:
- [x] Design pixel art UI panels (minimal, clean)
- [x] Build title screen:
  - Game logo
  - Start / Options / Credits
  - Attract mode demo
- [x] Create level select screen:
  - World map or simple list
  - Show best times and collectibles
  - Lock/unlock states
- [x] Build results screen:
  - Time, collectibles, rank display
  - Retry / Next Level / Exit options
- [x] Implement pause menu (Esc):
  - Resume / Restart / Settings / Quit
  - Show current stats
- [x] Add instant restart functionality (speedrunner-friendly)
- [x] Create settings menu:
  - Volume controls
  - Control display
  - Accessibility toggles

**Deliverables**:
- ✅ Complete menu navigation flow
- ✅ Polished pixel art UI
- ✅ Instant restart for speedrunning

**Estimated Time**: 4-5 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `TitleScene` in `src/scenes/TitleScene.js` with animated logo, floating particles, and menu
- Created `LevelSelectScene` in `src/scenes/LevelSelectScene.js` with level list, best times, key shards display
- Created `SettingsScene` in `src/scenes/SettingsScene.js` with volume, display, and accessibility options
- Enhanced `GameScene` with pause menu (ESC), instant restart (R), and improved results screen
- Results screen now shows rank (S/A/B/C/D) based on time, key shards, and score
- Added text styles in `TextStyles.js` for menus, settings, and rank display
- Full keyboard navigation throughout all menus (arrows, WASD, Enter, ESC)

---

### **Phase 9: Persistence & Polish** ✅
**Goal**: Make it feel complete

**Tasks**:
- [x] Implement localStorage save system:
  - Best times per level
  - Collectibles found
  - Settings/preferences
  - Echo charges and score
- [x] Add save/load functionality
- [x] Create export/import system (JSON copy/paste)
- [x] Integrate procedural audio (WebAudio-based chiptune SFX)
- [x] Add sound effects:
  - Coin ping
  - Brick thunk
  - Dash whoosh
  - Jump, land, stomp sounds
- [x] Implement WebAudio with low-latency playback
- [x] Add particle effects (minimal, performant):
  - Coin sparkle
  - Dash trail
  - Landing dust
  - Enemy death burst
  - Level complete celebration
- [x] Create visual polish:
  - Screen transitions (fade in/out)
  - Stomp effect rings
- [x] Performance profiling and optimization

**Deliverables**:
- ✅ Persistent save system
- ✅ Complete audio implementation (procedural SFX)
- ✅ Polished visual effects
- ✅ Stable 60fps on target devices

**Estimated Time**: 5-6 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `SaveManager` system in `src/systems/SaveManager.js` with full save/load/export/import
- Created `AudioManager` system in `src/systems/AudioManager.js` with procedural WebAudio SFX
- Created `ParticleEffects` system in `src/systems/ParticleEffects.js` for all game effects
- Created `TransitionManager` system in `src/systems/TransitionManager.js` for scene transitions
- Integrated all systems into GameScene, Player, and menu scenes
- Save progress displays on LevelSelectScene with best times, key shards, and rank badges
- Export/Import save functionality added to SettingsScene
- All audio uses procedural generation (no external audio files needed)

---

### **Phase 10: Accessibility & Final MVP** ✅
**Goal**: Make it accessible and ship-ready

**Tasks**:
- [x] Implement control remapping system
- [x] Add mobile touch controls:
  - Left/right thumb zones
  - Jump and dash buttons
  - Touch control visibility toggle (Auto/On/Off)
- [x] Create assist modes:
  - Reduced timing pressure (Normal/Relaxed 1.5x/Slow 2x phase cycle)
  - Invincibility toggle (marked as "Assisted")
- [x] Add colorblind-friendly phase indicators (patterns, not just color)
- [x] Implement screen shake toggle
- [x] Add difficulty settings
- [x] Bug fixing and polish pass
- [x] Write player-facing documentation (How to Play screen)
- [x] Build optimization verified

**Deliverables**:
- ✅ Fully accessible game
- ✅ Mobile-friendly controls
- ✅ Input remapping support
- ✅ **MVP READY FOR RELEASE**

**Estimated Time**: 4-5 days
**Actual Time**: ~1 session

**Implementation Notes**:
- Created `InputManager` system in `src/systems/InputManager.js` for unified input handling
- InputManager supports keyboard remapping and mobile touch controls
- Touch controls include D-pad (left/right/down) and action buttons (A for jump, B for dash)
- Assist modes: invincibility toggle, phase timing multiplier (1x/1.5x/2x)
- Colorblind mode adds pattern overlays to phase bricks and indicator (lines for solid, dots for ghost)
- How to Play screen added to Settings with game mechanics explanation
- All accessibility settings persist in localStorage

---

## 🚀 Post-MVP Roadmap

### **Phase 11: Extended Content** (Future)
- Complete World 1 (levels 1-4 through 1-8)
- Mini-boss fight (1-4)
- Bonus stage unlockable with Key Shards
- Brick Mimic enemy
- Phase Anchor and Spectral Boots power-ups

### **Phase 12: Advanced Features** (Future)
- Ghost replay system (record inputs, deterministic playback)
- Daily seed "challenge run" mode
- Leaderboard integration (optional backend)
- Additional worlds with new themes
- Community level sharing

### **Phase 13: Level Editor** (Future)
- Simple in-browser level editor
- Export/import custom levels
- Community map sharing system

---

## 📊 Technical Milestones

| Phase | Milestone | Status |
|-------|-----------|--------|
| 1 | Project boots and renders | ✅ |
| 2 | Player movement feels good | ✅ |
| 3 | Levels load from Tiled | ✅ |
| 4 | Phase bricks work perfectly | ✅ |
| 5 | Scoring and HUD complete | ✅ |
| 6 | Enemies challenge player | ✅ |
| 7 | 3 playable levels exist | ✅ |
| 8 | Full menu flow works | ✅ |
| 9 | Audio and saves work | ✅ |
| 10 | **MVP SHIPPED** | ✅ |

---

## 🎨 Asset Pipeline

### Graphics
- Pixel art at native resolution (8×8 or 16×16 tiles)
- Limited palette (cool blues/purples for Catacombs)
- Nearest-neighbor scaling
- Tools: Aseprite, Pyxel Edit, or GraphicsGale

### Audio
- Chiptune music with clear beat (supports phase timing)
- 8-bit SFX
- Tools: BeepBox, FamiTracker, or sfxr

### Levels
- Tiled Map Editor (.tmx → JSON export)
- Layers: Solid, One-Way, Phase, Entities, Triggers

---

## ⚡ Performance Targets

- **Desktop**: Locked 60fps, < 50MB initial load
- **Mobile**: Stable 60fps on mid-tier devices (e.g., iPhone X, Galaxy S9)
- **Bundle**: < 5MB total (code + assets)
- **Load time**: < 3 seconds to playable on 4G

---

## 🧪 Testing Strategy

**Per Phase**:
- Manual playtesting after each feature
- Movement feel validation (critical!)
- Cross-browser checks (Chrome, Firefox, Safari)

**Pre-MVP**:
- Full playthrough of all levels
- Mobile device testing (iOS + Android)
- Performance profiling
- Accessibility audit

**Tools**:
- Browser DevTools for profiling
- Real device testing (not just emulators)
- Feedback from external playtesters

---

## 📝 Notes & Considerations

### Critical Success Factors
1. **Feel-first controls** - If movement doesn't feel good, nothing else matters
2. **Phase timing clarity** - Players must understand the phase cycle instantly
3. **Performance** - 60fps is non-negotiable for platformer precision
4. **Instant restart** - Speedrunners need quick retry loops

### Risk Mitigation
- **Phase sync issues**: Test edge cases early (player on phasing brick)
- **Mobile performance**: Profile frequently, keep effects minimal
- **Scope creep**: Stick to MVP, resist feature bloat
- **Browser compatibility**: Test WebAudio and Canvas across browsers

### Flexibility
- Phases can overlap or be done in parallel where it makes sense
- Time estimates are guidelines, not deadlines
- If a feature takes longer, it's better to get it right than rush
- Mobile controls can be basic in MVP, polished post-launch

---

## 🎯 MVP Definition of Done

The MVP is complete when:
- ✅ 3 levels are fully playable (1-1, 1-2, 1-3)
- ✅ All core mechanics work (movement, dash, phase bricks, coins, enemies)
- ✅ Full menu flow (title → level select → play → results → repeat)
- ✅ Saves persist (best times, collectibles)
- ✅ Audio is integrated (procedural SFX)
- ✅ Works on desktop AND mobile (touch controls)
- ✅ Performance hits targets (60fps stable)
- ✅ No critical bugs
- ✅ Basic accessibility features work (colorblind mode, assist modes, control remapping)

**🎉 MVP IS COMPLETE! READY TO SHIP! 🚀**

---

**Last Updated**: 2025-12-06
**Next Review**: After each phase completion
