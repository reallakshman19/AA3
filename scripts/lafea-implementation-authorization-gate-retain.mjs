#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKER = path.join(ROOT, 'scripts/lafea-implementation-authorization-gate-check.mjs');
const Q1_DIRECT_LOADED_CHECKER = path.join(
  ROOT,
  'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
);
const REPORT_PATH = path.resolve(
  ROOT,
  process.env.LAFEA_IMPLEMENTATION_AUTHORIZATION_REPORT_PATH
    ?? 'reports/qualification/lafea-implementation-authorization-gate.json',
);

const repositoryHead = git(['rev-parse', '--verify', 'HEAD']).trim();
assert.match(repositoryHead, /^[0-9a-f]{40}$/u, 'exact repository HEAD must be a full Git SHA');

const dirtyBefore = git(['status', '--porcelain=v1', '--untracked-files=all']).trim();
assert.equal(
  dirtyBefore,
  '',
  `authorization evidence requires a clean checkout before execution; dirty state:\n${dirtyBefore}`,
);

const receipt = runJson(CHECKER);
assert.equal(receipt?.schema, 'lafea-implementation-authorization-gate-receipt/v1');
assert.equal(receipt?.status, 'PASS');
assert.match(receipt?.receiptHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assert.equal(receipt?.authority?.releaseAuthorityGranted, false);

const q1DirectLoadedElementEvidence = runJson(Q1_DIRECT_LOADED_CHECKER);
assert.equal(
  q1DirectLoadedElementEvidence?.schema,
  'lafea3-direct-loaded-element-authorization-addendum/v1',
);
assert.equal(q1DirectLoadedElementEvidence?.status, 'PASS');
assert.match(q1DirectLoadedElementEvidence?.semanticHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assert.equal(
  q1DirectLoadedElementEvidence.trace.sourceHash,
  receipt.q1.trace.sourceHash,
  'Q1 direct-loaded addendum must use the same source authority as the main receipt',
);
assert.equal(
  q1DirectLoadedElementEvidence.trace.retainedMeshHash,
  receipt.q1.trace.retainedMeshHash,
  'Q1 direct-loaded addendum must use the same retained mesh as the main receipt',
);
assert.equal(
  q1DirectLoadedElementEvidence.trace.solverModelHash,
  receipt.q1.trace.solverModelHash,
  'Q1 direct-loaded addendum must use the same compiled solver model',
);
assert.equal(
  q1DirectLoadedElementEvidence.trace.compiledExecutionHash,
  receipt.q1.trace.compiledExecutionHash,
  'Q1 direct-loaded addendum must use the same execution',
);
assert.equal(
  q1DirectLoadedElementEvidence.trace.recoveryArtifactHash,
  receipt.q1.trace.recoveryArtifactHash,
  'Q1 direct-loaded addendum must use the same retained recovery artifact',
);

const body = Object.freeze({
  schema: 'lafea-implementation-authorization-exact-head-envelope/v2',
  repository: 'reallaksh19/Advanced_Analysis',
  repositoryHead,
  checkoutCleanBeforeExecution: true,
  checkerPaths: Object.freeze([
    'scripts/lafea-implementation-authorization-gate-check.mjs',
    'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
  ]),
  reportPath: path.relative(ROOT, REPORT_PATH).split(path.sep).join('/'),
  evidenceStatus: 'PASS',
  releaseAuthorityGranted: false,
  receipt,
  q1DirectLoadedElementEvidence,
});
const envelope = Object.freeze({
  ...body,
  evidenceArtifactHash: canonicalLafeaSha256({
    schema: 'lafea-implementation-authorization-exact-head-envelope-hash-input/v2',
    evidence: body,
  }),
});

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(envelope, null, 2));

function runJson(scriptPath) {
  const stdout = execFileSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(stdout);
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
