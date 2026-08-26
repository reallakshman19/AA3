#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!options.recordPath) throw replayError('EMP1_REQUALIFICATION_REPLAY_RECORD_REQUIRED');
if (!/^[0-9a-f]{40}$/u.test(options.expectedObservedHead ?? '')) {
  throw replayError('EMP1_REQUALIFICATION_REPLAY_EXPECTED_HEAD_REQUIRED');
}

const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(actualHead, options.expectedObservedHead,
  `EMP1_REQUALIFICATION_REPLAY_HEAD_MISMATCH:${actualHead}:${options.expectedObservedHead}`);

const record = await readJson(options.recordPath);
assert.equal(record.observedHeadSha, options.expectedObservedHead,
  'EMP1_REQUALIFICATION_REPLAY_RECORD_HEAD_MISMATCH');

const baseVerifierRun = runScript('scripts/emp1-wrc-gamma5-requalification-observation-check.mjs', [
  '--record', options.recordPath,
  '--expected-observed-head', options.expectedObservedHead,
]);
const baseVerifier = requireRecord(
  baseVerifierRun.records,
  'emp1-wrc537-gamma5-requalification-observation-check/v2',
);
assert.equal(baseVerifier.status,
  'PASS_REQUALIFICATION_OBSERVATION_FULL_MATRIX_INTEGRITY_ROUTE_STILL_SUSPENDED');

const independentRun = runScript('scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs');
assertReplayEvidence({
  stored: record.subordinateEvidence.independentDecoupling,
  run: independentRun,
  schema: 'emp1-wrc537-independent-oracle-decoupling/v2',
  expectedStatus: 'PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED',
});
assertReplayEvidence({
  stored: record.subordinateEvidence.independentRefreeze,
  run: independentRun,
  schema: 'emp1-wrc537-gamma5-post-authority-independent-refreeze/v1',
  expectedStatus: 'PASS_FROZEN_POST_AUTHORITY_PHYSICAL_TABLE5_ORACLE',
});

const independentFalsifierRun = runScript(
  'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs',
);
assertReplayEvidence({
  stored: record.subordinateEvidence.independentFalsifiers,
  run: independentFalsifierRun,
  schema: 'emp1-wrc537-gamma5-post-authority-refreeze-falsifiers/v1',
  expectedStatus: 'PASS_POST_AUTHORITY_PHYSICAL_ORACLE_FALSIFIERS',
});

const candidateBindingRun = runScript(
  'scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs',
);
assertReplayEvidence({
  stored: record.subordinateEvidence.candidateBinding,
  run: candidateBindingRun,
  schema: 'emp1-wrc537-gamma5-route-requalification-candidate-check/v1',
});

const currentnessRun = runScript(
  'scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs',
);
assertReplayEvidence({
  stored: record.subordinateEvidence.routeAuthorityCurrentness,
  run: currentnessRun,
  schema: 'emp1-workbench-route-authority-currentness-falsifiers/v3',
  expectedStatus: 'PASS',
});

const productRun = runScript('scripts/emp1-workbench-product-run-qualification.mjs');
assertReplayEvidence({
  stored: record.subordinateEvidence.productQualification,
  run: productRun,
  schema: 'emp1-workbench-product-run-qualification/v8',
});

const completeSampleRun = runScript('scripts/emp1-workbench-complete-sample-qualification.mjs');
const completeSample = completeSampleRun.records.find((value) =>
  value?.sampleSchema === 'emp1-workbench-qualification-sample/v1');
assert.ok(completeSample, 'EMP1_REQUALIFICATION_REPLAY_COMPLETE_SAMPLE_REQUIRED');
assert.equal(completeSampleRun.stdoutSha256,
  record.subordinateEvidence.completeSample.stdoutSha256,
  'EMP1_REQUALIFICATION_REPLAY_COMPLETE_SAMPLE_STDOUT_HASH_DRIFT');
assert.equal(completeSample.cProductionCount,
  record.subordinateEvidence.completeSample.cProductionCount,
  'EMP1_REQUALIFICATION_REPLAY_COMPLETE_SAMPLE_PRODUCTION_COUNT_DRIFT');
assert.equal(completeSample.cReportable,
  record.subordinateEvidence.completeSample.cReportable,
  'EMP1_REQUALIFICATION_REPLAY_COMPLETE_SAMPLE_REPORTABLE_DRIFT');
