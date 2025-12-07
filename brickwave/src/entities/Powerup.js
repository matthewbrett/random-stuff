import Phaser from 'phaser';
import { SCALE } from '../config.js';

const COLORS = {
  phase_anchor: 0xffc857,
  spectral_boots: 0x7bdff2,
  default: 0xffffff,
};

/**
 * Generic Powerup pickup
 */
export default class Powerup {
  constructor(scene, x, y, type = 'phase_anchor') {
    this.scene = scene;
    this.type = type;
    this.width = 8 * SCALE;
    this.height = 8 * SCALE;
    this.x = x;
    this.y = y;
    this.t = 0;
    this.collected = false;

    this.createSprite();
  }

  createSprite() {
    this.sprite = this.scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      COLORS[this.type] || COLORS.default
    );
    this.sprite.setStrokeStyle(1, 0xffffff, 0.8);
  }

  update(time, delta) {
    this.t += delta / 1000;
    const bob = Math.sin(this.t * 4) * 1.5 * SCALE;
    this.sprite.y = this.y + bob;
  }

  overlaps(x, y, w, h) {
    const rect = this.sprite.getBounds();
    return Phaser.Geom.Intersects.RectangleToRectangle(
      rect,
      new Phaser.Geom.Rectangle(x, y, w, h)
    );
  }

  collect() {
    this.collected = true;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 180,
      ease: 'Power2',
      onComplete: () => this.sprite.destroy()
    });
    return this.type;
  }
}
