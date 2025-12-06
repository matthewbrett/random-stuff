/**
 * InputManager - Handles input remapping and touch controls
 *
 * Features:
 * - Keyboard control remapping
 * - Mobile touch controls
 * - Unified input interface
 */

import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';

// Default key bindings
const DEFAULT_BINDINGS = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  jump: ['UP', 'W', 'SPACE'],
  dash: ['SHIFT', 'X'],
  down: ['DOWN', 'S'],
  pause: ['ESC'],
  restart: ['R'],
};

class InputManager {
  constructor() {
    this.scene = null;
    this.bindings = { ...DEFAULT_BINDINGS };
    this.keys = {};
    this.touchControls = null;
    this.touchState = {
      left: false,
      right: false,
      jump: false,
      dash: false,
      down: false,
    };
    this.isTouchDevice = false;
    this.touchControlsVisible = false;
    this.initialized = false;
  }

  /**
   * Initialize the input manager with a scene
   * @param {Phaser.Scene} scene - The scene to attach to
   */
  init(scene) {
    this.scene = scene;
    this.loadBindings();
    this.setupKeyboard();
    this.detectTouchDevice();

    if (this.isTouchDevice) {
      this.createTouchControls();
    }

    this.initialized = true;
  }

  /**
   * Detect if device supports touch
   */
  detectTouchDevice() {
    this.isTouchDevice = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );

    // Also check screen size (mobile typically < 768px width)
    const isMobileSize = window.innerWidth < 768;

    // Enable touch controls if either condition is true
    this.touchControlsVisible = this.isTouchDevice || isMobileSize;

