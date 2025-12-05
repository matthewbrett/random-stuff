import Enemy, { EnemyState } from './Enemy.js';
import { SCALE } from '../config.js';

/**
 * Skitter - Ground beetle enemy
 *
 * Behaviors:
 * - Patrols back and forth on platforms
 * - Reverses direction at edges
 * - Can be stomped by player
 * - Simple but effective ground threat
 */
export default class Skitter extends Enemy {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, {
      width: 8 * SCALE,
      height: 6 * SCALE,
      color: 0x8b4513, // Brown beetle color
      speed: 25 * SCALE,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: 50,
      ...config
    });

    // Skitter-specific properties
    this.edgeCheckDistance = 4 * SCALE; // How far ahead to check for edges
    this.wallCheckEnabled = true;
    this.edgeCheckEnabled = true;

    // Animation properties
    this.wiggleTime = 0;
    this.wiggleSpeed = 8;
    this.wiggleAmount = 0.1;
  }

  /**
   * Create Skitter's visual appearance
   */
  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    // Generate skitter texture (beetle-like appearance, scaled)
    const textureKey = `enemy_skitter_${SCALE}`;
    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics();

      // Body (dark brown)
      graphics.fillStyle(0x8b4513, 1);
      graphics.fillRect(1 * SCALE, 2 * SCALE, 6 * SCALE, 4 * SCALE);

      // Shell segments (lighter brown)
      graphics.fillStyle(0xa0522d, 1);
      graphics.fillRect(2 * SCALE, 2 * SCALE, 2 * SCALE, 3 * SCALE);
      graphics.fillRect(5 * SCALE, 2 * SCALE, 2 * SCALE, 3 * SCALE);

      // Head (darker)
      graphics.fillStyle(0x654321, 1);
      graphics.fillRect(0, 3 * SCALE, 2 * SCALE, 2 * SCALE);

      // Eyes (small dots)
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(0, 3 * SCALE, 1 * SCALE, 1 * SCALE);

      graphics.generateTexture(textureKey, 8 * SCALE, 6 * SCALE);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * Setup physics for ground movement
   */
  setupPhysics() {
    super.setupPhysics();

    // Skitters are affected by gravity and collide with platforms
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setCollideWorldBounds(true);
  }

  /**
   * Update Skitter behavior
   */
  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    // Check for walls and edges
    this.checkWallsAndEdges();

    // Update movement
    this.updateMovement(time, delta);

    // Update animation
    this.updateAnimation(time, delta);
  }

  /**
   * Check for walls and platform edges
   */
  checkWallsAndEdges() {
    // Check for wall collision (blocked horizontally)
    if (this.wallCheckEnabled) {
      const blocked = this.facing > 0 ? this.sprite.body.blocked.right : this.sprite.body.blocked.left;
      if (blocked) {
        this.reverseDirection();
        return;
      }
    }

    // Check for edge (no ground ahead) - only when grounded
    if (this.edgeCheckEnabled && this.sprite.body.blocked.down) {
      if (this.checkEdgeAhead()) {
        this.reverseDirection();
      }
    }
  }

  /**
   * Check if there's an edge (no platform) ahead
   */
  checkEdgeAhead() {
    const checkX = this.sprite.x + (this.facing * this.config.width);
    const checkY = this.sprite.y + this.config.height / 2 + 2 * SCALE;

    // Check if there's a solid tile below the position ahead
    const platforms = this.scene.platforms;
    if (!platforms) return false;

    // Get tiles at the position
    let hasGroundAhead = false;

    platforms.children.iterate((platform) => {
      if (hasGroundAhead) return;

      const bounds = platform.getBounds();
      const checkRect = new Phaser.Geom.Rectangle(checkX - 2 * SCALE, checkY, 4 * SCALE, 8 * SCALE);

      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, checkRect)) {
        hasGroundAhead = true;
      }
    });

    return !hasGroundAhead;
  }

  /**
   * Reverse patrol direction
   */
  reverseDirection() {
    this.facing *= -1;
    this.sprite.flipX = this.facing < 0;
  }

  /**
   * Update horizontal movement
   */
  updateMovement(time, delta) {
    // Move in facing direction
    this.sprite.body.setVelocityX(this.config.speed * this.facing);
  }

  /**
   * Update wiggle animation for beetle-like movement
   */
  updateAnimation(time, delta) {
    this.wiggleTime += delta * this.wiggleSpeed / 1000;

    // Subtle rotation wiggle
    const wiggle = Math.sin(this.wiggleTime * 10) * this.wiggleAmount;
    this.sprite.setRotation(wiggle);
  }

  /**
   * Override death animation for squash effect
   */
  playDeathAnimation() {
    // Squish effect - beetle gets flattened
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.1,
      scaleX: 1.8,
      alpha: 0.5,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        // Create shell fragments
        this.createShellFragments();

        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          duration: 100,
          onComplete: () => {
            this.state = EnemyState.DEAD;
            this.destroy();
          }
        });
      }
    });
  }

  /**
   * Create shell fragment particles
   */
  createShellFragments() {
    const colors = [0x8b4513, 0xa0522d, 0x654321];
    const particleSize = 1 * SCALE;

    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[i % colors.length];
      particle.fillStyle(color, 1);
      particle.fillRect(-particleSize, -particleSize, particleSize * 2, particleSize * 2);
      particle.x = this.sprite.x;
      particle.y = this.sprite.y;

      const angle = (Math.random() * Math.PI * 2);
      const distance = (10 + Math.random() * 10) * SCALE;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 10 * SCALE,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
}
