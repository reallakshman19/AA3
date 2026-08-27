#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNonFeaConfiguredDefaultProvider,
  compareConfiguredDefaultScopePriority,
  configuredDefaultScopePriority,
} from '../src/workspace/project-data/non-fea-configured-default-provider.js';
import {
  createCanonicalScopedCalculationDefaultScope,
  createScopedCalculationDefaultDelete,
  createScopedCalculationDefaultUpsert,
  createScopedCalculationDefaultsModel,
  listScopedCalculationDefaultFields,
  NON_FEA_SCOPED_CALCULATION_DEFAULTS_SOURCE,
} from '../src/workspace/project-data/non-fea-scoped-calculation-defaults-model.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';

const sourceModel = {
  components: [
    component('COMP-1', 'POS-1', 'L-100', 'B-10', 'SYS-1', 'ZONE-1', 'CLASS-A', 'VALVE', 100),
    component('COMP-2', 'POS-2', 'L-200', 'B-20', 'SYS-1', 'ZONE-1', 'CLASS-A', 'PIPE', 100),
  ],
  supports: [],
};

const empty = createEmptyProjectDataProfile();
const initialModel = createScopedCalculationDefaultsModel(empty);
const fields = listScopedCalculationDefaultFields();
assert.equal(fields.length, 17, 'D2 must expose only provider-materializable scoped numeric fields');
assert.equal(initialModel.rows.length, 0);
assert.equal(initialModel.policyState, 'NOT_CONFIGURED');
assert.ok(initialModel.unavailableScopeKinds.some((row) => row.scopeKind === 'SUPPORT_KIND'),
  'support-kind must stay unavailable until a support-target configured-default field exists');
assert.equal(field('PIPE_OUTER_DIAMETER').inputUnit, 'mm');
assert.equal(field('PIPE_WALL_THICKNESS').inputUnit, 'mm');
assert.equal(field('ELASTIC_MODULUS').inputUnit, 'MPa');
assert.equal(field('MATERIAL_DENSITY').inputUnit, 'kg/m³');
assert.equal(fields.some((row) => row.fieldId === 'CORROSION_ALLOWANCE'), false,
  'project-level/non-materialized fields must not appear in scoped authoring');
assert.equal(fields.some((row) => row.fieldId === 'THERMAL_EXPANSION_COEFFICIENT'), false,
  'a registry default that the provider cannot materialize must not appear');

assert.deepEqual(createCanonicalScopedCalculationDefaultScope('GLOBAL'), {});
assert.deepEqual(createCanonicalScopedCalculationDefaultScope('LINE', { values: 'L-200, L-100, L-100' }), {
  lineIds: ['L-100', 'L-200'],
});
assert.deepEqual(createCanonicalScopedCalculationDefaultScope('PIPING_CLASS_NB', {
  values: ['CLASS-B', 'CLASS-A'], nominalBoreMm: '150, 100, 100',
}), {
  pipingClasses: ['CLASS-A', 'CLASS-B'], nominalBoreMm: [100, 150],
});
assert.throws(() => createCanonicalScopedCalculationDefaultScope('LINE', { values: '' }), /at least one exact identifier/u);
assert.throws(() => createCanonicalScopedCalculationDefaultScope('NOMINAL_BORE', { nominalBoreMm: '0' }), /positive finite/u);

