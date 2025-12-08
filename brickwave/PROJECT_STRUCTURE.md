# BRICKWAVE - Project Structure

This document provides a complete overview of the project's file organization and architecture.

## 📁 Directory Tree

```
brickwave/
├── index.html                  # Main HTML entry point
├── package.json                # NPM dependencies and scripts
├── vite.config.js             # Vite build configuration
├── .gitignore                 # Git ignore rules
├── README.md                  # Project overview and quick start
├── PROJECT_STRUCTURE.md       # This file
│
├── src/                       # Source code
│   ├── main.js               # Game initialization
│   ├── config.js             # Phaser config and game constants
│   │
│   ├── scenes/               # Game scenes
│   │   ├── README.md
│   │   ├── BootScene.js      # Initial loading scene
│   │   ├── MainMenuScene.js  # (TODO) Title screen
│   │   ├── LevelSelectScene.js # (TODO) Level selection
│   │   ├── GameScene.js      # (TODO) Main gameplay
│   │   ├── ResultsScene.js   # (TODO) Level results
│   │   └── PauseScene.js     # (TODO) Pause menu
│   │
│   ├── entities/             # Game entities
│   │   ├── README.md
│   │   ├── Player.js         # (TODO) Player character
│   │   ├── Enemy.js          # (TODO) Base enemy class
│   │   ├── Skitter.js        # (TODO) Ground enemy
│   │   ├── BlinkBat.js       # (TODO) Phase enemy
│   │   ├── SentryOrb.js      # (TODO) Patrol enemy
│   │   ├── Coin.js           # (TODO) Collectible
│   │   ├── KeyShard.js       # (TODO) Special collectible
│   │   └── PhaseBrick.js     # (TODO) Phase tile entity
│   │
│   ├── systems/              # Game systems
│   │   ├── README.md
│   │   ├── PhaseSystem.js    # (TODO) Phase timing manager
│   │   ├── ScoreManager.js   # (TODO) Scoring system
│   │   ├── InputManager.js   # (TODO) Input handling
│   │   ├── SaveManager.js    # (TODO) Save/load system
│   │   ├── LevelLoader.js    # (TODO) Map loader
│   │   ├── AudioManager.js   # (TODO) Audio system
│   │   └── CameraController.js # (TODO) Camera system
│   │
│   └── utils/                # Utilities
│       ├── README.md
│       ├── constants.js      # (TODO) Game constants
│       ├── helpers.js        # (TODO) Helper functions
│       ├── mathUtils.js      # (TODO) Math utilities
│       └── debugUtils.js     # (TODO) Debug tools
│
├── assets/                   # Game assets
│   ├── README.md
│   │
│   ├── sprites/             # Pixel art graphics
│   │   ├── player/          # Player sprites
│   │   ├── enemies/         # Enemy sprites
│   │   ├── tiles/           # Tile sets
│   │   ├── ui/              # UI elements
│   │   └── fx/              # Particle effects
│   │
│   ├── audio/               # Audio files
│   │   ├── music/           # Background music
│   │   └── sfx/             # Sound effects
│   │
│   └── levels/              # Tiled JSON maps
│       ├── world1/          # Catacombs levels
│       └── test/            # Test levels
│
└── public/                  # Static files (served as-is)
    └── (empty for now)
```

## 🏗️ Architecture Overview

### Core Game Loop
```
index.html → main.js → Phaser Game Instance
                           ↓
                      BootScene (initial)
                           ↓
                    Scene Management System
                           ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
         Game Logic                  Rendering
    (Update @ 60fps)              (Draw @ 60fps)
```

### Scene Flow
```
BootScene
    ↓
MainMenuScene
    ↓
LevelSelectScene
    ↓
GameScene ←→ PauseScene
    ↓
ResultsScene
    ↓
(Loop back to LevelSelectScene or MainMenuScene)
```

### Entity Hierarchy
```
Phaser.GameObjects.Sprite
    ├── Player
    │   ├── Movement System
    │   ├── Jump System (with coyote time)
    │   ├── Dash System (Echo charges)
    │   └── Collision System
    │
    └── Enemy (base)
        ├── Skitter (ground patrol)
        ├── BlinkBat (phase-based)
        ├── SentryOrb (arc patrol)
        └── BrickMimic (disguised)
```

### Systems Architecture
```
GameScene
    ├── PhaseSystem (manages brick phase cycles)
    ├── ScoreManager (coins, echo charges, bonuses)
    ├── InputManager (keyboard/touch handling)
    ├── LevelLoader (Tiled JSON parser)
    ├── AudioManager (music + SFX)
    ├── CameraController (follow player)
    └── SaveManager (localStorage)
```

## 🎯 Key Files Explained

### Entry Points
- **index.html**: HTML container, loads main.js via Vite
- **src/main.js**: Creates Phaser game instance
- **src/config.js**: Phaser configuration and game constants

### Configuration
All game constants are defined in `src/config.js`:
- Screen resolution (320×180 internal)
- Physics parameters (gravity, speeds)
- Timing values (coyote time, jump buffer)
- Phase cycle duration
- Scoring values

### Scene System
Each scene is a self-contained module:
- `preload()`: Load assets
- `create()`: Initialize scene
- `update()`: Game loop (60fps)

### Entity System
Entities extend Phaser's GameObject classes:
- Sprites for visual entities
- Physics bodies for collision
- Custom behavior in update loop

### Systems
Standalone manager classes:
- Handle cross-scene functionality
- Manage game state
- Provide services to entities

## 🔧 Development Workflow

### Adding a New Scene
1. Create scene file in `src/scenes/`
2. Import in `src/config.js`
3. Add to `scene` array in config
4. Implement `preload()`, `create()`, `update()`

### Adding a New Entity
1. Create class file in `src/entities/`
2. Extend appropriate Phaser class
3. Implement constructor and update logic
4. Add to scene in `create()`

### Adding a New System
1. Create manager file in `src/systems/`
2. Implement as singleton or instantiate in scene
3. Expose methods for entities to use
4. Handle state persistence if needed

### Adding Assets
1. Place files in appropriate `assets/` subdirectory
2. Load in scene's `preload()` method
3. Reference by key in `create()` or entity code

## 📦 Build Output

Running `npm run build` creates:
```
dist/
├── index.html          # Processed HTML
├── assets/            # Copied assets
│   ├── sprites/
│   ├── audio/
│   └── levels/
└── assets/            # Bundled JS/CSS
    └── index.[hash].js
```

## 🚀 Current Status

**MVP COMPLETE!** All 10 development phases finished (Dec 2025).

See [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) for the complete phased development roadmap.

**All Systems Implemented:**
- ✅ Complete scene flow (Boot → Title → Level Select → Game → Results/Game Over)
- ✅ All entity types (Player, 4 enemies, collectibles, phase bricks)
- ✅ All systems (Phase, Score, Audio, Particle, Save, Input, Enemy, Level Loading)
- ✅ 5 playable levels with Tiled JSON integration
- ✅ Full HUD and menu systems
- ✅ Accessibility and mobile support

**Play Online:** https://matthewbrett.github.io/random-stuff/brickwave/

---

**Last Updated**: 2025-12-08
