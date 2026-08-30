#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMP1_PROFESSIONAL_WORKFLOW_SCHEMA,
  EMP1_PROFESSIONAL_WORKFLOW_STEPS,
  buildEmp1ProfessionalWorkflowPresentation,
} from '../src/workspace/emp1-professional-workflow-presentation.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const labels = [
  'Basis & Source',
  'Geometry',
  'Loads',
  'Load Transfer',
  'Section Screening',
  'Local Correlation',
  'Review & Evidence',
];
const ids = [
  'BASIS_SOURCE',
  'GEOMETRY',
  'LOADS',
  'LOAD_TRANSFER',
  'SECTION_SCREENING',
  'LOCAL_CORRELATION',
  'REVIEW_EVIDENCE',
];
const backing = [
  ['A', 'B', 'C'],
  ['A', 'C'],
  ['A'],
  ['A'],
  ['B'],
  ['C'],
  ['A', 'B', 'C'],
];

assert.equal(EMP1_PROFESSIONAL_WORKFLOW_SCHEMA, 'emp1-professional-workflow/v1');
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.ordinal), [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.stepId), ids);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.label), labels);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => [...step.backingStepIds]), backing);

const current = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'CALCULATED_CURRENT',
  cBadge: 'CALCULATED CURRENT',
  cResultAvailable: true,
  cRetainedResultAvailable: true,
}));
assert.equal(current.schema, EMP1_PROFESSIONAL_WORKFLOW_SCHEMA);
assert.equal(current.productId, 'EMP.1');
assert.deepEqual(current.steps.map((step) => step.label), labels);
assert.deepEqual(current.steps.map((step) => step.ordinal), [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(current.steps.map((step) => [...step.backingStepIds]), backing);
assert.deepEqual(current.authoritySummary, {
  sourceCurrentness: 'SOURCE CURRENT',
  transferCurrentness: 'TRANSFER CURRENT',
  screeningCurrentness: 'SCREENING CURRENT',
  localMethod: 'LOCAL METHOD QUALIFIED',
  localResult: 'LOCAL RESULT CURRENT',
  releaseProfile: 'RELEASE PROFILE NOT QUALIFIED',
  codeCompliance: 'CODE COMPLIANCE NOT ASSESSED',
});
assert.deepEqual(current.steps.map((step) => step.statusLabel), [
  'SOURCE CURRENT',
  'SOURCE CURRENT',
  'SOURCE CURRENT',
  'TRANSFER CURRENT',
  'SCREENING CURRENT',
  'LOCAL METHOD QUALIFIED · LOCAL RESULT CURRENT',
  'LOCAL RESULT CURRENT · RELEASE PROFILE NOT QUALIFIED',
]);
assert.ok(current.steps.every((step) => !/^(?:A|B|C)\b/u.test(step.statusLabel)),
  'primary professional statuses must not expose A/B/C controller labels');
assert.equal(current.steps.some((step) => /\bCALCULATED\b|\bREADY\b|ROUTE SUSPENDED/u.test(step.statusLabel)), false,
  'primary professional statuses must use engineering currentness/authority vocabulary, not backing runtime states');
assert.ok(current.steps.every((step) => step.canOpen === true));
assert.ok(current.steps.every((step) => step.createsEngineeringAuthority === false));
assert.ok(current.steps.every((step) => step.exposesNumericalResult === false));
assert.deepEqual(current.backingCalculators.map((step) => step.shortId), ['A', 'B', 'C']);
assert.deepEqual(current.backingCalculators.map((step) => step.backingStageId), ['LAFEA.1', 'LAFEA.2', null]);
assert.deepEqual(current.authorityBoundary, {
  presentationOnly: true,
  createsEngineeringAuthority: false,
  createsRouteAuthority: false,
  createsCodeCompliance: false,
  createsReleaseAuthority: false,
  staleNumericalResultMayBecomeCurrent: false,
});

const stale = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'STALE_AUTHORITY',
  cBadge: 'STALE AUTHORITY',
  cResultAvailable: false,
  cRetainedResultAvailable: true,
}));
assert.equal(stale.steps[5].canOpen, true,
  'Local Correlation must remain navigable while retained C evidence is stale');
assert.equal(stale.authoritySummary.localMethod, 'LOCAL METHOD QUALIFIED');
assert.equal(stale.authoritySummary.localResult, 'LOCAL RESULT STALE');
assert.equal(stale.steps[5].statusLabel, 'LOCAL METHOD QUALIFIED · LOCAL RESULT STALE');
assert.equal(stale.steps[6].statusLabel, 'LOCAL RESULT STALE · RELEASE PROFILE NOT QUALIFIED');
assert.equal(stale.authorityBoundary.staleNumericalResultMayBecomeCurrent, false);

const noC = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'ROUTE_SUSPENDED',
  cBadge: 'ROUTE SUSPENDED',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
  cRunAuthorized: false,
}));
assert.equal(noC.steps[5].canOpen, true,
  'Local Correlation setup/evidence must remain inspectable while production execution is suspended');
assert.equal(noC.authoritySummary.localMethod, 'LOCAL METHOD BLOCKED');
assert.equal(noC.authoritySummary.localResult, 'LOCAL RESULT NOT CALCULATED');
assert.equal(noC.steps[5].statusLabel, 'LOCAL METHOD BLOCKED · LOCAL RESULT NOT CALCULATED');
assert.equal(noC.authoritySummary.codeCompliance, 'CODE COMPLIANCE NOT ASSESSED');

