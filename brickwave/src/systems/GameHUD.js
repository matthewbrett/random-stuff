import { SCALE } from '../config.js';

/**
 * GameHUD - Heads-Up Display for game information
 *
 * Displays:
 * - Score
 * - Coins collected
 * - Echo Charges (dash charges)
 * - World/Level number
 * - Time
 * - Style bonus indicator (when active)
 */
export default class GameHUD {
  constructor(scene, scoreManager) {
    this.scene = scene;
    this.scoreManager = scoreManager;

    // HUD container (fixed to camera)
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000); // Always on top

    // Text style for HUD (scaled)
    this.textStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: `${8 * SCALE}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2 * SCALE
    };

    // Create HUD elements
    this.createHUDElements();

    // Listen for score/coin events
    this.setupEventListeners();
  }

  /**
   * Create all HUD elements
   */
  createHUDElements() {
    const padding = 4 * SCALE;
    const lineHeight = 10 * SCALE;

    // World/Level display (top left)
    this.worldText = this.scene.add.text(
      padding,
      padding,
      'WORLD 1-1',
      this.textStyle
    );
    this.container.add(this.worldText);

    // Score display (top left, below world)
    this.scoreText = this.scene.add.text(
      padding,
      padding + lineHeight,
      'SCORE: 0',
      this.textStyle
    );
    this.container.add(this.scoreText);

    // Coins display (top left, below score)
    this.coinsText = this.scene.add.text(
      padding,
      padding + lineHeight * 2,
      'COINS ×0',
      this.textStyle
    );
    this.container.add(this.coinsText);

    // Health display (top left, below coins)
    this.healthText = this.scene.add.text(
      padding,
      padding + lineHeight * 3,
      'HEALTH ♥♥♥♥',
      this.textStyle
    );
    this.container.add(this.healthText);

    // Time display (top right)
    const gameWidth = this.scene.game.config.width;
    this.timeText = this.scene.add.text(
      gameWidth - padding,
      padding,
      'TIME 00:00',
      this.textStyle
    );
    this.timeText.setOrigin(1, 0); // Right-aligned
    this.container.add(this.timeText);

    // Echo Charges display (top right, below time)
    this.echoChargesText = this.scene.add.text(
      gameWidth - padding,
      padding + lineHeight,
      'ECHO ○○○',
      this.textStyle
    );
    this.echoChargesText.setOrigin(1, 0); // Right-aligned
    this.container.add(this.echoChargesText);

    // Key Shards display (top right, below echo charges)
    this.keyShardsText = this.scene.add.text(
      gameWidth - padding,
      padding + lineHeight * 2,
      'KEYS ◇◇◇',
      this.textStyle
    );
    this.keyShardsText.setOrigin(1, 0); // Right-aligned
    this.container.add(this.keyShardsText);

    // Style bonus indicator (appears when active)
    this.styleBonusText = this.scene.add.text(
      gameWidth / 2,
      padding + lineHeight * 3,
      'STYLE COMBO!',
      {
        ...this.textStyle,
        color: '#ffff00'
      }
    );
    this.styleBonusText.setOrigin(0.5, 0);
    this.styleBonusText.setVisible(false);
    this.container.add(this.styleBonusText);
  }

  /**
   * Setup event listeners for score changes
   */
  setupEventListeners() {
    // Score changed
    this.scene.events.on('scoreChanged', (score) => {
      this.updateScore(score);
    });

    // Coin collected
    this.scene.events.on('coinCollected', (coins) => {
      this.updateCoins(coins);
    });

    // Echo charge gained
    this.scene.events.on('echoChargeGained', (charges) => {
      this.updateEchoCharges(charges);
      this.flashEchoCharges();
    });

    // Echo charge used
    this.scene.events.on('echoChargeUsed', (charges) => {
      this.updateEchoCharges(charges);
    });

    // Style bonus start
    this.scene.events.on('styleBonusStart', () => {
      this.showStyleBonus();
    });

    // Style bonus end
    this.scene.events.on('styleBonusEnd', () => {
      this.hideStyleBonus();
    });

    // Key shard collected
    this.scene.events.on('keyShardCollected', (shardIndex, totalShards) => {
      this.updateKeyShards();
      this.flashKeyShards();
    });

    // Health changed
    this.scene.events.on('healthChanged', (current, max) => {
      this.updateHealth(current, max);
      this.flashHealth();
    });
  }

  /**
   * Update score display
   * @param {number} score - Current score
   */
  updateScore(score) {
    this.scoreText.setText(`SCORE: ${score}`);
  }

  /**
   * Update coins display
   * @param {number} coins - Coins collected
   */
  updateCoins(coins) {
    this.coinsText.setText(`COINS ×${coins}`);
  }

  /**
   * Update Echo Charges display
   * @param {number} charges - Current charges
   */
  updateEchoCharges(charges) {
    const maxCharges = this.scoreManager.getMaxEchoCharges();
    let display = 'ECHO ';

    // Show filled/empty circles for charges
    for (let i = 0; i < maxCharges; i++) {
      display += i < charges ? '●' : '○';
    }

    this.echoChargesText.setText(display);
  }

  /**
   * Flash Echo Charges display when gained
   */
  flashEchoCharges() {
    this.scene.tweens.add({
      targets: this.echoChargesText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3
    });
  }

  /**
   * Update Key Shards display
   */
  updateKeyShards() {
    const shards = this.scoreManager.getKeyShards();
    let display = 'KEYS ';

    // Show filled/empty diamonds for shards
    for (let i = 0; i < shards.length; i++) {
      display += shards[i] ? '◆' : '◇';
    }

    this.keyShardsText.setText(display);
  }

  /**
   * Flash Key Shards display when collected
   */
  flashKeyShards() {
    this.scene.tweens.add({
      targets: this.keyShardsText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3
    });
  }

  /**
   * Update health display
   * @param {number} current - Current health
   * @param {number} max - Maximum health
   */
  updateHealth(current, max) {
    let display = 'HEALTH ';

    // Show filled hearts for current health, empty hearts for missing
    for (let i = 0; i < max; i++) {
      display += i < current ? '♥' : '♡';
    }

    this.healthText.setText(display);

    // Change color based on health
    if (current <= 1) {
      this.healthText.setColor('#ff6666'); // Red when critical
    } else if (current <= 2) {
      this.healthText.setColor('#ffaa00'); // Orange when low
    } else {
      this.healthText.setColor('#ffffff'); // White when healthy
    }
  }

  /**
   * Flash health display when damaged
   */
  flashHealth() {
    // Red flash effect
    this.healthText.setColor('#ff0000');

    this.scene.tweens.add({
      targets: this.healthText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.healthText.alpha = 1;
        // Restore appropriate color based on current health
        const currentText = this.healthText.text;
        const filledHearts = (currentText.match(/♥/g) || []).length;
        if (filledHearts <= 1) {
          this.healthText.setColor('#ff6666');
        } else if (filledHearts <= 2) {
          this.healthText.setColor('#ffaa00');
        } else {
          this.healthText.setColor('#ffffff');
        }
      }
    });
  }

  /**
   * Set initial health display (called at level start)
   * @param {number} current - Current health
   * @param {number} max - Maximum health
   */
  setInitialHealth(current, max) {
    this.updateHealth(current, max);
  }

  /**
   * Show style bonus indicator
   */
  showStyleBonus() {
    this.styleBonusText.setVisible(true);
    this.scene.tweens.add({
      targets: this.styleBonusText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 200,
      ease: 'Back.easeOut'
    });

    // Pulse animation
    this.styleBonusPulse = this.scene.tweens.add({
      targets: this.styleBonusText,
      scale: { from: 1, to: 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Hide style bonus indicator
   */
  hideStyleBonus() {
    if (this.styleBonusPulse) {
      this.styleBonusPulse.stop();
    }

    this.scene.tweens.add({
      targets: this.styleBonusText,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.styleBonusText.setVisible(false);
      }
    });
  }

  /**
   * Update time display
   */
  updateTime() {
    const formattedTime = this.scoreManager.getFormattedTime();
    this.timeText.setText(`TIME ${formattedTime}`);
  }

  /**
   * Set world/level number
   * @param {number} world - World number
   * @param {number} level - Level number
   */
  setWorld(world, level) {
    this.worldText.setText(`WORLD ${world}-${level}`);
  }

  /**
   * Update HUD (call every frame)
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    // Update time display
    this.updateTime();

    // Update Echo Charges (in case they changed)
    this.updateEchoCharges(this.scoreManager.getEchoCharges());
  }

  /**
   * Show level complete stats
   */
  showLevelComplete() {
    // Calculate bonuses
    const timeBonus = this.scoreManager.calculateTimeBonus();
    const styleBonus = this.scoreManager.calculateStyleBonus();
    const totalScore = this.scoreManager.getTotalScore();

    // Create a results panel (will be enhanced in Phase 8)
    const gameWidth = this.scene.game.config.width;
    const gameHeight = this.scene.game.config.height;

    const resultsText = this.scene.add.text(
      gameWidth / 2,
      gameHeight / 2,
      `LEVEL COMPLETE!\n\nScore: ${this.scoreManager.getScore()}\nTime Bonus: ${timeBonus}\nStyle Bonus: ${styleBonus}\n--------------\nTotal: ${totalScore}`,
      {
        ...this.textStyle,
        fontSize: `${10 * SCALE}px`,
        align: 'center'
      }
    );
    resultsText.setOrigin(0.5);
    resultsText.setScrollFactor(0);
    resultsText.setDepth(2000);

    this.container.add(resultsText);
  }

  /**
   * Destroy HUD
   */
  destroy() {
    // Remove all event listeners to prevent memory leaks
    this.scene.events.off('scoreChanged');
    this.scene.events.off('coinCollected');
    this.scene.events.off('echoChargeGained');
    this.scene.events.off('echoChargeUsed');
    this.scene.events.off('styleBonusStart');
    this.scene.events.off('styleBonusEnd');
    this.scene.events.off('keyShardCollected');
    this.scene.events.off('healthChanged');

    // Destroy visual elements
    this.container.destroy();
  }
}
