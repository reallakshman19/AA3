import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMP1_PVELITE_BENCHMARK_PROGRAMME,
  EMP1_PVELITE_BENCHMARK_PROGRAMME_SCHEMA,
} from '../src/core/emp1/emp1-pvelite-benchmark-programme.js';

const programme = EMP1_PVELITE_BENCHMARK_PROGRAMME;

assert.equal(programme.schema, EMP1_PVELITE_BENCHMARK_PROGRAMME_SCHEMA);
assert.equal(programme.comparator.id, 'PV_ELITE');
assert.equal(
  programme.comparator.authorityRole,
  'INDEPENDENT_COMMERCIAL_SOFTWARE_COMPARISON_NOT_WRC_METHOD_AUTHORITY',
);

assert.equal(programme.reference.state, 'REFERENCE_NOT_AVAILABLE');
assert.equal(programme.reference.sourceCustodyState, 'SOURCE_NOT_RETAINED');
assert.equal(programme.reference.expectedValuesState, 'NOT_AVAILABLE');
assert.equal(programme.reference.reportIdentity, null);
assert.equal(programme.reference.reportSha256, null);
assert.equal(programme.reference.inputIdentity, null);
assert.equal(programme.reference.inputSha256, null);

assert.equal(programme.primaryCase.shellFamily, 'CYLINDRICAL');
assert.equal(programme.primaryCase.attachmentClass, 'SOURCE_QUALIFIED_ROUND_CLASS');
assert.equal(programme.primaryCase.variant, 'ORIGINAL');
assert.deepEqual(programme.primaryCase.gamma, {
  selection: 'EXACT_SOURCE_ROW',
  value: 5,
});
assert.equal(programme.primaryCase.betaRequirement, 'WITHIN_CURRENT_AUTHORIZED_DOMAIN');
assert.equal(programme.primaryCase.differentialPressure.condition, 'ZERO_DIFFERENTIAL_PRESSURE');
assert.equal(programme.primaryCase.differentialPressure.value, 0);
assert.equal(programme.primaryCase.stressMultipliers.Kn, 1);
assert.equal(programme.primaryCase.stressMultipliers.Kb, 1);
assert.deepEqual(
  programme.primaryCase.recoveryPoints,
  ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl'],
);
assert.equal(programme.primaryCase.routeIntent, 'EXISTING_ENGINEERING_USE_AUTHORIZED_GAMMA5_ROUTE');
assert.equal(programme.primaryCase.interpolationPolicy, 'NOT_USED_IN_PRIMARY_CASE');

const requiredSourceFields = new Set(programme.sourceFreeze.requiredFields);
for (const field of [
  'PV_ELITE_PRODUCT_VERSION',
  'EXACT_REPORT_IDENTITY',
  'EXACT_REPORT_SHA256',
  'UNIT_SYSTEM',
  'LOCAL_STRESS_METHOD_AND_EDITION_CONTEXT',
  'GEOMETRY_AND_DIMENSION_BASIS',
  'SHELL_THICKNESS_AND_RADIUS_BASIS',
  'ATTACHMENT_GEOMETRY',
  'LOCAL_WRC_LOADS_AND_COORDINATE_REFERENCE',
  'PRESSURE_INCLUSION_AND_PRESSURE_THRUST_SETTINGS',
  'KN_KB_SETTINGS',
  'RECOVERY_POINT_IDENTITIES',
  'REPORTED_LOCAL_STRESSES_OR_INTENSITIES',
  'SOURCE_DISPLAY_PRECISION',
]) {
  assert.ok(requiredSourceFields.has(field), `missing source-freeze requirement: ${field}`);
}
assert.ok(
  programme.sourceFreeze.conditionalFields.includes(
    'EXACT_INPUT_IDENTITY_AND_SHA256_WHEN_SEPARATELY_EXPORTED',
  ),
);
assert.equal(programme.sourceFreeze.mustCompleteBeforeCorrespondingEmpObservation, true);
assert.equal(programme.sourceFreeze.expectedValuesMustCarryStableSourceLocators, true);

assert.equal(programme.antiCircularity.expectedValuesMustBeFrozenBeforeEmpObservation, true);
assert.equal(programme.antiCircularity.productionOutputMaySelectExpectedValues, false);
assert.equal(programme.antiCircularity.productionOutputMayChooseDefinition, false);
assert.equal(programme.antiCircularity.toleranceMustBeFrozenBeforeEmpObservation, true);
assert.equal(programme.antiCircularity.productionOutputMaySelectTolerance, false);

assert.equal(programme.tolerancePolicy.state, 'UNRESOLVED_MUST_FREEZE_BEFORE_EMP_OBSERVATION');
assert.equal(programme.tolerancePolicy.value, null);
assert.equal(programme.tolerancePolicy.basis, null);
assert.equal(
  programme.tolerancePolicy.qualificationIfUnresolved,
  'BLOCKED_TOLERANCE_BASIS_UNRESOLVED',
);
assert.equal(programme.tolerancePolicy.cauxThreePercentMayBeCopiedByDefault, false);

assert.equal(programme.downstreamBoundary.codeComplianceState, 'NOT_ASSESSED');
assert.equal(programme.downstreamBoundary.compareLocalHostShellQuantitiesOnly, true);
assert.equal(programme.downstreamBoundary.downstreamPvEliteCodeChecksInScope, false);

for (const field of [
  'wrcMethodAuthority',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
  'codeComplianceAuthorized',
  'releaseAuthorityGranted',
]) {
  assert.equal(programme.authority[field], false, `authority leak: ${field}`);
}
for (const field of [
  'createsReferenceValues',
  'createsToleranceValue',
  'createsWrcMethodAuthority',
  'createsEngineeringUseAuthority',
  'createsProductionAuthority',
  'createsCodeComplianceAuthority',
  'createsReleaseAuthority',
]) {
  assert.equal(programme.authorityBoundary[field], false, `programme authority leak: ${field}`);
}
assert.equal(programme.authorityBoundary.programmeOnly, true);
assert.ok(Object.isFrozen(programme));
assert.ok(Object.isFrozen(programme.primaryCase));
assert.ok(Object.isFrozen(programme.primaryCase.recoveryPoints));
assert.ok(Object.isFrozen(programme.sourceFreeze.requiredFields));

assert.equal('expectedValues' in programme.reference, false);
assert.equal('emp1Values' in programme.reference, false);
assert.equal('tolerance' in programme.reference, false);

const source = readFileSync(
  new URL('../src/core/emp1/emp1-pvelite-benchmark-programme.js', import.meta.url),
  'utf8',
);
assert.doesNotMatch(source, /^\s*import\s/m, 'programme owner must remain dependency-free');
for (const forbidden of ['runEmp1(', 'evaluateEmp1', 'semanticHash(', 'reconstructResultHashes']) {
  assert.ok(
    !source.includes(forbidden),
    `programme must not gain execution/hash authority dependency: ${forbidden}`,
  );
}

console.log('EMP1_PVELITE_BENCHMARK_PROGRAMME_CHECK_PASS');
