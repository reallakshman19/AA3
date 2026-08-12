#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const golden = read('e2e/lafea-standalone-golden-journey.spec.js');
const failures = read('e2e/lafea-standalone-failures.spec.js');
const fixture = read('e2e/fixtures/lafea-stage17-browser-fixture.js');
const helper = read('e2e/helpers/lafea-stage17-playwright.js');
const entry = read('src/lafea-app/main.js');
const standaloneController = read('src/lafea-app/standalone-controller.js');

assert(lineCount(golden) <= 200, 'Golden journey spec exceeds the 200-line module ceiling.');
assert(lineCount(failures) <= 200, 'Failure journey spec exceeds the 200-line module ceiling.');
assert(lineCount(fixture) <= 200, 'A17 browser fixture exceeds the 200-line module ceiling.');
assert(lineCount(helper) <= 200, 'A17 Playwright helper exceeds the 200-line module ceiling.');

for (const marker of [
  'source → mesh → authorize → solve → verify → compare → dossier',
  'authorizeAndRun(controller)',
  'refineAndRun(controller, 12.5)',
  'refineAndRun(controller, 6.25)',
  'evaluateHistoryEnergyConvergence',
  'compareRunHistoryEntries',
  'createRunEvidenceDossier',
]) assert(golden.includes(marker), `Golden journey missing ${marker}.`);

const requiredFailures = [
  ['stale source/profile', golden],
  ['conflicting current mesh evidence', golden],
  ['build/head mismatch', golden],
  ['stale mesh after profile replacement', golden],
  ['blocked T6 geometry qualification', failures],
  ['near-zero convergence', failures],
  ['failed solve', failures],
  ['stale verification', failures],
  ['invalid release record', failures],
  ['selecting historic run cannot promote current authority', golden],
];
for (const [name, source] of requiredFailures) {
  assert(source.includes(name), `Required A17 failure journey is missing: ${name}.`);
}

for (const marker of [
  'activateDomainFirstProfile',
  'registerAnalysisDomain',
  'registerAnalysisGeometryEvidence',
  'bindAnalysisMeshProfile',
  'generateAnalysisMesh',
  'prepareContinuumForRun',
  'evaluateLafeaBucket01Convergence',
]) assert(fixture.includes(marker), `A17 browser fixture missing real product route ${marker}.`);

assert(entry.includes("from './standalone-controller.js'"),
  'Standalone production entry must use the LAFEA standalone controller.');
assert(standaloneController.includes("from '../workspace/lafea-controller-run-evidence.js'"),
  'Standalone controller must use LAFEA-owned run evidence.');
for (const source of [golden, failures, fixture, helper, entry, standaloneController]) {
  assert(!source.includes('AnalysisWorkspace'), 'A17 standalone source must not depend on AnalysisWorkspace.');
  assert(!source.includes('/src/lfea/'), 'A17 standalone source must not import the LFEA app/runtime.');
}

assert(golden.includes("expect(result.releaseState).toBe('RELEASE_NOT_QUALIFIED')"),
  'Golden journey must keep release qualification independent.');
assert(golden.includes('expect(result.dossierPromotesRelease).toBe(false)'),
  'Golden journey must prove dossier creation does not promote release.');
assert(failures.includes('expect(result.release.releaseQualified).toBe(false)'),
  'Invalid release journey must remain fail closed.');

console.log(JSON.stringify({
  schema: 'lafea-stage17-browser-source-check/v1',
  status: 'PASS',
  roadmap: 'A17',
  goldenJourneyDeclared: true,
  requiredFailureJourneysDeclared: requiredFailures.length,
  realDomainFirstRouteUsed: true,
  localRunHistoryUsed: true,
  semanticComparisonUsed: true,
  evidenceDossierUsed: true,
  combinedWorkspaceDependency: false,
  lfeaRuntimeDependency: false,
  releasePromotionByJourney: false,
  browserExecutionProven: false,
}));

function read(relativePath) { return fs.readFileSync(path.join(ROOT, relativePath), 'utf8'); }
function lineCount(source) { return source.split(/\r?\n/u).length; }
