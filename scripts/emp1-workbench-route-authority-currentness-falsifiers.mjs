#!/usr/bin/env node
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import {
  EMP1_WORKBENCH_EXECUTION_CURRENTNESS,
  EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
  emp1WorkbenchInputHashes,
  classifyEmp1WorkbenchExecutionCurrentness,
  projectEmp1WorkbenchCState,
  projectEmp1WorkbenchRunReadiness,
} from '../src/workspace/emp1-workbench-run-state.js';
import { createEmp1WorkbenchQualificationSample } from '../src/workspace/emp1-workbench-qualification-sample.js';

const sample = createEmp1WorkbenchQualificationSample();
const { aDocument, bDocument, runInput } = sample;
const readiness = projectEmp1WorkbenchRunReadiness({ aDocument, bDocument, runInput });
assert.equal(readiness.state, 'READY');

const q1 = authority('Q1', true, 'qualification-q1', 'dataset-q1');
const q2 = authority('Q2', true, 'qualification-q2', 'dataset-q2');
const q2Suspended = authority('Q2', false, 'qualification-q2', 'dataset-q2', [
  'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE',
]);
const retainedQ1 = retainedNumericalExecution(q1.snapshot, aDocument, bDocument, runInput);

const currentQ1 = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ1,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q1,
});
assert.equal(currentQ1.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.CURRENT);
assert.equal(currentQ1.inputCurrent, true);
assert.equal(currentQ1.cAuthorityCurrent, true);
assert.equal(currentQ1.cReportable, true);
const q1View = projectEmp1WorkbenchCState({
  readiness,
  execution: retainedQ1,
  currentness: currentQ1,
  routeAuthority: q1,
});
assert.equal(q1View.state, 'CALCULATED_CURRENT');
assert.equal(q1View.currentResultAvailable, true);
assert.equal(q1View.reportableResult.stresses.Au, 72.67281563686576);

// Mandatory negative control: Q2 is still authorized. The old Q1 result must
// become stale/hidden while the C action remains enabled for a Q2 rerun.
const changedToQ2 = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ1,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2,
});
assert.equal(changedToQ2.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE);
assert.equal(changedToQ2.inputCurrent, true, 'unchanged A/B/input must remain current');
assert.equal(changedToQ2.cAuthorityCurrent, false);
assert.equal(changedToQ2.cReportable, false);
assert.ok(changedToQ2.reasons.includes('EMP1_WORKBENCH_C_ROUTE_AUTHORITY_CHANGED'));
const q2View = projectEmp1WorkbenchCState({
  readiness,
  execution: retainedQ1,
  currentness: changedToQ2,
  routeAuthority: q2,
});
assert.equal(q2View.state, 'STALE_AUTHORITY');
assert.equal(q2View.buttonEnabled, true,
  'authorized Q2 must permit rerun; a global C disable is an invalid fix');
assert.equal(q2View.currentResultAvailable, false);
assert.equal(q2View.retainedResultAvailable, true);
assert.equal(q2View.reportableResult, null,
  'Q1 stresses must not remain in the current result projection');
assert.equal(q2View.currentExecutionEvidence.stresses.Au, 72.67281563686576,
  'historical evidence must remain retained even when not reportable');

// Persist/reload falsifier: a serialized Q1 execution loaded after Q2 becomes
// current must be stale on its first classification. There is no in-memory
// transition dependency and no last-writer/current-session loophole.
const reloadedQ1 = JSON.parse(JSON.stringify(retainedQ1));
const reloadedChangedToQ2 = classifyEmp1WorkbenchExecutionCurrentness({
  execution: reloadedQ1,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2,
});
assert.equal(reloadedChangedToQ2.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE);
assert.equal(reloadedChangedToQ2.inputCurrent, true);
assert.equal(reloadedChangedToQ2.cReportable, false);
assert.ok(reloadedChangedToQ2.reasons.includes('EMP1_WORKBENCH_C_ROUTE_AUTHORITY_CHANGED'));
const reloadedQ2View = projectEmp1WorkbenchCState({
  readiness,
  execution: reloadedQ1,
  currentness: reloadedChangedToQ2,
  routeAuthority: q2,
});
assert.equal(reloadedQ2View.state, 'STALE_AUTHORITY');
assert.equal(reloadedQ2View.currentResultAvailable, false);
assert.equal(reloadedQ2View.reportableResult, null);
assert.equal(reloadedQ2View.currentExecutionEvidence.stresses.Au, 72.67281563686576);

// A fresh numerical execution carrying Q2 authority becomes current again.
const retainedQ2 = retainedNumericalExecution(q2.snapshot, aDocument, bDocument, runInput);
const currentQ2 = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ2,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2,
});
const currentQ2View = projectEmp1WorkbenchCState({
  readiness,
  execution: retainedQ2,
  currentness: currentQ2,
  routeAuthority: q2,
});
assert.equal(currentQ2View.state, 'CALCULATED_CURRENT');
assert.equal(currentQ2View.currentResultAvailable, true);

