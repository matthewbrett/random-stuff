import { GAME_CONFIG, SCALE } from '../config.js';
import { TextStyles, createSmoothText, createCenteredText } from '../utils/TextStyles.js';
import MenuController from './MenuController.js';

/**
 * PauseMenuManager - Handles pause menu UI and navigation
 * Extracted from GameScene to follow Single Responsibility Principle
 */
export default class PauseMenuManager {
  /**
   * Create a pause menu manager
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    this.scene = scene;
    this.menuController = new MenuController(['RESUME', 'RESTART', 'LEVEL SELECT', 'QUIT TO TITLE']);
    this.overlay = null;
    this.visible = false;

    // Bind navigation methods for keyboard listeners
    this.boundNavigateUp = this.navigateUp.bind(this);
    this.boundNavigateDown = this.navigateDown.bind(this);
    this.boundConfirm = this.handleConfirm.bind(this);
  }

  /**
   * Show the pause menu
   * @param {object} stats - Current game stats { world, level, time, score }
   */
  show(stats) {
    if (this.visible) return;
    this.visible = true;
    this.menuController.reset();

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Semi-transparent overlay
    const overlayGraphics = this.scene.add.graphics();
    overlayGraphics.fillStyle(0x000000, 0.85);
    overlayGraphics.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlayGraphics.setScrollFactor(0);
    overlayGraphics.setDepth(3000);

    // Pause title
    const title = createCenteredText(
      this.scene,
      centerX,
      35 * SCALE,
      'PAUSED',
      TextStyles.title
    );
    title.setScrollFactor(0);
    title.setDepth(3001);

    // Current level info
    const levelInfo = createCenteredText(
      this.scene,
      centerX,
      55 * SCALE,
      `World ${stats.world}-${stats.level}`,
      TextStyles.hint
    );
    levelInfo.setScrollFactor(0);
    levelInfo.setDepth(3001);

    // Current stats
    const statsText = createCenteredText(
      this.scene,
      centerX,
      70 * SCALE,
      `Time: ${stats.time} | Score: ${stats.score}`,
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );
    statsText.setScrollFactor(0);
    statsText.setDepth(3001);

    // Menu items
    const menuStartY = 90 * SCALE;
    const menuSpacing = 14 * SCALE;
    const menuTexts = [];
    const items = ['RESUME', 'RESTART', 'LEVEL SELECT', 'QUIT TO TITLE'];

    items.forEach((item, index) => {
      const isSelected = index === this.menuController.getSelectedIndex();
      const style = isSelected ? TextStyles.menuItemSelected : TextStyles.menuItem;

      const text = createCenteredText(
        this.scene,
        centerX,
        menuStartY + index * menuSpacing,
        item,
        style
      );
      text.setScrollFactor(0);
      text.setDepth(3001);
      menuTexts.push(text);
    });

    // Selection arrow
    const arrow = createCenteredText(
      this.scene,
      centerX - 60 * SCALE,
      menuStartY,
      '>',
      TextStyles.menuItemSelected
    );
    arrow.setScrollFactor(0);
    arrow.setDepth(3001);

    // Pulse the arrow
    this.scene.tweens.add({
      targets: arrow,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Controls hint
    const hint = createCenteredText(
      this.scene,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'R: Instant Restart',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
    );
    hint.setScrollFactor(0);
    hint.setDepth(3001);

    // Store references for cleanup
    this.overlay = {
      graphics: overlayGraphics,
      title,
      levelInfo,
      statsText,
      menuTexts,
      arrow,
      hint,
      menuStartY,
      menuSpacing
    };

    // Setup keyboard navigation
    this.setupInput();
  }

  /**
   * Hide the pause menu
   */
  hide() {
    if (!this.visible || !this.overlay) return;
    this.visible = false;

    // Remove input listeners
    this.removeInput();

    // Destroy all overlay elements
    this.overlay.graphics.destroy();
    this.overlay.title.destroy();
    this.overlay.levelInfo.destroy();
    this.overlay.statsText.destroy();
    this.overlay.menuTexts.forEach(text => text.destroy());
    this.overlay.arrow.destroy();
    this.overlay.hint.destroy();

    this.overlay = null;
  }

  /**
   * Navigate up in the menu
   */
  navigateUp() {
    if (!this.visible) return;
    this.menuController.moveUp();
    this.updateSelection();
  }

  /**
   * Navigate down in the menu
   */
  navigateDown() {
    if (!this.visible) return;
    this.menuController.moveDown();
    this.updateSelection();
  }

  /**
   * Handle confirm action
   * Emits an event with the selected action
   */
  handleConfirm() {
    if (!this.visible) return;
    const action = this.confirm();
    this.scene.events.emit('pauseMenuAction', action);
  }

  /**
   * Get the action for current selection
   * @returns {string} Action: 'resume', 'restart', 'level_select', or 'quit'
   */
  confirm() {
    const selected = this.menuController.getSelectedItem();

    switch (selected) {
      case 'RESUME':
        return 'resume';
      case 'RESTART':
        return 'restart';
      case 'LEVEL SELECT':
        return 'level_select';
      case 'QUIT TO TITLE':
        return 'quit';
      default:
        return 'resume';
    }
  }

  /**
   * Check if the pause menu is currently visible
   * @returns {boolean} Visibility state
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Update menu selection visuals
   */
  updateSelection() {
    if (!this.overlay) return;

    const selectedIndex = this.menuController.getSelectedIndex();

    // Update menu item styles
    this.overlay.menuTexts.forEach((text, index) => {
      const isSelected = index === selectedIndex;
      text.setStyle(isSelected ? TextStyles.menuItemSelected : TextStyles.menuItem);
    });

    // Move arrow
    this.overlay.arrow.y = this.overlay.menuStartY + selectedIndex * this.overlay.menuSpacing;
  }

  /**
   * Setup keyboard input for menu navigation
   */
  setupInput() {
    const keyboard = this.scene.input.keyboard;
    keyboard.on('keydown-UP', this.boundNavigateUp);
    keyboard.on('keydown-DOWN', this.boundNavigateDown);
    keyboard.on('keydown-W', this.boundNavigateUp);
    keyboard.on('keydown-S', this.boundNavigateDown);
    keyboard.on('keydown-ENTER', this.boundConfirm);
    keyboard.on('keydown-SPACE', this.boundConfirm);
  }

  /**
   * Remove keyboard input listeners
   */
  removeInput() {
    const keyboard = this.scene.input.keyboard;
    keyboard.off('keydown-UP', this.boundNavigateUp);
    keyboard.off('keydown-DOWN', this.boundNavigateDown);
    keyboard.off('keydown-W', this.boundNavigateUp);
    keyboard.off('keydown-S', this.boundNavigateDown);
    keyboard.off('keydown-ENTER', this.boundConfirm);
    keyboard.off('keydown-SPACE', this.boundConfirm);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.hide();
  }
}
