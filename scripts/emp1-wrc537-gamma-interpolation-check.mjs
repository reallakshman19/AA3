import assert from 'node:assert/strict';
import {
  EMP1_WRC537_GAMMA_INTERPOLATION_POLICY,
  EMP1_WRC537_TABLE5_REQUIRED_FIGURES,
  buildEmp1Wrc537InterpolatedTable5Ordinates,
  classifyEmp1Wrc537BracketSignChange,
  emp1Wrc537CommonTabulatedGammas,
  evaluateEmp1Wrc537InterpolatedOrdinate,
  planEmp1Wrc537GammaInterpolation,
} from '../src/core/emp1/emp1-wrc537-cylindrical-gamma-interpolation.js';
import { evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';

const V = 'ORIGINAL';
const OWNER_BETA = { basis: 'OWNER_DECLARED', minimum: 0.05, maximum: 0.5 };

// --- policy is explicit that it is not a WRC source rule ------------------------
assert.equal(EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.sourceRuleQualified, false);
assert.equal(EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.basis, 'OWNER_DIRECTED_ENGINEERING_JUDGEMENT_NOT_WRC_SOURCE_RULE');
assert.equal(EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.interpolatedQuantity, 'NONDIMENSIONAL_ORDINATE_Y');
assert.equal(EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.extrapolation, 'BLOCKED');

// --- the common grid is the intersection across all required figures ------------
const grid = emp1Wrc537CommonTabulatedGammas(V);
assert.deepEqual([...grid], [5, 15, 50, 100, 300]);
// figures 1A and 3C carry only these five rows, so richer figures cannot widen it
assert.ok(EMP1_WRC537_TABLE5_REQUIRED_FIGURES.includes('1A'));
assert.ok(EMP1_WRC537_TABLE5_REQUIRED_FIGURES.includes('3C'));

// --- exact rows still delegate to the source-qualified selector -----------------
for (const gamma of grid) {
  const plan = planEmp1Wrc537GammaInterpolation({ variant: V, gamma });
  assert.equal(plan.status, 'EXACT_SOURCE_TABULATED_ROW');
  assert.equal(plan.interpolationUsed, false);
  assert.equal(plan.sourceQualifiedGammaSelection, true);
  const ord = evaluateEmp1Wrc537InterpolatedOrdinate({ figure: '3C', variant: V, gamma, beta: 0.2 });
  assert.equal(ord.interpolationUsed, false);
  assert.equal(ord.sourceQualifiedGammaSelection, true);
  assert.equal(ord.wrcMethodFidelityClaim, true);
}

// --- interpolation brackets on the common grid ----------------------------------
const plan = planEmp1Wrc537GammaInterpolation({ variant: V, gamma: 42.72 });
assert.equal(plan.status, 'INTERPOLATION_PLANNED');
assert.equal(plan.interpolationUsed, true);
assert.equal(plan.sourceQualifiedGammaSelection, false);
assert.equal(plan.wrcMethodFidelityClaim, false);
assert.equal(plan.bracket.lowerGamma, 15);
assert.equal(plan.bracket.upperGamma, 50);
assert.equal(plan.betaOuterLimitSourceResolved, false);
// log-coordinate weight
const expectedW = (Math.log(42.72) - Math.log(15)) / (Math.log(50) - Math.log(15));
assert.ok(Math.abs(plan.bracket.upperWeight - expectedW) < 1e-12);
assert.ok(Math.abs(plan.bracket.lowerWeight + plan.bracket.upperWeight - 1) < 1e-12);

// --- coordinate choice actually changes the weight ------------------------------
const linear = planEmp1Wrc537GammaInterpolation({ variant: V, gamma: 42.72, coordinate: 'LINEAR_GAMMA' });
// gamma=42.72 in the 15->50 bracket: log weight 0.869, linear weight 0.792.
// The ~7.7 point spread is why the coordinate choice is a recorded policy decision
// rather than an implementation detail.
assert.ok(Math.abs(linear.bracket.upperWeight - (42.72 - 15) / (50 - 15)) < 1e-12);
assert.ok(Math.abs(linear.bracket.upperWeight - plan.bracket.upperWeight) > 0.05,
  'log and linear coordinates must differ materially across a 15->50 gap');
assert.throws(() => planEmp1Wrc537GammaInterpolation({ variant: V, gamma: 42.72, coordinate: 'SQRT_GAMMA' }),
  /COORDINATE_UNSUPPORTED/);

// --- FAIL CLOSED: beta outer limit unresolved above gamma 5 ---------------------
assert.throws(
  () => evaluateEmp1Wrc537InterpolatedOrdinate({ figure: '3C', variant: V, gamma: 42.72, beta: 0.2 }),
  /BETA_OUTER_LIMIT_UNRESOLVED/,
  'a bracket above gamma=5 must refuse to evaluate without an explicit owner beta declaration',
);

// --- with an explicit owner declaration it evaluates and stays unqualified -------
const interpolated = evaluateEmp1Wrc537InterpolatedOrdinate({
  figure: '3C', variant: V, gamma: 42.72, beta: 0.2, betaDomain: OWNER_BETA,
});
assert.equal(interpolated.interpolationUsed, true);
assert.equal(interpolated.sourceQualifiedGammaSelection, false);
assert.equal(interpolated.wrcMethodFidelityClaim, false);
assert.equal(interpolated.productionAuthority, false);
assert.equal(interpolated.betaDomain.basis, 'OWNER_DECLARED');
assert.equal(interpolated.betaDomain.outerLimitSourceResolved, false);
// the blend must lie between its bracket ordinates
const { lowerY, upperY } = interpolated.bracketOrdinates;
assert.ok(interpolated.y >= Math.min(lowerY, upperY) && interpolated.y <= Math.max(lowerY, upperY),
  'interpolated ordinate must lie within its bracket');

// --- sign change across a bracket: benign tail vs material reversal -------------
// Figure 2C at gamma=50 dips just below zero for beta >~ 0.4 while gamma=15 stays
// positive. That is a fit tail near a zero crossing, not a physical reversal, and
// must not block a whole Table-5 route.
// Judged against a family maximum of order 1, both 2C values are negligible.
const benign = classifyEmp1Wrc537BracketSignChange(0.0197, -0.0026, 1.0);
assert.equal(benign.signChange, true);
assert.equal(benign.material, false);
// Two ordinates that both carry a real share of the family magnitude and oppose
// each other can cancel towards zero and understate the stress: that must block.
const materialFlip = classifyEmp1Wrc537BracketSignChange(0.8, -0.6, 1.0);
assert.equal(materialFlip.signChange, true);
assert.equal(materialFlip.material, true);
// materiality is relative to the family, not to the bracket partner: the same
// 0.13 partner-ratio is benign at family scale 1.0 and material at family scale 0.02
assert.equal(classifyEmp1Wrc537BracketSignChange(0.0197, -0.0026, 0.02).material, true);
// no sign change at all
assert.equal(classifyEmp1Wrc537BracketSignChange(0.5, 0.2, 1.0).signChange, false);
// without a reference scale no verdict is invented
assert.equal(classifyEmp1Wrc537BracketSignChange(0.0197, -0.0026).materialityAssessed, false);

// the benign 2C crossing evaluates and is reported, not silently swallowed
const across2C = evaluateEmp1Wrc537InterpolatedOrdinate({
  figure: '2C', variant: V, gamma: 42.72, beta: 0.436, betaDomain: OWNER_BETA,
});
assert.equal(across2C.signChange.signChange, true);
assert.ok(Number.isFinite(across2C.y));

// and the full set at that beta builds, reporting the crossing rather than failing
const at436 = buildEmp1Wrc537InterpolatedTable5Ordinates({
  variant: V, gamma: 42.72, beta: 0.436, betaDomain: OWNER_BETA,
});
assert.ok(at436.signChanges.some((row) => row.figure === '2C'), '2C crossing must be reported');
assert.ok(at436.signChanges.every((row) => row.material === false), 'no material reversal expected here');

// --- FAIL CLOSED: extrapolation, bad beta, bad variant --------------------------
assert.equal(planEmp1Wrc537GammaInterpolation({ variant: V, gamma: 4.9 }).reasons[0], 'EMP1_WRC537_GAMMA_INTERP_EXTRAPOLATION_BLOCKED');
assert.equal(planEmp1Wrc537GammaInterpolation({ variant: V, gamma: 301 }).reasons[0], 'EMP1_WRC537_GAMMA_INTERP_EXTRAPOLATION_BLOCKED');
assert.throws(() => planEmp1Wrc537GammaInterpolation({ variant: 'MIXED', gamma: 20 }), /VARIANT_REQUIRED/);
assert.throws(
  () => evaluateEmp1Wrc537InterpolatedOrdinate({ figure: '3C', variant: V, gamma: 42.72, beta: 0.9, betaDomain: OWNER_BETA }),
  /BETA_OUTSIDE_DECLARED_DOMAIN/,
);

// --- full Table-5 ordinate set at a non-tabulated gamma, then a real evaluation --
const beta = 0.2;
const gamma = 42.72;                       // the PV Elite C101 nozzle-A shell gamma
const set = buildEmp1Wrc537InterpolatedTable5Ordinates({ variant: V, gamma, beta, betaDomain: OWNER_BETA });
assert.equal(set.interpolationUsed, true);
assert.equal(set.sourceQualifiedGammaSelection, false);
assert.equal(set.wrcMethodFidelityClaim, false);
assert.equal(set.productionAuthority, false);
for (const family of ['circ', 'long']) {
  for (const key of ['Pmem_AB', 'Pmem_CD', 'Pbend_AB', 'Pbend_CD', 'Mcmem', 'Mcbend', 'Mlmem', 'Mlbend']) {
    assert.ok(Number.isFinite(set.ordinates[family][key]) && set.ordinates[family][key] >= 0,
      `${family}.${key} must be a non-negative finite ordinate`);
  }
}

const T = 25;
const Rm = gamma * T;
const result = evaluateEmp1Wrc537CylindricalTable5({
  geometry: { meanRadius: Rm, shellThickness: T, attachmentRadius: beta * Rm / 0.875, beta },
  stressConcentration: { Kn: 1, Kb: 1 },
  loads: { P: -25000, Vc: 22000, Vl: 69000, Mc: -45e6, Ml: 78e6, Mt: 101e6 },
  curveOrdinates: set.ordinates,
});
assert.equal(result.stresses.stressIntensity.length, 8);
assert.ok(result.stresses.stressIntensity.every(Number.isFinite));
const envelope = result.extremaScope.evaluatedEightPointEnvelope;
assert.ok(envelope.stressIntensity > 0);
assert.equal(envelope.globalAbsoluteMaximumClaim, false);

// --- monotonic bracketing sanity: interpolated SI sits between its bracket rows --
const bracketSI = [15, 50].map((g) => {
  const s = buildEmp1Wrc537InterpolatedTable5Ordinates({ variant: V, gamma: g, beta, betaDomain: OWNER_BETA });
  const r = evaluateEmp1Wrc537CylindricalTable5({
    geometry: { meanRadius: g * T, shellThickness: T, attachmentRadius: beta * g * T / 0.875, beta },
    stressConcentration: { Kn: 1, Kb: 1 },
    loads: { P: -25000, Vc: 22000, Vl: 69000, Mc: -45e6, Ml: 78e6, Mt: 101e6 },
    curveOrdinates: s.ordinates,
  });
  return r.extremaScope.evaluatedEightPointEnvelope.stressIntensity;
});
assert.ok(
  envelope.stressIntensity < bracketSI[0] && envelope.stressIntensity > bracketSI[1],
  `interpolated SI ${envelope.stressIntensity} must fall between gamma=15 (${bracketSI[0]}) and gamma=50 (${bracketSI[1]})`,
);

console.log('EMP1_WRC537_GAMMA_INTERPOLATION_CHECK_PASS');
