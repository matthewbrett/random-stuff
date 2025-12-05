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
import { TextStyles, createSmoothText } from '../utils/TextStyles.js';

/**
 * GameScene - Main gameplay scene
 * Handles player movement, level rendering, and game logic
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    console.log('🎮 GameScene: Preloading assets...');

    // Load all levels
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

    // Start level timer
    this.scoreManager.startTimer();

    // Add debug text (scaled position)
    this.debugText = createSmoothText(this, 10 * SCALE, 10 * SCALE, '', TextStyles.debug);
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
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

      // Update debug text
      const phaseState = this.phaseManager ? this.phaseManager.getCurrentPhase(0) : 'N/A';
      const echoCharges = this.scoreManager ? this.scoreManager.getEchoCharges() : 0;
      const debugInfo = [
        `Pos: ${Math.round(this.player.sprite.x)}, ${Math.round(this.player.sprite.y)}`,
        `Vel: ${Math.round(this.player.sprite.body.velocity.x)}, ${Math.round(this.player.sprite.body.velocity.y)}`,
        `Ground: ${this.player.isGrounded}`,
        `Echo: ${echoCharges}`,
        `Dash: ${this.player.isDashing ? 'YES' : 'NO'}`,
        `Phase: ${phaseState}`,
        `Score: ${this.scoreManager.getScore()}`,
        `Coins: ${this.scoreManager.getCoinsCollected()}`,
      ];
      this.debugText.setText(debugInfo.join('\n'));
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
        const score = coin.collect();
        this.scoreManager.collectCoin(score);

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
        const shardIndex = shard.collect();
        if (shardIndex >= 0) {
          this.scoreManager.collectKeyShard(shardIndex);
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

    // Show level complete HUD
    this.time.delayedCall(1000, () => {
      if (this.hud) {
        this.hud.showLevelComplete();
      }
    });

    console.log('🎉 Level Complete!');
    console.log(`World ${this.currentWorld}-${this.currentLevel} completed!`);
    console.log(`Time: ${this.scoreManager.getFormattedTime()}`);
    console.log(`Key Shards: ${this.scoreManager.getKeyShardCount()}/3`);
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
    // Flash the player red
    this.player.sprite.setTint(0xff0000);

    this.time.delayedCall(200, () => {
      if (this.player && this.player.sprite) {
        this.player.sprite.clearTint();
      }
    });

    // TODO: Implement player health/death system in a later phase
    console.log('💔 Player damaged!');
  }
}
