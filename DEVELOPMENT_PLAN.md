# BRICKWAVE - Development Plan

This document outlines the phased development approach for building BRICKWAVE, a browser-based pixel platformer with phase brick mechanics.

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

### **Phase 7: Level Content (World 1 - Catacombs)**
**Goal**: Build the actual game content

**Tasks**:
- [ ] Design and build Level 1-1 (Basics + secrets intro)
  - 60-90 second clear time
  - Introduce movement, coins, simple secrets
- [ ] Design and build Level 1-2 (Phase tutorial)
  - Long corridors, coin arcs
  - Teach phase brick timing
- [ ] Design and build Level 1-3 (Vertical wells)
  - Vertical platforming challenges
  - Moving lifts integration
- [ ] Add secrets to all levels:
  - Hidden rooms behind breakable bricks
  - Fake walls (subtle pixel misalignment)
  - Timed phase gates
- [ ] Place Key Shards (3 per level)
- [ ] Add level exit flag/door
- [ ] Playtest and balance difficulty curve

**Deliverables**:
- 3 complete, polished levels (1-1, 1-2, 1-3)
- Secrets that reward exploration
- Balanced difficulty progression

**Estimated Time**: 6-8 days

---

### **Phase 8: UI & Menus**
**Goal**: Complete the user experience

**Tasks**:
- [ ] Design pixel art UI panels (minimal, clean)
- [ ] Build title screen:
  - Game logo
  - Start / Options / Credits
  - Attract mode demo
- [ ] Create level select screen:
  - World map or simple list
  - Show best times and collectibles
  - Lock/unlock states
- [ ] Build results screen:
  - Time, collectibles, rank display
  - Retry / Next Level / Exit options
- [ ] Implement pause menu (Esc):
  - Resume / Restart / Settings / Quit
  - Show current stats
- [ ] Add instant restart functionality (speedrunner-friendly)
- [ ] Create settings menu:
  - Volume controls
  - Control display
  - Accessibility toggles

**Deliverables**:
- Complete menu navigation flow
- Polished pixel art UI
- Instant restart for speedrunning

**Estimated Time**: 4-5 days

---

### **Phase 9: Persistence & Polish**
**Goal**: Make it feel complete

**Tasks**:
- [ ] Implement localStorage save system:
  - Best times per level
  - Collectibles found
  - Settings/preferences
  - Echo charges and score
- [ ] Add save/load functionality
- [ ] Create export/import system (JSON copy/paste)
- [ ] Integrate chiptune soundtrack (clear beat for phase timing)
- [ ] Add sound effects:
  - Coin ping
  - Brick thunk
  - Dash whoosh
  - Jump, land, stomp sounds
- [ ] Implement WebAudio with low-latency playback
- [ ] Add particle effects (minimal, performant):
  - Coin sparkle
  - Dash trail
  - Landing dust
- [ ] Create visual polish:
  - Screen transitions
  - Optional neon fog layer
- [ ] Optimize asset loading (per-world streaming)
- [ ] Performance profiling and optimization

**Deliverables**:
- Persistent save system
- Complete audio implementation
- Polished visual effects
- Stable 60fps on target devices

**Estimated Time**: 5-6 days

---

### **Phase 10: Accessibility & Final MVP**
**Goal**: Make it accessible and ship-ready

**Tasks**:
- [ ] Implement control remapping system
- [ ] Add mobile touch controls:
  - Left/right thumb zones
  - Jump and dash buttons
  - Optional swipe controls
- [ ] Create assist modes:
  - Reduced timing pressure (slower phase cycle)
  - Infinite time mode (marked as "Assisted")
  - Invincibility toggle
- [ ] Add colorblind-friendly phase indicators (patterns, not just color)
- [ ] Implement screen shake toggle
- [ ] Add difficulty settings
- [ ] Comprehensive playtesting:
  - Desktop (Chrome, Firefox, Safari)
  - Mobile (iOS Safari, Chrome Android)
  - Different screen sizes
- [ ] Bug fixing and polish pass
- [ ] Write player-facing documentation (How to Play)
- [ ] Optimize bundle size and loading times
- [ ] Final QA and release prep

**Deliverables**:
- Fully accessible game
- Mobile-friendly controls
- Tested on multiple platforms
- **MVP READY FOR RELEASE**

**Estimated Time**: 4-5 days

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
| 7 | 3 playable levels exist | ⬜ |
| 8 | Full menu flow works | ⬜ |
| 9 | Audio and saves work | ⬜ |
| 10 | **MVP SHIPPED** | ⬜ |

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
- ✅ Audio is integrated (music + SFX)
- ✅ Works on desktop AND mobile
- ✅ Performance hits targets (60fps stable)
- ✅ No critical bugs
- ✅ Basic accessibility features work

**When this checklist is complete, you can ship!** 🚀

---

**Last Updated**: 2025-12-05
**Next Review**: After each phase completion
