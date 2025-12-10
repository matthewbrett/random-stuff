import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../mocks/PhaserMocks.js';

// Mock SaveManager before importing PhaseManager
vi.mock('../../systems/SaveManager.js', () => ({
  default: {
    getPhaseTimingMultiplier: vi.fn(() => 1),
  },
}));

// Mock config
vi.mock('../../config.js', () => ({
  GAME_CONFIG: {
    PHASE_CYCLE_DURATION: 2000,
  },
}));

// Import after mocks are set up
const { default: PhaseManager, PhaseState } = await import(
  '../../systems/PhaseManager.js'
);

describe('PhaseManager', () => {
  let scene;
  let phaseManager;

  beforeEach(() => {
    scene = createMockScene();
    vi.clearAllMocks();
    phaseManager = new PhaseManager(scene);
  });

  describe('Phase State Transitions', () => {
    it('starts in SOLID phase by default', () => {
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.SOLID);
    });

    it('transitions to GHOST after solidDuration', () => {
      const group = phaseManager.groups.get(0);
      const solidDuration = group.solidDuration;

      // Just before transition
      phaseManager.update(0, solidDuration - 1);
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.SOLID);

      // At transition point
      phaseManager.update(0, 2);
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.GHOST);
    });

    it('cycles back to SOLID after full cycle', () => {
      const group = phaseManager.groups.get(0);
      const totalCycle = group.totalCycleDuration;

      // Advance through full cycle
      phaseManager.update(0, totalCycle);
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.SOLID);
    });

    it('notifies registered bricks on phase change', () => {
      const mockBrick = { setPhaseState: vi.fn() };
      phaseManager.registerBrick(mockBrick, 0);

      // Initial state set on registration
      expect(mockBrick.setPhaseState).toHaveBeenCalledWith(PhaseState.SOLID);
      mockBrick.setPhaseState.mockClear();

      // Trigger transition
      const group = phaseManager.groups.get(0);
      phaseManager.update(0, group.solidDuration + 1);

      expect(mockBrick.setPhaseState).toHaveBeenCalledWith(PhaseState.GHOST);
    });
  });

  describe('Freeze Functionality', () => {
    it('pauses updates when frozen', () => {
      phaseManager.freezeFor(1000);
      const initialProgress = phaseManager.getCycleProgress(0);

      // Try to advance time
      phaseManager.update(0, 500);

      expect(phaseManager.getCycleProgress(0)).toBe(initialProgress);
      expect(phaseManager.isFrozen()).toBe(true);
    });

    it('resumes after freeze timer expires', () => {
      phaseManager.freezeFor(500);

      // Freeze timer counts down
      phaseManager.update(0, 500);
      expect(phaseManager.isFrozen()).toBe(false);

      // Now updates work
      const progressBefore = phaseManager.getCycleProgress(0);
      phaseManager.update(0, 100);
      expect(phaseManager.getCycleProgress(0)).toBeGreaterThan(progressBefore);
    });
  });

  describe('Progress Calculations', () => {
    it('getCycleProgress returns 0 to 1 through cycle', () => {
      const group = phaseManager.groups.get(0);
      const quarter = group.totalCycleDuration / 4;

      expect(phaseManager.getCycleProgress(0)).toBe(0);

      phaseManager.update(0, quarter);
      expect(phaseManager.getCycleProgress(0)).toBeCloseTo(0.25, 5);

      phaseManager.update(0, quarter * 2);
      expect(phaseManager.getCycleProgress(0)).toBeCloseTo(0.75, 5);
    });

    it('getPhaseProgress tracks progress within current phase', () => {
      const group = phaseManager.groups.get(0);

      // Start of SOLID phase
      expect(phaseManager.getPhaseProgress(0)).toBe(0);

      // Halfway through SOLID phase
      phaseManager.update(0, group.solidDuration / 2);
      expect(phaseManager.getPhaseProgress(0)).toBeCloseTo(0.5, 5);

      // Transition to GHOST
      phaseManager.update(0, group.solidDuration / 2 + 1);
      // Should be at start of GHOST phase (close to 0)
      expect(phaseManager.getPhaseProgress(0)).toBeLessThan(0.01);
    });
  });

  describe('Phase Groups', () => {
    it('creates group on demand when registering brick to unknown group', () => {
      const mockBrick = { setPhaseState: vi.fn() };

      expect(phaseManager.groups.has(5)).toBe(false);
      phaseManager.registerBrick(mockBrick, 5);
      expect(phaseManager.groups.has(5)).toBe(true);
    });

    it('supports phase offset for staggered groups', () => {
      phaseManager.createPhaseGroup(1, {
        solidDuration: 2000,
        ghostDuration: 2000,
        offset: 2000, // Start in GHOST phase
      });

      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.SOLID);
      expect(phaseManager.getCurrentPhase(1)).toBe(PhaseState.GHOST);
    });

    it('resetGroup restores initial state', () => {
      const group = phaseManager.groups.get(0);

      // Advance partway through cycle
      phaseManager.update(0, group.solidDuration + 100);
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.GHOST);

      phaseManager.resetGroup(0);
      expect(phaseManager.getCurrentPhase(0)).toBe(PhaseState.SOLID);
      expect(phaseManager.getCycleProgress(0)).toBe(0);
    });
  });

  describe('Callbacks', () => {
    it('triggers registered callbacks on phase change', () => {
      const callback = vi.fn();
      phaseManager.onPhaseChangeForGroup(0, callback);

      // Trigger transition
      const group = phaseManager.groups.get(0);
      phaseManager.update(0, group.solidDuration + 1);

      expect(callback).toHaveBeenCalledWith(PhaseState.GHOST, PhaseState.SOLID);
    });
  });
});
