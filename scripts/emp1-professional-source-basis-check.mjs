#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildEmp1ProfessionalWorkflowPresentation } from '../src/workspace/emp1-professional-workflow-presentation.js';

const sourceIncomplete = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'SOURCE_INCOMPLETE',
  cRunAuthorized: false,
  cBlockers: ['EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED'],
}));
assert.equal(sourceIncomplete.authoritySummary.sourceCurrentness, 'SOURCE INCOMPLETE');
assert.equal(sourceIncomplete.steps[0].statusLabel, 'SOURCE INCOMPLETE');
assert.equal(sourceIncomplete.steps[1].statusLabel, 'SOURCE INCOMPLETE');
assert.equal(sourceIncomplete.authoritySummary.localMethod, 'LOCAL METHOD BLOCKED');

const routeSuspended = buildEmp1ProfessionalWorkflowPresentation(projection({
  cState: 'ROUTE_SUSPENDED',
  cRunAuthorized: false,
  cBlockers: ['WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE'],
}));
assert.equal(routeSuspended.authoritySummary.sourceCurrentness, 'SOURCE CURRENT');
assert.equal(routeSuspended.steps[0].statusLabel, 'SOURCE CURRENT');
assert.equal(routeSuspended.authoritySummary.localMethod, 'LOCAL METHOD BLOCKED');
assert.match(routeSuspended.currentnessNotice.action, /route-authority blocker/u);

const bStaleAndCIncomplete = buildEmp1ProfessionalWorkflowPresentation(projection({
  bState: 'STALE_A_EVIDENCE',
  bResultAvailable: false,
  bRetainedResultAvailable: true,
  cState: 'SOURCE_INCOMPLETE',
  cRunAuthorized: false,
  cBlockers: ['EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED'],
}));
assert.equal(bStaleAndCIncomplete.authoritySummary.sourceCurrentness, 'SOURCE INCOMPLETE');
assert.equal(bStaleAndCIncomplete.authoritySummary.screeningCurrentness, 'SCREENING STALE');

console.log(JSON.stringify({
  schema: 'emp1-professional-source-basis-check/v1',
  status: 'PASS_WRC_SOURCE_BASIS_CURRENTNESS',
  cSourceIncompletePropagatesToBasis: true,
  routeSuspensionDoesNotMasqueradeAsSourceIncomplete: true,
  bStaleRemainsVisibleInScreening: true,
  createsEngineeringAuthority: false,
}, null, 2));

function projection({
  cState,
  cRunAuthorized,
  cBlockers,
  bState = 'CALCULATED',
  bResultAvailable = true,
  bRetainedResultAvailable = false,
}) {
  return {
    schema: 'emp1-product-projection/v1',
    product: { productId: 'EMP.1' },
    qualificationBoundary: { releaseQualified: false },
    steps: [
      {
        shortId: 'A', stepId: 'EMP.1.A', label: 'Load & reference', backingStageId: 'LAFEA.1',
        state: 'CALCULATED', documentLoaded: true, resultAvailable: true, runAuthorized: true,
      },
      {
        shortId: 'B', stepId: 'EMP.1.B', label: 'Section screening', backingStageId: 'LAFEA.2',
        state: bState, documentLoaded: true, resultAvailable: bResultAvailable,
        retainedResultAvailable: bRetainedResultAvailable, runAuthorized: true,
      },
      {
        shortId: 'C', stepId: 'EMP.1.C', label: 'Local correlation', backingStageId: null,
        state: cState, currentnessBadge: cState, resultAvailable: false,
        retainedResultAvailable: false, runAuthorized: cRunAuthorized,
        blockers: Object.freeze([...cBlockers]),
      },
    ],
  };
}