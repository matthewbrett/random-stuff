import Phaser from 'phaser';
import { PhaseState } from './PhaseManager.js';

/**
 * PhaseIndicator - HUD element that shows phase timing
 *
 * Provides visual feedback for when phase bricks will change state.
 * Shows as a pulsing bar or indicator that changes color based on phase.
 */
export default class PhaseIndicator {
  constructor(scene, phaseManager, x, y, groupId = 0) {
    this.scene = scene;
    this.phaseManager = phaseManager;
    this.groupId = groupId;
    this.x = x;
    this.y = y;

    // Dimensions
    this.width = 60;
    this.height = 6;
    this.padding = 1;

    // Container for UI elements
    this.container = scene.add.container(x, y);
    this.container.setScrollFactor(0); // Fixed to camera
    this.container.setDepth(1000); // Always on top

    // Background
    this.background = scene.add.rectangle(
      0, 0,
      this.width, this.height,
      0x000000, 0.7
    );
    this.container.add(this.background);

    // Progress bar (shows time remaining in current phase)
    this.progressBar = scene.add.rectangle(
      -this.width / 2 + this.padding,
      0,
      this.width - this.padding * 2,
      this.height - this.padding * 2,
      0x3b82f6,
      1.0
    );
    this.progressBar.setOrigin(0, 0.5);
    this.container.add(this.progressBar);

    // Pulse indicator (flashes on phase change)
    this.pulseIndicator = scene.add.circle(
      this.width / 2 + 6,
      0,
      3,
      0x3b82f6
    );
    this.pulseIndicator.setAlpha(0.8);
    this.container.add(this.pulseIndicator);

    // Phase label
    this.phaseLabel = scene.add.text(
      -this.width / 2 - 4,
      0,
      'PHASE',
      {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#ffffff',
      }
    );
    this.phaseLabel.setOrigin(1, 0.5);
    this.container.add(this.phaseLabel);

    // Listen for phase changes
    this.phaseManager.onPhaseChangeForGroup(groupId, (newPhase, oldPhase) => {
      this.onPhaseChange(newPhase, oldPhase);
    });

    console.log(`📊 PhaseIndicator: Created at (${x}, ${y}) for group ${groupId}`);
  }

  /**
   * Update the indicator
   */
  update(time, delta) {
    const currentPhase = this.phaseManager.getCurrentPhase(this.groupId);
    const progress = this.phaseManager.getPhaseProgress(this.groupId);

    // Update progress bar width
    const maxWidth = this.width - this.padding * 2;
    const currentWidth = maxWidth * (1 - progress); // Depletes over time
    this.progressBar.width = Math.max(0, currentWidth);

    // Update colors based on phase
    if (currentPhase === PhaseState.SOLID) {
      // Solid phase: Blue
      this.progressBar.setFillStyle(0x3b82f6);
      this.pulseIndicator.setFillStyle(0x3b82f6);
    } else {
      // Ghost phase: Purple/darker
      this.progressBar.setFillStyle(0x8b5cf6);
      this.pulseIndicator.setFillStyle(0x8b5cf6);
    }

    // Pulse the indicator near phase changes (last 20% of phase)
    if (progress > 0.8) {
      const pulseSpeed = 10; // Hz
      const pulseAlpha = Math.sin(time * pulseSpeed * Math.PI / 1000) * 0.3 + 0.7;
      this.pulseIndicator.setAlpha(pulseAlpha);
    } else {
      this.pulseIndicator.setAlpha(0.8);
    }
  }

  /**
   * Handle phase change event
   */
  onPhaseChange(newPhase, oldPhase) {
    // Flash effect on phase change
    this.scene.tweens.add({
      targets: this.pulseIndicator,
      scale: 1.5,
      alpha: 1.0,
      duration: 150,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });

    // Flash the progress bar
    this.scene.tweens.add({
      targets: this.progressBar,
      alpha: 1.5,
      duration: 100,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * Set position
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  /**
   * Set visibility
   */
  setVisible(visible) {
    this.container.setVisible(visible);
  }

  /**
   * Destroy the indicator
   */
  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
