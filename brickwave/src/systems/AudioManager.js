/**
 * AudioManager - Handles all game audio (music and SFX)
 *
 * Features:
 * - Master, music, and SFX volume controls
 * - Background music with looping
 * - Sound effect playback with pooling
 * - Integration with game settings
 * - Procedural/generated audio fallbacks
 */

// Audio keys for preloading
export const AUDIO_KEYS = {
  // Music
  MUSIC_TITLE: 'music_title',
  MUSIC_GAME: 'music_game',

  // SFX
  SFX_JUMP: 'sfx_jump',
  SFX_LAND: 'sfx_land',
  SFX_DASH: 'sfx_dash',
  SFX_COIN: 'sfx_coin',
  SFX_SHARD: 'sfx_shard',
  SFX_STOMP: 'sfx_stomp',
  SFX_HURT: 'sfx_hurt',
  SFX_PHASE: 'sfx_phase',
  SFX_MENU_SELECT: 'sfx_menu_select',
  SFX_MENU_CONFIRM: 'sfx_menu_confirm',
  SFX_LEVEL_COMPLETE: 'sfx_level_complete',
};

class AudioManager {
  constructor() {
    this.scene = null;
    this.initialized = false;

    // Volume settings (0-100)
    this.masterVolume = 100;
    this.musicVolume = 80;
    this.sfxVolume = 100;

    // Current music
    this.currentMusic = null;
    this.currentMusicKey = null;

    // Sound pool for frequently played sounds
    this.soundPool = new Map();

    // WebAudio context for procedural audio
    this.audioContext = null;
  }

  /**
   * Initialize audio manager with a Phaser scene
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  init(scene) {
    this.scene = scene;
    this.loadSettings();

    // Get or create WebAudio context for procedural audio
    try {
      this.audioContext = scene.sound.context;
    } catch {
      console.warn('WebAudio context not available');
    }

    this.initialized = true;
  }

  /**
   * Load volume settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('brickwave_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 100;
        this.musicVolume = settings.musicVolume ?? 80;
        this.sfxVolume = settings.sfxVolume ?? 100;
      }
    } catch (_e) {
      console.warn('Failed to load audio settings:', _e);
    }
  }

  /**
   * Calculate effective volume for music
   * @returns {number} Volume 0-1
   */
  getEffectiveMusicVolume() {
    return (this.masterVolume / 100) * (this.musicVolume / 100);
  }

  /**
   * Calculate effective volume for SFX
   * @returns {number} Volume 0-1
   */
  getEffectiveSFXVolume() {
    return (this.masterVolume / 100) * (this.sfxVolume / 100);
  }

