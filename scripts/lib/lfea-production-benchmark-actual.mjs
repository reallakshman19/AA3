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
 * Element end actions ARE emitted, by aggregation. Production solves 168
 * elements where CAESAR reports 96, because a bend becomes an incoming straight
 * plus six arc chords. A chord's end actions are not the source element's, so
 * each source element's production chain is walked from its FROM node to its TO
 * node and only the two outer ends are reported: the first element's I end and
 * the last element's J end. Those are the same two physical points CAESAR
 * reports, so the comparison is like for like.
 *
 * A chain that does not walk cleanly from FROM to TO is skipped rather than
 * guessed at -- a partial or ambiguous chain would report an interior chord's
 * actions as if they were the element's, which is worse than reporting nothing.
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
const FORCE_COMPONENTS = Object.freeze([['FX', 'fx'], ['FY', 'fy'], ['FZ', 'fz']]);
const MOMENT_COMPONENTS = Object.freeze([['MX', 'mx'], ['MY', 'my'], ['MZ', 'mz']]);

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
  // Element rows are all-or-nothing across the mapped cases. The comparator
  // derives single-term differences between cases and requires complete row
  // coverage on both sides, so supplying element actions for some mapped cases
  // and not others fails the whole comparison rather than degrading it. A case
  // that cannot be recovered -- one blocked on its own equilibrium check, say --
  // therefore withholds element actions from all of them, and says so.
  const elementActionsComplete = input.caseResults
    .filter((row) => PRODUCTION_TO_CAESAR_CASE[row.caseId] !== undefined)
    .every((row) => row.actionsByElement !== null && row.actionsByElement !== undefined);
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
    if (elementActionsComplete) {
      appendElementEndRows(rows, caseResult.elementChains, caseResult.actionsByElement);
    }
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
        elementActionsComplete
          ? 'Element end actions are aggregated: a source element is reported from the two '
            + 'outer ends of its production chain, since a retopologized bend has no single '
            + 'analysis element spanning it.'
          : 'Element end actions are withheld from every case: at least one mapped case '
            + 'could not be recovered, and partial element coverage fails the derived-case '
            + 'machinery in the comparator rather than degrading it.',
        ...(skippedCaseIds.length === 0 ? [] : [
          `Production cases with no mapped CAESAR counterpart: ${skippedCaseIds.join(', ')}.`,
        ]),
      ],
    },
  };
}

/**
 * One row set per source element, from the two outer ends of its production
 * chain. `chains` is `[{ entityId, elementIds }]` in FROM-to-TO order.
 */
function appendElementEndRows(rows, chains, actionsByElement) {
  if (!Array.isArray(chains) || !actionsByElement) return;
  for (const chain of chains) {
    const first = actionsByElement.get(chain.elementIds[0]);
    const last = actionsByElement.get(chain.elementIds[chain.elementIds.length - 1]);
    if (first === undefined || last === undefined) continue;
    appendEnd(rows, chain.entityId, 'FROM', first.global?.I);
    appendEnd(rows, chain.entityId, 'TO', last.global?.J);
  }
}

function appendEnd(rows, entityId, endLabel, action) {
  if (!action) return;
  for (const [component, field] of FORCE_COMPONENTS) {
    const value = Number(action[field]);
    if (!Number.isFinite(value)) continue;
    rows.push({
      entityKind: 'ELEMENT', entityId,
      quantity: `GLOBAL_END_FORCE_${endLabel}`, component, value, unit: 'N',
    });
  }
  for (const [component, field] of MOMENT_COMPONENTS) {
    const value = Number(action[field]);
    if (!Number.isFinite(value)) continue;
    rows.push({
      entityKind: 'ELEMENT', entityId,
      quantity: `GLOBAL_END_MOMENT_${endLabel}`, component, value, unit: 'N*m',
    });
  }
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
