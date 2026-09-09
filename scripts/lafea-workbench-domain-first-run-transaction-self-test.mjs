#!/usr/bin/env node
/**
 * Regression control for the domain-first LAFEA.3 run-transaction currentness bug.
 *
 * After a successful domain-first store.run(), stage.currentness.computationalState
 * must reach 'CURRENT_RESULT' (and currentAuthority must be true) so that
 * evaluateContinuumPhysicalProbe (requireCurrentExecution in
 * src/workspace/lafea-continuum-physical-probe.js) accepts the result instead of
 * throwing LAFEA_G4_PROBE_CURRENT_EXECUTION_REQUIRED. Reuses the existing minimal
 * production-route harness/fixture rather than inventing a new one.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeB02RectangleProductionLevel } from './lib/lafea-b02-production-route.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-b02-definitions/B02A-nonuniform-bending.json');
const method = 'T3';
const level = definition.meshLadder.levels[0];

const run = executeB02RectangleProductionLevel(definition, method, level);

assert.equal(
  run.stage.currentness?.computationalState,
  'CURRENT_RESULT',
  `expected CURRENT_RESULT after a qualified domain-first run, got ${run.stage.currentness?.computationalState}`,
);
assert.equal(
  run.stage.currentness?.currentAuthority,
  true,
  'expected currentAuthority to be true once computationalState is CURRENT_RESULT',
);
assert.ok(run.probes.length > 0, 'expected at least one evaluated physical probe');
for (const probe of run.probes) {
  assert.equal(probe.status, 'PASS', `expected probe ${probe.probeId} to evaluate PASS`);
}

console.log(JSON.stringify({
  schema: 'lafea-workbench-domain-first-run-transaction-self-test/v1',
  status: 'PASS',
  caseId: definition.caseId,
  method,
  levelId: level.levelId,
  computationalState: run.stage.currentness.computationalState,
  currentAuthority: run.stage.currentness.currentAuthority,
  probeCount: run.probes.length,
}));

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
