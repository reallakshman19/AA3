#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canonicalJson,
  caseDisposition,
  finalizeAuditRecord,
  sha256Text,
} from './lib/lafea-benchmark-audit.mjs';

const passMethods = ['T3', 'T6', 'Q8'].map((methodId) => ({ methodId, status: 'PASS' }));
const pass = caseDisposition(passMethods);
assert.deepEqual(pass, {
  caseStatus: 'PASS',
  nextBenchmarkAuthorized: true,
  baselineDisposition: 'ELIGIBLE_EXECUTION_BASELINE',
});

const fail = caseDisposition([
  { methodId: 'T3', status: 'PASS' },
  { methodId: 'T6', status: 'FAIL' },
  { methodId: 'Q8', status: 'PASS' },
]);
assert.equal(fail.caseStatus, 'FAIL');
assert.equal(fail.nextBenchmarkAuthorized, false);
assert.equal(fail.baselineDisposition, 'NOT_ELIGIBLE');

assert.equal(canonicalJson({ b: 2, a: -0 }), '{"a":0,"b":2}');
assert.equal(sha256Text('same'), sha256Text('same'));
assert.notEqual(sha256Text('same'), sha256Text('different'));

const base = {
  schema: 'lafea-benchmark-audit-record/v1',
  programId: 'TEST', runId: 'TEST-1', generatedAt: '2026-08-13T00:00:00.000Z',
  repository: 'owner/repo', exactHeadSha: 'a'.repeat(40), trackedTreeClean: true,
  caseId: 'B01', stageId: 'LAFEA.3', methodResults: passMethods, ...pass,
  governance: {
    productionOutputGeneratedExpectedValues: false,
    releaseAuthorityGranted: false,
    temperatureAuthorityGranted: false,
  },
};
const first = finalizeAuditRecord(base);
const second = finalizeAuditRecord(base);
assert.equal(first.recordHash, second.recordHash);
const changed = finalizeAuditRecord({ ...base, runId: 'TEST-2' });
assert.notEqual(first.recordHash, changed.recordHash);
assert.equal(first.governance.releaseAuthorityGranted, false);
assert.equal(first.governance.temperatureAuthorityGranted, false);

console.log(JSON.stringify({
  schema: 'lafea-benchmark-validation-program-self-test/v1',
  status: 'PASS',
  passAdvances: pass.nextBenchmarkAuthorized,
  failureStopsAdvance: !fail.nextBenchmarkAuthorized,
  deterministicRecordHash: true,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false
}));
