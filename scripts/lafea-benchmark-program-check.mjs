#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const program = readJson('validation/lafea-benchmark-program/program.json');
const schema = readJson('validation/lafea-benchmark-program/audit-record.schema.json');

assert.equal(program.schema, 'lafea-benchmark-validation-program/v1');
assert.equal(program.activeCaseId, 'B01');
assert.equal(program.executionPolicy.mode, 'SEQUENTIAL_CASE_THEN_METHOD');
assert.equal(program.executionPolicy.advanceOnlyAfterCurrentCasePass, true);
assert.equal(program.executionPolicy.executeAllApplicableMethodsWithinCurrentCase, true);
assert.equal(program.executionPolicy.trackedCleanTreeRequired, true);
assert.equal(program.evidencePolicy.productionOutputMayGenerateExpectedValues, false);
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);

const caseIds = program.cases.map((row) => row.caseId);
assert.equal(new Set(caseIds).size, caseIds.length, 'duplicate benchmark case id');
const active = program.cases.find((row) => row.caseId === program.activeCaseId);
assert.ok(active, 'active benchmark case is missing');
assert.equal(active.definitionState, 'READY');
assert.equal(active.stageId, 'LAFEA.3');
assert.deepEqual(active.methods.map((row) => row.methodId), ['T3', 'T6', 'Q8']);
assert.equal(active.comparisonPolicy, 'CROSS_METHOD_INVARIANTS_NOT_DIRECT_NUMERICAL_PARITY');

for (const method of active.methods) {
  assert.equal(method.command[0], 'node', `${method.methodId} must run with node`);
  assert.ok(method.command[1].startsWith('scripts/'), `${method.methodId} script must be repo-owned`);
  for (const ref of method.sourceRefs) {
    assert.equal(fs.statSync(path.join(ROOT, ref)).isFile(), true, `missing benchmark source ref ${ref}`);
    assert.equal(ref.startsWith('.github/workflows/'), false, 'workflow file may not be benchmark authority');
  }
}

assert.equal(schema.$id, 'lafea-benchmark-audit-record/v1');
for (const field of [
  'exactHeadSha', 'trackedTreeClean', 'methodResults', 'caseStatus',
  'nextBenchmarkAuthorized', 'baselineDisposition', 'governance', 'recordHash',
]) assert.ok(schema.required.includes(field), `audit schema missing required field ${field}`);
assert.equal(schema.properties.governance.properties.releaseAuthorityGranted.const, false);
assert.equal(schema.properties.governance.properties.temperatureAuthorityGranted.const, false);

const futureIds = program.futureQueue.map((row) => row.caseId);
assert.equal(new Set(futureIds).size, futureIds.length, 'duplicate future benchmark id');
assert.equal(futureIds.includes(program.activeCaseId), false, 'active case duplicated in future queue');

console.log(JSON.stringify({
  schema: 'lafea-benchmark-validation-program-check/v1',
  status: 'PASS',
  activeCaseId: active.caseId,
  stageId: active.stageId,
  methodOrder: active.methods.map((row) => row.methodId),
  futureQueue: futureIds,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false
}));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
