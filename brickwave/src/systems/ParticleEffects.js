/**
 * ParticleEffects - Manages game particle effects
 *
 * Features:
 * - Coin sparkle on collection
 * - Dash trail during dash
 * - Landing dust on ground impact
 * - Enemy death burst
 * - Phase brick shimmer
 */

import { SCALE } from '../config.js';

class ParticleEffects {
  constructor() {
    this.scene = null;
    this.initialized = false;

    // Particle pools for performance
    this.activeDashTrailParticles = [];
    this.maxPoolSize = 50;
  }

  /**
   * Initialize particle system with a Phaser scene
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  init(scene) {
    this.scene = scene;
    this.initialized = true;

    // Create particle textures if they don't exist
    this.createParticleTextures();
  }

  /**
   * Create simple particle textures using graphics
   */
  createParticleTextures() {
    if (!this.scene) return;

    // Check if textures already exist
    if (this.scene.textures.exists('particle_spark')) return;

    const graphics = this.scene.add.graphics();

    // Small spark particle (2x2)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 2 * SCALE, 2 * SCALE);
    graphics.generateTexture('particle_spark', 2 * SCALE, 2 * SCALE);
    graphics.clear();

    // Circle particle (3x3)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(2 * SCALE, 2 * SCALE, 2 * SCALE);
    graphics.generateTexture('particle_circle', 4 * SCALE, 4 * SCALE);
    graphics.clear();

    // Diamond particle
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(
      2 * SCALE, 0,
      4 * SCALE, 2 * SCALE,
      2 * SCALE, 4 * SCALE
    );
    graphics.fillTriangle(
      2 * SCALE, 0,
      0, 2 * SCALE,
      2 * SCALE, 4 * SCALE
    );
    graphics.generateTexture('particle_diamond', 4 * SCALE, 4 * SCALE);

    graphics.destroy();
  }

  /**
   * Create coin collection sparkle effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createCoinSparkle(x, y) {
    if (!this.scene) return;

    const colors = [0xffff00, 0xffaa00, 0xffffff];
    const numParticles = 8;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const speed = Phaser.Math.Between(40, 80) * SCALE;
      const color = Phaser.Math.RND.pick(colors);

      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 1);
      particle.fillRect(0, 0, 2 * SCALE, 2 * SCALE);
      particle.setPosition(x, y);
      particle.setDepth(1000);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create key shard collection shimmer effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createShardShimmer(x, y) {
    if (!this.scene) return;

    const colors = [0x00ffff, 0x00ff88, 0xffffff];
    const numParticles = 12;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 100) * SCALE;
      const color = Phaser.Math.RND.pick(colors);

      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 1);

      // Diamond shape for shards
      particle.fillTriangle(2 * SCALE, 0, 4 * SCALE, 2 * SCALE, 2 * SCALE, 4 * SCALE);
      particle.fillTriangle(2 * SCALE, 0, 0, 2 * SCALE, 2 * SCALE, 4 * SCALE);

      particle.setPosition(x - 2 * SCALE, y - 2 * SCALE);
      particle.setDepth(1000);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        rotation: Math.PI,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create dash trail effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} direction - Dash direction (-1 or 1)
   */
  createDashTrail(x, y, direction) {
    if (!this.scene) return;

    const color = 0x00ffff;

    const particle = this.scene.add.graphics();
    particle.fillStyle(color, 0.6);
    particle.fillRect(0, 0, 3 * SCALE, 6 * SCALE);
    particle.setPosition(x - 1.5 * SCALE, y - 3 * SCALE);
    particle.setDepth(500);

    this.scene.tweens.add({
      targets: particle,
      x: particle.x + (-direction * 10 * SCALE),
      alpha: 0,
      scaleX: 0.2,
      duration: 150,
      ease: 'Power2',
      onComplete: () => particle.destroy()
    });
  }

