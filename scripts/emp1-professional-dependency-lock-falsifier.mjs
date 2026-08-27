#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checker = resolve(root, 'scripts/emp1-professional-dependency-lock-check.mjs');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const temp = await mkdtemp(join(tmpdir(), 'emp1-dependency-lock-'));

try {
  const baseline = runChecker(resolve(root, 'package.json'), resolve(root, 'package-lock.json'));
  assert.equal(baseline.exitCode, 0, 'current repository dependency lock custody must satisfy encoded policy');
  assert.equal(baseline.payload.status, 'PASS');
  assert.equal(baseline.payload.authorityBoundary.vulnerabilityStatusEstablished, false);

  const direct = firstDirectDependency(manifest);
  assert.ok(direct, 'falsifier requires at least one direct dependency');
  const packageKey = `node_modules/${direct.name}`;
  assert.ok(lock.packages?.[packageKey], `direct dependency lock entry required for ${direct.name}`);

  await expectFailure('root-map-drift', (p, l) => {
    p[direct.kind][direct.name] = `${p[direct.kind][direct.name]}-FALSIFIED`;
  }, 'DEPENDENCY_ROOT_MAP_MISMATCH_');

  await expectFailure('missing-direct-entry', (_p, l) => {
    delete l.packages[packageKey];
  }, 'DEPENDENCY_DIRECT_LOCK_ENTRY_MISSING');

  const resolvedKey = Object.keys(lock.packages).find((key) =>
    key !== '' && typeof lock.packages[key]?.resolved === 'string' && typeof lock.packages[key]?.integrity === 'string');
  assert.ok(resolvedKey, 'falsifier requires one resolved integrity-bound package');

  await expectFailure('insecure-resolved-source', (_p, l) => {
    l.packages[resolvedKey].resolved = 'http://registry.npmjs.org/falsified-package/-/falsified-package-1.0.0.tgz';
  }, 'DEPENDENCY_RESOLVED_SOURCE_HTTPS_REQUIRED');

  await expectFailure('missing-integrity', (_p, l) => {
    delete l.packages[resolvedKey].integrity;
  }, 'DEPENDENCY_RESOLVED_INTEGRITY_REQUIRED');

  await expectFailure('unqualified-direct-specifier', (p, l) => {
    p[direct.kind][direct.name] = 'file:../falsified-local-package';
    l.packages[''][direct.kind][direct.name] = 'file:../falsified-local-package';
  }, 'DEPENDENCY_DIRECT_SPECIFIER_UNQUALIFIED');

  console.log(JSON.stringify({
    schema: 'emp1-professional-dependency-lock-falsifier/v1',
    status: 'PASS',
    falsifiers: [
      'ROOT_MAP_DRIFT_REJECTED',
      'MISSING_DIRECT_LOCK_ENTRY_REJECTED',
      'INSECURE_RESOLVED_SOURCE_REJECTED',
      'MISSING_INTEGRITY_REJECTED',
      'UNQUALIFIED_DIRECT_SPECIFIER_REJECTED',
    ],
    authorityBoundary: {
      vulnerabilityStatusEstablished: false,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
    },
  }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
}

async function expectFailure(name, mutate, expectedCodePrefix) {
  const p = structuredClone(manifest);
  const l = structuredClone(lock);
  mutate(p, l);
  const packagePath = join(temp, `${name}-package.json`);
  const lockPath = join(temp, `${name}-package-lock.json`);
  await writeFile(packagePath, `${JSON.stringify(p, null, 2)}\n`, 'utf8');
  await writeFile(lockPath, `${JSON.stringify(l, null, 2)}\n`, 'utf8');
  const result = runChecker(packagePath, lockPath);
  assert.equal(result.exitCode, 1, `${name} must fail dependency custody`);
  assert.equal(result.payload.status, 'FAIL');
  assert.equal(result.payload.authorityBoundary.exactDependencyCustodyEstablished, false);
  assert.ok(result.payload.violations.some((item) => item.code.startsWith(expectedCodePrefix)),
    `${name} must report ${expectedCodePrefix}`);
}

function runChecker(packagePath, lockPath) {
  const result = spawnSync(process.execPath, [checker, '--package', packagePath, '--lock', lockPath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, `checker launch failed: ${result.error?.message ?? ''}`);
  assert.ok(Number.isInteger(result.status), 'checker exit code required');
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    throw new Error(`EMP1_DEPENDENCY_LOCK_FALSIFIER_CHECKER_JSON_REQUIRED:${result.stdout}`);
  }
  return { exitCode: result.status, payload };
}

function firstDirectDependency(value) {
  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const names = Object.keys(value?.[kind] ?? {}).sort();
    if (names.length) return { kind, name: names[0] };
  }
  return null;
}
