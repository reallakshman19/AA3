#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = readJson('validation/lafea-b02-contracts/gate0-contracts.json');
const invalidation = readJson('validation/lafea-b02-contracts/edit-invalidation-matrix.json');
const applicability = readJson('validation/lafea-b02-contracts/method-benchmark-applicability.json');

assert.equal(contracts.schema, 'lafea-b02-gate0-contracts/v1');
assert.equal(contracts.issue, 1112);
assert.equal(contracts.stageId, 'LAFEA.3');
assert.equal(contracts.authority.releaseAuthorityGrantedByProgram, false);
assert.equal(contracts.authority.temperatureAuthorityGrantedByProgram, false);
assert.equal(contracts.authority.nonlinearAuthority, false);
assert.equal(contracts.authority.contactAuthority, false);
assert.equal(contracts.authority.shellAuthority, false);

assert.deepEqual(contracts.stateModel.computationalState, [
  'EDITED', 'READY', 'MESHED', 'RUNNING', 'CURRENT_RESULT', 'STALE_RESULT', 'REJECTED',
]);
assert.deepEqual(contracts.stateModel.qualificationState, ['NOT_EVALUATED', 'FAIL', 'PASS']);
assert.equal(contracts.stateModel.computationalState.includes('QUALIFIED'), false,
  'qualification must remain orthogonal to computational currentness');

assert.deepEqual(contracts.hashChain.order, [
  'sourceRevisionHash',
  'canonicalModelHash',
  'meshRevisionHash',
  'solverConfigHash',
  'executionHash',
  'recoveryHash',
  'convergenceEvidenceHash',
]);
assert.deepEqual(contracts.hashChain.parents.executionHash, [
  'sourceRevisionHash', 'canonicalModelHash', 'meshRevisionHash', 'solverConfigHash',
]);
assert.deepEqual(contracts.hashChain.parents.recoveryHash, ['executionHash', 'meshRevisionHash']);

for (const schemaName of [
  'sourceRevisionReceipt',
  'meshRevisionReceipt',
  'executionReceipt',
  'quantityIdentity',
  'recoveryReceipt',
  'physicalProbeIdentity',
  'convergenceReceipt',
]) {
  assert.ok(contracts.receiptSchemas[schemaName], `missing ${schemaName}`);
  assert.ok(Array.isArray(contracts.receiptSchemas[schemaName].required), `${schemaName} must declare required fields`);
}
for (const field of [
  'quantityId', 'component', 'coordinateFrame', 'physicalLocation', 'loadCaseId',
  'recoveryMethod', 'representation', 'units', 'singularityClassification',
]) {
  assert.ok(contracts.receiptSchemas.quantityIdentity.required.includes(field),
    `quantity identity missing ${field}`);
}
for (const forbidden of ['elementId', 'naturalCoordinates', 'nodeId', 'screenCoordinate']) {
  assert.ok(contracts.receiptSchemas.physicalProbeIdentity.forbiddenPermanentIdentityFields.includes(forbidden),
    `physical probe identity must forbid permanent ${forbidden}`);
}
assert.equal(contracts.receiptSchemas.convergenceReceipt.minimumUsefulLevels, 3);
for (const classification of [
  'ASYMPTOTIC', 'PRE_ASYMPTOTIC', 'OSCILLATORY', 'DIVERGENT',
  'SINGULAR_EXCLUDED', 'NEAR_ZERO_ABSOLUTE_RULE',
]) {
  assert.ok(contracts.receiptSchemas.convergenceReceipt.classifications.includes(classification),
    `convergence classification missing ${classification}`);
}

assert.deepEqual(contracts.readinessContract.requiredDomains, [
  'SOURCE', 'UNITS', 'TOPOLOGY', 'MESH', 'BOUNDARY_CONDITIONS', 'MATERIAL', 'SOLVER', 'AUTHORITY',
]);
assert.deepEqual(contracts.readinessContract.domainStates, ['READY', 'BLOCKED', 'NOT_APPLICABLE']);

assert.equal(invalidation.schema, 'lafea-b02-edit-invalidation-matrix/v1');
assert.equal(invalidation.retentionRule.includes('never deletes historical'), true);
const requiredEdits = [
  'GEOMETRY', 'MATERIAL', 'LOAD', 'BOUNDARY_CONDITION', 'UNITS',
  'SOLVER_SETTINGS', 'MESH_SETTINGS', 'DISPLAY_ONLY_VIEWPORT',
];
assert.deepEqual(invalidation.edits.map((row) => row.editType), requiredEdits);
for (const row of invalidation.edits) {
  assert.equal(row.staleHistoryRetained, true, `${row.editType} must retain stale history`);
  if (row.editType === 'DISPLAY_ONLY_VIEWPORT') {
    assert.deepEqual(row.invalidate, [], 'display-only viewport state must not invalidate engineering state');
  } else {
    assert.ok(row.invalidate.includes('CURRENT_EVIDENCE_AUTHORITY'),
      `${row.editType} must revoke current evidence authority`);
  }
}
assert.equal(invalidation.qualificationRule.historicalPassReceiptRetained, true);
assert.equal(invalidation.qualificationRule.historicalPassGrantsCurrentAuthorityAfterGoverningEdit, false);

assert.equal(applicability.schema, 'lafea-b02-method-benchmark-applicability/v1');
assert.equal(applicability.frozenBeforeProductionObservation, true);
assert.deepEqual(Object.keys(applicability.methods), ['T3', 'T6', 'Q8']);
assert.equal(Object.hasOwn(applicability.methods, 'Q4'), false);
assert.deepEqual(applicability.matrix.map((row) => row.benchmarkId), ['B02A', 'B02B', 'B02C', 'B02D', 'B02E']);
for (const row of applicability.matrix) {
  for (const method of ['T3', 'T6', 'Q8']) {
    assert.ok(applicability.allowedStates.includes(row[method]), `${row.benchmarkId}/${method} has invalid applicability state`);
  }
}
for (const benchmarkId of ['B02A', 'B02B', 'B02C']) {
  const row = applicability.matrix.find((entry) => entry.benchmarkId === benchmarkId);
  assert.deepEqual([row.T3, row.T6, row.Q8], ['REQUIRED', 'REQUIRED', 'REQUIRED']);
}
const lug = applicability.matrix.find((row) => row.benchmarkId === 'B02D');
assert.deepEqual([lug.T3, lug.T6, lug.Q8], ['CONTROL', 'REQUIRED', 'REQUIRED']);
const convergence = applicability.matrix.find((row) => row.benchmarkId === 'B02E');
assert.deepEqual([convergence.T3, convergence.T6, convergence.Q8], ['REQUIRED', 'REQUIRED', 'REQUIRED']);

console.log(JSON.stringify({
  schema: 'lafea-b02-gate0-contract-check/v1',
  status: 'PASS',
  issue: contracts.issue,
  stageId: contracts.stageId,
  receiptSchemaCount: Object.keys(contracts.receiptSchemas).length,
  invalidationEditCount: invalidation.edits.length,
  benchmarkCount: applicability.matrix.length,
  methods: Object.keys(applicability.methods),
  releaseAuthorityGrantedByProgram: false,
  temperatureAuthorityGrantedByProgram: false,
}));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