// Suspending the same Q2 authority hides the numerical result and disables
// production C, while leaving A/B/input current and the historical payload intact.
const suspended = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ2,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2Suspended,
});
assert.equal(suspended.inputCurrent, true);
assert.equal(suspended.cReportable, false);
const suspendedView = projectEmp1WorkbenchCState({
  readiness,
  execution: retainedQ2,
  currentness: suspended,
  routeAuthority: q2Suspended,
});
assert.equal(suspendedView.state, 'ROUTE_SUSPENDED');
assert.equal(suspendedView.buttonEnabled, false);
assert.equal(suspendedView.reportableResult, null);
assert.equal(suspendedView.currentExecutionEvidence.stresses.Au, 72.67281563686576);

// Unrelated/no semantic route change must not invalidate the retained result.
const q2Clone = structuredClone(q2);
const unchanged = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ2,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2Clone,
});
assert.equal(unchanged.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.CURRENT);
assert.equal(unchanged.cReportable, true);

// A legacy numerical C result with no retained authority snapshot is fail-closed.
const legacy = structuredClone(retainedQ2);
delete legacy.authority.routeAuthoritySnapshot;
const legacyState = classifyEmp1WorkbenchExecutionCurrentness({
  execution: legacy,
  aDocument,
  bDocument,
  runInput,
  currentRouteAuthority: q2,
});
assert.equal(legacyState.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE);
assert.ok(legacyState.reasons.includes('EMP1_WORKBENCH_C_ROUTE_AUTHORITY_SNAPSHOT_REQUIRED'));
assert.equal(legacyState.cReportable, false);

// Input drift is independently distinguishable from authority drift.
const changedRunInput = structuredClone(runInput);
changedRunInput.localMethod.attachmentGeometry.sourceReference += '/CHANGED';
const inputStale = classifyEmp1WorkbenchExecutionCurrentness({
  execution: retainedQ2,
  aDocument,
  bDocument,
  runInput: changedRunInput,
  currentRouteAuthority: q2,
});
assert.equal(inputStale.inputCurrent, false);
assert.equal(inputStale.cAuthorityCurrent, true);
assert.equal(projectEmp1WorkbenchCState({
  readiness: projectEmp1WorkbenchRunReadiness({
    aDocument, bDocument, runInput: changedRunInput,
  }),
  execution: retainedQ2,
  currentness: inputStale,
  routeAuthority: q2,
}).state, 'STALE_INPUT');

console.log(JSON.stringify({
  schema: 'emp1-workbench-route-authority-currentness-falsifiers/v2',
  status: 'PASS',
  q1AuthorityHash: q1.snapshot.semanticHash,
  q2AuthorityHash: q2.snapshot.semanticHash,
  q1ToQ2OldResultReportable: q2View.currentResultAvailable,
  q1ToQ2RerunEnabled: q2View.buttonEnabled,
  persistedQ1ReloadedUnderQ2Reportable: reloadedQ2View.currentResultAvailable,
  suspendedResultReportable: suspendedView.currentResultAvailable,
  suspendedCActionEnabled: suspendedView.buttonEnabled,
  aBInputsRemainCurrentAcrossAuthorityMutation: suspended.inputCurrent,
  legacyAuthoritySnapshotFailsClosed: legacyState.cReportable === false,
}, null, 2));

function authority(qualificationId, productionUseAuthorized, qualificationSha256, datasetHash,
  suspensionReasons = []) {
  const semanticPayload = {
    schema: 'emp1-workbench-route-authority-snapshot/v1',
    routeId: 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP',
    productionUseAuthorized,
    routeModuleAuthorized: productionUseAuthorized,
    routeModuleSuspensionReasons: suspensionReasons,
    registry: {
      routeId: 'EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP',
      registered: productionUseAuthorized,
      engineeringUseAuthorized: productionUseAuthorized,
      suspensionReasons,
      method: {
        qualificationId,
        qualificationRecordSha256: qualificationSha256,
        sourceDocumentSha256: 'source-sha',
        datasetHash,
      },
      scope: { gamma: 5, differentialPressure: 0 },
      limitations: [],
      remainingBlocked: [],
    },
  };
  return {
    productionUseAuthorized,
    routeModuleAuthorized: productionUseAuthorized,
    routeRegistryRegistered: productionUseAuthorized,
    routeRegistryEngineeringUseAuthorized: productionUseAuthorized,
    reasons: suspensionReasons,
    snapshot: {
      ...semanticPayload,
      semanticHash: semanticHash(semanticPayload),
    },
  };
}

function retainedNumericalExecution(routeAuthoritySnapshot, aDocument, bDocument, runInput) {
  return {
    schema: EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
    productId: 'EMP.1',
    sourceHash: 'retained-source-hash',
    inputHashes: emp1WorkbenchInputHashes({ aDocument, bDocument, runInput }),
    authority: {
      boundedLocalRouteExecuted: true,
      routeAuthoritySnapshot,
      globalEmp1CRouteAuthority: false,
      codeComplianceProduced: false,
      releaseQualified: false,
    },
    result: {
      localCorrelation: {
        schema: 'emp1-local-correlation-result/v1',
        productionRouteAuthority: true,
        resultHash: 'retained-q-result',
        stresses: { Au: 72.67281563686576 },
      },
    },
    retainedLocalCorrelationHistory: [],
  };
}
