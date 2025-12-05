import Phaser from 'phaser';
import { SCALE } from '../config.js';

/**
 * KeyShard - Special collectible for unlocking bonus stages
 *
 * Features:
 * - 3 per level, hidden in secret areas
 * - Glowing/shimmering effect
 * - Unique crystal appearance (purple/cyan)
 * - Persistent collection across sessions (future)
 */
export default class KeyShard {
  constructor(scene, x, y, shardIndex = 0) {
    this.scene = scene;
    this.collected = false;
    this.shardIndex = shardIndex; // 0, 1, or 2 (which shard in the level)

    // Create shard sprite
    this.sprite = scene.physics.add.sprite(x, y, null);

    // Create shard graphic (crystal shape)
    const shardSize = 8 * SCALE;
    const textureKey = `keyshard_${SCALE}_${shardIndex}`;
    if (!scene.textures.exists(textureKey)) {
      const graphics = scene.add.graphics();

      // Different color for each shard
      const colors = [0x00ffff, 0xff00ff, 0xffff00]; // Cyan, Magenta, Yellow
      const mainColor = colors[shardIndex % 3];
      const glowColor = 0xffffff;

      // Draw crystal shape (diamond/shard)
      graphics.fillStyle(mainColor, 1);
      graphics.beginPath();
      graphics.moveTo(shardSize / 2, 0); // Top point
      graphics.lineTo(shardSize - 1, shardSize / 2); // Right point
      graphics.lineTo(shardSize / 2, shardSize - 1); // Bottom point
      graphics.lineTo(1, shardSize / 2); // Left point
      graphics.closePath();
      graphics.fillPath();

      // Draw inner highlight
      graphics.fillStyle(glowColor, 0.5);
      graphics.fillTriangle(
        shardSize / 2, 2 * SCALE,
        shardSize / 2 + 2 * SCALE, shardSize / 2,
        shardSize / 2, shardSize / 2
      );

      graphics.generateTexture(textureKey, shardSize, shardSize);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);

    // Physics setup
    this.sprite.body.setSize(shardSize, shardSize);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);

    // Animation properties
    this.glowTime = 0;
    this.rotateTime = 0;
    this.baseY = y;

    // Create glow effect
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setDepth(-1);
  }

  /**
   * Update shard animation
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    if (this.collected) return;

    // Glow animation (pulsing glow)
    this.glowTime += delta * 2;
    const glowIntensity = 0.3 + Math.sin(this.glowTime / 500) * 0.3;

    // Update glow graphic
    this.glowGraphics.clear();
    const colors = [0x00ffff, 0xff00ff, 0xffff00];
    this.glowGraphics.fillStyle(colors[this.shardIndex % 3], glowIntensity);
    this.glowGraphics.fillCircle(this.sprite.x, this.sprite.y, 10 * SCALE);

    // Floating animation
    const floatOffset = Math.sin(this.glowTime / 800) * 3 * SCALE;
    this.sprite.y = this.baseY + floatOffset;

    // Subtle rotation
    this.rotateTime += delta;
    this.sprite.rotation = Math.sin(this.rotateTime / 1000) * 0.2;
  }

  /**
   * Collect this key shard
   * @returns {number} Shard index (0, 1, or 2)
   */
  collect() {
    if (this.collected) return -1;

    this.collected = true;

    // Create collection effect (larger, more dramatic)
    this.createCollectionEffect();

    // Destroy visuals
    this.glowGraphics.destroy();
    this.sprite.destroy();

    return this.shardIndex;
  }

  /**
   * Create visual effect when shard is collected
   */
  createCollectionEffect() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00];
    const color = colors[this.shardIndex % 3];

    // Create expanding rings
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.graphics();
      ring.lineStyle(2 * SCALE, color, 1);
      ring.strokeCircle(0, 0, 8 * SCALE);
      ring.setPosition(this.sprite.x, this.sprite.y);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 3 + i,
        scaleY: 3 + i,
        alpha: 0,
        duration: 500 + i * 100,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => {
          ring.destroy();
        }
      });
    }

    // Create particle burst
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 1);
    flash.fillCircle(this.sprite.x, this.sprite.y, 12 * SCALE);
    flash.setAlpha(0.9);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  /**
   * Destroy this key shard
   */
  destroy() {
    if (this.glowGraphics) {
      this.glowGraphics.destroy();
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
  }

  /**
   * Check if shard overlaps with a rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {boolean} True if overlapping
   */
  overlaps(x, y, width, height) {
    if (this.collected) return false;

    const shardBounds = this.sprite.getBounds();
    return Phaser.Geom.Intersects.RectangleToRectangle(
      shardBounds,
      new Phaser.Geom.Rectangle(x, y, width, height)
    );
  }
}
