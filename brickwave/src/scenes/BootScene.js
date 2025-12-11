import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';
import audioManager from '../systems/AudioManager.js';
import saveManager from '../systems/SaveManager.js';

/**
 * BootScene - Initial loading and setup scene
 * This scene will eventually handle asset loading and initialization
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // eslint-disable-next-line no-console
    console.log('🎮 BootScene: Preloading assets...');

    // Preload audio assets
    audioManager.preload(this);
  }

  create() {
    // eslint-disable-next-line no-console
    console.log('🎮 BootScene: Initializing...');

    // Initialize AudioManager
    audioManager.init(this);

    // Initialize SaveManager
    saveManager.init();

    // Check for debug level parameter (?level=2-2)
    const debugLevel = saveManager.checkDebugLevelParam();
    if (debugLevel) {
      // eslint-disable-next-line no-console
      console.log('🎮 BootScene: Debug level skip to', debugLevel);
      this.time.delayedCall(100, () => {
        this.scene.start('GameScene', debugLevel);
      });
      return;
    }

    // Display a simple text message to verify Phaser is working
    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    // Title text
    createCenteredText(this, centerX, centerY - 20, 'BRICKWAVE', TextStyles.title);

    // Subtitle
    createCenteredText(this, centerX, centerY + 10, 'Phase 1: Setup Complete', TextStyles.subtitle);

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

    createSmoothText(this, 10, 10, debugInfo.join('\n'), {
      ...TextStyles.debug,
      color: '#666666',
      backgroundColor: 'transparent',
    });
  }

  update(_time, _delta) {
    // Update loop - currently unused
  }
}
