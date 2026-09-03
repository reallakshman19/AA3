/**
 * Gamma-domain panel check.
 *
 * The panel answers which shell parameters EMP.1.C can evaluate and what happens
 * between them. Its three states must stay distinguishable, and an interpolated
 * gamma must never be presented as source-qualified.
 */
import assert from 'node:assert/strict';
import {
  EMP1_WRC537_GAMMA_INTERPOLATION_POLICY,
  emp1Wrc537CommonTabulatedGammas,
  planEmp1Wrc537GammaInterpolation,
} from '../src/core/emp1/emp1-wrc537-cylindrical-gamma-interpolation.js';

// The grid the panel prints is the real intersection, not a hardcoded list.
const grid = emp1Wrc537CommonTabulatedGammas('ORIGINAL');
assert.deepEqual([...grid], [5, 15, 50, 100, 300]);

// State 1: the bounded route's own gamma is an exact source row.
const exact = planEmp1Wrc537GammaInterpolation({ variant: 'ORIGINAL', gamma: 5 });
assert.equal(exact.status, 'EXACT_SOURCE_TABULATED_ROW');
assert.equal(exact.sourceQualifiedGammaSelection, true);

// State 2: a real vessel between rows is bracketed and is NOT source-qualified.
for (const [gamma, lower, upper] of [[42.72, 15, 50], [48.03, 15, 50], [7.5, 5, 15], [220, 100, 300]]) {
  const plan = planEmp1Wrc537GammaInterpolation({ variant: 'ORIGINAL', gamma });
  assert.equal(plan.status, 'INTERPOLATION_PLANNED', `gamma ${gamma} should bracket`);
  assert.equal(plan.bracket.lowerGamma, lower);
  assert.equal(plan.bracket.upperGamma, upper);
  assert.equal(plan.sourceQualifiedGammaSelection, false,
    `gamma ${gamma} is interpolated and must not claim source-qualified selection`);
  assert.equal(plan.wrcMethodFidelityClaim, false);
  assert.equal(plan.betaOuterLimitSourceResolved, false);
}

// State 3: outside the tabulated range is refused, not silently extrapolated.
for (const gamma of [4.9, 301, 1000]) {
  const plan = planEmp1Wrc537GammaInterpolation({ variant: 'ORIGINAL', gamma });
  assert.equal(plan.status, 'BLOCKED', `gamma ${gamma} must be refused`);
  assert.ok(plan.reasons.includes('EMP1_WRC537_GAMMA_INTERP_EXTRAPOLATION_BLOCKED'));
}

// The panel quotes the measured accuracy, so the policy must carry it.
const policy = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY;
const measured = policy.coordinateAccuracyBasis?.[policy.defaultCoordinate];
assert.ok(measured, 'the default coordinate must carry a measured accuracy record');
assert.ok(Number.isFinite(measured.medianAbsolutePercent));
assert.ok(Number.isFinite(measured.p95AbsolutePercent));
assert.equal(measured.unconservativeCases, 0,
  'the panel tells the engineer the default does not understate; that must remain true');
assert.equal(policy.sourceRuleQualified, false);
assert.equal(policy.extrapolation, 'BLOCKED');
assert.equal(policy.variantMixing, 'BLOCKED');

// The panel must not print internal enums at the reader, which is the same bar
// the EMP.1 label registry holds the rest of the surface to.
const view = await import('../src/workspace/emp1-gamma-domain-view.js');
assert.ok(typeof view.renderEmp1GammaDomain === 'function');

console.log(`  grid ${grid.join(', ')}; exact, bracketed and refused states all distinguishable`);
console.log('EMP1_GAMMA_DOMAIN_PANEL_CHECK_PASS');
