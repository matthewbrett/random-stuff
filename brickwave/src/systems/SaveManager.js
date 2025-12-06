/**
 * SaveManager - Handles game persistence using localStorage
 *
 * Stores:
 * - Level progress (best times, key shards, completion status)
 * - Settings (handled by SettingsScene, but we provide utilities)
 * - Global stats (total coins, total play time, etc.)
 */

const SAVE_KEYS = {
  PROGRESS: 'brickwave_progress',
  SETTINGS: 'brickwave_settings',
  GLOBAL_STATS: 'brickwave_stats',
  SAVE_VERSION: 'brickwave_version'
};

const CURRENT_SAVE_VERSION = 1;

class SaveManager {
  constructor() {
    this.progress = {};
    this.globalStats = {};
    this.initialized = false;
  }

  /**
   * Initialize the save manager - load existing data or create defaults
   */
  init() {
    if (this.initialized) return;

    this.checkAndMigrateSave();
    this.loadProgress();
    this.loadGlobalStats();
    this.initialized = true;
  }

  /**
   * Check save version and migrate if needed
   */
  checkAndMigrateSave() {
    const savedVersion = localStorage.getItem(SAVE_KEYS.SAVE_VERSION);
    const version = savedVersion ? parseInt(savedVersion, 10) : 0;

    if (version < CURRENT_SAVE_VERSION) {
      this.migrateSave(version, CURRENT_SAVE_VERSION);
      localStorage.setItem(SAVE_KEYS.SAVE_VERSION, CURRENT_SAVE_VERSION.toString());
    }
  }

  /**
   * Migrate save data between versions
   * @param {number} fromVersion - Current save version
   * @param {number} toVersion - Target save version
   */
  migrateSave(fromVersion, toVersion) {
    // Version 0 -> 1: Initial format, no migration needed
    // Future migrations can be added here as needed
    console.log(`Save migrated from v${fromVersion} to v${toVersion}`);
  }

