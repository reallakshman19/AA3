#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lafeaStageAnalysisAdapter } from '../src/workspace/lafea-stage-analysis-adapter.js';

const shell = lafeaStageAnalysisAdapter('LAFEA.4');
const trunnion = lafeaStageAnalysisAdapter('LAFEA.5');
const weld = lafeaStageAnalysisAdapter('LAFEA.6');

assert.equal(shell.discretization.applicable, true);
assert.equal(trunnion.discretization.applicable, true);
assert.equal(weld.discretization.applicable, false);
assert.deepEqual(weld.discretization.allowedElementFamilies, []);
assert.equal(weld.discretization.generationAuthorized, false);
assert.equal(weld.execution.qualifiedRouteRegistered, false);

const source = fs.readFileSync(
  new URL('../src/workspace/lafea-refinement-disclosure.js', import.meta.url),
  'utf8',
);
assert.match(source, /compactLafeaNonApplicableMeshWorkspace/u);
assert.match(source, /model\?\.applicable !== false/u);
assert.match(source, /model\?\.uiPhase !== 'NOT_APPLICABLE'/u);
assert.match(source, /state\.textContent = 'Not applicable'/u);
assert.match(source, /This stage does not use an analysis mesh\./u);
assert.match(source, /\['generation', 'quality', 'actions'\]/u);
assert.match(source, /lafea-discretization-technical-evidence/u);
assert.match(source, /meshApplicable = 'false'/u);

console.log(JSON.stringify({
  check: 'lafea-non-applicable-mesh-presentation',
  status: 'PASS',
  lafea4MeshApplicable: shell.discretization.applicable,
  lafea5MeshApplicable: trunnion.discretization.applicable,
  lafea6MeshApplicable: weld.discretization.applicable,
  lafea6GenerationAuthorized: weld.discretization.generationAuthorized,
  engineeringAuthorityChanged: false,
}));
