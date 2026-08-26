#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checker = resolve(root, 'scripts/emp1-professional-dependency-advisory-check.mjs');
const temp = await mkdtemp(join(tmpdir(), 'emp1-dependency-advisory-'));

try {
  const clean = await runFixture('clean', payload({}), 0);
  assert.equal(clean.exitCode, 0);
  assert.equal(clean.payload.status, 'PASS');
  assert.equal(clean.payload.code, 'PASS_DEPENDENCY_ADVISORY_FIXTURE_CLASSIFICATION_ONLY');
  assert.equal(clean.payload.authorityBoundary.liveAdvisoryStatusEstablished, false);
  assert.equal(clean.payload.authorityBoundary.vulnerabilityFreeClaimed, false);

  const high = await runFixture('high', payload({ high: 1, total: 1 }), 1);
  assert.equal(high.exitCode, 1);
  assert.equal(high.payload.status, 'FAIL');
  assert.equal(high.payload.code, 'DEPENDENCY_ADVISORY_HIGH_OR_CRITICAL_FOUND');

  const critical = await runFixture('critical', payload({ critical: 1, total: 1 }), 1);
  assert.equal(critical.exitCode, 1);
  assert.equal(critical.payload.status, 'FAIL');
  assert.equal(critical.payload.code, 'DEPENDENCY_ADVISORY_HIGH_OR_CRITICAL_FOUND');

  const unavailable = await runFixture('unavailable', { error: { code: 'EAI_AGAIN' } }, 1);
  assert.equal(unavailable.exitCode, 3);
  assert.equal(unavailable.payload.status, 'NOT_RUN_EXECUTION_ENVIRONMENT');
  assert.equal(unavailable.payload.code, 'DEPENDENCY_ADVISORY_SERVICE_EAI_AGAIN');
  assert.equal(unavailable.payload.authorityBoundary.liveAdvisoryStatusEstablished, false);

  const forgedExit = await runFixture('forged-exit', payload({}), 1);
  assert.equal(forgedExit.exitCode, 1);
  assert.equal(forgedExit.payload.status, 'FAIL');
  assert.equal(forgedExit.payload.code, 'DEPENDENCY_ADVISORY_COMMAND_EXIT_UNEXPECTED');

  const invalidSchema = await runFixture('invalid-schema', { metadata: { vulnerabilities: { high: 0 } } }, 0);
  assert.equal(invalidSchema.exitCode, 1);
  assert.equal(invalidSchema.payload.status, 'FAIL');
  assert.equal(invalidSchema.payload.code, 'DEPENDENCY_ADVISORY_RESULT_SCHEMA_INVALID');

  const candidateSource = await readFile(
    resolve(root, 'scripts/emp1-professional-release-candidate.mjs'),
    'utf8',
  );
  const orderedGateIds = [
    'CURRENTNESS_REPLAY_FALSIFIERS',
    'DEPENDENCY_LOCK_CUSTODY',
    'DEPENDENCY_LOCK_CUSTODY_FALSIFIER',
    'DEPENDENCY_ADVISORY',
    'DEPENDENCY_ADVISORY_FALSIFIER',
    'PRODUCTION_BUILD',
    'BUILD_ARTIFACT_SECURITY',
    'BUILD_ARTIFACT_SECURITY_FALSIFIER',
    'EMP1_RELEASE_CHROMIUM',
  ];
  const positions = orderedGateIds.map((gateId) => candidateSource.indexOf(`['${gateId}'`));
  assert.equal(positions.every((value) => value >= 0), true, 'all dependency/release gate IDs must exist');
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], `gate order drift at ${orderedGateIds[index]}`);
  }
  assert.match(candidateSource, /packageLockSha256:\s*dependencyLockSha256/u,
    'candidate receipt must bind exact package-lock SHA-256');
  assert.match(candidateSource,
    /gateId === 'DEPENDENCY_ADVISORY' && result\.status === 3/u,
    'live advisory exit 3 must remain NOT_RUN rather than FAIL/PASS');
  assert.match(candidateSource, /vulnerabilityFreeClaimedByThisHarness:\s*false/u,
    'candidate harness must not claim vulnerability-free status');

  console.log(JSON.stringify({
    schema: 'emp1-professional-dependency-advisory-falsifier/v1',
    status: 'PASS',
    falsifiers: [
      'FIXTURE_PASS_CANNOT_CREATE_LIVE_ADVISORY_AUTHORITY',
      'HIGH_FINDING_REJECTED',
      'CRITICAL_FINDING_REJECTED',
      'ADVISORY_SERVICE_UNAVAILABLE_IS_NOT_RUN',
      'NONZERO_EXIT_CANNOT_FORGE_CLEAN_PASS',
      'INVALID_AUDIT_SCHEMA_CANNOT_FORGE_PASS',
      'DEPENDENCY_GATE_ORDER_BOUND_BEFORE_BUILD',
      'PACKAGE_LOCK_SHA_BOUND_IN_CANDIDATE_RECEIPT',
      'ADVISORY_EXIT3_BOUND_TO_NOT_RUN',
      'VULNERABILITY_FREE_CLAIM_FORBIDDEN',
    ],
    authorityBoundary: {
      liveAdvisoryStatusEstablished: false,
      vulnerabilityFreeClaimed: false,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
    },
  }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
}

function payload(overrides) {
  return {
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
        ...overrides,
      },
    },
  };
}

async function runFixture(name, value, exitCode) {
  const path = join(temp, `${name}.json`);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  const run = spawnSync(process.execPath, [
    checker,
    '--fixture', path,
    '--fixture-exit', String(exitCode),
  ], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(run.error, undefined, `advisory checker launch failed: ${run.error?.message ?? ''}`);
  assert.ok(Number.isInteger(run.status), 'advisory checker exit code required');
  let parsed;
  try {
    parsed = JSON.parse(run.stdout);
  } catch {
    throw new Error(`EMP1_DEPENDENCY_ADVISORY_FALSIFIER_JSON_REQUIRED:${run.stdout}`);
  }
  return { exitCode: run.status, payload: parsed };
}
