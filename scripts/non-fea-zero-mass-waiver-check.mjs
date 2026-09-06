#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  assertZeroMassWaiversAdmissible,
  createNonFeaZeroMassWaiverSet,
  zeroMassWaiverSetFromProfile,
  zeroMassWaiverSuggested,
} from '../src/workspace/engineering-loads/non-fea-zero-mass-waiver.js';

// A waiver without a stated reason is the unexplained zero this mechanism
// exists to replace, so it is refused at construction.
assert.throws(
  () => createNonFeaZeroMassWaiverSet({ waivers: [{ entityId: '=1/1' }] }),
  (error) => error.code === 'NON_FEA_ZERO_MASS_WAIVER_JUSTIFICATION_REQUIRED',
);
assert.throws(
  () => createNonFeaZeroMassWaiverSet({ waivers: [{ justification: 'massless' }] }),
  (error) => error.code === 'NON_FEA_ZERO_MASS_WAIVER_SELECTOR_INVALID',
);

const waiverSet = createNonFeaZeroMassWaiverSet({
  waivers: [
    { entityId: '=1/9', justification: 'Pressure gauge carries no weighable mass.' },
    { entityId: '=1/2', justification: 'Temperature instrument carries no weighable mass.' },
  ],
});
assert.deepEqual(waiverSet.waivedEntityIds, ['=1/2', '=1/9'], 'waived ids are canonically sorted');
assert.equal(
  waiverSet.semanticHash,
  createNonFeaZeroMassWaiverSet({
    waivers: [
      { entityId: '=1/2', justification: 'Temperature instrument carries no weighable mass.' },
      { entityId: '=1/9', justification: 'Pressure gauge carries no weighable mass.' },
    ],
  }).semanticHash,
  'the receipt hash is order-independent',
);

// Suggestion is description-driven, never type-driven: this dataset types a
// 900# angle control valve as INST, and a type rule would silently zero it.
assert.equal(zeroMassWaiverSuggested('PRESSURE GAUGE RF900#'), true);
assert.equal(zeroMassWaiverSuggested('TEMPERATURE INSTRUMENT'), true);
assert.equal(zeroMassWaiverSuggested('ANGLE CONTROL VALVE-HOLD'), false);
assert.equal(zeroMassWaiverSuggested('BLIND FLANGE 900#'), false);
assert.equal(zeroMassWaiverSuggested(''), false);

// A waiver would remove the component from the load path, so one covering a
// component that carries a real source moment must fail closed.
const auditRecords = [
  { entityId: '=1/2', explicitMoment: { magnitudeNm: 0 } },
  { entityId: '=1/9', explicitMoment: { magnitudeNm: 1200 } },
];
assert.deepEqual(
  assertZeroMassWaiversAdmissible(
    createNonFeaZeroMassWaiverSet({ waivers: [{ entityId: '=1/2', justification: 'Gauge.' }] }),
    auditRecords,
  ),
  [],
  'a waiver on a massless, moment-free component is admissible',
);
assert.deepEqual(
  assertZeroMassWaiversAdmissible(
    createNonFeaZeroMassWaiverSet({ waivers: [{ entityId: '=1/9', justification: 'Gauge.' }] }),
    auditRecords,
  ),
  [{ entityId: '=1/9', code: 'NON_FEA_ZERO_MASS_WAIVER_EXPLICIT_MOMENT_PRESENT' }],
);
assert.deepEqual(
  assertZeroMassWaiversAdmissible(
    createNonFeaZeroMassWaiverSet({ waivers: [{ entityId: '=1/404', justification: 'Gauge.' }] }),
    auditRecords,
  ),
  [{ entityId: '=1/404', code: 'NON_FEA_ZERO_MASS_WAIVER_ENTITY_UNKNOWN' }],
);

// An unapproved or absent Project Data entry waives nothing, so a project that
// has never declared a waiver behaves exactly as it did before.
assert.deepEqual(zeroMassWaiverSetFromProfile(null).waivedEntityIds, []);
assert.deepEqual(zeroMassWaiverSetFromProfile({}).waivedEntityIds, []);
assert.deepEqual(
  zeroMassWaiverSetFromProfile({
    loadCalculation: {
      zeroMassWaivers: { value: { '=1/2': { justification: 'Gauge.' } }, approved: false },
    },
  }).waivedEntityIds,
  [],
  'an unapproved waiver map waives nothing',
);
assert.deepEqual(
  zeroMassWaiverSetFromProfile({
    loadCalculation: {
      zeroMassWaivers: { value: { '=1/2': { justification: 'Gauge.' } }, approved: true },
    },
  }).waivedEntityIds,
  ['=1/2'],
);

console.log(JSON.stringify({
  check: 'non-fea-zero-mass-waiver',
  justificationRequired: true,
  selectorRequired: true,
  receiptHashOrderIndependent: true,
  suggestionIsDescriptionDriven: true,
  explicitMomentWaiverRejected: true,
  unknownEntityWaiverRejected: true,
  unapprovedProfileEntryWaivesNothing: true,
}, null, 2));
