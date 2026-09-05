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
const labels = ['Basis & Source', 'Geometry', 'Loads', 'Load Transfer', 'Section Screening', 'Local Correlation', 'Review & Evidence'];
const ids = ['BASIS_SOURCE', 'GEOMETRY', 'LOADS', 'LOAD_TRANSFER', 'SECTION_SCREENING', 'LOCAL_CORRELATION', 'REVIEW_EVIDENCE'];
const backing = [['A', 'B', 'C'], ['A', 'C'], ['A'], ['A'], ['B'], ['C'], ['A', 'B', 'C']];
const LIVE_ROUTE_SUSPENSION = 'WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE';

assert.equal(EMP1_PROFESSIONAL_WORKFLOW_SCHEMA, 'emp1-professional-workflow/v1');
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.ordinal), [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.stepId), ids);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => step.label), labels);
assert.deepEqual(EMP1_PROFESSIONAL_WORKFLOW_STEPS.map((step) => [...step.backingStepIds]), backing);

const current = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'CALCULATED_CURRENT', cBadge: 'CALCULATED CURRENT',
  cResultAvailable: true, cRetainedResultAvailable: true,
}));
assert.deepEqual(current.authoritySummary, {
  sourceCurrentness: 'SOURCE CURRENT', transferCurrentness: 'TRANSFER CURRENT',
  screeningCurrentness: 'SCREENING CURRENT', localMethod: 'LOCAL METHOD QUALIFIED',
  localResult: 'LOCAL RESULT CURRENT', releaseProfile: 'RELEASE PROFILE NOT QUALIFIED',
  codeCompliance: 'CODE COMPLIANCE NOT ASSESSED',
});
assert.equal(current.currentnessNotice, null);
assert.deepEqual(current.steps.map((step) => step.statusLabel), [
  'SOURCE CURRENT', 'SOURCE CURRENT', 'SOURCE CURRENT', 'TRANSFER CURRENT', 'SCREENING CURRENT',
  'LOCAL METHOD QUALIFIED · LOCAL RESULT CURRENT',
  'LOCAL RESULT CURRENT · RELEASE PROFILE NOT QUALIFIED',
]);
assert.equal(current.steps.some((step) => /\bCALCULATED\b|\bREADY\b|ROUTE SUSPENDED/u.test(step.statusLabel)), false);
assert.ok(current.steps.every((step) => step.canOpen === true));
assert.ok(current.steps.every((step) => step.createsEngineeringAuthority === false));
assert.ok(current.steps.every((step) => step.exposesNumericalResult === false));
assert.deepEqual(current.authorityBoundary, {
  presentationOnly: true, createsEngineeringAuthority: false, createsRouteAuthority: false,
  createsCodeCompliance: false, createsReleaseAuthority: false, staleNumericalResultMayBecomeCurrent: false,
});

const staleInput = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'STALE_INPUT', cBadge: 'STALE INPUT', cResultAvailable: false,
  cRetainedResultAvailable: true,
  cBlockers: ['EMP1_WORKBENCH_ATTACHMENTGEOMETRY_CHANGED', 'EMP1_WORKBENCH_LOCALROUTE_CHANGED'],
}));
assert.equal(staleInput.authoritySummary.localResult, 'LOCAL RESULT STALE');
assert.equal(staleInput.currentnessNotice.state, 'STALE');
assert.deepEqual(staleInput.currentnessNotice.reasonCodes,
  ['EMP1_WORKBENCH_ATTACHMENTGEOMETRY_CHANGED', 'EMP1_WORKBENCH_LOCALROUTE_CHANGED']);
assert.match(staleInput.currentnessNotice.reasons[0], /Attachment geometry/u);
assert.match(staleInput.currentnessNotice.reasons[1], /route, load-case or pressure-result/u);
assert.match(staleInput.currentnessNotice.action, /affected upstream step/u);

const staleAuthority = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'STALE_AUTHORITY', cBadge: 'STALE AUTHORITY', cResultAvailable: false,
  cRetainedResultAvailable: true, cBlockers: ['EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED'],
}));
assert.equal(staleAuthority.currentnessNotice.state, 'STALE');
assert.match(staleAuthority.currentnessNotice.reasons[0], /route authority changed/u);
assert.match(staleAuthority.currentnessNotice.action, /current qualified route authority/u);

const staleBlocked = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'ROUTE_SUSPENDED', cBadge: 'ROUTE SUSPENDED', cResultAvailable: false,
  cRetainedResultAvailable: true, cRunAuthorized: false, cBlockers: [LIVE_ROUTE_SUSPENSION],
}));
assert.equal(staleBlocked.authoritySummary.localMethod, 'LOCAL METHOD BLOCKED');
assert.equal(staleBlocked.authoritySummary.localResult, 'LOCAL RESULT STALE');
assert.equal(staleBlocked.currentnessNotice.state, 'STALE');
assert.deepEqual(staleBlocked.currentnessNotice.reasonCodes, [LIVE_ROUTE_SUSPENSION]);
assert.match(staleBlocked.currentnessNotice.action, /Restore or qualify the current bounded WRC route authority/u);

