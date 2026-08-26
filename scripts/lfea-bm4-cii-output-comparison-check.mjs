#!/usr/bin/env node
/**
 * BM4 against real CAESAR II output.
 *
 * These assertions record what this consumer actually agrees and disagrees
 * with CAESAR about on a real 96-element model. They are deliberately written
 * to FAIL if the known disagreements silently get worse, and equally to fail
 * if they silently disappear (which would mean the comparison stopped
 * measuring anything). None of them is tuned to make the model look correct.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildBm4CiiComparison } from './lfea-bm4-cii-output-comparison.mjs';

console.log('\n--- LFEA BM4 vs. real CAESAR II output ---');
const comparison = buildBm4CiiComparison();
assert.equal(comparison.schema, 'lfea-bm4-cii-output-comparison/v1');
assert.equal(comparison.limitations.length, 4);

for (const [caseId, section] of Object.entries(comparison.cases)) {
  // Every restraint CAESAR reports must be one we also restrain, and vice
  // versa. A mismatch here means the restraint model itself drifted.
  assert.equal(section.restraint.matched.length, 30, `${caseId} restraint node count`);
  assert.deepEqual(section.restraint.unmatchedCiiNodes, [], `${caseId} unmatched CAESAR restraint nodes`);
  assert.deepEqual(section.restraint.unmatchedOurNodes, [], `${caseId} unmatched our restraint nodes`);
  assert.equal(section.displacement.matched.length, 97, `${caseId} displacement node count`);

  // Total supported weight is the one global scalar the linearization cannot
  // fudge: whatever it does to the DISTRIBUTION of load, the total must still
  // equal the model's weight. This is the strongest evidence that geometry,
  // section properties and gravity are right.
  const totalUY = section.restraint.totalUY;
  assert.ok(
    Math.abs(totalUY.percentDifference) < 3,
    `${caseId} total vertical reaction deviates ${totalUY.percentDifference.toFixed(3)}% from CAESAR (limit 3%)`,
  );

  // Physical qualification checks must hold even where the algebraic residual
  // gate does not (see the residual finding below).
  assert.equal(section.diagnostics.forceEquilibrium.status, 'PASS', `${caseId} force equilibrium`);
  assert.equal(section.diagnostics.momentEquilibrium.status, 'PASS', `${caseId} moment equilibrium`);
  assert.equal(section.diagnostics.energyBalance.status, 'PASS', `${caseId} energy balance`);
  assert.ok(section.diagnostics.energyBalance.value < 1e-14, `${caseId} energy balance is at machine precision`);
}

// ---------------------------------------------------------------------------
// Finding 1: unilateral supports carry unphysical tension.
// ---------------------------------------------------------------------------
// A "Rigid +Y" support can only push the pipe up. Linearizing it as a
// bidirectional FIXED DOF lets it pull DOWN instead, which is exactly what
// happens here -- and CAESAR, solving the same supports nonlinearly, lifts
// them off and reports zero. This is the dominant error source on BM4 and is
// asserted as a KNOWN, MEASURED defect rather than hidden.
const sustained = comparison.cases['IXP-WP'];
const operating = comparison.cases['IXP-WPT'];

assert.equal(sustained.restraint.unilateralTensionNodes.length, 1, 'BM4 SUS unilateral-tension support count');
assert.equal(sustained.restraint.unilateralTensionNodes[0].nodeId, '20090');
assert.equal(operating.restraint.unilateralTensionNodes.length, 4, 'BM4 OPE unilateral-tension support count');
for (const row of operating.restraint.unilateralTensionNodes) {
  assert.equal(row.ciiUY, 0, `CAESAR lifts node ${row.nodeId} off entirely`);
}
const worstTension = Math.min(...operating.restraint.unilateralTensionNodes.map((row) => row.ourUY));
assert.ok(worstTension < -1e5, 'the operating-case unilateral tension is large, not marginal');

// ---------------------------------------------------------------------------
// Finding 2: per-node agreement, and how far it degrades.
// ---------------------------------------------------------------------------
const withinFivePercent = (section) => section.restraint.matched
  .filter((row) => row.UY.percentDifference !== null && Math.abs(row.UY.percentDifference) < 5).length;
const sustainedWithin = withinFivePercent(sustained);
const operatingWithin = withinFivePercent(operating);
assert.ok(sustainedWithin >= 21, `BM4 SUS: only ${sustainedWithin}/30 restraints within 5% of CAESAR`);
assert.ok(operatingWithin >= 15, `BM4 OPE: only ${operatingWithin}/30 restraints within 5% of CAESAR`);

// ---------------------------------------------------------------------------
// Finding 3: displacements are systematically UNDER-predicted.
// ---------------------------------------------------------------------------
// Welding every unilateral and gapped support makes the model too stiff, so it
// moves less than the real one. The sustained case -- where CAESAR has the most
// open gaps -- is worst.
const sustainedRatio = sustained.displacement.totalAbsoluteTranslation.ratio;
const operatingRatio = operating.displacement.totalAbsoluteTranslation.ratio;
assert.ok(sustainedRatio > 0.30 && sustainedRatio < 0.40, `BM4 SUS displacement ratio ${sustainedRatio.toFixed(4)} moved outside its recorded band`);
assert.ok(operatingRatio > 0.72 && operatingRatio < 0.86, `BM4 OPE displacement ratio ${operatingRatio.toFixed(4)} moved outside its recorded band`);

// ---------------------------------------------------------------------------
// Finding 4: the algebraic residual gate blocks a solution CAESAR confirms.
// ---------------------------------------------------------------------------
// residualCheck() measures ||K*U - F|| / ||F|| on the UNSCALED matrix, while
// the factorization and solve happen on the diagonally scaled system (BM4's
// scale factors span 2.1e6, because a 1 mm element sits next to a 6.6 m one).
// Recovering the residual into unscaled coordinates re-amplifies it by that
// spread, so the 1e-9 limit is unreachable for this model no matter how
// accurate the solve is. Force equilibrium (1e-8), moment equilibrium
// (6.7e-12) and energy balance (4e-16) all pass, and the total reaction agrees
// with CAESAR to 1.45%. Asserted as an open finding, NOT worked around: the
// limit is left exactly where its engineering authority set it.
assert.equal(sustained.diagnostics.residual.status, 'BLOCK', 'BM4 SUS residual gate');
assert.equal(sustained.executionStatus, 'BLOCKED');
assert.ok(sustained.diagnostics.residual.value < 1e-5, 'residual is small in absolute terms despite failing its gate');
assert.equal(operating.diagnostics.residual.status, 'WARN', 'BM4 OPE residual gate');
assert.equal(operating.executionStatus, 'CONDITIONAL');

mkdirSync(fileURLToPath(new URL('../reports', import.meta.url)), { recursive: true });
writeFileSync(
  fileURLToPath(new URL('../reports/lfea-bm4-cii-output-comparison.json', import.meta.url)),
  `${JSON.stringify(comparison, null, 2)}\n`,
);

console.log(JSON.stringify({
  check: 'lfea-bm4-cii-output-comparison',
  status: 'PASS',
  sustained: {
    totalReactionDeviationPercent: Number(sustained.restraint.totalUY.percentDifference.toFixed(3)),
    restraintsWithinFivePercent: `${sustainedWithin}/30`,
    displacementRatio: Number(sustainedRatio.toFixed(4)),
    unilateralTensionSupports: sustained.restraint.unilateralTensionNodes.length,
    executionStatus: sustained.executionStatus,
  },
  operating: {
    totalReactionDeviationPercent: Number(operating.restraint.totalUY.percentDifference.toFixed(3)),
    restraintsWithinFivePercent: `${operatingWithin}/30`,
    displacementRatio: Number(operatingRatio.toFixed(4)),
    unilateralTensionSupports: operating.restraint.unilateralTensionNodes.length,
    worstUnilateralTensionNewtons: Number(worstTension.toFixed(1)),
    executionStatus: operating.executionStatus,
  },
}, null, 2));
console.log('LFEA BM4 vs. real CAESAR II output comparison PASS (known deviations asserted, not tuned away)');