let profile = apply(empty, createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'ELASTIC-GLOBAL', fieldId: 'ELASTIC_MODULUS', value: 180000,
  basis: 'Global elastic screening fallback', scopeKind: 'GLOBAL', allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
let provider = createNonFeaConfiguredDefaultProvider({
  profile, sourceModel, requestedMethods: ['THERMAL_FREE_DISPLACEMENT'],
});
assert.deepEqual(provider.blockers, []);
assert.equal(provider.records.length, 2);
assert.ok(provider.records.every((row) => row.unit === 'MPa'));
assert.ok(provider.records.every((row) => row.evidence.defaultId === 'ELASTIC-GLOBAL'));
assert.equal(profile.qualificationPolicy.configuredDefaults.evidence.source, NON_FEA_SCOPED_CALCULATION_DEFAULTS_SOURCE);
assert.equal(profile.qualificationPolicy.configuredDefaults.evidence.authority, 'PROJECT_POLICY');

profile = apply(profile, createScopedCalculationDefaultUpsert(profile, {
  defaultId: 'ELASTIC-SYSTEM', fieldId: 'ELASTIC_MODULUS', value: 190000,
  basis: 'System screening fallback', scopeKind: 'SYSTEM', scopeValues: ['SYS-1'],
  allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
profile = apply(profile, createScopedCalculationDefaultUpsert(profile, {
  defaultId: 'ELASTIC-LINE', fieldId: 'ELASTIC_MODULUS', value: 200000,
  basis: 'Line screening fallback', scopeKind: 'LINE', scopeValues: ['L-100'],
  allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
provider = createNonFeaConfiguredDefaultProvider({
  profile, sourceModel, requestedMethods: ['THERMAL_FREE_DISPLACEMENT'],
});
assert.deepEqual(provider.blockers, []);
assert.equal(record(provider, 'COMP-1', 'ELASTIC_MODULUS').evidence.defaultId, 'ELASTIC-LINE');
assert.equal(record(provider, 'COMP-1', 'ELASTIC_MODULUS').value, 200000);
assert.equal(record(provider, 'COMP-2', 'ELASTIC_MODULUS').evidence.defaultId, 'ELASTIC-SYSTEM');
assert.ok(compareConfiguredDefaultScopePriority(
  configuredDefaultScopePriority({ lineIds: ['L-100'] }),
  configuredDefaultScopePriority({ systemIds: ['SYS-1'] }),
) > 0, 'D2 must preserve provider line-over-system precedence');

let conflictProfile = createEmptyProjectDataProfile();
conflictProfile = apply(conflictProfile, createScopedCalculationDefaultUpsert(conflictProfile, {
  defaultId: 'LINE-CONFLICT-A', fieldId: 'ELASTIC_MODULUS', value: 200000,
  basis: 'Conflict A', scopeKind: 'LINE', scopeValues: ['L-100'], allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
conflictProfile = apply(conflictProfile, createScopedCalculationDefaultUpsert(conflictProfile, {
  defaultId: 'LINE-CONFLICT-B', fieldId: 'ELASTIC_MODULUS', value: 210000,
  basis: 'Conflict B', scopeKind: 'LINE', scopeValues: ['L-100'], allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
const conflict = createNonFeaConfiguredDefaultProvider({
  profile: conflictProfile, sourceModel, requestedMethods: ['THERMAL_FREE_DISPLACEMENT'],
});
assert.ok(conflict.blockers.some((row) => row.code === 'CONFIGURED_DEFAULT_SCOPE_CONFLICT'));
assert.equal(conflict.records.some((row) => row.selectorKey === 'COMP-1'), false,
  'equal-priority unequal values must remain fail-closed');

let unmatchedProfile = createEmptyProjectDataProfile();
unmatchedProfile = apply(unmatchedProfile, createScopedCalculationDefaultUpsert(unmatchedProfile, {
  defaultId: 'POS-NOT-THERE', fieldId: 'ELASTIC_MODULUS', value: 200000,
  basis: 'Exact POS falsifier', scopeKind: 'POS', scopeValues: ['POS-404'], allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}));
const unmatched = createNonFeaConfiguredDefaultProvider({
  profile: unmatchedProfile, sourceModel, requestedMethods: ['THERMAL_FREE_DISPLACEMENT'],
});
assert.ok(unmatched.blockers.some((row) => row.code === 'CONFIGURED_DEFAULT_SCOPE_UNMATCHED'));
assert.equal(unmatched.records.length, 0);

assert.throws(() => createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'BAD-SUPPORT-KIND', fieldId: 'ELASTIC_MODULUS', value: 200000, basis: 'Must fail',
  scopeKind: 'SUPPORT_KIND', scopeValues: ['REST'], allowedMethods: ['THERMAL_FREE_DISPLACEMENT'],
}), /not applicable/u);
assert.throws(() => createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'BAD-FIELD', fieldId: 'CORROSION_ALLOWANCE', value: 0, basis: 'Must fail', scopeKind: 'GLOBAL',
}), /not authorable/u);
assert.throws(() => createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'BAD-E', fieldId: 'ELASTIC_MODULUS', value: 0, basis: 'Must fail', scopeKind: 'GLOBAL',
}), /greater than zero/u);
assert.throws(() => createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'BAD-METHOD', fieldId: 'ELASTIC_MODULUS', value: 200000, basis: 'Must fail', scopeKind: 'GLOBAL',
  allowedMethods: ['WEIGHT_AND_GRAVITY'],
}), /not consumed/u);
const zeroComponentMass = createScopedCalculationDefaultUpsert(empty, {
  defaultId: 'ZERO-COMPONENT', fieldId: 'COMPONENT_WEIGHT', value: 0,
  basis: 'Explicit zero component screening default', scopeKind: 'COMPONENT_TYPE', scopeValues: ['GASK'],
  allowedMethods: ['WEIGHT_AND_GRAVITY'],
});
assert.equal(zeroComponentMass.value.defaults[0].value, 0,
  'explicit non-negative zero component mass must remain authorable');

const custom = withPolicy(empty, [{
  defaultId: 'CUSTOM-MULTI', fieldId: 'ELASTIC_MODULUS', value: 200000, unit: 'MPa', basis: 'Custom legacy scope',
  allowedMethods: ['THERMAL_FREE_DISPLACEMENT'], scope: { lineIds: ['L-100'], zoneIds: ['ZONE-1'] },
}]);
const customRow = createScopedCalculationDefaultsModel(custom).rows[0];
assert.equal(customRow.editable, false);
assert.equal(customRow.scopeKind, 'CUSTOM_ADVANCED');
assert.throws(() => createScopedCalculationDefaultDelete(custom, 'CUSTOM-MULTI'), /protected/u);

const ignoredField = withPolicy(empty, [{
  defaultId: 'CORROSION-SCOPED', fieldId: 'CORROSION_ALLOWANCE', value: 0, unit: 'm', basis: 'Registry-valid but not provider-materialized',
  allowedMethods: ['SUSTAINED_STRESS'], scope: { lineIds: ['L-100'] },
}]);
assert.equal(createScopedCalculationDefaultsModel(ignoredField).rows[0].editable, false);

const wrongUnit = withPolicy(empty, [{
  defaultId: 'ELASTIC-PA', fieldId: 'ELASTIC_MODULUS', value: 2e11, unit: 'Pa', basis: 'Unexpected provider unit',
  allowedMethods: ['THERMAL_FREE_DISPLACEMENT'], scope: { lineIds: ['L-100'] },
}]);
assert.equal(createScopedCalculationDefaultsModel(wrongUnit).rows[0].editable, false);

const beforeDeleteHash = profile.qualificationPolicy.configuredDefaults.evidence.configuredDefaultPolicySemanticHash;
const deletePlan = createScopedCalculationDefaultDelete(profile, 'ELASTIC-LINE');
assert.equal(deletePlan.value.defaults.some((row) => row.defaultId === 'ELASTIC-LINE'), false);
assert.equal(deletePlan.value.defaults.some((row) => row.defaultId === 'ELASTIC-SYSTEM'), true);
assert.equal(deletePlan.evidence.previousPolicySemanticHash, beforeDeleteHash);
assert.match(deletePlan.evidence.action, /^delete:/u);

const viewSource = await read('../src/workspace/project-data/non-fea-calculation-defaults-view.js');
assert.match(viewSource, /data-role="calculation-defaults-scoped"/u);
assert.match(viewSource, /Exact-scope authoring/u);
assert.match(viewSource, /data-scoped-scope-kind/u);
assert.match(viewSource, /data-scoped-methods/u);
assert.match(viewSource, /renderNonFeaProjectDataViewV2/u,
  'raw/custom authority editor must remain reachable');
assert.doesNotMatch(viewSource, /Scope editor[\s\S]*D2 successor/u,
  'D2 must replace the D1 scope-editor placeholder');

console.log(JSON.stringify({
  check: 'non-fea-calculation-defaults-scoped-ux',
  status: 'PASS',
  authorableProviderFields: fields.length,
  providerNativeUnits: true,
  canonicalScopeAuthoring: true,
  targetCompatibleScopes: true,
  supportKindDeferredUntilSupportTargetField: true,
  lineBeatsSystem: true,
  equalPriorityConflictFailsClosed: true,
  unmatchedPosFailsClosed: true,
  customRowsProtected: true,
  nonMaterializedFieldsProtected: true,
  unexpectedUnitsProtected: true,
  policyHashCustodyPreserved: true,
}, null, 2));

function field(fieldId) {
  const value = fields.find((row) => row.fieldId === fieldId);
  assert.ok(value, `missing scoped field ${fieldId}`);
  return value;
}
function apply(profileValue, plan) {
  return replaceProjectDataValue(profileValue, plan.projectDataPath, plan.value, plan.evidence, plan.approved);
}
function record(providerValue, targetId, fieldId) {
  const value = providerValue.records.find((row) => row.selectorKey === targetId && row.fieldId === fieldId);
  assert.ok(value, `missing provider record ${targetId}/${fieldId}`);
  return value;
}
function component(componentKey, posId, lineId, branchId, systemId, zoneId, pipingClass, type, nominalBoreMm) {
  return {
    componentKey, sourceEntityId: `SRC-${componentKey}`, posId, pipingClass, type, nominalBoreMm,
    identity: { posId, lineId, branchId, systemId, zoneId, pipingClass, nominalBoreMm },
  };
}
function withPolicy(profileValue, defaults) {
  return replaceProjectDataValue(profileValue, 'qualificationPolicy.configuredDefaults', {
    schema: 'non-fea-configured-default-policy/v1', defaults,
  }, { source: 'Fixture configured-default policy', authority: 'PROJECT_POLICY' }, true);
}
async function read(relativePath) { return readFile(new URL(relativePath, import.meta.url), 'utf8'); }