  /**
   * Load all level progress from localStorage
   */
  loadProgress() {
    try {
      const saved = localStorage.getItem(SAVE_KEYS.PROGRESS);
      if (saved) {
        this.progress = JSON.parse(saved);
      } else {
        this.progress = this.getDefaultProgress();
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
      this.progress = this.getDefaultProgress();
    }
  }

  /**
   * Load global statistics from localStorage
   */
  loadGlobalStats() {
    try {
      const saved = localStorage.getItem(SAVE_KEYS.GLOBAL_STATS);
      if (saved) {
        this.globalStats = JSON.parse(saved);
      } else {
        this.globalStats = this.getDefaultGlobalStats();
      }
    } catch (e) {
      console.error('Failed to load global stats:', e);
      this.globalStats = this.getDefaultGlobalStats();
    }
  }

  /**
   * Get default progress structure
   * @returns {Object} Default progress object
   */
  getDefaultProgress() {
    return {
      '1-1': { bestTime: null, keyShards: 0, completed: false, bestScore: 0, bestRank: null },
      '1-2': { bestTime: null, keyShards: 0, completed: false, bestScore: 0, bestRank: null },
      '1-3': { bestTime: null, keyShards: 0, completed: false, bestScore: 0, bestRank: null }
    };
  }

  /**
   * Get default global stats structure
   * @returns {Object} Default stats object
   */
  getDefaultGlobalStats() {
    return {
      totalCoinsCollected: 0,
      totalPlayTime: 0,
      totalDeaths: 0,
      totalLevelCompletions: 0,
      totalEnemiesDefeated: 0,
      firstPlayDate: null,
      lastPlayDate: null
    };
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    try {
      localStorage.setItem(SAVE_KEYS.PROGRESS, JSON.stringify(this.progress));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  /**
   * Save global stats to localStorage
   */
  saveGlobalStats() {
    try {
      localStorage.setItem(SAVE_KEYS.GLOBAL_STATS, JSON.stringify(this.globalStats));
    } catch (e) {
      console.error('Failed to save global stats:', e);
    }
  }

  /**
   * Get progress for a specific level
   * @param {string} levelId - Level identifier (e.g., '1-1')
   * @returns {Object} Level progress data
   */
  getLevelProgress(levelId) {
    if (!this.progress[levelId]) {
      this.progress[levelId] = {
        bestTime: null,
        keyShards: 0,
        completed: false,
        bestScore: 0,
        bestRank: null
      };
    }
    return this.progress[levelId];
  }

  /**
   * Save level completion stats
   * @param {string} levelId - Level identifier (e.g., '1-1')
   * @param {Object} stats - Completion stats
   * @param {number} stats.time - Completion time in seconds
   * @param {number} stats.keyShards - Key shards collected (0-3)
   * @param {number} stats.score - Total score
   * @param {string} stats.rank - Achieved rank (S, A, B, C, D)
   * @param {number} stats.coins - Coins collected
   * @returns {Object} Object indicating what was improved
   */
  saveLevelCompletion(levelId, stats) {
    const current = this.getLevelProgress(levelId);
    const improvements = {
      newBestTime: false,
      newBestScore: false,
      newKeyShards: false,
      firstCompletion: !current.completed
    };

    // Always mark as completed
    current.completed = true;

    // Check for best time (lower is better)
    if (current.bestTime === null || stats.time < current.bestTime) {
      current.bestTime = stats.time;
      improvements.newBestTime = true;
    }

    // Check for best score (higher is better)
    if (stats.score > current.bestScore) {
      current.bestScore = stats.score;
      current.bestRank = stats.rank;
      improvements.newBestScore = true;
    }

    // Check for key shards (keep highest count)
    if (stats.keyShards > current.keyShards) {
      current.keyShards = stats.keyShards;
      improvements.newKeyShards = true;
    }

    // Update global stats
    this.globalStats.totalLevelCompletions++;
    this.globalStats.totalCoinsCollected += stats.coins || 0;
    this.globalStats.lastPlayDate = new Date().toISOString();
    if (!this.globalStats.firstPlayDate) {
      this.globalStats.firstPlayDate = this.globalStats.lastPlayDate;
    }

    // Save everything
    this.saveProgress();
    this.saveGlobalStats();

    return improvements;
  }

  /**
   * Record a death for stats
   */
  recordDeath() {
    this.globalStats.totalDeaths++;
    this.saveGlobalStats();
  }

  /**
   * Record enemy defeat for stats
   * @param {number} count - Number of enemies defeated (default 1)
   */
  recordEnemyDefeats(count = 1) {
    this.globalStats.totalEnemiesDefeated += count;
    this.saveGlobalStats();
  }

  /**
   * Add play time to global stats
   * @param {number} seconds - Seconds to add
   */
  addPlayTime(seconds) {
    this.globalStats.totalPlayTime += seconds;
    this.saveGlobalStats();
  }

  /**
   * Check if a level is unlocked
   * @param {string} levelId - Level identifier
   * @returns {boolean} Whether level is unlocked
   */
  isLevelUnlocked(levelId) {
    // Level 1-1 is always unlocked
    if (levelId === '1-1') return true;

    // Parse level ID
    const match = levelId.match(/^(\d+)-(\d+)$/);
    if (!match) return false;

    const world = parseInt(match[1], 10);
    const level = parseInt(match[2], 10);

    // First level of each world requires completing previous world's last level
    // For now, just check if previous level in same world is completed
    if (level > 1) {
      const prevLevelId = `${world}-${level - 1}`;
      const prevProgress = this.getLevelProgress(prevLevelId);
      return prevProgress.completed;
    }

    // For world 2+, would need to complete world 1's last level, etc.
    // For MVP, all World 1 levels unlock progressively
    return true;
  }

  /**
   * Get all level progress data
   * @returns {Object} All progress data
   */
  getAllProgress() {
    return { ...this.progress };
  }

  /**
   * Get global stats
   * @returns {Object} Global statistics
   */
  getGlobalStats() {
    return { ...this.globalStats };
  }

  /**
   * Get total key shards collected across all levels
   * @returns {number} Total key shards
   */
  getTotalKeyShards() {
    return Object.values(this.progress)
      .reduce((total, level) => total + (level.keyShards || 0), 0);
  }

  /**
   * Get number of completed levels
   * @returns {number} Completed level count
   */
  getCompletedLevelCount() {
    return Object.values(this.progress)
      .filter(level => level.completed).length;
  }

  /**
   * Export all save data as JSON string
   * @returns {string} JSON string of all save data
   */
  exportSaveData() {
    const exportData = {
      version: CURRENT_SAVE_VERSION,
      exportDate: new Date().toISOString(),
      progress: this.progress,
      globalStats: this.globalStats,
      settings: this.getSettings()
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import save data from JSON string
   * @param {string} jsonString - JSON string to import
   * @returns {Object} Result object with success flag and message
   */
  importSaveData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data.version || !data.progress) {
        return { success: false, message: 'Invalid save format' };
      }

      // Validate version
      if (data.version > CURRENT_SAVE_VERSION) {
        return { success: false, message: 'Save from newer game version' };
      }

      // Import progress
      this.progress = data.progress;
      this.saveProgress();

      // Import global stats if present
      if (data.globalStats) {
        this.globalStats = { ...this.getDefaultGlobalStats(), ...data.globalStats };
        this.saveGlobalStats();
      }

      // Import settings if present
      if (data.settings) {
        localStorage.setItem(SAVE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }

      return { success: true, message: 'Save imported successfully' };
    } catch (e) {
      return { success: false, message: 'Failed to parse save data' };
    }
  }

  /**
   * Get current settings from localStorage
   * @returns {Object} Settings object
   */
  getSettings() {
    try {
      const saved = localStorage.getItem(SAVE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear all progress data (keep settings)
   */
  clearProgress() {
    this.progress = this.getDefaultProgress();
    this.globalStats = this.getDefaultGlobalStats();
    this.saveProgress();
    this.saveGlobalStats();
  }

  /**
   * Clear everything including settings
   */
  clearAll() {
    localStorage.removeItem(SAVE_KEYS.PROGRESS);
    localStorage.removeItem(SAVE_KEYS.GLOBAL_STATS);
    localStorage.removeItem(SAVE_KEYS.SETTINGS);
    localStorage.removeItem(SAVE_KEYS.SAVE_VERSION);
    this.progress = this.getDefaultProgress();
    this.globalStats = this.getDefaultGlobalStats();
  }

  /**
   * Format time for display (MM:SS.ms)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
const saveManager = new SaveManager();
export default saveManager;
export { SaveManager, SAVE_KEYS };
