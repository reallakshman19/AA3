#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ENVELOPE_QUANTITIES } from '../src/core/local-attachment-screening/index.js';
import {
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
  executeEmp1WorkbenchProduct,
} from '../src/workspace/emp1-workbench-product-run.js';
import { rawRequestFixture } from './lafea.2-fixtures.mjs';

const bDocument = rawRequestFixture();
const aDocument = structuredClone(bDocument.sourceEvidence.foundationModel);
zeroAllPressure(aDocument);
const runInput = qualifiedRunInput(bDocument);

const first = await executeEmp1WorkbenchProduct({ aDocument, bDocument, runInput });
assert.equal(first.status, 'CALCULATED');
assert.equal(first.decision, 'ESCALATE');
assert.deepEqual(first.invocations, {
  loadTransfer: 1,
  sectionScreening: 1,
  localCorrelation: 1,
  localPreparation: 1,
});
assert.equal(first.result.loadTransfer.qualification, 'PASS');
assert.equal(first.result.sectionScreening.qualification, 'PASS');
assert.equal(first.result.sectionScreening.decision, 'ESCALATE');
assert.equal(first.result.localCorrelation.state,
  'EVALUATED_AUTHORIZED_BOUNDED_GAMMA5_ZERO_DP_ROUTE');
assert.equal(first.result.localCorrelation.productionRouteAuthority, true);
assert.equal(first.result.localCorrelation.globalEmp1CRouteAuthority, false);
assert.equal(first.authority.releaseQualified, false);
assert.equal(first.authority.codeComplianceProduced, false);
assert.match(first.result.loadTransfer.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.match(first.result.sectionScreening.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.match(first.result.localCorrelation.resultHash, /^fnv1a64:[a-f0-9]{16}$/u);
assert.equal(new Set([
  first.result.loadTransfer.resultHash,
  first.result.sectionScreening.resultHash,
  first.result.localCorrelation.resultHash,
]).size, 3);

const reused = await executeEmp1WorkbenchProduct({
  aDocument,
  bDocument,
  runInput,
  previous: first,
  changeClasses: [],
});
assert.deepEqual(reused.invocations, {
  loadTransfer: 0,
  sectionScreening: 0,
  localCorrelation: 0,
  localPreparation: 1,
});
assert.deepEqual(reused.result.assessment.parents, first.result.assessment.parents);

const bChanged = structuredClone(bDocument);
bChanged.screeningCases[0].mechanicalTerms[0].factor = 1.1;
const bRerun = await executeEmp1WorkbenchProduct({
  aDocument,
  bDocument: bChanged,
  runInput,
  previous: first,
  changeClasses: [],
});
assert.ok(bRerun.changeClasses.includes('SECTION'));
assert.deepEqual(bRerun.invocations, {
  loadTransfer: 0,
  sectionScreening: 1,
  localCorrelation: 1,
  localPreparation: 1,
});
assert.equal(bRerun.result.loadTransfer.resultHash, first.result.loadTransfer.resultHash);
assert.notEqual(bRerun.result.sectionScreening.resultHash, first.result.sectionScreening.resultHash);

const aChanged = structuredClone(aDocument);
aChanged.loadCases[0].force.value[0] += 1;
const aRerun = await executeEmp1WorkbenchProduct({
  aDocument: aChanged,
  bDocument,
  runInput,
  previous: first,
  changeClasses: [],
});
assert.ok(aRerun.changeClasses.includes('SOURCE_IDENTITY'));
assert.equal(aRerun.invocations.loadTransfer, 1);
assert.equal(aRerun.invocations.sectionScreening, 1);
assert.equal(aRerun.invocations.localCorrelation, 1);
assert.notEqual(aRerun.result.loadTransfer.resultHash, first.result.loadTransfer.resultHash);

const blocked = await executeEmp1WorkbenchProduct({
  aDocument,
  bDocument,
  runInput: null,
});
assert.equal(blocked.decision, 'BLOCKED');
assert.equal(blocked.result.sectionScreening.decision, 'BLOCKED');
assert.equal(blocked.result.sectionScreening.qualification, 'FAIL');
assert.ok(blocked.result.sectionScreening.reasons
  .includes('EMP1_SCREENING_APPLICABILITY_EVIDENCE_REQUIRED'));
assert.equal(blocked.invocations.localCorrelation, 0);
assert.equal(blocked.authority.releaseQualified, false);

const gamma15 = structuredClone(runInput);
gamma15.localMethod.routeRequest.geometry.meanRadius = 300;
gamma15.localMethod.routeRequest.geometry.attachmentRadius = 53.142857142857146;
gamma15.localMethod.routeRequest.geometry.gamma = 15;
const gammaBlocked = await executeEmp1WorkbenchProduct({
  aDocument,
  bDocument,
  runInput: gamma15,
});
assert.equal(gammaBlocked.invocations.localPreparation, 1);
assert.equal(gammaBlocked.invocations.localCorrelation, 0);
assert.equal(gammaBlocked.result.localCorrelation.state, 'BLOCKED');
assert.ok(gammaBlocked.result.localCorrelation.reasons
  .some((reason) => reason.startsWith('EMP1_LOCAL_METHOD_SCOPED_RUNTIME_NON_TABULATED_GAMMA')));
assert.equal(gammaBlocked.authority.globalEmp1CRouteAuthority, false);

assert.rejects(
  () => executeEmp1WorkbenchProduct({
    aDocument,
    bDocument,
    runInput: { ...runInput, sourceSha256: '0'.repeat(64) },
  }),
  (error) => error?.code === 'EMP1_WORKBENCH_RUN_INPUT_KEYS_INVALID',
);

console.log(JSON.stringify({
  schema: 'emp1-workbench-product-run-qualification/v1',
  status: 'PASS_PRODUCT_OWNED_EMP1_EXECUTION',
  productId: first.productId,
  decision: first.decision,
  invocations: first.invocations,
  reuse: reused.invocations,
  bOnlyInvalidation: bRerun.invocations,
  aInvalidation: aRerun.invocations,
  missingApplicabilityDecision: blocked.decision,
  gamma15LocalInvocationCount: gammaBlocked.invocations.localCorrelation,
  boundedGamma5RouteExecuted: true,
  globalEmp1CRouteAuthority: false,
  releaseQualified: false,
}, null, 2));

function qualifiedRunInput(bSource) {
  const applicabilityRecords = [];
  for (const screeningCase of bSource.screeningCases) {
    for (const location of bSource.evaluationLocations) {
      applicabilityRecords.push({
        screeningCaseId: screeningCase.screeningCaseId,
        evaluationLocationId: location.evaluationLocationId,
        locationClass: applicabilityRecords.length === 0 ? 'ATTACHMENT' : 'FAR_FIELD',
        transverseShearState: 'NOT_PRESENT',
        evidenceReferences: [`EMP1-04#${screeningCase.screeningCaseId}/${location.evaluationLocationId}`],
      });
    }
  }
  return {
    schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
    screeningAssessment: {
      assessmentIdentity: 'EMP1-04-SCREENING-ASSESSMENT',
      assessmentProfileId: 'A2-PRODUCT-PROFILE-1',
      governingQuantity: ENVELOPE_QUANTITIES[0],
      applicabilityRecords,
    },
    localMethod: {
      routeRequest: {
        schema: 'emp1-wrc537-gamma5-zero-dp-orchestration-request/v1',
        loadCaseIdentity: 'LC-A',
        pressureResultIdentity: 'PR-P-CLOSED',
        wrcReferencePointGlobal: [0, 0, 0],
        geometry: {
          meanRadius: 100,
          shellThickness: 20,
          attachmentRadius: 17.714285714285715,
          gamma: 5,
          beta: 0.155,
        },
        axes: {
          vesselCenterlineGlobal: [1, 0, 0],
          nozzleCenterlineGlobal: [0, 0, 1],
        },
        stressConcentration: { Kn: 1, Kb: 1 },
      },
    },
  };
}

function zeroAllPressure(source) {
  for (const row of source.pressureDefinitions) {
    row.internalPressure.value = 0;
    row.externalPressure.value = 0;
  }
}
