import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import audioManager from '../systems/AudioManager.js';
import particleEffects from '../systems/ParticleEffects.js';
import inputManager from '../systems/InputManager.js';
import saveManager from '../systems/SaveManager.js';

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

    // Create animated player sprite textures
    this.createPlayerTextures();

    // Create player sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle');
    this.sprite.setOrigin(0.5, 0.5);

    // Setup animations
    this.setupAnimations();

    // Physics properties - 16x16 sprite but smaller hitbox for fairness
    const hitboxSize = 12 * SCALE;
    this.sprite.body.setSize(hitboxSize, 14 * SCALE);
    this.sprite.body.setOffset((16 * SCALE - hitboxSize) / 2, 2 * SCALE);
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

    // Health system
    this.maxHealth = 4;
    this.currentHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.invincibilityDuration = 1500; // 1.5 seconds
    this.isDead = false;
    this.flashTween = null;

    // Input setup
    this.setupInput();

    // Collision setup
    this.setupCollision();
  }

  setupInput() {
    const scene = this.scene;

    // Initialize input manager if not already done
    if (!inputManager.initialized) {
      inputManager.init(scene);
    }

    // Create keyboard cursors as fallback
    this.cursors = scene.input.keyboard.createCursorKeys();

    // Additional keys as fallback
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
   * Create all player sprite textures using procedural pixel art
   * Cat character with light armor - 16x16 pixels
   */
  createPlayerTextures() {
    // Skip if textures already exist
    if (this.scene.textures.exists('player_idle')) return;

    const size = 16 * SCALE;
    const graphics = this.scene.add.graphics();

    // Color palette
    const colors = {
      fur: 0x00ffff,        // Cyan fur
      furDark: 0x006666,    // Dark cyan shadows
      armor: 0xc0c0c0,      // Silver armor
      armorDark: 0x808080,  // Dark armor shadows
      highlight: 0xffffff,  // White highlights
      eye: 0xff00ff,        // Magenta eye
    };

    // Create idle frame
    this.drawCatIdle(graphics, size, colors);
    graphics.generateTexture('player_idle', size, size);
    graphics.clear();

    // Create run frames (4 frames)
    for (let i = 0; i < 4; i++) {
      this.drawCatRun(graphics, size, colors, i);
      graphics.generateTexture(`player_run_${i}`, size, size);
      graphics.clear();
    }

    // Create jump frame
    this.drawCatJump(graphics, size, colors);
    graphics.generateTexture('player_jump', size, size);
    graphics.clear();

    // Create fall frame
    this.drawCatFall(graphics, size, colors);
    graphics.generateTexture('player_fall', size, size);
    graphics.clear();

    graphics.destroy();
  }

  /**
   * Draw idle cat sprite
   */
  drawCatIdle(graphics, size, colors) {
    const px = SCALE; // Pixel size

    // Body (standing upright, slightly hunched)
    graphics.fillStyle(colors.fur, 1);
    // Main body
    graphics.fillRect(5 * px, 7 * px, 6 * px, 6 * px);
    // Head
    graphics.fillRect(4 * px, 2 * px, 8 * px, 6 * px);

    // Ears (pointed)
    graphics.fillRect(4 * px, 0, 2 * px, 3 * px);
    graphics.fillRect(10 * px, 0, 2 * px, 3 * px);

    // Dark fur shadows
    graphics.fillStyle(colors.furDark, 1);
    graphics.fillRect(4 * px, 5 * px, 1 * px, 3 * px);
    graphics.fillRect(6 * px, 11 * px, 4 * px, 2 * px);

    // Armor (chest plate)
    graphics.fillStyle(colors.armor, 1);
    graphics.fillRect(6 * px, 7 * px, 4 * px, 4 * px);

    // Armor highlight
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(6 * px, 7 * px, 1 * px, 2 * px);

    // Armor shadow
    graphics.fillStyle(colors.armorDark, 1);
    graphics.fillRect(9 * px, 9 * px, 1 * px, 2 * px);

    // Eye
    graphics.fillStyle(colors.eye, 1);
    graphics.fillRect(9 * px, 4 * px, 2 * px, 2 * px);

    // Eye highlight
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(9 * px, 4 * px, 1 * px, 1 * px);

    // Legs
    graphics.fillStyle(colors.fur, 1);
    graphics.fillRect(5 * px, 13 * px, 2 * px, 3 * px);
    graphics.fillRect(9 * px, 13 * px, 2 * px, 3 * px);

    // Tail (curled up)
    graphics.fillRect(2 * px, 9 * px, 3 * px, 2 * px);
    graphics.fillRect(1 * px, 7 * px, 2 * px, 3 * px);
  }

  /**
   * Draw running cat sprite frame
   */
  drawCatRun(graphics, size, colors, frame) {
    const px = SCALE;
    const legOffset = [0, 1, 0, -1][frame]; // Leg animation cycle
    const tailOffset = [0, 1, 2, 1][frame]; // Tail swish

    // Body (leaning forward)
    graphics.fillStyle(colors.fur, 1);
    // Main body
    graphics.fillRect(4 * px, 6 * px, 8 * px, 5 * px);
    // Head (forward)
    graphics.fillRect(8 * px, 2 * px, 6 * px, 5 * px);

    // Ears
    graphics.fillRect(9 * px, 0, 2 * px, 3 * px);
    graphics.fillRect(12 * px, 1 * px, 2 * px, 2 * px);

    // Dark fur shadows
    graphics.fillStyle(colors.furDark, 1);
    graphics.fillRect(4 * px, 9 * px, 2 * px, 2 * px);

    // Armor
    graphics.fillStyle(colors.armor, 1);
    graphics.fillRect(6 * px, 6 * px, 4 * px, 4 * px);

    // Armor highlight
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(6 * px, 6 * px, 1 * px, 2 * px);

    // Eye
    graphics.fillStyle(colors.eye, 1);
    graphics.fillRect(12 * px, 3 * px, 2 * px, 2 * px);
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(12 * px, 3 * px, 1 * px, 1 * px);

    // Legs (animated)
    graphics.fillStyle(colors.fur, 1);
    // Front legs
    graphics.fillRect((10 + legOffset) * px, 11 * px, 2 * px, 5 * px);
    graphics.fillRect((7 - legOffset) * px, 11 * px, 2 * px, 5 * px);
    // Back legs
    graphics.fillRect((4 + legOffset) * px, 11 * px, 2 * px, 5 * px);

    // Tail (swishing)
    graphics.fillRect((1 + tailOffset) * px, 5 * px, 4 * px, 2 * px);
    graphics.fillRect(tailOffset * px, 4 * px, 2 * px, 2 * px);
  }

  /**
   * Draw jumping cat sprite (pouncing pose)
   */
  drawCatJump(graphics, size, colors) {
    const px = SCALE;

    // Body (stretched upward)
    graphics.fillStyle(colors.fur, 1);
    // Main body (vertical)
    graphics.fillRect(5 * px, 5 * px, 6 * px, 8 * px);
    // Head (looking up)
    graphics.fillRect(4 * px, 0, 8 * px, 6 * px);

    // Ears (alert)
    graphics.fillRect(3 * px, 0, 2 * px, 2 * px);
    graphics.fillRect(11 * px, 0, 2 * px, 2 * px);

    // Dark shadows
    graphics.fillStyle(colors.furDark, 1);
    graphics.fillRect(5 * px, 11 * px, 2 * px, 2 * px);

    // Armor
    graphics.fillStyle(colors.armor, 1);
    graphics.fillRect(6 * px, 6 * px, 4 * px, 4 * px);
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(6 * px, 6 * px, 1 * px, 2 * px);

    // Eye
    graphics.fillStyle(colors.eye, 1);
    graphics.fillRect(9 * px, 2 * px, 2 * px, 2 * px);
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(9 * px, 2 * px, 1 * px, 1 * px);

    // Legs (tucked)
    graphics.fillStyle(colors.fur, 1);
    graphics.fillRect(4 * px, 13 * px, 3 * px, 2 * px);
    graphics.fillRect(9 * px, 13 * px, 3 * px, 2 * px);

    // Tail (extended behind)
    graphics.fillRect(1 * px, 8 * px, 4 * px, 2 * px);
    graphics.fillRect(0, 6 * px, 2 * px, 3 * px);
  }

  /**
   * Draw falling cat sprite (splayed limbs)
   */
  drawCatFall(graphics, size, colors) {
    const px = SCALE;

    // Body (spread out)
    graphics.fillStyle(colors.fur, 1);
    // Main body (horizontal-ish)
    graphics.fillRect(4 * px, 5 * px, 8 * px, 5 * px);
    // Head
    graphics.fillRect(6 * px, 1 * px, 6 * px, 5 * px);

    // Ears (flattened)
    graphics.fillRect(5 * px, 1 * px, 2 * px, 2 * px);
    graphics.fillRect(11 * px, 1 * px, 2 * px, 2 * px);

    // Dark shadows
    graphics.fillStyle(colors.furDark, 1);
    graphics.fillRect(4 * px, 8 * px, 2 * px, 2 * px);

    // Armor
    graphics.fillStyle(colors.armor, 1);
    graphics.fillRect(6 * px, 5 * px, 4 * px, 4 * px);
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(6 * px, 5 * px, 1 * px, 2 * px);

    // Eye (wide, surprised)
    graphics.fillStyle(colors.eye, 1);
    graphics.fillRect(10 * px, 2 * px, 2 * px, 2 * px);
    graphics.fillStyle(colors.highlight, 1);
    graphics.fillRect(10 * px, 2 * px, 1 * px, 1 * px);

    // Legs (splayed outward)
    graphics.fillStyle(colors.fur, 1);
    // Front paws reaching
    graphics.fillRect(12 * px, 8 * px, 3 * px, 2 * px);
    graphics.fillRect(14 * px, 9 * px, 2 * px, 3 * px);
    // Back paws
    graphics.fillRect(1 * px, 8 * px, 3 * px, 2 * px);
    graphics.fillRect(0, 9 * px, 2 * px, 3 * px);

    // Tail (up for balance)
    graphics.fillRect(2 * px, 2 * px, 2 * px, 4 * px);
    graphics.fillRect(1 * px, 0, 2 * px, 3 * px);
  }

  /**
   * Setup player animations
   */
  setupAnimations() {
    // Idle animation (single frame)
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: [{ key: 'player_idle' }],
        frameRate: 10
      });
    }

    // Run animation (4 frames)
    if (!this.scene.anims.exists('player_run')) {
      this.scene.anims.create({
        key: 'player_run',
        frames: [
          { key: 'player_run_0' },
          { key: 'player_run_1' },
          { key: 'player_run_2' },
          { key: 'player_run_3' }
        ],
        frameRate: 12,
        repeat: -1
      });
    }

    // Jump animation (single frame)
    if (!this.scene.anims.exists('player_jump')) {
      this.scene.anims.create({
        key: 'player_jump',
        frames: [{ key: 'player_jump' }],
        frameRate: 10
      });
    }

    // Fall animation (single frame)
    if (!this.scene.anims.exists('player_fall')) {
      this.scene.anims.create({
        key: 'player_fall',
        frames: [{ key: 'player_fall' }],
        frameRate: 10
      });
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
    const platformTop = platform.body.y;
    const isMovingDown = player.body.velocity.y >= 0;
    const isAbovePlatform = player.body.prev.y + player.body.height <= platformTop + 4;

    // Allow drop-through when pressing down (using inputManager)
    const pressingDown = inputManager.isDown('down');
    if (pressingDown && this.isGrounded && isAbovePlatform) {
      return false;
    }

    // Only collide if player is falling from above
    return isMovingDown && isAbovePlatform;
  }

  update(time, delta) {
    // Skip all updates if dead
    if (this.isDead) {
      return;
    }

    // Update invincibility timer
    if (this.isInvincible) {
      this.invincibilityTimer += delta;
      if (this.invincibilityTimer >= this.invincibilityDuration) {
        this.endInvincibility();
      }
    }

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

    // Update animation state
    this.updateAnimation();
  }

  /**
   * Update player animation based on movement state
   */
  updateAnimation() {
    if (this.isDead || this.isDashing) return;

    // Determine animation based on state
    if (!this.isGrounded) {
      // In the air
      if (this.sprite.body.velocity.y < 0) {
        this.sprite.play('player_jump', true);
      } else {
        this.sprite.play('player_fall', true);
      }
    } else if (Math.abs(this.sprite.body.velocity.x) > 5) {
      // Running on ground
      this.sprite.play('player_run', true);
    } else {
      // Idle on ground
      this.sprite.play('player_idle', true);
    }
  }

  updateGroundedState(time) {
    this.wasGrounded = this.isGrounded;
    this.isGrounded = this.sprite.body.blocked.down || this.sprite.body.touching.down;

    // Play land sound and dust when just landed
    if (this.isGrounded && !this.wasGrounded) {
      audioManager.playLand();
      particleEffects.createLandingDust(this.sprite.x, this.sprite.y + 4 * SCALE);
    }

    // Update coyote time
    if (this.isGrounded) {
      this.lastGroundedTime = time;
      this.canJump = true;
      this.isJumping = false;
      this.jumpHoldTime = 0;
    }
  }

  handleHorizontalMovement(_delta) {
    const body = this.sprite.body;
    // Use inputManager for unified input (keyboard + touch)
    const leftPressed = inputManager.isDown('left');
    const rightPressed = inputManager.isDown('right');

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
    // Use inputManager for unified input (keyboard + touch)
    const jumpPressed = inputManager.isDown('jump');
    const jumpJustPressed = inputManager.justDown('jump');

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
    audioManager.playJump();
  }

  handleDash(time, delta) {
    // Use inputManager for unified input (keyboard + touch)
    const dashPressed = inputManager.justDown('dash');

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

      // Create dash trail particles
      if (this.dashTime % 50 < delta) { // Every ~50ms
        particleEffects.createDashTrail(
          this.sprite.x,
          this.sprite.y,
          this.dashDirection
        );
      }

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

    audioManager.playDash();
  }

  endDash() {
    this.isDashing = false;
    this.dashTime = 0;
    this.sprite.body.setAccelerationX(0);
    // eslint-disable-next-line no-console
    console.log('🎮 Player: Dash ended');
  }

  handleCrouch() {
    // Use inputManager for unified input (keyboard + touch)
    const downPressed = inputManager.isDown('down');

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

  // Health system methods

  /**
   * Set max health (called from GameScene based on difficulty)
   * @param {number} maxHealth - Maximum health (3-5)
   */
  setMaxHealth(maxHealth) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }

  /**
   * Take damage from enemy or hazard
   * @returns {boolean} True if damage was taken, false if invincible
   */
  takeDamage() {
    // Can't take damage if already invincible, dead, or level is complete
    if (this.isInvincible || this.isDead) {
      return false;
    }

    // Check if level is complete (prevent damage after exit)
    if (this.scene.levelComplete) {
      return false;
    }

    // Check if invincibility assist mode is enabled
    if (saveManager.isInvincibilityEnabled()) {
      // Flash effect to show damage was "blocked"
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 1, to: 0.5 },
        duration: 100,
        yoyo: true,
        repeat: 1
      });
      return false;
    }

    // Decrement health
    this.currentHealth--;

    // Emit health changed event
    this.scene.events.emit('healthChanged', this.currentHealth, this.maxHealth);

    // Play hurt sound
    audioManager.playHurt();

    // Check for death
    if (this.currentHealth <= 0) {
      this.die();
      return true;
    }

    // Start invincibility frames
    this.startInvincibility();

    return true;
  }

  /**
   * Start invincibility frames after taking damage
   */
  startInvincibility() {
    this.isInvincible = true;
    this.invincibilityTimer = 0;

    // Flash effect - alternate visibility
    if (this.flashTween) {
      this.flashTween.stop();
    }

    this.flashTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true,
      repeat: Math.floor(this.invincibilityDuration / 200),
      onComplete: () => {
        this.sprite.alpha = 1;
      }
    });
  }

  /**
   * End invincibility frames
   */
  endInvincibility() {
    this.isInvincible = false;
    this.invincibilityTimer = 0;

    // Stop flash effect
    if (this.flashTween) {
      this.flashTween.stop();
      this.flashTween = null;
    }

    // Ensure sprite is fully visible
    this.sprite.alpha = 1;
    this.sprite.clearTint();
  }

  /**
   * Handle player death
   */
  die() {
    if (this.isDead) return;

    this.isDead = true;

    // Stop movement
    this.sprite.body.setVelocity(0, 0);
    this.sprite.body.setAcceleration(0, 0);

    // Play death sound
    audioManager.playPlayerDeath();

    // Create death particles
    particleEffects.createPlayerDeath(this.sprite.x, this.sprite.y);

    // Death animation - fade and shrink
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: Math.PI,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Emit player died event
        this.scene.events.emit('playerDied');
      }
    });
  }

  /**
   * Get current health
   * @returns {number} Current health
   */
  getHealth() {
    return this.currentHealth;
  }

  /**
   * Get max health
   * @returns {number} Max health
   */
  getMaxHealth() {
    return this.maxHealth;
  }
}
