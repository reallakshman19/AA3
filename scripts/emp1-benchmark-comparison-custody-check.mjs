import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EMP1_BENCHMARK_COMPARISON_CUSTODY_SCHEMA,
  createEmp1BenchmarkComparisonCustody,
} from '../src/core/emp1/emp1-benchmark-comparison-custody.js';

const authority = () => ({
  wrcMethodAuthority: false,
  engineeringUseAuthorized: false,
  productionUseAuthorized: false,
  codeComplianceAuthorized: false,
  releaseAuthorityGranted: false,
});

const evidence = () => ({
  schema: 'emp1-benchmark-evidence/v1',
  benchmarkId: 'CAUX_2017_WRC01F_PP24_31_REFERENCE_V1',
  comparator: { id: 'CAUX', name: 'CAUx', version: '2017' },
  caseId: 'WRC01f-pp24-31-SUS',
  authorityRole: 'INDEPENDENT_BENCHMARK_REFERENCE_NOT_WRC_METHOD_AUTHORITY',
  sourceEvidence: {
    semanticHash: '741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe',
    sourceHash: 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e',
  },
  freezeEvidence: {
    expectedValuesFrozenBeforeEmpObservation: true,
    productionOutputUsedToChooseExpectedValues: false,
    productionOutputUsedToChooseDefinition: false,
    toleranceDerivedFromProduction: false,
    toleranceFrozenBeforeEmpObservation: true,
  },
  methodRelationship: {
    comparatorMethod: 'WRC107_MARCH_1979_B1_B2_CONTEXT',
    emp1Method: 'WRC537_2013_TABLE5_INTERPOLATED_GAMMA',
    comparisonOnly: true,
  },
  routeRelationship: {
    routeId: 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.INTERPOLATED_GAMMA.ZERO_DP',
    registered: true,
    engineeringUseAuthorized: false,
    comparisonQualificationAvailable: true,
    state: 'OUTSIDE_AUTHORIZED_ENGINEERING_ROUTE',
  },
  comparison: {
    state: 'COMPARISON_QUALIFIED',
    quantities: [
      {
        quantityId: 'P29_SUS_STRESS_INTENSITY:Au',
        referenceValue: 511,
        emp1Value: 511.2,
        referenceUnit: 'kPa',
        emp1Unit: 'kPa',
        absoluteDifference: 0.2,
        relativeDifferencePercent: 0.03913894324853229,
        tolerance: { kind: 'RELATIVE_PERCENT', value: 3, unit: '%' },
        toleranceBasis: 'EXISTING_FROZEN_POLICY',
        withinTolerance: true,
        status: 'WITHIN_TOLERANCE',
        sourceLocator: 'CAUx 2017 - WRC01f.pdf#page=29&point=Au',
      },
      {
        quantityId: 'P29_SUS_STRESS_INTENSITY:Du',
        referenceValue: 1754,
        emp1Value: 1780.4,
        referenceUnit: 'kPa',
        emp1Unit: 'kPa',
        absoluteDifference: 26.4,
        relativeDifferencePercent: 1.5051311288483467,
        tolerance: { kind: 'RELATIVE_PERCENT', value: 3, unit: '%' },
        toleranceBasis: 'EXISTING_FROZEN_POLICY',
        withinTolerance: true,
        status: 'WITHIN_TOLERANCE',
        sourceLocator: 'CAUx 2017 - WRC01f.pdf#page=29&point=Du',
      },
    ],
    summary: {
      comparedQuantities: 2,
      withinToleranceCount: 2,
      worstRelativeDifferencePercent: 1.5051311288483467,
      governingReferenceLocation: 'Du',
      governingEmp1Location: 'Du',
      governingLocationAgreement: true,
    },
  },
  limitations: ['DIRECT_PDF_REOBSERVATION_PENDING'],
  authority: authority(),
  authorityBoundary: {
    projectionOnly: true,
    createsWrcMethodAuthority: false,
    createsEngineeringUseAuthority: false,
    createsProductionAuthority: false,
    createsCodeComplianceAuthority: false,
    createsReleaseAuthority: false,
  },
});

const execution = () => ({
  kind: 'ACTUAL_EMP_COMPARISON_EXECUTION',
  executed: true,
  provenanceClass: 'DIRECT_EXECUTION_OBSERVATION',
  projectionInputSource: 'ACTUAL_EXECUTION_RESULT',
  repositoryCommit: '1234567890abcdef1234567890abcdef12345678',
  scriptPath: 'scripts/emp1-wrc537-caux-interpolated-comparison-check.mjs',
  executedAt: '2026-09-03T03:00:00Z',
  executor: 'faithful-checkout-runner',
  observedQuantityIds: [
    'P29_SUS_STRESS_INTENSITY:Au',
    'P29_SUS_STRESS_INTENSITY:Du',
  ],
  inferredWithoutExecution: false,
  approximateValues: false,
  derivedFromConsoleSummary: false,
  manuallyReconstructed: false,
});

