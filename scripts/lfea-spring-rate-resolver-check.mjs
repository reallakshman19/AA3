import assert from 'node:assert/strict';
import {
  declaredLengthToSiFactor,
  resolveSpringRate,
  springRateToSiFactor,
} from '../src/core/linear-piping-analysis-consumer/restraint-spring-rate.js';

const breakRate = process.argv.includes('--deliberate-break')
  || process.argv.includes('--deliberate-break-rate');
const breakUnresolved = process.argv.includes('--deliberate-break-unresolved');

assert.equal(declaredLengthToSiFactor('m'), 1);
assert.equal(declaredLengthToSiFactor('cm'), 1e-2);
assert.equal(declaredLengthToSiFactor('mm'), 1e-3);
assert.equal(declaredLengthToSiFactor('in'), 0.0254);
assert.equal(declaredLengthToSiFactor('ft'), 0.3048);
assert.equal(declaredLengthToSiFactor('furlong'), null);

const nPerM = springRateToSiFactor({ scale: 1 }, 'm');
const nPerCm = springRateToSiFactor({ scale: 1 }, 'cm');
const nPerMm = springRateToSiFactor({ scale: 1 }, 'mm');
const lbfPerIn = springRateToSiFactor({ scale: 4.4482216152605 }, 'in');
assert.equal(nPerM, 1);
assert.equal(nPerCm, 100);
assert.equal(nPerMm, 1000);
assert.ok(Math.abs(lbfPerIn - 175.12683524647636) < 1e-12,
  `lbf/in factor must be 175.12683524647636 N/m, got ${lbfPerIn}`);
assert.equal(springRateToSiFactor(null, 'mm'), null);
assert.equal(springRateToSiFactor({ scale: Number.NaN }, 'mm'), null);
assert.equal(springRateToSiFactor({ scale: 1 }, 'furlong'), null);

// Reproduce the historical 1000x-soft failure at the resolver boundary only:
// factor 1 wrongly treats a declared N/mm number as if it were already N/m.
const resolved = resolveSpringRate(400, breakRate ? 1 : nPerMm);
assert.equal(resolved.stiffnessDeclared, 400);
assert.equal(resolved.stiffnessValue, 400000,
  '400 N/mm must resolve to 400000 N/m, never raw 400 N/m');
assert.equal(resolved.stiffnessUnitsResolvable, true);

// Reproduce the forbidden fallback for an unresolvable file unit. The declared
// number stays as evidence, but the usable stiffness must be withheld.
const unresolved = resolveSpringRate(400, breakUnresolved ? 1 : null);
assert.equal(unresolved.stiffnessDeclared, 400);
assert.equal(unresolved.stiffnessValue, null,
  'unresolved units must withhold the solver stiffness rather than assume factor 1');
assert.equal(unresolved.stiffnessUnitsResolvable, false);

console.log(JSON.stringify({
  check: 'lfea-spring-rate-resolver',
  status: 'PASS',
  factors: {
    'N/m': nPerM,
    'N/cm': nPerCm,
    'N/mm': nPerMm,
    'lbf/in': lbfPerIn,
  },
  declaredRate: resolved.stiffnessDeclared,
  resolvedRateNPerM: resolved.stiffnessValue,
  unresolvedValueWithheld: unresolved.stiffnessValue === null,
  deliberateBreakModes: {
    rate: '--deliberate-break / --deliberate-break-rate uses factor 1 for N/mm and must turn the 400000 N/m assertion red',
    unresolved: '--deliberate-break-unresolved uses factor 1 for unresolved units and must turn the withheld-value assertion red',
  },
}, null, 2));
