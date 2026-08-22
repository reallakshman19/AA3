export const LFEA_MODEL_REVIEW_PAGE_SIZE = 250;

/**
 * Return one deterministic display window without altering, filtering or
 * sampling engineering rows. Every source row remains reachable by paging.
 */
export function createLfeaReviewRowWindow(rows, requestedPageIndex = 0, pageSize = LFEA_MODEL_REVIEW_PAGE_SIZE) {
  if (!Array.isArray(rows)) throw new TypeError('LFEA review row window requires an array.');
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new TypeError('LFEA review row page size must be a positive integer.');
  }
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageIndex = Number.isInteger(requestedPageIndex)
    ? Math.min(Math.max(requestedPageIndex, 0), pageCount - 1)
    : 0;
  const startIndex = pageIndex * pageSize;
  const endIndex = Math.min(startIndex + pageSize, rows.length);
  return Object.freeze({
    rows: Object.freeze(rows.slice(startIndex, endIndex)),
    totalRows: rows.length,
    pageSize,
    pageIndex,
    pageCount,
    startRow: rows.length === 0 ? 0 : startIndex + 1,
    endRow: endIndex,
  });
}
