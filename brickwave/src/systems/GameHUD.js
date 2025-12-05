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

    // Text style for HUD
    this.textStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
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
    const padding = 4;
    const lineHeight = 10;

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
        fontSize: '10px',
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
    this.container.destroy();
  }
}
