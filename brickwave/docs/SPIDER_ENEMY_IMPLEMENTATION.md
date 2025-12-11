# Spider Enemy & Web Zones Implementation Plan

**Created:** December 2025
**Status:** Planning Complete - Ready for Implementation
**Feature:** New spider enemy with smart jumping AI and web zone slowdown mechanic

---

## Overview

Add a spider enemy that chases the player with smart jumping abilities, plus web zones that slow the player but not the spider. This feature introduces vertical enemy AI and environmental hazards.

---

## Key Design Decisions

### Spider Behavior
- **Movement**: Horizontal patrol/chase similar to Skitter (ground enemy)
- **Smart Jumping**: Detects when player is on higher platform and jumps to reach them
  - Jump check interval: 500ms
  - Jump cooldown: 1000ms (prevents spam)
  - Horizontal chase range: 100 * SCALE
  - Vertical detection range: 50 * SCALE
- **Physics**: Uses player jump velocity (-220 * SCALE) for predictable arcs
- **Combat**: Can be stomped and dashed like other enemies
- **Score Value**: 75 points (between Skitter 50 and BlinkBat 75)

### Web Zone System
- **Implementation**: Object layer in Tiled JSON (data-driven, easiest to iterate)
- **Effect**: Slows player movement by configurable factor (default 50%)
- **Visual**: Semi-transparent white overlay with diagonal web pattern
- **Detection**: Rectangle intersection check each frame
- **Spider immunity**: Slowdown only applies to player, not spider

### Player Slowdown Mechanism
- **speedModifier property**: Multiplier applied to acceleration (1.0 = normal, 0.5 = half speed)
- **Why acceleration**: Works naturally with existing physics, affects all movement smoothly
- **Application**: Modify `handleHorizontalMovement()` to scale acceleration by modifier

---

## Implementation Phases

### Phase 1: Player Slowdown Foundation
**Files**: `src/entities/Player.js`
**Effort**: ~30 minutes

**Tasks**:
1. Add `speedModifier` property to constructor (default 1.0)
2. Modify `handleHorizontalMovement()` at line 527:
   ```javascript
   const accel = (this.isGrounded ? this.acceleration : this.airAcceleration) * this.speedModifier;
   ```
3. Add public method `setSpeedModifier(modifier)` with clamping (0.1-1.0)

**Testing**: Manually set modifier in GameScene to verify slowdown works

### Phase 2: Web Zone System
**Effort**: ~2 hours

**New Files**:
- `src/entities/WebZone.js` (~80 lines)
- `src/systems/WebZoneManager.js` (~120 lines)

**WebZone Class**:
- Rectangle bounds (Phaser.Geom.Rectangle)
- Slowdown factor from config
- Procedural graphics: semi-transparent overlay + diagonal web lines
- `checkPlayerInside()` method using rectangle intersection

**WebZoneManager Class**:
- `spawnFromLevel(levelData)` - parse object layers for web_zone objects
- `update(player)` - check all zones, apply strongest slowdown if in any zone
- Remove slowdown when player exits all zones

**GameScene Integration** (`src/scenes/GameScene.js`):
- Import WebZoneManager (line ~13)
- Create instance after PhaseManager (~line 98)
- Call `spawnFromLevel()` after level loads (~line 120)
- Call `update(player)` in main update loop (~line 180)

**Testing**: Add hardcoded web zone, verify slowdown triggers on overlap

### Phase 3: Level Data Integration
**Effort**: ~30 minutes

**Level JSON Format** (add to Entities object layer):
```json
{
  "type": "web_zone",
  "name": "web_zone",
  "x": 80,
  "y": 40,
  "width": 48,
  "height": 24,
  "properties": [
    {"name": "slowdown", "value": 0.4}
  ]
}
```

**Tasks**:
- Add web zone to test level (level-1-1.json or create test level)
- Verify loading and functionality
- Test edge cases (multiple zones, overlapping zones)

**Testing**: Add web zone to test level, verify it loads and functions correctly

### Phase 4: Spider Enemy
**Effort**: ~3 hours

**New File**: `src/entities/Spider.js` (~200 lines)

**Class Structure**:
- Extends `Enemy` base class
- Constructor: size 8x8, speed 30 * SCALE, score 75 points
- Properties: chaseRange, jumpCheckInterval, jumpCooldown, verticalDetectRange

**AI Logic**:
- `update()`: Main state machine
  - Check if player in horizontal range
  - Check if player above and grounded
  - Execute jump if conditions met and off cooldown
  - Otherwise patrol like Skitter
- `checkPlayerAbove()`: Detect if player is on higher platform
- `executeJump()`: Set velocityY to -220 * SCALE, apply horizontal boost toward player
- `updateMovement()`: Horizontal chase or patrol
- Copy Skitter's `checkWallsAndEdges()` and `checkEdgeAhead()` for patrol

**Sprite Design**:
- Procedural texture: dark body (0x2d2d2d), red eyes (0xff0000), visible legs
- Size: 8x8 pixels scaled
- Style matches existing enemies (procedural graphics using Phaser Graphics API)

**EnemyManager Integration** (`src/systems/EnemyManager.js`):
- Import Spider class (line ~4)
- Add to enemyTypes registry (line ~29): `'spider': Spider`

**Testing**: Add spider to level JSON, verify patrol and jumping behavior

### Phase 5: Polish & Tuning
**Effort**: ~1 hour

**Tasks**:
- Test spider jumping to reach player on platforms
- Test spider patrol when player out of range
- Verify spider ignores web zone slowdown
- Tune jump timing, ranges, and cooldowns for good feel
- Test multiple overlapping web zones
- Verify performance with multiple spiders and zones
- Add console logging for debugging (remove before final commit)

