#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = Object.fromEntries(await Promise.all([
  ['controller', 'src/workspace/lafea-workbench-controller.js'],
  ['store', 'src/workspace/lafea-lifecycle-workbench-store.js'],
  ['workflow', 'src/workspace/lafea-guided-workflow.js'],
  ['content', 'src/workspace/lafea-workbench-content.js'],
  ['panel', 'src/workspace/lafea-continuum-convergence-panel.js'],
].map(async ([key, path]) => [key, await readFile(path, 'utf8')])));

assert.match(files.controller,
  /import \{ createLafeaWorkbenchStore \} from '\.\/lafea-lifecycle-workbench-store\.js';/u,
  'visible controller must use the public convergence-aware workbench store');
assert.doesNotMatch(files.controller,
  /createLafeaWorkbenchOrchestratorStore/u,
  'visible controller must not bypass convergence custody through the raw orchestrator');
assert.match(files.store,
  /createLafeaContinuumConvergenceWorkbench\(createLafeaWorkbenchOrchestratorStore\(options\)\)/u,
  'public workbench store must retain the convergence wrapper');
assert.match(files.controller,
  /onRunContinuumConvergence: \(request\) => this\.runContinuumConvergenceStudy\(request\)/u,
  'visible controller must expose the governed convergence action');

const runIndex = files.workflow.indexOf("['RUN', 'Run']");
const convergenceIndex = files.workflow.indexOf("['CONVERGENCE', 'Convergence']");
const resultsIndex = files.workflow.indexOf("['RESULTS_EVIDENCE', 'Results and evidence']");
assert.ok(runIndex >= 0 && convergenceIndex > runIndex && resultsIndex > convergenceIndex,
  'guided workflow must present Run -> Convergence -> Results in engineering order');
assert.match(files.workflow,
  /stage\.execution\?\.status === 'QUALIFIED'\) return status\('COMPLETE'\)/u,
  'a qualified solve must remain a completed Run step even while Results are convergence-gated');
assert.match(files.workflow,
  /convergence\.state === 'CURRENT_PASS'/u,
  'Convergence step must become complete only from CURRENT_PASS custody');

assert.match(files.content, /dataset\.guidedTarget = 'convergence'/u,
  'visible workbench must expose a convergence navigation target');
assert.match(files.content, /Step 4: Convergence evidence required/u,
  'next-action banner must identify convergence as the post-solve task');
assert.match(files.content, /stage\.lifecycleReadiness\?\.resultReady !== true/u,
  'results-ready presentation must remain bound to lifecycle readiness');
assert.match(files.content, /renderLafeaContinuumConvergencePanel/u,
  'convergence target must contain an actionable study setup surface');

assert.match(files.panel, /Define the physical probe and coarse mesh size explicitly/u,
  'study setup must require explicit engineer probe and mesh-scale input');
assert.match(files.panel, /h: h \/ 2/u);
assert.match(files.panel, /h: h \/ 4/u);
assert.doesNotMatch(files.panel, /gciSafetyFactor|nearZeroAbsolute|orderStabilityRelativeTolerance/u,
  'UI must not expose or mutate convergence acceptance tolerances');
assert.match(files.panel, /DISPLACEMENT_MAGNITUDE/u,
  'initial visible study slice must provide a non-singular displacement probe path');
assert.doesNotMatch(files.panel, /STRESS_SIGMA|VON_MISES|PRINCIPAL_/u,
  'initial visible study slice must not silently assign stress singularity classification');

console.log(JSON.stringify({
  check: 'lafea.3-visible-convergence-flow',
  status: 'PASS',
  assertions: [
    'VISIBLE_CONTROLLER_USES_CONVERGENCE_AWARE_STORE',
    'RUN_CONVERGENCE_RESULTS_ORDER_EXPLICIT',
    'QUALIFIED_SOLVE_NOT_RELABELED_AS_EXECUTION_FAILURE',
    'CONVERGENCE_ACTION_SURFACED',
    'RESULTS_REMAIN_LIFECYCLE_GATED',
    'PROBE_AND_COARSE_MESH_REQUIRE_EXPLICIT_ENGINEER_INPUT',
    'CONVERGENCE_TOLERANCES_NOT_EXPOSED',
    'DISPLACEMENT_ONLY_INITIAL_PROBE_SLICE',
  ],
}));
