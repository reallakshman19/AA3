#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calculateLocalAttachmentFoundation } from '../src/core/local-stress/index.js';
import {
  EMP1_WORKBENCH_EXECUTION_CURRENTNESS,
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
  classifyEmp1WorkbenchExecutionCurrentness,
  executeEmp1WorkbenchProduct,
  normalizeEmp1WorkbenchRunInput,
} from '../src/workspace/emp1-workbench-product-run.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import { rawRequestFixture } from './lafea.2-fixtures.mjs';

const aDocument = routeFoundationModel({ meanRadius: 100, shellThickness: 20 });
const aResult = calculateLocalAttachmentFoundation(aDocument);
assert.equal(aResult.qualification.state, 'ACCEPTED');
const bDocument = routeScreeningRequest(aDocument, aResult);
const runInput = qualifiedRunInput();

const first = await executeEmp1WorkbenchProduct({ aDocument, bDocument, runInput });
assert.equal(first.status, 'PREPARED_C_BLOCKED');
assert.equal(first.decision, 'ESCALATE');
assert.deepEqual(first.invocations, {
  loadTransfer: 1,
  sectionScreening: 1,
  localPreparation: 1,
  localCorrelation: 0,
});
assert.equal(first.result.loadTransfer.qualification, 'PASS');
assert.equal(first.result.sectionScreening.qualification, 'PASS');
assert.equal(first.result.sectionScreening.decision, 'ESCALATE');
assert.equal(first.result.localCorrelation.state, 'BLOCKED');
assert.ok(first.result.localCorrelation.reasons.includes(
  'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED',
));
assert.ok(first.result.localCorrelation.reasons.includes(
  'WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED',
));
assert.equal(first.result.localCorrelation.preparedSourceCustody.geometry.gamma, 5);
assert.ok(Math.abs(first.result.localCorrelation.preparedSourceCustody.geometry.beta - 0.155) < 1e-12);
assert.equal(first.result.localCorrelation.stresses, undefined);
assert.equal(first.authority.boundedLocalRoutePrepared, true);
assert.equal(first.authority.boundedLocalRouteExecuted, false);
assert.equal(first.authority.routeModuleAuthorized, false);
assert.equal(first.authority.routeRegistryRegistered, false);
assert.equal(first.authority.routeRegistryEngineeringUseAuthorized, false);
assert.ok(first.authority.routeSuspensionReasons.includes(
  'WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED',
));
assert.ok(first.authority.routeSuspensionReasons.includes(
  'EMP1_C_BOUNDED_ROUTE_NOT_REGISTERED',
));
assert.ok(first.authority.routeSuspensionReasons.includes(
  'EMP1_C_BOUNDED_ROUTE_ENGINEERING_USE_NOT_AUTHORIZED',
));
assert.ok(first.authority.routeSuspensionReasons.includes(
  'EMP1_C_BOUNDED_ROUTE_EXECUTOR_NOT_AUTHORIZED',
));
assert.equal(first.authority.globalEmp1CRouteAuthority, false);
assert.equal(first.authority.codeComplianceProduced, false);
assert.equal(first.authority.releaseQualified, false);
assert.equal(new Set([
  first.result.loadTransfer.resultHash,
  first.result.sectionScreening.resultHash,
  first.result.localCorrelation.resultHash,
]).size, 3, 'A/B/blocked-C evidence hashes must remain distinct');
assert.equal(classifyEmp1WorkbenchExecutionCurrentness({
  execution: first, aDocument, bDocument, runInput,
}).state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.CURRENT);

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
  localPreparation: 1,
  localCorrelation: 0,
});
assert.deepEqual(reused.result.assessment.parents, first.result.assessment.parents);
assert.equal(reused.result.localCorrelation.state, 'BLOCKED');

const attachmentChanged = structuredClone(runInput);
attachmentChanged.localMethod.attachmentGeometry.attachmentDiameter = 40;
const attachmentRerun = await executeEmp1WorkbenchProduct({
  aDocument,
  bDocument,
  runInput: attachmentChanged,
  previous: first,
  changeClasses: [],
});
assert.ok(attachmentRerun.changeClasses.includes('SECTION'));
assert.deepEqual(attachmentRerun.invocations, {
  loadTransfer: 0,
  sectionScreening: 1,
  localPreparation: 1,
  localCorrelation: 0,
});
assert.equal(attachmentRerun.result.loadTransfer.resultHash, first.result.loadTransfer.resultHash);
assert.notEqual(
  attachmentRerun.result.sectionScreening.geometryEvidence.semanticHash,
  first.result.sectionScreening.geometryEvidence.semanticHash,
);
assert.notEqual(
  attachmentRerun.result.localCorrelation.preparedSourceCustody.geometryEvidenceHash,
  first.result.localCorrelation.preparedSourceCustody.geometryEvidenceHash,
);

const bChanged = structuredClone(bDocument);
bChanged.screeningCases[0].mechanicalTerms[0].factor = 1.1;
const stale = classifyEmp1WorkbenchExecutionCurrentness({
  execution: first,
  aDocument,
  bDocument: bChanged,
  runInput,
});
assert.equal(stale.state, EMP1_WORKBENCH_EXECUTION_CURRENTNESS.STALE);
assert.ok(stale.reasons.includes('EMP1_WORKBENCH_SECTIONSCREENINGDOCUMENT_CHANGED'));

