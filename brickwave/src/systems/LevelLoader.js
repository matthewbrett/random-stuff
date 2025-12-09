import Phaser from 'phaser';
import { GAME_CONFIG, SCALE } from '../config.js';
import PhaseBrick from '../entities/PhaseBrick.js';

/**
 * LevelLoader - Handles loading and parsing Tiled JSON maps
 *
 * Supports:
 * - Multiple tile layers (Background, Solid, One-Way, Foreground, Phase)
 * - Solid tile collision
 * - One-way platforms
 * - Phase bricks with timing system
 * - Entity spawning from object layers
 */
export default class LevelLoader {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = GAME_CONFIG.TILE_SIZE;
    this.layers = {};
    this.collisionTiles = null;
    this.oneWayPlatforms = null;
    this.phaseBricks = []; // Array of phase brick instances
  }

  /**
   * Load a level from Tiled JSON data
   * @param {object} levelData - The Tiled JSON data
   */
  loadLevel(levelData) {
    console.log('🗺️  LevelLoader: Loading level...', levelData.name || 'Untitled');

    this.levelData = levelData;
    this.levelWidth = levelData.width * this.tileSize;
    this.levelHeight = levelData.height * this.tileSize;

    // Clear existing layers
    this.clearLevel();

    // Create collision groups
    this.collisionTiles = this.scene.physics.add.staticGroup();
    this.oneWayPlatforms = this.scene.physics.add.staticGroup();
    this.hazardTiles = this.scene.physics.add.staticGroup(); // Fire/spike tiles
    this.phaseBricks = []; // Reset phase bricks array

    // Process each layer
    levelData.layers.forEach(layer => {
      if (layer.type === 'tilelayer') {
        this.loadTileLayer(layer);
      } else if (layer.type === 'objectgroup') {
        this.loadObjectLayer(layer);
      }
    });

    // Refresh collision bodies
    this.collisionTiles.refresh();
    this.oneWayPlatforms.refresh();
    this.hazardTiles.refresh();

    // Set up world bounds
    this.scene.physics.world.setBounds(0, 0, this.levelWidth, this.levelHeight);
    this.scene.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);

    console.log('✅ LevelLoader: Level loaded successfully');
    return {
      width: this.levelWidth,
      height: this.levelHeight,
      collisionTiles: this.collisionTiles,
      oneWayPlatforms: this.oneWayPlatforms,
      hazardTiles: this.hazardTiles,
      phaseBricks: this.phaseBricks,
    };
  }

  /**
   * Load a tile layer (Background, Solid, One-Way, etc.)
   */
  loadTileLayer(layer) {
    if (!layer.visible) return;

    console.log(`  📐 Loading tile layer: ${layer.name}`);

    const layerGroup = this.scene.add.group();
    this.layers[layer.name] = layerGroup;

    // Determine layer type from name or properties
    const layerType = this.getLayerType(layer);

    // Process tiles
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const index = y * layer.width + x;
        const tileId = layer.data[index];

        // Skip empty tiles (0 in Tiled means no tile)
        if (tileId === 0) continue;

        const tileX = x * this.tileSize + this.tileSize / 2;
        const tileY = y * this.tileSize + this.tileSize / 2;

        // Create tile based on type
        this.createTile(tileX, tileY, tileId, layerType, layer);
      }
    }
  }

  /**
   * Create a single tile
   */
  createTile(x, y, tileId, layerType, layer) {
    // Handle phase bricks differently
    if (layerType === 'phase') {
      // Determine phase group from tile ID (tileId - 1) allows different groups
      // tileId 1 = group 0, tileId 2 = group 1, etc.
      const groupId = (tileId - 1) % 4; // Support up to 4 groups for now

      // Create a phase brick
      const phaseBrick = new PhaseBrick(this.scene, x, y, this.tileSize, groupId);
      this.phaseBricks.push(phaseBrick);

      // Add brick visual to layer group (no longer using container)
      if (this.layers[layer.name]) {
        this.layers[layer.name].add(phaseBrick.brick);
      }

      return phaseBrick;
    }

    // Regular tiles (non-phase)
    // Get tile color based on tileId
    const color = this.getTileColor(tileId, layerType);

    // Create visual representation
    const tile = this.scene.add.rectangle(x, y, this.tileSize, this.tileSize, color);
    tile.setStrokeStyle(1, 0x000000, 0.3);

    // Add to appropriate collision group
    if (layerType === 'solid') {
      this.collisionTiles.add(tile);
    } else if (layerType === 'oneway') {
      this.oneWayPlatforms.add(tile);
      // Make one-way platforms slightly transparent to distinguish them
      tile.setAlpha(0.8);
    } else if (layerType === 'hazard') {
      this.hazardTiles.add(tile);
    }

    // Add to layer group
    if (this.layers[layer.name]) {
      this.layers[layer.name].add(tile);
    }

    return tile;
  }

  /**
   * Load an object layer (entities, spawn points, etc.)
   */
  loadObjectLayer(layer) {
    if (!layer.visible) return;

    console.log(`  🎯 Loading object layer: ${layer.name}`);

    // Store objects for later processing
    if (!this.objects) this.objects = {};
    this.objects[layer.name] = layer.objects;

    // Process spawn points, collectibles, etc.
    // This will be expanded in future phases
  }

  /**
   * Determine layer type from name or properties
   */
  getLayerType(layer) {
    const name = layer.name.toLowerCase();

    if (name.includes('phase')) {
      return 'phase';
    } else if (name.includes('hazard') || name.includes('fire') || name.includes('spike')) {
      return 'hazard';
    } else if (name.includes('solid') || name.includes('collision')) {
      return 'solid';
    } else if (name.includes('oneway') || name.includes('platform')) {
      return 'oneway';
    } else if (name.includes('background')) {
      return 'background';
    } else if (name.includes('foreground')) {
      return 'foreground';
    }

    return 'decoration';
  }

  /**
   * Get tile color based on tile ID and type
   */
  getTileColor(tileId, layerType) {
    // Check if level has forest theme
    const isForestTheme = this.levelData.properties && this.levelData.properties.theme === 'forest';

    if (isForestTheme) {
      // Forest theme palette
      const forestColors = {
        1: 0x4a5568,  // Standard grey (unused in forest)
        2: 0x5a6c7a,  // Grey rocks (cave entrance)
        3: 0x87CEEB,  // Sky blue (background)
        4: 0x8B7355,  // Brown soil
        5: 0x2d8659,  // Grass green
        6: 0x654321,  // Dark brown (dirt/underground)
      };
      return forestColors[tileId] || 0x4a5568;
    }

    // Default catacomb theme palette
    const colors = {
      solid: [0x4a5568, 0x64748b, 0x475569],
      oneway: [0x94a3b8, 0xa8b8cc],
      background: [0x1e293b, 0x334155],
      foreground: [0x0f172a, 0x1e293b],
      hazard: [0xff4500, 0xff6600, 0xff3300], // Fire/lava colors (orange-red)
    };

    const palette = colors[layerType] || colors.solid;
    return palette[(tileId - 1) % palette.length];
  }

  /**
   * Clear the current level
   */
  clearLevel() {
    // Destroy all layer groups
    Object.values(this.layers).forEach(group => {
      if (group && group.destroy) {
        group.clear(true, true);
      }
    });
    this.layers = {};

    // Clear collision groups
    if (this.collisionTiles) {
      this.collisionTiles.clear(true, true);
    }
    if (this.oneWayPlatforms) {
      this.oneWayPlatforms.clear(true, true);
    }
    if (this.hazardTiles) {
      this.hazardTiles.clear(true, true);
    }

    // Destroy phase bricks
    if (this.phaseBricks) {
      this.phaseBricks.forEach(brick => brick.destroy());
      this.phaseBricks = [];
    }
  }

  /**
   * Get spawn points from object layers
   */
  getSpawnPoint(name = 'player') {
    if (!this.objects || !this.objects.Entities) {
      // Default spawn point (scaled)
      return { x: 160 * SCALE, y: 100 * SCALE };
    }

    const spawnObj = this.objects.Entities.find(obj =>
      obj.name === name || obj.type === name
    );

    if (spawnObj) {
      // Scale spawn point coordinates from Tiled
      return {
        x: (spawnObj.x + spawnObj.width / 2) * SCALE,
        y: (spawnObj.y - spawnObj.height / 2) * SCALE, // Tiled uses bottom-left for objects
      };
    }

    return { x: 160 * SCALE, y: 100 * SCALE };
  }

  /**
   * Get level bounds
   */
  getBounds() {
    return {
      width: this.levelWidth,
      height: this.levelHeight,
    };
  }
}
