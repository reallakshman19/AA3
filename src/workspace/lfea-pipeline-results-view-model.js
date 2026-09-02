export const LFEA_RESULTS_TRANSLATION_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
export const LFEA_RESULTS_ROTATION_DOFS = Object.freeze(['RX', 'RY', 'RZ']);
export const LFEA_RESULTS_ALL_DOFS = Object.freeze([
  ...LFEA_RESULTS_TRANSLATION_DOFS,
  ...LFEA_RESULTS_ROTATION_DOFS,
]);

/**
 * What the Output step shows, as data rather than as DOM.
 *
 * The tables alone answered "what is the value at node N" but not the
 * question an engineer opens a results report with -- where is the worst of
 * it. A hundred-node model prints six hundred numbers in node order, and the
 * governing displacement or the highest support load is somewhere in the
 * middle of them. Every quantity below is picked from the rows already
 * displayed, in the units already displayed: this ranks and locates what the
 * solver produced, and derives no engineering quantity of its own.
 */

/** One row per node, in display units, with the solver's raw magnitudes kept. */
export function nodeResultRows(rows, scaleFor) {
  const byNode = new Map();
  for (const row of rows ?? []) {
    const node = String(row.nodeId).replace(/^.*\.N/u, '');
    if (!byNode.has(node)) byNode.set(node, {});
    const values = byNode.get(node);
    const scaled = row.value * scaleFor(row.dof);
    values[row.dof] = (values[row.dof] ?? 0) + scaled;
  }
  return [...byNode.entries()]
    .sort((left, right) => compareNodeIds(left[0], right[0]))
    .map(([nodeId, values]) => Object.freeze({
      nodeId,
      values: Object.freeze(Object.fromEntries(
        LFEA_RESULTS_ALL_DOFS.map((dof) => [dof, values[dof] ?? 0]),
      )),
      // Resultants are the magnitude of the vector the three components
      // already describe -- the same quantity, read as one number so rows can
      // be ranked against each other at all.
      translationResultant: resultant(values, LFEA_RESULTS_TRANSLATION_DOFS),
      rotationResultant: resultant(values, LFEA_RESULTS_ROTATION_DOFS),
    }));
}

/**
 * The governing values for one case: the largest translation and rotation in
 * the displacement table, and the largest force and moment in the reaction
 * table, each with the node it occurs at. Null where a table is empty --
 * a case with no reactions reports no maximum rather than a zero that reads
 * like a real result.
 */
export function summarizeCaseResults(displacementRows, reactionRows) {
  return Object.freeze({
    nodeCount: displacementRows.length,
    restrainedNodeCount: reactionRows.length,
    maxTranslation: extremeOf(displacementRows, (row) => row.translationResultant),
    maxRotation: extremeOf(displacementRows, (row) => row.rotationResultant),
    maxForce: extremeOf(reactionRows, (row) => row.translationResultant),
    maxMoment: extremeOf(reactionRows, (row) => row.rotationResultant),
  });
}

/**
 * Sort by a column without losing the tie-breaking that makes a table stable:
 * equal values keep node order, so re-sorting never reshuffles rows that the
 * sort does not distinguish.
 */
export function sortResultRows(rows, columnKey, direction) {
  const sign = direction === 'ASC' ? 1 : -1;
  const value = (row) => (columnKey === 'nodeId' ? null : rowValue(row, columnKey));
  return Object.freeze([...rows].sort((left, right) => {
    if (columnKey === 'nodeId') return sign * compareNodeIds(left.nodeId, right.nodeId);
    const a = value(left);
    const b = value(right);
    if (a !== b) return sign * (a < b ? -1 : 1);
    return compareNodeIds(left.nodeId, right.nodeId);
  }));
}

/** Rows whose id contains the typed text; empty filter keeps every row. */
export function filterResultRows(rows, query) {
  const text = String(query ?? '').trim();
  if (text === '') return rows;
  return Object.freeze(rows.filter((row) => row.nodeId.includes(text)));
}

/**
 * The node ids carrying each governing value, so the table can mark exactly
 * the rows the summary is pointing at instead of leaving the reader to find
 * them by eye.
 */
export function extremeNodeIds(summary) {
  return Object.freeze(new Set([summary.maxTranslation?.nodeId, summary.maxRotation?.nodeId,
    summary.maxForce?.nodeId, summary.maxMoment?.nodeId].filter((id) => id != null)));
}

function rowValue(row, columnKey) {
  if (columnKey === 'translationResultant') return Math.abs(row.translationResultant);
  if (columnKey === 'rotationResultant') return Math.abs(row.rotationResultant);
  return Math.abs(row.values[columnKey] ?? 0);
}

function resultant(values, dofs) {
  return Math.hypot(...dofs.map((dof) => values[dof] ?? 0));
}

function extremeOf(rows, pick) {
  let best = null;
  for (const row of rows) {
    const magnitude = Math.abs(pick(row));
    if (best === null || magnitude > best.magnitude) best = { nodeId: row.nodeId, magnitude };
  }
  return best === null ? null : Object.freeze(best);
}

export function compareNodeIds(left, right) {
  const a = Number(left);
  const b = Number(right);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return left < right ? -1 : left > right ? 1 : 0;
}
