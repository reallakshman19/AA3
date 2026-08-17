/**
 * Deterministic presentation-only SVG symbol inventory for the LFEA
 * pipeline shell's own header chrome. Modeled on (not shared with)
 * viewport-productivity/topology-edit-icon-sprite.js's shape: one flat,
 * frozen array of symbol(id, geometry) entries sharing a single viewBox,
 * joined into inline <symbol> markup by an SVG sprite host.
 */
const VIEW_BOX = '0 0 16 16';

function symbol(id, geometry) {
  return Object.freeze({ id, viewBox: VIEW_BOX, geometry });
}

export const LFEA_PIPELINE_ICON_SYMBOLS = Object.freeze([
  // Shield + checkmark: Verification/QA drawer toggle -- QA for the
  // software itself, not an analysis step, hence a distinct shield glyph
  // rather than one of the numbered step icons.
  symbol('icon-verification', '<path d="M8 1.5l5.5 2v4c0 4-2.3 6.6-5.5 7.5-3.2-.9-5.5-3.5-5.5-7.5v-4z"/><path d="M5.3 8l2 2 3.4-4"/>'),
]);

export function lfeaPipelineIconSpriteMarkup() {
  return LFEA_PIPELINE_ICON_SYMBOLS.map(({ id, viewBox, geometry }) => (
    `<symbol id="${id}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${geometry}</symbol>`
  )).join('');
}
