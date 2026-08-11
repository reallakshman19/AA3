export const TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX = 33;
export const TOPOLOGY_EDIT_TABLE_WINDOW_ROWS = 120;
export const TOPOLOGY_EDIT_TABLE_WINDOW_STEP = 40;

export function topologyEditTableWindowStart(scrollTop = 0) {
  const rowIndex = Math.floor(nonNegativeNumber(scrollTop) / TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX);
  const blockStart = Math.floor(rowIndex / TOPOLOGY_EDIT_TABLE_WINDOW_STEP)
    * TOPOLOGY_EDIT_TABLE_WINDOW_STEP;
  return Math.max(0, blockStart - TOPOLOGY_EDIT_TABLE_WINDOW_STEP);
}

export function topologyEditTableWindowStartForRow(rowIndex = 0) {
  const index = Math.floor(nonNegativeNumber(rowIndex));
  const blockStart = Math.floor(index / TOPOLOGY_EDIT_TABLE_WINDOW_STEP)
    * TOPOLOGY_EDIT_TABLE_WINDOW_STEP;
  return Math.max(0, blockStart - TOPOLOGY_EDIT_TABLE_WINDOW_STEP);
}

export function topologyEditTableRowWindow(totalRows = 0, requestedStart = 0) {
  const total = Math.floor(nonNegativeNumber(totalRows));
  if (total <= TOPOLOGY_EDIT_TABLE_WINDOW_ROWS) return windowReceipt(total, 0, total);
  const maxStart = total - TOPOLOGY_EDIT_TABLE_WINDOW_ROWS;
  const alignedStart = Math.floor(nonNegativeNumber(requestedStart) / TOPOLOGY_EDIT_TABLE_WINDOW_STEP)
    * TOPOLOGY_EDIT_TABLE_WINDOW_STEP;
  const start = Math.min(maxStart, alignedStart);
  const end = Math.min(total, start + TOPOLOGY_EDIT_TABLE_WINDOW_ROWS);
  return windowReceipt(total, start, end);
}

function windowReceipt(totalRows, start, end) {
  return Object.freeze({
    totalRows,
    start,
    end,
    renderedRows: end - start,
    topSpacerPx: start * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX,
    bottomSpacerPx: (totalRows - end) * TOPOLOGY_EDIT_TABLE_ROW_HEIGHT_PX,
  });
}

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