const staleB = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE',
  cBadge: 'SOURCE INCOMPLETE',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
  cRunAuthorized: false,
  bState: 'STALE_A_EVIDENCE',
  bResultAvailable: false,
  bRetainedResultAvailable: true,
}));
assert.equal(staleB.authoritySummary.sourceCurrentness, 'SOURCE STALE');
assert.equal(staleB.authoritySummary.screeningCurrentness, 'SCREENING STALE');
assert.equal(staleB.steps[4].statusLabel, 'SCREENING STALE');

const sourceMissing = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE',
  cBadge: 'SOURCE INCOMPLETE',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
  cRunAuthorized: false,
  aDocumentLoaded: false,
  bDocumentLoaded: false,
  aResultAvailable: false,
  bResultAvailable: false,
}));
assert.equal(sourceMissing.steps[0].statusLabel, 'SOURCE INPUT REQUIRED');
assert.equal(sourceMissing.authoritySummary.transferCurrentness, 'TRANSFER INPUT REQUIRED');
assert.equal(sourceMissing.authoritySummary.screeningCurrentness, 'SCREENING INPUT REQUIRED');

const analyticalSource = await read('src/workspace/lafea-analytical-calc-content.js');
assert.match(analyticalSource,
  /import \{ renderEmp1ProfessionalWorkflow \} from '\.\/emp1-professional-workflow-view\.js';/u);
assert.match(analyticalSource,
  /shell\.append\(renderEmp1ProfessionalWorkflow\(root, projection, options\.onSelectRoute\)\);/u);
assert.equal(analyticalSource.includes('renderEmp1AssessmentWorkflow(root, projection'), false,
  'internal A/B/C workflow renderer must not remain the primary EMP.1 analytical workflow');

const viewSource = await read('src/workspace/emp1-professional-workflow-view.js');
assert.match(viewSource, /dataset\.role = 'emp1-professional-workflow-steps'/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-step'/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-authority-summary'/u,
  'seven-step workflow must expose the WRC currentness/authority summary');
assert.match(viewSource,
  /onSelectRoute\?\.\(step\.preferredBackingStageId, step\.targetRole\)/u,
  'route-backed workflow navigation must carry the intended target through the backing-stage switch');
assert.match(viewSource, /data-guided-target/u,
  'workflow target navigation must recognize guided source/results targets as well as data-role targets');
assert.match(viewSource, /dataset\.role = 'emp1-technical-backing-steps'/u);
assert.match(viewSource, /Historical\/stale C numerical evidence is never promoted/u);

const workbenchViewSource = await read('src/workspace/lafea-workbench-view.js');
assert.match(workbenchViewSource, /pendingAnalyticalTargetRole/u,
  'workbench must retain a route-backed workflow target until the selected A/B view is rendered');
assert.match(workbenchViewSource, /consumePendingAnalyticalTarget/u,
  'workbench must consume the retained workflow target after analytical content replacement');

const presentationSource = await read('src/workspace/emp1-professional-workflow-presentation.js');
assert.equal(presentationSource.includes('../core/emp1/'), false,
  'professional workflow presentation must not create a parallel core authority dependency');
assert.equal(presentationSource.includes('runEmp1'), false,
  'professional workflow presentation must not invoke the calculation');
assert.equal(presentationSource.includes('gamma'), false,
  'workflow presentation must not calculate or infer WRC numerical parameters');

console.log(JSON.stringify({
  schema: 'emp1-professional-workflow-check/v2',
  status: 'PASS_WRC_PROFESSIONAL_WORKFLOW_PRESENTATION',
  labels,
  backing,
  currentAuthoritySummary: current.authoritySummary,
  staleLocalResult: stale.authoritySummary.localResult,
  suspendedLocalMethod: noC.authoritySummary.localMethod,
  routeTargetCustodyGuarded: true,
  primaryStatusesExposeBackingControllerLabels: false,
  engineeringAuthorityCreatedByPresentation: false,
  routeAuthorityCreatedByPresentation: false,
  codeComplianceCreatedByPresentation: false,
  releaseAuthorityCreatedByPresentation: false,
  numericalComparison: 'NOT_APPLICABLE_PRESENTATION_ONLY',
}, null, 2));

function projection({
  cState,
  cBadge,
  cResultAvailable,
  cRetainedResultAvailable,
  cRunAuthorized = true,
  aDocumentLoaded = true,
  bDocumentLoaded = true,
  aResultAvailable = true,
  bResultAvailable = true,
  bRetainedResultAvailable = false,
  aState = null,
  bState = null,
  releaseQualified = false,
}) {
  return {
    schema: 'emp1-product-projection/v1',
    product: { productId: 'EMP.1' },
    qualificationBoundary: {
      passIsCodeCompliance: false,
      releaseQualified,
    },
    steps: [
      {
        shortId: 'A', stepId: 'EMP.1.A', label: 'Load & reference', backingStageId: 'LAFEA.1',
        state: aState ?? (aResultAvailable ? 'CALCULATED' : aDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: aDocumentLoaded, resultAvailable: aResultAvailable, runAuthorized: true,
      },
      {
        shortId: 'B', stepId: 'EMP.1.B', label: 'Section screening', backingStageId: 'LAFEA.2',
        state: bState ?? (bResultAvailable ? 'CALCULATED' : bDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: bDocumentLoaded, resultAvailable: bResultAvailable,
        retainedResultAvailable: bRetainedResultAvailable, runAuthorized: true,
      },
      {
        shortId: 'C', stepId: 'EMP.1.C', label: 'Local correlation', backingStageId: null,
        state: cState, currentnessBadge: cBadge, resultAvailable: cResultAvailable,
        retainedResultAvailable: cRetainedResultAvailable, runAuthorized: cRunAuthorized,
      },
    ],
  };
}

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
