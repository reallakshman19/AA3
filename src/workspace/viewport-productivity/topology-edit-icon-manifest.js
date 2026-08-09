/**
 * Presentation-only production icon contract for the fixed 3D Edit shell.
 *
 * Control identity remains owned by existing data-action/data-navigation/data-command
 * attributes. This manifest decorates those controls and never participates in
 * topology, selection, command planning, certification, journal, or renderer authority.
 */
export const TOPOLOGY_EDIT_ICON_DISPOSITION = Object.freeze({
  SVG_ICON: 'SVG_ICON',
  INTENTIONAL_TEXT_ONLY: 'INTENTIONAL_TEXT_ONLY',
});

export const TOPOLOGY_EDIT_ICON_SURFACE = Object.freeze({
  PRIMARY_NAVIGATION: 'PRIMARY_NAVIGATION',
  VIEWS: 'VIEWS',
  HISTORY: 'HISTORY',
  PRIMARY_DRAFT: 'PRIMARY_DRAFT',
  SELECTION_WORKSPACE: 'SELECTION_WORKSPACE',
  ENGINEERING_COMMAND: 'ENGINEERING_COMMAND',
  DRAFT_AUDIT: 'DRAFT_AUDIT',
  PREVIEW: 'PREVIEW',
  DISPLAY: 'DISPLAY',
});

const HISTORICAL_FRAGMENT_BY_KEY = Object.freeze({
  'navigation.orbit': 'icon-orbit',
  'navigation.pan': 'icon-pan',
  'history.undo': 'icon-undo',
  'history.redo': 'icon-redo',
  'draft.save': 'icon-save',
  'command.move-positive-z': 'icon-move',
});

const SVG_ICON = TOPOLOGY_EDIT_ICON_DISPOSITION.SVG_ICON;
const S = TOPOLOGY_EDIT_ICON_SURFACE;

function icon(key, selector, label, surface, symbolId, stateExpectations = ['DEFAULT']) {
  return Object.freeze({
    key,
    selector,
    label,
    surface,
    disposition: SVG_ICON,
    symbolId,
    historicalFragmentId: HISTORICAL_FRAGMENT_BY_KEY[key] ?? null,
    accessibility: Object.freeze({
      accessibleName: label,
      iconAriaHidden: true,
      preserveExistingTitle: true,
    }),
    stateExpectations: Object.freeze([...stateExpectations]),
  });
}

