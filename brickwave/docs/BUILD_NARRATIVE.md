# Building BRICKWAVE: A 3-Day Game Development Journey with AI

*How I built a complete browser platformer in 3 days using AI-assisted development*

---

## The Challenge

I wanted to build BRICKWAVE—a browser-based pixel platformer inspired by 80s underground runners with a unique "phase brick" mechanic where blocks toggle between solid and ghost states on a rhythmic cycle. This isn't a trivial project: it requires smooth 60fps gameplay, mobile touch controls, accessibility features, save systems, multiple levels, enemies, and that elusive "feel-first" control response that makes platformers satisfying.

Traditional estimates for this scope? **2-4 weeks of evening development.**

Actual time with AI-assisted development? **3 days.**

---

## The Numbers

| Metric | Value |
|--------|-------|
| Development time | 3 days (Dec 5-7, 2025) |
| Source files | 32 JavaScript modules |
| Lines of code | ~11,200 |
| Development phases | 10 (all completed) |
| Playable levels | 5 (intro + 3 main + 1 bonus) |
| Enemy types | 4 |
| Original estimate | 2-4 weeks |
| Time savings | ~85% |

---

## The Approach: Human Direction, AI Implementation

The key insight wasn't "let AI write everything"—it was establishing a clear division of labor that played to each party's strengths.

### What I Did (Human)

1. **Wrote the creative vision** — The game spec defining what BRICKWAVE should *feel* like
2. **Created the development plan** — A 10-phase roadmap breaking the project into logical chunks
3. **Established quality standards** — "Feel-first controls" as non-negotiable, 60fps as mandatory
4. **Reviewed and tested** — Every PR was reviewed, every feature was playtested
5. **Made judgment calls** — When things needed fixing or refinement

### What Claude Did (AI)

1. **Implemented each development phase** — Often in a single session
2. **Wrote complete, working systems** — Not scaffolding, but production code
3. **Made sensible technical decisions** — Within the constraints I defined
4. **Documented as it went** — Updating the development plan with implementation notes

---

## The Timeline: Three Intense Days

### Day 1: Foundation to Combat (Dec 5)

**Evening session:**
```
20:10 - Created Game spec.md (the creative vision)
20:18 - First commit (overview)
20:31 - Development plan and project structure complete
20:39 - CLAUDE.md context file for AI assistant
20:49 - Phase 2: Core player movement DONE
21:16 - Phase 3: Level system & tiles DONE
21:32 - Phase 4: Phase bricks mechanic DONE
21:40 - Text rendering improvements
```

In a single evening, I went from an empty repo to a working platformer with:
- Smooth player controls (jump, dash, coyote time, jump buffer)
- Tiled map integration
- The signature phase brick mechanic
- Multiple phase groups for complex puzzles

### Day 2: Content to Polish (Dec 6)

```
08:07 - Bug fixes for phase bricks
08:55 - Phase 6: Enemies & Combat complete
12:30 - Resolution system for different screens
12:53 - Phase 7: Three playable levels complete
18:23 - Phase 8: UI & Menus complete
22:12 - Phase 9: Save system, audio, particle effects
22:51 - Health system and animated sprites added
```

Day 2 transformed the tech demo into a game:
- 3 enemy types (Skitter, BlinkBat, SentryOrb)
- Complete level content (1-1, 1-2, 1-3)
- Title screen, level select, settings menu
- LocalStorage persistence with export/import
- Procedural WebAudio SFX (no audio files needed!)
- Particle effects for all player actions

### Day 3: Accessibility and Deployment (Dec 7)

```
09:17 - Phase 10: Accessibility & Final MVP complete
14:40 - GitHub Actions CI/CD deployment
15:09 - Intro level support
17:43 - Extended content (World 1 expansion)
21:55 - Difficulty scaling system
```

The final day focused on making the game accessible and shareable:
- Mobile touch controls
- Control remapping
- Colorblind mode with pattern overlays
- Assist modes (slower phase timing, invincibility)
- Automated deployment pipeline
- Difficulty scaling system

**MVP: COMPLETE**

---

## The Secret: Context Engineering

The magic wasn't just "use AI to write code." It was about **context engineering**—giving the AI exactly the information it needed to make good decisions.

### CLAUDE.md: The AI's Instruction Manual

I created a comprehensive context file that included:

```markdown
# Critical Success Factors
1. **Feel-first controls** - If movement doesn't feel good, nothing else matters
2. **Phase timing clarity** - Players must understand the phase cycle instantly
3. **60fps performance** - Non-negotiable for platformer precision
4. **Instant restart** - Speedrunners need quick retry loops
```

This file told Claude not just *what* to build, but *what mattered*. It prevented the AI from making technically correct but creatively wrong decisions.

### The Development Plan: Phased Execution

Rather than asking for the whole game at once, I structured development into 10 clear phases:

1. Project Setup & Core Infrastructure
2. Core Player Movement
3. Level System & Tiles
4. Phase Bricks Mechanic
5. Collectibles & Scoring
6. Enemies & Combat
7. Level Content
8. UI & Menus
9. Persistence & Polish
10. Accessibility & Final MVP

