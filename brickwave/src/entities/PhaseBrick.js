import Phaser from 'phaser';
import { PhaseState } from '../systems/PhaseManager.js';
import { GAME_CONFIG } from '../config.js';

/**
 * PhaseBrick - A tile that toggles between solid and ghost states
 *
 * Visual feedback:
 * - SOLID: Fully opaque with subtle shimmer
 * - GHOST: Semi-transparent with pulsing effect
 * - Two-frame shimmer animation
 */
export default class PhaseBrick {
  constructor(scene, x, y, tileSize, groupId = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.tileSize = tileSize;
    this.groupId = groupId;

    // Current phase state
    this.phaseState = PhaseState.SOLID;

    // Main brick visual - positioned directly at (x, y), NOT in a container
    this.solidColor = 0x3b82f6; // Blue color for phase bricks
    this.ghostColor = 0x1e40af; // Darker blue for ghost state

    // Create brick rectangle at world position (x, y)
    this.brick = scene.add.rectangle(x, y, tileSize, tileSize, this.solidColor);
    this.brick.setStrokeStyle(1, 0x1e3a8a, 0.5);

    // Shimmer overlay for visual feedback
    this.shimmer = scene.add.rectangle(x, y, tileSize, tileSize, 0xffffff);
    this.shimmer.setAlpha(0);

    // Physics body for collision (starts as solid)
    // The brick is already at world position (x, y), so physics body will be there too
    scene.physics.add.existing(this.brick, true); // true = static body

    // Animation state
    this.shimmerTime = 0;
    this.shimmerSpeed = 2; // Cycles per second
    this.transitionTime = 0;
    this.transitionDuration = 300; // ms for phase transition

    // Debug logging disabled for cleaner console
    // console.log(`🧱 PhaseBrick: Created at (${x}, ${y}) in group ${groupId}`);
  }

  /**
   * Set the phase state (called by PhaseManager)
   */
  setPhaseState(newState) {
    if (this.phaseState === newState) return;

    const oldState = this.phaseState;
    this.phaseState = newState;
    this.transitionTime = 0;

    // Don't disable the body - let the collision process callback handle whether to collide
    // The body must remain enabled for Phaser to check collisions

    // Trigger visual transition
    this.onPhaseChange(oldState, newState);
  }

  /**
   * Handle visual changes during phase transition
   */
  onPhaseChange(oldState, newState) {
    // Flash effect on transition
    this.scene.tweens.add({
      targets: this.shimmer,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * Update the brick (called every frame)
   */
  update(time, delta) {
    // Update transition progress
    if (this.transitionTime < this.transitionDuration) {
      this.transitionTime += delta;
    }

    // Update visual state based on phase
    this.updateVisuals(time, delta);
  }

  /**
   * Update visual appearance based on current phase
   */
  updateVisuals(time, delta) {
    // Update shimmer animation
    this.shimmerTime += delta / 1000;

    if (this.phaseState === PhaseState.SOLID) {
      // Solid state: Fully opaque with subtle shimmer
      const targetAlpha = 1.0;
      this.brick.setAlpha(targetAlpha);
      this.brick.setFillStyle(this.solidColor);

      // Subtle shimmer effect (two-frame animation)
      const shimmerAlpha = Math.sin(this.shimmerTime * this.shimmerSpeed * Math.PI * 2) * 0.05 + 0.05;
      this.shimmer.setAlpha(shimmerAlpha);

    } else {
      // Ghost state: Semi-transparent with pulsing effect
      const progress = this.transitionTime / this.transitionDuration;
      const targetAlpha = 0.3;

      // Fade to ghost alpha
      const currentAlpha = Phaser.Math.Linear(1.0, targetAlpha, Math.min(progress, 1.0));
      this.brick.setAlpha(currentAlpha);
      this.brick.setFillStyle(this.ghostColor);

      // Pulsing shimmer effect in ghost state
      const pulseAlpha = Math.sin(this.shimmerTime * this.shimmerSpeed * 2 * Math.PI * 2) * 0.1 + 0.1;
      this.shimmer.setAlpha(pulseAlpha);
    }
  }

  /**
   * Get the physics body for collision
   */
  getBody() {
    return this.brick.body;
  }

  /**
   * Check if brick is currently solid
   */
  isSolid() {
    return this.phaseState === PhaseState.SOLID;
  }

  /**
   * Check if brick is currently ghost
   */
  isGhost() {
    return this.phaseState === PhaseState.GHOST;
  }

  /**
   * Get current phase state
   */
  getPhaseState() {
    return this.phaseState;
  }

  /**
   * Destroy the brick
   */
  destroy() {
    if (this.brick) {
      this.brick.destroy();
    }
    if (this.shimmer) {
      this.shimmer.destroy();
    }
  }
}
