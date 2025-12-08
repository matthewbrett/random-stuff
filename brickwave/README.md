# 🎮 BRICKWAVE

A fast, tight 2D pixel platformer with classic "run/jump/coins/secrets" vibes—but the level itself pulses: blocks phase, lights flicker, and routes open/close on a rhythmic cycle.

## 🌟 Features

- **Phase Brick Mechanic**: Blocks toggle between solid and ghost on a rhythmic cycle
- **Tight Controls**: 60fps precision platforming with coyote time and jump buffering
- **Dash System**: Echo charge-powered dash for advanced movement
- **Secrets & Collectibles**: Hidden rooms, fake walls, and timed phase gates
- **Retro Aesthetic**: Pixel art with modern feel and optional neon fog effects
- **Speedrun-Friendly**: Instant restart and ghost replay support

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
brickwave/
├── src/
│   ├── scenes/          # Game scenes (Boot, Menu, Game, etc.)
│   ├── entities/        # Player, enemies, collectibles
│   ├── systems/         # Phase system, scoring, etc.
│   └── utils/           # Helpers and constants
├── assets/
│   ├── sprites/         # Pixel art graphics
│   ├── audio/           # Music and SFX
│   └── levels/          # Tiled JSON maps
├── public/              # Static files
└── package.json
```

## 🎯 Development Status

**MVP COMPLETE!** 🎉 All 10 development phases finished (Dec 2025).

See [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) for the complete phased development plan.

### What's Included:
- ✅ 5 playable levels (intro + 3 main + 1 bonus)
- ✅ Complete player movement with dash mechanic
- ✅ Phase brick mechanic with timing system
- ✅ 4 enemy types with AI behaviors
- ✅ Full menu system and HUD
- ✅ Save/load with export/import
- ✅ Procedural audio and particle effects
- ✅ Mobile touch controls
- ✅ Accessibility features (colorblind mode, assist modes)
- ✅ Difficulty scaling system

## 🎮 Controls

### Keyboard
- **Move**: ← → or A D
- **Jump**: Z or Space
- **Dash**: X (consumes Echo charge)
- **Crouch/Drop**: ↓
- **Pause**: Esc

### Mobile
- Touch controls with left/right zones and action buttons

## 🛠️ Technology Stack

- **Game Engine**: Phaser 3
- **Build Tool**: Vite
- **Language**: JavaScript (ES6+)
- **Level Editor**: Tiled Map Editor
- **Audio**: WebAudio API

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is currently in early development. Contribution guidelines coming soon!

---

**Target Platform**: Web (Desktop + Mobile)
**Target Session Length**: 3–10 minutes
**Performance Target**: 60fps on mid-tier mobile devices
