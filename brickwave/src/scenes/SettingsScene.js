import Phaser from 'phaser';
import { GAME_CONFIG, SCALE, RESOLUTION_MODE, setResolutionMode } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';
import saveManager from '../systems/SaveManager.js';

/**
 * SettingsScene - Game settings menu
 *
 * Features:
 * - Volume controls (Master, Music, SFX)
 * - Display settings (Resolution mode)
 * - Control display
 * - Accessibility options (Phase timing, Screen shake)
 */
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });

    // Settings definitions
    this.settingsDef = [
      { key: 'masterVolume', label: 'Master Volume', type: 'slider', min: 0, max: 100, step: 10 },
      { key: 'musicVolume', label: 'Music Volume', type: 'slider', min: 0, max: 100, step: 10 },
      { key: 'sfxVolume', label: 'SFX Volume', type: 'slider', min: 0, max: 100, step: 10 },
      { key: 'separator1', label: '', type: 'separator' },
      { key: 'resolution', label: 'Resolution', type: 'toggle', options: ['Retro (320x180)', 'Polished (640x360)'] },
      { key: 'screenShake', label: 'Screen Shake', type: 'toggle', options: ['On', 'Off'] },
      { key: 'separator2', label: '', type: 'separator' },
      { key: 'difficulty', label: 'Difficulty', type: 'toggle', options: ['Easy (5♥)', 'Intermediate (4♥)', 'Hard (3♥)'] },
      { key: 'phaseTimingAssist', label: 'Phase Timing', type: 'toggle', options: ['Normal', 'Relaxed (1.5x)', 'Slow (2x)'] },
      { key: 'invincibility', label: 'Invincibility', type: 'toggle', options: ['Off', 'On (Assisted)'] },
      { key: 'colorblindMode', label: 'Colorblind Mode', type: 'toggle', options: ['Off', 'Patterns'] },
      { key: 'showTimer', label: 'Show Timer', type: 'toggle', options: ['On', 'Off'] },
      { key: 'touchControls', label: 'Touch Controls', type: 'toggle', options: ['Auto', 'On', 'Off'] },
      { key: 'separator3', label: '', type: 'separator' },
      { key: 'controls', label: 'View Controls', type: 'action' },
      { key: 'howToPlay', label: 'How to Play', type: 'action' },
      { key: 'exportSave', label: 'Export Save', type: 'action' },
      { key: 'importSave', label: 'Import Save', type: 'action' },
      { key: 'resetProgress', label: 'Reset Progress', type: 'action', dangerous: true },
    ];

    this.selectedIndex = 0;
  }

  create() {
    console.log('🎮 SettingsScene: Creating settings menu...');

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    // Load current settings
    this.loadSettings();

    // Create background
    this.createBackground();

    // Create header
    this.createHeader(centerX);

    // Create settings list
    this.createSettingsList();

    // Create footer
    this.createFooter(centerX);

    // Setup input
    this.setupInput();
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const defaults = {
      masterVolume: 100,
      musicVolume: 80,
      sfxVolume: 100,
      resolution: RESOLUTION_MODE === 'polished' ? 1 : 0,
      screenShake: 0, // 0 = On
      difficulty: 1, // 0 = Easy, 1 = Intermediate, 2 = Hard
      phaseTimingAssist: 0, // 0 = Normal, 1 = Relaxed (1.5x), 2 = Slow (2x)
      invincibility: 0, // 0 = Off, 1 = On
      colorblindMode: 0, // 0 = Off, 1 = Patterns
      showTimer: 0, // 0 = On
      touchControls: 0, // 0 = Auto, 1 = On, 2 = Off
    };

    try {
      const saved = localStorage.getItem('brickwave_settings');
      this.settings = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      this.settings = defaults;
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('brickwave_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  /**
   * Create background
   */
  createBackground() {
    const graphics = this.add.graphics();

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
    createCenteredText(
      this,
      centerX,
      15 * SCALE,
      'SETTINGS',
      TextStyles.subtitle
    );
  }

  /**
   * Create settings list
   */
  createSettingsList() {
    this.startY = 35 * SCALE;
    this.leftX = 20 * SCALE;
    this.rightX = GAME_CONFIG.GAME_WIDTH - 20 * SCALE;
    this.lineHeight = 12 * SCALE;
    this.separatorHeight = 6 * SCALE;
    this.scrollOffset = 0;

    // Define visible area for scrolling
    this.visibleAreaTop = this.startY;
    this.visibleAreaBottom = GAME_CONFIG.GAME_HEIGHT - 30 * SCALE; // Leave space for footer

    let currentY = this.startY;
    this.settingItems = [];
    this.separatorLines = [];
    let selectableIndex = 0;

    this.settingsDef.forEach((setting, defIndex) => {
      if (setting.type === 'separator') {
        // Draw separator line
        const line = this.add.graphics();
        line.lineStyle(1, 0x333333, 0.5);
        line.lineBetween(this.leftX, currentY + this.separatorHeight / 2, this.rightX, currentY + this.separatorHeight / 2);
        this.separatorLines.push({ line, baseY: currentY });
        currentY += this.separatorHeight;
        return;
      }

      const item = this.createSettingItem(setting, this.leftX, this.rightX, currentY, selectableIndex);
      item.baseY = currentY; // Store base Y position for scrolling
      this.settingItems.push(item);
      currentY += this.lineHeight;
      selectableIndex++;
    });

    // Update selection indicator
    this.updateSelection();
  }

  /**
   * Create a single setting item
   */
  createSettingItem(setting, leftX, rightX, y, selectableIndex) {
    const isSelected = selectableIndex === this.selectedIndex;

    // Label
    const labelStyle = {
      ...TextStyles.settingsLabel,
      color: isSelected ? '#00ffff' : '#ffffff'
    };

    if (setting.dangerous) {
      labelStyle.color = isSelected ? '#ff6666' : '#aa4444';
    }

    const label = createSmoothText(this, leftX, y, setting.label, labelStyle);

    // Value/control
    let valueText = null;
    let valueDisplay = '';

    switch (setting.type) {
      case 'slider':
        const value = this.settings[setting.key];
        valueDisplay = this.createSliderDisplay(value, setting.min, setting.max);
        break;

      case 'toggle':
        const optionIndex = this.settings[setting.key] || 0;
        valueDisplay = setting.options[optionIndex];
        break;

      case 'action':
        valueDisplay = '>';
        break;
    }

    if (valueDisplay) {
      valueText = createSmoothText(
        this,
        rightX,
        y,
        valueDisplay,
        {
          ...TextStyles.settingsValue,
          color: isSelected ? '#00ffff' : '#aaaaaa'
        }
      );
      valueText.setOrigin(1, 0);
    }

    return {
      setting,
      label,
      valueText,
      y,
      selectableIndex
    };
  }

  /**
   * Create slider display string
   */
  createSliderDisplay(value, min, max) {
    const normalizedValue = (value - min) / (max - min);
    const filledBars = Math.round(normalizedValue * 10);
    let display = '';

    for (let i = 0; i < 10; i++) {
      display += i < filledBars ? '█' : '░';
    }

    return `${display} ${value}%`;
  }

  /**
   * Create footer
   */
  createFooter(centerX) {
    createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 20 * SCALE,
      '← → Adjust | Esc: Back',
      TextStyles.hint
    );
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

    // Adjust value
    this.input.keyboard.on('keydown-LEFT', () => this.adjustValue(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.adjustValue(1));
    this.input.keyboard.on('keydown-A', () => this.adjustValue(-1));
    this.input.keyboard.on('keydown-D', () => this.adjustValue(1));

    // Confirm (for actions)
    this.input.keyboard.on('keydown-ENTER', () => this.confirmAction());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmAction());

    // Back
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
    this.input.keyboard.on('keydown-BACKSPACE', () => this.goBack());
  }

  /**
   * Navigate settings list
   */
  navigate(direction) {
    let newIndex = this.selectedIndex + direction;

    // Clamp
    newIndex = Math.max(0, Math.min(newIndex, this.settingItems.length - 1));

    if (newIndex !== this.selectedIndex) {
      this.selectedIndex = newIndex;
      this.updateSelection();
      this.updateScroll();
    }
  }

  /**
   * Update scroll position to keep selected item visible
   */
  updateScroll() {
    const selectedItem = this.settingItems[this.selectedIndex];
    if (!selectedItem) return;

    const selectedY = selectedItem.baseY + this.scrollOffset;

    // Check if selected item is below visible area
    if (selectedY > this.visibleAreaBottom) {
      this.scrollOffset -= (selectedY - this.visibleAreaBottom);
    }
    // Check if selected item is above visible area
    else if (selectedY < this.visibleAreaTop) {
      this.scrollOffset += (this.visibleAreaTop - selectedY);
    }

    // Apply scroll offset to all items
    this.settingItems.forEach(item => {
      const newY = item.baseY + this.scrollOffset;
      item.label.y = newY;
      if (item.valueText) {
        item.valueText.y = newY;
      }
    });

    // Apply scroll offset to separator lines
    this.separatorLines.forEach(sep => {
      const newY = sep.baseY + this.scrollOffset;
      sep.line.clear();
      sep.line.lineStyle(1, 0x333333, 0.5);
      sep.line.lineBetween(this.leftX, newY + this.separatorHeight / 2, this.rightX, newY + this.separatorHeight / 2);
    });
  }

  /**
   * Adjust the current setting value
   */
  adjustValue(direction) {
    const item = this.settingItems[this.selectedIndex];
    if (!item) return;

    const setting = item.setting;

    switch (setting.type) {
      case 'slider':
        let newValue = this.settings[setting.key] + direction * setting.step;
        newValue = Math.max(setting.min, Math.min(setting.max, newValue));
        this.settings[setting.key] = newValue;
        this.updateItemDisplay(item);
        this.saveSettings();
        break;

      case 'toggle':
        let optionIndex = this.settings[setting.key] || 0;
        optionIndex = (optionIndex + direction + setting.options.length) % setting.options.length;
        this.settings[setting.key] = optionIndex;
        this.updateItemDisplay(item);
        this.saveSettings();

        // Handle resolution change
        if (setting.key === 'resolution') {
          this.handleResolutionChange(optionIndex);
        }
        break;

      case 'action':
        // Toggle with enter/space, not arrows
        break;
    }
  }

  /**
   * Handle resolution change
   */
  handleResolutionChange(optionIndex) {
    const newMode = optionIndex === 0 ? 'retro' : 'polished';
    if (newMode !== RESOLUTION_MODE) {
      // Show confirmation dialog
      this.showResolutionConfirm(newMode);
    }
  }

  /**
   * Show resolution change confirmation
   */
  showResolutionConfirm(newMode) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    const message = createCenteredText(
      this,
      centerX,
      centerY - 20 * SCALE,
      `Change resolution to ${newMode}?\nThis will reload the game.`,
      TextStyles.body
    );
    message.setScrollFactor(0);
    message.setDepth(1001);

    const hint = createCenteredText(
      this,
      centerX,
      centerY + 20 * SCALE,
      'Enter: Confirm | Esc: Cancel',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    const cleanup = () => {
      overlay.destroy();
      message.destroy();
      hint.destroy();
    };

    // Delay before enabling input to prevent the opening keypress from immediately triggering
    this.time.delayedCall(100, () => {
      // Confirm
      this.input.keyboard.once('keydown-ENTER', () => {
        cleanup();
        setResolutionMode(newMode);
      });

      // Cancel
      this.input.keyboard.once('keydown-ESC', () => {
        cleanup();
        // Revert setting
        this.settings.resolution = RESOLUTION_MODE === 'polished' ? 1 : 0;
        this.saveSettings();
        this.updateItemDisplay(this.settingItems[this.selectedIndex]);
      });
    });
  }

  /**
   * Confirm action-type settings
   */
  confirmAction() {
    const item = this.settingItems[this.selectedIndex];
    if (!item) return;

    const setting = item.setting;

    if (setting.type !== 'action') {
      // For toggles, pressing enter/space toggles the value
      if (setting.type === 'toggle') {
        this.adjustValue(1);
      }
      return;
    }

    switch (setting.key) {
      case 'controls':
        this.showControls();
        break;
      case 'howToPlay':
        this.showHowToPlay();
        break;
      case 'exportSave':
        this.showExportSave();
        break;
      case 'importSave':
        this.showImportSave();
        break;
      case 'resetProgress':
        this.confirmResetProgress();
        break;
    }
  }

  /**
   * Show controls overlay
   */
  showControls() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    const title = createCenteredText(
      this,
      centerX,
      20 * SCALE,
      'CONTROLS',
      TextStyles.subtitle
    );
    title.setScrollFactor(0);
    title.setDepth(1001);

    const controls = [
      'MOVEMENT',
      '← → or A D     Move',
      '↑ or W or Space     Jump',
      '↓ or S     Crouch/Drop',
      'Shift or X     Dash',
      '',
      'MENUS',
      '↑ ↓ or W S     Navigate',
      'Enter/Space     Select',
      'Esc     Back/Pause',
      '',
      'GAMEPLAY',
      'R     Quick Restart',
      'Esc     Pause Menu',
    ];

    const controlsText = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2,
      controls.join('\n'),
      { ...TextStyles.body, fontSize: `${8 * SCALE}px`, lineSpacing: 2 * SCALE }
    );
    controlsText.setScrollFactor(0);
    controlsText.setDepth(1001);

    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'Press any key to close',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      controlsText.destroy();
      hint.destroy();
    };

    // Delay before enabling close to prevent the opening keypress from immediately closing
    this.time.delayedCall(100, () => {
      this.input.keyboard.once('keydown', cleanup);
    });
  }

  /**
   * Show How to Play overlay
   */
  showHowToPlay() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    const title = createCenteredText(
      this,
      centerX,
      12 * SCALE,
      'HOW TO PLAY',
      TextStyles.subtitle
    );
    title.setScrollFactor(0);
    title.setDepth(1001);

    const content = [
      '═══ BASICS ═══',
      'Reach the exit portal to complete each level.',
      'Collect coins for score and Echo Charges.',
      'Find 3 Key Shards hidden in each level.',
      '',
      '═══ PHASE BRICKS ═══',
      'Blue bricks cycle between SOLID and GHOST.',
      'Watch the phase indicator to time jumps!',
      'Plan your route around the phase cycle.',
      '',
      '═══ ECHO CHARGES ═══',
      'Every 10 coins = 1 Echo Charge (max 3).',
      'Use Dash to move quickly and defeat enemies.',
      '',
      '═══ TIPS ═══',
      'Stomp on enemies from above to defeat them.',
      'Some enemies only appear during ghost phase.',
      'Press R for instant restart!',
    ];

    const contentText = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2 + 5 * SCALE,
      content.join('\n'),
      { ...TextStyles.body, fontSize: `${6 * SCALE}px`, lineSpacing: 1 * SCALE }
    );
    contentText.setScrollFactor(0);
    contentText.setDepth(1001);

    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 10 * SCALE,
      'Press any key to close',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      contentText.destroy();
      hint.destroy();
    };

    // Delay before enabling close to prevent the opening keypress from immediately closing
    this.time.delayedCall(100, () => {
      this.input.keyboard.once('keydown', cleanup);
    });
  }

  /**
   * Show export save overlay with copy-able JSON
   */
  showExportSave() {
    // Initialize SaveManager to ensure data is loaded
    saveManager.init();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    const title = createCenteredText(
      this,
      centerX,
      15 * SCALE,
      'EXPORT SAVE',
      TextStyles.subtitle
    );
    title.setScrollFactor(0);
    title.setDepth(1001);

    // Get save data
    const saveData = saveManager.exportSaveData();

    // Show truncated preview
    const previewLines = saveData.split('\n').slice(0, 8).join('\n');
    const preview = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2 - 10 * SCALE,
      previewLines + '\n...',
      { ...TextStyles.body, fontSize: `${6 * SCALE}px`, lineSpacing: 1 * SCALE }
    );
    preview.setScrollFactor(0);
    preview.setDepth(1001);

    // Copy to clipboard
    try {
      navigator.clipboard.writeText(saveData).then(() => {
        const copied = createCenteredText(
          this,
          centerX,
          GAME_CONFIG.GAME_HEIGHT - 35 * SCALE,
          'Copied to clipboard!',
          { ...TextStyles.hint, color: '#00ff00' }
        );
        copied.setScrollFactor(0);
        copied.setDepth(1001);
        this.exportCopiedText = copied;
      }).catch(() => {
        // Clipboard API not available, show fallback message
        const fallback = createCenteredText(
          this,
          centerX,
          GAME_CONFIG.GAME_HEIGHT - 35 * SCALE,
          'Check browser console for save data',
          { ...TextStyles.hint, color: '#ffaa00' }
        );
        fallback.setScrollFactor(0);
        fallback.setDepth(1001);
        this.exportCopiedText = fallback;
        console.log('=== BRICKWAVE SAVE DATA ===');
        console.log(saveData);
        console.log('=== END SAVE DATA ===');
      });
    } catch (e) {
      // Fallback for browsers without clipboard API
      console.log('=== BRICKWAVE SAVE DATA ===');
      console.log(saveData);
      console.log('=== END SAVE DATA ===');
    }

    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'Press any key to close',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      preview.destroy();
      hint.destroy();
      if (this.exportCopiedText) {
        this.exportCopiedText.destroy();
        this.exportCopiedText = null;
      }
    };

    // Delay before enabling close to prevent the opening keypress from immediately closing
    this.time.delayedCall(100, () => {
      this.input.keyboard.once('keydown', cleanup);
    });
  }

  /**
   * Show import save overlay
   */
  showImportSave() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    const title = createCenteredText(
      this,
      centerX,
      20 * SCALE,
      'IMPORT SAVE',
      TextStyles.subtitle
    );
    title.setScrollFactor(0);
    title.setDepth(1001);

    const instructions = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2 - 20 * SCALE,
      'Paste your save data\nfrom clipboard',
      TextStyles.body
    );
    instructions.setScrollFactor(0);
    instructions.setDepth(1001);

    const statusText = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT / 2 + 10 * SCALE,
      'Press V to paste',
      { ...TextStyles.hint, color: '#00ffff' }
    );
    statusText.setScrollFactor(0);
    statusText.setDepth(1001);

    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'Esc: Cancel',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      instructions.destroy();
      statusText.destroy();
      hint.destroy();
      this.input.keyboard.off('keydown-V', handlePaste);
      this.input.keyboard.off('keydown-ESC', handleCancel);
    };

    const handlePaste = () => {
      navigator.clipboard.readText().then(text => {
        // Initialize SaveManager
        saveManager.init();

        // Try to import
        const result = saveManager.importSaveData(text);

        if (result.success) {
          statusText.setText('Import successful!');
          statusText.setColor('#00ff00');

          // Flash green and close
          this.time.delayedCall(1000, cleanup);
        } else {
          statusText.setText(result.message);
          statusText.setColor('#ff6666');
        }
      }).catch(err => {
        statusText.setText('Clipboard access denied');
        statusText.setColor('#ff6666');
        console.error('Clipboard read error:', err);
      });
    };

    const handleCancel = () => {
      cleanup();
    };

    // Delay before enabling input to prevent the opening keypress from immediately triggering
    this.time.delayedCall(100, () => {
      this.input.keyboard.on('keydown-V', handlePaste);
      this.input.keyboard.on('keydown-ESC', handleCancel);
    });
  }

  /**
   * Confirm reset progress
   */
  confirmResetProgress() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    const message = createCenteredText(
      this,
      centerX,
      centerY - 15 * SCALE,
      'Reset all progress?\nThis cannot be undone!',
      { ...TextStyles.body, color: '#ff6666' }
    );
    message.setScrollFactor(0);
    message.setDepth(1001);

    const hint = createCenteredText(
      this,
      centerX,
      centerY + 20 * SCALE,
      'Enter: Confirm | Esc: Cancel',
      TextStyles.hint
    );
    hint.setScrollFactor(0);
    hint.setDepth(1001);

    const cleanup = () => {
      overlay.destroy();
      message.destroy();
      hint.destroy();
    };

    // Delay before enabling input to prevent the opening keypress from immediately triggering
    this.time.delayedCall(100, () => {
      this.input.keyboard.once('keydown-ENTER', () => {
        cleanup();
        this.resetProgress();
      });

      this.input.keyboard.once('keydown-ESC', cleanup);
    });
  }

  /**
   * Reset all progress
   */
  resetProgress() {
    try {
      // Initialize SaveManager and clear progress
      saveManager.init();
      saveManager.clearProgress();
      console.log('Progress reset!');

      // Show confirmation
      const flash = this.add.graphics();
      flash.fillStyle(0xff0000, 0.3);
      flash.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
      flash.setDepth(200);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy()
      });
    } catch (e) {
      console.warn('Failed to reset progress:', e);
    }
  }

  /**
   * Update item display
   */
  updateItemDisplay(item) {
    if (!item || !item.valueText) return;

    const setting = item.setting;
    let valueDisplay = '';

    switch (setting.type) {
      case 'slider':
        valueDisplay = this.createSliderDisplay(
          this.settings[setting.key],
          setting.min,
          setting.max
        );
        break;

      case 'toggle':
        const optionIndex = this.settings[setting.key] || 0;
        valueDisplay = setting.options[optionIndex];
        break;
    }

    item.valueText.setText(valueDisplay);
  }

  /**
   * Update selection visual
   */
  updateSelection() {
    this.settingItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const setting = item.setting;

      // Update label color
      let labelColor = isSelected ? '#00ffff' : '#ffffff';
      if (setting.dangerous) {
        labelColor = isSelected ? '#ff6666' : '#aa4444';
      }
      item.label.setColor(labelColor);

      // Update value color
      if (item.valueText) {
        item.valueText.setColor(isSelected ? '#00ffff' : '#aaaaaa');
      }
    });
  }

  /**
   * Go back to previous screen
   */
  goBack() {
    this.saveSettings();
    this.scene.start('TitleScene');
  }

  update(time, delta) {
    // Animation updates if needed
  }
}
