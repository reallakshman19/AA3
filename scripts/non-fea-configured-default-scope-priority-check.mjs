#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
  compareConfiguredDefaultScopePriority,
  configuredDefaultScopePriority,
  createNonFeaConfiguredDefaultProvider,
} from '../src/workspace/project-data/non-fea-configured-default-provider.js';

const sourceModel = {
  components: [{
    componentKey: 'COMP-1',
    sourceEntityId: 'SRC-COMP-1',
    type: 'VALVE',
    posId: 'POS-1',
    nominalBoreMm: 100,
    pipingClass: 'CLASS-A',
    identity: {
      posId: 'POS-1',
      lineId: 'L-100',
      branchId: 'B-10',
      systemId: 'SYS-1',
      zoneId: 'ZONE-1',
      pipingClass: 'CLASS-A',
      nominalBoreMm: 100,
    },
  }],
  supports: [],
};

assert.equal(NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE, 'ISSUE_1321_SCOPE_PRECEDENCE_V1');
assert.ok(compareConfiguredDefaultScopePriority(
  configuredDefaultScopePriority({ lineIds: ['L-100'] }),
  configuredDefaultScopePriority({ systemIds: ['SYS-1'], zoneIds: ['ZONE-1'] }),
) > 0, 'line scope must outrank broader system+zone scope regardless of raw key count');
assert.ok(compareConfiguredDefaultScopePriority(
  configuredDefaultScopePriority({ pipingClasses: ['CLASS-A'], nominalBoreMm: [100] }),
  configuredDefaultScopePriority({ componentTypes: ['VALVE'], nominalBoreMm: [100] }),
) > 0, 'piping-class+NB must outrank component-type+NB');
assert.ok(compareConfiguredDefaultScopePriority(
  configuredDefaultScopePriority({ entityIds: ['COMP-1'] }),
  configuredDefaultScopePriority({ posIds: ['POS-1'], lineIds: ['L-100'], branchIds: ['B-10'] }),
) > 0, 'exact entity must outrank any lower-tier multi-key scope');

checkWinner(
  [
    scoped('SYSTEM-ZONE', 180000, { systemIds: ['SYS-1'], zoneIds: ['ZONE-1'] }),
    scoped('LINE', 200000, { lineIds: ['L-100'] }),
  ],
  'LINE',
  200000,
);

checkWinner(
  [
    scoped('TYPE-NB', 190000, { componentTypes: ['VALVE'], nominalBoreMm: [100] }),
    scoped('CLASS-NB', 205000, { pipingClasses: ['CLASS-A'], nominalBoreMm: [100] }),
  ],
  'CLASS-NB',
  205000,
);

checkWinner(
  [
    scoped('POS-LINE-BRANCH', 215000, {
      posIds: ['POS-1'], lineIds: ['L-100'], branchIds: ['B-10'],
    }),
    scoped('ENTITY', 220000, { entityIds: ['COMP-1'] }),
  ],
  'ENTITY',
  220000,
);

const conflict = provider([
  scoped('LINE-CONFLICT-A', 200000, { lineIds: ['L-100'] }),
  scoped('LINE-CONFLICT-B', 210000, { lineIds: ['L-100'] }),
]);
assert.ok(conflict.blockers.some((row) => row.code === 'CONFIGURED_DEFAULT_SCOPE_CONFLICT'));
assert.equal(conflict.records.length, 0, 'equal effective priority with unequal values must fail closed');

const identical = provider([
  scoped('LINE-SAME-B', 200000, { lineIds: ['L-100'] }),
  scoped('LINE-SAME-A', 200000, { lineIds: ['L-100'] }),
]);
assert.deepEqual(identical.blockers, []);
assert.equal(identical.records[0].evidence.defaultId, 'LINE-SAME-A',
  'identical equal-priority defaults canonicalize deterministically by default ID');
assert.equal(
  identical.records[0].evidence.scopePrecedence,
  NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
);
assert.deepEqual(
  identical.records[0].evidence.scopePriority,
  configuredDefaultScopePriority({ lineIds: ['L-100'] }),
);

console.log(JSON.stringify({
  status: 'PASS',
  precedence: NON_FEA_CONFIGURED_DEFAULT_SCOPE_PRECEDENCE,
  lineBeatsSystemZone: true,
  pipingClassNbBeatsComponentTypeNb: true,
  entityBeatsLowerTierMultiKeyScope: true,
  equalPriorityConflictFailsClosed: true,
  identicalEqualPriorityCanonicalizes: true,
}, null, 2));

function checkWinner(defaults, defaultId, value) {
  const result = provider(defaults);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].selectorKey, 'COMP-1');
  assert.equal(result.records[0].evidence.defaultId, defaultId);
  assert.equal(result.records[0].value, value);
}

function provider(defaults) {
  return createNonFeaConfiguredDefaultProvider({
    profile: {
      revision: 12,
      qualificationPolicy: {
        configuredDefaults: {
          value: {
            schema: 'non-fea-configured-default-policy/v1',
            defaults,
          },
          evidence: {
            source: 'PROJECT-DATA-CONFIGURED-DEFAULTS',
            sourceHash: 'scope-priority-fixture',
          },
          approved: true,
        },
      },
    },
    sourceModel,
    requestedMethods: ['THERMAL_FREE_DISPLACEMENT'],
  });
}

function scoped(defaultId, value, scope) {
  return {
    defaultId,
    fieldId: 'ELASTIC_MODULUS',
    value,
    unit: 'MPa',
    basis: `Issue #1321 scope-priority fixture for ${defaultId}`,
    allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
    scope,
  };
}
