/**
 * TransitionManager - Handles screen transitions between scenes
 *
 * Features:
 * - Fade in/out transitions
 * - Slide transitions
 * - Wipe transitions
 * - Customizable duration and colors
 */

import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';

class TransitionManager {
  constructor() {
    this.scene = null;
    this.overlay = null;
    this.isTransitioning = false;
  }

  /**
   * Initialize transition manager with a Phaser scene
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  init(scene) {
    this.scene = scene;
  }

  /**
   * Perform a fade out transition, then switch to another scene
   * @param {string} targetScene - Scene key to transition to
   * @param {object} data - Data to pass to the target scene
   * @param {object} options - Transition options
   */
  fadeToScene(targetScene, data = {}, options = {}) {
    if (this.isTransitioning || !this.scene) return;

    const {
      duration = 300,
      color = 0x000000,
      holdDuration = 100
    } = options;

    this.isTransitioning = true;

    // Create overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(color, 1);
    this.overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    this.overlay.setDepth(10000);
    this.overlay.setAlpha(0);
    this.overlay.setScrollFactor(0);

    // Fade out
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        // Hold at black briefly
        this.scene.time.delayedCall(holdDuration, () => {
          // Switch scene
          this.scene.scene.start(targetScene, data);
          this.isTransitioning = false;
        });
      }
    });
  }

  /**
   * Perform a fade in effect (call this in the new scene's create())
   * @param {object} options - Transition options
   * @param {Function} onComplete - Callback when fade is complete
   */
  fadeIn(options = {}, onComplete = null) {
    if (!this.scene) return;

    const {
      duration = 300,
      color = 0x000000,
      delay = 0
    } = options;

    // Create overlay covering screen
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(color, 1);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setDepth(10000);
    overlay.setAlpha(1);
    overlay.setScrollFactor(0);

    // Fade in (overlay fades out)
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: duration,
      delay: delay,
      ease: 'Power2',
      onComplete: () => {
        overlay.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Slide transition to another scene
   * @param {string} targetScene - Scene key to transition to
   * @param {object} data - Data to pass to the target scene
   * @param {string} direction - 'left', 'right', 'up', 'down'
   * @param {object} options - Transition options
   */
  slideToScene(targetScene, data = {}, direction = 'left', options = {}) {
    if (this.isTransitioning || !this.scene) return;

    const {
      duration = 400,
      color = 0x000000
    } = options;

    this.isTransitioning = true;

    // Create slide overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(color, 1);
    this.overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    this.overlay.setDepth(10000);
    this.overlay.setScrollFactor(0);

    // Set starting position based on direction
    let startX = 0, startY = 0, endX = 0, endY = 0;

    switch (direction) {
      case 'left':
        startX = GAME_CONFIG.GAME_WIDTH;
        endX = 0;
        break;
      case 'right':
        startX = -GAME_CONFIG.GAME_WIDTH;
        endX = 0;
        break;
      case 'up':
        startY = GAME_CONFIG.GAME_HEIGHT;
        endY = 0;
        break;
      case 'down':
        startY = -GAME_CONFIG.GAME_HEIGHT;
        endY = 0;
        break;
    }

    this.overlay.setPosition(startX, startY);

    // Slide in
    this.scene.tweens.add({
      targets: this.overlay,
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        // Switch scene
        this.scene.scene.start(targetScene, data);
        this.isTransitioning = false;
      }
    });
  }

  /**
   * Flash the screen (useful for impacts or level transitions)
   * @param {object} options - Flash options
   * @param {Function} onComplete - Callback when flash is complete
   */
  flash(options = {}, onComplete = null) {
    if (!this.scene) return;

    const {
      duration = 100,
      color = 0xffffff,
      alpha = 0.8
    } = options;

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(color, 1);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setDepth(9999);
    overlay.setAlpha(alpha);
    overlay.setScrollFactor(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        overlay.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Wipe transition (horizontal bar that covers then reveals)
   * @param {string} targetScene - Scene key to transition to
   * @param {object} data - Data to pass to the target scene
   * @param {object} options - Transition options
   */
  wipeToScene(targetScene, data = {}, options = {}) {
    if (this.isTransitioning || !this.scene) return;

    const {
      duration = 500,
      color = 0x000000,
      barHeight = 20 * SCALE
    } = options;

    this.isTransitioning = true;

    const numBars = Math.ceil(GAME_CONFIG.GAME_HEIGHT / barHeight);
    const bars = [];

    // Create bars
    for (let i = 0; i < numBars; i++) {
      const bar = this.scene.add.graphics();
      bar.fillStyle(color, 1);
      bar.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, barHeight);
      bar.setPosition(-GAME_CONFIG.GAME_WIDTH, i * barHeight);
      bar.setDepth(10000);
      bar.setScrollFactor(0);
      bars.push(bar);
    }

    // Animate bars sliding in with stagger
    bars.forEach((bar, index) => {
      this.scene.tweens.add({
        targets: bar,
        x: 0,
        duration: duration * 0.6,
        delay: index * 30,
        ease: 'Power2',
        onComplete: () => {
          // On last bar, switch scene
          if (index === bars.length - 1) {
            this.scene.time.delayedCall(100, () => {
              this.scene.scene.start(targetScene, data);
              this.isTransitioning = false;
            });
          }
        }
      });
    });
  }

  /**
   * Circle transition (like Mario/Sonic stage clear)
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {string} targetScene - Scene key to transition to
   * @param {object} data - Data to pass to target scene
   * @param {object} options - Transition options
   */
  circleToScene(x, y, targetScene, data = {}, options = {}) {
    if (this.isTransitioning || !this.scene) return;

    const {
      duration = 600,
      color = 0x000000
    } = options;

    this.isTransitioning = true;

    // Use camera effect for circle iris
    // Since Phaser doesn't have built-in iris, we'll use a mask approach
    // For simplicity, we'll use a fade with a centered flash

    // Center flash
    const centerFlash = this.scene.add.graphics();
    centerFlash.fillStyle(0xffffff, 1);
    centerFlash.fillCircle(x, y, 10 * SCALE);
    centerFlash.setDepth(9998);
    centerFlash.setScrollFactor(0);

    this.scene.tweens.add({
      targets: centerFlash,
      scaleX: 50,
      scaleY: 50,
      alpha: 0,
      duration: duration * 0.3,
      onComplete: () => centerFlash.destroy()
    });

    // Fade overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(color, 1);
    overlay.fillRect(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    overlay.setDepth(10000);
    overlay.setAlpha(0);
    overlay.setScrollFactor(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: duration * 0.7,
      delay: duration * 0.2,
      ease: 'Power2',
      onComplete: () => {
        this.scene.scene.start(targetScene, data);
        this.isTransitioning = false;
      }
    });
  }

  /**
   * Quick restart transition (for speedrunners)
   * @param {object} restartData - Data to pass when restarting
   */
  quickRestart(restartData = {}) {
    if (!this.scene) return;

    // Quick white flash
    this.flash({ duration: 50, color: 0xffffff, alpha: 1 }, () => {
      this.scene.scene.restart(restartData);
    });
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    this.scene = null;
    this.isTransitioning = false;
  }
}

// Export singleton instance
const transitionManager = new TransitionManager();
export default transitionManager;
export { TransitionManager };
