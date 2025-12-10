import { GAME_CONFIG, SCALE } from '../config.js';
import { TextStyles, createSmoothText, createCenteredText } from '../utils/TextStyles.js';
import MenuController from './MenuController.js';

/**
 * CompletionScreenManager - Handles level completion UI and navigation
 * Extracted from GameScene to follow Single Responsibility Principle
 */
export default class CompletionScreenManager {
  /**
   * Create a completion screen manager
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    this.scene = scene;
    this.menuController = new MenuController(['NEXT LEVEL', 'RETRY', 'LEVEL SELECT', 'QUIT']);
    this.overlay = null;
    this.visible = false;

    // Bind navigation methods for keyboard listeners
    this.boundNavigateUp = this.navigateUp.bind(this);
    this.boundNavigateDown = this.navigateDown.bind(this);
    this.boundConfirm = this.handleConfirm.bind(this);
    this.boundQuickRetry = this.handleQuickRetry.bind(this);
  }

  /**
   * Calculate rank based on performance
   * @param {object} stats - Performance stats
   * @param {number} stats.timeSeconds - Time taken in seconds
   * @param {number} stats.targetTime - Target time for the level
   * @param {number} stats.keyShards - Number of key shards collected
   * @param {number} stats.totalScore - Total score achieved
   * @returns {object} Rank info with letter, color, and description
   */
  calculateRank(stats) {
    const { timeSeconds, targetTime, keyShards, totalScore } = stats;

    // S Rank: Under target time, all shards, high score
    if (timeSeconds <= targetTime * 0.6 && keyShards === 3) {
      return { letter: 'S', color: '#ffff00', description: 'PERFECT!' };
    }
    // A Rank: Under target time or all shards
    if (timeSeconds <= targetTime * 0.8 || keyShards === 3) {
      return { letter: 'A', color: '#00ff00', description: 'EXCELLENT!' };
    }
    // B Rank: Under target time or 2+ shards
    if (timeSeconds <= targetTime || keyShards >= 2) {
      return { letter: 'B', color: '#00ffff', description: 'GREAT!' };
    }
    // C Rank: Completed with some effort
    if (keyShards >= 1 || totalScore >= 500) {
      return { letter: 'C', color: '#ffffff', description: 'GOOD' };
    }
    // D Rank: Just completed
    return { letter: 'D', color: '#888888', description: 'CLEAR' };
  }

