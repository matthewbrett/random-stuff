import Phaser from 'phaser';
import { GAME_CONFIG, SCALE, RESOLUTION_MODE, setResolutionMode } from '../config.js';
import { TextStyles, createCenteredText, createSmoothText } from '../utils/TextStyles.js';

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
      { key: 'phaseTimingAssist', label: 'Phase Timing', type: 'toggle', options: ['Normal', 'Relaxed (1.5x)'] },
      { key: 'showTimer', label: 'Show Timer', type: 'toggle', options: ['On', 'Off'] },
      { key: 'separator3', label: '', type: 'separator' },
      { key: 'controls', label: 'View Controls', type: 'action' },
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
      phaseTimingAssist: 0, // 0 = Normal
      showTimer: 0, // 0 = On
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
    const startY = 35 * SCALE;
    const leftX = 20 * SCALE;
    const rightX = GAME_CONFIG.GAME_WIDTH - 20 * SCALE;
    let currentY = startY;
    const lineHeight = 12 * SCALE;
    const separatorHeight = 6 * SCALE;

    this.settingItems = [];
    let selectableIndex = 0;

    this.settingsDef.forEach((setting, defIndex) => {
      if (setting.type === 'separator') {
        // Draw separator line
        const line = this.add.graphics();
        line.lineStyle(1, 0x333333, 0.5);
        line.lineBetween(leftX, currentY + separatorHeight / 2, rightX, currentY + separatorHeight / 2);
        currentY += separatorHeight;
        return;
      }

      const item = this.createSettingItem(setting, leftX, rightX, currentY, selectableIndex);
      this.settingItems.push(item);
      currentY += lineHeight;
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
    }
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
    overlay.setDepth(100);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    const message = createCenteredText(
      this,
      centerX,
      centerY - 20 * SCALE,
      `Change resolution to ${newMode}?\nThis will reload the game.`,
      TextStyles.body
    );
    message.setDepth(101);

    const hint = createCenteredText(
      this,
      centerX,
      centerY + 20 * SCALE,
      'Enter: Confirm | Esc: Cancel',
      TextStyles.hint
    );
    hint.setDepth(101);

    const cleanup = () => {
      overlay.destroy();
      message.destroy();
      hint.destroy();
    };

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
    overlay.setDepth(100);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;

    const title = createCenteredText(
      this,
      centerX,
      20 * SCALE,
      'CONTROLS',
      TextStyles.subtitle
    );
    title.setDepth(101);

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
    controlsText.setDepth(101);

    const hint = createCenteredText(
      this,
      centerX,
      GAME_CONFIG.GAME_HEIGHT - 15 * SCALE,
      'Press any key to close',
      TextStyles.hint
    );
    hint.setDepth(101);

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

    this.input.keyboard.once('keydown', cleanup);
  }

  /**
   * Confirm reset progress
   */
  confirmResetProgress() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setDepth(100);

    const centerX = GAME_CONFIG.GAME_WIDTH / 2;
    const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

    const message = createCenteredText(
      this,
      centerX,
      centerY - 15 * SCALE,
      'Reset all progress?\nThis cannot be undone!',
      { ...TextStyles.body, color: '#ff6666' }
    );
    message.setDepth(101);

    const hint = createCenteredText(
      this,
      centerX,
      centerY + 20 * SCALE,
      'Enter: Confirm | Esc: Cancel',
      TextStyles.hint
    );
    hint.setDepth(101);

    const cleanup = () => {
      overlay.destroy();
      message.destroy();
      hint.destroy();
    };

    this.input.keyboard.once('keydown-ENTER', () => {
      cleanup();
      this.resetProgress();
    });

    this.input.keyboard.once('keydown-ESC', cleanup);
  }

  /**
   * Reset all progress
   */
  resetProgress() {
    try {
      localStorage.removeItem('brickwave_progress');
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
