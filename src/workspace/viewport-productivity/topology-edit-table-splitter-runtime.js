const DEFAULT_DETAIL_HEIGHT_PX = 210;
const MIN_DETAIL_HEIGHT_PX = 96;
const MIN_UPPER_HEIGHT_PX = 120;
const SPLITTER_HEIGHT_PX = 8;
const KEYBOARD_STEP_PX = 24;

export function initializeTopologyEditTableSplitterState(runtime) {
  runtime.tableDetailPaneHeightPx = finite(runtime.tableDetailPaneHeightPx)
    ? runtime.tableDetailPaneHeightPx
    : DEFAULT_DETAIL_HEIGHT_PX;
  runtime.tableSplitterDrag = null;
  runtime.tableSplitterResizeObserver?.disconnect?.();
  runtime.tableSplitterResizeObserver = null;
}

export function topologyEditTableSplitterBounds(metrics = {}) {
  const container = nonNegative(metrics.containerHeightPx);
  const header = nonNegative(metrics.headerHeightPx);
  const available = Math.max(0, container - header - SPLITTER_HEIGHT_PX);
  const max = Math.max(MIN_DETAIL_HEIGHT_PX, available - MIN_UPPER_HEIGHT_PX);
  return Object.freeze({ min: MIN_DETAIL_HEIGHT_PX, max });
}

export function clampTopologyEditTableDetailHeight(value, bounds) {
  const minimum = Number(bounds?.min) || MIN_DETAIL_HEIGHT_PX;
  const maximum = Math.max(minimum, Number(bounds?.max) || minimum);
  const candidate = finite(value) ? Number(value) : DEFAULT_DETAIL_HEIGHT_PX;
  return Math.min(maximum, Math.max(minimum, candidate));
}

export function topologyEditTableDetailHeightForPointerDrag({
  startHeightPx,
  startClientY,
  clientY,
  bounds,
} = {}) {
  const deltaY = Number(clientY) - Number(startClientY);
  const next = Number(startHeightPx) - (Number.isFinite(deltaY) ? deltaY : 0);
  return clampTopologyEditTableDetailHeight(next, bounds);
}

export function topologyEditTableDetailHeightForKey(currentHeightPx, key, bounds) {
  const current = clampTopologyEditTableDetailHeight(currentHeightPx, bounds);
  if (key === 'ArrowUp') return clampTopologyEditTableDetailHeight(current + KEYBOARD_STEP_PX, bounds);
  if (key === 'ArrowDown') return clampTopologyEditTableDetailHeight(current - KEYBOARD_STEP_PX, bounds);
  if (key === 'Home') return bounds.min;
  if (key === 'End') return bounds.max;
  return null;
}

export function applyTopologyEditTableSplitterLayout(runtime) {
  const root = runtime.element?.querySelector?.('.topology-edit-table--populated');
  const separator = root?.querySelector?.('[data-table-splitter]');
  if (!root || !separator) return null;
  const bounds = boundsFor(root);
  const height = clampTopologyEditTableDetailHeight(runtime.tableDetailPaneHeightPx, bounds);
  runtime.tableDetailPaneHeightPx = height;
  root.style.setProperty('--topology-edit-table-detail-height', `${height}px`);
  separator.setAttribute('aria-valuemin', String(Math.round(bounds.min)));
  separator.setAttribute('aria-valuemax', String(Math.round(bounds.max)));
  separator.setAttribute('aria-valuenow', String(Math.round(height)));
  separator.setAttribute('aria-valuetext', `${Math.round(height)} pixels for engineering details`);
  observeContainer(runtime, root);
  return Object.freeze({ height, bounds });
}

export function handleTopologyEditTableSplitterPointerDown(runtime, event) {
  const separator = event.target?.closest?.('[data-table-splitter]');
  if (!separator || !runtime.element?.contains(separator) || event.button !== 0) return false;
  const root = separator.closest('.topology-edit-table--populated');
  if (!root) return false;
  const bounds = boundsFor(root);
  const startHeight = clampTopologyEditTableDetailHeight(runtime.tableDetailPaneHeightPx, bounds);
  runtime.tableSplitterDrag = {
    pointerId: event.pointerId,
    startClientY: event.clientY,
    startHeightPx: startHeight,
  };
  separator.setPointerCapture?.(event.pointerId);
  root.dataset.tableSplitterResizing = 'true';
  event.preventDefault();
  return true;
}

export function handleTopologyEditTableSplitterPointerMove(runtime, event) {
  const drag = runtime.tableSplitterDrag;
  if (!drag || event.pointerId !== drag.pointerId) return false;
  const root = runtime.element?.querySelector?.('.topology-edit-table--populated');
  if (!root) return false;
  runtime.tableDetailPaneHeightPx = topologyEditTableDetailHeightForPointerDrag({
    startHeightPx: drag.startHeightPx,
    startClientY: drag.startClientY,
    clientY: event.clientY,
    bounds: boundsFor(root),
  });
  applyTopologyEditTableSplitterLayout(runtime);
  event.preventDefault();
  return true;
}

export function handleTopologyEditTableSplitterPointerUp(runtime, event) {
  const drag = runtime.tableSplitterDrag;
  if (!drag || event.pointerId !== drag.pointerId) return false;
  const separator = runtime.element?.querySelector?.('[data-table-splitter]');
  separator?.releasePointerCapture?.(event.pointerId);
  runtime.tableSplitterDrag = null;
  const root = runtime.element?.querySelector?.('.topology-edit-table--populated');
  if (root) delete root.dataset.tableSplitterResizing;
  return true;
}

export function handleTopologyEditTableSplitterKeyDown(runtime, event) {
  const separator = event.target?.closest?.('[data-table-splitter]');
  if (!separator || !runtime.element?.contains(separator)) return false;
  const root = separator.closest('.topology-edit-table--populated');
  if (!root) return false;
  const bounds = boundsFor(root);
  const next = topologyEditTableDetailHeightForKey(runtime.tableDetailPaneHeightPx, event.key, bounds);
  if (next === null) return false;
  runtime.tableDetailPaneHeightPx = next;
  applyTopologyEditTableSplitterLayout(runtime);
  event.preventDefault();
  return true;
}

export function destroyTopologyEditTableSplitterState(runtime) {
  runtime.tableSplitterResizeObserver?.disconnect?.();
  runtime.tableSplitterResizeObserver = null;
  runtime.tableSplitterDrag = null;
}

function boundsFor(root) {
  const containerHeightPx = root.getBoundingClientRect?.().height || root.clientHeight || 0;
  const header = root.querySelector?.('.topology-edit-table__header');
  const headerHeightPx = header?.getBoundingClientRect?.().height || header?.offsetHeight || 0;
  return topologyEditTableSplitterBounds({ containerHeightPx, headerHeightPx });
}

function observeContainer(runtime, root) {
  if (runtime.tableSplitterObservedRoot === root && runtime.tableSplitterResizeObserver) return;
  runtime.tableSplitterResizeObserver?.disconnect?.();
  runtime.tableSplitterObservedRoot = root;
  const ResizeObserverClass = root.ownerDocument?.defaultView?.ResizeObserver;
  if (!ResizeObserverClass) return;
  runtime.tableSplitterResizeObserver = new ResizeObserverClass(() => {
    if (runtime.element?.contains(root)) applyTopologyEditTableSplitterLayout(runtime);
  });
  runtime.tableSplitterResizeObserver.observe(root);
}

function finite(value) { return Number.isFinite(Number(value)); }
function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
