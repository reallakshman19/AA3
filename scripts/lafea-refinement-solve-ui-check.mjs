#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LAFEA_SOLVE_READINESS_VIEW_SCHEMA,
  buildLafeaSolveReadinessViewModel,
} from '../src/workspace/lafea-solve-readiness-panel.js';
import { refinementSummary } from '../src/workspace/lafea-refinement-disclosure.js';

const sourceParentStale = 'LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE';
const workflow = {
  steps: [
    step('MODEL_DIAGNOSTICS', 'Blocked', 'BLOCKED', [sourceParentStale]),
    step('AUTHORIZATION', 'Authorization', 'BLOCKED', [sourceParentStale]),
    step('RUN', 'Run', 'BLOCKED', [sourceParentStale]),
  ],
};
const blocked = buildLafeaSolveReadinessViewModel(workflow, []);
assert.equal(blocked.schema, LAFEA_SOLVE_READINESS_VIEW_SCHEMA);
assert.equal(blocked.status, 'BLOCKED');
assert.equal(blocked.primaryCode, sourceParentStale);
assert.match(blocked.primaryMessage, /Re-prepare the analysis from the current source/u);
assert.equal(blocked.steps.length, 3, 'canonical solve step evidence must be retained');
assert.deepEqual(blocked.reasons, [sourceParentStale], 'duplicate canonical reasons must be collapsed');

const ready = buildLafeaSolveReadinessViewModel({
  steps: [
    step('MODEL_DIAGNOSTICS', 'Model diagnostics', 'READY'),
    step('AUTHORIZATION', 'Authorization', 'READY'),
    step('RUN', 'Run', 'READY'),
  ],
});
assert.equal(ready.status, 'READY');
assert.equal(ready.primaryCode, null);
assert.match(ready.primaryMessage, /permit the registered solve action/u);

assert.equal(refinementSummary({ evidence: { present: false }, actions: {} }), 'Refine retained mesh — mesh required');
assert.equal(refinementSummary({ evidence: { present: true }, actions: { canRefineMesh: true } }), 'Refine retained mesh');
assert.equal(refinementSummary({
  evidence: { present: true }, actions: { canRefineMesh: false },
  refinement: { scopeEligible: true, productQualified: false },
}), 'Refine retained mesh — qualification pending');
assert.equal(refinementSummary({
  evidence: { present: true }, actions: { canRefineMesh: false },
  refinement: { scopeEligible: false, productQualified: false },
}), 'Refine retained mesh — unavailable');

const content = read('../src/workspace/lafea-workbench-content.js');
const refinement = read('../src/workspace/lafea-refinement-disclosure.js');
const solve = read('../src/workspace/lafea-solve-readiness-panel.js');
const generation = read('../src/workspace/lafea-discretization-generation-panel.js');
assert.match(content, /renderLafeaSolveReadiness/u);
assert.match(content, /compactLafeaRefinementWorkspace/u);
assert.doesNotMatch(content, /function workflowSummary/u);
assert.doesNotMatch(content, /function diagnosticList/u);
assert.match(refinement, /details\.dataset\.role = 'lafea-refinement-disclosure'/u);
assert.match(refinement, /productEvidence\.open = false/u);
assert.match(solve, /summaryText: 'Why\? \(i\)'/u);
assert.match(solve, /dataset\.role = 'lafea-diagnostics'/u);
assert.match(generation, /Local target length must be greater than zero and smaller than the global target/u);
assert.match(generation, /LAFEA_RETAINED_MESH_REFINEMENT_POLICY/u);
assert.match(generation, /targetIds\.length > LAFEA_RETAINED_MESH_REFINEMENT_POLICY\.maximumTargets/u);
assert.match(generation, /minimumTargetRatio = legacyLafea3/u);
assert.doesNotMatch(generation, /global \* 0\.25/u);
assert.match(generation, /actual shared-edge size transition against the bound mesh-profile limit/u);
assert.match(generation, /Length unit is required; it is never inferred silently/u);

console.log(JSON.stringify({
  check: 'lafea-refinement-solve-ui',
  status: 'PASS',
  onePrimarySolveState: true,
  canonicalSolveEvidenceRetained: true,
  refinementDefaultCollapsed: true,
  refinementEngineeringValidationUnchanged: true,
  lafea3RefinementUiPolicyBoundToProduction: true,
  lafea3SingleTargetEnvelopeDisclosed: true,
}));

function step(stepId, label, status, reasons = []) {
  return { stepId, label, status, reasons };
}
function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
