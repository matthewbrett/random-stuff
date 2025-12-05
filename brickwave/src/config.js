import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';

// Game configuration
export const config = {
  type: Phaser.AUTO,
  parent: 'game-container',

  // Fixed internal resolution (will be scaled up)
  width: 320,
  height: 180,

  // Pixel-perfect rendering
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Scale configuration for letterboxing
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 320,
    height: 180,
    zoom: 3, // Default 3x zoom
  },

  // Physics configuration
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: true, // Set to true during development
      fps: 60,
      fixedStep: true,
      timeScale: 1,
    }
  },

  // Scenes
  scene: [
    BootScene,
    GameScene,
  ],

  // Background color (catacomb blue-ish)
  backgroundColor: '#1a1a2e',

  // Audio configuration
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },

  // Render configuration
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
  },

  // FPS configuration
  fps: {
    target: 60,
    forceSetTimeOut: false,
    deltaHistory: 10,
  },
};

// Game constants
export const GAME_CONFIG = {
  // Internal resolution
  GAME_WIDTH: 320,
  GAME_HEIGHT: 180,

  // Tile size
  TILE_SIZE: 8,

  // Player constants
  PLAYER_SPEED: 80,
  PLAYER_JUMP_VELOCITY: -300,
  PLAYER_DASH_SPEED: 200,
  PLAYER_DASH_DURATION: 200, // ms

  // Physics constants
  GRAVITY: 800,
  COYOTE_TIME: 100, // ms
  JUMP_BUFFER: 100, // ms

  // Phase brick constants
  PHASE_CYCLE_DURATION: 2000, // ms (2 seconds solid, 2 seconds ghost)

  // Scoring
  COIN_VALUE: 100,
  COINS_PER_ECHO: 10,
  MAX_ECHO_CHARGES: 3,
};
