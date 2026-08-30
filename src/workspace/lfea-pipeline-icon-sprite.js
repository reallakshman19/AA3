/**
 * Deterministic presentation-only SVG symbol inventory for the LFEA
 * pipeline shell and its owned result controls.
 */
const VIEW_BOX = '0 0 16 16';

function symbol(id, geometry) {
  return Object.freeze({ id, viewBox: VIEW_BOX, geometry });
}

export const LFEA_PIPELINE_ICON_SYMBOLS = Object.freeze([
  symbol('icon-step-input', '<path d="M3 2.5h6l3 3V13.5H3z"/><path d="M9 2.5v3h3M8 8v4m0 0 2-2m-2 2-2-2"/>'),
  symbol('icon-step-error-check', '<path d="M8 1.7l5 1.8v3.6c0 3.6-2.1 5.9-5 6.8-2.9-.9-5-3.2-5-6.8V3.5z"/><path d="M5.5 7.8l1.7 1.7 3.3-3.5"/>'),
  symbol('icon-step-load-case', '<path d="M3 3.2h10M3 8h10M3 12.8h10"/><circle cx="5" cy="3.2" r="1"/><circle cx="10.5" cy="8" r="1"/><circle cx="7.5" cy="12.8" r="1"/>'),
  symbol('icon-step-run', '<circle cx="8" cy="8" r="6"/><path d="M6.7 5.4l4.1 2.6-4.1 2.6z"/>'),
  symbol('icon-step-output', '<path d="M2.5 13.5h11M4 11V8.5M8 11V5M12 11V2.5"/>'),
  symbol('icon-step-export', '<path d="M3 9.5v4h10v-4M8 2v8m0 0 3-3m-3 3-3-3"/>'),
  symbol('icon-load-sample', '<path d="M3 2.5h6l3 3V13.5H3z"/><path d="M9 2.5v3h3M5.3 9.4h5.4"/>'),
  symbol('icon-authority-supplement', '<path d="M3 2.5h6l3 3V13.5H3z"/><path d="M9 2.5v3h3M5.2 9.2l1.3 1.3 2.6-2.8"/>'),
  symbol('icon-code-checks', '<path d="M3 3h10v10H3z"/><path d="M5.2 6.2l1 1 1.7-1.9M9.2 6.3h2M5.2 10.1l1 1 1.7-1.9M9.2 10.2h2"/>'),
  symbol('icon-verification', '<path d="M8 1.5l5.5 2v4c0 4-2.3 6.6-5.5 7.5-3.2-.9-5.5-3.5-5.5-7.5v-4z"/><path d="M5.3 8l2 2 3.4-4"/>'),
  symbol('icon-status-complete', '<circle cx="8" cy="8" r="6"/><path d="M5 8.1l2 2 4-4.3"/>'),
  symbol('icon-sort-asc', '<path d="M4.5 10.5L8 7l3.5 3.5"/>'),
  symbol('icon-sort-desc', '<path d="M4.5 5.5L8 9l3.5-3.5"/>'),
]);

export function lfeaPipelineIconSpriteMarkup() {
  return LFEA_PIPELINE_ICON_SYMBOLS.map(({ id, viewBox, geometry }) => (
    `<symbol id="${id}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${geometry}</symbol>`
  )).join('');
}