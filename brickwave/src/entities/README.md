# Entities

This directory contains all game entities (player, enemies, collectibles, etc.).

## Structure

### Player
- **Player.js** - Main player class with movement, jumping, dashing

### Enemies
- **Enemy.js** - Base enemy class
- **Skitter.js** - Beetle ground enemy
- **BlinkBat.js** - Phase-based flying enemy
- **SentryOrb.js** - Patrolling bounceable enemy
- **BrickMimic.js** - Block-disguised enemy

### Collectibles
- **Coin.js** - Standard coin collectible
- **KeyShard.js** - Special collectible for unlocking bonus stages
- **PowerUp.js** - Base power-up class

### Tiles
- **PhaseBrick.js** - Phase brick tile entity
- **BreakableBrick.js** - Destructible brick
