import Enemy, { EnemyState } from './Enemy.js';
import { PhaseState } from '../systems/PhaseManager.js';

/**
 * BlinkBat - Phase-synced flying enemy
 *
 * Behaviors:
 * - Only visible and active during GHOST phase
 * - Invisible and harmless during SOLID phase
 * - Simple flying pattern (sine wave or horizontal)
 * - Creates interesting timing challenges with phase bricks
 */
export default class BlinkBat extends Enemy {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, {
      width: 8,
      height: 6,
      color: 0x9932cc, // Purple bat color
      speed: 35,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: 75,
      ...config
    });

    // Blink bat-specific properties
    this.phaseGroup = config.phaseGroup || 0;
    this.isVisible = false;

    // Flying pattern
    this.startX = x;
    this.startY = y;
    this.flyTime = 0;
    this.flySpeed = 2;
    this.horizontalRange = 40; // How far to fly horizontally
    this.verticalAmplitude = 12; // Vertical wave height

    // Wing animation
    this.wingTime = 0;
    this.wingSpeed = 12;

    // Setup phase listener
    this.setupPhaseListener();

    // Initial state based on current phase
    this.updateVisibility();
  }

  /**
   * Create Blink Bat's visual appearance
   */
  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    // Generate bat texture
    const textureKey = 'enemy_blinkbat';
    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics();

      // Body (purple)
      graphics.fillStyle(0x9932cc, 1);
      graphics.fillRect(3, 2, 3, 4);

      // Wings (darker purple)
      graphics.fillStyle(0x6b238e, 1);
      graphics.fillRect(0, 2, 3, 2);
      graphics.fillRect(6, 2, 2, 2);

      // Eyes (glowing)
      graphics.fillStyle(0xff00ff, 1);
      graphics.fillRect(3, 2, 1, 1);
      graphics.fillRect(5, 2, 1, 1);

      // Ears
      graphics.fillStyle(0x9932cc, 1);
      graphics.fillRect(3, 1, 1, 1);
      graphics.fillRect(5, 1, 1, 1);

      graphics.generateTexture(textureKey, 8, 6);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * Setup physics for flying
   */
  setupPhysics() {
    super.setupPhysics();

    // Bats fly, no gravity
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
  }

  /**
   * Setup listener for phase changes
   */
  setupPhaseListener() {
    if (this.scene.phaseManager) {
      this.scene.phaseManager.onPhaseChangeForGroup(this.phaseGroup, (newPhase) => {
        this.onPhaseChange(newPhase);
      });
    }
  }

  /**
   * Handle phase change
   */
  onPhaseChange(newPhase) {
    if (this.state !== EnemyState.ACTIVE) return;

    if (newPhase === PhaseState.GHOST) {
      this.appear();
    } else {
      this.disappear();
    }
  }

  /**
   * Update visibility based on current phase
   */
  updateVisibility() {
    if (!this.scene.phaseManager) {
      this.appear();
      return;
    }

    const currentPhase = this.scene.phaseManager.getCurrentPhase(this.phaseGroup);
    if (currentPhase === PhaseState.GHOST) {
      this.appear();
    } else {
      this.disappear();
    }
  }

  /**
   * Make the bat appear (ghost phase)
   */
  appear() {
    if (this.isVisible || this.state !== EnemyState.ACTIVE) return;

    this.isVisible = true;
    this.sprite.setVisible(true);
    this.sprite.body.enable = true;

    // Fade in effect
    this.sprite.setAlpha(0);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  /**
   * Make the bat disappear (solid phase)
   */
  disappear() {
    if (!this.isVisible || this.state !== EnemyState.ACTIVE) return;

    // Fade out effect
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.isVisible = false;
        this.sprite.setVisible(false);
        this.sprite.body.enable = false;
      }
    });
  }

  /**
   * Update Blink Bat behavior
   */
  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    // Only update movement when visible
    if (this.isVisible) {
      this.updateMovement(time, delta);
      this.updateAnimation(time, delta);
    }
  }

  /**
   * Update flying movement pattern
   */
  updateMovement(time, delta) {
    this.flyTime += delta / 1000 * this.flySpeed;

    // Horizontal movement (sine wave)
    const xOffset = Math.sin(this.flyTime) * this.horizontalRange;

    // Vertical bobbing
    const yOffset = Math.sin(this.flyTime * 2) * this.verticalAmplitude;

    // Update position
    this.sprite.setPosition(
      this.startX + xOffset,
      this.startY + yOffset
    );

    // Face direction of movement
    this.sprite.flipX = Math.cos(this.flyTime) < 0;
  }

  /**
   * Update wing flapping animation
   */
  updateAnimation(time, delta) {
    this.wingTime += delta * this.wingSpeed / 1000;

    // Wing flap effect using scale
    const wingScale = 1 + Math.sin(this.wingTime * 10) * 0.15;
    this.sprite.setScale(wingScale, 1);
  }

  /**
   * Override stomp check - can only be stomped when visible
   */
  checkStomp(player) {
    if (!this.isVisible) return false;
    return super.checkStomp(player);
  }

  /**
   * Override dash check - can only be dashed when visible
   */
  checkDash(player) {
    if (!this.isVisible) return false;
    return super.checkDash(player);
  }

  /**
   * Override death animation for poof effect
   */
  playDeathAnimation() {
    // Quick poof effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.createPoofParticles();
        this.state = EnemyState.DEAD;
        this.destroy();
      }
    });
  }

  /**
   * Create poof particle effect
   */
  createPoofParticles() {
    const colors = [0x9932cc, 0x6b238e, 0xff00ff];

    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[i % colors.length];
      particle.fillStyle(color, 0.8);
      particle.fillCircle(0, 0, 2);
      particle.x = this.sprite.x;
      particle.y = this.sprite.y;

      const angle = (i / 6) * Math.PI * 2;
      const distance = 15;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 250,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Check if enemy is active (override to include visibility)
   */
  isActive() {
    return super.isActive() && this.isVisible;
  }
}