assert.equal(completeSample.routeAuthorityHash,
  record.subordinateEvidence.completeSample.routeAuthorityHash,
  'EMP1_REQUALIFICATION_REPLAY_COMPLETE_SAMPLE_AUTHORITY_HASH_DRIFT');
assert.equal(completeSample.cProductionCount, 0);
assert.equal(completeSample.cReportable, false);

const receipt = {
  schema: 'emp1-wrc537-gamma5-requalification-observation-replay-check/v1',
  status: 'PASS_REQUALIFICATION_OBSERVATION_SUBORDINATE_REPLAY_ROUTE_STILL_SUSPENDED',
  observedHeadSha: record.observedHeadSha,
  observationSemanticHash: record.observationSemanticHash,
  baseVerifierStatus: baseVerifier.status,
  replayedEvidence: {
    independentDecouplingStdoutSha256: independentRun.stdoutSha256,
    independentRefreezeStdoutSha256: independentRun.stdoutSha256,
    independentFalsifiersStdoutSha256: independentFalsifierRun.stdoutSha256,
    candidateBindingStdoutSha256: candidateBindingRun.stdoutSha256,
    routeAuthorityCurrentnessStdoutSha256: currentnessRun.stdoutSha256,
    productQualificationStdoutSha256: productRun.stdoutSha256,
    completeSampleStdoutSha256: completeSampleRun.stdoutSha256,
  },
  productionRouteAuthorized: false,
  authorizationChangeApplied: false,
};
if (options.writeReceipt) {
  await writeFile(resolve(root, options.writeReceipt), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(receipt, null, 2));

function assertReplayEvidence({ stored, run, schema, expectedStatus = null }) {
  assert.ok(stored && typeof stored === 'object', `EMP1_REQUALIFICATION_REPLAY_STORED_EVIDENCE_REQUIRED:${schema}`);
  const replayed = requireRecord(run.records, schema);
  assert.equal(run.stdoutSha256, stored.stdoutSha256,
    `EMP1_REQUALIFICATION_REPLAY_STDOUT_HASH_DRIFT:${schema}`);
  assert.equal(stored.schema, schema,
    `EMP1_REQUALIFICATION_REPLAY_STORED_SCHEMA_DRIFT:${schema}`);
  assert.equal(replayed.schema, schema,
    `EMP1_REQUALIFICATION_REPLAY_SCHEMA_DRIFT:${schema}`);
  assert.equal(replayed.status, stored.status,
    `EMP1_REQUALIFICATION_REPLAY_STATUS_DRIFT:${schema}`);
  if (expectedStatus) assert.equal(replayed.status, expectedStatus);
  else assert.match(replayed.status ?? '', /^PASS/u,
    `EMP1_REQUALIFICATION_REPLAY_PASS_STATUS_REQUIRED:${schema}`);
}
function runScript(path, args = []) {
  const completed = spawnSync(process.execPath, [path, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, EMP1_EXACT_HEAD_PARENT_SHA: options.expectedObservedHead },
  });
  assert.equal(completed.status, 0,
    `EMP1_REQUALIFICATION_REPLAY_SUBORDINATE_FAILED:${path}\nSTDOUT:\n${completed.stdout ?? ''}\nSTDERR:\n${completed.stderr ?? ''}`);
  const stdout = completed.stdout ?? '';
  return {
    path,
    records: extractJsonObjects(stdout),
    stdoutSha256: sha256(stdout),
  };
}
function extractJsonObjects(text) {
  const records = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);
        try { records.push(JSON.parse(candidate)); } catch { /* non-JSON brace block */ }
        start = -1;
      }
    }
  }
  return records;
}
function requireRecord(records, schema) {
  const value = records.find((item) => item?.schema === schema);
  assert.ok(value, `EMP1_REQUALIFICATION_REPLAY_JSON_RECORD_REQUIRED:${schema}`);
  return value;
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
function parseArgs(args) {
  const out = { recordPath: null, expectedObservedHead: null, writeReceipt: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--record') out.recordPath = args[++index] ?? null;
    else if (args[index] === '--expected-observed-head') out.expectedObservedHead = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else throw replayError(`EMP1_REQUALIFICATION_REPLAY_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
function replayError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
