import Enemy, { EnemyState } from './Enemy.js';
import { SCALE } from '../config.js';

/**
 * Spider - Ground enemy with smart jumping AI
 *
 * Behaviors:
 * - Patrols back and forth on platforms (like Skitter)
 * - Detects when player is on higher platform and jumps to reach them
 * - Reverses direction at edges and walls
 * - Can be stomped and dashed by player
 * - Ignores web zone slowdown (immune to webs)
 */
export default class Spider extends Enemy {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, {
      width: 8 * SCALE,
      height: 8 * SCALE,
      color: 0x2d2d2d, // Dark body
      speed: 30 * SCALE,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: 75,
      ...config
    });

    // Spider-specific properties
    this.edgeCheckDistance = 4 * SCALE;
    this.wallCheckEnabled = true;
    this.edgeCheckEnabled = true;

    // Jump AI properties
    // Detection ranges (bumped up so spiders react to higher platforms)
    this.chaseRange = 120 * SCALE;         // Horizontal range to detect player
    this.verticalDetectRange = 120 * SCALE; // How far above player can be detected
    this.jumpCheckInterval = 500;          // ms between jump checks
    this.jumpCooldown = 1000;              // ms cooldown after jumping
    this.lastJumpCheck = 0;
    this.lastJumpTime = 0;
    this.jumpVelocity = -220 * SCALE;      // Same as player jump
    this.horizontalJumpBoost = 60 * SCALE; // Boost toward player when jumping

    // Animation properties
    this.legAnimTime = 0;
    this.legAnimSpeed = 10;
  }

  /**
   * Create Spider's visual appearance (dark body with red eyes and legs)
   */
  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    // Generate spider texture
    const textureKey = `enemy_spider_${SCALE}`;
    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics();
      const px = SCALE;

      // Body (dark gray/black)
      graphics.fillStyle(0x2d2d2d, 1);
      graphics.fillRect(2 * px, 2 * px, 4 * px, 4 * px);

      // Abdomen (slightly larger, darker)
      graphics.fillStyle(0x1a1a1a, 1);
      graphics.fillRect(1 * px, 3 * px, 2 * px, 3 * px);

      // Head
      graphics.fillStyle(0x3d3d3d, 1);
      graphics.fillRect(5 * px, 2 * px, 2 * px, 3 * px);

      // Eyes (red, menacing)
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(6 * px, 2 * px, 1 * px, 1 * px);
      graphics.fillRect(6 * px, 4 * px, 1 * px, 1 * px);

      // Legs (4 visible, dark)
      graphics.fillStyle(0x1a1a1a, 1);
      // Top legs
      graphics.fillRect(0, 1 * px, 2 * px, 1 * px);
      graphics.fillRect(6 * px, 1 * px, 2 * px, 1 * px);
      // Bottom legs
      graphics.fillRect(0, 5 * px, 2 * px, 1 * px);
      graphics.fillRect(6 * px, 5 * px, 2 * px, 1 * px);
      // Extended leg tips
      graphics.fillRect(0, 0, 1 * px, 2 * px);
      graphics.fillRect(7 * px, 0, 1 * px, 2 * px);
      graphics.fillRect(0, 6 * px, 1 * px, 2 * px);
      graphics.fillRect(7 * px, 6 * px, 1 * px, 2 * px);

      graphics.generateTexture(textureKey, 8 * px, 8 * px);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * Setup physics for ground movement with jumping
   */
  setupPhysics() {
    super.setupPhysics();

    // Spiders are affected by gravity and collide with platforms
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setCollideWorldBounds(true);
  }

  /**
   * Update Spider behavior
   */
  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    // Check if we should jump toward player
    this.checkJumpToPlayer(time);

    // Check for walls and edges (only when grounded)
    if (this.isGrounded()) {
      this.checkWallsAndEdges();
    }

    // Update movement
    this.updateMovement(time, delta);

    // Update leg animation
    this.updateAnimation(time, delta);
  }

  /**
   * Check if spider is on the ground
   */
  isGrounded() {
    return this.sprite.body.blocked.down || this.sprite.body.touching.down;
  }

  /**
   * Check if player is above and jump toward them
   */
  checkJumpToPlayer(time) {
    // Don't check too frequently
    if (time - this.lastJumpCheck < this.jumpCheckInterval) return;
    this.lastJumpCheck = time;

    // Must be grounded to jump
    if (!this.isGrounded()) return;

    // Must be off cooldown
    if (time - this.lastJumpTime < this.jumpCooldown) return;

    // Get player reference
    const player = this.scene.player;
    if (!player || !player.sprite || player.isDead) return;

    // Check if player is above
    if (this.checkPlayerAbove(player)) {
      this.executeJump(player);
    }
  }

  /**
   * Check if player is on a higher platform within range
   */
  checkPlayerAbove(player) {
    const playerSprite = player.sprite;
    const horizontalDist = Math.abs(playerSprite.x - this.sprite.x);
    const verticalDist = this.sprite.y - playerSprite.y; // Positive if player is above

    return (
      horizontalDist < this.chaseRange &&           // Player nearby horizontally
      verticalDist > 10 * SCALE &&                  // Player at least 1 tile above
      verticalDist < this.verticalDetectRange       // Not too far above
    );
  }

  /**
   * Whether we should actively chase the player (same-range check as jump but more forgiving vertically)
   */
  shouldChasePlayer(player) {
    const playerSprite = player.sprite;
    const horizontalDist = Math.abs(playerSprite.x - this.sprite.x);
    const verticalDist = Math.abs(playerSprite.y - this.sprite.y);

    return (
      horizontalDist < this.chaseRange &&
      verticalDist < this.verticalDetectRange * 1.5 // Let spiders chase even when player slightly above/below
    );
  }

  /**
   * Execute a jump toward the player
   */
  executeJump(player) {
    // Set vertical velocity
    this.sprite.body.setVelocityY(this.jumpVelocity);

    // Add horizontal boost toward player
    const direction = player.sprite.x > this.sprite.x ? 1 : -1;
    this.sprite.body.setVelocityX(this.horizontalJumpBoost * direction);

    // Update facing direction
    this.facing = direction;
    this.sprite.flipX = this.facing < 0;

    // Record jump time
    this.lastJumpTime = this.scene.time.now;

    // eslint-disable-next-line no-console
    console.log('🕷️ Spider: Jumping toward player!');
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
    if (this.edgeCheckEnabled && this.isGrounded()) {
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
   * Update horizontal movement (patrol or chase)
   */
  updateMovement(_time, _delta) {
    const player = this.scene.player;
    let chasing = false;

    // Face and chase the player when nearby
    if (player && player.sprite) {
      if (this.shouldChasePlayer(player)) {
        const direction = player.sprite.x > this.sprite.x ? 1 : -1;
        this.facing = direction;
        this.sprite.flipX = this.facing < 0;
        chasing = true;
      }
    }

    // Only move horizontally when grounded (let physics handle air movement)
    if (this.isGrounded()) {
      const speed = chasing ? this.config.speed * 1.1 : this.config.speed;
      this.sprite.body.setVelocityX(speed * this.facing);
    }
  }

  /**
   * Update leg animation
   */
  updateAnimation(time, delta) {
    this.legAnimTime += delta * this.legAnimSpeed / 1000;

    // Subtle body bob when walking
    if (this.isGrounded() && Math.abs(this.sprite.body.velocity.x) > 5) {
      const bob = Math.sin(this.legAnimTime * 15) * 0.05;
      this.sprite.setRotation(bob);
    } else {
      this.sprite.setRotation(0);
    }
  }

  /**
   * Override death animation for spider-specific effect
   */
  playDeathAnimation() {
    // Curl up and fade effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.3,
      scaleX: 0.8,
      alpha: 0.5,
      rotation: Math.PI / 4,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        // Create leg fragment particles
        this.createLegFragments();

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
   * Create leg fragment particles on death
   */
  createLegFragments() {
    const colors = [0x2d2d2d, 0x1a1a1a, 0x3d3d3d];
    const particleSize = 1 * SCALE;

    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[i % colors.length];
      particle.fillStyle(color, 1);

      // Draw leg-shaped particle
      particle.fillRect(-particleSize, -particleSize / 2, particleSize * 3, particleSize);
      particle.x = this.sprite.x;
      particle.y = this.sprite.y;

      const angle = (i / 6) * Math.PI * 2;
      const distance = (12 + Math.random() * 8) * SCALE;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 8 * SCALE,
        alpha: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
}