  /**
   * Show the completion screen
   * @param {object} stats - Game completion stats
   * @param {number} stats.world - Current world number
   * @param {number} stats.level - Current level number
   * @param {string} stats.formattedTime - Formatted time string
   * @param {number} stats.timeSeconds - Time in seconds (for rank calculation)
   * @param {number} stats.targetTime - Target time for level
   * @param {number} stats.keyShards - Key shards collected
   * @param {number} stats.score - Base score
   * @param {number} stats.timeBonus - Time bonus points
   * @param {number} stats.styleBonus - Style bonus points
   * @param {number} stats.totalScore - Total score
   */
  show(stats) {
    if (this.visible) return;
    this.visible = true;
    this.menuController.reset();

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Calculate rank
    const rank = this.calculateRank(stats);

    // Create semi-transparent overlay
    const overlayGraphics = this.scene.add.graphics();
    overlayGraphics.fillStyle(0x000000, 0.85);
    overlayGraphics.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlayGraphics.setScrollFactor(0);
    overlayGraphics.setDepth(2000);

    // Title
    const title = createCenteredText(
      this.scene,
      centerX,
      15 * SCALE,
      'LEVEL COMPLETE!',
      { ...TextStyles.subtitle, fontSize: `${16 * SCALE}px` }
    );
    title.setScrollFactor(0);
    title.setDepth(2001);

    // Level info
    const levelInfo = createCenteredText(
      this.scene,
      centerX,
      30 * SCALE,
      `World ${stats.world}-${stats.level}`,
      TextStyles.hint
    );
    levelInfo.setScrollFactor(0);
    levelInfo.setDepth(2001);

    // Rank display (big letter)
    const rankText = createCenteredText(
      this.scene,
      centerX - 50 * SCALE,
      60 * SCALE,
      rank.letter,
      { ...TextStyles.rank, fontSize: `${36 * SCALE}px`, color: rank.color }
    );
    rankText.setScrollFactor(0);
    rankText.setDepth(2001);

    // Rank description
    const rankDesc = createCenteredText(
      this.scene,
      centerX - 50 * SCALE,
      85 * SCALE,
      rank.description,
      { ...TextStyles.hint, color: rank.color }
    );
    rankDesc.setScrollFactor(0);
    rankDesc.setDepth(2001);

    // Stats on the right side
    const statsX = centerX + 30 * SCALE;
    const statsStartY = 45 * SCALE;
    const statsLineHeight = 10 * SCALE;

    const statsData = [
      { label: 'Time', value: stats.formattedTime },
      { label: 'Shards', value: `${stats.keyShards}/3` },
      { label: 'Score', value: `${stats.score}` },
      { label: 'Time +', value: `${stats.timeBonus}` },
      { label: 'Style +', value: `${Math.floor(stats.styleBonus)}` },
    ];

    const statsElements = [];
    statsData.forEach((stat, index) => {
      const y = statsStartY + index * statsLineHeight;

      const label = createSmoothText(
        this.scene,
        statsX - 30 * SCALE,
        y,
        stat.label,
        { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, align: 'right' }
      );
      label.setOrigin(1, 0);
      label.setScrollFactor(0);
      label.setDepth(2001);
      statsElements.push(label);

      const value = createSmoothText(
        this.scene,
        statsX - 25 * SCALE,
        y,
        stat.value,
        { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#00ffff' }
      );
      value.setScrollFactor(0);
      value.setDepth(2001);
      statsElements.push(value);
    });

    // Total score
    const totalY = statsStartY + statsData.length * statsLineHeight + 5 * SCALE;
    const totalLabel = createSmoothText(
      this.scene,
      statsX - 30 * SCALE,
      totalY,
      'TOTAL',
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#ffffff', align: 'right' }
    );
    totalLabel.setOrigin(1, 0);
    totalLabel.setScrollFactor(0);
    totalLabel.setDepth(2001);
    statsElements.push(totalLabel);

    const totalValue = createSmoothText(
      this.scene,
      statsX - 25 * SCALE,
      totalY,
      `${stats.totalScore}`,
      { ...TextStyles.hint, fontSize: `${8 * SCALE}px`, color: '#ffff00' }
    );
    totalValue.setScrollFactor(0);
    totalValue.setDepth(2001);
    statsElements.push(totalValue);

    // Menu options
    const menuStartY = 115 * SCALE;
    const menuSpacing = 12 * SCALE;
    const menuTexts = [];
    const items = ['NEXT LEVEL', 'RETRY', 'LEVEL SELECT', 'QUIT'];

    items.forEach((item, index) => {
      const isSelected = index === this.menuController.getSelectedIndex();
      const style = isSelected ?
        { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` } :
        { ...TextStyles.menuItem, fontSize: `${10 * SCALE}px` };

      const text = createCenteredText(
        this.scene,
        centerX,
        menuStartY + index * menuSpacing,
        item,
        style
      );
      text.setScrollFactor(0);
      text.setDepth(2001);
      menuTexts.push(text);
    });

    // Selection arrow
    const arrow = createCenteredText(
      this.scene,
      centerX - 55 * SCALE,
      menuStartY,
      '>',
      { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` }
    );
    arrow.setScrollFactor(0);
    arrow.setDepth(2001);

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
      GAME_CONFIG.GAME_HEIGHT - 10 * SCALE,
      'R: Quick Retry',
      { ...TextStyles.hint, fontSize: `${7 * SCALE}px` }
    );
    hint.setScrollFactor(0);
    hint.setDepth(2001);

    // Store overlay elements for cleanup
    this.overlay = {
      graphics: overlayGraphics,
      title,
      levelInfo,
      rankText,
      rankDesc,
      statsElements,
      menuTexts,
      arrow,
      hint,
      menuStartY,
      menuSpacing,
      rank
    };

    // Setup keyboard navigation
    this.setupInput();
  }

  /**
   * Hide the completion screen
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
    this.overlay.rankText.destroy();
    this.overlay.rankDesc.destroy();
    this.overlay.statsElements.forEach(el => el.destroy());
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
    this.scene.events.emit('completionMenuAction', action);
  }

  /**
   * Handle quick retry action
   * Emits quick_retry event
   */
  handleQuickRetry() {
    if (!this.visible) return;
    this.scene.events.emit('completionMenuAction', 'quick_retry');
  }

  /**
   * Get the action for current selection
   * @returns {string} Action: 'next_level', 'retry', 'level_select', or 'quit'
   */
  confirm() {
    const selected = this.menuController.getSelectedItem();

    switch (selected) {
      case 'NEXT LEVEL':
        return 'next_level';
      case 'RETRY':
        return 'retry';
      case 'LEVEL SELECT':
        return 'level_select';
      case 'QUIT':
        return 'quit';
      default:
        return 'next_level';
    }
  }

  /**
   * Check if the completion screen is currently visible
   * @returns {boolean} Visibility state
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Get the calculated rank from the last show() call
   * @returns {object|null} Rank info or null if not shown
   */
  getRank() {
    return this.overlay ? this.overlay.rank : null;
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
      text.setStyle(isSelected ?
        { ...TextStyles.menuItemSelected, fontSize: `${10 * SCALE}px` } :
        { ...TextStyles.menuItem, fontSize: `${10 * SCALE}px` }
      );
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
    keyboard.on('keydown-R', this.boundQuickRetry);
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
    keyboard.off('keydown-R', this.boundQuickRetry);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.hide();
  }
}
