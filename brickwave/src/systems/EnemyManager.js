import Skitter from '../entities/Skitter.js';
import BlinkBat from '../entities/BlinkBat.js';
import SentryOrb from '../entities/SentryOrb.js';
import BrickMimic from '../entities/BrickMimic.js';
import saveManager from './SaveManager.js';
import { SCALE } from '../config.js';

/**
 * EnemyManager - Handles enemy spawning, updating, and collision
 *
 * Features:
 * - Spawns enemies from Tiled object layer data
 * - Updates all enemies each frame
 * - Handles player-enemy collision detection
 * - Manages stomp and dash combat mechanics
 */
export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;

    // Array of all active enemies
    this.enemies = [];

    // Difficulty-driven tuning
    this.difficulty = saveManager.getDifficulty();
    this.enemySpeedMultiplier = saveManager.getEnemySpeedMultiplier();

    // Enemy class registry for spawning
    this.enemyTypes = {
      'skitter': Skitter,
      'blinkbat': BlinkBat,
      'blink_bat': BlinkBat,
      'sentryorb': SentryOrb,
      'sentry_orb': SentryOrb,
      'orb': SentryOrb,
      'brickmimic': BrickMimic,
      'brick_mimic': BrickMimic,
      'mimic': BrickMimic,
    };

    // eslint-disable-next-line no-console
    console.log('👾 EnemyManager: Initialized');
  }

  /**
   * Spawn enemies from Tiled object layer
   * @param {object} levelData - The level JSON data
   */
  spawnFromLevel(levelData) {
    // Find the Enemies or Entities object layer
    const enemyLayers = levelData.layers.filter(layer =>
      (layer.name === 'Enemies' || layer.name === 'Entities') &&
      layer.type === 'objectgroup'
    );

    enemyLayers.forEach(layer => {
      if (layer.objects) {
        layer.objects.forEach(obj => {
          this.spawnFromObject(obj);
        });
      }
    });

    // eslint-disable-next-line no-console
    console.log(`👾 EnemyManager: Spawned ${this.enemies.length} enemies`);
  }

  /**
   * Spawn an enemy from a Tiled object
   * @param {object} obj - The Tiled object data
   */
  spawnFromObject(obj) {
    // Check if this is an enemy object
    const type = (obj.type || obj.name || '').toLowerCase();

    if (!this.enemyTypes[type]) {
      // Not an enemy type we recognize
      return null;
    }

    // Parse custom properties from Tiled
    const config = this.parseObjectProperties(obj);

    if (!this.shouldSpawnEnemy(config)) {
      return null;
    }

    // Calculate spawn position (Tiled uses bottom-left, we use center)
    // Apply SCALE for resolution support
    const x = (obj.x + (obj.width || 8) / 2) * SCALE;
    const y = (obj.y - (obj.height || 8) / 2) * SCALE;

    // Spawn the enemy
    return this.spawn(type, x, y, config);
  }

  /**
   * Parse custom properties from a Tiled object
   * @param {object} obj - The Tiled object
   * @returns {object} Configuration object
   */
  parseObjectProperties(obj) {
    const config = {};

    if (obj.properties) {
      obj.properties.forEach(prop => {
        config[prop.name] = prop.value;
      });
    }

    return config;
  }

  /**
   * Spawn an enemy of a specific type
   * @param {string} type - Enemy type name
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} config - Additional configuration
   * @returns {Enemy} The spawned enemy
   */
  spawn(type, x, y, config = {}) {
    const EnemyClass = this.enemyTypes[type.toLowerCase()];

    if (!EnemyClass) {
      console.warn(`👾 EnemyManager: Unknown enemy type "${type}"`);
      return null;
    }

    const speedMultiplier = (config.speedMultiplier ?? 1) * this.enemySpeedMultiplier;
    const enemy = new EnemyClass(this.scene, x, y, { ...config, speedMultiplier });
    this.enemies.push(enemy);

    // Setup collision with platforms
    this.setupEnemyCollision(enemy);

    return enemy;
  }

  /**
   * Setup collision for an enemy
   * @param {Enemy} enemy - The enemy to setup
   */
  setupEnemyCollision(enemy) {
    // Add collision with solid platforms
    if (this.scene.platforms) {
      this.scene.physics.add.collider(enemy.sprite, this.scene.platforms);
    }

    // Add collision with one-way platforms (for ground enemies)
    if (this.scene.oneWayPlatforms && enemy instanceof Skitter) {
      this.scene.physics.add.collider(enemy.sprite, this.scene.oneWayPlatforms);
    }
  }

  /**
   * Update all enemies
   * @param {number} time - Current game time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    // Update each enemy
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isDead()) {
        // Remove dead enemies from array
        this.enemies.splice(i, 1);
      } else {
        enemy.update(time, delta);
      }
    }
  }

  /**
   * Check player collision with all enemies
   * @param {Player} player - The player object
   * @returns {object} Result of collision check
   */
  checkPlayerCollision(player) {
    const playerBounds = player.sprite.getBounds();
    const result = {
      hit: false,
      stomped: null,
      dashed: null,
      damaged: false,
      score: 0
    };

    for (const enemy of this.enemies) {
      if (!enemy.isActive()) continue;

      const enemyBounds = enemy.getBounds();

      // Check for overlap
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, enemyBounds)) {
        if (enemy.onPlayerOverlap) {
          enemy.onPlayerOverlap(player);
        }
        result.hit = true;

        // Check stomp (player coming from above)
        if (enemy.checkStomp(player)) {
          enemy.onStomp(player);
          result.stomped = enemy;
          result.score += enemy.getScoreValue();
        }
        // Check dash attack
        else if (enemy.checkDash(player)) {
          enemy.onDash(player);
          result.dashed = enemy;
          result.score += enemy.getScoreValue();
        }
        // Player takes damage
        else if (enemy.isDangerous()) {
          const shouldDamage = enemy.onPlayerCollision(player);
          result.damaged = shouldDamage !== false;
        }
      }
    }

    return result;
  }

  /**
   * Get count of active enemies
   * @returns {number} Number of active enemies
   */
  getActiveCount() {
    return this.enemies.filter(e => e.isActive()).length;
  }

  /**
   * Get all enemies
   * @returns {Array} Array of all enemies
   */
  getAll() {
    return this.enemies;
  }

  /**
   * Remove all enemies
   */
  clear() {
    this.enemies.forEach(enemy => enemy.destroy());
    this.enemies = [];
  }

  /**
   * Whether an enemy should spawn for the current difficulty
   * @param {object} config - Parsed properties
   * @returns {boolean} True if enemy should be spawned
   */
  shouldSpawnEnemy(config = {}) {
    // Skip enemies flagged medium/hard on Easy
    if (this.difficulty === 0 && (config.medium_hard_only || config.mediumHardOnly)) {
      return false;
    }

    // Skip hard-only enemies unless on Hard
    if (this.difficulty < 2 && (config.hard_only || config.hardOnly)) {
      return false;
    }

    return true;
  }

  /**
   * Destroy the manager
   */
  destroy() {
    this.clear();
  }
}
