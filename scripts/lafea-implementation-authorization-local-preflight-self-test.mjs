#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION_PREFLIGHT = path.join(
  REPOSITORY_ROOT,
  'scripts/lafea-implementation-authorization-local-preflight.mjs',
);
const PRODUCTION_RETAIN = path.join(
  REPOSITORY_ROOT,
  'scripts/lafea-implementation-authorization-gate-retain.mjs',
);
const productionSource = fs.readFileSync(PRODUCTION_PREFLIGHT, 'utf8');
const retentionSource = fs.readFileSync(PRODUCTION_RETAIN, 'utf8');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-auth-local-preflight-'));

try {
  const environmentRepo = createSyntheticRepository(path.join(sandbox, 'environment'), 0);
  const wrongCwd = spawnSync(process.execPath, [environmentRepo.preflightPath], {
    cwd: sandbox,
    encoding: 'utf8',
  });

  assert.notEqual(wrongCwd.status, 0, 'wrong-cwd preflight must fail non-zero');
  assert.match(
    wrongCwd.stderr,
    /"classification": "NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED"/u,
    'failure before delegated gate entry must remain NOT_RUN environment/preflight',
  );
  assert.match(
    wrongCwd.stderr,
    /"delegatedEngineeringGateEntered": false/u,
    'environment/preflight failure must state delegated engineering gate was not entered',
  );
  assert.match(
    wrongCwd.stderr,
    /"q1ToQ5Disposition": "NOT_RUN"/u,
    'environment/preflight failure must explicitly leave Q1-Q5 NOT_RUN',
  );

  const engineeringRepo = createSyntheticRepository(path.join(sandbox, 'engineering'), 7);
  const delegatedFailure = spawnSync(process.execPath, [engineeringRepo.preflightPath], {
    cwd: engineeringRepo.root,
    encoding: 'utf8',
  });

  assert.equal(delegatedFailure.status, 7, 'delegated gate exit status must propagate');
  assert.match(
    delegatedFailure.stderr,
    /"classification": "DELEGATED_ENGINEERING_GATE_NONZERO_STOP_AT_FIRST_CHILD_FAILURE"/u,
    'delegated non-zero must be classified without claiming which child assertion executed',
  );
  assert.match(
    delegatedFailure.stderr,
    /"delegatedEngineeringGateEntered": true/u,
    'delegated failure must state the engineering gate was entered',
  );
  assert.match(
    delegatedFailure.stderr,
    /"q1ToQ5Disposition": "UNKNOWN_OR_PARTIAL_SEE_FIRST_CHILD_FAILURE"/u,
    'delegated non-zero must not overstate full Q1-Q5 execution',
  );

  const successfulRepo = createSyntheticRepository(path.join(sandbox, 'success'), 0);
  const delegatedSuccess = spawnSync(process.execPath, [successfulRepo.preflightPath], {
    cwd: successfulRepo.root,
    encoding: 'utf8',
  });

  assert.equal(delegatedSuccess.status, 0, 'clean preflight with zero delegated status must succeed');
  assert.match(
    delegatedSuccess.stderr,
    /"schema": "lafea-implementation-authorization-local-preflight\/v1"/u,
    'successful environment preflight must emit its non-authoritative receipt',
  );
  assert.doesNotMatch(
    delegatedSuccess.stderr,
    /lafea-implementation-authorization-local-failure\/v1/u,
    'successful delegated execution must not emit a failure classification',
  );

  assertRetentionCustodyOrder(retentionSource);

  process.stdout.write(`${JSON.stringify({
    schema: 'lafea-implementation-authorization-local-preflight-self-test/v1',
    status: 'PASS',
    checks: Object.freeze({
      environmentFailureRemainsNotRun: true,
      delegatedGateEntryDistinguished: true,
      delegatedFailureDoesNotOverstateQ1ToQ5: true,
      delegatedExitStatusPropagated: true,
      successfulDelegationRemainsZero: true,
      postEngineeringCheckoutCleanlinessBoundBeforeReceipt: true,
      exactHeadEnvelopeV4RequiresCleanAfterEngineeringChecks: true,
    }),
    engineeringMechanicsExecuted: false,
    engineeringAuthorityCreated: false,
    releaseAuthorityGranted: false,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

function assertRetentionCustodyOrder(source) {
  assert.match(
    source,
    /schema: 'lafea-implementation-authorization-exact-head-envelope\/v4'/u,
    'retention envelope must use v4 after adding post-engineering checkout custody',
  );
  assert.match(
    source,
    /checkoutCleanAfterEngineeringChecks: true/u,
    'retention envelope must retain the post-engineering clean-checkout fact',
  );

  const q3Run = source.indexOf('const q3IndependentPressureEvidence = runJson');
  const cleanAfter = source.indexOf('const dirtyAfterEngineeringChecks = git');
  const body = source.indexOf('const body = Object.freeze');
  const writeReceipt = source.indexOf('fs.writeFileSync(REPORT_PATH');

  for (const [label, index] of [
    ['Q3 independent checker execution', q3Run],
    ['post-engineering cleanliness check', cleanAfter],
    ['envelope construction', body],
    ['receipt write', writeReceipt],
  ]) {
    assert.ok(index >= 0, `${label} must remain present in retention source`);
  }

  assert.ok(
    q3Run < cleanAfter && cleanAfter < body && body < writeReceipt,
    'retention order must be engineering checks -> clean checkout proof -> envelope -> receipt write',
  );
}

function createSyntheticRepository(root, delegatedExitCode) {
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'advanced-analysis', private: true, type: 'module' }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, 'scripts/lafea-implementation-authorization-local-preflight.mjs'),
    productionSource,
  );
  for (const relativePath of [
    'scripts/lafea-implementation-authorization-gate-check.mjs',
    'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
    'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  ]) {
    fs.writeFileSync(path.join(root, relativePath), 'export {};\n');
  }
  fs.writeFileSync(
    path.join(root, 'scripts/lafea-implementation-authorization-gate-retain.mjs'),
    `process.exit(${delegatedExitCode});\n`,
  );

  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'lafea-self-test@example.invalid']);
  git(root, ['config', 'user.name', 'LAFEA preflight self-test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'synthetic preflight contract']);

  return Object.freeze({
    root,
    preflightPath: path.join(root, 'scripts/lafea-implementation-authorization-local-preflight.mjs'),
  });
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
