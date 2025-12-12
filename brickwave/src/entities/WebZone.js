import Phaser from 'phaser';
import { SCALE } from '../config.js';

/**
 * WebZone - Area that slows down the player
 *
 * Features:
 * - Rectangle bounds defining the slowdown area
 * - Configurable slowdown factor (default 50%)
 * - Semi-transparent web visual overlay
 * - Only affects player, not enemies (like spiders)
 */
export default class WebZone {
  /**
   * Create a new web zone
   * @param {Phaser.Scene} scene - The game scene
   * @param {number} x - X position (top-left)
   * @param {number} y - Y position (top-left)
   * @param {number} width - Zone width
   * @param {number} height - Zone height
   * @param {object} config - Additional configuration
   * @param {number} config.slowdown - Slowdown factor (0.1-1.0, default 0.5)
   */
  constructor(scene, x, y, width, height, config = {}) {
    this.scene = scene;

    // Zone bounds (scaled coordinates)
    this.bounds = new Phaser.Geom.Rectangle(
      x * SCALE,
      y * SCALE,
      width * SCALE,
      height * SCALE
    );

    // Slowdown factor (default 50% speed)
    this.slowdownFactor = config.slowdown ?? 0.5;

    // Store position for easy access
    this.x = this.bounds.x;
    this.y = this.bounds.y;
    this.width = this.bounds.width;
    this.height = this.bounds.height;

    // Create visual representation
    this.graphics = this.createWebGraphics();
  }

  /**
   * Create the web zone visual (semi-transparent overlay with web pattern)
   * @returns {Phaser.GameObjects.Graphics} The graphics object
   */
  createWebGraphics() {
    const graphics = this.scene.add.graphics();

    // Semi-transparent white background
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillRect(this.x, this.y, this.width, this.height);

    // Draw diagonal web lines
    graphics.lineStyle(1, 0xffffff, 0.3);

    const spacing = 8 * SCALE;

    // Diagonal lines from top-left to bottom-right
    for (let i = -this.height; i < this.width; i += spacing) {
      const startX = Math.max(this.x, this.x + i);
      const startY = Math.max(this.y, this.y - i);
      const endX = Math.min(this.x + this.width, this.x + i + this.height);
      const endY = Math.min(this.y + this.height, this.y - i + this.width);

      if (startX < this.x + this.width && endY > this.y) {
        graphics.lineBetween(startX, startY, endX, endY);
      }
    }

    // Diagonal lines from top-right to bottom-left
    for (let i = 0; i < this.width + this.height; i += spacing) {
      const startX = Math.min(this.x + this.width, this.x + i);
      const startY = Math.max(this.y, this.y + i - this.width);
      const endX = Math.max(this.x, this.x + i - this.height);
      const endY = Math.min(this.y + this.height, this.y + i);

      if (startX > this.x && endY > this.y) {
        graphics.lineBetween(startX, startY, endX, endY);
      }
    }

    // Set depth to render behind player but above background
    graphics.setDepth(-1);

    return graphics;
  }

  /**
   * Check if a point is inside this web zone
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if point is inside zone
   */
  containsPoint(x, y) {
    return this.bounds.contains(x, y);
  }

  /**
   * Check if a rectangle (like player bounds) overlaps this zone
   * @param {Phaser.Geom.Rectangle} rect - Rectangle to check
   * @returns {boolean} True if overlapping
   */
  checkOverlap(rect) {
    return Phaser.Geom.Intersects.RectangleToRectangle(this.bounds, rect);
  }

  /**
   * Check if player is inside this zone
   * @param {Player} player - The player object
   * @returns {boolean} True if player is inside
   */
  checkPlayerInside(player) {
    const playerBounds = player.sprite.getBounds();
    return this.checkOverlap(playerBounds);
  }

  /**
   * Get the slowdown factor for this zone
   * @returns {number} Slowdown factor (0.1-1.0)
   */
  getSlowdownFactor() {
    return this.slowdownFactor;
  }

  /**
   * Update the zone (for potential animations)
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(_time, _delta) {
    // Static zone - no updates needed currently
    // Could add subtle shimmer animation here later
  }

  /**
   * Destroy the web zone
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
