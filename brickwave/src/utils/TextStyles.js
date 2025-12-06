import { SCALE } from '../config.js';

/**
 * TextStyles.js
 *
 * Centralized text styling utilities for smooth, readable text
 * while maintaining pixel art aesthetic for sprites.
 */

/**
 * Base text style with smooth rendering (overrides global pixelArt settings)
 */
const baseStyle = {
  fontFamily: 'Arial, Helvetica, sans-serif', // Smooth system font
  fontStyle: 'bold',
  resolution: 2, // Higher resolution for crisper text
};

/**
 * Predefined text styles for consistent UI (scaled)
 */
export const TextStyles = {
  // Large title text (e.g., "BRICKWAVE")
  title: {
    ...baseStyle,
    fontSize: `${32 * SCALE}px`,
    color: '#00ffff',
    stroke: '#0066aa',
    strokeThickness: 2 * SCALE,
    align: 'center',
  },

  // Subtitle text
  subtitle: {
    ...baseStyle,
    fontSize: `${12 * SCALE}px`,
    color: '#ffffff',
    align: 'center',
  },

  // Small prompts and hints
  hint: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#aaaaaa',
    align: 'center',
  },

  // Debug/info text
  debug: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#ffffff',
    backgroundColor: '#00000088',
    padding: { x: 6 * SCALE, y: 4 * SCALE },
  },

  // HUD labels
  hudLabel: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2 * SCALE,
  },

  // HUD values
  hudValue: {
    ...baseStyle,
    fontSize: `${12 * SCALE}px`,
    color: '#00ffff',
    stroke: '#000000',
    strokeThickness: 2 * SCALE,
  },

  // Menu item (unselected)
  menuItem: {
    ...baseStyle,
    fontSize: `${14 * SCALE}px`,
    color: '#888888',
    align: 'center',
  },

  // Menu item (selected/highlighted)
  menuItemSelected: {
    ...baseStyle,
    fontSize: `${14 * SCALE}px`,
    color: '#00ffff',
    stroke: '#0066aa',
    strokeThickness: 1 * SCALE,
    align: 'center',
  },

  // Body text for menus and dialogs
  body: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#ffffff',
    align: 'center',
    lineSpacing: 4 * SCALE,
  },

  // Level select item
  levelItem: {
    ...baseStyle,
    fontSize: `${12 * SCALE}px`,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2 * SCALE,
    align: 'left',
  },

  // Level select item (locked)
  levelItemLocked: {
    ...baseStyle,
    fontSize: `${12 * SCALE}px`,
    color: '#666666',
    stroke: '#000000',
    strokeThickness: 2 * SCALE,
    align: 'left',
  },

  // Settings label
  settingsLabel: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#ffffff',
    align: 'left',
  },

  // Settings value
  settingsValue: {
    ...baseStyle,
    fontSize: `${10 * SCALE}px`,
    color: '#00ffff',
    align: 'right',
  },

  // Rank display (S, A, B, C)
  rank: {
    ...baseStyle,
    fontSize: `${24 * SCALE}px`,
    color: '#ffff00',
    stroke: '#aa6600',
    strokeThickness: 2 * SCALE,
    align: 'center',
  },
};

/**
 * Create smooth text with antialiasing enabled
 * @param {Phaser.Scene} scene - The scene to add text to
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} content - Text content
 * @param {object} style - Text style (from TextStyles or custom)
 * @returns {Phaser.GameObjects.Text}
 */
export function createSmoothText(scene, x, y, content, style = TextStyles.subtitle) {
  const text = scene.add.text(x, y, content, style);

  // Text objects don't have setRoundPixels, and will use smooth rendering by default
  // when resolution is set higher in the style

  return text;
}

/**
 * Create smooth text that's anchored to center
 * @param {Phaser.Scene} scene - The scene to add text to
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} content - Text content
 * @param {object} style - Text style (from TextStyles or custom)
 * @returns {Phaser.GameObjects.Text}
 */
export function createCenteredText(scene, x, y, content, style = TextStyles.subtitle) {
  const text = createSmoothText(scene, x, y, content, style);
  text.setOrigin(0.5, 0.5);
  return text;
}
