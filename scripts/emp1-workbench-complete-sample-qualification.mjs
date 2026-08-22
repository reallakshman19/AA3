#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  classifyEmp1WorkbenchExecutionCurrentness,
  currentEmp1WorkbenchRouteAuthority,
  executeEmp1WorkbenchProduct,
  projectEmp1WorkbenchCState,
  projectEmp1WorkbenchRunReadiness,
} from '../src/workspace/emp1-workbench-product-run.js';
import { createEmp1WorkbenchQualificationSample } from '../src/workspace/emp1-workbench-qualification-sample.js';

const sample = createEmp1WorkbenchQualificationSample();
assert.equal(sample.schema, 'emp1-workbench-qualification-sample/v1');
assert.ok(sample.aDocument);
assert.ok(sample.bDocument);
assert.ok(sample.runInput);

assertSourceOnlyCInput(sample.runInput);

const readiness = projectEmp1WorkbenchRunReadiness({
  aDocument: sample.aDocument,
  bDocument: sample.bDocument,
  runInput: sample.runInput,
});
assert.equal(readiness.state, 'READY');
assert.equal(readiness.runAuthorized, true);

const routeAuthority = currentEmp1WorkbenchRouteAuthority();
assert.equal(routeAuthority.productionUseAuthorized, false,
  'current qualification sample must not silently authorize production C');
assert.ok(routeAuthority.reasons.includes(
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
));

const execution = await executeEmp1WorkbenchProduct({
  aDocument: sample.aDocument,
  bDocument: sample.bDocument,
  runInput: sample.runInput,
});

assert.equal(execution.status, 'PREPARED_C_BLOCKED');
assert.deepEqual(execution.invocations, {
  loadTransfer: 1,
  sectionScreening: 1,
  localPreparation: 1,
  localCorrelation: 0,
});
assert.equal(execution.authority.boundedLocalRoutePrepared, true);
assert.equal(execution.authority.boundedLocalRouteExecuted, false);
assert.equal(execution.authority.codeComplianceProduced, false);
assert.equal(execution.authority.releaseQualified, false);
assert.equal(execution.result.localCorrelation.state, 'BLOCKED');
assert.equal(execution.result.localCorrelation.stresses, undefined);
assert.ok(execution.result.localCorrelation.reasons.includes(
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
));

// These values are allowed to appear only after CORE derives them from the
// source package. Their presence here proves the sample did not need a hidden
// demo-only authority bypass.
assert.equal(execution.result.localCorrelation.preparedSourceCustody.geometry.gamma, 5);
assert.ok(Number.isFinite(execution.result.localCorrelation.preparedSourceCustody.geometry.beta));
assert.ok(Number.isFinite(
  execution.result.localCorrelation.preparedSourceCustody.geometry.attachmentOutsideRadius,
));
assert.ok(Number.isFinite(execution.applicabilitySourceAuthority.nearestCylinderEndDistance));

const currentness = classifyEmp1WorkbenchExecutionCurrentness({
  execution,
  aDocument: sample.aDocument,
  bDocument: sample.bDocument,
  runInput: sample.runInput,
  currentRouteAuthority: routeAuthority,
});
assert.equal(currentness.inputCurrent, true);
assert.equal(currentness.cReportable, false);

const cState = projectEmp1WorkbenchCState({
  readiness,
  execution,
  currentness,
  routeAuthority,
});
assert.equal(cState.state, 'ROUTE_SUSPENDED');
assert.equal(cState.buttonEnabled, false);
assert.equal(cState.currentResultAvailable, false);
assert.equal(cState.reportableResult, null);
assert.equal(cState.retainedResultAvailable, false,
  'prepared custody is not a retained numerical C result');
assert.ok(cState.blockerCodes.includes(
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
));

console.log('EMP1_COMPLETE_SAMPLE_QUALIFICATION: PASS');
console.log(JSON.stringify({
  sampleSchema: sample.schema,
  status: execution.status,
  invocations: execution.invocations,
  cState: cState.state,
  cProductionCount: execution.invocations.localCorrelation,
  cReportable: cState.currentResultAvailable,
  routeAuthorityHash: routeAuthority.snapshot.semanticHash,
}, null, 2));

function assertSourceOnlyCInput(runInput) {
  assert.deepEqual(Object.keys(runInput).sort(), ['localMethod', 'schema']);
  assert.deepEqual(Object.keys(runInput.localMethod).sort(), [
    'applicabilityGeometry',
    'attachmentGeometry',
    'routeRequest',
  ]);
  assert.deepEqual(Object.keys(runInput.localMethod.routeRequest).sort(), [
    'loadCaseIdentity',
    'pressureResultIdentity',
    'schema',
  ]);
  assert.deepEqual(Object.keys(runInput.localMethod.attachmentGeometry).sort(), [
    'attachmentDiameter',
    'diameterBasis',
    'geometryIdentity',
    'physicalLocation',
    'sourceReference',
    'unit',
  ]);
  assert.deepEqual(Object.keys(runInput.localMethod.applicabilityGeometry).sort(), [
    'attachmentStationBasis',
    'attachmentStationFromCylinderStart',
    'attachmentStationSourceReference',
    'cylinderLength',
    'cylinderLengthBasis',
    'cylinderLengthSourceReference',
    'geometryIdentity',
    'unit',
  ]);

  const serialized = JSON.stringify(runInput);
  for (const forbidden of [
    'meanRadius',
    'attachmentRadius',
    'nearestCylinderEndDistance',
    'gamma',
    'beta',
    'wrcAxis',
    'stress',
    'governingPoint',
    'codeCompliance',
    'releaseQualified',
    'productionUseAuthorized',
  ]) {
    assert.equal(serialized.includes(`\"${forbidden}\"`), false,
      `sample C input injected derived/result authority: ${forbidden}`);
  }
}
