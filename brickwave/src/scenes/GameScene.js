import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import Player from '../entities/Player.js';
import LevelLoader from '../systems/LevelLoader.js';

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

    // Create level loader
    this.levelLoader = new LevelLoader(this);

    // Load the level
    const levelData = this.cache.json.get('testLevel1');
    const levelInfo = this.levelLoader.loadLevel(levelData);

    // Store collision groups for easy access
    this.platforms = levelInfo.collisionTiles;
    this.oneWayPlatforms = levelInfo.oneWayPlatforms;

    // Get player spawn point from level
    const spawnPoint = this.levelLoader.getSpawnPoint('player');

    // Create the player
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);

    // Setup camera with level boundaries
    this.cameras.main.setBounds(0, 0, levelInfo.width, levelInfo.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

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

  update(time, delta) {
    if (this.player) {
      this.player.update(time, delta);

      // Update debug text
      const debugInfo = [
        `Pos: ${Math.round(this.player.sprite.x)}, ${Math.round(this.player.sprite.y)}`,
        `Vel: ${Math.round(this.player.sprite.body.velocity.x)}, ${Math.round(this.player.sprite.body.velocity.y)}`,
        `Ground: ${this.player.isGrounded}`,
        `Echo: ${this.player.echoCharges}`,
        `Dash: ${this.player.isDashing ? 'YES' : 'NO'}`,
      ];
      this.debugText.setText(debugInfo.join('\n'));
    }
  }
}
