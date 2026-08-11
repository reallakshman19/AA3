#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_GUIDED_WORKFLOW_SCHEMA,
  buildLafeaGuidedWorkflow,
} from '../src/workspace/lafea-guided-workflow.js';

const noDocument = workflow('LAFEA.1', null, null, null);
assert.equal(step(noDocument, 'ANALYSIS_PROFILE').status, 'NOT_STARTED');
assert.deepEqual(step(noDocument, 'ANALYSIS_PROFILE').reasons, ['SOURCE_DOCUMENT_REQUIRED']);

const noLifecycle = workflow('LAFEA.1', {
  materials: [{ identity: 'MAT-1' }],
  loadCases: [{ identity: 'LC-1' }],
}, null, null);
assert.equal(step(noLifecycle, 'ANALYSIS_PROFILE').status, 'BLOCKED');
assert.deepEqual(step(noLifecycle, 'ANALYSIS_PROFILE').reasons, ['LIFECYCLE_NOT_INITIALIZED']);

const analytical = workflow('LAFEA.1', {
  materials: [{ identity: 'MAT-1' }],
  loadCases: [{ identity: 'LC-1' }],
}, lifecycle('ANALYTICAL_FOUNDATION_V1'), { status: 'CURRENT' });
assert.equal(analytical.schema, LAFEA_GUIDED_WORKFLOW_SCHEMA);
assert.equal(step(analytical, 'ANALYSIS_PROFILE').status, 'COMPLETE');
assert.equal(step(analytical, 'MATERIALS_SECTIONS').status, 'READY');
assert.equal(step(analytical, 'RESTRAINTS_BCS').status, 'COMPLETE');
assert.deepEqual(step(analytical, 'RESTRAINTS_BCS').reasons, ['WORKFLOW_STEP_NOT_APPLICABLE']);
assert.equal(step(analytical, 'LOADS_CASES').status, 'READY');
assert.equal(analytical.releaseQualified, false);

const analyticalMissingInputs = workflow('LAFEA.1', {
  materials: [],
  loadCases: [],
}, lifecycle('ANALYTICAL_FOUNDATION_V1'), { status: 'CURRENT' });
assert.equal(step(analyticalMissingInputs, 'MATERIALS_SECTIONS').status, 'BLOCKED');
assert.deepEqual(step(analyticalMissingInputs, 'MATERIALS_SECTIONS').reasons, ['MATERIALS_REQUIRED']);
assert.equal(step(analyticalMissingInputs, 'LOADS_CASES').status, 'BLOCKED');
assert.deepEqual(step(analyticalMissingInputs, 'LOADS_CASES').reasons, ['LOAD_CASES_REQUIRED']);

const continuum = workflow('LAFEA.3', {
  materials: [{ materialId: 'MAT-1' }],
  constraints: [{ constraintId: 'BC-1' }],
  loadCases: [{ loadCaseId: 'LC-1' }],
}, lifecycle('FEA_MESH_RECOVERY_V1'), { status: 'CURRENT' });
assert.equal(step(continuum, 'MATERIALS_SECTIONS').status, 'READY');
assert.equal(step(continuum, 'RESTRAINTS_BCS').status, 'READY');
assert.equal(step(continuum, 'LOADS_CASES').status, 'READY');

const continuumMissingBc = workflow('LAFEA.3', {
  materials: [{ materialId: 'MAT-1' }],
  constraints: [],
  loadCases: [{ loadCaseId: 'LC-1' }],
}, lifecycle('FEA_MESH_RECOVERY_V1'), { status: 'CURRENT' });
assert.equal(step(continuumMissingBc, 'RESTRAINTS_BCS').status, 'BLOCKED');
assert.deepEqual(step(continuumMissingBc, 'RESTRAINTS_BCS').reasons, ['BOUNDARY_CONDITIONS_REQUIRED']);

console.log(JSON.stringify({
  check: 'lafea-ui-workflow-truthfulness',
  status: 'PASS',
  workflowReasonsRemainCanonical: true,
  githubActionsWorkflowAdded: false,
}));

function workflow(stageId, document, lifecycleValue, lifecycleBinding) {
  return buildLafeaGuidedWorkflow({
    activeStageId: stageId,
    status: 'READY',
    diagnostics: [],
    stages: {
      [stageId]: {
        stageId,
        document,
        lifecycle: lifecycleValue,
        lifecycleBinding,
        execution: null,
        orchestration: orchestration(stageId),
      },
    },
  });
}

function lifecycle(profileId) { return { profileId }; }

function orchestration(stageId) {
  const complete = section('COMPLETE');
  return {
    schema: 'lafea-workbench-orchestration/v1',
    stageId,
    stageAdapterId: `LAFEA_STAGE_ADAPTER:${stageId}:V1`,
    sections: {
      SOURCE: complete,
      MODEL: complete,
      PREPARATION: complete,
      DISCRETIZATION: complete,
      AUTHORIZATION: section('READY'),
      EXECUTION: section('NOT_STARTED', ['EXECUTION_NOT_RUN']),
      RESULTS: section('NOT_STARTED', ['EXECUTION_REQUIRED']),
      RELEASE: section('BLOCKED', ['RELEASE_NOT_QUALIFIED']),
    },
  };
}

function section(state, reasons = []) { return { state, reasons }; }
function step(value, stepId) { return value.steps.find((row) => row.stepId === stepId); }
