import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, MockPhaserMath } from '../mocks/PhaserMocks.js';

// Mock Phaser before importing ScoreManager
vi.mock('phaser', () => ({
  default: {
    Math: MockPhaserMath,
  },
}));

const { default: ScoreManager } = await import('../../systems/ScoreManager.js');

describe('ScoreManager', () => {
  let scene;
  let scoreManager;

  beforeEach(() => {
    scene = createMockScene();
    scoreManager = new ScoreManager(scene);
  });

  describe('Echo Charge System', () => {
    // Table-driven tests for the core echo charge mechanic
    const echoChargeTestCases = [
      { coins: 0, expectedCharges: 0, description: 'no coins = no charges' },
      { coins: 9, expectedCharges: 0, description: '9 coins = no charge yet' },
      { coins: 10, expectedCharges: 1, description: '10 coins = 1 charge' },
      { coins: 19, expectedCharges: 1, description: '19 coins = still 1 charge' },
      { coins: 20, expectedCharges: 2, description: '20 coins = 2 charges' },
      { coins: 30, expectedCharges: 3, description: '30 coins = max 3 charges' },
      { coins: 50, expectedCharges: 3, description: '50 coins = capped at 3' },
    ];

    echoChargeTestCases.forEach(({ coins, expectedCharges, description }) => {
      it(`${description}`, () => {
        for (let i = 0; i < coins; i++) {
          scoreManager.collectCoin(100);
        }
        expect(scoreManager.getEchoCharges()).toBe(expectedCharges);
      });
    });

    it('emits echoChargeGained event when threshold crossed', () => {
      // Collect 9 coins - no event yet
      for (let i = 0; i < 9; i++) {
        scoreManager.collectCoin(100);
      }
      expect(scene.events.emit).not.toHaveBeenCalledWith(
        'echoChargeGained',
        expect.anything()
      );

      // 10th coin triggers the event
      scoreManager.collectCoin(100);
      expect(scene.events.emit).toHaveBeenCalledWith('echoChargeGained', 1);
    });

    it('useEchoCharge decrements and returns success status', () => {
      // Setup: get 1 charge
      for (let i = 0; i < 10; i++) {
        scoreManager.collectCoin(100);
      }
      expect(scoreManager.getEchoCharges()).toBe(1);

      // Use it - should succeed
      expect(scoreManager.useEchoCharge()).toBe(true);
      expect(scoreManager.getEchoCharges()).toBe(0);

      // Try again - should fail
      expect(scoreManager.useEchoCharge()).toBe(false);
      expect(scoreManager.getEchoCharges()).toBe(0);
    });
  });

  describe('Key Shard Collection', () => {
    it('collects shards by index and awards points', () => {
      expect(scoreManager.collectKeyShard(0)).toBe(true);
      expect(scoreManager.getKeyShardCount()).toBe(1);
      expect(scoreManager.getScore()).toBe(500);
    });

    it('rejects duplicate shard collection', () => {
      scoreManager.collectKeyShard(1);
      const initialScore = scoreManager.getScore();

      expect(scoreManager.collectKeyShard(1)).toBe(false);
      expect(scoreManager.getScore()).toBe(initialScore); // No extra points
    });

    it('rejects invalid shard indices', () => {
      expect(scoreManager.collectKeyShard(-1)).toBe(false);
      expect(scoreManager.collectKeyShard(99)).toBe(false);
    });

    it('tracks requirement satisfaction', () => {
      scoreManager.setRequiredKeyShards(2);

      expect(scoreManager.hasRequiredKeyShards()).toBe(false);

      scoreManager.collectKeyShard(0);
      expect(scoreManager.hasRequiredKeyShards()).toBe(false);

      scoreManager.collectKeyShard(1);
      expect(scoreManager.hasRequiredKeyShards()).toBe(true);
    });

    it('hasAllKeyShards returns true only when all collected', () => {
      expect(scoreManager.hasAllKeyShards()).toBe(false);

      scoreManager.collectKeyShard(0);
      scoreManager.collectKeyShard(1);
      expect(scoreManager.hasAllKeyShards()).toBe(false);

      scoreManager.collectKeyShard(2);
      expect(scoreManager.hasAllKeyShards()).toBe(true);
    });
  });

  describe('Time Formatting', () => {
    const formatCases = [
      { seconds: 0, expected: '00:00' },
      { seconds: 59, expected: '00:59' },
      { seconds: 60, expected: '01:00' },
      { seconds: 90, expected: '01:30' },
      { seconds: 3661, expected: '61:01' },
    ];

    formatCases.forEach(({ seconds, expected }) => {
      it(`formats ${seconds}s as ${expected}`, () => {
        // Manually set levelTime (in ms)
        scoreManager.levelTime = seconds * 1000;
        expect(scoreManager.getFormattedTime()).toBe(expected);
      });
    });
  });

  describe('Time Bonus Calculation', () => {
    it('awards bonus for completing under target time', () => {
      scoreManager.levelTime = 60 * 1000; // 60 seconds
      const bonus = scoreManager.calculateTimeBonus(90); // 90 second target

      // 30 seconds under target = 300 bonus points (10 per second)
      expect(bonus).toBe(300);
    });

    it('awards no bonus when over target time', () => {
      scoreManager.levelTime = 120 * 1000; // 120 seconds
      const bonus = scoreManager.calculateTimeBonus(90);

      expect(bonus).toBe(0);
    });
  });

  describe('Reset', () => {
    it('clears all state for a new level', () => {
      // Build up state
      for (let i = 0; i < 15; i++) scoreManager.collectCoin(100);
      scoreManager.collectKeyShard(0);
      scoreManager.levelTime = 5000;
      scoreManager.timerRunning = true;

      // Reset
      scoreManager.reset();

      expect(scoreManager.getScore()).toBe(0);
      expect(scoreManager.getCoinsCollected()).toBe(0);
      expect(scoreManager.getEchoCharges()).toBe(0);
      expect(scoreManager.getKeyShardCount()).toBe(0);
      expect(scoreManager.levelTime).toBe(0);
      expect(scoreManager.timerRunning).toBe(false);
    });
  });
});
