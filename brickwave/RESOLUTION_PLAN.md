# Dual-Resolution Support Plan

## Overview
Add toggle between Retro (320×180, 8×8 tiles) and Polished (640×360, 16×16 tiles) modes with restart-based switching.

**Default:** Retro mode
**Toggle:** URL param `?mode=polished` + future menu option

## Approach: SCALE Multiplier
Instead of hardcoding two sets of values, introduce a `SCALE` constant (1 or 2) that multiplies all pixel values. This:
- Minimizes code changes
- Preserves identical gameplay feel
- Makes future resolution changes trivial
- Requires no level file changes (LevelLoader already uses TILE_SIZE)

**Note:** This provides the resolution infrastructure. Actual visual polish requires creating higher-detail sprite art at 16×16 to replace the current procedural shapes.

---

## Implementation Steps

### Step 1: Resolution Config System
**File:** `src/config.js`

Add resolution detection and SCALE export:
```javascript
function detectResolutionMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlMode = urlParams.get('mode');
  if (urlMode === 'polished' || urlMode === 'retro') return urlMode;
  return localStorage.getItem('brickwave_resolution_mode') || 'retro';
}

export const RESOLUTION_MODE = detectResolutionMode();
export const SCALE = RESOLUTION_MODE === 'polished' ? 2 : 1;

export function setResolutionMode(mode) {
  localStorage.setItem('brickwave_resolution_mode', mode);
  window.location.reload();
}
```

Update GAME_CONFIG and Phaser config to use `320 * SCALE`, `180 * SCALE`, `8 * SCALE`.
Scale physics gravity: `800 * SCALE`.

### Step 2: Entity Scaling

**Player.js** - Texture `8 * SCALE`, body size, all movement constants
**Coin.js** - Circle positions/radii, texture `6 * SCALE`, effect radius
**Enemy.js** - Default sizes, stomp tolerance, bounce velocity, particles
**Skitter.js, BlinkBat.js, SentryOrb.js** - Sprite dimensions, graphics coords, movement ranges, particles

### Step 3: UI Scaling

**GameHUD.js** - padding `4 * SCALE`, lineHeight `10 * SCALE`
**PhaseIndicator.js** - width `60 * SCALE`, height `6 * SCALE`, pulse indicator
**TextStyles.js** - All fontSize values

### Step 4: Scene Updates

**GameScene.js** - PhaseIndicator Y position `20 * SCALE`
**LevelLoader.js** - Fallback spawn points only

---

## Files to Modify (12 total)

| File | Key Changes |
|------|-------------|
| `src/config.js` | Resolution detection, SCALE export, scale all config values |
| `src/entities/Player.js` | Texture, body, all movement constants |
| `src/entities/Coin.js` | Texture, body, effect radius |
| `src/entities/Enemy.js` | Default sizes, stomp tolerance, bounce, particles |
| `src/entities/Skitter.js` | All texture coords, edge detection, particles |
| `src/entities/BlinkBat.js` | All texture coords, flying ranges, particles |
| `src/entities/SentryOrb.js` | All texture coords, orbit radii, glow, particles |
| `src/systems/GameHUD.js` | Padding, line height |
| `src/systems/PhaseIndicator.js` | Bar dimensions, pulse indicator |
| `src/systems/LevelLoader.js` | Fallback spawn points only |
| `src/utils/TextStyles.js` | All fontSize values |
| `src/scenes/GameScene.js` | Indicator position |

---

## Testing Checklist
- [ ] Game loads in retro mode by default
- [ ] `?mode=polished` switches to 640×360
- [ ] Player movement feels identical in both modes
- [ ] All enemies render correctly at both scales
- [ ] HUD elements positioned correctly
- [ ] Phase indicator scales properly
- [ ] Coins collectible at both resolutions
- [ ] localStorage persists preference

---

## Notes
- **No level file changes** - Tiled JSON stays at 8×8; LevelLoader scales coordinates
- **Animation timing unchanged** - Only spatial values scale, not durations
- **Menu option** - `setResolutionMode()` ready for Phase 8 UI integration
