import Phaser from 'phaser';
import { SCALE } from '../config.js';

/**
 * Coin - Collectible that awards points and contributes to Echo Charges
 *
 * Features:
 * - Animated spinning/pulsing effect
 * - +100 score when collected
 * - Contributes to Echo Charge system (10 coins = +1 dash)
 * - Visual feedback on collection
 */
export default class Coin {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;

    // Create coin sprite (placeholder circle)
    this.sprite = scene.physics.add.sprite(x, y, null);

    // Create a simple coin graphic (6x6 pixel gold circle, scaled)
    const coinSize = 6 * SCALE;
    const coinRadius = 3 * SCALE;
    const textureKey = `coin_${SCALE}`;
    if (!scene.textures.exists(textureKey)) {
      const graphics = scene.add.graphics();

      // Draw outer circle (gold)
      graphics.fillStyle(0xffcc00, 1);
      graphics.fillCircle(coinRadius, coinRadius, coinRadius);

      // Draw inner highlight
      graphics.fillStyle(0xffff99, 1);
      graphics.fillCircle(2 * SCALE, 2 * SCALE, 1 * SCALE);

      graphics.generateTexture(textureKey, coinSize, coinSize);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);

    // Physics setup
    this.sprite.body.setSize(coinSize, coinSize);
    this.sprite.body.setAllowGravity(false); // Coins float in place
    this.sprite.body.setImmovable(true);

    // Animation properties
    this.pulseTime = 0;
    this.pulseSpeed = 3; // Speed of pulse animation
    this.baseY = y; // Store original Y position for floating effect
  }

  /**
   * Update coin animation
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    if (this.collected) return;

    // Pulse animation (scale up and down)
    this.pulseTime += delta * this.pulseSpeed;
    const scale = 1 + Math.sin(this.pulseTime / 1000) * 0.2;
    this.sprite.setScale(scale);

    // Floating animation (subtle up/down motion)
    const floatOffset = Math.sin(this.pulseTime / 600) * 2 * SCALE;
    this.sprite.y = this.baseY + floatOffset;
  }

  /**
   * Collect this coin
   * @returns {number} Score value awarded
   */
  collect() {
    if (this.collected) return 0;

    this.collected = true;

    // Create collection effect (sparkle/flash)
    this.createCollectionEffect();

    // Destroy the sprite
    this.sprite.destroy();

    // Return score value
    return 100;
  }

  /**
   * Create visual effect when coin is collected
   */
  createCollectionEffect() {
    // Create a quick flash/sparkle effect
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffff00, 1);
    flash.fillCircle(this.sprite.x, this.sprite.y, 8 * SCALE);
    flash.setAlpha(0.8);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  /**
   * Destroy this coin
   */
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }

  /**
   * Check if coin overlaps with a rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {boolean} True if overlapping
   */
  overlaps(x, y, width, height) {
    if (this.collected) return false;

    const coinBounds = this.sprite.getBounds();
    return Phaser.Geom.Intersects.RectangleToRectangle(
      coinBounds,
      new Phaser.Geom.Rectangle(x, y, width, height)
    );
  }
}
