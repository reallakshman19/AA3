#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { lafeaStageAnalysisAdapter } from '../src/workspace/lafea-stage-analysis-adapter.js';
import { buildLafeaSolveReadinessViewModel } from '../src/workspace/lafea-solve-readiness-panel.js';

const adapter = lafeaStageAnalysisAdapter('LAFEA.6');
assert.equal(adapter.routeFamily, 'UNSUPPORTED');
assert.equal(adapter.execution.qualifiedRouteRegistered, false);
assert.equal(adapter.discretization.applicable, false);
assert.equal(adapter.discretization.generationAuthorized, false);

const workflow = Object.freeze({
  analysisRouteFamily: adapter.routeFamily,
  steps: Object.freeze([
    Object.freeze({
      stepId: 'MODEL_DIAGNOSTICS',
      label: 'Model diagnostics',
      status: 'BLOCKED',
      reasons: Object.freeze(['STAGE_ENGINE_NOT_IMPLEMENTED']),
    }),
    Object.freeze({
      stepId: 'AUTHORIZATION',
      label: 'Authorization',
      status: 'BLOCKED',
      reasons: Object.freeze(['STAGE_ENGINE_NOT_IMPLEMENTED']),
    }),
    Object.freeze({
      stepId: 'RUN',
      label: 'Run',
      status: 'BLOCKED',
      reasons: Object.freeze(['UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED']),
    }),
  ]),
});
const solve = buildLafeaSolveReadinessViewModel(workflow, []);
assert.equal(solve.status, 'NOT_APPLICABLE');
assert.equal(solve.executionSupported, false);
assert.equal(solve.label, 'Not applicable');
assert.equal(solve.primaryCode, 'UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED');
assert.match(solve.primaryMessage, /No qualified analysis route is registered/u);

const content = fs.readFileSync(
  new URL('../src/workspace/lafea-workbench-content.js', import.meta.url),
  'utf8',
);
assert.match(content, /analysisRouteFamily === 'UNSUPPORTED'/u);
assert.match(content, /discretization\?\.uiPhase === 'NOT_APPLICABLE'/u);
assert.match(content, /No qualified analysis route is registered for this stage/u);
assert.match(content, /Review model inputs/u);
assert.match(content, /lafea-overview-run-unavailable/u);
assert.match(content, /Solve not available/u);

console.log(JSON.stringify({
  check: 'lafea6-unsupported-execution-presentation',
  status: 'PASS',
  routeFamily: adapter.routeFamily,
  meshApplicable: adapter.discretization.applicable,
  executionQualifiedRouteRegistered: adapter.execution.qualifiedRouteRegistered,
  solvePresentation: solve.status,
  engineeringAuthorityChanged: false,
}, null, 2));
