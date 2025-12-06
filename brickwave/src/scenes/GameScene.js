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
import GameHUD from '../systems/GameHUD.js';
import EnemyManager from '../systems/EnemyManager.js';
import saveManager from '../systems/SaveManager.js';
import audioManager from '../systems/AudioManager.js';
import particleEffects from '../systems/ParticleEffects.js';
import transitionManager from '../systems/TransitionManager.js';
import inputManager from '../systems/InputManager.js';
import { TextStyles, createSmoothText, createCenteredText } from '../utils/TextStyles.js';

/**
 * GameScene - Main gameplay scene
 * Handles player movement, level rendering, and game logic
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Pause menu state
    this.isPaused = false;
    this.pauseMenuItems = ['RESUME', 'RESTART', 'LEVEL SELECT', 'QUIT TO TITLE'];
    this.pauseSelectedIndex = 0;
  }

  preload() {
    console.log('🎮 GameScene: Preloading assets...');

    // Load all levels
    this.load.json('level-intro', '/assets/levels/level-intro.json');
    this.load.json('level-1-1', '/assets/levels/level-1-1.json');
    this.load.json('level-1-2', '/assets/levels/level-1-2.json');
    this.load.json('level-1-3', '/assets/levels/level-1-3.json');

    // Also load test level for backwards compatibility
    this.load.json('testLevel1', '/assets/levels/test-level-1.json');
  }

  init(data) {
    // Level to load (default to 1-1)
    this.currentWorld = data?.world || 1;
    this.currentLevel = data?.level || 1;
    this.levelKey = data?.levelKey || `level-${this.currentWorld}-${this.currentLevel}`;
  }

  create() {
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

    // Setup collision with phase bricks
    this.setupPhaseBrickCollision();

    // Create coins
    this.coins = [];
    this.createCoins(levelData);

    // Create key shards
    this.keyShards = [];
    this.createKeyShards(levelData);

    // Create level exit
    this.levelExit = null;
    this.createLevelExit(levelData);

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
    this.pauseSelectedIndex = 0;
    this.pauseOverlay = null;

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
    this.pauseSelectedIndex = 0;

    // Pause physics
    this.physics.pause();

    // Stop the timer
    if (this.scoreManager) {
      this.scoreManager.stopTimer();
    }

    // Create pause overlay
    this.showPauseMenu();
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
    this.hidePauseMenu();
  }

  /**
   * Show pause menu overlay
   */
  showPauseMenu() {
    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(3000);

    // Pause title
    const title = createCenteredText(
      this,
      centerX,
      35 * SCALE,
      'PAUSED',
      TextStyles.title
    );
    title.setScrollFactor(0);
    title.setDepth(3001);

    // Current level info
    const levelInfo = createCenteredText(
      this,
      centerX,
      55 * SCALE,
      `World ${this.currentWorld}-${this.currentLevel}`,
      TextStyles.hint
    );
    levelInfo.setScrollFactor(0);
    levelInfo.setDepth(3001);

    // Current stats
    const statsText = createCenteredText(
      this,
      centerX,
      70 * SCALE,
      `Time: ${this.scoreManager.getFormattedTime()} | Score: ${this.scoreManager.getScore()}`,
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );
    statsText.setScrollFactor(0);
    statsText.setDepth(3001);

    // Menu items
    const menuStartY = 90 * SCALE;
    const menuSpacing = 14 * SCALE;
    const menuTexts = [];

    this.pauseMenuItems.forEach((item, index) => {
      const isSelected = index === this.pauseSelectedIndex;
      const style = isSelected ? TextStyles.menuItemSelected : TextStyles.menuItem;

      const text = createCenteredText(
        this,
        centerX,
        menuStartY + index * menuSpacing,
        item,
        style
      );
      text.setScrollFactor(0);
      text.setDepth(3001);
      menuTexts.push(text);
    });

    // Selection arrow
    const arrow = createCenteredText(
      this,
      centerX - 60 * SCALE,
      menuStartY,
      '>',
      TextStyles.menuItemSelected
    );
    arrow.setScrollFactor(0);
    arrow.setDepth(3001);

    // Pulse the arrow
    this.tweens.add({
      targets: arrow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Controls hint
    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'R: Instant Restart',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );
    hint.setScrollFactor(0);
    hint.setDepth(3001);

    // Store references for cleanup
    this.pauseOverlay = {
      overlay,
      title,
      levelInfo,
      statsText,
      menuTexts,
      arrow,
      hint
    };

    // Setup pause menu navigation
    this.setupPauseMenuInput();
  }

  /**
   * Setup pause menu navigation
   */
  setupPauseMenuInput() {
    // Remove existing listeners first
    this.input.keyboard.off('keydown-UP', this.pauseMenuUp, this);
    this.input.keyboard.off('keydown-DOWN', this.pauseMenuDown, this);
    this.input.keyboard.off('keydown-W', this.pauseMenuUp, this);
    this.input.keyboard.off('keydown-S', this.pauseMenuDown, this);
    this.input.keyboard.off('keydown-ENTER', this.pauseMenuConfirm, this);
    this.input.keyboard.off('keydown-SPACE', this.pauseMenuConfirm, this);

    // Add pause menu navigation
    this.input.keyboard.on('keydown-UP', this.pauseMenuUp, this);
    this.input.keyboard.on('keydown-DOWN', this.pauseMenuDown, this);
    this.input.keyboard.on('keydown-W', this.pauseMenuUp, this);
    this.input.keyboard.on('keydown-S', this.pauseMenuDown, this);
    this.input.keyboard.on('keydown-ENTER', this.pauseMenuConfirm, this);
    this.input.keyboard.on('keydown-SPACE', this.pauseMenuConfirm, this);
  }

  /**
   * Navigate pause menu up
   */
  pauseMenuUp() {
    if (!this.isPaused) return;
    this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + this.pauseMenuItems.length) % this.pauseMenuItems.length;
    this.updatePauseMenuSelection();
  }

  /**
   * Navigate pause menu down
   */
  pauseMenuDown() {
    if (!this.isPaused) return;
    this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % this.pauseMenuItems.length;
    this.updatePauseMenuSelection();
  }

  /**
   * Confirm pause menu selection
   */
  pauseMenuConfirm() {
    if (!this.isPaused) return;

    const selected = this.pauseMenuItems[this.pauseSelectedIndex];

    switch (selected) {
      case 'RESUME':
        this.resumeGame();
        break;
      case 'RESTART':
        this.hidePauseMenu();
        this.instantRestart();
        break;
      case 'LEVEL SELECT':
        this.hidePauseMenu();
        this.scene.start('LevelSelectScene');
        break;
      case 'QUIT TO TITLE':
        this.hidePauseMenu();
        this.scene.start('TitleScene');
        break;
    }
  }

  /**
   * Update pause menu selection visuals
   */
  updatePauseMenuSelection() {
    if (!this.pauseOverlay) return;

    const menuStartY = 90 * SCALE;
    const menuSpacing = 14 * SCALE;

    // Update menu item styles
    this.pauseOverlay.menuTexts.forEach((text, index) => {
      const isSelected = index === this.pauseSelectedIndex;
      text.setStyle(isSelected ? TextStyles.menuItemSelected : TextStyles.menuItem);
    });

    // Move arrow
    this.pauseOverlay.arrow.y = menuStartY + this.pauseSelectedIndex * menuSpacing;
  }

  /**
   * Hide pause menu overlay
   */
  hidePauseMenu() {
    if (!this.pauseOverlay) return;

    // Destroy all pause menu elements
    this.pauseOverlay.overlay.destroy();
    this.pauseOverlay.title.destroy();
    this.pauseOverlay.levelInfo.destroy();
    this.pauseOverlay.statsText.destroy();
    this.pauseOverlay.menuTexts.forEach(text => text.destroy());
    this.pauseOverlay.arrow.destroy();
    this.pauseOverlay.hint.destroy();

    this.pauseOverlay = null;

    // Remove pause menu input listeners
    this.input.keyboard.off('keydown-UP', this.pauseMenuUp, this);
    this.input.keyboard.off('keydown-DOWN', this.pauseMenuDown, this);
    this.input.keyboard.off('keydown-W', this.pauseMenuUp, this);
    this.input.keyboard.off('keydown-S', this.pauseMenuDown, this);
    this.input.keyboard.off('keydown-ENTER', this.pauseMenuConfirm, this);
    this.input.keyboard.off('keydown-SPACE', this.pauseMenuConfirm, this);
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

    // Clean up pause overlay if it exists
    if (this.pauseOverlay) {
      this.hidePauseMenu();
    }

    // Clean up completion overlay if it exists
    if (this.completionOverlay) {
      this.cleanupCompletionOverlay();
    }

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
        () => phaseBrick.isSolid(), // Only collide if brick is solid
        this
      );
    });
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
      console.log('No coins found in level, creating test coins...');
      // Create a line of test coins (scaled positions)
      for (let i = 0; i < 10; i++) {
        const coin = new Coin(this, (50 + i * 20) * SCALE, 100 * SCALE);
        this.coins.push(coin);
      }
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

    if (shardsLayer && shardsLayer.objects) {
      let shardIndex = 0;
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
      }
    });
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

    // Check if player overlaps exit
    if (this.levelExit.overlaps(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height)) {
      this.completLevel();
    }
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

    console.log('🎉 Level Complete!');
    console.log(`World ${this.currentWorld}-${this.currentLevel} completed!`);
    console.log(`Time: ${this.scoreManager.getFormattedTime()}`);
    console.log(`Key Shards: ${this.scoreManager.getKeyShardCount()}/3`);
  }

  /**
   * Calculate rank based on performance
   * @returns {object} Rank info with letter, color, and description
   */
  calculateRank() {
    const timeSeconds = this.scoreManager.getLevelTimeSeconds();
    const keyShards = this.scoreManager.getKeyShardCount();
    const totalScore = this.scoreManager.getTotalScore();

    // S Rank: Under target time, all shards, high score
    if (timeSeconds <= this.targetTime * 0.6 && keyShards === 3) {
      return { letter: 'S', color: '#ffff00', description: 'PERFECT!' };
    }
    // A Rank: Under target time or all shards
    if (timeSeconds <= this.targetTime * 0.8 || keyShards === 3) {
      return { letter: 'A', color: '#00ff00', description: 'EXCELLENT!' };
    }
    // B Rank: Under target time or 2+ shards
    if (timeSeconds <= this.targetTime || keyShards >= 2) {
      return { letter: 'B', color: '#00ffff', description: 'GREAT!' };
    }
    // C Rank: Completed with some effort
    if (keyShards >= 1 || totalScore >= 500) {
      return { letter: 'C', color: '#ffffff', description: 'GOOD' };
    }
    // D Rank: Just completed
    return { letter: 'D', color: '#888888', description: 'CLEAR' };
  }

  /**
   * Show level completion screen with stats, rank, and menu
   */
  showCompletionScreen() {
    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Calculate rank
    const rank = this.calculateRank();

    // Save level completion
    const levelId = `${this.currentWorld}-${this.currentLevel}`;
    const improvements = saveManager.saveLevelCompletion(levelId, {
      time: this.scoreManager.getLevelTimeSeconds(),
      keyShards: this.scoreManager.getKeyShardCount(),
      score: this.scoreManager.getTotalScore(),
      rank: rank.letter,
      coins: this.scoreManager.getCoinsCollected()
    });

    // Log improvements for debugging
    if (improvements.firstCompletion) {
      console.log('🎉 First time completing this level!');
    }
    if (improvements.newBestTime) {
      console.log('⏱️ New best time!');
    }
    if (improvements.newBestScore) {
      console.log('🏆 New best score!');
    }
    if (improvements.newKeyShards) {
      console.log('🔑 New key shard record!');
    }

    // Store improvements for display
    this.levelImprovements = improvements;

    // Results menu state
    this.resultsSelectedIndex = 0;
    this.resultsMenuItems = ['NEXT LEVEL', 'RETRY', 'LEVEL SELECT', 'QUIT'];

    // Create semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(2000);

    // Title
    const title = createCenteredText(
      this,
      centerX,
      15 * SCALE,
      'LEVEL COMPLETE!',
      { ...TextStyles.subtitle, fontSize: `${16 * SCALE}px` }
    );
    title.setScrollFactor(0);
    title.setDepth(2001);

    // Level info
    const levelInfo = createCenteredText(
      this,
      centerX,
      30 * SCALE,
      `World ${this.currentWorld}-${this.currentLevel}`,
      TextStyles.hint
    );
    levelInfo.setScrollFactor(0);
    levelInfo.setDepth(2001);

    // Rank display (big letter)
    const rankText = createCenteredText(
      this,
      centerX - 50 * SCALE,
      60 * SCALE,
      rank.letter,
      { ...TextStyles.rank, fontSize: `${36 * SCALE}px`, color: rank.color }
    );
    rankText.setScrollFactor(0);
    rankText.setDepth(2001);

    // Rank description
    const rankDesc = createCenteredText(
      this,
      centerX - 50 * SCALE,
      85 * SCALE,
      rank.description,
      { ...TextStyles.hint, color: rank.color }
    );
    rankDesc.setScrollFactor(0);
    rankDesc.setDepth(2001);

    // Stats on the right side
    const statsX = centerX + 30 * SCALE;
    const statsStartY = 45 * SCALE;
    const statsLineHeight = 10 * SCALE;

    const statsData = [
      { label: 'Time', value: this.scoreManager.getFormattedTime() },
      { label: 'Shards', value: `${this.scoreManager.getKeyShardCount()}/3` },
      { label: 'Score', value: `${this.scoreManager.getScore()}` },
      { label: 'Time +', value: `${this.scoreManager.timeBonus}` },
      { label: 'Style +', value: `${Math.floor(this.scoreManager.styleBonus)}` },
    ];

    const statsElements = [];
    statsData.forEach((stat, index) => {
      const y = statsStartY + index * statsLineHeight;

      const label = createSmoothText(
        this,
        statsX - 30 * SCALE,
        y,
        stat.label,
        { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, align: 'right' }
      );
      label.setOrigin(1, 0);
      label.setScrollFactor(0);
      label.setDepth(2001);
      statsElements.push(label);

      const value = createSmoothText(
        this,
        statsX - 25 * SCALE,
        y,
        stat.value,
        { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#00ffff' }
      );
      value.setScrollFactor(0);
      value.setDepth(2001);
      statsElements.push(value);
    });

    // Total score
    const totalY = statsStartY + statsData.length * statsLineHeight + 5 * SCALE;
    const totalLabel = createSmoothText(
      this,
      statsX - 30 * SCALE,
      totalY,
      'TOTAL',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#ffffff', align: 'right' }
    );
    totalLabel.setOrigin(1, 0);
    totalLabel.setScrollFactor(0);
    totalLabel.setDepth(2001);
    statsElements.push(totalLabel);

    const totalValue = createSmoothText(
      this,
      statsX - 25 * SCALE,
      totalY,
      `${this.scoreManager.getTotalScore()}`,
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#ffff00' }
    );
    totalValue.setScrollFactor(0);
    totalValue.setDepth(2001);
    statsElements.push(totalValue);

    // Menu options
    const menuStartY = 115 * SCALE;
    const menuSpacing = 12 * SCALE;
    const menuTexts = [];

    this.resultsMenuItems.forEach((item, index) => {
      const isSelected = index === this.resultsSelectedIndex;
      const style = isSelected ?
        { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` } :
        { ...TextStyles.menuItem, fontSize: `${10 * SCALE}px` };

      const text = createCenteredText(
        this,
        centerX,
        menuStartY + index * menuSpacing,
        item,
        style
      );
      text.setScrollFactor(0);
      text.setDepth(2001);
      menuTexts.push(text);
    });

    // Selection arrow
    const arrow = createCenteredText(
      this,
      centerX - 55 * SCALE,
      menuStartY,
      '>',
      { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` }
    );
    arrow.setScrollFactor(0);
    arrow.setDepth(2001);

    // Pulse the arrow
    this.tweens.add({
      targets: arrow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Controls hint
    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 10 * SCALE,
      'R: Quick Retry',
      { ...TextStyles.hint, fontSize: `${7 * SCALE}px` }
    );
    hint.setScrollFactor(0);
    hint.setDepth(2001);

    // Store overlay elements for cleanup
    this.completionOverlay = {
      overlay,
      title,
      levelInfo,
      rankText,
      rankDesc,
      statsElements,
      menuTexts,
      arrow,
      hint
    };

    // Setup results menu navigation
    this.setupResultsMenuInput();
  }

  /**
   * Setup results menu navigation
   */
  setupResultsMenuInput() {
    // Navigation
    this.resultsNavUp = () => {
      if (!this.levelComplete) return;
      this.resultsSelectedIndex = (this.resultsSelectedIndex - 1 + this.resultsMenuItems.length) % this.resultsMenuItems.length;
      this.updateResultsMenuSelection();
    };

    this.resultsNavDown = () => {
      if (!this.levelComplete) return;
      this.resultsSelectedIndex = (this.resultsSelectedIndex + 1) % this.resultsMenuItems.length;
      this.updateResultsMenuSelection();
    };

    this.resultsConfirm = () => {
      if (!this.levelComplete) return;
      this.confirmResultsSelection();
    };

    this.resultsQuickRetry = () => {
      if (!this.levelComplete) return;
      this.cleanupCompletionOverlay();
      this.instantRestart();
    };

    this.input.keyboard.on('keydown-UP', this.resultsNavUp);
    this.input.keyboard.on('keydown-DOWN', this.resultsNavDown);
    this.input.keyboard.on('keydown-W', this.resultsNavUp);
    this.input.keyboard.on('keydown-S', this.resultsNavDown);
    this.input.keyboard.on('keydown-ENTER', this.resultsConfirm);
    this.input.keyboard.on('keydown-SPACE', this.resultsConfirm);
    this.input.keyboard.on('keydown-R', this.resultsQuickRetry);
  }

  /**
   * Update results menu selection visuals
   */
  updateResultsMenuSelection() {
    if (!this.completionOverlay) return;

    const menuStartY = 115 * SCALE;
    const menuSpacing = 12 * SCALE;

    // Update menu item styles
    this.completionOverlay.menuTexts.forEach((text, index) => {
      const isSelected = index === this.resultsSelectedIndex;
      text.setStyle(isSelected ?
        { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` } :
        { ...TextStyles.menuItem, fontSize: `${10 * SCALE}px` }
      );
    });

    // Move arrow
    this.completionOverlay.arrow.y = menuStartY + this.resultsSelectedIndex * menuSpacing;
  }

  /**
   * Confirm results menu selection
   */
  confirmResultsSelection() {
    const selected = this.resultsMenuItems[this.resultsSelectedIndex];

    this.cleanupCompletionOverlay();

    switch (selected) {
      case 'NEXT LEVEL':
        this.advanceToNextLevel();
        break;
      case 'RETRY':
        this.instantRestart();
        break;
      case 'LEVEL SELECT':
        this.scene.start('LevelSelectScene');
        break;
      case 'QUIT':
        this.scene.start('TitleScene');
        break;
    }
  }

  /**
   * Clean up completion overlay
   */
  cleanupCompletionOverlay() {
    // Remove input listeners
    this.input.keyboard.off('keydown-UP', this.resultsNavUp);
    this.input.keyboard.off('keydown-DOWN', this.resultsNavDown);
    this.input.keyboard.off('keydown-W', this.resultsNavUp);
    this.input.keyboard.off('keydown-S', this.resultsNavDown);
    this.input.keyboard.off('keydown-ENTER', this.resultsConfirm);
    this.input.keyboard.off('keydown-SPACE', this.resultsConfirm);
    this.input.keyboard.off('keydown-R', this.resultsQuickRetry);

    if (!this.completionOverlay) return;

    // Destroy all overlay elements
    this.completionOverlay.overlay.destroy();
    this.completionOverlay.title.destroy();
    this.completionOverlay.levelInfo.destroy();
    this.completionOverlay.rankText.destroy();
    this.completionOverlay.rankDesc.destroy();
    this.completionOverlay.statsElements.forEach(el => el.destroy());
    this.completionOverlay.menuTexts.forEach(text => text.destroy());
    this.completionOverlay.arrow.destroy();
    this.completionOverlay.hint.destroy();

    this.completionOverlay = null;
  }

  /**
   * Advance to the next level or end game
   */
  advanceToNextLevel() {
    // Special case: Intro level advances to 1-1
    if (this.currentWorld === 0 && this.currentLevel === 0) {
      console.log('📍 Completing intro level, advancing to 1-1');
      this.scene.restart({
        world: 1,
        level: 1,
        levelKey: 'level-1-1'
      });
      return;
    }

    // Determine next level
    let nextWorld = this.currentWorld;
    let nextLevel = this.currentLevel + 1;

    // Check if we need to advance to next world
    if (nextLevel > 3) {
      nextLevel = 1;
      nextWorld++;
    }

    // Check if game is complete (only world 1 exists for MVP)
    if (nextWorld > 1) {
      console.log('🎊 Game Complete! All levels finished!');
      // For now, restart from 1-1
      nextWorld = 1;
      nextLevel = 1;
    }

    const nextLevelKey = `level-${nextWorld}-${nextLevel}`;

    // Check if next level exists
    if (this.cache.json.has(nextLevelKey)) {
      console.log(`📍 Loading next level: ${nextWorld}-${nextLevel}`);
      this.scene.restart({
        world: nextWorld,
        level: nextLevel,
        levelKey: nextLevelKey
      });
    } else {
      console.log(`⚠️ Level ${nextLevelKey} not found. Restarting from 1-1.`);
      this.scene.restart({
        world: 1,
        level: 1,
        levelKey: 'level-1-1'
      });
    }
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
      console.log(`💔 Player damaged! Health: ${this.player.currentHealth}/${this.player.maxHealth}`);
    }
  }

  /**
   * Handle player death
   */
  handlePlayerDeath() {
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
