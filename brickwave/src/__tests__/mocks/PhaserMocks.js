import { vi } from 'vitest';

/**
 * Create a mock Phaser scene with event emitter
 * @returns {Object} Mock scene with events.emit spy
 */
export function createMockScene() {
  return {
    events: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    time: {
      delayedCall: vi.fn(),
    },
  };
}

/**
 * Mock localStorage for SaveManager tests
 */
export function createMockLocalStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    _store: store,
  };
}

/**
 * Mock Phaser.Math utilities used by managers
 */
export const MockPhaserMath = {
  Clamp: (value, min, max) => Math.min(Math.max(value, min), max),
};
