import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';

/**
 * LevelSelectScene - Level selection screen
 *
 * Features:
 * - World 1 level list (1-1, 1-2, 1-3)
 * - Best times display
 * - Key shards collected indicator
 * - Lock/unlock states (based on progression)
 * - Keyboard and mouse navigation
 */
export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });

    // Level data (will be enhanced with save system in Phase 9)
    this.levels = [
      { id: '1-1', name: 'Catacomb Entrance', unlocked: true, bestTime: null, keyShards: 0 },
      { id: '1-2', name: 'Phase Corridors', unlocked: true, bestTime: null, keyShards: 0 },
      { id: '1-3', name: 'The Vertical Descent', unlocked: true, bestTime: null, keyShards: 0 },
    ];

    this.selectedIndex = 0;
  }

  create() {
    console.log('🎮 LevelSelectScene: Creating level select...');

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Load saved progress (placeholder - full implementation in Phase 9)
    this.loadProgress();

    // Create background
    this.createBackground();

    // Create header
    this.createHeader(centerX);

    // Create level list
    this.createLevelList(centerX);

    // Create footer
    this.createFooter(centerX);

    // Setup input
    this.setupInput();
  }

  /**
   * Load saved progress from localStorage (placeholder)
   */
  loadProgress() {
    try {
      const savedProgress = localStorage.getItem('brickwave_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);

        this.levels.forEach((level, index) => {
          const levelProgress = progress[level.id];
          if (levelProgress) {
            level.bestTime = levelProgress.bestTime || null;
            level.keyShards = levelProgress.keyShards || 0;
          }

          // Unlock logic: first level always unlocked, others require previous completion
          if (index === 0) {
            level.unlocked = true;
          } else {
            const prevLevel = this.levels[index - 1];
            const prevProgress = progress[prevLevel.id];
            level.unlocked = prevProgress && prevProgress.completed;
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load progress:', e);
    }

    // For MVP, unlock all levels for testing
    this.levels.forEach(level => level.unlocked = true);
  }

  /**
   * Create background
   */
  createBackground() {
    const graphics = this.add.graphics();

    // Create gradient
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
  }

  /**
   * Create header
   */
  createHeader(centerX) {
    // Title
    createCenteredText(
      this,
      centerX,
      20 * SCALE,
      'WORLD 1: CATACOMBS',
      TextStyles.subtitle
    );

    // Subtitle
    createCenteredText(
      this,
      centerX,
      35 * SCALE,
      'Select a level',
      TextStyles.hint
    );
  }

  /**
   * Create level list
   */
  createLevelList(centerX) {
    const startY = 55 * SCALE;
    const spacing = 28 * SCALE;
    const leftX = 40 * SCALE;

    this.levelItems = [];

    this.levels.forEach((level, index) => {
      const itemY = startY + index * spacing;
      const item = this.createLevelItem(level, leftX, itemY, index);
      this.levelItems.push(item);
    });

    // Create selection indicator
    this.selectionIndicator = this.add.graphics();
    this.updateSelection();
  }

  /**
   * Create a single level item
   */
  createLevelItem(level, x, y, index) {
    const container = this.add.container(x, y);
    const isSelected = index === this.selectedIndex;
    const style = level.unlocked ? TextStyles.levelItem : TextStyles.levelItemLocked;

    // Level number and name
    const levelId = createSmoothText(
      this,
      0,
      0,
      level.unlocked ? level.id : '???',
      { ...style, color: isSelected ? '#00ffff' : style.color }
    );
    container.add(levelId);

    const levelName = createSmoothText(
      this,
      35 * SCALE,
      0,
      level.unlocked ? level.name : 'LOCKED',
      { ...style, color: isSelected ? '#ffffff' : style.color }
    );
    container.add(levelName);

    // Best time (if available)
    const timeX = 35 * SCALE;
    const timeY = 10 * SCALE;
    let timeText;

    if (level.unlocked) {
      const timeDisplay = level.bestTime
        ? this.formatTime(level.bestTime)
        : '--:--';
      timeText = createSmoothText(
        this,
        timeX,
        timeY,
        `Best: ${timeDisplay}`,
        { ...TextStyles.hint, fontSize: `${8 * SCALE}px` }
      );
      container.add(timeText);
    }

    // Key shards indicator
    if (level.unlocked) {
      const shardsX = 140 * SCALE;
      const shardsText = createSmoothText(
        this,
        shardsX,
        0,
        this.getShardDisplay(level.keyShards),
        { ...TextStyles.hint, fontSize: `${10 * SCALE}px`, color: '#ffaa00' }
      );
      container.add(shardsText);
    }

    // Lock icon for locked levels
    if (!level.unlocked) {
      const lockIcon = createSmoothText(
        this,
        -15 * SCALE,
        0,
        '🔒',
        { fontSize: `${10 * SCALE}px` }
      );
      container.add(lockIcon);
    }

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-10 * SCALE, -5 * SCALE, 240 * SCALE, 25 * SCALE);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (level.unlocked) this.selectLevel(index);
    });
    container.on('pointerdown', () => {
      if (level.unlocked) this.confirmSelection();
    });

    return {
      container,
      levelId,
      levelName,
      timeText,
      level
    };
  }

  /**
   * Get key shard display string
   */
  getShardDisplay(count) {
    let display = '';
    for (let i = 0; i < 3; i++) {
      display += i < count ? '◆' : '◇';
    }
    return display;
  }

  /**
   * Format time in MM:SS
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Create footer with controls
   */
  createFooter(centerX) {
    createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 20 * SCALE,
      'Enter: Play | Esc: Back',
      TextStyles.hint
    );
  }

  /**
   * Setup input handling
   */
  setupInput() {
    // Navigation
    this.input.keyboard.on('keydown-UP', () => this.selectLevel(this.selectedIndex - 1));
    this.input.keyboard.on('keydown-DOWN', () => this.selectLevel(this.selectedIndex + 1));
    this.input.keyboard.on('keydown-W', () => this.selectLevel(this.selectedIndex - 1));
    this.input.keyboard.on('keydown-S', () => this.selectLevel(this.selectedIndex + 1));

    // Confirm selection
    this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());

    // Back to title
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
    this.input.keyboard.on('keydown-BACKSPACE', () => this.goBack());
  }

  /**
   * Select a level by index
   */
  selectLevel(index) {
    // Clamp to valid range
    index = Math.max(0, Math.min(index, this.levels.length - 1));

    // Skip locked levels
    while (index >= 0 && index < this.levels.length && !this.levels[index].unlocked) {
      index += index > this.selectedIndex ? 1 : -1;
    }

    if (index >= 0 && index < this.levels.length && this.levels[index].unlocked) {
      this.selectedIndex = index;
      this.updateSelection();
    }
  }

  /**
   * Update visual selection state
   */
  updateSelection() {
    const startY = 55 * SCALE;
    const spacing = 28 * SCALE;
    const leftX = 40 * SCALE;

    // Update text colors
    this.levelItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const level = item.level;
      const baseColor = level.unlocked ? '#ffffff' : '#666666';
      const selectedColor = '#00ffff';

      item.levelId.setColor(isSelected ? selectedColor : (level.unlocked ? '#00ffff' : '#666666'));
      item.levelName.setColor(isSelected ? '#ffffff' : (level.unlocked ? '#aaaaaa' : '#666666'));
    });

    // Update selection indicator
    this.selectionIndicator.clear();
    this.selectionIndicator.lineStyle(2 * SCALE, 0x00ffff, 0.5);

    const selectedY = startY + this.selectedIndex * spacing;
    this.selectionIndicator.strokeRect(
      leftX - 15 * SCALE,
      selectedY - 5 * SCALE,
      245 * SCALE,
      25 * SCALE
    );

    // Add arrow
    const arrowX = leftX - 25 * SCALE;
    this.selectionIndicator.fillStyle(0x00ffff, 1);
    this.selectionIndicator.fillTriangle(
      arrowX, selectedY + 5 * SCALE,
      arrowX + 8 * SCALE, selectedY + 5 * SCALE,
      arrowX + 4 * SCALE, selectedY + 10 * SCALE
    );
  }

  /**
   * Confirm current selection and start level
   */
  confirmSelection() {
    const selectedLevel = this.levels[this.selectedIndex];

    if (!selectedLevel.unlocked) {
      // Flash to indicate locked
      this.cameras.main.shake(100, 0.01);
      return;
    }

    // Parse level ID
    const [world, level] = selectedLevel.id.split('-').map(Number);

    // Flash and transition
    this.cameras.main.flash(100, 0, 255, 255);

    this.time.delayedCall(100, () => {
      this.scene.start('GameScene', {
        world,
        level,
        levelKey: `level-${selectedLevel.id}`
      });
    });
  }

  /**
   * Go back to title screen
   */
  goBack() {
    this.scene.start('TitleScene');
  }

  update(time, delta) {
    // Animation updates if needed
  }
}
