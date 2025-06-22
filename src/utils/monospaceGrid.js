// src/utils/monospaceGrid.js
/* Development-time monospace-grid helpers.
   Inspired by https://github.com/owickstrom/the-monospace-web            */

export function initMonospaceGrid(debug = false) {
  if (!debug) return;          // do nothing in prod / when DEBUG_MODE = false

  // 1  —  grid overlay (already in your CSS, we just turn it on)
  document.body.classList.add('debug');

  // 2  —  helpers
  const cell = () => {
    const probe = document.createElement('div');
    probe.style.cssText = `
      position: fixed; top: -9999px; left: -9999px;
      width: 1ch; height: var(--line-height);
    `;
    document.body.appendChild(probe);
    const { width, height } = probe.getBoundingClientRect();
    probe.remove();
    return { width, height };
  };

  // 3  —  fit IMG / VIDEO heights so the bottom edge lands on the grid
  const adjustMedia = () => {
    const { height: h } = cell();
    document.querySelectorAll('img, video').forEach((el) => {
      const w = el.naturalWidth  || el.videoWidth  || el.clientWidth;
      const k = el.naturalHeight || el.videoHeight || el.clientHeight || 1;
      const ratio = w / k;
      const realH = el.clientWidth / ratio;
      const diff  = h - (realH % h);
      el.style.paddingBottom = `${diff}px`;
    });
  };

  // 4  —  flag elements that start halfway between grid lines
  const flagOffGrid = () => {
    const { height: h, width: w } = cell();
    const skip = new Set(['THEAD','TBODY','TFOOT','TR','TD','TH']);
    document.querySelectorAll('body :not(.debug-grid)').forEach((el) => {
      if (skip.has(el.tagName)) return;
      const { top, left } = el.getBoundingClientRect();
      const dy = (top + window.scrollY)  % h;
      const dx = (left + window.scrollX) % w;
      el.classList.toggle('off-grid', dy !== 0 || dx !== 0);
    });
  };

  // 5  —  run on load / resize
  adjustMedia();
  flagOffGrid();
  window.addEventListener('load',   () => { adjustMedia(); flagOffGrid(); });
  window.addEventListener('resize', () => { adjustMedia(); flagOffGrid(); });
} 