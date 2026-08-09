/** Deterministic presentation-only SVG symbol inventory for the 3D Edit icon manifest. */
const VIEW_BOX = '0 0 16 16';

function symbol(id, geometry) {
  return Object.freeze({ id, viewBox: VIEW_BOX, geometry });
}

export const TOPOLOGY_EDIT_ICON_SYMBOLS = Object.freeze([
  symbol('icon-select', '<path d="M3 2l8 6-4 1.2L9 14l-2 1-2-5-2 2z" fill="currentColor" stroke="none"/>'),
  symbol('icon-orbit', '<circle cx="8" cy="8" r="3"/><path d="M2 8c0-3 2.7-5.5 6-5.5 2 0 3.8.8 5 2.2M14 8c0 3-2.7 5.5-6 5.5-2 0-3.8-.8-5-2.2"/><path d="M11.5 2.5h2v2M4.5 13.5h-2v-2"/>'),
  symbol('icon-pan', '<path d="M5 7V4.5a1 1 0 012 0V7M7 7V3.5a1 1 0 012 0V7M9 7V4a1 1 0 012 0v4M5 7l-1-1a1 1 0 00-1.5 1.3l2.8 5.1A3 3 0 008 14h2a3 3 0 003-3V7a1 1 0 00-2 0"/>'),
  symbol('icon-fit', '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/><rect x="5" y="5" width="6" height="6" rx="1"/>'),
  symbol('icon-fit-selection', '<path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/><circle cx="8" cy="8" r="2.5"/>'),
  symbol('icon-home', '<path d="M2 7.5L8 2l6 5.5V14H9.5v-4h-3v4H2z"/>'),
  symbol('icon-previous', '<path d="M7 3L2 8l5 5M3 8h5a5 5 0 015 5"/>'),
  symbol('icon-pivot-selection', '<circle cx="8" cy="8" r="2"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/><path d="M4 4a5.7 5.7 0 018 0M12 12a5.7 5.7 0 01-8 0"/>'),
  symbol('icon-projection', '<path d="M2 4l5-2 7 3-5 2zM2 4v7l7 3V7M14 5v7l-5 2"/><path d="M7 2v5"/>'),
  symbol('icon-view-iso', '<path d="M8 1.8L14 5v6L8 14.2 2 11V5z"/><path d="M2 5l6 3.2L14 5M8 8.2v6"/>'),
  symbol('icon-view-top', '<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 6h6M5 9h6"/>'),
  symbol('icon-view-front', '<rect x="3" y="2" width="10" height="12" rx="1"/><path d="M6 5h4M6 8h4M6 11h4"/>'),
  symbol('icon-view-right', '<path d="M4 2h8l2 3v7l-2 2H4z"/><path d="M8 5v6M5 8h6"/>'),
  symbol('icon-undo', '<path d="M6 4L2 8l4 4M3 8h5a5 5 0 015 5"/>'),
  symbol('icon-redo', '<path d="M10 4l4 4-4 4M13 8H8a5 5 0 00-5 5"/>'),
  symbol('icon-save', '<path d="M2 2h10l2 2v10H2z"/><path d="M5 2v4h6V2M5 14v-5h6v5"/>'),
  symbol('icon-commit', '<path d="M2 3h7v4h4v7H2z"/><path d="M5 10l2 2 5-6"/>'),
  symbol('icon-clear-selection', '<rect x="2" y="2" width="9" height="9" rx="1" stroke-dasharray="2 2"/><path d="M9 9l5 5M14 9l-5 5"/>'),
  symbol('icon-table', '<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 7h12M6 3v10M10 3v10"/>'),
  symbol('icon-inspector', '<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M9 2v12M4 5h3M4 8h3M4 11h2"/>'),
  symbol('icon-shortcuts', '<rect x="2" y="4" width="12" height="8" rx="2"/><path d="M4 7h1M7 7h1M10 7h2M4 10h5M11 10h1"/>'),
  symbol('icon-exit', '<path d="M7 3H3v10h4M9 5l4 3-4 3M13 8H6"/>'),
  symbol('icon-move', '<path d="M8 1v14M1 8h14M8 1L6 3M8 1l2 2M15 8l-2-2M15 8l-2 2M8 15l-2-2M8 15l2-2M1 8l2-2M1 8l2 2"/>'),
  symbol('icon-gap', '<path d="M2 3v10M14 3v10M5 8h6M5 8l2-2M5 8l2 2M11 8l-2-2M11 8l-2 2"/>'),
  symbol('icon-merge', '<circle cx="4" cy="5" r="2"/><circle cx="4" cy="11" r="2"/><circle cx="12" cy="8" r="2"/><path d="M6 5c2 0 3 1 4.5 2M6 11c2 0 3-1 4.5-2"/>'),
  symbol('icon-bridge', '<circle cx="3" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/><path d="M4.5 8h7M6 8c0-3 4-3 4 0"/>'),
  symbol('icon-add-straight', '<path d="M2 11L11 2M11 2v5M11 2H6"/><circle cx="3" cy="12" r="1"/><circle cx="12" cy="1" r="1"/>'),
  symbol('icon-split', '<path d="M2 8h12"/><circle cx="8" cy="8" r="2"/><path d="M8 2v3M8 11v3"/>'),
  symbol('icon-disconnect-from', '<circle cx="3" cy="8" r="1.5"/><path d="M5 8h4M11 8h3M8 5l3 3-3 3"/>'),
  symbol('icon-disconnect-to', '<circle cx="13" cy="8" r="1.5"/><path d="M2 8h3M7 8h4M8 5L5 8l3 3"/>'),
  symbol('icon-delete', '<path d="M3 4h10M6 4V2h4v2M5 6v6M8 6v6M11 6v6M4 4l1 10h6l1-10"/>'),
  symbol('icon-reload', '<path d="M13 6V2l-2 2A5 5 0 103 12M3 10v4l2-2"/>'),
  symbol('icon-export', '<path d="M3 6v8h10V6M8 1v9M5 4l3-3 3 3"/>'),
  symbol('icon-accept', '<circle cx="8" cy="8" r="6"/><path d="M4.5 8l2.2 2.2L11.8 5"/>'),
  symbol('icon-cancel', '<circle cx="8" cy="8" r="6"/><path d="M5 5l6 6M11 5l-6 6"/>'),
  symbol('icon-hide', '<path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z"/><path d="M2 2l12 12"/>'),
  symbol('icon-isolate', '<circle cx="8" cy="8" r="3"/><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/>'),
  symbol('icon-show-all', '<path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z"/><circle cx="8" cy="8" r="2"/>'),
  symbol('icon-reset', '<path d="M13 6V2l-2 2A5 5 0 102.7 9"/><path d="M4 4H1v3"/>'),
  symbol('icon-section-apply', '<rect x="2" y="2" width="9" height="9" rx="1" stroke-dasharray="2 2"/><path d="M8 12l2 2 4-5"/>'),
  symbol('icon-section-clear', '<rect x="2" y="2" width="9" height="9" rx="1" stroke-dasharray="2 2"/><path d="M9 9l5 5M14 9l-5 5"/>'),
]);

export function topologyEditIconSpriteMarkup() {
  return TOPOLOGY_EDIT_ICON_SYMBOLS.map(({ id, viewBox, geometry }) => (
    `<symbol id="${id}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${geometry}</symbol>`
  )).join('');
}
