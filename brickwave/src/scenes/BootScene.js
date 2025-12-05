import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';

/**
 * BootScene - Initial loading and setup scene
 * This scene will eventually handle asset loading and initialization
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: Load initial assets here
    console.log('🎮 BootScene: Preloading assets...');
  }

  create() {
    console.log('🎮 BootScene: Initializing...');

    // Display a simple text message to verify Phaser is working
    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    // Title text
    const titleText = this.add.text(centerX, centerY - 20, 'BRICKWAVE', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#00ffff',
      align: 'center',
    });
    titleText.setOrigin(0.5);

    // Subtitle
    const subtitleText = this.add.text(centerX, centerY + 10, 'Phase 1: Setup Complete', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#ffffff',
      align: 'center',
    });
    subtitleText.setOrigin(0.5);

    // Version info
    const versionText = this.add.text(centerX, centerY + 30, 'Press SPACE to continue', {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#888888',
      align: 'center',
    });
    versionText.setOrigin(0.5);

    // Add a pulsing effect to the continue text
    this.tweens.add({
      targets: versionText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Setup input
    this.input.keyboard.once('keydown-SPACE', () => {
      console.log('🎮 BootScene: Space pressed - ready for next phase!');
      // TODO: Transition to MainMenu scene when it's created
    });

    // Display some debug info
    this.displayDebugInfo();
  }

  displayDebugInfo() {
    const debugInfo = [
      `Resolution: ${GAME_CONFIG.GAME_WIDTH}x${GAME_CONFIG.GAME_HEIGHT}`,
      `FPS Target: 60`,
      `Physics: Arcade (${GAME_CONFIG.GRAVITY} gravity)`,
    ];

    const debugText = this.add.text(10, 10, debugInfo.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#666666',
    });
  }

  update(time, delta) {
    // Update loop - currently unused
  }
}
