import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import Player from '../entities/Player.js';
import LevelLoader from '../systems/LevelLoader.js';
import PhaseManager from '../systems/PhaseManager.js';
import PhaseIndicator from '../systems/PhaseIndicator.js';

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

    // Create the player
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);

    // Setup collision with phase bricks
    this.setupPhaseBrickCollision();

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

    // Add debug text
    this.debugText = this.add.text(10, 10, '', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
  }

  setupPhaseBrickCollision() {
    // Add collision between player and each phase brick
    // We need to handle each brick individually because they can phase independently
    this.phaseBricks.forEach(brick => {
      this.physics.add.collider(
        this.player.sprite,
        brick.body,
        null,
        () => {
          // Only collide if the brick is solid
          return brick.isSolid();
        },
        this
      );
    });
  }

  update(time, delta) {
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

    // Update player
    if (this.player) {
      this.player.update(time, delta);

      // Update debug text
      const phaseState = this.phaseManager ? this.phaseManager.getCurrentPhase(0) : 'N/A';
      const debugInfo = [
        `Pos: ${Math.round(this.player.sprite.x)}, ${Math.round(this.player.sprite.y)}`,
        `Vel: ${Math.round(this.player.sprite.body.velocity.x)}, ${Math.round(this.player.sprite.body.velocity.y)}`,
        `Ground: ${this.player.isGrounded}`,
        `Echo: ${this.player.echoCharges}`,
        `Dash: ${this.player.isDashing ? 'YES' : 'NO'}`,
        `Phase: ${phaseState}`,
      ];
      this.debugText.setText(debugInfo.join('\n'));
    }
  }
}
