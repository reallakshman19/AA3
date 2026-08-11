import { topologyEditTableWindowStart } from './topology-edit-table-row-window.js';

export function initializeTopologyEditTableScrollState(runtime) {
  runtime.tableScrollTop = 0;
  runtime.tableScrollLeft = 0;
  runtime.tableWindowStart = 0;
}

export function handleTopologyEditTableScroll(runtime, event) {
  const scroll = event.target;
  if (!scroll?.matches?.('[data-table-scroll-region]') || !runtime.element?.contains(scroll)) return false;
  runtime.tableScrollTop = scroll.scrollTop;
  runtime.tableScrollLeft = scroll.scrollLeft;
  const nextStart = topologyEditTableWindowStart(scroll.scrollTop);
  if (nextStart === runtime.tableWindowStart) return true;
  runtime.tableWindowStart = nextStart;
  runtime.render();
  return true;
}

export function resetTopologyEditTableScroll(runtime) {
  runtime.tableScrollTop = 0;
  runtime.tableWindowStart = 0;
  const scroll = runtime.element?.querySelector('[data-table-scroll-region]');
  if (scroll) scroll.scrollTop = 0;
}
