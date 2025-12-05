/**
 * ScoreManager - Manages scoring, coins, and Echo Charge system
 *
 * Features:
 * - Tracks current score
 * - Tracks coins collected
 * - Manages Echo Charges (10 coins = +1 dash, max 3)
 * - Tracks time bonuses
 * - Tracks style bonuses (continuous movement)
 * - Emits events for score/coin changes
 */
export default class ScoreManager {
  constructor(scene) {
    this.scene = scene;

    // Scoring data
    this.score = 0;
    this.coinsCollected = 0;
    this.echoCharges = 0;
    this.maxEchoCharges = 3;
    this.coinsPerCharge = 10;

    // Bonus tracking
    this.timeBonus = 0;
    this.styleBonus = 0;
    this.styleBonusMultiplier = 1.0;

    // Style bonus tracking (continuous movement)
    this.lastMoveTime = 0;
    this.moveComboTime = 0;
    this.moveComboThreshold = 2000; // 2 seconds of continuous movement
    this.isInCombo = false;

    // Level timer
    this.levelStartTime = 0;
    this.levelTime = 0;
    this.timerRunning = false;
  }

  /**
   * Start the level timer
   */
  startTimer() {
    this.levelStartTime = Date.now();
    this.timerRunning = true;
    this.levelTime = 0;
  }

  /**
   * Stop the level timer
   */
  stopTimer() {
    this.timerRunning = false;
  }

  /**
   * Update the timer
   */
  updateTimer() {
    if (this.timerRunning) {
      this.levelTime = Date.now() - this.levelStartTime;
    }
  }

  /**
   * Get the current level time in seconds
   * @returns {number} Time in seconds
   */
  getLevelTimeSeconds() {
    return Math.floor(this.levelTime / 1000);
  }

  /**
   * Get formatted time string (MM:SS)
   * @returns {string} Formatted time
   */
  getFormattedTime() {
    const totalSeconds = this.getLevelTimeSeconds();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Add score
   * @param {number} points - Points to add
   */
  addScore(points) {
    this.score += points;
    this.scene.events.emit('scoreChanged', this.score);
  }

  /**
   * Collect a coin
   * @param {number} value - Score value of the coin (default 100)
   */
  collectCoin(value = 100) {
    // Add score
    this.addScore(value);

    // Increment coin count
    this.coinsCollected++;
    this.scene.events.emit('coinCollected', this.coinsCollected);

    // Check if we earned an Echo Charge
    const chargesBefore = this.echoCharges;
    this.echoCharges = Math.min(
      Math.floor(this.coinsCollected / this.coinsPerCharge),
      this.maxEchoCharges
    );

    // If we gained a charge, emit event
    if (this.echoCharges > chargesBefore) {
      this.scene.events.emit('echoChargeGained', this.echoCharges);
    }
  }

  /**
   * Use an Echo Charge (for dash)
   * @returns {boolean} True if charge was used, false if none available
   */
  useEchoCharge() {
    if (this.echoCharges > 0) {
      this.echoCharges--;
      this.scene.events.emit('echoChargeUsed', this.echoCharges);
      return true;
    }
    return false;
  }

  /**
   * Update style bonus based on player movement
   * @param {boolean} isMoving - Is the player moving?
   * @param {number} delta - Time since last frame
   */
  updateStyleBonus(isMoving, delta) {
    if (isMoving) {
      this.lastMoveTime = Date.now();
      this.moveComboTime += delta;

      // Check if we entered a combo
      if (!this.isInCombo && this.moveComboTime >= this.moveComboThreshold) {
        this.isInCombo = true;
        this.scene.events.emit('styleBonusStart');
      }

      // Increase multiplier based on combo time
      if (this.isInCombo) {
        this.styleBonusMultiplier = 1.0 + Math.min(this.moveComboTime / 10000, 1.0);
      }
    } else {
      // Reset combo if stopped for too long
      const timeSinceMoved = Date.now() - this.lastMoveTime;
      if (timeSinceMoved > 500) {
        if (this.isInCombo) {
          this.scene.events.emit('styleBonusEnd', this.styleBonusMultiplier);
        }
        this.moveComboTime = 0;
        this.isInCombo = false;
        this.styleBonusMultiplier = 1.0;
      }
    }
  }

  /**
   * Calculate time bonus based on level completion time
   * @param {number} targetTime - Target completion time in seconds
   * @returns {number} Bonus points
   */
  calculateTimeBonus(targetTime = 90) {
    const actualTime = this.getLevelTimeSeconds();

    if (actualTime <= targetTime) {
      // Award bonus for completing under target time
      const timeRemaining = targetTime - actualTime;
      this.timeBonus = timeRemaining * 10; // 10 points per second under target
      return this.timeBonus;
    }

    this.timeBonus = 0;
    return 0;
  }

  /**
   * Calculate style bonus based on movement combo
   * @returns {number} Bonus points
   */
  calculateStyleBonus() {
    if (this.moveComboTime > 0) {
      this.styleBonus = Math.floor(this.moveComboTime / 100); // 1 point per 100ms of combo
      return this.styleBonus;
    }

    this.styleBonus = 0;
    return 0;
  }

  /**
   * Get total score including bonuses
   * @returns {number} Total score
   */
  getTotalScore() {
    return this.score + this.timeBonus + this.styleBonus;
  }

  /**
   * Reset all scoring data (for new level)
   */
  reset() {
    this.score = 0;
    this.coinsCollected = 0;
    this.echoCharges = 0;
    this.timeBonus = 0;
    this.styleBonus = 0;
    this.styleBonusMultiplier = 1.0;
    this.lastMoveTime = 0;
    this.moveComboTime = 0;
    this.isInCombo = false;
    this.levelStartTime = 0;
    this.levelTime = 0;
    this.timerRunning = false;
  }

  /**
   * Get current Echo Charges
   * @returns {number} Current charges
   */
  getEchoCharges() {
    return this.echoCharges;
  }

  /**
   * Get max Echo Charges
   * @returns {number} Max charges
   */
  getMaxEchoCharges() {
    return this.maxEchoCharges;
  }

  /**
   * Get coins collected
   * @returns {number} Coins collected
   */
  getCoinsCollected() {
    return this.coinsCollected;
  }

  /**
   * Get current score
   * @returns {number} Current score
   */
  getScore() {
    return this.score;
  }
}
