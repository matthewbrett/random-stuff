import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';
import audioManager from '../systems/AudioManager.js';

/**
 * GameOverScene - Death screen with retry/quit options
 *
 * Features:
 * - Game over display
 * - Stats display (level, time, score)
 * - Menu: Retry, Level Select, Quit to Title
 * - Navigation with keyboard
 */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });

    this.menuItems = ['RETRY', 'LEVEL SELECT', 'QUIT TO TITLE'];
    this.selectedIndex = 0;
  }

  init(data) {
    // Store level info from GameScene
    this.world = data?.world || 1;
    this.level = data?.level || 1;
    this.levelKey = data?.levelKey || `level-${this.world}-${this.level}`;
    this.time = data?.time || '00:00';
    this.score = data?.score || 0;
  }

  create() {
    console.log('💀 GameOverScene: Creating game over screen...');

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Create background
    this.createBackground();

    // Create game over title
    this.createTitle(centerX);

    // Create stats display
    this.createStats(centerX);

    // Create menu
    this.createMenu(centerX);

    // Create footer
    this.createFooter(centerX);

    // Setup input
    this.setupInput();

    // Initialize AudioManager for this scene
    audioManager.init(this);
  }

  /**
   * Create semi-transparent background
   */
  createBackground() {
    const graphics = this.add.graphics();

    // Dark gradient background
    const topColor = Phaser.Display.Color.ValueToColor('#2a0a0a');
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
  }

  /**
   * Create game over title
   */
  createTitle(centerX) {
    // Main title
    const title = createCenteredText(
      this,
      centerX,
      30 * SCALE,
      'GAME OVER',
      { ...TextStyles.title, fontSize: `${20 * SCALE}px`, color: '#ff6666' }
    );

    // Subtle pulse animation
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Create stats display
   */
  createStats(centerX) {
    const statsY = 60 * SCALE;
    const lineHeight = 12 * SCALE;

    // Level
    createCenteredText(
      this,
      centerX,
      statsY,
      `World ${this.world}-${this.level}`,
      TextStyles.hint
    );

    // Time
    createCenteredText(
      this,
      centerX,
      statsY + lineHeight,
      `Time: ${this.time}`,
      { ...TextStyles.hint, color: '#aaaaaa' }
    );

    // Score
    createCenteredText(
      this,
      centerX,
      statsY + lineHeight * 2,
      `Score: ${this.score}`,
      { ...TextStyles.hint, color: '#00ffff' }
    );
  }

  /**
   * Create menu options
   */
  createMenu(centerX) {
    const menuStartY = 110 * SCALE;
    const menuSpacing = 14 * SCALE;

    this.menuTexts = [];

    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
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
      this.menuTexts.push(text);
    });

    // Selection arrow
    this.arrow = createCenteredText(
      this,
      centerX - 60 * SCALE,
      menuStartY,
      '>',
      { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` }
    );

    // Pulse the arrow
    this.tweens.add({
      targets: this.arrow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Store menu position for arrow updates
    this.menuStartY = menuStartY;
    this.menuSpacing = menuSpacing;
  }

  /**
   * Create footer hint
   */
  createFooter(centerX) {
    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'ESC: Quick Retry',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Setup input handling
   */
  setupInput() {
    // Navigation
    this.input.keyboard.on('keydown-UP', () => this.navigate(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.navigate(1));
    this.input.keyboard.on('keydown-W', () => this.navigate(-1));
    this.input.keyboard.on('keydown-S', () => this.navigate(1));

    // Confirm
    this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());

    // Quick retry
    this.input.keyboard.on('keydown-ESC', () => this.retry());
    this.input.keyboard.on('keydown-R', () => this.retry());
  }

  /**
   * Navigate menu
   */
  navigate(direction) {
    let newIndex = this.selectedIndex + direction;
    newIndex = Math.max(0, Math.min(newIndex, this.menuItems.length - 1));

    if (newIndex !== this.selectedIndex) {
      this.selectedIndex = newIndex;
      this.updateSelection();
    }
  }

  /**
   * Update menu selection visuals
   */
  updateSelection() {
    // Update menu item styles
    this.menuTexts.forEach((text, index) => {
      const isSelected = index === this.selectedIndex;
      text.setStyle(isSelected ?
        { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` } :
        { ...TextStyles.menuItem, fontSize: `${10 * SCALE}px` }
      );
    });

    // Move arrow
    this.arrow.y = this.menuStartY + this.selectedIndex * this.menuSpacing;
  }

  /**
   * Confirm menu selection
   */
  confirmSelection() {
    const selected = this.menuItems[this.selectedIndex];

    switch (selected) {
      case 'RETRY':
        this.retry();
        break;
      case 'LEVEL SELECT':
        this.scene.start('LevelSelectScene');
        break;
      case 'QUIT TO TITLE':
        this.scene.start('TitleScene');
        break;
    }
  }

  /**
   * Retry the level
   */
  retry() {
    // Quick flash effect
    this.cameras.main.flash(50, 255, 255, 255);

    // Restart the GameScene with same level
    this.scene.start('GameScene', {
      world: this.world,
      level: this.level,
      levelKey: this.levelKey
    });
  }

  update(time, delta) {
    // No continuous updates needed for this scene
  }
}