assert.throws(
  () => normalizeEmp1WorkbenchRunInput({
    ...runInput,
    localMethod: {
      ...runInput.localMethod,
      routeRequest: {
        ...runInput.localMethod.routeRequest,
        geometry: { meanRadius: 100, shellThickness: 20, attachmentRadius: 10 },
      },
    },
  }),
  (error) => error?.code === 'EMP1_WORKBENCH_ROUTE_REQUEST_KEYS_INVALID',
  'caller-authored WRC geometry must not re-enter the route request',
);

const wrongUnit = structuredClone(runInput);
wrongUnit.localMethod.attachmentGeometry.unit = 'm';
await assert.rejects(
  () => executeEmp1WorkbenchProduct({ aDocument, bDocument, runInput: wrongUnit }),
  (error) => error?.code === 'EMP1_WORKBENCH_ATTACHMENT_UNIT_NOT_CANONICAL',
);

const gamma15Document = routeFoundationModel({ meanRadius: 300, shellThickness: 20 });
const gamma15Result = calculateLocalAttachmentFoundation(gamma15Document);
const gamma15B = routeScreeningRequest(gamma15Document, gamma15Result);
const gamma15 = await executeEmp1WorkbenchProduct({
  aDocument: gamma15Document,
  bDocument: gamma15B,
  runInput,
});
assert.equal(gamma15.status, 'BLOCKED');
assert.equal(gamma15.invocations.localPreparation, 1);
assert.equal(gamma15.invocations.localCorrelation, 0);
assert.equal(gamma15.result.localCorrelation.state, 'BLOCKED');
assert.ok(gamma15.result.localCorrelation.reasons
  .some((reason) => reason.includes('NON_TABULATED_GAMMA')));
assert.equal(gamma15.authority.boundedLocalRoutePrepared, false);
assert.equal(gamma15.authority.boundedLocalRouteExecuted, false);
assert.equal(gamma15.authority.globalEmp1CRouteAuthority, false);

console.log(JSON.stringify({
  schema: 'emp1-workbench-product-run-qualification/v4',
  status: 'PASS_SOURCE_BOUND_PREPARED_C_FAIL_CLOSED',
  productId: first.productId,
  decision: first.decision,
  firstInvocations: first.invocations,
  reuseInvocations: reused.invocations,
  attachmentGeometryInvalidation: attachmentRerun.invocations,
  gamma5: first.result.localCorrelation.preparedSourceCustody.geometry.gamma,
  beta: first.result.localCorrelation.preparedSourceCustody.geometry.beta,
  productionRouteInvoked: first.invocations.localCorrelation > 0,
  routeAuthority: {
    module: first.authority.routeModuleAuthorized,
    registered: first.authority.routeRegistryRegistered,
    engineeringUse: first.authority.routeRegistryEngineeringUseAuthorized,
  },
  routeSuspensionReasons: first.authority.routeSuspensionReasons,
  distinctLayerHashes: true,
  forgedCallerGeometryRejected: true,
  canonicalAttachmentUnitEnforced: true,
  gamma15BlockedBeforeTable5: gamma15.invocations.localCorrelation === 0,
  globalEmp1CRouteAuthority: false,
  releaseQualified: false,
}, null, 2));

function qualifiedRunInput() {
  const attachmentRadius = 0.155 * 100 / 0.875;
  return {
    schema: EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
    localMethod: {
      routeRequest: {
        schema: 'emp1-wrc537-gamma5-zero-dp-orchestration-request/v2',
        loadCaseIdentity: 'LC-1',
        pressureResultIdentity: 'PR-1',
      },
      attachmentGeometry: {
        geometryIdentity: 'EMP1-WRC-ATTACHMENT-001',
        attachmentDiameter: 2 * attachmentRadius,
        unit: 'mm',
        sourceReference: 'EMP1-05/QUALIFICATION/ATTACHMENT-DIAMETER',
      },
    },
  };
}

function routeFoundationModel({ meanRadius, shellThickness }) {
  return canonicalFixture((source) => {
    const outerRadius = meanRadius + shellThickness / 2;
    const innerRadius = meanRadius - shellThickness / 2;
    source.pipeGeometry.outsideDiameter.value = 2 * outerRadius;
    source.thicknessBasis.nominalPipeThickness.value = shellThickness;
    source.thicknessBasis.corrosionAllowance.value = 0;
    source.thicknessBasis.assessmentPipeThickness.value = shellThickness;
    source.loadCases[0].force.value = [-400, -250, -1000];
    source.loadCases[0].moment.value = [-750000, 1000000, -700000];
    source.pressureDefinitions.forEach((row) => {
      row.internalPressure.value = 0;
      row.externalPressure.value = 0;
    });
    source.resultRequests.pressure[0].requestedRadii[0].value = innerRadius;
    source.resultRequests.pressure[0].requestedRadii[1].value = outerRadius;
  });
}

function routeScreeningRequest(foundationModel, foundationResult) {
  return rawRequestFixture((raw) => {
    raw.sourceEvidence = {
      ...raw.sourceEvidence,
      foundationModel: structuredClone(foundationModel),
      foundationResult: structuredClone(foundationResult),
    };
    raw.screeningCases = [{
      screeningCaseId: 'CASE-WRC',
      mechanicalTerms: [{ loadCaseId: 'LC-1', factor: 1 }],
      pressureDefinitionId: 'P-CLOSED',
      pressureFactor: 0,
      sourceReference: 'EMP1-05/CASE-WRC',
    }];
  });
}