const noC = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'ROUTE_SUSPENDED', cBadge: 'ROUTE SUSPENDED', cResultAvailable: false,
  cRetainedResultAvailable: false, cRunAuthorized: false, cBlockers: [LIVE_ROUTE_SUSPENSION],
}));
assert.equal(noC.steps[5].canOpen, true);
assert.equal(noC.authoritySummary.localMethod, 'LOCAL METHOD BLOCKED');
assert.equal(noC.authoritySummary.localResult, 'LOCAL RESULT NOT CALCULATED');
assert.equal(noC.currentnessNotice.state, 'BLOCKED');
assert.match(noC.currentnessNotice.reasons[0], /WRC GAMMA5 ROUTE REQUALIFICATION REQUIRED/u);
assert.match(noC.currentnessNotice.action, /route-authority blocker/u,
  'live WRC route suspension must not be misreported as missing source/geometry');
assert.equal(noC.authoritySummary.codeCompliance, 'CODE COMPLIANCE NOT ASSESSED');

const unknownBlocked = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE', cBadge: 'SOURCE INCOMPLETE', cResultAvailable: false,
  cRetainedResultAvailable: false, cRunAuthorized: false, cBlockers: ['EMP1_WRC_UNMAPPED_BLOCKER'],
}));
assert.deepEqual(unknownBlocked.currentnessNotice.reasonCodes, ['EMP1_WRC_UNMAPPED_BLOCKER']);
assert.equal(unknownBlocked.currentnessNotice.reasons[0], 'EMP1 WRC UNMAPPED BLOCKER');

const staleB = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE', cBadge: 'SOURCE INCOMPLETE', cResultAvailable: false,
  cRetainedResultAvailable: false, cRunAuthorized: false, bState: 'STALE_A_EVIDENCE',
  bResultAvailable: false, bRetainedResultAvailable: true,
  cBlockers: ['EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED'],
}));
assert.equal(staleB.authoritySummary.sourceCurrentness, 'SOURCE STALE');
assert.equal(staleB.authoritySummary.screeningCurrentness, 'SCREENING STALE');
assert.equal(staleB.steps[4].statusLabel, 'SCREENING STALE');

const sourceMissing = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE', cBadge: 'SOURCE INCOMPLETE', cResultAvailable: false,
  cRetainedResultAvailable: false, cRunAuthorized: false, aDocumentLoaded: false,
  bDocumentLoaded: false, aResultAvailable: false, bResultAvailable: false,
  cBlockers: ['EMP1_WORKBENCH_A_DOCUMENT_REQUIRED', 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED'],
}));
assert.equal(sourceMissing.steps[0].statusLabel, 'SOURCE INPUT REQUIRED');
assert.equal(sourceMissing.authoritySummary.transferCurrentness, 'TRANSFER INPUT REQUIRED');
assert.equal(sourceMissing.authoritySummary.screeningCurrentness, 'SCREENING INPUT REQUIRED');
assert.equal(sourceMissing.currentnessNotice.state, 'BLOCKED');
assert.equal(sourceMissing.currentnessNotice.reasons.length, 2);

