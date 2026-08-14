#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const program = readJson('validation/lafea-benchmark-program/program.json');
const auditSchema = readJson('validation/lafea-benchmark-program/audit-record.schema.json');
const adoption = readJson('validation/lafea-benchmark-program/01-b02-adoption-audit.json');
const applicability = readJson('validation/lafea-b02-contracts/method-benchmark-applicability.json');

assert.equal(program.schema, 'lafea-benchmark-validation-program/v1');
assert.equal(program.activeCaseId, 'B02');
assert.equal(program.executionPolicy.mode, 'SEQUENTIAL_CASE_THEN_METHOD');
assert.equal(program.executionPolicy.advanceOnlyAfterCurrentCasePass, true);
assert.equal(program.executionPolicy.executeAllApplicableMethodsWithinCurrentCase, true);
assert.equal(program.executionPolicy.trackedCleanTreeRequired, true);
assert.equal(program.executionPolicy.exactHeadRecorded, true);
assert.equal(program.executionPolicy.freezeBeforeFirstProductionObservation, true);
assert.equal(program.executionPolicy.repairOneOwningBoundaryPerIteration, true);
for (const field of [
  'productionOutputMayGenerateExpectedValues',
  'productionOutputMayGenerateTolerances',
  'productionOutputMayGenerateProbes',
  'productionOutputMayGenerateMeshDefinitions',
  'releaseAuthorityGrantedByProgram',
  'temperatureAuthorityGrantedByProgram',
]) assert.equal(program.evidencePolicy[field], false, `${field} must remain false`);

const caseIds = program.cases.map((row) => row.caseId);
assert.equal(new Set(caseIds).size, caseIds.length, 'duplicate benchmark case id');
const b01 = program.cases.find((row) => row.caseId === 'B01');
const b02 = program.cases.find((row) => row.caseId === 'B02');
assert.ok(b01 && b02, 'B01 and B02 must both exist in the programme ledger');

assert.equal(b01.definitionState, 'QUALIFIED');
assert.equal(b01.qualificationState, 'PASS');
assert.equal(b01.stageId, 'LAFEA.3');
assert.deepEqual(b01.methods.map((row) => row.methodId), ['T3', 'T6', 'Q8']);
assert.equal(b01.qualificationReceipt.adoptedMainSha, program.adoptedB02ParentSha);
assert.equal(b01.qualificationReceipt.exactHeadMatchesExpectation, true);
assert.equal(b01.qualificationReceipt.cleanTreeAtStart, true);
assert.equal(b01.qualificationReceipt.cleanTreeAtEnd, true);
assert.equal(b01.qualificationReceipt.basePassCount, 54);
assert.equal(b01.qualificationReceipt.metamorphicPassCount, 270);
assert.equal(b01.qualificationReceipt.failClosedPassCount, 16);
for (const method of b01.methods) {
  assert.equal(method.command[0], 'node', `${method.methodId} must run with node`);
  assert.ok(method.command[1].startsWith('scripts/'), `${method.methodId} script must be repo-owned`);
  for (const ref of method.sourceRefs) {
    assert.equal(fs.statSync(path.join(ROOT, ref)).isFile(), true, `missing benchmark source ref ${ref}`);
    assert.equal(ref.startsWith('.github/workflows/'), false, 'workflow file may not be benchmark authority');
  }
}

assert.equal(b02.definitionState, 'ACTIVE');
assert.equal(b02.qualificationState, 'NOT_EVALUATED');
assert.equal(b02.executionState, 'BENCHMARK_DEFINITION_FREEZE_REQUIRED');
assert.equal(b02.stageId, 'LAFEA.3');
assert.deepEqual(b02.methods.map((row) => row.methodId), ['T3', 'T6', 'Q8']);
assert.deepEqual(b02.executionOrder, ['B02A', 'B02B', 'B02C', 'B02D', 'B02E']);
assert.deepEqual(b02.subBuckets.map((row) => row.caseId), b02.executionOrder);
assert.equal(b02.subBuckets.every((row) => row.definitionState === 'FREEZE_REQUIRED'), true,
  'B02 execution must remain blocked until benchmark definitions are frozen');
assert.equal(b02.subBuckets[0].executionState, 'BLOCKED_UNTIL_FROZEN');
assert.equal(b02.prohibitedAcceptanceSources.includes('MOVING_MAXIMUM'), true);
assert.equal(b02.prohibitedAcceptanceSources.includes('SCREEN_PICKED_STRESS_AS_SOLE_AUTHORITY'), true);

assert.equal(program.gate0.state, 'FROZEN');
for (const ref of [...program.gate0.contractRefs, program.gate0.executableCheck]) {
  assert.equal(fs.statSync(path.join(ROOT, ref)).isFile(), true, `missing Gate 0 contract ${ref}`);
}
assert.equal(applicability.frozenBeforeProductionObservation, true);
assert.deepEqual(applicability.matrix.map((row) => row.benchmarkId), b02.executionOrder);

assert.equal(adoption.schema, 'lafea-b02-adoption-audit/v1');
assert.equal(adoption.adoptedMain.commitSha, program.adoptedB02ParentSha);
assert.equal(adoption.b01ExactHeadAttestation.state, 'PASS');
assert.equal(adoption.b01ExactHeadAttestation.headSha, program.adoptedB02ParentSha);
assert.equal(adoption.b01ExactHeadAttestation.exactHeadMatchesExpectation, true);
assert.equal(adoption.phase0Disposition.B01_CURRENT_MAIN_EXACT_HEAD_PASS, true);
assert.equal(adoption.phase0Disposition.B01_PROGRAM_LEDGER_QUALIFIED, true);
assert.equal(adoption.phase0Disposition.B02_ACTIVE_AUTHORIZED, true);
assert.equal(adoption.phase0Disposition.PRODUCTION_MECHANICS_UNCHANGED, true);
assert.equal(adoption.governance.workflowDefinitionsModified, false);
assert.equal(adoption.governance.productionMechanicsModified, false);
assert.equal(adoption.governance.releaseAuthorityGranted, false);
assert.equal(adoption.governance.temperatureAuthorityGranted, false);

assert.equal(auditSchema.$id, 'lafea-benchmark-audit-record/v1');
for (const field of [
  'exactHeadSha', 'trackedTreeClean', 'methodResults', 'caseStatus',
  'nextBenchmarkAuthorized', 'baselineDisposition', 'governance', 'recordHash',
]) assert.ok(auditSchema.required.includes(field), `audit schema missing required field ${field}`);
assert.equal(auditSchema.properties.governance.properties.releaseAuthorityGranted.const, false);
assert.equal(auditSchema.properties.governance.properties.temperatureAuthorityGranted.const, false);

const futureIds = program.futureQueue.map((row) => row.caseId);
assert.deepEqual(futureIds, ['B03', 'B04', 'B05', 'B06']);
assert.equal(futureIds.includes(program.activeCaseId), false, 'active case duplicated in future queue');

console.log(JSON.stringify({
  schema: 'lafea-benchmark-validation-program-check/v2',
  status: 'PASS',
  adoptedB02ParentSha: program.adoptedB02ParentSha,
  b01State: `${b01.definitionState}/${b01.qualificationState}`,
  activeCaseId: b02.caseId,
  activeExecutionState: b02.executionState,
  subBuckets: b02.subBuckets.map((row) => `${row.caseId}:${row.definitionState}`),
  methods: b02.methods.map((row) => row.methodId),
  futureQueue: futureIds,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
