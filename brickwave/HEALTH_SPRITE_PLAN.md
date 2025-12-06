# Implementation Plan: Player Health System & Animated Sprite

## Overview

Add a difficulty-based health system and animated player sprite to BRICKWAVE.

**User Requirements:**
- Difficulty levels: Easy (5 hearts), Intermediate (4 hearts), Hard (3 hearts)
- Game over screen with Retry/Quit options
- 1.5 second invincibility frames after damage
- Animated sprite with run/jump/idle frames (16×16 pixels)

## Implementation Phases

### Phase 1: Difficulty Settings (Foundation)

Add difficulty setting to Settings menu and SaveManager.

**Files to modify:**
- `brickwave/src/systems/SaveManager.js`
- `brickwave/src/scenes/SettingsScene.js`

**Changes:**
1. **SaveManager.js** (lines 82-89):
   - Add `difficulty: 1` to default settings (0=Easy, 1=Intermediate, 2=Hard)
   - Add `getDifficulty()` helper method

2. **SettingsScene.js** (lines 19-35):
   - Add difficulty toggle to settingsDef array
   - Format: `{ key: 'difficulty', label: 'Difficulty', type: 'toggle', options: ['Easy (5♥)', 'Intermediate (4♥)', 'Hard (3♥)'] }`
   - Position: After separator2, before phaseTimingAssist

**Test:** Settings menu shows difficulty, persists to localStorage

---

### Phase 2: Player Health System

Add health tracking, damage handling, and invincibility frames to Player class.

**Files to modify:**
- `brickwave/src/entities/Player.js`

**Changes:**

1. **Add health properties** (after line 79):
   ```javascript
   // Health system
   this.maxHealth = 4;
   this.currentHealth = this.maxHealth;
   this.isInvincible = false;
   this.invincibilityTimer = 0;
   this.invincibilityDuration = 1500; // 1.5 seconds
   this.isDead = false;
   ```

2. **Add methods:**
   - `setMaxHealth(maxHealth)` - Sets max health from difficulty
   - `takeDamage()` - Handles damage, checks invincibility, emits events
   - `startInvincibility()` - Starts iframe timer, flash animation
   - `endInvincibility()` - Ends iframes, stops flash
   - `die()` - Death animation, emit playerDied event

3. **Modify update()** (line 146):
   - Add invincibility timer logic at top
   - Skip movement if isDead

**Key logic:**
- `takeDamage()` checks `isInvincible` flag, decrements health, emits `healthChanged` event
- If health reaches 0, calls `die()` which emits `playerDied` event
- Invincibility uses accumulator pattern: `invincibilityTimer += delta`

**Test:** Player can take damage, invincibility prevents rapid hits

---

### Phase 3: Animated Player Sprite

Replace cyan rectangle with 16×16 animated sprite.

**Files to modify:**
- `brickwave/src/entities/Player.js` (lines 21-32)

**Changes:**

