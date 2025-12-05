import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';

/**
 * Player - The player character with feel-first movement controls
 *
 * Features:
 * - Horizontal movement with acceleration/deceleration
 * - Variable jump height (hold for higher)
 * - Coyote time (grace period after leaving platform)
 * - Jump buffer (input memory)
 * - Dash mechanic (consumes Echo charge)
 * - Crouch/drop-through for thin platforms
 */
export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Create player sprite (placeholder rectangle)
    this.sprite = scene.physics.add.sprite(x, y, null);

    // Create a simple rectangle for the player (8x8 pixels, scaled)
    const playerSize = 8 * SCALE;
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x00ffff, 1); // Cyan color
    graphics.fillRect(0, 0, playerSize, playerSize);
    graphics.generateTexture('player', playerSize, playerSize);
    graphics.destroy();

    this.sprite.setTexture('player');
    this.sprite.setOrigin(0.5, 0.5);

    // Physics properties
    this.sprite.body.setSize(playerSize, playerSize);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setMaxVelocity(200 * SCALE, 500 * SCALE);

    // Movement constants (tuned for tight, responsive feel)
    this.moveSpeed = 80 * SCALE;
    this.maxSpeed = 80 * SCALE;
    this.acceleration = 600 * SCALE;
    this.friction = 500 * SCALE;
    this.airAcceleration = 400 * SCALE;
    this.airFriction = 200 * SCALE;

    // Jump constants
    this.jumpVelocity = -220 * SCALE;
    this.jumpHoldBoost = -40 * SCALE; // Additional velocity when holding jump
    this.minJumpVelocity = -100 * SCALE; // Minimum jump when released early
    this.maxJumpHoldTime = 200; // Max time to hold jump for extra height (ms) - time stays same

    // Advanced movement mechanics
    this.coyoteTime = GAME_CONFIG.COYOTE_TIME; // Grace period after leaving platform
    this.jumpBuffer = GAME_CONFIG.JUMP_BUFFER; // Input memory for jump

    // Dash constants
    this.dashSpeed = 200 * SCALE;
    this.dashDuration = 200; // ms - time stays same
    this.dashCooldown = 300; // ms - time stays same

    // State tracking
    this.isGrounded = false;
    this.wasGrounded = false;
    this.lastGroundedTime = 0;
    this.jumpBufferTime = 0;
    this.isJumping = false;
    this.jumpHoldTime = 0;
    this.canJump = true;

    // Dash state
    this.isDashing = false;
    this.dashTime = 0;
    this.dashDirection = 0;
    this.lastDashTime = 0;

    // ScoreManager reference (set externally)
    this.scoreManager = null;

    // Crouch state
    this.isCrouching = false;

    // Input setup
    this.setupInput();

    // Collision setup
    this.setupCollision();
  }

  setupInput() {
    const scene = this.scene;

    // Create keyboard cursors
    this.cursors = scene.input.keyboard.createCursorKeys();

    // Additional keys
    this.keys = {
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      dash: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    };
  }

  setupCollision() {
    // Add collision with solid platforms
    this.scene.physics.add.collider(this.sprite, this.scene.platforms);

    // Add collision with one-way platforms (only when falling from above)
    if (this.scene.oneWayPlatforms) {
      this.oneWayCollider = this.scene.physics.add.collider(
        this.sprite,
        this.scene.oneWayPlatforms,
        null,
        this.checkOneWayCollision,
        this
      );
    }
  }

  /**
   * Check if player should collide with one-way platform
   * Only collide if:
   * - Player is moving downward
   * - Player's bottom edge is above or at the platform's top edge
   * - Player is not pressing down (for drop-through)
   */
  checkOneWayCollision(player, platform) {
    const playerBottom = player.body.y + player.body.height;
    const platformTop = platform.body.y;
    const isMovingDown = player.body.velocity.y >= 0;
    const isAbovePlatform = player.body.prev.y + player.body.height <= platformTop + 4;

    // Allow drop-through when pressing down
    const pressingDown = this.cursors.down.isDown || this.keys.down.isDown;
    if (pressingDown && this.isGrounded && isAbovePlatform) {
      return false;
    }

    // Only collide if player is falling from above
    return isMovingDown && isAbovePlatform;
  }

  update(time, delta) {
    // Update grounded state
    this.updateGroundedState(time);

    // Handle input if not dashing
    if (!this.isDashing) {
      this.handleHorizontalMovement(delta);
      this.handleJump(time, delta);
      this.handleCrouch();
    }

    // Handle dash
    this.handleDash(time, delta);

    // Apply friction when on ground
    this.applyFriction(delta);
  }

  updateGroundedState(time) {
    this.wasGrounded = this.isGrounded;
    this.isGrounded = this.sprite.body.blocked.down || this.sprite.body.touching.down;

    // Update coyote time
    if (this.isGrounded) {
      this.lastGroundedTime = time;
      this.canJump = true;
      this.isJumping = false;
      this.jumpHoldTime = 0;
    }
  }

  handleHorizontalMovement(delta) {
    const body = this.sprite.body;
    const leftPressed = this.cursors.left.isDown || this.keys.left.isDown;
    const rightPressed = this.cursors.right.isDown || this.keys.right.isDown;

    // Determine acceleration based on whether player is grounded
    const accel = this.isGrounded ? this.acceleration : this.airAcceleration;

    if (leftPressed && !rightPressed) {
      // Move left
      body.setAccelerationX(-accel);
      this.sprite.flipX = true;
    } else if (rightPressed && !leftPressed) {
      // Move right
      body.setAccelerationX(accel);
      this.sprite.flipX = false;
    } else {
      // No input - let friction slow us down
      body.setAccelerationX(0);
    }
  }

  handleJump(time, delta) {
    const jumpPressed = this.cursors.up.isDown || this.keys.jump.isDown;
    const jumpJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                            Phaser.Input.Keyboard.JustDown(this.keys.jump);

    // Jump buffer - remember jump input for a short time
    if (jumpJustPressed) {
      this.jumpBufferTime = time;
    }

    // Check if we can jump (on ground or within coyote time)
    const canCoyoteJump = !this.isGrounded &&
                          time - this.lastGroundedTime < this.coyoteTime &&
                          this.canJump;

    const withinJumpBuffer = time - this.jumpBufferTime < this.jumpBuffer;

    // Initiate jump
    if (withinJumpBuffer && (this.isGrounded || canCoyoteJump) && this.canJump) {
      this.jump();
    }

    // Variable jump height - hold jump for higher jump
    if (this.isJumping && jumpPressed && this.jumpHoldTime < this.maxJumpHoldTime) {
      this.jumpHoldTime += delta;
      // Continue applying upward force
      this.sprite.body.velocity.y += this.jumpHoldBoost * (delta / 16);
    }

    // Release jump early - cut velocity
    if (this.isJumping && !jumpPressed && this.sprite.body.velocity.y < this.minJumpVelocity) {
      this.sprite.body.velocity.y = this.minJumpVelocity;
      this.isJumping = false;
    }
  }

  jump() {
    this.sprite.body.setVelocityY(this.jumpVelocity);
    this.isJumping = true;
    this.jumpHoldTime = 0;
    this.canJump = false;
    console.log('🎮 Player: Jump!');
  }

  handleDash(time, delta) {
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.dash);

    // Get echo charges from score manager
    const hasCharges = this.scoreManager ? this.scoreManager.getEchoCharges() > 0 : false;

    // Start dash
    if (dashPressed && !this.isDashing && hasCharges &&
        time - this.lastDashTime > this.dashCooldown) {
      this.startDash(time);
    }

    // Continue dash
    if (this.isDashing) {
      this.dashTime += delta;

      if (this.dashTime >= this.dashDuration) {
        this.endDash();
      }
    }
  }

  startDash(time) {
    // Determine dash direction based on current velocity or facing
    let dashDir = 0;

    if (this.sprite.body.velocity.x !== 0) {
      dashDir = Math.sign(this.sprite.body.velocity.x);
    } else {
      dashDir = this.sprite.flipX ? -1 : 1;
    }

    this.isDashing = true;
    this.dashTime = 0;
    this.dashDirection = dashDir;
    this.lastDashTime = time;

    // Use echo charge from score manager
    if (this.scoreManager) {
      this.scoreManager.useEchoCharge();
    }

    // Apply dash velocity
    this.sprite.body.setVelocityX(this.dashSpeed * dashDir);
    this.sprite.body.setVelocityY(0);
    this.sprite.body.setAccelerationX(0);

    const chargesLeft = this.scoreManager ? this.scoreManager.getEchoCharges() : 0;
    console.log('🎮 Player: Dash! Direction:', dashDir, 'Charges left:', chargesLeft);
  }

  endDash() {
    this.isDashing = false;
    this.dashTime = 0;
    this.sprite.body.setAccelerationX(0);
    console.log('🎮 Player: Dash ended');
  }

  handleCrouch() {
    const downPressed = this.cursors.down.isDown || this.keys.down.isDown;

    this.isCrouching = downPressed && this.isGrounded;

    // Drop-through is handled in checkOneWayCollision()
  }

  applyFriction(delta) {
    // Apply friction when no horizontal input
    if (this.sprite.body.acceleration.x === 0 && !this.isDashing) {
      const friction = this.isGrounded ? this.friction : this.airFriction;
      const velocityX = this.sprite.body.velocity.x;

      if (Math.abs(velocityX) > 0) {
        const frictionForce = friction * (delta / 1000);
        const newVelocityX = Math.abs(velocityX) - frictionForce;

        if (newVelocityX <= 0) {
          this.sprite.body.setVelocityX(0);
        } else {
          this.sprite.body.setVelocityX(newVelocityX * Math.sign(velocityX));
        }
      }
    }
  }

  // Public methods for external interaction
  // Echo charges are now managed by ScoreManager

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }
}