  /**
   * Set master volume
   * @param {number} volume - Volume 0-100
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(100, volume));
    this.updateMusicVolume();
  }

  /**
   * Set music volume
   * @param {number} volume - Volume 0-100
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(100, volume));
    this.updateMusicVolume();
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume 0-100
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(100, volume));
  }

  /**
   * Update the current music volume
   */
  updateMusicVolume() {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.setVolume(this.getEffectiveMusicVolume());
    }
  }

  /**
   * Preload all audio assets
   * @param {Phaser.Scene} scene - Scene to preload in
   */
  preload(_scene) {
    // Check if audio files exist and load them
    // For now, we'll use procedural audio as fallback

    // Music files (if they exist)
    // scene.load.audio(AUDIO_KEYS.MUSIC_TITLE, '/assets/audio/music_title.mp3');
    // scene.load.audio(AUDIO_KEYS.MUSIC_GAME, '/assets/audio/music_game.mp3');

    // SFX files (if they exist)
    // scene.load.audio(AUDIO_KEYS.SFX_JUMP, '/assets/audio/jump.wav');
    // etc.
  }

  /**
   * Play background music
   * @param {string} key - Music key
   * @param {object} config - Optional config
   */
  playMusic(key, config = {}) {
    if (!this.scene) return;

    // Stop current music if playing
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
    }

    // Check if audio exists
    if (this.scene.cache.audio.exists(key)) {
      this.currentMusic = this.scene.sound.add(key, {
        volume: this.getEffectiveMusicVolume(),
        loop: config.loop !== false,
        ...config
      });
      this.currentMusic.play();
      this.currentMusicKey = key;
    } else {
      // Use procedural music as fallback
      // eslint-disable-next-line no-console
      console.log(`Music ${key} not found, using procedural fallback`);
      // For MVP, we'll just log this - real music can be added later
    }
  }

  /**
   * Stop current music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  /**
   * Pause current music
   */
  pauseMusic() {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.pause();
    }
  }

  /**
   * Resume current music
   */
  resumeMusic() {
    if (this.currentMusic && this.currentMusic.isPaused) {
      this.currentMusic.resume();
    }
  }

  /**
   * Play a sound effect
   * @param {string} key - SFX key
   * @param {object} config - Optional config
   */
  playSFX(key, config = {}) {
    if (!this.scene) return;

    const volume = this.getEffectiveSFXVolume();
    if (volume === 0) return;

    // Check if audio file exists
    if (this.scene.cache.audio.exists(key)) {
      const sound = this.scene.sound.add(key, {
        volume: volume * (config.volume || 1),
        ...config
      });
      sound.play();
      sound.once('complete', () => sound.destroy());
    } else {
      // Use procedural SFX
      this.playProceduralSFX(key, config);
    }
  }

  /**
   * Play procedurally generated sound effect
   * @param {string} key - SFX key
   * @param {object} config - Optional config
   */
  playProceduralSFX(key, config = {}) {
    if (!this.audioContext) return;

    const volume = this.getEffectiveSFXVolume() * (config.volume || 1);
    if (volume === 0) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    switch (key) {
      case AUDIO_KEYS.SFX_JUMP:
        this.generateTone(ctx, now, {
          frequency: 200,
          endFrequency: 400,
          duration: 0.1,
          volume: volume * 0.3,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_LAND:
        this.generateTone(ctx, now, {
          frequency: 100,
          endFrequency: 50,
          duration: 0.08,
          volume: volume * 0.2,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_DASH:
        this.generateTone(ctx, now, {
          frequency: 150,
          endFrequency: 300,
          duration: 0.15,
          volume: volume * 0.25,
          type: 'sawtooth'
        });
        break;

      case AUDIO_KEYS.SFX_COIN:
        // Two-tone coin sound
        this.generateTone(ctx, now, {
          frequency: 587, // D5
          duration: 0.06,
          volume: volume * 0.3,
          type: 'square'
        });
        this.generateTone(ctx, now + 0.06, {
          frequency: 880, // A5
          duration: 0.1,
          volume: volume * 0.3,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_SHARD:
        // Magical shimmer for key shard
        for (let i = 0; i < 4; i++) {
          this.generateTone(ctx, now + i * 0.05, {
            frequency: 440 + i * 110,
            duration: 0.15 - i * 0.02,
            volume: volume * 0.2,
            type: 'sine'
          });
        }
        break;

      case AUDIO_KEYS.SFX_STOMP:
        // Bounce/stomp sound
        this.generateTone(ctx, now, {
          frequency: 300,
          endFrequency: 150,
          duration: 0.12,
          volume: volume * 0.35,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_HURT:
        // Damage sound
        this.generateTone(ctx, now, {
          frequency: 200,
          endFrequency: 100,
          duration: 0.2,
          volume: volume * 0.3,
          type: 'sawtooth'
        });
        break;

      case AUDIO_KEYS.SFX_PHASE:
        // Phase brick transition
        this.generateTone(ctx, now, {
          frequency: 220,
          endFrequency: 330,
          duration: 0.1,
          volume: volume * 0.15,
          type: 'sine'
        });
        break;

      case AUDIO_KEYS.SFX_MENU_SELECT:
        this.generateTone(ctx, now, {
          frequency: 440,
          duration: 0.05,
          volume: volume * 0.2,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_MENU_CONFIRM:
        this.generateTone(ctx, now, {
          frequency: 440,
          duration: 0.05,
          volume: volume * 0.2,
          type: 'square'
        });
        this.generateTone(ctx, now + 0.05, {
          frequency: 660,
          duration: 0.1,
          volume: volume * 0.2,
          type: 'square'
        });
        break;

      case AUDIO_KEYS.SFX_LEVEL_COMPLETE: {
        // Victory fanfare
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          this.generateTone(ctx, now + i * 0.12, {
            frequency: freq,
            duration: 0.2,
            volume: volume * 0.25,
            type: 'square'
          });
        });
        break;
      }

      default:
        // Generic beep fallback
        this.generateTone(ctx, now, {
          frequency: 440,
          duration: 0.05,
          volume: volume * 0.15,
          type: 'square'
        });
    }
  }

  /**
   * Generate a simple tone using WebAudio
   * @param {AudioContext} ctx - Audio context
   * @param {number} startTime - When to start
   * @param {object} params - Tone parameters
   */
  generateTone(ctx, startTime, params) {
    const {
      frequency = 440,
      endFrequency = null,
      duration = 0.1,
      volume = 0.3,
      type = 'square'
    } = params;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);

      if (endFrequency && endFrequency !== frequency) {
        oscillator.frequency.linearRampToValueAtTime(endFrequency, startTime + duration);
      }

      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.01);
    } catch {
      // Audio context might be suspended or unavailable
    }
  }

  /**
   * Quick helper methods for common sounds
   */
  playJump() { this.playSFX(AUDIO_KEYS.SFX_JUMP); }
  playLand() { this.playSFX(AUDIO_KEYS.SFX_LAND); }
  playDash() { this.playSFX(AUDIO_KEYS.SFX_DASH); }
  playCoin() { this.playSFX(AUDIO_KEYS.SFX_COIN); }
  playShard() { this.playSFX(AUDIO_KEYS.SFX_SHARD); }
  playStomp() { this.playSFX(AUDIO_KEYS.SFX_STOMP); }
  playHurt() { this.playSFX(AUDIO_KEYS.SFX_HURT); }
  playPhase() { this.playSFX(AUDIO_KEYS.SFX_PHASE); }
  playMenuSelect() { this.playSFX(AUDIO_KEYS.SFX_MENU_SELECT); }
  playMenuConfirm() { this.playSFX(AUDIO_KEYS.SFX_MENU_CONFIRM); }
  playLevelComplete() { this.playSFX(AUDIO_KEYS.SFX_LEVEL_COMPLETE); }

  /**
   * Play player death sound (descending tone)
   */
  playPlayerDeath() {
    if (!this.audioContext) return;

    const volume = this.getEffectiveSFXVolume();
    if (volume === 0) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Descending death tone
    this.generateTone(ctx, now, {
      frequency: 400,
      endFrequency: 100,
      duration: 0.4,
      volume: volume * 0.35,
      type: 'sawtooth'
    });

    // Secondary lower tone
    this.generateTone(ctx, now + 0.1, {
      frequency: 200,
      endFrequency: 50,
      duration: 0.5,
      volume: volume * 0.25,
      type: 'square'
    });
  }

  /**
   * Resume audio context (required for some browsers)
   */
  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Clean up when done
   */
  destroy() {
    this.stopMusic();
    this.scene = null;
    this.initialized = false;
  }
}

// Export singleton instance
const audioManager = new AudioManager();
export default audioManager;
export { AudioManager };