Each phase had:
- Clear goals
- Specific tasks
- Defined deliverables
- (Original) time estimates

Claude could focus on one chunk at a time, and I could review incrementally.

---

## What Made This Work

### 1. Specification First

I spent real time writing the game spec *before* touching any code. This document became the source of truth that kept the AI aligned with my vision.

### 2. Technical Framework Choices

Choosing Phaser 3 + Vite wasn't random—these are well-documented, AI-understood technologies. Claude had been trained on countless Phaser examples.

### 3. Incremental Verification

After each phase, I played the game. I didn't batch up multiple phases hoping they'd all work together. This caught issues early:
- Text rendering needed fixing (Phase 4→5 boundary)
- Phase brick collisions needed adjustment
- Spawn locations needed tweaking

### 4. I Stayed in the Loop

Claude authored 15 commits of implementation. I authored 34 commits of specs, merges, fixes, and refinements. This wasn't "AI does everything"—it was partnership.

### 5. Clear Quality Standards

The CLAUDE.md file established non-negotiables:
- 60fps performance
- Feel-first controls
- Instant restart capability
- Mobile support

The AI optimized for these constraints rather than making arbitrary decisions.

---

## The Technical Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Engine | Phaser 3 | Well-documented, AI-familiar, battle-tested |
| Build | Vite | Fast hot reload for iteration |
| Levels | Tiled → JSON | Industry standard, good tooling |
| Audio | Procedural WebAudio | No asset files needed |
| Persistence | localStorage | Simple, works everywhere |
| Resolution | 320×180 internal | Classic pixel art scaling |

---

## What Got Built

### Entities (12 classes)
- Player with full movement system (23KB of logic)
- 4 enemy types (Skitter, BlinkBat, SentryOrb, BrickMimic)
- Phase bricks with visual feedback
- Coins, Key Shards, Power-ups
- Level exit portals

### Systems (12 managers)
- AudioManager (procedural SFX generation)
- EnemyManager (spawning and collision)
- GameHUD (score, coins, time, charges)
- InputManager (keyboard + touch + remapping)
- LevelLoader (Tiled JSON parsing)
- ParticleEffects (dust, sparkles, trails)
- PhaseManager (timing and groups)
- PhaseIndicator (HUD element)
- SaveManager (persistence + export/import)
- ScoreManager (points, combos, bonuses)
- TransitionManager (screen effects)

### Scenes (7 screens)
- Boot (asset loading)
- Title (animated menu)
- Level Select (progress display)
- Settings (full options menu)
- Game (main gameplay + pause)
- Game Over (death handling)
- Results (integrated into Game)

---

## Lessons for Other Engineers

### 1. Front-load Your Thinking

The time I spent on the game spec and development plan wasn't overhead—it was leverage. Every minute of specification saved hours of back-and-forth later.

### 2. Give AI Context, Not Just Commands

"Build a platformer" produces generic results. "Build a platformer where feel-first controls are critical, 60fps is non-negotiable, and the signature mechanic is phase-shifting blocks" produces BRICKWAVE.

### 3. Choose AI-Friendly Technologies

Well-documented frameworks with lots of training data work better. Phaser 3 has extensive documentation and thousands of examples Claude understood.

### 4. Keep Phases Small

Each phase was completable in a single session. This made review manageable and kept quality high.

### 5. Stay Engaged

I wasn't a passive recipient. I tested every feature, caught issues early, made judgment calls about feel and polish. AI accelerated my work; it didn't replace my involvement.

### 6. Trust but Verify

Claude's code was generally excellent—but I still reviewed every PR. The few bugs that slipped through (spawn positions, collision edge cases) were caught in testing.

---

## The Math

**Traditional estimate:** 2-4 weeks of evenings

If we assume 3 hours/evening, 5 evenings/week:
- 2 weeks = 30 hours
- 4 weeks = 60 hours

**Actual time:** ~3 days

Concentrated work sessions, but let's estimate:
- Day 1: 4 hours (evening session)
- Day 2: 8 hours (full day)
- Day 3: 8 hours (full day + deployment)
- **Total: ~20 hours**

But here's the thing—much of that was *testing and playing*, not waiting for code to be written. The AI work happened in parallel while I reviewed.

**Effective acceleration: 3-4x faster to MVP**

---

## What's Next

With the MVP complete in 3 days, the project continues:
- Extended World 1 content (levels 1-4 through 1-8)
- Difficulty scaling refinements
- Community feedback integration
- Potential level editor

The foundation built so quickly is solid enough to keep building on.

---

## Conclusion

AI didn't replace the hard parts of game development—the creative vision, the feel tuning, the "is this fun?" judgment calls. What it did was compress the implementation time dramatically.

The formula:
1. **Human creativity** → What should we build?
2. **Human specification** → What exactly should it do?
3. **AI implementation** → Write the code
4. **Human verification** → Does it work? Is it good?
5. **Repeat**

Three days. 11,000 lines of code. A complete, playable, accessible game.

This is what's possible when you treat AI as a force multiplier rather than a replacement. The future of software development isn't human *or* AI—it's human *with* AI, each doing what they do best.

---

*Built with Phaser 3, Vite, and Claude. December 2025.*
