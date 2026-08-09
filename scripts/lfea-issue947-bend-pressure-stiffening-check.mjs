#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  CAESAR_BEND_PMAX_FIELDS,
  resolveCaesarBendPressureStiffeningPressurePa,
} from '../src/core/fea-benchmarks/caesar-bend-pressure-authority.js';

assert.deepEqual(CAESAR_BEND_PMAX_FIELDS, [
  'PRESSURE1', 'PRESSURE2', 'PRESSURE3', 'PRESSURE4', 'PRESSURE5',
  'PRESSURE6', 'PRESSURE7', 'PRESSURE8', 'PRESSURE9',
]);

const bm4Bend1 = {
  PRESSURE1: 11600,
  PRESSURE2: 0,
  PRESSURE3: 0,
  PRESSURE4: 0,
  PRESSURE5: 0,
  PRESSURE6: 0,
  PRESSURE7: 0,
  PRESSURE8: 0,
  PRESSURE9: 0,
  HYDRO_PRESSURE: 22035,
};
assert.equal(resolveCaesarBendPressureStiffeningPressurePa(bm4Bend1), 11_600_000);
assert.equal(resolveCaesarBendPressureStiffeningPressurePa({
  ...bm4Bend1,
  PRESSURE4: 25000,
}), 25_000_000);
assert.equal(resolveCaesarBendPressureStiffeningPressurePa({
  PRESSURE1: -1.0101,
  PRESSURE2: 0,
  HYDRO_PRESSURE: 22035,
}), 0);
assert.equal(resolveCaesarBendPressureStiffeningPressurePa({}), 0);
assert.throws(
  () => resolveCaesarBendPressureStiffeningPressurePa({ PRESSURE1: 'not-a-number' }),
  /must be finite/,
);

console.log(JSON.stringify({
  check: 'lfea-issue947-bend-pressure-stiffening-authority',
  status: 'PASS',
  pressureFields: CAESAR_BEND_PMAX_FIELDS,
  bm4Bend1Pressure1Pa: 11_600_000,
  bm4Bend1HydroPressurePa: 22_035_000,
  selectedPmaxPa: resolveCaesarBendPressureStiffeningPressurePa(bm4Bend1),
  hydroParticipatesInPmax: false,
  selectionRule: 'PMAX_EQUALS_MAX_P1_THROUGH_P9',
}, null, 2));