    console.log(`🎮 InputManager: Touch device: ${this.isTouchDevice}, Mobile size: ${isMobileSize}`);
  }

  /**
   * Load key bindings from localStorage
   */
  loadBindings() {
    try {
      const saved = localStorage.getItem('brickwave_controls');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.bindings = { ...DEFAULT_BINDINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load control bindings:', e);
      this.bindings = { ...DEFAULT_BINDINGS };
    }
  }

  /**
   * Save key bindings to localStorage
   */
  saveBindings() {
    try {
      localStorage.setItem('brickwave_controls', JSON.stringify(this.bindings));
    } catch (e) {
      console.warn('Failed to save control bindings:', e);
    }
  }

  /**
   * Reset bindings to defaults
   */
  resetBindings() {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.saveBindings();
    if (this.scene) {
      this.setupKeyboard();
    }
  }

  /**
   * Remap a control
   * @param {string} action - The action to remap (left, right, jump, etc.)
   * @param {string[]} keys - Array of key codes
   */
  remapControl(action, keys) {
    if (this.bindings.hasOwnProperty(action)) {
      this.bindings[action] = keys;
      this.saveBindings();
      if (this.scene) {
        this.setupKeyboard();
      }
    }
  }

  /**
   * Get current binding for an action
   * @param {string} action - The action
   * @returns {string[]} Array of key codes
   */
  getBinding(action) {
    return this.bindings[action] || [];
  }

  /**
   * Setup keyboard inputs based on current bindings
   */
  setupKeyboard() {
    if (!this.scene || !this.scene.input || !this.scene.input.keyboard) return;

    this.keys = {};

    // Create key objects for each binding
    Object.entries(this.bindings).forEach(([action, keyCodes]) => {
      this.keys[action] = keyCodes.map(keyCode => {
        const code = Phaser.Input.Keyboard.KeyCodes[keyCode];
        if (code !== undefined) {
          return this.scene.input.keyboard.addKey(code);
        }
        return null;
      }).filter(k => k !== null);
    });
  }

  /**
   * Check if an action is currently pressed
   * @param {string} action - The action to check
   * @returns {boolean} Whether the action is pressed
   */
  isDown(action) {
    // Check touch state first
    if (this.touchState[action]) {
      return true;
    }

    // Check keyboard
    const actionKeys = this.keys[action];
    if (actionKeys) {
      return actionKeys.some(key => key && key.isDown);
    }
    return false;
  }

  /**
   * Check if an action was just pressed this frame
   * @param {string} action - The action to check
   * @returns {boolean} Whether the action was just pressed
   */
  justDown(action) {
    const actionKeys = this.keys[action];
    if (actionKeys) {
      return actionKeys.some(key => key && Phaser.Input.Keyboard.JustDown(key));
    }
    return false;
  }

  /**
   * Create touch controls overlay
   */
  createTouchControls() {
    if (!this.scene || this.touchControls) return;

    const width = GAME_CONFIG.GAME_WIDTH;
    const height = GAME_CONFIG.GAME_HEIGHT;

    // Touch control dimensions
    const buttonSize = 28 * SCALE;
    const padding = 8 * SCALE;
    const bottomY = height - padding - buttonSize / 2;

    // Create container for touch controls
    this.touchControls = this.scene.add.container(0, 0);
    this.touchControls.setScrollFactor(0);
    this.touchControls.setDepth(5000);
    this.touchControls.setAlpha(0.6);

    // Left side controls (movement)
    const leftX = padding + buttonSize / 2;
    const dpadCenterX = leftX + buttonSize + padding;

    // Left arrow button
    this.leftButton = this.createTouchButton(
      leftX,
      bottomY,
      buttonSize,
      '←',
      () => { this.touchState.left = true; },
      () => { this.touchState.left = false; }
    );
    this.touchControls.add(this.leftButton);

    // Right arrow button
    this.rightButton = this.createTouchButton(
      leftX + buttonSize + padding * 2 + buttonSize,
      bottomY,
      buttonSize,
      '→',
      () => { this.touchState.right = true; },
      () => { this.touchState.right = false; }
    );
    this.touchControls.add(this.rightButton);

    // Down arrow button (between left and right)
    this.downButton = this.createTouchButton(
      leftX + buttonSize + padding,
      bottomY,
      buttonSize * 0.8,
      '↓',
      () => { this.touchState.down = true; },
      () => { this.touchState.down = false; }
    );
    this.touchControls.add(this.downButton);

    // Right side controls (actions)
    const rightX = width - padding - buttonSize / 2;

    // Jump button (A button style)
    this.jumpButton = this.createTouchButton(
      rightX - buttonSize - padding,
      bottomY - buttonSize / 2 - padding / 2,
      buttonSize * 1.2,
      'A',
      () => { this.touchState.jump = true; },
      () => { this.touchState.jump = false; },
      0x00ff00 // Green for jump
    );
    this.touchControls.add(this.jumpButton);

    // Dash button (B button style)
    this.dashButton = this.createTouchButton(
      rightX,
      bottomY,
      buttonSize,
      'B',
      () => { this.touchState.dash = true; },
      () => { this.touchState.dash = false; },
      0xff6600 // Orange for dash
    );
    this.touchControls.add(this.dashButton);

    // Initially hide if not a touch device
    if (!this.touchControlsVisible) {
      this.touchControls.setVisible(false);
    }
  }

  /**
   * Create a touch button
   */
  createTouchButton(x, y, size, label, onDown, onUp, color = 0x4444ff) {
    const container = this.scene.add.container(x, y);

    // Button background
    const bg = this.scene.add.circle(0, 0, size / 2, color, 0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.8);
    container.add(bg);

    // Button label
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size * 0.5}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    // Touch events
    bg.on('pointerdown', () => {
      bg.setFillStyle(color, 0.8);
      bg.setScale(0.9);
      onDown();
    });

    bg.on('pointerup', () => {
      bg.setFillStyle(color, 0.5);
      bg.setScale(1.0);
      onUp();
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(color, 0.5);
      bg.setScale(1.0);
      onUp();
    });

    return container;
  }

  /**
   * Show/hide touch controls
   * @param {boolean} visible - Whether to show controls
   */
  setTouchControlsVisible(visible) {
    this.touchControlsVisible = visible;
    if (this.touchControls) {
      this.touchControls.setVisible(visible);
    }
  }

  /**
   * Set touch controls opacity
   * @param {number} alpha - Opacity (0-1)
   */
  setTouchControlsAlpha(alpha) {
    if (this.touchControls) {
      this.touchControls.setAlpha(alpha);
    }
  }

  /**
   * Get formatted key name for display
   * @param {string} keyCode - The key code
   * @returns {string} Human-readable key name
   */
  getKeyDisplayName(keyCode) {
    const displayNames = {
      'LEFT': '←',
      'RIGHT': '→',
      'UP': '↑',
      'DOWN': '↓',
      'SPACE': 'Space',
      'SHIFT': 'Shift',
      'ESC': 'Esc',
      'ENTER': 'Enter',
    };
    return displayNames[keyCode] || keyCode;
  }

  /**
   * Get display string for an action's bindings
   * @param {string} action - The action
   * @returns {string} Formatted binding string
   */
  getBindingDisplay(action) {
    const keys = this.bindings[action] || [];
    return keys.map(k => this.getKeyDisplayName(k)).join(' / ');
  }

  /**
   * Destroy touch controls
   */
  destroy() {
    if (this.touchControls) {
      this.touchControls.destroy();
      this.touchControls = null;
    }
    this.keys = {};
    this.initialized = false;
  }
}

// Export singleton instance
const inputManager = new InputManager();
export default inputManager;
export { InputManager, DEFAULT_BINDINGS };
