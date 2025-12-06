import { GAME_CONFIG } from '../config.js';
import saveManager from './SaveManager.js';

/**
 * PhaseManager - Manages the phase brick timing system
 *
 * Controls the global phase cycle that determines when phase bricks
 * are solid vs ghost. Supports multiple phase groups for complex puzzles.
 *
 * Phase States:
 * - SOLID: Bricks are solid and collidable
 * - GHOST: Bricks are ghost (non-collidable, transparent)
 */

export const PhaseState = {
  SOLID: 'solid',
  GHOST: 'ghost',
};

export default class PhaseManager {
  constructor(scene) {
    this.scene = scene;

    // Phase groups - allows for multiple synchronized brick groups
    this.groups = new Map();

    // Create default phase group (group 0)
    this.createPhaseGroup(0, {
      solidDuration: GAME_CONFIG.PHASE_CYCLE_DURATION,
      ghostDuration: GAME_CONFIG.PHASE_CYCLE_DURATION,
      startPhase: PhaseState.SOLID,
      offset: 0, // No offset for default group
    });

    // Event callbacks
    this.onPhaseChange = new Map(); // Map of group ID to callbacks

    console.log('⏱️  PhaseManager: Initialized');
  }

  /**
   * Create a new phase group with custom timing
   * @param {number} groupId - Unique identifier for this group
   * @param {object} config - Configuration options
   */
  createPhaseGroup(groupId, config = {}) {
    // Get phase timing multiplier from settings (for accessibility)
    const phaseMultiplier = saveManager.getPhaseTimingMultiplier();

    const {
      solidDuration = GAME_CONFIG.PHASE_CYCLE_DURATION * phaseMultiplier,
      ghostDuration = GAME_CONFIG.PHASE_CYCLE_DURATION * phaseMultiplier,
      startPhase = PhaseState.SOLID,
      offset = 0, // Time offset in ms
    } = config;

    const group = {
      id: groupId,
      solidDuration,
      ghostDuration,
      currentPhase: startPhase,
      cycleTime: 0, // Current time in the cycle
      totalCycleDuration: solidDuration + ghostDuration,
      offset,
      bricks: [], // Array of phase bricks in this group
    };

    // Apply offset
    group.cycleTime = offset % group.totalCycleDuration;

    // Determine initial phase based on offset
    if (group.cycleTime >= group.solidDuration) {
      group.currentPhase = PhaseState.GHOST;
    }

    this.groups.set(groupId, group);

    console.log(`⏱️  PhaseManager: Created group ${groupId} (${solidDuration}ms solid / ${ghostDuration}ms ghost, offset: ${offset}ms)`);

    return group;
  }

  /**
   * Register a phase brick with a group
   */
  registerBrick(brick, groupId = 0) {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn(`⏱️  PhaseManager: Group ${groupId} does not exist, creating it...`);
      this.createPhaseGroup(groupId);
      return this.registerBrick(brick, groupId);
    }

    group.bricks.push(brick);

    // Set initial phase state
    brick.setPhaseState(group.currentPhase);
  }

  /**
   * Register a callback for phase changes in a specific group
   */
  onPhaseChangeForGroup(groupId, callback) {
    if (!this.onPhaseChange.has(groupId)) {
      this.onPhaseChange.set(groupId, []);
    }
    this.onPhaseChange.get(groupId).push(callback);
  }

  /**
   * Update all phase groups
   */
  update(time, delta) {
    this.groups.forEach(group => {
      this.updateGroup(group, delta);
    });
  }

  /**
   * Update a single phase group
   */
  updateGroup(group, delta) {
    // Advance cycle time
    group.cycleTime += delta;

    // Wrap around when cycle completes
    if (group.cycleTime >= group.totalCycleDuration) {
      group.cycleTime -= group.totalCycleDuration;
    }

    // Determine current phase based on cycle time
    const newPhase = group.cycleTime < group.solidDuration
      ? PhaseState.SOLID
      : PhaseState.GHOST;

    // Check if phase changed
    if (newPhase !== group.currentPhase) {
      const oldPhase = group.currentPhase;
      group.currentPhase = newPhase;

      // Update all bricks in this group
      group.bricks.forEach(brick => {
        brick.setPhaseState(newPhase);
      });

      // Trigger callbacks
      this.triggerPhaseChange(group.id, newPhase, oldPhase);

      console.log(`⏱️  PhaseManager: Group ${group.id} changed from ${oldPhase} to ${newPhase}`);
    }
  }

  /**
   * Trigger phase change callbacks
   */
  triggerPhaseChange(groupId, newPhase, oldPhase) {
    const callbacks = this.onPhaseChange.get(groupId);
    if (callbacks) {
      callbacks.forEach(callback => callback(newPhase, oldPhase));
    }
  }

  /**
   * Get the current phase state for a group
   */
  getCurrentPhase(groupId = 0) {
    const group = this.groups.get(groupId);
    return group ? group.currentPhase : PhaseState.SOLID;
  }

  /**
   * Get the cycle progress for a group (0 to 1)
   */
  getCycleProgress(groupId = 0) {
    const group = this.groups.get(groupId);
    if (!group) return 0;

    return group.cycleTime / group.totalCycleDuration;
  }

  /**
   * Get the phase progress within the current phase (0 to 1)
   * Useful for animations that sync with phase transitions
   */
  getPhaseProgress(groupId = 0) {
    const group = this.groups.get(groupId);
    if (!group) return 0;

    if (group.currentPhase === PhaseState.SOLID) {
      return group.cycleTime / group.solidDuration;
    } else {
      return (group.cycleTime - group.solidDuration) / group.ghostDuration;
    }
  }

  /**
   * Get time remaining in current phase (in ms)
   */
  getTimeRemainingInPhase(groupId = 0) {
    const group = this.groups.get(groupId);
    if (!group) return 0;

    if (group.currentPhase === PhaseState.SOLID) {
      return group.solidDuration - group.cycleTime;
    } else {
      return group.totalCycleDuration - group.cycleTime;
    }
  }

  /**
   * Reset a phase group
   */
  resetGroup(groupId = 0) {
    const group = this.groups.get(groupId);
    if (group) {
      group.cycleTime = group.offset % group.totalCycleDuration;
      group.currentPhase = group.cycleTime < group.solidDuration
        ? PhaseState.SOLID
        : PhaseState.GHOST;

      // Update all bricks
      group.bricks.forEach(brick => {
        brick.setPhaseState(group.currentPhase);
      });
    }
  }

  /**
   * Reset all phase groups
   */
  resetAll() {
    this.groups.forEach(group => {
      this.resetGroup(group.id);
    });
  }

  /**
   * Clean up
   */
  destroy() {
    this.groups.clear();
    this.onPhaseChange.clear();
  }
}
