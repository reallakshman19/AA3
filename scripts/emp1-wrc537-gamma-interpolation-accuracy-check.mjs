/**
 * Measures gamma-interpolation accuracy by leave-one-out against the source rows,
 * and guards the property the default coordinate was chosen for: LINEAR_GAMMA must
 * not understate the eight-point envelope.
 *
 * Leave-one-out hides an interior grid row and rebuilds it from its neighbours, so
 * every bracket here spans two grid gaps. That is deliberately harder than real use,
 * where a requested gamma sits inside a single gap, and the numbers below are
 * therefore an upper bound on the error of normal operation.
 */
import assert from 'node:assert/strict';
import {
  evaluateEmp1Wrc537DatasetCurve,
  selectEmp1Wrc537CylindricalDatasetCurve,
} from '../src/core/emp1/emp1-wrc537-cylindrical-index.js';
import { evaluateEmp1Wrc537CylindricalTable5 } from '../src/core/emp1/emp1-wrc537-cylindrical-table5.js';
import { EMP1_WRC537_GAMMA_INTERPOLATION_POLICY } from '../src/core/emp1/emp1-wrc537-cylindrical-gamma-interpolation.js';

const FIGURE_MAP = {
  circ: { Pmem_AB: '4C', Pmem_CD: '3C', Pbend_AB: '2C-1', Pbend_CD: '1C', Mcmem: '3A', Mcbend: '1A', Mlmem: '3B', Mlbend: '1B-1' },
  long: { Pmem_AB: '3C', Pmem_CD: '4C', Pbend_AB: '1C-1', Pbend_CD: '2C', Mcmem: '4A', Mcbend: '2A', Mlmem: '4B', Mlbend: '2B-1' },
};
const LOADS = { P: -25000, Vc: 22000, Vl: 69000, Mc: -45e6, Ml: 78e6, Mt: 101e6 };
const INTERIOR = [[5, 15, 50], [15, 50, 100], [50, 100, 300]];

const ordinate = (figure, gamma, beta) =>
  evaluateEmp1Wrc537DatasetCurve(selectEmp1Wrc537CylindricalDatasetCurve({ figure, variant: 'ORIGINAL', gamma }), beta).y;

const weight = (coordinate, gamma, lower, upper) => {
  if (coordinate === 'LINEAR_GAMMA') return (gamma - lower) / (upper - lower);
  if (coordinate === 'RECIPROCAL_GAMMA') return (1 / gamma - 1 / lower) / (1 / upper - 1 / lower);
  return (Math.log(gamma) - Math.log(lower)) / (Math.log(upper) - Math.log(lower));
};

function ordinateSet(gamma, beta, coordinate, lower, upper) {
  const set = {};
  for (const family of ['circ', 'long']) {
    set[family] = {};
    for (const [key, figure] of Object.entries(FIGURE_MAP[family])) {
      set[family][key] = Math.abs(coordinate === undefined
        ? ordinate(figure, gamma, beta)
        : (1 - weight(coordinate, gamma, lower, upper)) * ordinate(figure, lower, beta)
          + weight(coordinate, gamma, lower, upper) * ordinate(figure, upper, beta));
    }
  }
  return set;
}

function envelope(gamma, beta, curveOrdinates) {
  const shellThickness = 25;
  const meanRadius = gamma * shellThickness;
  return evaluateEmp1Wrc537CylindricalTable5({
    geometry: { meanRadius, shellThickness, attachmentRadius: beta * meanRadius / 0.875, beta },
    stressConcentration: { Kn: 1, Kb: 1 },
    loads: LOADS,
    curveOrdinates,
  }).extremaScope.evaluatedEightPointEnvelope.stressIntensity;
}

const betas = [];
for (let beta = 0.05; beta <= 0.5001; beta += 0.025) betas.push(Number(beta.toFixed(3)));

const measured = {};
for (const coordinate of ['LOG_GAMMA', 'LINEAR_GAMMA']) {
  const errors = [];
  for (const [lower, target, upper] of INTERIOR) {
    for (const beta of betas) {
      const truth = envelope(target, beta, ordinateSet(target, beta));
      const predicted = envelope(target, beta, ordinateSet(target, beta, coordinate, lower, upper));
      errors.push((predicted - truth) / truth * 100);
    }
  }
  const absolute = errors.map(Math.abs).sort((a, b) => a - b);
  const under = errors.filter((value) => value < 0);
  measured[coordinate] = {
    cases: errors.length,
    median: absolute[Math.floor(absolute.length / 2)],
    p95: absolute[Math.floor(absolute.length * 0.95)],
    max: absolute[absolute.length - 1],
    unconservativeCases: under.length,
    worstUnconservative: under.length ? Math.min(...under) : 0,
  };
}

for (const [coordinate, stats] of Object.entries(measured)) {
  console.log(`${coordinate.padEnd(13)} n=${stats.cases}  median |err| ${stats.median.toFixed(1)}%`
    + `  p95 ${stats.p95.toFixed(1)}%  max ${stats.max.toFixed(1)}%`
    + `  unconservative ${stats.unconservativeCases}/${stats.cases}`
    + ` (worst ${stats.worstUnconservative.toFixed(1)}%)`);
}

// The property the default was selected for: linear must not understate the envelope.
assert.equal(
  measured.LINEAR_GAMMA.unconservativeCases, 0,
  'LINEAR_GAMMA is the default because it did not understate the envelope in any leave-one-out case; '
  + 'if that no longer holds the default choice must be revisited',
);
// And the trade it was accepted against: log is more accurate but does understate.
assert.ok(measured.LOG_GAMMA.median < measured.LINEAR_GAMMA.median,
  'LOG_GAMMA is expected to remain the more accurate coordinate on average');
assert.ok(measured.LOG_GAMMA.unconservativeCases > 0,
  'LOG_GAMMA is expected to retain unconservative cases, which is why it is not the default');

// Recorded policy figures must stay in step with what is actually measured.
const recorded = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.coordinateAccuracyBasis;
assert.equal(recorded.cases, measured.LOG_GAMMA.cases);
assert.equal(recorded.LOG_GAMMA.unconservativeCases, measured.LOG_GAMMA.unconservativeCases);
assert.equal(recorded.LINEAR_GAMMA.unconservativeCases, measured.LINEAR_GAMMA.unconservativeCases);
for (const [coordinate, stats] of Object.entries(measured)) {
  assert.ok(Math.abs(recorded[coordinate].medianAbsolutePercent - stats.median) < 0.1,
    `${coordinate} recorded median drifted from measured`);
  assert.ok(Math.abs(recorded[coordinate].p95AbsolutePercent - stats.p95) < 0.1,
    `${coordinate} recorded p95 drifted from measured`);
}
assert.equal(EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.defaultCoordinate, 'LINEAR_GAMMA');

console.log('EMP1_WRC537_GAMMA_INTERPOLATION_ACCURACY_CHECK_PASS');
