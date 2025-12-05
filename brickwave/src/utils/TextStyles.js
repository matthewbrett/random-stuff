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
