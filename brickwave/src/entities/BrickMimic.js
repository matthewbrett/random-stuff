import Enemy, { EnemyState } from './Enemy.js';
import { SCALE } from '../config.js';

/**
 * BrickMimic - Looks like a block until the player gets close, then attacks.
 * Behaviors:
 * - Disguised state: sits still, blends with tiles, harmless
 * - When the player is near or lands on it, it reveals and chases
 * - Can take multiple hits (health configurable)
 */
export default class BrickMimic extends Enemy {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, {
      width: 8 * SCALE,
      height: 8 * SCALE,
      color: 0x718096,
      speed: 35 * SCALE,
      canBeStopped: true,
      canBeDashed: true,
      scoreValue: config.scoreValue ?? 125,
      health: config.health ?? 2,
      ...config
    });

    this.isDisguised = true;
    this.revealRadius = config.revealRadius ?? 18 * SCALE;
    this.disguiseColor = config.disguiseColor ?? 0x3b4252;
    this.activeColor = this.config.color;
    this.alertJump = config.alertJump ?? -140 * SCALE;
    this.targetPlayer = null;
  }

  createSprite() {
    this.sprite = this.scene.physics.add.sprite(this.x, this.y, null);

    const textureKey = `enemy_mimic_${SCALE}`;
    if (!this.scene.textures.exists(textureKey)) {
      const size = 8 * SCALE;
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(this.disguiseColor, 1);
      graphics.fillRect(0, 0, size, size);
      // Subtle highlight to look like a tile
      graphics.fillStyle(0x586070, 0.8);
      graphics.fillRect(1 * SCALE, 1 * SCALE, size - 2 * SCALE, 2 * SCALE);
      graphics.generateTexture(textureKey, size, size);
      graphics.destroy();
    }

    this.sprite.setTexture(textureKey);
    this.sprite.setOrigin(0.5, 0.5);
  }

  setupPhysics() {
    super.setupPhysics();
    this.setDisguisePhysics();
  }

  setDisguisePhysics() {
    // Mimic acts like a static tile while disguised
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.moves = false;
    this.sprite.body.setVelocity(0, 0);
  }

  setActivePhysics() {
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setImmovable(false);
    this.sprite.body.moves = true;
  }

  onPlayerOverlap(player) {
    this.targetPlayer = player;
    if (this.isDisguised && this.isPlayerClose(player)) {
      this.reveal();
    }
  }

  isPlayerClose(player) {
    const dx = player.sprite.x - this.sprite.x;
    const dy = player.sprite.y - this.sprite.y;
    return dx * dx + dy * dy <= this.revealRadius * this.revealRadius;
  }

  reveal() {
    if (!this.isDisguised) return;
    this.isDisguised = false;
    this.setActivePhysics();
    this.sprite.setTint(this.activeColor);
    this.sprite.setTexture(this.getActiveTexture());

    // Small hop when waking up
    this.sprite.body.setVelocityY(this.alertJump);
  }

  getActiveTexture() {
    const textureKey = `enemy_mimic_active_${SCALE}`;
    if (!this.scene.textures.exists(textureKey)) {
      const size = 8 * SCALE;
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(this.activeColor, 1);
      graphics.fillRect(0, 0, size, size);
      // Eyes
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(2 * SCALE, 2 * SCALE, 2 * SCALE, 2 * SCALE);
      graphics.fillRect(5 * SCALE, 2 * SCALE, 2 * SCALE, 2 * SCALE);
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(2 * SCALE, 3 * SCALE, 1 * SCALE, 1 * SCALE);
      graphics.fillRect(6 * SCALE, 3 * SCALE, 1 * SCALE, 1 * SCALE);
      graphics.generateTexture(textureKey, size, size);
      graphics.destroy();
    }
    return textureKey;
  }

  update(time, delta) {
    if (this.state !== EnemyState.ACTIVE) return;

    if (this.isDisguised) {
      // Slight shimmer to hint it's fake
      const pulse = Math.sin(time / 200) * 0.05 + 0.95;
      this.sprite.setScale(pulse, pulse);
      return;
    }

    this.updateMovement(time, delta);
  }

  updateMovement() {
    // Chase the player horizontally when active
    const player = this.targetPlayer;
    if (!player || !player.sprite) return;

    const direction = player.sprite.x >= this.sprite.x ? 1 : -1;
    this.facing = direction;
    this.sprite.body.setVelocityX(this.config.speed * this.facing);
  }

  checkStomp(player) {
    if (this.isDisguised) return false;
    return super.checkStomp(player);
  }

  checkDash(player) {
    if (this.isDisguised) return false;
    return super.checkDash(player);
  }

  onPlayerCollision(player) {
    if (this.isDisguised) {
      this.reveal();
      return false; // No damage on first reveal bump
    }
    return super.onPlayerCollision(player);
  }

  isDangerous() {
    return super.isDangerous() && !this.isDisguised;
  }
}
