#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  lafeaSupportedUnits,
  lafeaUnitFactor,
} from '../src/core/lafea-common-input/units.js';
import {
  canonicalizeUnits as canonicalizeFoundationUnits,
  convertScalar,
} from '../src/core/local-stress/units.js';
import {
  canonicalizeUnits as canonicalizeContinuumUnits,
  convert as convertContinuum,
} from '../src/core/local-continuum/units.js';

assert.equal(lafeaUnitFactor('length', 'm'), 1000);
assert.equal(lafeaUnitFactor('force', 'kN'), 1000);
assert.equal(lafeaUnitFactor('stress', 'Pa'), 1e-6);
assert.equal(lafeaUnitFactor('modulus', 'GPa'), 1000);
assert.equal(lafeaUnitFactor('temperature', 'K'), null);
assert.equal(lafeaUnitFactor('length', 'ft'), null);
assert.deepEqual(lafeaSupportedUnits('modulus'), ['Pa', 'MPa', 'GPa']);
assert.ok(Object.isFrozen(lafeaSupportedUnits('stress')));

const foundation = canonicalizeFoundationUnits({
  length: 'm',
  force: 'kN',
  moment: 'kN*m',
  pressure: 'Pa',
  stress: 'kPa',
});
assert.deepEqual(foundation.conversionFactors, {
  length: 1000,
  force: 1000,
  moment: 1_000_000,
  pressure: 1e-6,
  stress: 1e-3,
});
assert.equal(convertScalar(2, 'length', foundation, 'length'), 2000);
assert.equal(convertScalar(3, 'moment', foundation, 'moment'), 3_000_000);

const momentAliases = ['N·mm', 'N*mm', 'N·m', 'N*m', 'kN·m', 'kN*m'];
for (const moment of momentAliases) {
  const units = canonicalizeFoundationUnits({
    length: 'mm', force: 'N', moment, pressure: 'MPa', stress: 'MPa',
  });
  assert.notEqual(units.conversionFactors.moment, null);
}

const continuum = canonicalizeContinuumUnits({
  length: 'm',
  force: 'kN',
  stress: 'Pa',
  modulus: 'GPa',
});
assert.deepEqual(
  {
    length: continuum.conversionFactors.length,
    force: continuum.conversionFactors.force,
    stress: continuum.conversionFactors.stress,
    modulus: continuum.conversionFactors.modulus,
  },
  { length: 1000, force: 1000, stress: 1e-6, modulus: 1000 },
);
assert.equal(
  continuum.conversionFactors.bodyForceIntensity,
  continuum.conversionFactors.stress / continuum.conversionFactors.length,
);
assert.equal(convertContinuum(2, 'modulus', continuum, 'modulus'), 2000);
assert.equal(convertContinuum(4, 'stress', continuum, 'stress'), 4e-6);

assert.throws(
  () => canonicalizeFoundationUnits({
    length: 'ft', force: 'N', moment: 'N·mm', pressure: 'MPa', stress: 'MPa',
  }),
  (error) => error?.code === 'UNSUPPORTED_UNIT',
);
assert.throws(
  () => canonicalizeContinuumUnits({
    length: 'mm', force: 'N', stress: 'psi', modulus: 'MPa',
  }),
  (error) => error?.code === 'UNSUPPORTED_UNIT',
);
assert.throws(
  () => canonicalizeContinuumUnits({ length: 'mm', force: 'N', stress: 'MPa' }),
);

console.log(JSON.stringify({
  schema: 'lafea-common-input-units-check/v1',
  check: 'lafea-common-input-units',
  status: 'PASS',
  analyticalConsumer: 'LAFEA.1/local-stress',
  feaConsumer: 'LAFEA.3/local-continuum',
  sharedDimensions: ['length', 'force', 'stress'],
  stageSpecificDimensionsRetained: {
    foundation: ['moment', 'pressure'],
    continuum: ['modulus', 'bodyForceIntensity'],
  },
  hiddenDefaults: false,
  acceptedUnitBroadening: false,
}));
