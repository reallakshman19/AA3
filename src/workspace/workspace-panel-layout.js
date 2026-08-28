/** Pure DOM/state helpers for workspace panel sizing, viewport layout, and persisted prefs. */
const STORAGE_KEY = 'workspace-layout-prefs/v2';
const PANEL_MINIMUM_PX = 200;
const FOCUS_PANEL_WIDTH_PX = 48;

function clampPanelWidth(value, minimum, maximum) { return Math.max(minimum, Math.min(value, maximum)); }

export function beginPanelResize(shellElement, action, event, topologyEdit3DActive) {
  const tree = shellElement.querySelector('.tree-panel');
  const properties = shellElement.querySelector('.properties-panel');
  return {
    action,
    topologyEdit3DActive,
    startX: event.clientX,
    leftWidth: tree.getBoundingClientRect().width,
    rightWidth: properties.getBoundingClientRect().width,
    maximumWidth: shellElement.getBoundingClientRect().width / 2,
  };
}

export function resizedPanelWidths(dragContext, event) {
  const delta = event.clientX - dragContext.startX;
  const updates = {};
  if (dragContext.action === 'resize-left') {
    const key = dragContext.topologyEdit3DActive
      ? 'topologyEditLeftPanelWidth'
      : 'leftPanelWidth';
    updates[key] = clampPanelWidth(
      dragContext.leftWidth + delta,
      PANEL_MINIMUM_PX,
      dragContext.maximumWidth,
    );
  }
  if (dragContext.action === 'resize-right') updates.rightPanelWidth = clampPanelWidth(dragContext.rightWidth - delta, PANEL_MINIMUM_PX, dragContext.maximumWidth);
  return updates;
}

export function applyWorkspacePanelLayout(shellElement, state) {
  if (!shellElement) return;
  const focus = state.topologyEdit3DActive;
  const treeCollapsed = state.treeCollapsed;
  const propertiesCollapsed = focus || state.propertiesCollapsed;
  const expandedLeft = focus
    ? state.topologyEditLeftPanelWidth
    : state.leftPanelWidth;
  const left = treeCollapsed ? FOCUS_PANEL_WIDTH_PX : expandedLeft;
  const right = propertiesCollapsed ? FOCUS_PANEL_WIDTH_PX : state.rightPanelWidth;
  const propertiesPanel = shellElement.querySelector('.properties-panel');
  const rightResizer = shellElement.querySelector('.panel-resizer--right');
  propertiesPanel.hidden = focus;
  propertiesPanel.toggleAttribute('inert', focus);
  rightResizer.hidden = focus;
  shellElement.style.gridTemplateColumns = focus
    ? `${left}px 4px minmax(360px,1fr)`
    : `${left}px 4px minmax(360px,1fr) 4px ${right}px`;
  shellElement.dataset.topologyEditFocusLayout = String(focus);
  shellElement.dataset.topologyEditLeftPanelVisible = String(!treeCollapsed);
  shellElement.dataset.topologyEditLeftPanelWidthPx = String(left);
  shellElement.querySelector('.tree-panel').classList.toggle('workspace-panel--collapsed', treeCollapsed);
  shellElement.querySelector('.properties-panel').classList.toggle('workspace-panel--collapsed', propertiesCollapsed);
}

/** Single source of truth for viewport-stack visibility and pointer ownership. */
export function applyWorkspaceViewportLayout(shellElement, topologyEdit3DActive) {
  if (!shellElement) return;
  const loadCalc = shellElement.dataset.workbenchView === 'load-calc';
  const host = shellElement.querySelector('[data-role="topology-edit-render-host"]');
  const dock = shellElement.querySelector('[data-role="load-calc-consumer-root"]');
  const stage = shellElement.querySelector('[data-role="viewport-stage"]');
  const viewportPanel = shellElement.querySelector('[data-panel="viewport"]');

  if (host) {
    host.hidden = !topologyEdit3DActive;
    host.toggleAttribute('inert', !topologyEdit3DActive);
  }
  if (dock) {
    const showLoadCalcDock = loadCalc && !topologyEdit3DActive;
    dock.hidden = !showLoadCalcDock;
    dock.toggleAttribute('inert', !showLoadCalcDock);
    dock.classList.toggle('load-calc-dock--compact', topologyEdit3DActive);
  }
  if (stage) {
    // Load Calc owns the central viewport while active. Model / 3D activates
    // the dedicated topology-edit host, so retaining the shared read-only
    // workspace stage creates overlapping scroll/pointer authority.
    const hideSharedStage = loadCalc || topologyEdit3DActive;
    stage.hidden = hideSharedStage;
    stage.toggleAttribute('inert', hideSharedStage);
    stage.style.display = hideSharedStage ? 'none' : 'flex';
    stage.style.flex = hideSharedStage ? '0 0 0' : '1 1 100%';
  }

  // In ordinary Load Calc panes the read-only viewport toolbar/footer are not
  // part of the active interaction surface. Keeping them in the flex stack
  // previously allowed them (and the underlying workspace layer) to win hit
  // testing after nested pane scrolling. Model / 3D deliberately restores
  // the viewport chrome because that route owns the dedicated 3D host.
  viewportPanel?.classList.toggle(
    'viewport-panel--load-calc-owned',
    loadCalc && !topologyEdit3DActive,
  );
  viewportPanel?.classList.toggle(
    'viewport-panel--topology-edit-owned',
    topologyEdit3DActive,
  );

  globalThis.requestAnimationFrame?.(() => globalThis.dispatchEvent?.(new Event('resize')));
}

export function loadPanelPrefs() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
    if (!saved) return null;
    const prefs = {};
    if (Number.isFinite(saved.leftPanelWidth)) prefs.leftPanelWidth = saved.leftPanelWidth;
    if (Number.isFinite(saved.topologyEditLeftPanelWidth)) {
      prefs.topologyEditLeftPanelWidth = saved.topologyEditLeftPanelWidth;
    }
    if (Number.isFinite(saved.rightPanelWidth)) prefs.rightPanelWidth = saved.rightPanelWidth;
    if (['webgl', 'svg', 'split'].includes(saved.activeViewportTab)) prefs.activeViewportTab = saved.activeViewportTab;
    return prefs;
  } catch {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return null;
  }
}

export function savePanelPrefs(state) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({
    leftPanelWidth: state.leftPanelWidth,
    topologyEditLeftPanelWidth: state.topologyEditLeftPanelWidth,
    rightPanelWidth: state.rightPanelWidth,
    activeViewportTab: state.activeViewportTab,
  }));
}