  /**
   * Create landing dust effect
   * @param {number} x - X position
   * @param {number} y - Y position (ground level)
   */
  createLandingDust(x, y) {
    if (!this.scene) return;

    const colors = [0x888888, 0x666666, 0xaaaaaa];
    const numParticles = 6;

    for (let i = 0; i < numParticles; i++) {
      const offsetX = Phaser.Math.Between(-8, 8) * SCALE;
      const color = Phaser.Math.RND.pick(colors);

      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 0.6);
      particle.fillCircle(0, 0, Phaser.Math.Between(1, 2) * SCALE);
      particle.setPosition(x + offsetX, y);
      particle.setDepth(400);

      const vx = offsetX * 2;
      const vy = Phaser.Math.Between(-20, -40) * SCALE;

      this.scene.tweens.add({
        targets: particle,
        x: x + offsetX + vx,
        y: y + vy,
        alpha: 0,
        duration: 250,
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create enemy death burst effect
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} color - Optional enemy color (default red)
   */
  createEnemyBurst(x, y, color = 0xff4444) {
    if (!this.scene) return;

    const colors = [color, 0xffffff, 0xffaa00];
    const numParticles = 12;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + Math.random() * 0.3;
      const speed = Phaser.Math.Between(50, 120) * SCALE;
      const particleColor = Phaser.Math.RND.pick(colors);
      const size = Phaser.Math.Between(2, 4) * SCALE;

      const particle = this.scene.add.graphics();
      particle.fillStyle(particleColor, 1);
      particle.fillRect(0, 0, size, size);
      particle.setPosition(x - size / 2, y - size / 2);
      particle.setDepth(1000);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: x + vx * 0.5,
        y: y + vy * 0.5,
        alpha: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 350,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create phase brick transition shimmer
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {boolean} toSolid - True if transitioning to solid, false if to ghost
   */
  createPhaseShimmer(x, y, toSolid) {
    if (!this.scene) return;

    const color = toSolid ? 0x4444ff : 0x8844ff;
    const numParticles = 4;

    for (let i = 0; i < numParticles; i++) {
      const offsetX = Phaser.Math.Between(-4, 4) * SCALE;
      const offsetY = Phaser.Math.Between(-4, 4) * SCALE;

      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 0.7);
      particle.fillRect(0, 0, 2 * SCALE, 2 * SCALE);
      particle.setPosition(x + offsetX, y + offsetY);
      particle.setDepth(300);

      this.scene.tweens.add({
        targets: particle,
        y: y + offsetY - 10 * SCALE,
        alpha: 0,
        duration: 200,
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create stomp effect when bouncing on enemy
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createStompEffect(x, y) {
    if (!this.scene) return;

    // Ring expansion effect
    const ring = this.scene.add.graphics();
    ring.lineStyle(2 * SCALE, 0x00ff00, 1);
    ring.strokeCircle(0, 0, 4 * SCALE);
    ring.setPosition(x, y);
    ring.setDepth(1000);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 200,
      ease: 'Power1',
      onComplete: () => ring.destroy()
    });

    // Small particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const speed = 60 * SCALE;

      const particle = this.scene.add.graphics();
      particle.fillStyle(0x00ff00, 1);
      particle.fillRect(0, 0, 2 * SCALE, 2 * SCALE);
      particle.setPosition(x, y);
      particle.setDepth(1000);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * 0.5,
        y: y + Math.sin(angle) * speed * 0.5,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create level complete celebration effect
   * @param {number} x - X position (usually player position)
   * @param {number} y - Y position
   */
  createLevelComplete(x, y) {
    if (!this.scene) return;

    const colors = [0xffff00, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff];
    const numWaves = 3;

    for (let wave = 0; wave < numWaves; wave++) {
      this.scene.time.delayedCall(wave * 150, () => {
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const speed = Phaser.Math.Between(80, 150) * SCALE;
          const color = Phaser.Math.RND.pick(colors);

          const particle = this.scene.add.graphics();
          particle.fillStyle(color, 1);
          particle.fillRect(0, 0, 3 * SCALE, 3 * SCALE);
          particle.setPosition(x, y);
          particle.setDepth(2000);

          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          this.scene.tweens.add({
            targets: particle,
            x: x + vx,
            y: y + vy,
            alpha: 0,
            rotation: Math.PI * 2,
            duration: 600,
            ease: 'Power2',
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }

  /**
   * Clean up particle system
   */
  destroy() {
    this.scene = null;
    this.initialized = false;
    this.activeDashTrailParticles = [];
  }
}

// Export singleton instance
const particleEffects = new ParticleEffects();
export default particleEffects;
export { ParticleEffects };
