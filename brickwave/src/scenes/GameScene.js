import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import Player from '../entities/Player.js';
import Coin from '../entities/Coin.js';
import LevelLoader from '../systems/LevelLoader.js';
import PhaseManager from '../systems/PhaseManager.js';
import PhaseIndicator from '../systems/PhaseIndicator.js';
import ScoreManager from '../systems/ScoreManager.js';
import GameHUD from '../systems/GameHUD.js';
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

    // Load the test level
    this.load.json('testLevel1', '/assets/levels/test-level-1.json');
  }

  create() {
    console.log('🎮 GameScene: Initializing...');

    // Create score manager
    this.scoreManager = new ScoreManager(this);

    // Create phase manager
    this.phaseManager = new PhaseManager(this);

    // Create level loader
    this.levelLoader = new LevelLoader(this);

    // Load the level
    const levelData = this.cache.json.get('testLevel1');
    const levelInfo = this.levelLoader.loadLevel(levelData);

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

    // Setup coin collision
    this.setupCoinCollision();

    // Setup camera with level boundaries
    this.cameras.main.setBounds(0, 0, levelInfo.width, levelInfo.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Add phase indicator (only if there are phase bricks)
    if (this.phaseBricks.length > 0) {
      this.phaseIndicator = new PhaseIndicator(
        this,
        this.phaseManager,
        GAME_CONFIG.GAME_WIDTH / 2, // Center horizontally
        20, // Near top of screen
        0 // Group 0 (default)
      );
    }

    // Create HUD
    this.hud = new GameHUD(this, this.scoreManager);
    this.hud.setWorld(1, 1); // World 1-1

    // Start level timer
    this.scoreManager.startTimer();

    // Add debug text
    this.debugText = createSmoothText(this, 10, 10, '', TextStyles.debug);
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
      // Create a line of test coins
      for (let i = 0; i < 10; i++) {
        const coin = new Coin(this, 50 + i * 20, 100);
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

    // Update player
    if (this.player) {
      this.player.update(time, delta);

      // Check coin collection
      this.checkCoinCollection();

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
}