const analyticalSource = await read('src/workspace/lafea-analytical-calc-content.js');
assert.match(analyticalSource, /getEmp1EngineeringReviewWorkspace\?\.\(\) \?\? null/u);
assert.match(analyticalSource, /renderEmp1ProfessionalWorkflow\(root, projection, options\.onSelectRoute, \{/u);
assert.match(analyticalSource, /runFailure: options\.emp1RunFailure/u);
assert.match(analyticalSource, /reviewWorkspace: engineeringReview/u);
assert.match(analyticalSource, /onReview: options\.handlers\.onEmp1EngineeringReview/u);
assert.equal(analyticalSource.includes('renderEmp1AssessmentWorkflow(root, projection'), false);

const viewSource = await read('src/workspace/emp1-professional-workflow-view.js');
assert.match(viewSource, /emp1PlainLanguageLabel/u);
assert.match(viewSource, /runFailureBanner/u);
assert.match(viewSource, /dataset\.role = 'emp1-workflow-run-failure'/u);
assert.match(viewSource, /dataset\.role = 'emp1-workflow-run-failure-code'/u);
assert.match(viewSource, /const runFailure = options\.runFailure \?\? null/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-workflow-steps'/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-authority-summary'/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-currentness-notice'/u);
assert.match(viewSource, /item\.dataset\.reasonCode = reasonCode/u);
assert.match(viewSource, /dataset\.role = 'emp1-professional-required-action'/u);
assert.match(viewSource, /renderEmp1EngineeringReviewPanel/u);
assert.match(viewSource, /reviewState: reviewWorkspace\?\.readinessReviewState \?\? null/u);
assert.match(viewSource, /scrollToRole\(root, 'emp1-engineering-review-panel'\)/u);
assert.match(viewSource, /details\.open = presentation\.backingCalculators\.some/u);
assert.match(viewSource, /scheduleTargetScroll/u);
assert.match(viewSource, /requestAnimationFrame/u);
assert.match(viewSource, /data-guided-target/u);
assert.match(viewSource, /Historical\/stale C numerical evidence is never promoted/u);

const reviewViewSource = await read('src/workspace/emp1-engineering-review-view.js');
for (const role of [
  'emp1-engineering-review-panel', 'emp1-engineering-review-form',
  'emp1-engineering-reviewer-identity', 'emp1-engineering-reviewer-role',
  'emp1-engineering-review-comment', 'emp1-engineering-review-action',
  'emp1-engineering-review-authority-boundary',
]) assert.ok(reviewViewSource.includes(role), `missing review role ${role}`);
assert.equal(reviewViewSource.includes('semanticHash('), false);
assert.equal(reviewViewSource.includes('runEmp1('), false);
assert.equal(reviewViewSource.includes('stressIntensity'), false);
assert.equal(reviewViewSource.includes('sourceHash:'), false);
assert.equal(reviewViewSource.includes('routeAuthorityHash:'), false);
assert.equal(reviewViewSource.includes('resultHash:'), false);

const presentationSource = await read('src/workspace/emp1-professional-workflow-presentation.js');
assert.equal(presentationSource.includes('../core/emp1/'), false);
assert.equal(presentationSource.includes('runEmp1'), false);
assert.equal(presentationSource.includes('semanticHash('), false,
  'workflow presentation must not create source/result/authority hashes');
assert.equal(presentationSource.includes('stressIntensity'), false,
  'workflow presentation must not calculate or reconstruct WRC stress intensity');
assert.match(presentationSource, /\^WRC_GAMMA5_ROUTE_/u,
  'live bounded-route suspension family must be classified as route authority');

console.log(JSON.stringify({
  schema: 'emp1-professional-workflow-check/v5',
  status: 'PASS_WRC_PROFESSIONAL_WORKFLOW_RUN_FAILURE_AND_GOVERNED_REVIEW_COMPOSITION',
  labels, backing, currentAuthoritySummary: current.authoritySummary,
  staleInputReasonCodes: staleInput.currentnessNotice.reasonCodes,
  staleAuthorityReasonCodes: staleAuthority.currentnessNotice.reasonCodes,
  liveRouteSuspensionClassifiedAsAuthority: true,
  routeTargetCustodyGuarded: true, staleReasonEvidencePreserved: true,
  unknownReasonFailsVisible: true, runFailurePresentationPreserved: true,
  plainLanguageLabelsPreserved: true, engineeringAuthorityCreatedByPresentation: false,
  routeAuthorityCreatedByPresentation: false, codeComplianceCreatedByPresentation: false,
  releaseAuthorityCreatedByPresentation: false, uiAuthoredEngineeringHashes: false,
  numericalComparison: 'NOT_APPLICABLE_PRESENTATION_AND_REVIEW_ACTION_WIRING_ONLY',
}, null, 2));

function projection({
  cState, cBadge, cResultAvailable, cRetainedResultAvailable, cRunAuthorized = true,
  cBlockers = [], aDocumentLoaded = true, bDocumentLoaded = true, aResultAvailable = true,
  bResultAvailable = true, bRetainedResultAvailable = false, aState = null, bState = null,
  releaseQualified = false,
}) {
  return {
    schema: 'emp1-product-projection/v1', product: { productId: 'EMP.1' },
    qualificationBoundary: { passIsCodeCompliance: false, releaseQualified },
    steps: [
      { shortId: 'A', stepId: 'EMP.1.A', label: 'Load & reference', backingStageId: 'LAFEA.1',
        state: aState ?? (aResultAvailable ? 'CALCULATED' : aDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: aDocumentLoaded, resultAvailable: aResultAvailable, runAuthorized: true },
      { shortId: 'B', stepId: 'EMP.1.B', label: 'Section screening', backingStageId: 'LAFEA.2',
        state: bState ?? (bResultAvailable ? 'CALCULATED' : bDocumentLoaded ? 'SOURCE_LOADED' : 'INPUT_REQUIRED'),
        documentLoaded: bDocumentLoaded, resultAvailable: bResultAvailable,
        retainedResultAvailable: bRetainedResultAvailable, runAuthorized: true },
      { shortId: 'C', stepId: 'EMP.1.C', label: 'Local correlation', backingStageId: null,
        state: cState, currentnessBadge: cBadge, resultAvailable: cResultAvailable,
        retainedResultAvailable: cRetainedResultAvailable, runAuthorized: cRunAuthorized,
        blockers: Object.freeze([...cBlockers]) },
    ],
  };
}

async function read(path) { return readFile(resolve(root, path), 'utf8'); }
