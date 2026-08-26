#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKER = path.join(ROOT, 'scripts/lafea-implementation-authorization-gate-check.mjs');
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

const stdout = execFileSync(process.execPath, [CHECKER], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'inherit'],
});
const receipt = JSON.parse(stdout);
assert.equal(receipt?.schema, 'lafea-implementation-authorization-gate-receipt/v1');
assert.equal(receipt?.status, 'PASS');
assert.match(receipt?.receiptHash ?? '', /^sha256:[0-9a-f]{64}$/u);
assert.equal(receipt?.authority?.releaseAuthorityGranted, false);

const body = Object.freeze({
  schema: 'lafea-implementation-authorization-exact-head-envelope/v1',
  repository: 'reallaksh19/Advanced_Analysis',
  repositoryHead,
  checkoutCleanBeforeExecution: true,
  checkerPath: 'scripts/lafea-implementation-authorization-gate-check.mjs',
  reportPath: path.relative(ROOT, REPORT_PATH).split(path.sep).join('/'),
  evidenceStatus: 'PASS',
  releaseAuthorityGranted: false,
  receipt,
});
const envelope = Object.freeze({
  ...body,
  evidenceArtifactHash: canonicalLafeaSha256({
    schema: 'lafea-implementation-authorization-exact-head-envelope-hash-input/v1',
    evidence: body,
  }),
});

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(envelope, null, 2));

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
