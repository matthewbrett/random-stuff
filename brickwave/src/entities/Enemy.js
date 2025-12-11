import { SCALE } from '../config.js';

/**
 * Enemy - Base class for all enemies
 *
 * Features:
 * - Common movement and collision behaviors
 * - Stomp and dash-to-tag combat mechanics
 * - Death animation and feedback
 * - Subclasses implement specific behaviors
 */

export const EnemyState = {
  ACTIVE: 'active',
  DYING: 'dying',
  DEAD: 'dead',
};

export default class Enemy {
  constructor(scene, x, y, config = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Configuration with defaults
    this.config = {
      width: 8 * SCALE,
      height: 8 * SCALE,
      color: 0xff0000,
      speed: 30 * SCALE,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: 50,
      ...config
    };

    this.speedMultiplier = config.speedMultiplier ?? 1;
    this.config.speed *= this.speedMultiplier;

    // State
    this.state = EnemyState.ACTIVE;
    this.facing = 1; // 1 = right, -1 = left

    // Health (allow multi-hit enemies)
    this.health = config.health ?? 1;

    // Create sprite (subclasses should override createSprite for custom visuals)
    this.createSprite();

    // Physics setup
    this.setupPhysics();
  }

  /**
   * Create the enemy sprite
   * Override in subclasses for custom visuals
   */
  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    // Generate a default texture if needed
    const textureKey = `enemy_${this.config.color.toString(16)}`;
    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(this.config.color, 1);
      graphics.fillRect(0, 0, this.config.width, this.config.height);
      graphics.generateTexture(textureKey, this.config.width, this.config.height);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * Setup physics properties
   */
  setupPhysics() {
    this.sprite.body.setSize(this.config.width, this.config.height);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setImmovable(false);
    this.sprite.body.setBounce(0, 0);
  }

  /**
   * Update the enemy - called every frame
   * Override in subclasses for specific behaviors
   */
  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    // Default behavior: basic movement
    this.updateMovement(time, delta);
  }

  /**
   * Update movement - override in subclasses
   */
  updateMovement(_time, _delta) {
    // Default: move in facing direction
    this.sprite.body.setVelocityX(this.config.speed * this.facing);
  }

  /**
   * Check if player stomped this enemy (hit from above)
   * @param {Player} player - The player object
   * @returns {boolean} True if stomped
   */
  checkStomp(player) {
    if (this.state !== EnemyState.ACTIVE || !this.config.canBeStopped) return false;

    const playerSprite = player.sprite;
    const enemySprite = this.sprite;

    // Check if player is above enemy and moving downward
    const playerBottom = playerSprite.body.y + playerSprite.body.height;
    const enemyTop = enemySprite.body.y;
    const isAbove = playerBottom <= enemyTop + 6 * SCALE; // Small tolerance (scaled)
    const isFalling = playerSprite.body.velocity.y > 0;

    return isAbove && isFalling;
  }

  /**
   * Check if player dashed into this enemy
   * @param {Player} player - The player object
   * @returns {boolean} True if dashed
   */
  checkDash(player) {
    if (this.state !== EnemyState.ACTIVE || !this.config.canBeDashed) return false;

    return player.isDashing;
  }

  /**
   * Handle being stomped by player
   * @param {Player} player - The player who stomped
   */
  onStomp(player) {
    this.takeHit();

    // Bounce the player up after stomp (scaled)
    player.sprite.body.setVelocityY(-150 * SCALE);

    // eslint-disable-next-line no-console
    console.log(`👟 Enemy stomped! +${this.config.scoreValue}`);
  }

  /**
   * Handle being dashed by player
   * @param {Player} player - The player who dashed
   */
  onDash(_player) {
    this.takeHit();

    // eslint-disable-next-line no-console
    console.log(`💨 Enemy dashed! +${this.config.scoreValue}`);
  }

  /**
   * Apply damage to this enemy
   * @param {number} amount - Damage amount
   */
  takeHit(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    } else {
      this.flashOnHit();
    }
  }

  /**
   * Flash briefly when taking damage but not dying
   */
  flashOnHit() {
    if (!this.sprite) return;

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.3, to: 1 },
      duration: 120,
      yoyo: true,
      repeat: 1
    });
  }

  /**
   * Handle collision with player (player takes damage)
   * @param {Player} player - The player object
   * @returns {boolean} True if the player should take damage
   */
  onPlayerCollision(_player) {
    // TODO: Implement player damage/death in later phase
    // eslint-disable-next-line no-console
    console.log('💥 Player hit by enemy!');
    return true;
  }

  /**
   * Kill this enemy
   */
  die() {
    if (this.state !== EnemyState.ACTIVE) return;

    this.state = EnemyState.DYING;
    this.sprite.body.setVelocity(0, 0);
    this.sprite.body.setAllowGravity(false);

    // Play death animation
    this.playDeathAnimation();
  }

  /**
   * Play death animation
   */
  playDeathAnimation() {
    // Squash and fade effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.2,
      scaleX: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.state = EnemyState.DEAD;
        this.createDeathParticles();
        this.destroy();
      }
    });
  }

  /**
   * Create death particle effect
   */
  createDeathParticles() {
    // Simple particle burst (scaled)
    const particleSize = 2 * SCALE;
    const particleDistance = 20 * SCALE;
    for (let i = 0; i < 4; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(this.config.color, 1);
      particle.fillRect(-particleSize, -particleSize, particleSize * 2, particleSize * 2);
      particle.x = this.sprite.x;
      particle.y = this.sprite.y;

      const angle = (i / 4) * Math.PI * 2;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * particleDistance,
        y: particle.y + Math.sin(angle) * particleDistance,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Get score value for killing this enemy
   */
  getScoreValue() {
    return this.config.scoreValue;
  }

  /**
   * Check if enemy is active
   */
  isActive() {
    return this.state === EnemyState.ACTIVE;
  }

  /**
   * Check if enemy is dead
   */
  isDead() {
    return this.state === EnemyState.DEAD;
  }

  /**
   * Get bounds for collision checking
   */
  getBounds() {
    return this.sprite.getBounds();
  }

  /**
   * Whether this enemy should harm the player on contact
   * Subclasses can override for special cases (e.g., disguised mimic)
   */
  isDangerous() {
    return this.state === EnemyState.ACTIVE;
  }

  /**
   * Optional hook when the player overlaps the enemy (before harm logic)
   */
  onPlayerOverlap(_player) {
    // Default: no-op
  }

  /**
   * Destroy this enemy
   */
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