export const TOPOLOGY_EDIT_ICON_MANIFEST = Object.freeze([
  icon('navigation.select', '[data-navigation-mode="select"]', 'Select', S.PRIMARY_NAVIGATION, 'icon-select', ['PRESSED', 'UNPRESSED']),
  icon('navigation.orbit', '[data-navigation-mode="orbit"]', 'Orbit', S.PRIMARY_NAVIGATION, 'icon-orbit', ['PRESSED', 'UNPRESSED']),
  icon('navigation.pan', '[data-navigation-mode="pan"]', 'Pan', S.PRIMARY_NAVIGATION, 'icon-pan', ['PRESSED', 'UNPRESSED']),
  icon('navigation.fit', '[data-navigation-action="fit"]', 'Fit', S.PRIMARY_NAVIGATION, 'icon-fit'),

  icon('views.fit-selection', '[data-navigation-action="fit-selection"]', 'Fit selection', S.VIEWS, 'icon-fit-selection', ['DISABLED', 'ENABLED']),
  icon('views.home', '[data-navigation-action="home"]', 'Home', S.VIEWS, 'icon-home'),
  icon('views.previous', '[data-navigation-action="previous"]', 'Previous', S.VIEWS, 'icon-previous'),
  icon('views.pivot-selection', '[data-navigation-action="pivot-selection"]', 'Pivot selection', S.VIEWS, 'icon-pivot-selection'),
  icon('views.projection', '[data-navigation-action="projection"]', 'Projection', S.VIEWS, 'icon-projection'),
  icon('views.iso', '[data-standard-view="iso"]', 'Iso', S.VIEWS, 'icon-view-iso'),
  icon('views.top', '[data-standard-view="top"]', 'Top', S.VIEWS, 'icon-view-top'),
  icon('views.front', '[data-standard-view="front"]', 'Front', S.VIEWS, 'icon-view-front'),
  icon('views.right', '[data-standard-view="right"]', 'Right', S.VIEWS, 'icon-view-right'),

  icon('history.undo', '[data-action="undo"]', 'Undo', S.HISTORY, 'icon-undo', ['DISABLED', 'ENABLED']),
  icon('history.redo', '[data-action="redo"]', 'Redo', S.HISTORY, 'icon-redo', ['DISABLED', 'ENABLED']),

  icon('draft.save', '[data-action="save-draft"]', 'Save draft', S.PRIMARY_DRAFT, 'icon-save', ['DISABLED', 'ENABLED']),
  icon('draft.commit', '[data-action="commit-draft"]', 'Commit draft', S.PRIMARY_DRAFT, 'icon-commit', ['DISABLED', 'ENABLED']),

  icon('workspace.clear-selection', '[data-action="clear-selection"]', 'Clear', S.SELECTION_WORKSPACE, 'icon-clear-selection', ['DISABLED', 'ENABLED']),
  icon('workspace.engineering-table', '[data-action="open-engineering-table"]', 'Engineering table', S.SELECTION_WORKSPACE, 'icon-table', ['COLLAPSED', 'EXPANDED']),
  icon('workspace.inspector', '[data-action="toggle-inspector"]', 'Inspector', S.SELECTION_WORKSPACE, 'icon-inspector', ['PRESSED', 'UNPRESSED']),
  icon('workspace.shortcuts', '.topology-edit-clean-shell__utilities [data-action="toggle-shortcuts"]', 'Shortcuts', S.SELECTION_WORKSPACE, 'icon-shortcuts', ['COLLAPSED', 'EXPANDED']),
  icon('workspace.exit', '[data-action="exit-topology-edit"]', 'Exit 3D Edit', S.SELECTION_WORKSPACE, 'icon-exit'),

  icon('command.move-positive-z', '[data-command-action="move-positive-z"]', 'Move +Z 100 mm', S.ENGINEERING_COMMAND, 'icon-move', ['DISABLED', 'ENABLED']),
  icon('command.set-gap-3', '[data-command-action="set-gap-3"]', 'Set gap 3 mm', S.ENGINEERING_COMMAND, 'icon-gap', ['DISABLED', 'ENABLED']),
  icon('command.set-gap-20', '[data-command-action="set-gap-20"]', 'Set gap 20 mm', S.ENGINEERING_COMMAND, 'icon-gap', ['DISABLED', 'ENABLED']),
  icon('command.merge-nodes', '[data-command-action="merge-nodes"]', 'Merge nodes', S.ENGINEERING_COMMAND, 'icon-merge', ['DISABLED', 'ENABLED']),
  icon('command.bridge-gap', '[data-command-action="bridge-gap"]', 'Bridge gap', S.ENGINEERING_COMMAND, 'icon-bridge', ['DISABLED', 'ENABLED']),
  icon('command.add-straight', '[data-command-action="add-straight"]', 'Add straight', S.ENGINEERING_COMMAND, 'icon-add-straight', ['DISABLED', 'ENABLED']),
  icon('command.split-edge-half', '[data-command-action="split-edge-half"]', 'Split edge 50%', S.ENGINEERING_COMMAND, 'icon-split', ['DISABLED', 'ENABLED']),
  icon('command.disconnect-from', '[data-command-action="disconnect-from"]', 'Disconnect FROM', S.ENGINEERING_COMMAND, 'icon-disconnect-from', ['DISABLED', 'ENABLED']),
  icon('command.disconnect-to', '[data-command-action="disconnect-to"]', 'Disconnect TO', S.ENGINEERING_COMMAND, 'icon-disconnect-to', ['DISABLED', 'ENABLED']),
  icon('command.delete-edge', '[data-command-action="delete-edge"]', 'Delete edge', S.ENGINEERING_COMMAND, 'icon-delete', ['DISABLED', 'ENABLED']),

  icon('draft.reload', '[data-action="reload-draft"]', 'Reload draft', S.DRAFT_AUDIT, 'icon-reload', ['DISABLED', 'ENABLED']),
  icon('draft.export', '[data-action="export-draft"]', 'Export audit', S.DRAFT_AUDIT, 'icon-export', ['DISABLED', 'ENABLED']),

  icon('preview.accept', '[data-action="accept-autofix"]', 'Accept preview', S.PREVIEW, 'icon-accept', ['DISABLED', 'ENABLED']),
  icon('preview.cancel', '[data-action="cancel-autofix"]', 'Cancel preview', S.PREVIEW, 'icon-cancel', ['DISABLED', 'ENABLED']),

  icon('display.hide-selected', '[data-action="hide-selected"]', 'Hide selected', S.DISPLAY, 'icon-hide', ['DISABLED', 'ENABLED']),
  icon('display.isolate-selected', '[data-action="isolate-selected"]', 'Isolate selected', S.DISPLAY, 'icon-isolate', ['DISABLED', 'ENABLED']),
  icon('display.show-all', '[data-action="show-all"]', 'Show all', S.DISPLAY, 'icon-show-all'),
  icon('display.reset', '[data-action="reset-presentation"]', 'Reset', S.DISPLAY, 'icon-reset'),
  icon('display.apply-section', '[data-action="apply-section-box"]', 'Apply section', S.DISPLAY, 'icon-section-apply'),
  icon('display.clear-section', '[data-action="clear-section-box"]', 'Clear section', S.DISPLAY, 'icon-section-clear'),
]);

export function topologyEditIconManifest() {
  return TOPOLOGY_EDIT_ICON_MANIFEST;
}

export function topologyEditRequiredIconEntries() {
  return TOPOLOGY_EDIT_ICON_MANIFEST.filter((entry) => entry.disposition === SVG_ICON);
}