const routeAuthority = () => ({
  snapshotHash: 'route-authority-hash-fixture',
  capturedAt: '2026-09-03T03:00:00Z',
  snapshot: {
    routeId: 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.INTERPOLATED_GAMMA.ZERO_DP',
    registered: true,
    engineeringUseAuthorized: false,
    comparisonQualificationAvailable: true,
  },
});

const input = () => ({
  custodyId: 'CAUX_WRC01F_SUS_ACTUAL_EXECUTION_V1',
  evidence: evidence(),
  execution: execution(),
  routeAuthority: routeAuthority(),
});

const retained = createEmp1BenchmarkComparisonCustody(input());
assert.equal(retained.schema, EMP1_BENCHMARK_COMPARISON_CUSTODY_SCHEMA);
assert.equal(retained.state, 'RETAINED_ACTUAL_EXECUTION_COMPARISON');
assert.equal(retained.comparison.state, 'COMPARISON_QUALIFIED');
assert.equal(retained.routeRelationship.engineeringUseAuthorized, false);
assert.equal(retained.execution.inferredWithoutExecution, false);
assert.equal(retained.authority.wrcMethodAuthority, false);
assert.equal(retained.authorityBoundary.executesWrcMethod, false);
assert.equal(retained.authorityBoundary.selectsTolerance, false);
assert.ok(Object.isFrozen(retained));
assert.ok(Object.isFrozen(retained.comparison.quantities));
assert.ok(Object.isFrozen(retained.comparison.quantities[0]));

const outsideTolerance = input();
outsideTolerance.evidence.comparison.state = 'OUTSIDE_TOLERANCE';
outsideTolerance.evidence.comparison.quantities[0].withinTolerance = false;
outsideTolerance.evidence.comparison.quantities[0].status = 'OUTSIDE_TOLERANCE';
assert.equal(
  createEmp1BenchmarkComparisonCustody(outsideTolerance).comparison.state,
  'OUTSIDE_TOLERANCE',
  'custody must retain truthful disagreement rather than require comparison PASS',
);

const unavailable = input();
unavailable.evidence.comparison.state = 'REFERENCE_NOT_AVAILABLE';
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(unavailable),
  { code: 'EMP1_BENCHMARK_CUSTODY_COMPARISON_STATE_NOT_RETAINABLE' },
);

for (const field of [
  'inferredWithoutExecution',
  'approximateValues',
  'derivedFromConsoleSummary',
  'manuallyReconstructed',
]) {
  const forged = input();
  forged.execution[field] = true;
  assert.throws(
    () => createEmp1BenchmarkComparisonCustody(forged),
    { code: `EMP1_BENCHMARK_CUSTODY_FORBIDDEN_PROVENANCE:${field}` },
  );
}

const notExecuted = input();
notExecuted.execution.executed = false;
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(notExecuted),
  { code: 'EMP1_BENCHMARK_CUSTODY_ACTUAL_EXECUTION_REQUIRED' },
);

const quantityMismatch = input();
quantityMismatch.execution.observedQuantityIds.pop();
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(quantityMismatch),
  { code: 'EMP1_BENCHMARK_CUSTODY_EXECUTION_QUANTITY_SET_MISMATCH' },
);

const routeMismatch = input();
routeMismatch.routeAuthority.snapshot.routeId = 'OTHER_ROUTE';
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(routeMismatch),
  { code: 'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_ID_MISMATCH' },
);

const routeAuthorityDrift = input();
routeAuthorityDrift.routeAuthority.snapshot.engineeringUseAuthorized = true;
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(routeAuthorityDrift),
  { code: 'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_MISMATCH:engineeringUseAuthorized' },
);

const authorityLeak = input();
authorityLeak.evidence.authority.codeComplianceAuthorized = true;
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(authorityLeak),
  { code: 'EMP1_BENCHMARK_CUSTODY_EVIDENCE_AUTHORITY_MUST_BE_FALSE:codeComplianceAuthorized' },
);

const unfrozenTolerance = input();
unfrozenTolerance.evidence.freezeEvidence.toleranceFrozenBeforeEmpObservation = false;
assert.throws(
  () => createEmp1BenchmarkComparisonCustody(unfrozenTolerance),
  { code: 'EMP1_BENCHMARK_CUSTODY_FREEZE_EVIDENCE_INVALID' },
);

const source = readFileSync(
  new URL('../src/core/emp1/emp1-benchmark-comparison-custody.js', import.meta.url),
  'utf8',
);
assert.doesNotMatch(source, /^\s*import\s/m, 'custody owner must remain dependency-free');
for (const forbidden of ['runEmp1(', 'evaluateEmp1', 'wrc537', 'table5', 'interpolation']) {
  assert.ok(
    !source.toLowerCase().includes(forbidden.toLowerCase()),
    `forbidden numerical dependency: ${forbidden}`,
  );
}

console.log('EMP1_BENCHMARK_COMPARISON_CUSTODY_CHECK_PASS');
