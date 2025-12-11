import WebZone from '../entities/WebZone.js';

/**
 * WebZoneManager - Manages all web zones and player slowdown effects
 *
 * Features:
 * - Spawns web zones from Tiled object layer data
 * - Checks player overlap with all zones each frame
 * - Applies strongest slowdown if player is in multiple zones
 * - Removes slowdown when player exits all zones
 */
export default class WebZoneManager {
  /**
   * Create the web zone manager
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    this.scene = scene;

    // Array of all web zones
    this.zones = [];

    // Track if player is currently slowed
    this.playerSlowed = false;

    // eslint-disable-next-line no-console
    console.log('🕸️ WebZoneManager: Initialized');
  }

  /**
   * Spawn web zones from Tiled object layer
   * @param {object} levelData - The level JSON data
   */
  spawnFromLevel(levelData) {
    // Find object layers that might contain web zones
    const objectLayers = levelData.layers.filter(layer =>
      layer.type === 'objectgroup'
    );

    objectLayers.forEach(layer => {
      if (layer.objects) {
        layer.objects.forEach(obj => {
          this.spawnFromObject(obj);
        });
      }
    });

    // eslint-disable-next-line no-console
    console.log(`🕸️ WebZoneManager: Spawned ${this.zones.length} web zones`);
  }

  /**
   * Spawn a web zone from a Tiled object
   * @param {object} obj - The Tiled object data
   */
  spawnFromObject(obj) {
    // Check if this is a web zone object
    const type = (obj.type || obj.name || '').toLowerCase();

    if (type !== 'web_zone' && type !== 'webzone') {
      return null;
    }

    // Parse custom properties from Tiled
    const config = this.parseObjectProperties(obj);

    // Create the web zone (Tiled uses top-left coordinates)
    const zone = new WebZone(
      this.scene,
      obj.x,
      obj.y,
      obj.width || 48,
      obj.height || 24,
      config
    );

    this.zones.push(zone);

    return zone;
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
   * Add a web zone programmatically (for testing)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Zone width
   * @param {number} height - Zone height
   * @param {object} config - Additional configuration
   * @returns {WebZone} The created zone
   */
  addZone(x, y, width, height, config = {}) {
    const zone = new WebZone(this.scene, x, y, width, height, config);
    this.zones.push(zone);
    return zone;
  }

  /**
   * Update all zones and check player overlap
   * @param {Player} player - The player to check
   */
  update(player) {
    if (!player || !player.sprite || !player.sprite.active) {
      return;
    }

    // Check all zones for overlap
    let strongestSlowdown = 1.0;
    let isInAnyZone = false;

    for (const zone of this.zones) {
      if (zone.checkPlayerInside(player)) {
        isInAnyZone = true;
        // Use the strongest slowdown (lowest value)
        const zoneFactor = zone.getSlowdownFactor();
        if (zoneFactor < strongestSlowdown) {
          strongestSlowdown = zoneFactor;
        }
      }
    }

    // Apply or remove slowdown
    if (isInAnyZone) {
      if (!this.playerSlowed) {
        // Just entered a zone
        this.playerSlowed = true;
      }
      player.setSpeedModifier(strongestSlowdown);
    } else if (this.playerSlowed) {
      // Just left all zones
      this.playerSlowed = false;
      player.setSpeedModifier(1.0);
    }
  }

  /**
   * Check if player is currently in any web zone
   * @returns {boolean} True if player is slowed
   */
  isPlayerSlowed() {
    return this.playerSlowed;
  }

  /**
   * Get count of web zones
   * @returns {number} Number of zones
   */
  getZoneCount() {
    return this.zones.length;
  }

  /**
   * Get all zones
   * @returns {Array} Array of all web zones
   */
  getAll() {
    return this.zones;
  }

  /**
   * Remove all zones
   */
  clear() {
    this.zones.forEach(zone => zone.destroy());
    this.zones = [];
    this.playerSlowed = false;
  }

  /**
   * Destroy the manager
   */
  destroy() {
    this.clear();
  }
}
