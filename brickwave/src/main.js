import Phaser from 'phaser';
import { config } from './config.js';

// Initialize the game
const game = new Phaser.Game(config);

// Make game instance available globally for debugging
window.game = game;

console.log('🎮 BRICKWAVE starting...');
