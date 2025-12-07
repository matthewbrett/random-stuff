# Difficulty Enhancement Plan for BRICKWAVE

## Problem Statement
Player finds intermediate difficulty too easy when playing full progression (levels 0-0 through 1-9). Issues identified:
- Enemies are too easy to avoid
- Not enough platforming challenge
- Too much health / too forgiving
- Phase timing makes little difference to gameplay (except level 1-3)

## Current Difficulty System Analysis

**What difficulty currently affects:**
- Player health only (Easy: 5♥, Intermediate: 4♥, Hard: 3♥)

**What difficulty does NOT affect:**
- Enemy count, speed, or behavior
- Level layout or platforming requirements
- Exit conditions (just reach portal, no other requirements)
- Phase brick timing (except assist mode which is separate)

**Note:** Health already persists between levels (resets only on death/restart)

## Difficulty Enhancement Options

### Category A: Combat/Enemy Difficulty 🎯

#### A1. **Difficulty-Scaled Enemy Speed** (QUICK WIN)
**Implementation:**
- Multiply enemy velocities by difficulty factor (Easy: 0.8x, Medium: 1.0x, Hard: 1.2x)
- Affects: Skitter patrol speed, BlinkBat flight speed, SentryOrb patrol speed
- **Files:** `src/entities/Skitter.js`, `src/entities/BlinkBat.js`, `src/entities/SentryOrb.js`
- **Effort:** Low (1-2 hours)
- **Impact:** Medium - Makes combat more threatening without level redesign

#### A2. **Difficulty-Scaled Enemy Count** (MODERATE EFFORT)
**Implementation:**
- Add difficulty-based spawning logic in LevelLoader
- Easy: Skip some enemies, Medium: As designed, Hard: Add extra enemies at key choke points
- Requires metadata in level files or procedural placement rules
- **Files:** `src/systems/LevelLoader.js`, `src/systems/EnemyManager.js`
- **Effort:** Medium (3-5 hours)
- **Impact:** High - Significantly changes combat challenge

#### A3. **Add Aggressive Chase Enemies** (NEW ENEMY TYPE)
**Implementation:**
- Create new enemy type that actively pursues player when in range
- Only spawns on Medium/Hard difficulties
- Forces player to engage with platforming rather than running straight through
- **Files:** New `src/entities/Chaser.js` (or similar), update `EnemyManager.js`
- **Effort:** High (5-8 hours including design and testing)
- **Impact:** High - Fundamentally changes how players approach levels

### Category B: Exit Requirements 🚪

