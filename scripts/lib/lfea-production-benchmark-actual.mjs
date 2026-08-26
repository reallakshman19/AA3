/**
 * Convert a production LFEA analysis result into the benchmark's `actual`
 * package, so production can be qualified against CAESAR's own recorded answer
 * by the same comparator the reference solver already uses.
 *
 * This exists because nothing connected the two halves. The reference, the
 * tolerances and the comparator have all been in the repository for a while;
 * what was missing was a translation between production's result shape and
 * `lfea-accdb-benchmark-actual/v1`. Without it, "the module runs" was the
 * strongest claim available about any numerical change.
 *
 * Two translations are genuinely needed, and both are stated explicitly rather
 * than inferred:
 *
 *   Cases.  Production synthesizes its own physical cases from the model
 *   (IXP-W, IXP-WP, IXP-WPT, IXP-WT). CAESAR numbers its own (L1..L15). Only
 *   pairs whose load content is the same physical case may be compared, so the
 *   mapping is declared here and anything unmapped is skipped rather than
 *   guessed at. IXP-WT has no counterpart in the profile's selected set.
 *
 *   Node identity.  Production retains CAESAR's own node numbers for source
 *   nodes and mints synthetic ids for nodes it introduces during bend
 *   retopology (`ACCDB.E19.A1`). The reference only ever names source nodes, so
 *   synthetic nodes are dropped: they have no CAESAR counterpart to compare to.
 *
 * Element end actions are deliberately NOT emitted yet. Production solves 168
 * elements where CAESAR reports 96, because a bend becomes an incoming straight
 * plus six arc chords. Reporting a chord's end actions against a whole source
 * element's would compare two different things. Aggregating chords back to
 * source-element ends is real work with its own sign and orientation
 * conventions, and inventing it silently here would produce confident wrong
 * numbers. Node displacements, rotations and restraint reactions carry no such
 * ambiguity and are emitted in full.
 */

/** Declared, not inferred. Left is production; right is the CAESAR case. */
export const PRODUCTION_TO_CAESAR_CASE = Object.freeze({
  'IXP-W': 'L2',     // weight only
  'IXP-WP': 'L6',    // weight + P1
  'IXP-WPT': 'L5',   // weight + T1 + P1
  // IXP-WT (weight + thermal) has no counterpart among the profile's cases.
});

const TRANSLATION_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const ROTATION_DOFS = Object.freeze(['RX', 'RY', 'RZ']);

/** A source node keeps CAESAR's own numbering; retopology nodes do not. */
export function isSourceNodeId(nodeId) {
  return /^[0-9]+$/u.test(String(nodeId));
}

/**
 * @param {object} input
 * @param {string} input.sourceAccdbSha256 Must match the benchmark package's source hash.
 * @param {Array<object>} input.caseResults `{caseId, displacementsByNode, reactionsByNode}`.
 *   Each `*ByNode` maps nodeId to a 6-vector keyed UX,UY,UZ,RX,RY,RZ in SI.
 * @returns {object} `lfea-accdb-benchmark-actual/v1`
 */
export function buildProductionBenchmarkActual(input) {
  const cases = {};
  const skippedCaseIds = [];
  for (const caseResult of input.caseResults) {
    const caesarCaseId = PRODUCTION_TO_CAESAR_CASE[caseResult.caseId] ?? null;
    if (caesarCaseId === null) {
      skippedCaseIds.push(caseResult.caseId);
      continue;
    }
    const rows = [];
    appendNodeVectorRows(rows, caseResult.displacementsByNode, 'DISPLACEMENT', TRANSLATION_DOFS, 'm');
    appendNodeVectorRows(rows, caseResult.displacementsByNode, 'ROTATION', ROTATION_DOFS, 'rad');
    appendNodeVectorRows(rows, caseResult.reactionsByNode, 'FORCE', TRANSLATION_DOFS, 'N');
    appendNodeVectorRows(rows, caseResult.reactionsByNode, 'MOMENT', ROTATION_DOFS, 'N*m');
    cases[caesarCaseId] = { rows };
  }
  return {
    schema: 'lfea-accdb-benchmark-actual/v1',
    sourceAccdbSha256: input.sourceAccdbSha256,
    cases,
    mechanics: {
      schema: 'lfea-production-solve-evidence/v1',
      sourceModelSemanticHash: input.sourceModelSemanticHash ?? null,
      cases: {},
      limitations: [
        'Element end actions are not emitted: production analysis elements do not '
        + 'correspond one-to-one with CAESAR source elements after bend retopology.',
        ...(skippedCaseIds.length === 0 ? [] : [
          `Production cases with no mapped CAESAR counterpart: ${skippedCaseIds.join(', ')}.`,
        ]),
      ],
    },
  };
}

function appendNodeVectorRows(rows, byNode, quantity, dofs, unit) {
  if (!byNode) return;
  for (const [nodeId, vector] of Object.entries(byNode)) {
    if (!isSourceNodeId(nodeId)) continue;
    for (const dof of dofs) {
      const value = Number(vector?.[dof]);
      if (!Number.isFinite(value)) continue;
      rows.push({ entityKind: 'NODE', entityId: String(nodeId), quantity, component: dof, value, unit });
    }
  }
}
