import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import Player from '../entities/Player.js';

/**
 * GameScene - Main gameplay scene
 * Handles player movement, level rendering, and game logic
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // TODO: Load game assets
    console.log('🎮 GameScene: Preloading assets...');
  }

  create() {
    console.log('🎮 GameScene: Initializing...');

    // Create a simple ground platform for testing
    this.createTestLevel();

    // Create the player
    this.player = new Player(this, 160, 100);

    // Setup camera
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
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

  createTestLevel() {
    // Create a physics group for platforms
    this.platforms = this.physics.add.staticGroup();

    // Ground platform
    const groundY = 160;
    for (let x = 0; x < GAME_CONFIG.GAME_WIDTH; x += 16) {
      const platform = this.add.rectangle(x, groundY, 16, 8, 0x4a5568);
      this.platforms.add(platform);
    }

    // Some floating platforms for testing jumps
    this.addPlatform(80, 120, 48, 8);
    this.addPlatform(200, 100, 48, 8);
    this.addPlatform(140, 80, 32, 8);

    // Refresh the static body bounds
    this.platforms.refresh();
  }

  addPlatform(x, y, width, height) {
    const platform = this.add.rectangle(x, y, width, height, 0x64748b);
    this.platforms.add(platform);
    return platform;
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
