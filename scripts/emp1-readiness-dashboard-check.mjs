#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectEmp1Readiness } from '../src/core/emp1/emp1-readiness-projection.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const current = projectEmp1Readiness(projection({
  cState: 'CALCULATED_CURRENT',
  cResultAvailable: true,
  cRetainedResultAvailable: true,
}));
assert.equal(current.overall, 'READY_FOR_ENGINEERING_REVIEW');
assert.equal(current.source.state, 'CURRENT');
assert.equal(current.method.state, 'AUTHORIZED_BOUNDED_ROUTE');
assert.equal(current.applicability.state, 'QUALIFIED_BY_CURRENT_EXECUTION_GATE');
assert.equal(current.calculation.state, 'CURRENT');
assert.equal(current.review.state, 'NOT_REVIEWED');
assert.equal(current.codeCompliance.state, 'NOT_ASSESSED');
assert.equal(current.release.state, 'NOT_QUALIFIED');

const ready = projectEmp1Readiness(projection({
  cState: 'READY_TO_RUN',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
}));
assert.equal(ready.overall, 'READY_TO_CALCULATE');
assert.equal(ready.applicability.state, 'PENDING_EXECUTION_GATE');
assert.equal(ready.calculation.state, 'READY_TO_CALCULATE');

const stale = projectEmp1Readiness(projection({
  cState: 'STALE_INPUT',
  cResultAvailable: false,
  cRetainedResultAvailable: true,
  cBlockers: ['EMP1_WORKBENCH_ATTACHMENTGEOMETRY_CHANGED'],
}));
assert.equal(stale.overall, 'SOURCE_STALE');
assert.equal(stale.applicability.state, 'STALE_WITH_RETAINED_CALCULATION');
assert.equal(stale.calculation.state, 'STALE');

const blocked = projectEmp1Readiness(projection({
  cState: 'ROUTE_SUSPENDED',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
  cRunAuthorized: false,
  cBlockers: ['WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE'],
}));
assert.equal(blocked.overall, 'METHOD_BLOCKED');
assert.equal(blocked.method.state, 'BLOCKED');
assert.equal(blocked.applicability.state, 'NOT_ESTABLISHED');

