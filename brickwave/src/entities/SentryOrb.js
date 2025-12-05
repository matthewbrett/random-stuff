import Enemy, { EnemyState } from './Enemy.js';

/**
 * SentryOrb - Floating patrol enemy
 *
 * Behaviors:
 * - Moves in arc patterns (circular or figure-8)
 * - Bounceable - player bounces off when stomping
 * - Glowing appearance for visibility
 * - Medium difficulty threat
 */
export default class SentryOrb extends Enemy {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, {
      width: 8,
      height: 8,
      color: 0x00ffff, // Cyan orb color
      speed: 40,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: 100,
      ...config
    });

    // Sentry orb-specific properties
    this.centerX = x;
    this.centerY = y;
    this.orbitTime = Math.random() * Math.PI * 2; // Random start position in orbit
    this.orbitSpeed = 1.5; // Speed of orbit

    // Orbit pattern configuration
    this.orbitType = config.orbitType || 'arc'; // 'arc', 'circle', 'figure8'
    this.orbitRadiusX = config.orbitRadiusX || 24;
    this.orbitRadiusY = config.orbitRadiusY || 16;

    // Visual effects
    this.pulseTime = 0;
    this.pulseSpeed = 4;
    this.glowIntensity = 0.5;

    // Create glow effect
    this.createGlow();
  }

  /**
   * Create Sentry Orb's visual appearance
   */
  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    // Generate orb texture with gradient-like appearance
    const textureKey = 'enemy_sentryorb';
    if (!this.scene.textures.exists(textureKey)) {
      const graphics = this.scene.add.graphics();

      // Outer ring (darker cyan)
      graphics.fillStyle(0x008b8b, 1);
      graphics.fillCircle(4, 4, 4);

      // Inner circle (bright cyan)
      graphics.fillStyle(0x00ffff, 1);
      graphics.fillCircle(4, 4, 3);

      // Core (white highlight)
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(3, 3, 1);

      graphics.generateTexture(textureKey, 8, 8);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * Create glow effect behind the orb
   */
  createGlow() {
    this.glow = this.scene.add.graphics();
    this.glow.setAlpha(0.3);
    this.updateGlow();
  }

  /**
   * Update glow effect
   */
  updateGlow() {
    if (!this.glow || !this.sprite) return;

    this.glow.clear();
    this.glow.fillStyle(0x00ffff, this.glowIntensity);
    this.glow.fillCircle(0, 0, 6);
    this.glow.x = this.sprite.x;
    this.glow.y = this.sprite.y;
  }

  /**
   * Setup physics for floating
   */
  setupPhysics() {
    super.setupPhysics();

    // Orbs float, no gravity
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.setCircle(4);
  }

  /**
   * Update Sentry Orb behavior
   */
  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    this.updateMovement(time, delta);
    this.updateAnimation(time, delta);
    this.updateGlow();
  }

  /**
   * Update orbit movement pattern
   */
  updateMovement(time, delta) {
    this.orbitTime += (delta / 1000) * this.orbitSpeed;

    let xOffset = 0;
    let yOffset = 0;

    switch (this.orbitType) {
      case 'arc':
        // Arc pattern: moves back and forth in an arc
        xOffset = Math.sin(this.orbitTime) * this.orbitRadiusX;
        yOffset = Math.sin(this.orbitTime * 2) * this.orbitRadiusY * 0.5;
        break;

      case 'circle':
        // Full circular orbit
        xOffset = Math.cos(this.orbitTime) * this.orbitRadiusX;
        yOffset = Math.sin(this.orbitTime) * this.orbitRadiusY;
        break;

      case 'figure8':
        // Figure-8 pattern
        xOffset = Math.sin(this.orbitTime) * this.orbitRadiusX;
        yOffset = Math.sin(this.orbitTime * 2) * this.orbitRadiusY;
        break;

      default:
        // Simple horizontal movement
        xOffset = Math.sin(this.orbitTime) * this.orbitRadiusX;
    }

    // Update position
    this.sprite.setPosition(
      this.centerX + xOffset,
      this.centerY + yOffset
    );
  }

  /**
   * Update pulsing glow animation
   */
  updateAnimation(time, delta) {
    this.pulseTime += delta * this.pulseSpeed / 1000;

    // Pulsing scale effect
    const scale = 1 + Math.sin(this.pulseTime * 3) * 0.1;
    this.sprite.setScale(scale);

    // Pulsing glow intensity
    this.glowIntensity = 0.3 + Math.sin(this.pulseTime * 3) * 0.2;
  }

  /**
   * Handle being stomped - player bounces higher on orbs
   */
  onStomp(player) {
    // Orbs give a higher bounce than normal enemies
    this.die();
    player.sprite.body.setVelocityY(-200);

    console.log(`🔮 Sentry Orb bounced! +${this.config.scoreValue}`);
  }

  /**
   * Override death animation for electric effect
   */
  playDeathAnimation() {
    // Electric discharge effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0,
      scaleY: 2,
      alpha: 0,
      duration: 150,
      ease: 'Power3',
      onComplete: () => {
        this.createElectricParticles();
        this.state = EnemyState.DEAD;
        this.destroy();
      }
    });

    // Also fade out glow
    if (this.glow) {
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0,
        duration: 150
      });
    }
  }

  /**
   * Create electric discharge particles
   */
  createElectricParticles() {
    const colors = [0x00ffff, 0xffffff, 0x00ff00];

    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[i % colors.length];
      particle.lineStyle(1, color, 1);

      // Draw a small lightning bolt
      const length = 8;
      particle.moveTo(0, 0);
      particle.lineTo(Math.random() * 4 - 2, -length / 2);
      particle.lineTo(Math.random() * 4 - 2, -length);
      particle.stroke();

      particle.x = this.sprite.x;
      particle.y = this.sprite.y;

      const angle = (i / 8) * Math.PI * 2;
      const distance = 20;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        rotation: Math.random() * Math.PI,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Override destroy to clean up glow
   */
  destroy() {
    if (this.glow) {
      this.glow.destroy();
      this.glow = null;
    }
    super.destroy();
  }
}