---

## Critical Files

### New Files (3)
1. **`src/entities/Spider.js`** - Spider enemy with smart jump AI
2. **`src/entities/WebZone.js`** - Individual web zone representation
3. **`src/systems/WebZoneManager.js`** - Manages all web zones and player overlap

### Modified Files (4)
1. **`src/entities/Player.js`**
   - Add speedModifier property
   - Modify handleHorizontalMovement() (line 527)
   - Add setSpeedModifier() method

2. **`src/systems/EnemyManager.js`**
   - Import Spider (line ~4)
   - Register in enemyTypes (line ~29)

3. **`src/scenes/GameScene.js`**
   - Import WebZoneManager (line ~13)
   - Create webZoneManager instance
   - Call spawnFromLevel() and update()

4. **Level JSON files** (e.g., `assets/levels/level-*.json`)
   - Add spider spawn objects
   - Add web_zone objects with properties

---

## Technical Notes

### Spider Jump Detection Logic
```javascript
checkPlayerAbove() {
  const horizontalDist = Math.abs(player.x - spider.x);
  const verticalDist = spider.y - player.y;

  return (
    horizontalDist < chaseRange &&           // Player nearby horizontally
    verticalDist > 10 * SCALE &&             // Player at least 1 tile above
    verticalDist < verticalDetectRange &&    // Not too far above
    player.isGrounded                        // Only jump to grounded player
  );
}
```

### Web Zone Overlap Detection
- Use `Phaser.Geom.Intersects.RectangleToRectangle(zoneBounds, playerBounds)`
- Check all zones each frame (performant for ~10 zones)
- Apply minimum slowdown factor if overlapping multiple zones
- Set modifier to 1.0 when exiting all zones

### Visual Rendering
- Web zones: static graphics (generate once on creation)
- Spider sprite: procedural texture matching enemy style
- Layer order: webs behind player, spider as physics sprite

### Performance Considerations
- Web zone checks: O(n) per frame where n = number of zones (limit to ~10 per level)
- Spider AI checks: Only active when player in range
- Graphics generation: One-time cost on zone/enemy creation
- No particle systems in first implementation (can add later for polish)

---

## Integration Points

### With Existing Enemy System
- Spider extends `Enemy` base class (same pattern as Skitter, BlinkBat, etc.)
- Uses same combat mechanics (stomp, dash)
- Registered in EnemyManager type registry
- Spawned from Tiled JSON object layers

### With Player Movement
- Player speedModifier property integrates cleanly with acceleration-based movement
- No changes to jump or dash mechanics needed
- Slowdown feels natural due to acceleration scaling

### With Level System
- Web zones loaded via existing LevelLoader object layer parsing
- Compatible with Tiled Map Editor workflow
- No changes to existing level format needed (additive only)

---

## Testing Strategy

### Unit Tests (Optional - Consider for Future)
- Spider jump detection logic
- Web zone overlap detection
- Player speedModifier application

### Manual Testing Checklist
- [ ] Player slowdown works correctly (Phase 1)
- [ ] Web zones load from level data (Phase 3)
- [ ] Web zones apply slowdown on overlap (Phase 2)
- [ ] Web zones remove slowdown on exit (Phase 2)
- [ ] Multiple overlapping zones use strongest slowdown (Phase 2)
- [ ] Spider patrols horizontally (Phase 4)
- [ ] Spider detects player above (Phase 4)
- [ ] Spider jumps toward player on higher platform (Phase 4)
- [ ] Spider respects jump cooldown (Phase 4)
- [ ] Spider can be stomped (Phase 4)
- [ ] Spider can be dashed (Phase 4)
- [ ] Spider ignores web zone slowdown (Phase 5)
- [ ] Performance is stable with 5+ spiders and 5+ web zones (Phase 5)

---

## Future Enhancements (Not in First Implementation)

### Visual Polish
- Web zone particle effects (dust when entering, wispy strands)
- Animated spider legs (procedural animation)
- Web zone "shimmer" effect (subtle animation)

### Gameplay Extensions
- Spider web shooting projectiles (creates temporary web zones)
- Ceiling-hanging spiders (ambush behavior)
- Web zone breakage (temporary zones that disappear after time)
- Different web zone types (sticky = can't jump, slippery = reduced friction)

### Audio
- Spider jump sound effect
- Web zone rustle/ambient sound
- Player "stuck" sound when entering web

### Advanced AI
- Spider pathfinding (A* to navigate platforms)
- Spider web retreat (creates web zone and retreats when damaged)
- Spider group behavior (multiple spiders coordinate)

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Phase 1: Player Slowdown | 30 min | 30 min |
| Phase 2: Web Zone System | 2 hours | 2h 30m |
| Phase 3: Level Integration | 30 min | 3h |
| Phase 4: Spider Enemy | 3 hours | 6h |
| Phase 5: Polish & Tuning | 1 hour | 7h |

**Total Estimated Effort**: ~7 hours (1 evening or spread across 2-3 sessions)

---

## Definition of Done

- [ ] Player speedModifier system implemented and tested
- [ ] WebZone and WebZoneManager classes created
- [ ] Web zones load from level JSON and render correctly
- [ ] Web zones apply slowdown to player only
- [ ] Spider enemy class created and registered
- [ ] Spider AI patrols and jumps to follow player
- [ ] Spider can be defeated via stomp/dash
- [ ] At least one level includes spider + web zones
- [ ] All manual tests pass
- [ ] Code follows existing patterns and style
- [ ] No performance regressions (60fps maintained)
- [ ] No console errors or warnings

---

**Ready for Implementation**: Yes
**Blockers**: None
**Dependencies**: None (all systems in place)
