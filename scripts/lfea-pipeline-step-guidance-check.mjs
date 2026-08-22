#!/usr/bin/env node

/** Real-code check for the LFEA pipeline stepper and stacked UI safety gates. */
import assert from 'node:assert/strict';
import {
  createLfeaPipelineSession,
  deriveLfeaPipelineStepGuidance,
} from '../src/workspace/lfea-pipeline-session.js';
import { LFEA_PIPELINE_STEPS } from '../src/workspace/lfea-pipeline-step-registry.js';

const session = createLfeaPipelineSession(LFEA_PIPELINE_STEPS);
let state = session.getState();
assert.equal(state.guidance.stepStatusById.INPUT, 'CURRENT');
assert.equal(state.guidance.nextStepId, 'INPUT');
assert.equal(state.guidance.completedCount, 0);
assert.equal(state.guidance.stepCount, LFEA_PIPELINE_STEPS.length);

session.setStepStatus('INPUT', { complete: true, detail: 'Loaded BM4_L.ACCDB.' });
session.setStepStatus('ERROR_CHECK', { available: true, detail: 'Review the disclosed limitations.' });
session.setStepStatus('LOAD_CASE', { available: false, blockedReason: 'Clear Error check first.' });
state = session.getState();
assert.equal(state.guidance.stepStatusById.INPUT, 'COMPLETE');
assert.equal(state.guidance.nextStepId, 'ERROR_CHECK');
assert.equal(state.guidance.completedCount, 1);
assert.match(state.guidance.nextActionText, /^Next: Error check — Review the disclosed limitations\.$/u);
assert.equal(state.guidance.stepStatusById.LOAD_CASE, 'BLOCKED');

for (const stepId of ['ERROR_CHECK', 'RUN', 'OUTPUT', 'EXPORT']) {
  session.setStepStatus(stepId, { available: true, complete: true });
}
session.setStepStatus('LOAD_CASE', {
  available: false,
  blockedReason: 'An ACCDB import does not seal a pre-FEA authorization.',
});
state = session.getState();
assert.equal(state.guidance.nextStepId, null);
assert.match(state.guidance.nextActionText, /^Blocked at Load case: An ACCDB import/u);

session.setStepStatus('LOAD_CASE', { available: true, complete: true, blockedReason: null });
state = session.getState();
assert.equal(state.guidance.nextStepId, null);
assert.equal(state.guidance.nextActionText, 'All available steps are complete.');
assert.equal(state.guidance.completedCount, LFEA_PIPELINE_STEPS.length);

const derived = deriveLfeaPipelineStepGuidance(
  LFEA_PIPELINE_STEPS,
  Object.fromEntries(LFEA_PIPELINE_STEPS.map((step) => [step.stepId, {
    available: true, complete: step.stepId === 'INPUT', detail: null, blockedReason: null,
  }])),
  'INPUT',
);
assert.equal(derived.stepStatusById.INPUT, 'COMPLETE');
assert.equal(derived.nextStepId, 'ERROR_CHECK');

const skipped = deriveLfeaPipelineStepGuidance(
  LFEA_PIPELINE_STEPS,
  Object.fromEntries(LFEA_PIPELINE_STEPS.map((step) => [step.stepId, {
    available: true, complete: step.stepId === 'RUN', detail: null, blockedReason: null,
  }])),
  'RUN',
);
assert.equal(skipped.stepStatusById.INPUT, 'READY');
assert.equal(skipped.nextStepId, 'INPUT');

await import('./lfea-ui-numerical-custody-check.mjs');
await import('./lfea-ui-engineering-session-check.mjs');
await import('./lfea-ui-analysis-authorization-boundary-check.mjs');
await import('./lfea-ui-engineering-session-integration-check.mjs');
await import('./lfea-ui-diagnostic-presentation-check.mjs');
await import('./lfea-ui-source-acquisition-check.mjs');
await import('./lfea-ui-model-review-check.mjs');
await import('./lfea-ui-geometry-review-check.mjs');
await import('./lfea-ui-error-check-check.mjs');
await import('./lfea-ui-results-authority-check.mjs');

console.log(JSON.stringify({ check: 'lfea-pipeline-step-guidance', status: 'PASS', steps: LFEA_PIPELINE_STEPS.length }));
