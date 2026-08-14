/**
 * Frozen static snapshot of real, pinned-ACCDB M047 Stage 2 friction-solve
 * evidence, for display only. This module never solves anything and never
 * reads a live ACCDB - it packages committed JSON evidence
 * (`caesar-accdb-evidence-snapshot/*.json`, copies of
 * `reports/lfea-m047-stage2-r2-rebaseline/*.json`) into the two views a
 * benchmark panel needs.
 *
 * The split below is deliberate and load-bearing for how this is presented:
 * normal reactions are a linear-mechanics quantity, already accurate
 * (22-23 of 23 restraints within +-10% on every case), and are shown as a
 * qualified comparison table. Tangential friction force is not - `SLIDING`
 * force direction/magnitude is still measured well outside +-10% on the
 * majority of restraints (worst case thousands of percent, see
 * agents/M047_STAGE2_ROADMAP.md's R7) - and is shown only as a labelled
 * diagnostic, never with pass/fail styling that would misrepresent it as
 * validated.
 *
 * Updating this snapshot to a newer Stage 2 result is a deliberate act: copy
 * the new evidence JSON over the files in `caesar-accdb-evidence-snapshot/`
 * and rebuild. It does not update itself.
 */
import l1Evidence from './caesar-accdb-evidence-snapshot/L1.json' with { type: 'json' };
import l7Evidence from './caesar-accdb-evidence-snapshot/L7.json' with { type: 'json' };
import l13Evidence from './caesar-accdb-evidence-snapshot/L13.json' with { type: 'json' };

const EVIDENCE_BY_CASE = Object.freeze({
  L13: l13Evidence,
  L7: l7Evidence,
  L1: l1Evidence,
});

export const CAESAR_ACCDB_SNAPSHOT_SCHEMA = 'caesar-accdb-benchmark-snapshot/v1';
export const CAESAR_ACCDB_SNAPSHOT_CASE_IDS = Object.freeze(['L13', 'L7', 'L1']);

const CASE_LABELS = Object.freeze({
  L13: 'L13 (W+P1)',
  L7: 'L7 (W+T1+P1)',
  L1: 'L1 (WW+HP)',
});

/**
 * Full evidence record for one case, plus a frozen custody block that names
 * exactly what this data is and is not.
 */
export function loadCaesarAccdbSnapshot(caseId) {
  const evidence = EVIDENCE_BY_CASE[caseId];
  if (!evidence) {
    throw new TypeError(`Unknown CAESAR ACCDB snapshot case ${JSON.stringify(caseId)}.`);
  }
  return Object.freeze({
    schema: CAESAR_ACCDB_SNAPSHOT_SCHEMA,
    caseId,
    caseLabel: CASE_LABELS[caseId],
    custody: Object.freeze({
      kind: 'FROZEN_STATIC_SNAPSHOT',
      note: 'Real pinned-ACCDB solve, captured at build time. Not live; not re-solved in the browser.',
      sourceAccdbSha256: evidence.sourceAccdbSha256,
      solverProfileId: evidence.solverProfileId,
      solutionStrategy: evidence.solutionStrategy,
      converged: evidence.converged,
      productionPromotionAuthorized: false,
    }),
    summary: evidence.summary,
    normalReactions: deriveNormalReactionView(evidence),
    frictionDiagnostic: deriveFrictionDiagnosticView(evidence),
  });
}

/**
 * Normal reaction comparison: a linear-mechanics quantity, already accurate.
 * Shown with pass/fail semantics against the same +-10% goal the solver
 * itself is measured against.
 */
function deriveNormalReactionView(evidence) {
  const goalPercent = evidence.summary.goalRelative * 100;
  return evidence.restraints.map((restraint) => {
    const withinGoal = Math.abs(restraint.normal.percentError) <= goalPercent;
    return Object.freeze({
      restraintId: restraint.restraintId,
      nodeId: restraint.nodeId,
      nodeName: restraint.nodeName,
      referenceN: restraint.normal.referenceN,
      solvedN: restraint.normal.solvedN,
      percentError: restraint.normal.percentError,
      goalPercent,
      status: withinGoal ? 'PASS' : 'FAIL',
    });
  });
}

/**
 * Friction (tangential) diagnostic: NOT a pass/fail table. `status` is a
 * neutral regime-match flag only - CAESAR's own reference regime versus the
 * solved one - never a claim that the force magnitude/direction is
 * validated, because on the current evidence it usually is not.
 */
function deriveFrictionDiagnosticView(evidence) {
  const goalPercent = evidence.summary.goalRelative * 100;
  return evidence.restraints.map((restraint) => Object.freeze({
    restraintId: restraint.restraintId,
    nodeId: restraint.nodeId,
    nodeName: restraint.nodeName,
    referenceMagnitudeN: restraint.tangential.referenceMagnitudeN,
    solvedMagnitudeN: restraint.tangential.solvedMagnitudeN,
    vectorRelativeErrorPercent: restraint.tangential.vectorRelativeError * 100,
    goalPercent,
    withinGoal: Math.abs(restraint.tangential.vectorRelativeError * 100) <= goalPercent,
    regimeReference: restraint.regime.reference,
    regimeSolved: restraint.regime.solved,
    regimeMatch: restraint.regime.match,
  }));
}
