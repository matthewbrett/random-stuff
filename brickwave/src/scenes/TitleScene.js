import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';
import audioManager from '../systems/AudioManager.js';
import transitionManager from '../systems/TransitionManager.js';

/**
 * TitleScene - Main menu and title screen
 *
 * Features:
 * - Game logo with animated effects
 * - Main menu (Start Game, Level Select, Settings, Credits)
 * - Keyboard and mouse navigation
 * - Attract mode demo (auto-plays after idle)
 */
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });

    this.menuItems = ['START GAME', 'LEVEL SELECT', 'SETTINGS', 'CREDITS'];
    this.selectedIndex = 0;
    this.idleTimer = 0;
    this.attractModeDelay = 30000; // 30 seconds before attract mode
  }

  create() {
    console.log('🎮 TitleScene: Creating title screen...');

    // Initialize audio manager with this scene
    audioManager.init(this);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Create background with gradient effect
    this.createBackground();

    // Create animated logo
    this.createLogo(centerX);

    // Create menu
    this.createMenu(centerX);

    // Create footer (version, controls hint)
    this.createFooter(centerX);

    // Setup input
    this.setupInput();

    // Reset idle timer
    this.idleTimer = 0;

    // Fade in transition
    transitionManager.init(this);
    transitionManager.fadeIn({ duration: 300 });
  }

  /**
   * Create animated background
   */
  createBackground() {
    // Dark gradient background
    const graphics = this.add.graphics();

    // Create gradient from dark blue to darker blue
    const topColor = Phaser.Display.Color.ValueToColor('#1a1a2e');
    const bottomColor = Phaser.Display.Color.ValueToColor('#0a0a14');

    for (let y = 0; y < GAME_CONFIG.GAME_HEIGHT; y++) {
      const progress = y / GAME_CONFIG.GAME_HEIGHT;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        topColor, bottomColor, 100, Math.floor(progress * 100)
      );
      const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
      graphics.fillStyle(hexColor, 1);
      graphics.fillRect(0, y, GAME_CONFIG.GAME_WIDTH, 1);
    }

    // Add some floating particles for atmosphere
    this.createFloatingParticles();
  }

  /**
   * Create floating particles for visual interest
   */
  createFloatingParticles() {
    this.particles = [];
    const numParticles = 20;

    for (let i = 0; i < numParticles; i++) {
      const particle = this.add.graphics();
      const size = Phaser.Math.Between(1, 3) * SCALE;
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);

      particle.fillStyle(0x00ffff, alpha);
      particle.fillCircle(0, 0, size);

      particle.x = Phaser.Math.Between(0, GAME_CONFIG.GAME_WIDTH);
      particle.y = Phaser.Math.Between(0, GAME_CONFIG.GAME_HEIGHT);
      particle.setData('speedY', Phaser.Math.FloatBetween(-0.2, -0.5) * SCALE);
      particle.setData('speedX', Phaser.Math.FloatBetween(-0.1, 0.1) * SCALE);
      particle.setData('size', size);

      this.particles.push(particle);
    }
  }

  /**
   * Create the game logo with animation
   */
  createLogo(centerX) {
    // Main title
    this.titleText = createCenteredText(
      this,
      centerX,
      45 * SCALE,
      'BRICKWAVE',
      TextStyles.title
    );

    // Add glow effect via drop shadow
    this.titleText.setShadow(0, 0, '#00ffff', 8 * SCALE, true, true);

    // Subtle floating animation
    this.tweens.add({
      targets: this.titleText,
      y: this.titleText.y + 3 * SCALE,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tagline
    this.taglineText = createCenteredText(
      this,
      centerX,
      70 * SCALE,
      'Phase through the rhythm',
      TextStyles.hint
    );
  }

  /**
   * Create the main menu
   */
  createMenu(centerX) {
    const startY = 95 * SCALE;
    const spacing = 16 * SCALE;

    this.menuTexts = [];

    this.menuItems.forEach((item, index) => {
      const text = createCenteredText(
        this,
        centerX,
        startY + index * spacing,
        item,
        index === this.selectedIndex ? TextStyles.menuItemSelected : TextStyles.menuItem
      );

      // Add hover interactivity
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.selectMenuItem(index));
      text.on('pointerdown', () => this.confirmSelection());

      this.menuTexts.push(text);
    });

    // Create selection indicator (arrow)
    this.selectionArrow = createCenteredText(
      this,
      centerX - 70 * SCALE,
      startY,
      '>',
      TextStyles.menuItemSelected
    );

    // Pulse the arrow
    this.tweens.add({
      targets: this.selectionArrow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.updateMenuSelection();
  }

  /**
   * Create footer with version and controls
   */
  createFooter(centerX) {
    // Controls hint
    const controlsText = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 20 * SCALE,
      'Arrow Keys / Enter to select',
      TextStyles.hint
    );

    // Version info (bottom right)
    const versionText = createSmoothText(
      this,
      GAME_CONFIG.GAME_WIDTH - 4 * SCALE,
      GAME_CONFIG.GAME_HEIGHT - 10 * SCALE,
      'v0.8.0',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );
    versionText.setOrigin(1, 1);
  }

  /**
   * Setup keyboard and mouse input
   */
  setupInput() {
    // Keyboard navigation
    this.input.keyboard.on('keydown-UP', () => {
      this.selectMenuItem(this.selectedIndex - 1);
      this.resetIdleTimer();
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectMenuItem(this.selectedIndex + 1);
      this.resetIdleTimer();
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.confirmSelection();
      this.resetIdleTimer();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      this.confirmSelection();
      this.resetIdleTimer();
    });

    // W/S for navigation (WASD support)
    this.input.keyboard.on('keydown-W', () => {
      this.selectMenuItem(this.selectedIndex - 1);
      this.resetIdleTimer();
    });

    this.input.keyboard.on('keydown-S', () => {
      this.selectMenuItem(this.selectedIndex + 1);
      this.resetIdleTimer();
    });

    // Any input resets idle timer
    this.input.on('pointerdown', () => this.resetIdleTimer());
    this.input.on('pointermove', () => this.resetIdleTimer());
  }

  /**
   * Select a menu item by index
   */
  selectMenuItem(index) {
    // Wrap around
    if (index < 0) index = this.menuItems.length - 1;
    if (index >= this.menuItems.length) index = 0;

    // Only play sound if selection changed
    if (index !== this.selectedIndex) {
      audioManager.playMenuSelect();
    }

    this.selectedIndex = index;
    this.updateMenuSelection();
  }

  /**
   * Update visual state of menu selection
   */
  updateMenuSelection() {
    const startY = 95 * SCALE;
    const spacing = 16 * SCALE;

    this.menuTexts.forEach((text, index) => {
      if (index === this.selectedIndex) {
        text.setStyle(TextStyles.menuItemSelected);
      } else {
        text.setStyle(TextStyles.menuItem);
      }
    });

    // Move selection arrow
    if (this.selectionArrow) {
      this.selectionArrow.y = startY + this.selectedIndex * spacing;
    }
  }

  /**
   * Confirm current selection
   */
  confirmSelection() {
    const selected = this.menuItems[this.selectedIndex];

    // Play confirm sound
    audioManager.playMenuConfirm();

    // Flash effect on selection
    this.cameras.main.flash(100, 0, 255, 255, true);

    switch (selected) {
      case 'START GAME':
        this.startGame();
        break;
      case 'LEVEL SELECT':
        this.openLevelSelect();
        break;
      case 'SETTINGS':
        this.openSettings();
        break;
      case 'CREDITS':
        this.showCredits();
        break;
    }
  }

  /**
   * Start the game (level 1-1)
   */
  startGame() {
    this.scene.start('GameScene', {
      world: 1,
      level: 1,
      levelKey: 'level-1-1'
    });
  }

  /**
   * Open level select screen
   */
  openLevelSelect() {
    this.scene.start('LevelSelectScene');
  }

  /**
   * Open settings menu
   */
  openSettings() {
    this.scene.start('SettingsScene');
  }

  /**
   * Show credits overlay
   */
  showCredits() {
    // Create overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setDepth(100);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Credits title
    const creditsTitle = createCenteredText(
      this,
      centerX,
      30 * SCALE,
      'CREDITS',
      TextStyles.subtitle
    );
    creditsTitle.setDepth(101);

    // Credits content
    const creditsContent = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2,
      'BRICKWAVE\n\n' +
      'A pixel platformer with\nphase brick mechanics\n\n' +
      'Built with Phaser 3\n\n' +
      'Music & SFX: TBD\n' +
      'Art: Procedural Pixel Art',
      TextStyles.body
    );
    creditsContent.setDepth(101);

    // Close hint
    const closeHint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 20 * SCALE,
      'Press any key to close',
      TextStyles.hint
    );
    closeHint.setDepth(101);

    // Pulse animation
    this.tweens.add({
      targets: closeHint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Close on any key/click
    const closeCredits = () => {
      overlay.destroy();
      creditsTitle.destroy();
      creditsContent.destroy();
      closeHint.destroy();
      this.input.keyboard.off('keydown', closeCredits);
      this.input.off('pointerdown', closeCredits);
    };

    this.input.keyboard.once('keydown', closeCredits);
    this.input.once('pointerdown', closeCredits);
  }

  /**
   * Reset the idle timer
   */
  resetIdleTimer() {
    this.idleTimer = 0;
  }

  /**
   * Start attract mode (auto-play demo)
   */
  startAttractMode() {
    // For MVP, just start the first level
    // In future, this could show a recorded demo
    console.log('Starting attract mode demo...');
    this.scene.start('GameScene', {
      world: 1,
      level: 1,
      levelKey: 'level-1-1',
      attractMode: true
    });
  }

  update(time, delta) {
    // Update floating particles
    if (this.particles) {
      this.particles.forEach(particle => {
        particle.y += particle.getData('speedY');
        particle.x += particle.getData('speedX');

        // Wrap around
        if (particle.y < -10) {
          particle.y = GAME_CONFIG.GAME_HEIGHT + 10;
          particle.x = Phaser.Math.Between(0, GAME_CONFIG.GAME_WIDTH);
        }
        if (particle.x < -10) particle.x = GAME_CONFIG.GAME_WIDTH + 10;
        if (particle.x > GAME_CONFIG.GAME_WIDTH + 10) particle.x = -10;
      });
    }

    // Update idle timer for attract mode
    this.idleTimer += delta;
    if (this.idleTimer >= this.attractModeDelay) {
      // Disable attract mode for now - can be enabled later
      // this.startAttractMode();
      this.idleTimer = 0; // Reset to prevent repeated triggers
    }
  }
}
