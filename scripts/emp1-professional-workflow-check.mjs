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
assert.ok(current.steps.every((step) => step.canOpen === true));
assert.ok(current.steps.every((step) => step.createsEngineeringAuthority === false));
assert.ok(current.steps.every((step) => step.exposesNumericalResult === false));
assert.equal(current.steps[5].statusLabel, 'C CALCULATED CURRENT');
assert.equal(current.steps[6].statusLabel, 'CURRENT C RESULT');
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
assert.equal(stale.steps[5].statusLabel, 'C STALE AUTHORITY');
assert.equal(stale.steps[6].statusLabel, 'C HISTORICAL / NOT REPORTABLE');
assert.equal(stale.authorityBoundary.staleNumericalResultMayBecomeCurrent, false);

const noC = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'ROUTE_SUSPENDED',
  cBadge: 'ROUTE SUSPENDED',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
}));
assert.equal(noC.steps[5].canOpen, true,
  'Local Correlation setup/evidence must remain inspectable while production execution is suspended');
assert.equal(noC.steps[6].statusLabel, 'B EVIDENCE ONLY');

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
assert.match(viewSource, /dataset\.role = 'emp1-technical-backing-steps'/u);
assert.match(viewSource, /Historical\/stale C numerical evidence is never promoted/u);

const presentationSource = await read('src/workspace/emp1-professional-workflow-presentation.js');
assert.equal(presentationSource.includes('../core/emp1/'), false,
  'professional workflow presentation must not create a parallel core authority dependency');
assert.equal(presentationSource.includes('runEmp1'), false,
  'professional workflow presentation must not invoke the calculation');

console.log(JSON.stringify({
  schema: 'emp1-professional-workflow-check/v1',
  status: 'PASS_SEVEN_STEP_PROFESSIONAL_WORKFLOW_PRESENTATION',
  labels,
  backing,
  currentReviewState: current.steps[6].statusLabel,
  staleReviewState: stale.steps[6].statusLabel,
  suspendedLocalCorrelationNavigable: noC.steps[5].canOpen,
  engineeringAuthorityCreatedByPresentation: false,
  routeAuthorityCreatedByPresentation: false,
  codeComplianceCreatedByPresentation: false,
  releaseAuthorityCreatedByPresentation: false,
  numericalComparison: 'NOT_APPLICABLE_PRESENTATION_ONLY',
}, null, 2));

function projection({ cState, cBadge, cResultAvailable, cRetainedResultAvailable }) {
  return {
    schema: 'emp1-product-projection/v1',
    product: { productId: 'EMP.1' },
    steps: [
      {
        shortId: 'A', stepId: 'EMP.1.A', label: 'Load & reference', backingStageId: 'LAFEA.1',
        state: 'CALCULATED', resultAvailable: true, runAuthorized: true,
      },
      {
        shortId: 'B', stepId: 'EMP.1.B', label: 'Section screening', backingStageId: 'LAFEA.2',
        state: 'CALCULATED', resultAvailable: true, runAuthorized: true,
      },
      {
        shortId: 'C', stepId: 'EMP.1.C', label: 'Local correlation', backingStageId: null,
        state: cState, currentnessBadge: cBadge, resultAvailable: cResultAvailable,
        retainedResultAvailable: cRetainedResultAvailable, runAuthorized: cState !== 'ROUTE_SUSPENDED',
      },
    ],
  };
}

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
