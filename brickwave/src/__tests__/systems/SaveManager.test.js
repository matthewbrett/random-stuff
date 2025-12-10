import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager, SAVE_KEYS } from '../../systems/SaveManager.js';

describe('SaveManager', () => {
  let saveManager;
  let mockStorage;

  beforeEach(() => {
    // Create fresh mock localStorage for each test
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStorage[key] ?? null),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    });

    // Fresh instance (not the singleton) for isolated tests
    saveManager = new SaveManager();
    saveManager.init();
  });

  describe('Level Unlock Logic', () => {
    const unlockTestCases = [
      { levelId: 'intro', expected: true, description: 'intro always unlocked' },
      { levelId: '1-1', expected: true, description: '1-1 always unlocked' },
      { levelId: '1-2', expected: false, description: '1-2 locked until 1-1 complete' },
      { levelId: 'invalid', expected: false, description: 'invalid format rejected' },
    ];

    unlockTestCases.forEach(({ levelId, expected, description }) => {
      it(`${description}`, () => {
        expect(saveManager.isLevelUnlocked(levelId)).toBe(expected);
      });
    });

    it('unlocks next level after completing previous', () => {
      expect(saveManager.isLevelUnlocked('1-2')).toBe(false);

      saveManager.saveLevelCompletion('1-1', {
        time: 60,
        keyShards: 0,
        score: 1000,
        rank: 'B',
        coins: 10,
      });

      expect(saveManager.isLevelUnlocked('1-2')).toBe(true);
    });

    it('requires 12 shards plus 1-8 clear for bonus stage 1-9', () => {
      expect(saveManager.isLevelUnlocked('1-9')).toBe(false);

      // Complete levels 1-1 through 1-8 with shards
      for (let i = 1; i <= 8; i++) {
        saveManager.saveLevelCompletion(`1-${i}`, {
          time: 60,
          keyShards: 3,
          score: 1000,
          rank: 'B',
          coins: 10,
        });
      }

      // Should have 24 shards now, which is >= 12
      expect(saveManager.getTotalKeyShards()).toBe(24);
      expect(saveManager.isLevelUnlocked('1-9')).toBe(true);
    });
  });

  describe('Level Completion Tracking', () => {
    it('tracks first completion', () => {
      const result = saveManager.saveLevelCompletion('1-1', {
        time: 60,
        keyShards: 2,
        score: 1500,
        rank: 'A',
        coins: 15,
      });

      expect(result.firstCompletion).toBe(true);
      expect(result.newBestTime).toBe(true);
      expect(result.newBestScore).toBe(true);
      expect(result.newKeyShards).toBe(true);
    });

    it('detects improvements over previous best', () => {
      // First completion
      saveManager.saveLevelCompletion('1-1', {
        time: 90,
        keyShards: 1,
        score: 1000,
        rank: 'B',
        coins: 10,
      });

      // Better run
      const result = saveManager.saveLevelCompletion('1-1', {
        time: 60, // Better time
        keyShards: 2, // More shards
        score: 1500, // Better score
        rank: 'A',
        coins: 15,
      });

      expect(result.firstCompletion).toBe(false);
      expect(result.newBestTime).toBe(true);
      expect(result.newBestScore).toBe(true);
      expect(result.newKeyShards).toBe(true);
    });

    it('no improvements when worse than previous', () => {
      // First completion with good stats
      saveManager.saveLevelCompletion('1-1', {
        time: 30,
        keyShards: 3,
        score: 2000,
        rank: 'S',
        coins: 20,
      });

      // Worse run
      const result = saveManager.saveLevelCompletion('1-1', {
        time: 90,
        keyShards: 1,
        score: 500,
        rank: 'D',
        coins: 5,
      });

      expect(result.newBestTime).toBe(false);
      expect(result.newBestScore).toBe(false);
      expect(result.newKeyShards).toBe(false);
    });
  });

  describe('Difficulty Settings', () => {
    const difficultyTestCases = [
      { difficulty: 0, maxHealth: 5, requiredShards: 0, enemySpeed: 0.8 },
      { difficulty: 1, maxHealth: 4, requiredShards: 2, enemySpeed: 1.0 },
      { difficulty: 2, maxHealth: 3, requiredShards: 3, enemySpeed: 1.2 },
    ];

    difficultyTestCases.forEach(
      ({ difficulty, maxHealth, requiredShards, enemySpeed }) => {
        it(`difficulty ${difficulty} → health=${maxHealth}, shards=${requiredShards}, speed=${enemySpeed}`, () => {
          mockStorage[SAVE_KEYS.SETTINGS] = JSON.stringify({
            difficulty,
          });

          expect(saveManager.getMaxHealthForDifficulty()).toBe(maxHealth);
          expect(saveManager.getRequiredKeyShards()).toBe(requiredShards);
          expect(saveManager.getEnemySpeedMultiplier()).toBe(enemySpeed);
        });
      }
    );

    it('uses default intermediate difficulty when no settings', () => {
      expect(saveManager.getDifficulty()).toBe(1);
      expect(saveManager.getMaxHealthForDifficulty()).toBe(4);
    });
  });

  describe('Phase Timing Assist', () => {
    const phaseTimingCases = [
      { setting: 0, multiplier: 1, name: 'Normal' },
      { setting: 1, multiplier: 1.5, name: 'Relaxed' },
      { setting: 2, multiplier: 2, name: 'Slow' },
    ];

    phaseTimingCases.forEach(({ setting, multiplier, name }) => {
      it(`${name} (${setting}) → ${multiplier}x duration`, () => {
        mockStorage[SAVE_KEYS.SETTINGS] = JSON.stringify({
          phaseTimingAssist: setting,
        });

        expect(saveManager.getPhaseTimingMultiplier()).toBe(multiplier);
      });
    });
  });

  describe('Import/Export', () => {
    it('exports complete save data as JSON', () => {
      saveManager.saveLevelCompletion('1-1', {
        time: 60,
        keyShards: 2,
        score: 1500,
        rank: 'A',
        coins: 15,
      });

      const exported = saveManager.exportSaveData();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe(1);
      expect(parsed.progress['1-1'].completed).toBe(true);
      expect(parsed.globalStats.totalLevelCompletions).toBe(1);
    });

    it('imports valid save data', () => {
      const importData = JSON.stringify({
        version: 1,
        progress: {
          '1-1': { bestTime: 30, keyShards: 3, completed: true, bestScore: 2000 },
        },
        globalStats: { totalDeaths: 5 },
      });

      const result = saveManager.importSaveData(importData);

      expect(result.success).toBe(true);
      expect(saveManager.getLevelProgress('1-1').completed).toBe(true);
    });

    it('rejects invalid save format', () => {
      const result = saveManager.importSaveData('{ "invalid": true }');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid save format');
    });

    it('rejects save from newer version', () => {
      const result = saveManager.importSaveData(
        JSON.stringify({ version: 999, progress: {} })
      );
      expect(result.success).toBe(false);
      expect(result.message).toBe('Save from newer game version');
    });

    it('rejects malformed JSON', () => {
      const result = saveManager.importSaveData('not json at all');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to parse save data');
    });
  });

  describe('Data Corruption Recovery', () => {
    it('falls back to defaults on corrupted progress', () => {
      mockStorage[SAVE_KEYS.PROGRESS] = 'not valid json';

      const freshManager = new SaveManager();
      freshManager.init();

      // Should have default progress, not crash
      expect(freshManager.getLevelProgress('1-1').completed).toBe(false);
    });

    it('falls back to defaults on corrupted global stats', () => {
      mockStorage[SAVE_KEYS.GLOBAL_STATS] = '{ broken json';

      const freshManager = new SaveManager();
      freshManager.init();

      expect(freshManager.getGlobalStats().totalDeaths).toBe(0);
    });
  });

  describe('Time Formatting', () => {
    const formatCases = [
      { seconds: null, expected: '--:--.--' },
      { seconds: 0, expected: '00:00.00' },
      { seconds: 65.5, expected: '01:05.50' },
      { seconds: 125.123, expected: '02:05.12' },
    ];

    formatCases.forEach(({ seconds, expected }) => {
      it(`formats ${seconds} as "${expected}"`, () => {
        expect(saveManager.formatTime(seconds)).toBe(expected);
      });
    });
  });

  describe('Clear Functions', () => {
    it('clearProgress resets progress but preserves settings', () => {
      mockStorage[SAVE_KEYS.SETTINGS] = JSON.stringify({ difficulty: 2 });
      saveManager.saveLevelCompletion('1-1', {
        time: 60,
        keyShards: 2,
        score: 1500,
        rank: 'A',
        coins: 15,
      });

      saveManager.clearProgress();

      expect(saveManager.getLevelProgress('1-1').completed).toBe(false);
      expect(saveManager.getDifficulty()).toBe(2); // Settings preserved
    });

    it('clearAll removes everything', () => {
      mockStorage[SAVE_KEYS.SETTINGS] = JSON.stringify({ difficulty: 2 });
      saveManager.saveLevelCompletion('1-1', {
        time: 60,
        keyShards: 2,
        score: 1500,
        rank: 'A',
        coins: 15,
      });

      saveManager.clearAll();

      expect(localStorage.removeItem).toHaveBeenCalledWith(SAVE_KEYS.PROGRESS);
      expect(localStorage.removeItem).toHaveBeenCalledWith(SAVE_KEYS.SETTINGS);
    });
  });
});
