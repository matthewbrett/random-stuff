import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import GameScene from './scenes/GameScene.js';

// Resolution mode detection
function detectResolutionMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlMode = urlParams.get('mode');
  if (urlMode === 'polished' || urlMode === 'retro') return urlMode;
  return localStorage.getItem('brickwave_resolution_mode') || 'retro';
}

export const RESOLUTION_MODE = detectResolutionMode();
export const SCALE = RESOLUTION_MODE === 'polished' ? 2 : 1;

export function setResolutionMode(mode) {
  localStorage.setItem('brickwave_resolution_mode', mode);
  window.location.reload();
}

// Game configuration
export const config = {
  type: Phaser.AUTO,
  parent: 'game-container',

  // Fixed internal resolution (will be scaled up)
  width: 320 * SCALE,
  height: 180 * SCALE,

  // Pixel-perfect rendering
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Scale configuration for letterboxing
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 320 * SCALE,
    height: 180 * SCALE,
    zoom: SCALE === 2 ? 2 : 3, // Adjust zoom based on resolution
  },

  // Physics configuration
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 * SCALE },
      debug: true, // Set to true during development
      fps: 60,
      fixedStep: true,
      timeScale: 1,
    }
  },

  // Scenes
  scene: [
    BootScene,
    TitleScene,
    LevelSelectScene,
    SettingsScene,
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
  GAME_WIDTH: 320 * SCALE,
  GAME_HEIGHT: 180 * SCALE,

  // Tile size
  TILE_SIZE: 8 * SCALE,

  // Player constants
  PLAYER_SPEED: 80 * SCALE,
  PLAYER_JUMP_VELOCITY: -300 * SCALE,
  PLAYER_DASH_SPEED: 200 * SCALE,
  PLAYER_DASH_DURATION: 200, // ms (time stays the same)

  // Physics constants
  GRAVITY: 800 * SCALE,
  COYOTE_TIME: 100, // ms (time stays the same)
  JUMP_BUFFER: 100, // ms (time stays the same)

  // Phase brick constants
  PHASE_CYCLE_DURATION: 2000, // ms (2 seconds solid, 2 seconds ghost)

  // Scoring
  COIN_VALUE: 100,
  COINS_PER_ECHO: 10,
  MAX_ECHO_CHARGES: 3,

  // Enemy constants
  ENEMY_SCORE: {
    SKITTER: 50,
    BLINKBAT: 75,
    SENTRYORB: 100,
  },
  STOMP_BOUNCE_VELOCITY: -150 * SCALE,
  ORB_BOUNCE_VELOCITY: -200 * SCALE,
};
