// Resolution mode detection - separate file to avoid circular dependencies

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