const missing = projectEmp1Readiness(projection({
  cState: 'SOURCE_INCOMPLETE',
  cResultAvailable: false,
  cRetainedResultAvailable: false,
  cRunAuthorized: false,
  aDocumentLoaded: false,
  bDocumentLoaded: false,
  aResultAvailable: false,
  bResultAvailable: false,
  cBlockers: ['EMP1_WORKBENCH_A_DOCUMENT_REQUIRED', 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED'],
}));
assert.equal(missing.overall, 'INPUT_REQUIRED');
assert.equal(missing.source.state, 'INPUT_REQUIRED');
assert.equal(missing.applicability.state, 'NOT_ESTABLISHED');

for (const readiness of [current, ready, stale, blocked, missing]) {
  assert.equal(readiness.authorityBoundary.projectionOnly, true);
  assert.equal(readiness.authorityBoundary.createsEngineeringAuthority, false);
  assert.equal(readiness.authorityBoundary.createsMethodAuthority, false);
  assert.equal(readiness.authorityBoundary.createsApplicabilityAuthority, false);
  assert.equal(readiness.authorityBoundary.createsReviewAuthority, false);
  assert.equal(readiness.authorityBoundary.createsCodeCompliance, false);
  assert.equal(readiness.authorityBoundary.createsReleaseAuthority, false);
}

const viewSource = await read('src/workspace/emp1-professional-workflow-view.js');
assert.match(viewSource,
  /import \{ projectEmp1Readiness \} from '\.\.\/core\/emp1\/emp1-readiness-projection\.js';/u);
assert.match(viewSource, /const readiness = projectEmp1Readiness\(projection\);/u);
assert.equal((viewSource.match(/projectEmp1Readiness\(projection\)/gu) ?? []).length, 1,
  'the professional view should consume one core readiness projection per render');
assert.match(viewSource, /dataset\.role = 'emp1-readiness-dashboard'/u);
assert.match(viewSource, /dataset\.role = 'emp1-readiness-overall'/u);
assert.match(viewSource, /dataset\.role = 'emp1-readiness-dimensions'/u);
assert.match(viewSource, /dataset\.role = 'emp1-readiness-dimension'/u);
assert.match(viewSource, /dataset\.readinessDimension = definition\.key/u);
assert.match(viewSource, /dataset\.readinessState = state/u);
assert.match(viewSource, /dataset\.role = 'emp1-readiness-blockers'/u);
assert.match(viewSource, /item\.dataset\.blockerCode = code/u);
assert.match(viewSource, /dataset\.role = 'emp1-readiness-authority-boundary'/u);
assert.match(viewSource,
  /does not establish method authority, applicability authority, engineering review, code compliance, or release qualification/u);

const expectedLabels = [
  'Source & input',
  'Bounded method',
  'Applicability',
  'Calculation',
  'Engineering review',
  'Code compliance',
  'Release qualification',
];
for (const label of expectedLabels) assert.ok(viewSource.includes(label), `missing dashboard label: ${label}`);

assert.equal(viewSource.includes('runEmp1('), false,
  'dashboard view must not execute the EMP.1 numerical transaction');
assert.equal(viewSource.includes('semanticHash('), false,
  'dashboard view must not create or re-evaluate authority/currentness hashes');
assert.equal(viewSource.includes('stressIntensity'), false,
  'dashboard view must not calculate or reconstruct WRC stress intensity');
assert.equal(viewSource.includes('releaseQualified ==='), false,
  'dashboard view must not decide release qualification');
assert.equal(viewSource.includes('runAuthorized ==='), false,
  'dashboard view must not decide bounded-route authorization');
assert.equal(viewSource.includes("c.state ==="), false,
  'dashboard view must not re-implement C-state qualification logic');

console.log(JSON.stringify({
  schema: 'emp1-readiness-dashboard-check/v1',
  status: 'PASS_READ_ONLY_CORE_READINESS_PRESENTATION',
  dimensions: expectedLabels,
  currentOverall: current.overall,
  readyOverall: ready.overall,
  staleOverall: stale.overall,
  blockedOverall: blocked.overall,
  missingOverall: missing.overall,
  applicabilityBeforeExecution: ready.applicability.state,
  applicabilityAfterCurrentExecution: current.applicability.state,
  qualificationLogicInUi: false,
  engineeringAuthorityCreatedByUi: false,
  codeComplianceCreatedByUi: false,
  releaseAuthorityCreatedByUi: false,
}, null, 2));

function projection({
  cState,
  cResultAvailable,
  cRetainedResultAvailable,
  cRunAuthorized = true,
  cBlockers = [],
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
    custody: {},
    qualificationBoundary: {
      passIsCodeCompliance: false,
      releaseQualified,
      emp1CProductionAuthority: cRunAuthorized,
    },
    steps: [
      {
        shortId: 'A',
        stepId: 'EMP.1.A',
        label: 'Load & reference',
        backingStageId: 'LAFEA.1',
        state: aState ?? (aResultAvailable ? 'CALCULATED' : aDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: aDocumentLoaded,
        resultAvailable: aResultAvailable,
        retainedResultAvailable: aResultAvailable,
        runAuthorized: true,
      },
      {
        shortId: 'B',
        stepId: 'EMP.1.B',
        label: 'Section screening',
        backingStageId: 'LAFEA.2',
        state: bState ?? (bResultAvailable ? 'CALCULATED' : bDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: bDocumentLoaded,
        resultAvailable: bResultAvailable,
        retainedResultAvailable: bRetainedResultAvailable,
        runAuthorized: true,
      },
      {
        shortId: 'C',
        stepId: 'EMP.1.C',
        label: 'Local correlation',
        backingStageId: null,
        state: cState,
        documentLoaded: aDocumentLoaded && bDocumentLoaded,
        resultAvailable: cResultAvailable,
        retainedResultAvailable: cRetainedResultAvailable,
        runAuthorized: cRunAuthorized,
        blockers: Object.freeze([...cBlockers]),
      },
    ],
  };
}

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
