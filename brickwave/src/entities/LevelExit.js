import Phaser from 'phaser';
import { SCALE } from '../config.js';

/**
 * LevelExit - Door/flag that marks the end of a level
 *
 * Features:
 * - Glowing portal appearance
 * - Animated effect when approached
 * - Triggers level completion when player enters
 */
export default class LevelExit {
  constructor(scene, x, y) {
    this.scene = scene;
    this.triggered = false;
    this.playerNearby = false;
    this.locked = false;
    this.requiredKeyShards = 0;
    this.collectedKeyShards = 0;

    // Exit dimensions (larger than a tile for visibility)
    this.width = 16 * SCALE;
    this.height = 24 * SCALE;

    // Create exit sprite
    this.sprite = scene.physics.add.sprite(x, y - (this.height / 4), null);

    // Create exit texture (portal door)
    const textureKey = `levelexit_${SCALE}`;
    if (!scene.textures.exists(textureKey)) {
      const graphics = scene.add.graphics();

      // Draw door frame (dark purple)
      graphics.fillStyle(0x2a1a4a, 1);
      graphics.fillRoundedRect(0, 0, this.width, this.height, 4 * SCALE);

      // Draw inner portal (glowing blue)
      graphics.fillStyle(0x4a90d9, 1);
      graphics.fillRoundedRect(2 * SCALE, 2 * SCALE, this.width - 4 * SCALE, this.height - 4 * SCALE, 2 * SCALE);

      // Draw portal swirl lines
      graphics.lineStyle(1 * SCALE, 0x8ecae6, 0.7);
      graphics.beginPath();
      graphics.arc(this.width / 2, this.height / 2, 4 * SCALE, 0, Math.PI * 1.5);
      graphics.strokePath();

      graphics.lineStyle(1 * SCALE, 0xffffff, 0.5);
      graphics.beginPath();
      graphics.arc(this.width / 2, this.height / 2, 6 * SCALE, Math.PI * 0.5, Math.PI * 2);
      graphics.strokePath();

      graphics.generateTexture(textureKey, this.width, this.height);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 1); // Bottom-center origin

    // Physics setup
    this.sprite.body.setSize(this.width * 0.6, this.height * 0.8);
    this.sprite.body.setOffset(this.width * 0.2, this.height * 0.1);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);

    // Create glow effect layer behind door
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setDepth(-1);

    // Animation properties
    this.animTime = 0;

    // Create particle emitter for ambient effect
    this.particles = [];
  }

  /**
   * Update exit animation
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    if (this.triggered) return;

    this.animTime += delta;

    const baseGlowColor = this.locked ? 0xd35454 : 0x4a90d9;
    const accentGlowColor = this.locked ? 0xffb3a1 : 0x8ecae6;

    // Pulsing glow effect
    const glowIntensity = 0.3 + Math.sin(this.animTime / 500) * 0.2;
    const glowSize = (20 + Math.sin(this.animTime / 300) * 5) * SCALE;

    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(baseGlowColor, glowIntensity);
    this.glowGraphics.fillCircle(this.sprite.x, this.sprite.y - this.height / 2, glowSize);

    // Stronger glow when player is nearby
    if (this.playerNearby) {
      this.glowGraphics.fillStyle(accentGlowColor, glowIntensity + 0.2);
      this.glowGraphics.fillCircle(this.sprite.x, this.sprite.y - this.height / 2, glowSize * 0.7);
    }

    // Spawn ambient particles occasionally
    if (Math.random() < 0.05) {
      this.spawnParticle();
    }

    // Update existing particles
    this.updateParticles(delta);
  }

  /**
   * Spawn a floating particle
   */
  spawnParticle() {
    const particle = this.scene.add.graphics();
    particle.fillStyle(0x8ecae6, 0.8);
    particle.fillCircle(0, 0, 2 * SCALE);

    const startX = this.sprite.x + (Math.random() - 0.5) * this.width;
    const startY = this.sprite.y - Math.random() * this.height * 0.5;
    particle.setPosition(startX, startY);

    this.particles.push({
      graphics: particle,
      x: startX,
      y: startY,
      velocityY: -20 * SCALE,
      life: 1000,
    });
  }

  /**
   * Update ambient particles
   */
  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.y += (p.velocityY * delta) / 1000;
      p.graphics.setPosition(p.x, p.y);
      p.graphics.setAlpha(p.life / 1000);

      if (p.life <= 0) {
        p.graphics.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Trigger level completion
   * @returns {boolean} True if successfully triggered
   */
  trigger() {
    if (this.triggered || this.locked) return false;

    this.triggered = true;

    // Create dramatic exit effect
    this.createExitEffect();

    return true;
  }

  /**
   * Create visual effect when level is completed
   */
  createExitEffect() {
    // Bright flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 1);
    flash.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    flash.setScrollFactor(0);
    flash.setDepth(1000);
    flash.setAlpha(0);

    this.scene.tweens.add({
      targets: flash,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 200,
      onComplete: () => {
        flash.destroy();
      }
    });

    // Expanding rings from portal
    for (let i = 0; i < 5; i++) {
      const ring = this.scene.add.graphics();
      ring.lineStyle(3 * SCALE, 0x8ecae6, 1);
      ring.strokeCircle(0, 0, 10 * SCALE);
      ring.setPosition(this.sprite.x, this.sprite.y - this.height / 2);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 10 + i * 2,
        scaleY: 10 + i * 2,
        alpha: 0,
        duration: 800 + i * 150,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => {
          ring.destroy();
        }
      });
    }
  }

  /**
   * Set whether player is nearby (for visual feedback)
   * @param {boolean} nearby - True if player is near
   */
  setPlayerNearby(nearby) {
    this.playerNearby = nearby;
  }

  /**
   * Destroy this exit
   */
  destroy() {
    // Destroy particles
    this.particles.forEach(p => p.graphics.destroy());
    this.particles = [];

    if (this.glowGraphics) {
      this.glowGraphics.destroy();
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
  }

  /**
   * Check if exit overlaps with a rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {boolean} True if overlapping
   */
  overlaps(x, y, width, height) {
    if (this.triggered) return false;

    const exitBounds = this.sprite.getBounds();
    return Phaser.Geom.Intersects.RectangleToRectangle(
      exitBounds,
      new Phaser.Geom.Rectangle(x, y, width, height)
    );
  }

  /**
   * Update lock state based on shard requirement
   * @param {number} required - Required shards to unlock
   * @param {number} collected - Currently collected shards
   */
  updateShardStatus(required, collected) {
    this.requiredKeyShards = required;
    this.collectedKeyShards = collected;
    this.locked = collected < required;
  }

  /**
   * Whether the exit is locked
   * @returns {boolean} Lock state
   */
  isLocked() {
    return this.locked;
  }
}