1. **Generate sprite textures** (replace simple rectangle):
   - Size: 16×16 pixels (scaled)
   - Design: Cat character wearing light armor (chest plate)
   - Colors: Cyan fur (#00ffff), silver armor (#c0c0c0), dark cyan shadows (#006666), white highlights (#ffffff)
   - Frames: idle (1), run (4), jump (1), fall (1)
   - Features: Pointed ears, visible tail, feline proportions, light armor plating
   - Pattern: Use Graphics API like BlinkBat/SentryOrb (layer by layer)

2. **Create animations** (after setupInput()):
   ```javascript
   this.scene.anims.create({
     key: 'player_idle',
     frames: [{ key: 'player_idle' }],
     frameRate: 10
   });

   this.scene.anims.create({
     key: 'player_run',
     frames: ['player_run_0', 'player_run_1', 'player_run_2', 'player_run_3'],
     frameRate: 12,
     repeat: -1
   });
   // ... jump, fall
   ```

3. **Update animation state in update()** (after movement logic):
   ```javascript
   if (!this.isDead && !this.isDashing) {
     if (!this.isGrounded) {
       if (this.sprite.body.velocity.y < 0) {
         this.sprite.play('player_jump', true);
       } else {
         this.sprite.play('player_fall', true);
       }
     } else if (Math.abs(this.sprite.body.velocity.x) > 5) {
       this.sprite.play('player_run', true);
     } else {
       this.sprite.play('player_idle', true);
     }
   }
   ```

4. **Update physics body** (line 36):
   - Change to `16 * SCALE` to match new sprite size

**Sprite design:**
- Cat character in light armor
- Cat features: pointed ears, tail, feline proportions
- Armor: Light chest plate/breastplate (silver/gray)
- Idle: sitting/standing on hind legs, tail curled
- Run: 4-frame walk cycle (quadruped motion, tail swishing)
- Jump: pouncing pose, tail extended
- Fall: splayed limbs, tail up

**Color palette:**
- Cat fur: Cyan (#00ffff) for magical/glowing effect
- Armor: Light gray/silver (#c0c0c0) with white highlights (#ffffff)
- Details: Dark cyan (#006666) for fur shadows, darker gray (#808080) for armor shadows
- Eyes: Bright cyan or white

**Test:** Sprite animates correctly for idle/run/jump/fall

---

### Phase 4: HUD Health Display

Add heart display to game HUD.

**Files to modify:**
- `brickwave/src/systems/GameHUD.js`

**Changes:**

1. **Add health text element** in `createHUDElements()` (after line 72):
   ```javascript
   this.healthText = this.scene.add.text(
     padding,
     padding + lineHeight * 3,  // Line 4, below COINS
     'HEALTH ♥♥♥♥',
     this.textStyle
   );
   this.container.add(this.healthText);
   ```

2. **Add event listener** in `setupEventListeners()`:
   ```javascript
   this.scene.events.on('healthChanged', (current, max) => {
     this.updateHealth(current, max);
     this.flashHealth();
   });
   ```

3. **Add methods:**
   - `updateHealth(current, max)` - Updates heart display (♥ filled, ♡ empty)
   - `flashHealth()` - Red flash animation (like flashEchoCharges)
   - `setInitialHealth(current, max)` - Sets health on level start

4. **Update destroy()** (line 342):
   - Add `this.scene.events.off('healthChanged')`

**Display format:** `"HEALTH ♥♥♥♡♡"` (3 filled, 2 empty = 3/5 health)

**Test:** Hearts update when damage taken, flash animation plays

---

### Phase 5: GameScene Integration

Wire health system to difficulty and handle player death.

**Files to modify:**
- `brickwave/src/scenes/GameScene.js`

**Changes:**

1. **Set player health from difficulty** (after line 107):
   ```javascript
   const difficulty = saveManager.getSettings()?.difficulty || 1;
   const healthMap = [5, 4, 3]; // Easy, Intermediate, Hard
   this.player.setMaxHealth(healthMap[difficulty]);
   ```

2. **Initialize HUD health** (after line 152):
   ```javascript
   this.hud.setInitialHealth(this.player.currentHealth, this.player.maxHealth);
   ```

3. **Replace onPlayerDamaged()** (line 1257):
   ```javascript
   onPlayerDamaged() {
     this.player.takeDamage();
     // Player.takeDamage() handles sound, flash, events
   }
   ```

4. **Add death handler** in `create()`:
   ```javascript
   this.events.once('playerDied', () => {
     this.handlePlayerDeath();
   });
   ```

5. **Add handlePlayerDeath() method:**
   - Stop timer, pause physics
   - Delay 1 second, then transition to GameOverScene
   - Pass level info and stats to GameOverScene

**Test:** Taking damage 4 times (Intermediate) triggers death transition

---

### Phase 6: GameOverScene

Create death screen with retry/quit menu.

**Files to create:**
- `brickwave/src/scenes/GameOverScene.js`

**Files to modify:**
- `brickwave/src/config.js` (add to scene list)

**GameOverScene structure:**
- Background: Semi-transparent black overlay (0x000000, 0.9 alpha)
- Title: "GAME OVER" (red #ff6666, large font)
- Stats display (centered):
  - Level: World X-Y
  - Time: MM:SS
  - Score: XXX
- Menu: ['RETRY', 'LEVEL SELECT', 'QUIT TO TITLE']
- Navigation: UP/DOWN, ENTER/SPACE, ESC (retry)

**Pattern:** Follow SettingsScene structure for menu/input handling

**Actions:**
- RETRY → `scene.restart()` with same level data
- LEVEL SELECT → `scene.start('LevelSelectScene')`
- QUIT TO TITLE → `scene.start('TitleScene')`

**Test:** Death shows GameOverScene, all menu options work

---

### Phase 7: Polish & Edge Cases

Add final touches and handle edge cases.

**Changes:**

1. **Prevent damage during level completion** (Player.takeDamage):
   - Check `this.scene.levelComplete`, return false if complete

2. **Add death sound** (AudioManager):
   - Add `playPlayerDeath()` method (descending tone)
   - Call from Player.die()

3. **Add death particles** (ParticleEffects):
   - Add `createPlayerDeath(x, y)` method (cyan particles)
   - Call from Player.die()

4. **Invincibility visual polish**:
   - Current flash animation is adequate
   - Optional: Add cyan outline glow

5. **Test all difficulty modes:**
   - Easy: 5 hearts → 5 hits to die
   - Intermediate: 4 hearts → 4 hits to die
   - Hard: 3 hearts → 3 hits to die

---

## Critical Files Reference

**Files to modify:**
1. `brickwave/src/systems/SaveManager.js` - Add difficulty setting
2. `brickwave/src/scenes/SettingsScene.js` - Add difficulty UI
3. `brickwave/src/entities/Player.js` - Health system, sprite, animations
4. `brickwave/src/systems/GameHUD.js` - Health display
5. `brickwave/src/scenes/GameScene.js` - Integration, death handling
6. `brickwave/src/config.js` - Add GameOverScene to scene list

**Files to create:**
1. `brickwave/src/scenes/GameOverScene.js` - Death screen

---

## Data Flow Summary

```
Settings → difficulty (0/1/2) → localStorage
  ↓
GameScene reads difficulty → healthMap[difficulty] → Player.maxHealth
  ↓
Player.currentHealth initialized
  ↓
Enemy collision → Player.takeDamage()
  ↓
If not invincible:
  - Decrement health
  - Emit 'healthChanged' → GameHUD updates hearts
  - Start invincibility (1.5s)
  ↓
If health = 0:
  - Emit 'playerDied' → GameScene.handlePlayerDeath()
  - Transition to GameOverScene
```

---

## Testing Checklist

- [ ] Difficulty setting saves and persists
- [ ] Health display shows correct max hearts per difficulty
- [ ] Taking damage decrements hearts
- [ ] Invincibility prevents rapid consecutive hits (1.5s)
- [ ] Flash animation plays on damage
- [ ] Death animation plays at 0 health
- [ ] GameOverScene shows correct stats
- [ ] Retry restores full health
- [ ] Sprite animations play correctly (idle/run/jump/fall)
- [ ] Sprite mirrors when changing direction
- [ ] Works at both SCALE=1 and SCALE=2
- [ ] 60fps maintained with all systems active

---

## Implementation Order

**Recommended sequence:**
1. Phase 1 (Settings) - 30 min
2. Phase 2 (Health System) - 1 hour
3. Phase 4 (HUD Display) - 30 min
4. Phase 5 (Integration) - 30 min
5. Phase 6 (GameOverScene) - 45 min
6. Phase 3 (Sprite) - 1 hour (can do last as visual upgrade)
7. Phase 7 (Polish) - 30 min

**Total estimate:** ~4.5 hours

**Minimum viable:** Phases 1, 2, 4, 5, 6 = Functional health/death system (~3 hours)