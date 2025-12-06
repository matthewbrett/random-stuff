import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';
import audioManager from '../systems/AudioManager.js';

/**
 * BootScene - Initial loading and setup scene
 * This scene will eventually handle asset loading and initialization
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    console.log('🎮 BootScene: Preloading assets...');

    // Preload audio assets
    audioManager.preload(this);
  }

  create() {
    console.log('🎮 BootScene: Initializing...');

    // Initialize AudioManager
    audioManager.init(this);

    // Display a simple text message to verify Phaser is working
    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    // Title text
    const titleText = createCenteredText(this, centerX, centerY - 20, 'BRICKWAVE', TextStyles.title);

    // Subtitle
    const subtitleText = createCenteredText(this, centerX, centerY + 10, 'Phase 1: Setup Complete', TextStyles.subtitle);

    // Version info
    const versionText = createCenteredText(this, centerX, centerY + 30, 'Press SPACE to continue', TextStyles.hint);

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
      this.scene.start('TitleScene');
    });

    // Auto-start after 1 second for easier development
    this.time.delayedCall(1000, () => {
      this.scene.start('TitleScene');
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

    const debugText = createSmoothText(this, 10, 10, debugInfo.join('\n'), {
      ...TextStyles.debug,
      color: '#666666',
      backgroundColor: 'transparent',
    });
  }

  update(time, delta) {
    // Update loop - currently unused
  }
}
