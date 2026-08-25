#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedHead = process.env.QUAL_HEAD?.trim() ?? '';
const testedHead = gitText(['rev-parse', 'HEAD']);
const cleanStatus = gitText(['status', '--porcelain=v1', '--untracked-files=all']);

const gates = Object.freeze([
  {
    gate: 'Q0A_CONTINUUM_FROZEN_CUSTODY',
    script: 'scripts/lafea-b02-definition-freeze-check.mjs',
    failureOrigin: 'SOURCE_AUTHORITY_OR_HASH',
  },
  {
    gate: 'Q0A_SHELL_FROZEN_CUSTODY',
    script: 'scripts/lafea-shell-independent-benchmark-freeze-check.mjs',
    failureOrigin: 'SOURCE_AUTHORITY_OR_HASH',
  },
  {
    gate: 'Q0B_ROUTE_EXPRESSIBILITY',
    script: 'scripts/lafea-b02-route-expressibility-check.mjs',
    failureOrigin: 'LIVE_PRODUCTION_CONTRACT_OR_ROUTE_EXPRESSIBILITY',
  },
  {
    gate: 'Q0C_VALIDATION_ISOLATION',
    script: 'scripts/lafea1413-validation-isolation-check.mjs',
    failureOrigin: 'QUALIFICATION_GATE_ISOLATION',
  },
]);

const receipts = [];
let firstFailure = null;

if (!expectedHead) {
  firstFailure = Object.freeze({
    gate: 'EXACT_HEAD_CUSTODY',
    status: 'NOT_RUN',
    failureOrigin: 'EXECUTION_CUSTODY',
    code: 'QUAL_HEAD_REQUIRED',
    message: 'QUAL_HEAD must be set to the exact qualification commit before Issue #1413 preflight execution.',
  });
} else if (!/^[0-9a-f]{40}$/u.test(expectedHead)) {
  firstFailure = Object.freeze({
    gate: 'EXACT_HEAD_CUSTODY',
    status: 'NOT_RUN',
    failureOrigin: 'EXECUTION_CUSTODY',
    code: 'QUAL_HEAD_INVALID',
    message: `QUAL_HEAD must be a full lowercase 40-hex commit SHA; received ${JSON.stringify(expectedHead)}.`,
  });
} else if (testedHead !== expectedHead) {
  firstFailure = Object.freeze({
    gate: 'EXACT_HEAD_CUSTODY',
    status: 'NOT_RUN',
    failureOrigin: 'EXECUTION_CUSTODY',
    code: 'QUAL_HEAD_MISMATCH',
    message: `Checked-out HEAD ${testedHead} does not equal QUAL_HEAD ${expectedHead}.`,
  });
} else if (cleanStatus !== '') {
  firstFailure = Object.freeze({
    gate: 'EXACT_HEAD_CUSTODY',
    status: 'NOT_RUN',
    failureOrigin: 'EXECUTION_CUSTODY',
    code: 'WORKTREE_NOT_CLEAN',
    message: 'Issue #1413 preflight requires a clean exact-head worktree.',
    statusSha256: sha256(cleanStatus),
  });
}

if (!firstFailure) {
  for (const gate of gates) {
    const receipt = executeGate(gate);
    receipts.push(receipt);
    if (receipt.status !== 'PASS') {
      firstFailure = Object.freeze({
        gate: gate.gate,
        status: receipt.status,
        failureOrigin: receipt.failureOrigin,
        exitCode: receipt.exitCode,
        signal: receipt.signal,
      });
      break;
    }
  }
}

for (const gate of gates.slice(receipts.length)) {
  receipts.push(Object.freeze({
    gate: gate.gate,
    command: `${process.execPath} ${gate.script}`,
    status: 'NOT_RUN',
    failureOrigin: 'FIRST_FAILURE_SHORT_CIRCUIT',
    exitCode: null,
    signal: null,
    stdoutSha256: null,
    stderrSha256: null,
    stdoutBytes: 0,
    stderrBytes: 0,
  }));
}

const status = firstFailure ? 'FAIL' : 'PASS';
const output = {
  schema: 'lafea1413-exact-head-preflight/v1',
  status,
  issue: 1413,
  expectedHead: expectedHead || null,
  testedHead,
  exactHeadMatched: Boolean(expectedHead && testedHead === expectedHead),
  cleanWorktree: cleanStatus === '',
  executionOrder: gates.map((gate) => gate.gate),
  firstFailure,
  receipts,
  firstExecutedAuthoritativeFailureWins: true,
  engineeringQualificationGranted: false,
  browserQualificationGranted: false,
  registryClosureAuthorized: false,
  releaseAuthorityGranted: false,
};

console.log(JSON.stringify(output, null, 2));
if (status !== 'PASS') process.exitCode = 1;

function executeGate(gate) {
  const result = spawnSync(process.execPath, [gate.script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  if (result.error) {
    return Object.freeze({
      gate: gate.gate,
      command: `${process.execPath} ${gate.script}`,
      status: 'NOT_RUN',
      failureOrigin: 'EXECUTION_ENVIRONMENT',
      exitCode: null,
      signal: result.signal ?? null,
      errorCode: result.error.code ?? null,
      stdoutSha256: sha256(stdout),
      stderrSha256: sha256(stderr),
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
    });
  }
  return Object.freeze({
    gate: gate.gate,
    command: `${process.execPath} ${gate.script}`,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    failureOrigin: result.status === 0 ? null : gate.failureOrigin,
    exitCode: result.status,
    signal: result.signal ?? null,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutBytes: Buffer.byteLength(stdout),
    stderrBytes: Buffer.byteLength(stderr),
  });
}

function gitText(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? `exit ${result.status}`;
    throw new Error(`Git custody command failed: git ${args.join(' ')}: ${String(detail).trim()}`);
  }
  return (result.stdout ?? '').trim();
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}
