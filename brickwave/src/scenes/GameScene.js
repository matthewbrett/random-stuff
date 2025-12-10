import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import Player from '../entities/Player.js';
import Coin from '../entities/Coin.js';
import KeyShard from '../entities/KeyShard.js';
import LevelExit from '../entities/LevelExit.js';
import LevelLoader from '../systems/LevelLoader.js';
import PhaseManager from '../systems/PhaseManager.js';
import PhaseIndicator from '../systems/PhaseIndicator.js';
import ScoreManager from '../systems/ScoreManager.js';
import Powerup from '../entities/Powerup.js';
import GameHUD from '../systems/GameHUD.js';
import EnemyManager from '../systems/EnemyManager.js';
import saveManager from '../systems/SaveManager.js';
import audioManager from '../systems/AudioManager.js';
import particleEffects from '../systems/ParticleEffects.js';
import transitionManager from '../systems/TransitionManager.js';
import inputManager from '../systems/InputManager.js';
import PauseMenuManager from '../ui/PauseMenuManager.js';
import CompletionScreenManager from '../ui/CompletionScreenManager.js';

/**
 * GameScene - Main gameplay scene
 * Handles player movement, level rendering, and game logic
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Pause state (menu managed by PauseMenuManager)
    this.isPaused = false;
  }

  preload() {
    // eslint-disable-next-line no-console
    console.log('🎮 GameScene: Preloading assets...');

    // Load all levels
    this.load.json('level-0-0', 'assets/levels/level-0-0.json');
    this.load.json('level-1-1', 'assets/levels/level-1-1.json');
    this.load.json('level-1-2', 'assets/levels/level-1-2.json');
    this.load.json('level-1-3', 'assets/levels/level-1-3.json');
    this.load.json('level-1-4', 'assets/levels/level-1-4.json');
    this.load.json('level-1-5', 'assets/levels/level-1-5.json');
    this.load.json('level-1-6', 'assets/levels/level-1-6.json');
    this.load.json('level-1-7', 'assets/levels/level-1-7.json');
    this.load.json('level-1-8', 'assets/levels/level-1-8.json');
    this.load.json('level-1-9', 'assets/levels/level-1-9.json');
    this.load.json('level-2-1', 'assets/levels/level-2-1.json');
    this.load.json('level-2-2', 'assets/levels/level-2-2.json');
    this.load.json('level-2-3', 'assets/levels/level-2-3.json');

    // Also load test level for backwards compatibility
    this.load.json('testLevel1', 'assets/levels/test-level-1.json');
  }

  init(data) {
    // Level to load (default to 1-1)
    // Use ?? instead of || to properly handle world/level 0
    this.currentWorld = data?.world ?? 1;
    this.currentLevel = data?.level ?? 1;
    this.levelKey = data?.levelKey || `level-${this.currentWorld}-${this.currentLevel}`;
  }

  create() {
    // eslint-disable-next-line no-console
    console.log('🎮 GameScene: Initializing...');

    // Initialize save manager
    saveManager.init();

    // Initialize audio manager with this scene
    audioManager.init(this);

    // Initialize particle effects
    particleEffects.init(this);

    // Initialize input manager with touch controls
    inputManager.init(this);

    // Apply touch control setting
    const touchSetting = saveManager.getTouchControlsSetting();
    if (touchSetting === 1) {
      // Force on
      inputManager.setTouchControlsVisible(true);
    } else if (touchSetting === 2) {
      // Force off
      inputManager.setTouchControlsVisible(false);
    }
    // touchSetting === 0 is Auto (handled by inputManager)

    // Create score manager
    this.scoreManager = new ScoreManager(this);
    this.requiredKeyShards = saveManager.getRequiredKeyShards();
    this.scoreManager.setRequiredKeyShards(this.requiredKeyShards);

    // Create phase manager
    this.phaseManager = new PhaseManager(this);

    // Create level loader
    this.levelLoader = new LevelLoader(this);

    // Load the specified level
    let levelData = this.cache.json.get(this.levelKey);

    // Fallback to test level if not found
    if (!levelData) {
      console.warn(`Level ${this.levelKey} not found, falling back to testLevel1`);
      levelData = this.cache.json.get('testLevel1');
      this.currentWorld = 1;
      this.currentLevel = 1;
    }

    const levelInfo = this.levelLoader.loadLevel(levelData);

    // Get level properties
    if (levelData.properties) {
      this.targetTime = levelData.properties.targetTime || 90;
    } else {
      this.targetTime = 90;
    }

    // Store collision groups for easy access
    this.platforms = levelInfo.collisionTiles;
    this.oneWayPlatforms = levelInfo.oneWayPlatforms;
    this.hazardTiles = levelInfo.hazardTiles;
    this.phaseBricks = levelInfo.phaseBricks;

    // Register phase bricks with phase manager
    this.phaseBricks.forEach(brick => {
      this.phaseManager.registerBrick(brick, brick.groupId);
    });

    // Get player spawn point from level
    const spawnPoint = this.levelLoader.getSpawnPoint('player');

    // Create the player (pass score manager for Echo Charges)
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);
    this.player.scoreManager = this.scoreManager;

    // Set player health based on difficulty
    const maxHealth = saveManager.getMaxHealthForDifficulty();
    this.player.setMaxHealth(maxHealth);

    // Power-up state
    this.phaseAnchorTimer = 0;
    this.spectralBootsTimer = 0;
    this.spectralGraceDuration = 500; // ms grace on ghost tiles

    // Setup collision with phase bricks
    this.setupPhaseBrickCollision();

    // Setup hazard collision (instant death fire/spikes)
    this.setupHazardCollision();

    // Create coins
    this.coins = [];
    this.createCoins(levelData);

    // Create key shards
    this.keyShards = [];
    this.createKeyShards(levelData);

    // Create power-ups
    this.powerups = [];
    this.createPowerups(levelData);

    // Create level exit
    this.levelExit = null;
    this.createLevelExit(levelData);
    this.updateExitLockState();

    // Setup coin collision
    this.setupCoinCollision();

    // Create enemy manager and spawn enemies
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnFromLevel(levelData);

    // Level completion state
    this.levelComplete = false;
    this.completionOverlay = null;

    // Setup camera with level boundaries
    this.cameras.main.setBounds(0, 0, levelInfo.width, levelInfo.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Add phase indicator (only if there are phase bricks)
    if (this.phaseBricks.length > 0) {
      this.phaseIndicator = new PhaseIndicator(
        this,
        this.phaseManager,
        GAME_CONFIG.GAME_WIDTH / 2, // Center horizontally
        20 * SCALE, // Near top of screen (scaled)
        0 // Group 0 (default)
      );
    }

    // Create HUD
    this.hud = new GameHUD(this, this.scoreManager);
    this.hud.setWorld(this.currentWorld, this.currentLevel);
    this.hud.setInitialHealth(this.player.currentHealth, this.player.maxHealth);
    this.hud.setKeyShardRequirement(this.requiredKeyShards);

    // Start level timer
    this.scoreManager.startTimer();

    // Add debug text (scaled position) - DISABLED
    // this.debugText = createSmoothText(this, 10 * SCALE, 10 * SCALE, '', TextStyles.debug);
    // this.debugText.setScrollFactor(0);
    // this.debugText.setDepth(1000);

    // Setup pause menu input
    this.setupPauseInput();

    // Setup death handler
    this.events.once('playerDied', () => {
      this.handlePlayerDeath();
    });

    // Initialize pause state
    this.isPaused = false;

    // Initialize UI managers
    this.pauseMenuManager = new PauseMenuManager(this);
    this.completionScreenManager = new CompletionScreenManager(this);

    // Setup UI manager event handlers
    this.events.on('pauseMenuAction', this.handlePauseMenuAction, this);
    this.events.on('completionMenuAction', this.handleCompletionMenuAction, this);

    // Setup shutdown handler to clean up before scene restart
    this.events.once('shutdown', this.shutdown, this);

    // Fade in transition
    transitionManager.init(this);
    transitionManager.fadeIn({ duration: 200 });
  }

  /**
   * Setup pause menu and instant restart input
   */
  setupPauseInput() {
    // ESC to toggle pause
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.levelComplete) return;
      this.togglePause();
    });

    // R for instant restart (speedrunner-friendly)
    this.input.keyboard.on('keydown-R', () => {
      if (this.isPaused || this.levelComplete) return;
      this.instantRestart();
    });
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * Pause the game and show pause menu
   */
  pauseGame() {
    if (this.isPaused) return;

    this.isPaused = true;

    // Pause physics
    this.physics.pause();

    // Stop the timer
    if (this.scoreManager) {
      this.scoreManager.stopTimer();
    }

    // Show pause menu with current stats
    this.pauseMenuManager.show({
      world: this.currentWorld,
      level: this.currentLevel,
      time: this.scoreManager.getFormattedTime(),
      score: this.scoreManager.getScore()
    });
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (!this.isPaused) return;

    this.isPaused = false;

    // Resume physics
    this.physics.resume();

    // Resume timer
    if (this.scoreManager && !this.levelComplete) {
      this.scoreManager.timerRunning = true;
    }

    // Hide pause menu
    this.pauseMenuManager.hide();
  }

  /**
   * Handle pause menu action events
   * @param {string} action - The selected action
   */
  handlePauseMenuAction(action) {
    switch (action) {
      case 'resume':
        this.resumeGame();
        break;
      case 'restart':
        this.pauseMenuManager.hide();
        this.instantRestart();
        break;
      case 'level_select':
        this.pauseMenuManager.hide();
        this.scene.start('LevelSelectScene');
        break;
      case 'quit':
        this.pauseMenuManager.hide();
        this.scene.start('TitleScene');
        break;
    }
  }

  /**
   * Instant restart (speedrunner-friendly)
   */
  instantRestart() {
    // Quick flash effect
    this.cameras.main.flash(50, 255, 255, 255);

    // Restart the scene with same level
    this.scene.restart({
      world: this.currentWorld,
      level: this.currentLevel,
      levelKey: this.levelKey
    });
  }

  /**
   * Clean up before scene shutdown/restart
   */
  shutdown() {
    // Destroy HUD to remove event listeners
    if (this.hud) {
      this.hud.destroy();
    }

    // Clean up UI managers
    if (this.pauseMenuManager) {
      this.pauseMenuManager.destroy();
    }
    if (this.completionScreenManager) {
      this.completionScreenManager.destroy();
    }

    // Remove UI event listeners
    this.events.off('pauseMenuAction', this.handlePauseMenuAction, this);
    this.events.off('completionMenuAction', this.handleCompletionMenuAction, this);

    // Clean up input manager
    inputManager.destroy();
  }

  setupPhaseBrickCollision() {
    // Set up individual colliders for each phase brick
    // We need per-brick collision callbacks to check phase state
    this.phaseBricks.forEach(phaseBrick => {
      this.physics.add.collider(
        this.player.sprite,
        phaseBrick.brick,
        null,
        () => {
          if (phaseBrick.isSolid()) return true;
          if (this.isSpectralBootsActive() && phaseBrick.canSupportWithGrace(this.spectralGraceDuration)) {
            return true;
          }
          return false;
        }, // Allow collision during spectral boots grace
        this
      );
    });
  }

  /**
   * Setup collision with hazard tiles (fire/spikes = instant death)
   */
  setupHazardCollision() {
    if (!this.hazardTiles) return;

    this.physics.add.overlap(
      this.player.sprite,
      this.hazardTiles,
      () => {
        // Only trigger if player hasn't already died
        if (this.player.isDead || this.levelComplete) return;

        // eslint-disable-next-line no-console
        console.log('🔥 Player hit hazard tile!');

        // Instant kill - set health to 0 and trigger death
        this.player.currentHealth = 0;
        this.player.die();
      },
      null,
      this
    );
  }

  /**
   * Create coins from level data
   * @param {object} levelData - Level JSON data
   */
  createCoins(levelData) {
    // Look for a "Coins" or "Objects" layer in the level data
    const coinsLayer = levelData.layers.find(
      layer => layer.name === 'Coins' || layer.name === 'Objects'
    );

    if (coinsLayer && coinsLayer.objects) {
      coinsLayer.objects.forEach(obj => {
        if (obj.name === 'coin' || obj.type === 'coin') {
          const coin = new Coin(this, obj.x + obj.width / 2, obj.y + obj.height / 2);
          this.coins.push(coin);
        }
      });
    }

    // If no coins found in level data, create some test coins
    if (this.coins.length === 0) {
      // eslint-disable-next-line no-console
      console.log('No coins found in level, creating test coins...');
      // Create a line of test coins (scaled positions)
      for (let i = 0; i < 10; i++) {
        const coin = new Coin(this, (50 + i * 20) * SCALE, 100 * SCALE);
        this.coins.push(coin);
      }
    }
  }

  /**
  * Create power-ups from level data
  * @param {object} levelData - Level JSON data
  */
  createPowerups(levelData) {
    const powerLayer = levelData.layers.find(
      layer => layer.name === 'Powerups' || layer.name === 'Entities'
    );

    if (powerLayer && powerLayer.objects) {
      powerLayer.objects.forEach(obj => {
        const type = (obj.type || obj.name || '').toLowerCase();
        if (type === 'phase_anchor' || type === 'spectral_boots') {
          const powerup = new Powerup(
            this,
            (obj.x + obj.width / 2) * SCALE,
            (obj.y + obj.height / 2) * SCALE,
            type
          );
          this.powerups.push(powerup);
        }
      });
    }
  }

  /**
   * Setup coin collision detection
   */
  setupCoinCollision() {
    // Check for coin collection every frame
    // We'll do this in update() using overlap detection
  }

  /**
   * Create key shards from level data
   * @param {object} levelData - Level JSON data
   */
  createKeyShards(levelData) {
    // Look for a "KeyShards" or "Secrets" layer in the level data
    const shardsLayer = levelData.layers.find(
      layer => layer.name === 'KeyShards' || layer.name === 'Secrets'
    );
    let shardIndex = 0;

    if (shardsLayer && shardsLayer.objects) {
      shardsLayer.objects.forEach(obj => {
        if (obj.name === 'keyshard' || obj.type === 'keyshard') {
          const shard = new KeyShard(
            this,
            (obj.x + obj.width / 2) * SCALE,
            (obj.y + obj.height / 2) * SCALE,
            shardIndex
          );
          this.keyShards.push(shard);
          shardIndex++;
        }
      });
    }

    if (this.scoreManager) {
      this.scoreManager.setTotalKeyShards(shardIndex);
      // Re-apply difficulty requirement, clamped to available shards
      this.scoreManager.setRequiredKeyShards(this.requiredKeyShards);
    }

    if (this.hud) {
      this.hud.setKeyShardRequirement(this.scoreManager.getRequiredKeyShards());
    }

    this.updateExitLockState();
  }

  /**
   * Create level exit from level data
   * @param {object} levelData - Level JSON data
   */
  createLevelExit(levelData) {
    // Look for exit in the Entities layer
    const entitiesLayer = levelData.layers.find(
      layer => layer.name === 'Entities'
    );

    if (entitiesLayer && entitiesLayer.objects) {
      const exitObj = entitiesLayer.objects.find(
        obj => obj.name === 'exit' || obj.type === 'exit'
      );

      if (exitObj) {
        this.levelExit = new LevelExit(
          this,
          (exitObj.x + exitObj.width / 2) * SCALE,
          (exitObj.y + exitObj.height) * SCALE
        );
      }
    }
  }

  update(time, delta) {
    // Skip updates when paused (except HUD for visual consistency)
    if (this.isPaused) {
      // Only update HUD during pause
      if (this.hud) {
        this.hud.update(time, delta);
      }
      return;
    }

    // Update score manager timer
    if (this.scoreManager) {
      this.scoreManager.updateTimer();
    }

    // Update active power-up timers
    if (this.phaseAnchorTimer > 0) {
      this.phaseAnchorTimer = Math.max(0, this.phaseAnchorTimer - delta);
    }
    if (this.spectralBootsTimer > 0) {
      this.spectralBootsTimer = Math.max(0, this.spectralBootsTimer - delta);
    }

    // Update phase manager (handles phase timing)
    if (this.phaseManager) {
      this.phaseManager.update(time, delta);
    }

    // Update phase indicator
    if (this.phaseIndicator) {
      this.phaseIndicator.update(time, delta);
    }

    // Update all phase bricks (handles visual feedback)
    if (this.phaseBricks) {
      this.phaseBricks.forEach(brick => {
        brick.update(time, delta);
      });
    }

    // Update coins
    if (this.coins) {
      this.coins.forEach(coin => {
        coin.update(time, delta);
      });
    }

    // Update key shards
    if (this.keyShards) {
      this.keyShards.forEach(shard => {
        shard.update(time, delta);
      });
    }

    // Update power-ups
    if (this.powerups) {
      this.powerups.forEach(power => power.update(time, delta));
    }

    // Update level exit
    if (this.levelExit) {
      this.levelExit.update(time, delta);
    }

    // Update enemies
    if (this.enemyManager) {
      this.enemyManager.update(time, delta);
    }

    // Update player
    if (this.player && !this.levelComplete) {
      this.player.update(time, delta);

      // Check coin collection
      this.checkCoinCollection();

      // Check key shard collection
      this.checkKeyShardCollection();

      // Check power-up collection
      this.checkPowerupCollection();

      // Check level exit
      this.checkLevelExit();

      // Check enemy collision
      this.checkEnemyCollision();

      // Update style bonus based on player movement
      const isMoving = Math.abs(this.player.sprite.body.velocity.x) > 10 ||
                       Math.abs(this.player.sprite.body.velocity.y) > 10;
      this.scoreManager.updateStyleBonus(isMoving, delta);

      // Update debug text - DISABLED
      // const phaseState = this.phaseManager ? this.phaseManager.getCurrentPhase(0) : 'N/A';
      // const echoCharges = this.scoreManager ? this.scoreManager.getEchoCharges() : 0;
      // const debugInfo = [
      //   `Pos: ${Math.round(this.player.sprite.x)}, ${Math.round(this.player.sprite.y)}`,
      //   `Vel: ${Math.round(this.player.sprite.body.velocity.x)}, ${Math.round(this.player.sprite.body.velocity.y)}`,
      //   `Ground: ${this.player.isGrounded}`,
      //   `Echo: ${echoCharges}`,
      //   `Dash: ${this.player.isDashing ? 'YES' : 'NO'}`,
      //   `Phase: ${phaseState}`,
      //   `Score: ${this.scoreManager.getScore()}`,
      //   `Coins: ${this.scoreManager.getCoinsCollected()}`,
      // ];
      // this.debugText.setText(debugInfo.join('\n'));
    }

    // Update HUD
    if (this.hud) {
      this.hud.update(time, delta);
    }

    // Update input manager at end of frame (tracks touch state transitions for next frame)
    if (inputManager) {
      inputManager.update();
    }
  }

  /**
   * Check if player has collected any coins
   */
  checkCoinCollection() {
    const playerBounds = this.player.sprite.getBounds();

    this.coins.forEach((coin, index) => {
      if (!coin.collected && coin.overlaps(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height)) {
        // Collect the coin
        const coinX = coin.x;
        const coinY = coin.y;
        const score = coin.collect();
        this.scoreManager.collectCoin(score);
        audioManager.playCoin();
        particleEffects.createCoinSparkle(coinX, coinY);

        // Remove from array
        this.coins.splice(index, 1);
      }
    });
  }

  /**
   * Check if player has collected any key shards
   */
  checkKeyShardCollection() {
    const playerBounds = this.player.sprite.getBounds();

    this.keyShards.forEach((shard, index) => {
      if (!shard.collected && shard.overlaps(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height)) {
        // Collect the shard
        const shardX = shard.x;
        const shardY = shard.y;
        const shardIndex = shard.collect();
        if (shardIndex >= 0) {
          this.scoreManager.collectKeyShard(shardIndex);
          audioManager.playShard();
          particleEffects.createShardShimmer(shardX, shardY);
        }

        // Remove from array
        this.keyShards.splice(index, 1);
        this.updateExitLockState();
      }
    });
  }

  /**
   * Check power-up pickups
   */
  checkPowerupCollection() {
    if (!this.player || !this.powerups) return;

    const playerBounds = this.player.sprite.getBounds();
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const power = this.powerups[i];
      if (power.collected) continue;

      if (power.overlaps(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height)) {
        const type = power.collect();
        this.applyPowerup(type);
        this.powerups.splice(i, 1);
      }
    }
  }

  /**
   * Apply a collected power-up effect
   * @param {string} type - Power-up type id
   */
  applyPowerup(type) {
    if (type === 'phase_anchor') {
      this.activatePhaseAnchor(3000);
    } else if (type === 'spectral_boots') {
      this.activateSpectralBoots(8000);
    }
  }

  activatePhaseAnchor(duration = 3000) {
    this.phaseAnchorTimer = Math.max(this.phaseAnchorTimer, duration);
    if (this.phaseManager?.freezeFor) {
      this.phaseManager.freezeFor(duration);
    }
    particleEffects.createCoinSparkle(this.player.sprite.x, this.player.sprite.y - 6 * SCALE);
    audioManager.playPhase();
  }

  activateSpectralBoots(duration = 8000) {
    this.spectralBootsTimer = Math.max(this.spectralBootsTimer, duration);
    particleEffects.createDashTrail(this.player.sprite.x, this.player.sprite.y);
    audioManager.playDash();
  }

  isSpectralBootsActive() {
    return this.spectralBootsTimer > 0;
  }

  /**
   * Check if player has reached the level exit
   */
  checkLevelExit() {
    if (!this.levelExit || this.levelComplete) return;

    const playerBounds = this.player.sprite.getBounds();

    // Check if player is near exit (for visual feedback)
    const distance = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      this.levelExit.sprite.x, this.levelExit.sprite.y
    );
    this.levelExit.setPlayerNearby(distance < 40 * SCALE);
    this.updateExitLockState();

    // Check if player overlaps exit
    if (this.levelExit.overlaps(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height)) {
      if (!this.hasRequiredKeyShards()) {
        if (this.hud) {
          this.hud.flashKeyShards();
        }
        return;
      }
      this.completLevel();
    }
  }

  /**
   * Whether the player has enough shards to unlock the exit
   * @returns {boolean} Requirement met
   */
  hasRequiredKeyShards() {
    return this.scoreManager?.hasRequiredKeyShards() ?? true;
  }

  /**
   * Keep the exit lock state in sync with shard progress
   */
  updateExitLockState() {
    if (!this.levelExit || !this.scoreManager) return;
    this.levelExit.updateShardStatus(
      this.scoreManager.getRequiredKeyShards(),
      this.scoreManager.getKeyShardCount()
    );
  }

  /**
   * Complete the level
   */
  completLevel() {
    if (this.levelComplete) return;

    this.levelComplete = true;

    // Stop timer
    this.scoreManager.stopTimer();

    // Calculate time bonus using level's target time
    this.scoreManager.calculateTimeBonus(this.targetTime);

    // Trigger exit effect
    if (this.levelExit) {
      this.levelExit.trigger();
    }

    // Stop player movement
    if (this.player) {
      this.player.sprite.body.setVelocity(0, 0);
    }

    // Play level complete sound and effects
    audioManager.playLevelComplete();
    particleEffects.createLevelComplete(this.player.sprite.x, this.player.sprite.y);

    // Show level complete screen after effects
    this.time.delayedCall(1000, () => {
      this.showCompletionScreen();
    });

    // eslint-disable-next-line no-console
    console.log('🎉 Level Complete!');
    // eslint-disable-next-line no-console
    console.log(`World ${this.currentWorld}-${this.currentLevel} completed!`);
    // eslint-disable-next-line no-console
    console.log(`Time: ${this.scoreManager.getFormattedTime()}`);
    // eslint-disable-next-line no-console
    console.log(`Key Shards: ${this.scoreManager.getKeyShardCount()}/3`);
  }

  /**
   * Show level completion screen with stats, rank, and menu
   */
  showCompletionScreen() {
    // Gather stats for completion screen
    const stats = {
      world: this.currentWorld,
      level: this.currentLevel,
      formattedTime: this.scoreManager.getFormattedTime(),
      timeSeconds: this.scoreManager.getLevelTimeSeconds(),
      targetTime: this.targetTime,
      keyShards: this.scoreManager.getKeyShardCount(),
      score: this.scoreManager.getScore(),
      timeBonus: this.scoreManager.timeBonus,
      styleBonus: this.scoreManager.styleBonus,
      totalScore: this.scoreManager.getTotalScore()
    };

    // Calculate rank using the manager
    const rank = this.completionScreenManager.calculateRank(stats);

    // Save level completion
    const levelId = `${this.currentWorld}-${this.currentLevel}`;
    const improvements = saveManager.saveLevelCompletion(levelId, {
      time: stats.timeSeconds,
      keyShards: stats.keyShards,
      score: stats.totalScore,
      rank: rank.letter,
      coins: this.scoreManager.getCoinsCollected()
    });

    // Log improvements for debugging
    if (improvements.firstCompletion) {
      // eslint-disable-next-line no-console
      console.log('🎉 First time completing this level!');
    }
    if (improvements.newBestTime) {
      // eslint-disable-next-line no-console
      console.log('⏱️ New best time!');
    }
    if (improvements.newBestScore) {
      // eslint-disable-next-line no-console
      console.log('🏆 New best score!');
    }
    if (improvements.newKeyShards) {
      // eslint-disable-next-line no-console
      console.log('🔑 New key shard record!');
    }

    // Store improvements for display
    this.levelImprovements = improvements;

    // Show completion screen via manager
    this.completionScreenManager.show(stats);
  }

  /**
   * Handle completion menu action events
   * @param {string} action - The selected action
   */
  handleCompletionMenuAction(action) {
    this.completionScreenManager.hide();

    switch (action) {
      case 'next_level':
        this.advanceToNextLevel();
        break;
      case 'retry':
      case 'quick_retry':
        this.instantRestart();
        break;
      case 'level_select':
        this.scene.start('LevelSelectScene');
        break;
      case 'quit':
        this.scene.start('TitleScene');
        break;
    }
  }

  /**
   * Advance to the next level or end game
   */
  advanceToNextLevel() {
    // Special case: Intro level advances to 1-1
    if (this.currentWorld === 0 && this.currentLevel === 0) {
      // eslint-disable-next-line no-console
      console.log('📍 Completing intro level, advancing to 1-1');
      this.scene.restart({
        world: 1,
        level: 1,
        levelKey: 'level-1-1'
      });
      return;
    }

    const nextWorld = this.currentWorld;
    const nextLevel = this.currentLevel + 1;
    const nextLevelKey = `level-${nextWorld}-${nextLevel}`;
    const nextId = `${nextWorld}-${nextLevel}`;

    // If next level JSON is missing, return to level select
    if (!this.cache.json.has(nextLevelKey)) {
      // eslint-disable-next-line no-console
      console.log(`⚠️ Level ${nextLevelKey} not found. Returning to Level Select.`);
      this.scene.start('LevelSelectScene');
      return;
    }

    // If locked (e.g., bonus stage), return to level select
    if (!saveManager.isLevelUnlocked(nextId)) {
      // eslint-disable-next-line no-console
      console.log(`🔒 Level ${nextId} locked. Returning to Level Select.`);
      this.scene.start('LevelSelectScene');
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`📍 Loading next level: ${nextWorld}-${nextLevel}`);
    this.scene.restart({
      world: nextWorld,
      level: nextLevel,
      levelKey: nextLevelKey
    });
  }

  /**
   * Check for player collision with enemies
   */
  checkEnemyCollision() {
    if (!this.enemyManager || !this.player) return;

    const result = this.enemyManager.checkPlayerCollision(this.player);

    if (result.hit) {
      // Award score for defeated enemies
      if (result.score > 0) {
        this.scoreManager.addScore(result.score);
        // Record enemy defeat for global stats
        saveManager.recordEnemyDefeats(1);
        // Play stomp sound and create effects
        audioManager.playStomp();
        // Create stomp effect at player position (since enemy is destroyed)
        particleEffects.createStompEffect(this.player.sprite.x, this.player.sprite.y + 8 * SCALE);
      }

      // Handle player damage
      if (result.damaged) {
        this.onPlayerDamaged();
      }
    }
  }

  /**
   * Handle player taking damage
   */
  onPlayerDamaged() {
    // Let player handle damage (invincibility, health decrement, death)
    const tookDamage = this.player.takeDamage();

    if (tookDamage) {
      // eslint-disable-next-line no-console
      console.log(`💔 Player damaged! Health: ${this.player.currentHealth}/${this.player.maxHealth}`);
    }
  }

  /**
   * Handle player death
   */
  handlePlayerDeath() {
    // eslint-disable-next-line no-console
    console.log('💀 Player died!');

    // Stop timer
    if (this.scoreManager) {
      this.scoreManager.stopTimer();
    }

    // Pause physics
    this.physics.pause();

    // Record death for global stats
    saveManager.recordDeath();

    // Transition to Game Over scene after a delay
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', {
        world: this.currentWorld,
        level: this.currentLevel,
        levelKey: this.levelKey,
        time: this.scoreManager.getFormattedTime(),
        score: this.scoreManager.getScore()
      });
    });
  }
}
