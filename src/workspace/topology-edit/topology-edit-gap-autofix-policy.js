/** Bounded policy for certified endpoint-gap repair; no geometry is edited here. */
export const TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM = 6;
export const TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM = 6;
export const TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM = 25;

/** Returns an explicit strict-upper-bound tolerance or raises an actionable error. */
export function requireTopologyEditAutofixGapMm(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0
      || parsed > TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM) {
    throw new RangeError(
      `TopoFix gap tolerance must be greater than 0 and no more than ${TOPOLOGY_EDIT_MAXIMUM_AUTOFIX_GAP_MM} mm.`,
    );
  }
  return parsed;
}
