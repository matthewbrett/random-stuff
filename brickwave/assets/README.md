# Assets

This directory contains all game assets.

## Directory Structure

### sprites/
Pixel art graphics:
- Player sprites and animations
- Enemy sprites
- Tile sets
- UI elements
- Particle effects

**Format**: PNG with transparent backgrounds
**Style**: Pixel art, limited palette, 8×8 or 16×16 tiles

### audio/
Sound effects and music:
- **music/** - Chiptune background music tracks
- **sfx/** - Sound effects (coin, jump, dash, etc.)

**Format**:
- Music: MP3/OGG (chiptune style)
- SFX: WAV/OGG (8-bit style)

### levels/
Tiled map editor files:
- World 1 (Catacombs) levels 1-1 through 1-8
- Test levels for development

**Format**: JSON export from Tiled Map Editor

## Asset Guidelines

### Sprites
- Nearest-neighbor scaling only
- Limited palette (blues/purples for Catacombs)
- Clear silhouettes for readability
- Consistent size (8×8 or 16×16 pixels)

### Audio
- Music should have clear beat for phase timing
- SFX should be punchy and satisfying
- Keep file sizes small (< 100KB per file)
- WebAudio compatible formats

### Levels
- Export from Tiled as JSON
- Use standard layer naming:
  - "Solid" - solid tiles
  - "OneWay" - one-way platforms
  - "Phase" - phase bricks
  - "Entities" - spawn points, enemies, pickups
  - "Triggers" - doors, secrets, checkpoints
