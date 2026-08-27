#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = Object.freeze({
  custody: 'scripts/lafea-b02-definition-freeze-check.mjs',
  route: 'scripts/lafea-b02-route-expressibility-check.mjs',
  lafea4: 'e2e/lafea4-sample-mesh.spec.js',
  combinedShell: 'e2e/lafea-shell-sample-mesh.spec.js',
});
const sources = Object.fromEntries(Object.entries(paths).map(([key, relative]) => [
  key,
  fs.readFileSync(path.join(ROOT, relative), 'utf8'),
]));

assert.equal(sources.custody.includes('createLafeaMeshGenerationIntentV2'), false,
  'Frozen-definition custody checker must not import or execute the live production mesh-intent route.');
assert.equal(
  staticImportSpecifiers(sources.custody).every((specifier) => specifier.startsWith('node:')),
  true,
  'Frozen-definition custody checker must remain Node-built-in-only.',
);
assert.equal(sources.custody.includes("authorityBoundary: 'IMMUTABLE_FROZEN_DEFINITION_CUSTODY_ONLY'"), true);
assert.equal(sources.custody.includes('productionRouteImportedByCustodyCheck: false'), true);

assert.equal(sources.route.includes(
  "import { createLafeaMeshGenerationIntentV2 } from '../src/workspace/lafea-domain-first-requests.js';",
), true, 'Route-expressibility checker must own the live mesh-intent import.');
assert.equal(sources.route.includes("authorityBoundary: 'CURRENT_PRODUCTION_MESH_INTENT_ROUTE_EXPRESSIBILITY'"), true);
assert.equal(sources.route.includes('frozenDefinitionCustodyGrantedByThisCheck: false'), true);

assert.equal(sources.lafea4.includes("const STAGE_ID = 'LAFEA.4';"), true,
  'Dedicated #1413 browser journey must bind explicitly to LAFEA.4.');
assert.equal(sources.lafea4.includes('LAFEA.5'), false,
  'Dedicated #1413 LAFEA.4 browser journey must not execute or assert LAFEA.5.');

const lafea4CoreContract = Object.freeze([
  'CYLINDRICAL_PIPE_SHELL_BENCHMARK',
  'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL',
  'retainedAnalysisMeshEvidenceV2',
  'PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1',
  "toBe('CURRENT_PASS')",
  "toBe('QUALIFIED')",
  'forceEquilibrium',
  'momentEquilibrium',
  'lifecycleReadiness',
  'ANALYSIS_MESH',
  'RECOVERY',
  'Engineering summary — retained shell evidence only',
  'Max authoritative surface/IP von Mises',
  'Force equilibrium residual · PASS',
  'Moment equilibrium residual · PASS',
  'Governing retained shell surface/IP von Mises equivalent stress',
]);
for (const required of lafea4CoreContract) {
  assert.equal(sources.lafea4.includes(required), true,
    `Dedicated LAFEA.4 browser qualification lost core contract token ${required}.`);
  assert.equal(sources.combinedShell.includes(required), true,
    `Combined shell regression lost shared LAFEA.4 core contract token ${required}.`);
}

assert.equal(sources.combinedShell.includes("for (const stageId of ['LAFEA.4', 'LAFEA.5'])"), true,
  'Combined LAFEA.4/LAFEA.5 regression must remain present.');
assert.equal(sources.combinedShell.includes('TRUNNION-WORKFLOW-1'), true,
  'Combined regression must retain LAFEA.5 coverage.');

console.log(JSON.stringify({
  schema: 'lafea1413-validation-isolation-check/v2',
  status: 'PASS',
  issue: 1413,
  frozenCustodyProductionIndependent: true,
  currentRouteExpressibilitySeparated: true,
  lafea4BrowserStageIsolated: true,
  lafea4CoreContractParityGuard: true,
  lafea4CoreContractTokenCount: lafea4CoreContract.length,
  combinedLafea4Lafea5RegressionPreserved: true,
  protectedFileHashes: Object.fromEntries(Object.entries(sources).map(([key, source]) => [
    key,
    `sha256:${crypto.createHash('sha256').update(source).digest('hex')}`,
  ])),
  engineeringMechanicsChangedByThisCheck: false,
  benchmarkAuthorityChangedByThisCheck: false,
  releaseAuthorityGranted: false,
}, null, 2));

function staticImportSpecifiers(source) {
  return [...source.matchAll(
    /^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"];?\s*$/gmu,
  )].map((match) => match[1]);
}