#### B1. **Mandatory Key Shard Collection** (RECOMMENDED)
**Implementation:**
- Require collecting ALL 3 key shards before exit portal activates
- Or scale by difficulty: Easy (0 shards), Medium (2 shards), Hard (3 shards)
- Portal visually locked until requirement met
- **Files:** `src/entities/LevelExit.js`, `src/scenes/GameScene.js`, `src/systems/ScoreManager.js`
- **Effort:** Low (1-2 hours)
- **Impact:** HIGH - Forces exploration and engagement with level design
- **Synergy:** Works great with enhanced enemy difficulty (can't just run past everything)

#### B2. **Minimum Coin Collection Threshold**
**Implementation:**
- Require collecting X% of coins to unlock exit (e.g., Easy: 30%, Medium: 50%, Hard: 70%)
- Shows progress in HUD (e.g., "Coins: 15/30 required")
- **Files:** `src/entities/LevelExit.js`, `src/systems/ScoreManager.js`, `src/systems/GameHUD.js`
- **Effort:** Low-Medium (2-3 hours)
- **Impact:** Medium - Encourages thorough level exploration

#### B3. **Defeat All Enemies Requirement** (COMBAT-FOCUSED)
**Implementation:**
- Exit locked until all enemies in level are defeated
- Shows count in HUD (e.g., "Enemies: 5 remaining")
- Best for Hard mode only
- **Files:** `src/entities/LevelExit.js`, `src/systems/EnemyManager.js`, `src/systems/GameHUD.js`
- **Effort:** Low-Medium (2-3 hours)
- **Impact:** High - Completely changes from avoidance to combat focus

### Category C: Platforming Challenge 🏃

#### C1. **Level Design Pass - Add Gaps/Jumps**
**Implementation:**
- Edit existing level Tiled maps to add more gaps requiring jumps
- Remove some flat ground sections
- Add more one-way platforms and vertical sections
- **Files:** `assets/levels/*.json` (Tiled map editing)
- **Effort:** Medium-High (4-8 hours depending on how many levels)
- **Impact:** High - Direct improvement to platforming challenge
- **Note:** This is content work, not code

#### C2. **Phase-Gated Progression Requirement**
**Implementation:**
- Add more sections where player MUST use phase timing to progress (like 1-3)
- Create mandatory "phase lock" areas where wrong timing = fall/death
- Add visual indicators for phase-critical sections
- **Files:** Level design in Tiled (content work)
- **Effort:** Medium-High (3-6 hours per level)
- **Impact:** High - Makes phase mechanic more central to gameplay

#### C3. **Tighter Phase Timing on Higher Difficulties**
**Implementation:**
- Scale phase cycle duration by difficulty (Easy: 3s/3s, Medium: 2s/2s, Hard: 1.5s/1.5s)
- Makes reaction windows tighter, requires better timing
- **Files:** `src/systems/PhaseManager.js`
- **Effort:** Low (30 min - 1 hour)
- **Impact:** Medium - Makes phase mechanic more demanding without content changes
- **Caveat:** May feel punishing if levels aren't designed around faster cycles

### Category D: Health/Forgiveness Balance 💔

#### D1. **Add Health Powerup Collectible** (COMPLEMENTS PERSISTENCE)
**Implementation:**
- Create new collectible that restores 1 heart
- Spawn rarely (1-2 per world, in hard-to-reach areas)
- Rewards exploration and risk-taking
- **Files:** New `src/entities/HealthPowerup.js`, update `LevelLoader.js`
- **Effort:** Low-Medium (2-3 hours)
- **Impact:** Medium - Adds strategic resource management
- **Note:** Since health already persists, this becomes a valuable limited resource

#### D2. **Further Reduce Hard Mode Health**
**Implementation:**
- Change Hard difficulty from 3♥ to 2♥ or even 1♥ (permadeath feel)
- Makes every hit extremely punishing
- **Files:** `src/scenes/SettingsScene.js` (line 28)
- **Effort:** Trivial (5 minutes)
- **Impact:** High for Hard mode - Creates a true "expert" difficulty tier

#### D3. **Lives System with Limited Continues**
**Implementation:**
- Add "lives" counter separate from health (e.g., 3 lives per playthrough)
- Lose a life on death, game over when lives = 0
- Scale by difficulty (Easy: 5 lives, Medium: 3 lives, Hard: 1 life)
- **Files:** `src/systems/SaveManager.js`, `src/scenes/GameScene.js`, `src/systems/GameHUD.js`
- **Effort:** Medium (3-5 hours)
- **Impact:** High - Adds stakes and tension to entire playthrough

### Category E: Hybrid/Multi-Faceted Options 🔄

#### E1. **"Progressive Difficulty" Package**
**Combine multiple quick wins:**
1. Mandatory key shard collection (B1) - 2 hours
2. Enemy speed scaling (A1) - 1 hour
3. Tighter phase timing on Hard (C3) - 1 hour
4. Reduce Hard mode health to 2♥ (D2) - 5 min

**Total Effort:** ~4-5 hours
**Impact:** Very High - Multi-faceted difficulty increase addressing all pain points
**Pros:** No level redesign needed, immediate improvement
**Cons:** Doesn't fix "flat ground running" without content changes

#### E2. **"Content-First" Package**
**Focus on level design improvements:**
1. Level design pass adding gaps/jumps (C1) - 6 hours
2. Phase-gated progression sections (C2) - 4 hours
3. Mandatory key shard collection (B1) - 2 hours

**Total Effort:** ~12 hours
**Impact:** Very High - Fundamental improvement to level design
**Pros:** Most satisfying long-term solution, better game overall
**Cons:** Requires content work in Tiled, more time intensive

#### E3. **"Enemy Threat" Package**
**Make combat more engaging:**
1. Enemy speed scaling (A1) - 1 hour
2. Enemy count scaling (A2) - 4 hours
3. New chase enemy type (A3) - 7 hours
4. Defeat all enemies to exit (B3) on Hard mode - 2 hours

**Total Effort:** ~14 hours
**Impact:** High - Transforms combat from avoidance to engagement
**Pros:** Makes enemies feel like real threats
**Cons:** Doesn't address "too much flat ground" directly

## Critical Files Reference

### Core Systems:
- `src/scenes/SettingsScene.js:28` - Difficulty settings (Easy/Medium/Hard health values)
- `src/systems/SaveManager.js:366` - Get max health for difficulty
- `src/systems/PhaseManager.js:49` - Phase timing management
- `src/entities/Player.js:709` - takeDamage() method, health system

### Exit Conditions:
- `src/entities/LevelExit.js:149` - trigger() method (where completion happens)
- `src/entities/LevelExit.js:237` - overlaps() collision detection
- `src/systems/ScoreManager.js` - Tracks coins, key shards, collectibles

### Enemy Spawning:
- `src/systems/LevelLoader.js:126` - loadObjects() spawns enemies from Tiled data
- `src/systems/EnemyManager.js:27` - spawnEnemy() creates enemy instances
- `src/entities/Skitter.js:60` - Enemy movement logic
- `src/entities/BlinkBat.js:71` - Phase-synced enemy
- `src/entities/SentryOrb.js:82` - Patrol patterns

### Level Design:
- `assets/levels/*.json` - All level Tiled map data

## Recommended Implementation Roadmap

### 🎯 Phase 1: Core Difficulty Foundations (~6-8 hours)
**Goal:** Establish difficulty scaling framework with immediate impact improvements

**What to implement:**

1. **B1: Scaled Key Shard Requirements** (~2 hours)
   - Easy: 0 shards required to exit
   - Medium: 2 shards required to exit
   - Hard: 3 shards required to exit
   - Files: `src/entities/LevelExit.js`, `src/systems/ScoreManager.js`, `src/systems/GameHUD.js`
   - Impact: Forces exploration and engagement on Medium/Hard

2. **A1: Enemy Speed Scaling** (~1-2 hours)
   - Easy: 0.8x enemy speed
   - Medium: 1.0x enemy speed (current)
   - Hard: 1.2x enemy speed
   - Files: `src/entities/Skitter.js`, `src/entities/BlinkBat.js`, `src/entities/SentryOrb.js`
   - Impact: Makes combat more threatening on Hard mode

3. **A2: Enemy Count Scaling - Foundation** (~3-4 hours)
   - Add difficulty-aware spawning logic to LevelLoader
   - Easy: Skip enemies marked as "medium_hard_only" in level data
   - Medium: Spawn all enemies as designed
   - Hard: Spawn enemies + any marked as "hard_only"
   - Files: `src/systems/LevelLoader.js`, `src/systems/EnemyManager.js`
   - Impact: Adjusts combat density per difficulty
   - Note: Requires adding metadata to Tiled maps (tags like "medium_hard_only")

**Testing checkpoint:** Play through all 10 levels on each difficulty, evaluate feel

**Expected outcomes:**
- Hard mode feels significantly more challenging
- Medium mode requires some collectible hunting (2 shards)
- Easy mode remains accessible for new players

---

### 🔧 Phase 2: Fine-Tuning & Balance (~3-5 hours)
**Goal:** Adjust based on Phase 1 testing, add quality-of-life features

**What to implement:**

4. **D2: Adjust Hard Mode Health** (~5 minutes)
   - Reduce Hard mode from 3♥ to 2♥
   - Only if Phase 1 testing shows Hard still too forgiving
   - File: `src/scenes/SettingsScene.js:28`

5. **D1: Health Powerup Collectible** (~2-3 hours)
   - Add rare health restore item (appears in hard-to-reach spots)
   - Valuable since health persists between levels
   - Adds strategic risk/reward for exploration
   - Files: New `src/entities/HealthPowerup.js`, `src/systems/LevelLoader.js`

6. **Balance Tuning** (~1-2 hours)
   - Adjust enemy speed multipliers if needed (e.g., Hard: 1.3x instead of 1.2x)
   - Tweak key shard requirements if too punishing
   - Test edge cases (what if player dies with 2/3 shards?)

**Testing checkpoint:** Full playthrough on each difficulty with fresh eyes

**Expected outcomes:**
- All three difficulty levels feel distinct and appropriately challenging
- Health powerups create meaningful exploration incentives
- No difficulty spikes or dead-ends

---

### 🏗️ Phase 3: Content Enhancement (~8-12 hours, OPTIONAL)
**Goal:** Address "too easy to run through" via level design improvements

**What to implement:**

7. **C1: Level Design Pass - Add Platforming Challenge** (~6-8 hours)
   - Edit Tiled maps to add more gaps requiring jumps
   - Remove excessive flat running sections
   - Add vertical platforming challenges
   - Focus on levels identified as "too easy" in testing
   - Files: `assets/levels/*.json` (Tiled editing, not code)

8. **C2: Phase-Gated Progression** (~2-4 hours)
   - Add mandatory phase timing sections (like 1-3 has)
   - Create "phase locks" where wrong timing = fall/death
   - Make phase mechanic feel more central to gameplay
   - Files: `assets/levels/*.json` (content work)

9. **A2 Content Support: Add "Hard Only" Enemies** (~2-3 hours)
   - Go through Tiled maps and add enemies tagged "hard_only"
   - Place in strategic choke points or alternative paths
   - Ensures A2 system has enemies to spawn on Hard mode
   - Files: `assets/levels/*.json` (Tiled editing)

**Testing checkpoint:** Full difficulty progression playthrough

**Expected outcomes:**
- Platforming feels more engaging and skillful
- Phase mechanic is integral to progression (not just bonus challenge)
- Hard mode has noticeably more enemies in key locations

---

### 🚀 Phase 4: Advanced Enhancements (~10-15 hours, FUTURE CONSIDERATION)
**Goal:** Major new features if Phases 1-3 still don't provide enough challenge

**What to consider:**

10. **A3: Chase Enemy Type** (~5-8 hours)
    - New enemy AI that pursues player when in range
    - Forces engagement instead of running past
    - Spawns only on Medium/Hard

11. **C3: Difficulty-Scaled Phase Timing** (~1 hour code, ~4-6 hours level redesign)
    - Easy: 3s solid / 3s ghost
    - Medium: 2s solid / 2s ghost (current)
    - Hard: 1.5s solid / 1.5s ghost
    - WARNING: Requires redesigning levels around faster cycles

12. **B3: Defeat All Enemies to Exit (Hard Mode Only)** (~2-3 hours)
    - Exit locked until all enemies defeated
    - Changes Hard mode to combat-focused challenge

13. **D3: Lives System** (~3-5 hours)
    - Limited continues per playthrough
    - Easy: 5 lives, Medium: 3 lives, Hard: 1 life
    - Adds stakes to entire progression

**Testing checkpoint:** Extended playtesting with target audience

**Expected outcomes:**
- Expert-level challenge available for hardcore players
- Clear difficulty progression from Easy → Medium → Hard → Expert
- Replayability through different difficulty approaches

---

## Priority Summary

### Must-Do (Phases 1-2):
- ✅ Scaled key shard requirements
- ✅ Enemy speed scaling
- ✅ Enemy count scaling
- ⚡ Health powerup
- ⚡ Hard mode health reduction (if needed)

**Estimated Total: 9-13 hours**

### Should-Do If Time Allows (Phase 3):
- 🎨 Level design pass for more platforming
- 🎨 Phase-gated progression sections
- 🎨 Add "hard only" enemies to maps

**Estimated Total: +8-12 hours**

### Nice-to-Have Future (Phase 4):
- 💡 Chase enemy type
- 💡 Faster phase timing on Hard
- 💡 Combat-focused Hard mode (defeat all enemies)
- 💡 Lives system

**Estimated Total: +10-15 hours**

---

## Decision Points

After each phase, evaluate:

1. **After Phase 1:** Does Hard mode feel appropriately challenging now? Does Medium require meaningful engagement?
2. **After Phase 2:** Are health powerups adding good strategic depth? Is balance feeling right?
3. **After Phase 3:** Do levels feel more engaging to play through? Is phase mechanic central enough?
4. **After Phase 4:** Is there a clear progression curve across difficulties? Is replay value high?

Stop when difficulty feels right - don't over-engineer!

---

**Last Updated:** 2025-12-07
**Status:** Planning Document - Not Yet Implemented
