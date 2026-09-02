/**
 * Exact-row delegation check for the gamma interpolation module.
 *
 * The interpolation module is required to hand tabulated gamma straight to the
 * source-qualified selector rather than blending anything. Its own check asserts
 * that the delegation *happens*; this asserts the numbers that come out are the
 * frozen oracle numbers, so the new module cannot drift from the source-qualified
 * path on a tabulated row.
 *
 * Two frozen same-method references are used:
 *   gamma=5   validation/emp1/wrc537-2013/gamma5-full-table5-oracle-v1.json
 *             (PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE, carries its own
 *             curve ordinates, so curve evaluation is checked apart from Table 5)
 *   gamma=15  validation/emp1/wrc537-2013/main-baseline-gamma15-handcalc-v1.json
 *             (FROZEN_CURRENT_MAIN_INDEPENDENT_HANDCALC_BASELINE)
 *
 * Same method and same curve data, so the tolerance is the baseline's own
 * floating-point band, not an engineering allowance.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEmp1Wrc537InterpolatedTable5Ordinates }
  from '../src/core/emp1/emp1-wrc537-cylindrical-gamma-interpolation.js';
import { evaluateEmp1Wrc537CylindricalTable5 }
  from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../validation/emp1/wrc537-2013/${name}`, import.meta.url)));
const gamma5 = read('gamma5-full-table5-oracle-v1.json');
const gamma15 = read('main-baseline-gamma15-handcalc-v1.json');

const RELATIVE_TOLERANCE = gamma15.comparisonTolerance.floatingPointRelative;   // 1e-11
const ABSOLUTE_TOLERANCE = gamma15.comparisonTolerance.floatingPointAbsolute;   // 1e-12
const close = (actual, expected) =>
  Math.abs(actual - expected) <= Math.max(ABSOLUTE_TOLERANCE, Math.abs(expected) * RELATIVE_TOLERANCE);

// The references must still be the frozen, non-production artifacts they claim to be.
assert.equal(gamma5.status, 'PASS_REOBSERVED_INDEPENDENT_FULL_TABLE5_ORACLE');
assert.equal(gamma5.productionAuthority, false);
assert.equal(gamma15.status, 'FROZEN_CURRENT_MAIN_INDEPENDENT_HANDCALC_BASELINE');
assert.equal(gamma15.authority.productionAuthority, false);
assert.equal(gamma15.domain.interpolationUsed, false);

const CASES = [
  {
    label: 'gamma=5 full Table-5 oracle',
    geometry: gamma5.semanticPayload.case.geometry,
    loads: gamma5.semanticPayload.case.loads,
    variant: gamma5.semanticPayload.case.variant,
    expected: {
      circumferential: gamma5.semanticPayload.expected.circumferential,
      longitudinal: gamma5.semanticPayload.expected.longitudinal,
      shear: gamma5.semanticPayload.expected.shear,
      stressIntensity: gamma5.semanticPayload.expected.stressIntensity,
    },
    frozenOrdinates: gamma5.semanticPayload.curveOrdinates,
    governing: null,
    // Each oracle declares its own retained figure map. Pass it explicitly rather
    // than relying on the module default, which is the qualified axis-of-symmetry
    // 1B/2B selection; these oracles were frozen on the off-axis 1B-1/2B-1 pair.
    longitudinalMomentFigures: {
      circumferential: gamma5.semanticPayload.figureMap.circ.Mlbend,
      longitudinal: gamma5.semanticPayload.figureMap.long.Mlbend,
    },
  },
  {
    label: 'gamma=15 independent handcalc baseline',
    geometry: gamma15.case.geometry,
    loads: gamma15.case.loadsAtWrcAttachmentReferencePoint,
    variant: gamma15.domain.variant,
    expected: {
      circumferential: gamma15.expected.circumferentialStress,
      longitudinal: gamma15.expected.longitudinalStress,
      shear: gamma15.expected.shearStress,
      stressIntensity: gamma15.expected.stressIntensity,
    },
    frozenOrdinates: {
      circ: gamma15.expected.curveOrdinates.circumferential,
      long: gamma15.expected.curveOrdinates.longitudinal,
    },
    governing: gamma15.expected.governing,
    longitudinalMomentFigures: {
      circumferential: gamma15.figureMap.circumferential.Mlbend,
      longitudinal: gamma15.figureMap.longitudinal.Mlbend,
    },
  },
];

for (const testCase of CASES) {
  const { meanRadius, shellThickness, attachmentRadius, beta, gamma } = testCase.geometry;

  // Route the tabulated row through the interpolation module on purpose.
  const set = buildEmp1Wrc537InterpolatedTable5Ordinates({
    variant: testCase.variant,
    gamma,
    beta,
    longitudinalMomentFigures: testCase.longitudinalMomentFigures,
  });

  // It must delegate, not interpolate, and must keep source-qualified standing.
  assert.equal(set.interpolationUsed, false, `${testCase.label}: tabulated gamma must not interpolate`);
  assert.equal(set.sourceQualifiedGammaSelection, true, `${testCase.label}: delegation must stay source-qualified`);
  assert.equal(set.wrcMethodFidelityClaim, true);
  assert.equal(set.signChanges.length, 0, `${testCase.label}: an exact row has no bracket to change sign across`);
  // No owner beta declaration was supplied: delegation must not require one.

  // Where the oracle froze its own ordinates, check curve evaluation on its own.
  if (testCase.frozenOrdinates) {
    for (const family of ['circ', 'long']) {
      for (const [key, expected] of Object.entries(testCase.frozenOrdinates[family])) {
        assert.ok(
          close(set.ordinates[family][key], expected),
          `${testCase.label}: ordinate ${family}.${key} = ${set.ordinates[family][key]} vs frozen ${expected}`,
        );
      }
    }
  }

  const result = evaluateEmp1Wrc537CylindricalTable5({
    geometry: { meanRadius, shellThickness, attachmentRadius, beta },
    stressConcentration: { Kn: 1, Kb: 1 },
    loads: testCase.loads,
    curveOrdinates: set.ordinates,
  });

  for (const [key, expected] of Object.entries(testCase.expected)) {
    const actual = result.stresses[key];
    assert.equal(actual.length, expected.length);
    expected.forEach((value, index) => {
      assert.ok(
        close(actual[index], value),
        `${testCase.label}: ${key}[${index}] = ${actual[index]} vs frozen ${value}`,
      );
    });
  }

  const envelope = result.extremaScope.evaluatedEightPointEnvelope;
  if (testCase.governing) {
    assert.equal(envelope.location, testCase.governing.location,
      `${testCase.label}: governing location must match the frozen baseline`);
    assert.ok(close(envelope.stressIntensity, testCase.governing.stressIntensity),
      `${testCase.label}: governing intensity ${envelope.stressIntensity} vs frozen ${testCase.governing.stressIntensity}`);
  }
  console.log(`  ${testCase.label.padEnd(38)} ordinates + 8 points match to ${RELATIVE_TOLERANCE}`
    + `  (envelope ${envelope.stressIntensity.toFixed(3)} at ${envelope.location})`);
}

console.log('EMP1_WRC537_INTERPOLATION_EXACT_ROW_DELEGATION_CHECK_PASS');
