#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scanner = resolve(root, 'scripts/emp1-professional-build-artifact-security-check.mjs');
const releaseHarness = resolve(root, 'scripts/emp1-professional-release-candidate.mjs');
const controlledWrc = resolve(root, 'docs/emp1/WRC537_2013.pdf');
const controlledCaux = resolve(root, 'docs/emp1/CAUx 2017 - WRC01f.pdf');
const controlledWrcSha256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const controlledCauxSha256 = 'c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e';
const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-build-artifact-security-'));

try {
  const clean = await makeCase('clean', {
    'index.html': '<!doctype html><title>EMP.1</title>',
    'assets/app.js': 'console.log("bounded release artifact");',
  });
  const cleanResult = runScanner(clean);
  assert.equal(cleanResult.status, 0);
  assert.equal(cleanResult.receipt.status, 'PASS_BUILD_ARTIFACT_SECURITY');
  assert.deepEqual(cleanResult.receipt.violations, []);

  const basenameCase = await makeCase('source-basename', {
    'assets/WRC537_2013.pdf': 'not-the-controlled-pdf',
    'assets/CAUx 2017 - WRC01f.pdf': 'not-the-controlled-benchmark-pdf',
  });
  assertViolation(
    runScanner(basenameCase),
    'CONTROLLED_SOURCE_BASENAME_PROHIBITED:WRC537_2013_PRIMARY_SOURCE',
    'assets/WRC537_2013.pdf',
  );
  assertViolation(
    runScanner(basenameCase),
    'CONTROLLED_SOURCE_BASENAME_PROHIBITED:CAUX_2017_WRC01F_BENCHMARK_SOURCE',
    'assets/CAUx 2017 - WRC01f.pdf',
  );

  await assertControlledSourceHash({
    sourcePath: controlledWrc,
    expectedSha256: controlledWrcSha256,
    tempCaseName: 'wrc-source-renamed',
    renamedFile: 'renamed-wrc-source.bin',
    violationCode: 'CONTROLLED_SOURCE_SHA256_PROHIBITED:WRC537_2013_PRIMARY_SOURCE',
  });
  await assertControlledSourceHash({
    sourcePath: controlledCaux,
    expectedSha256: controlledCauxSha256,
    tempCaseName: 'caux-source-renamed',
    renamedFile: 'renamed-caux-source.bin',
    violationCode: 'CONTROLLED_SOURCE_SHA256_PROHIBITED:CAUX_2017_WRC01F_BENCHMARK_SOURCE',
  });

  const sourceMapCase = await makeCase('source-map', {
    'assets/app.js.map': '{"version":3}',
  });
  assertViolation(runScanner(sourceMapCase), 'DEPLOYABLE_SOURCE_MAP_PROHIBITED', 'assets/app.js.map');

  const keyContainerCase = await makeCase('key-container', {
    'assets/release.key': 'not-a-real-key',
  });
  assertViolation(
    runScanner(keyContainerCase),
    'DEPLOYABLE_PRIVATE_KEY_CONTAINER_PROHIBITED',
    'assets/release.key',
  );

  const envCase = await makeCase('env-config', {
    '.env.production': 'PUBLIC_ONLY=true',
  });
  assertViolation(
    runScanner(envCase),
    'DEPLOYABLE_CREDENTIAL_CONFIGURATION_PROHIBITED',
    '.env.production',
  );

  const pemSentinel = '-----BEGIN PRIVATE KEY-----';
  const pemCase = await makeCase('pem-signature', {
    'assets/config.txt': `${pemSentinel}\nSENSITIVE_PRIVATE_KEY_BYTES\n`,
  });
  const pemResult = assertViolation(
    runScanner(pemCase),
    'SECRET_SIGNATURE_PROHIBITED:PRIVATE_KEY_PEM_HEADER',
    'assets/config.txt',
  );
  assert.equal(pemResult.stdout.includes('SENSITIVE_PRIVATE_KEY_BYTES'), false);

  const githubToken = `ghp_${'A'.repeat(32)}`;
  const githubCase = await makeCase('github-token', {
    'assets/app.js': `const token = "${githubToken}";`,
  });
  const githubResult = assertViolation(
    runScanner(githubCase),
    'SECRET_SIGNATURE_PROHIBITED:GITHUB_PERSONAL_ACCESS_TOKEN',
    'assets/app.js',
  );
  assert.equal(githubResult.stdout.includes(githubToken), false, 'scanner must never echo matched PAT value');
  assert.equal(githubResult.stderr.includes(githubToken), false, 'scanner stderr must never echo matched PAT value');

  const awsKey = `AKIA${'B'.repeat(16)}`;
  const awsCase = await makeCase('aws-key', {
    'assets/app.js': `const key = "${awsKey}";`,
  });
  const awsResult = assertViolation(
    runScanner(awsCase),
    'SECRET_SIGNATURE_PROHIBITED:AWS_ACCESS_KEY_ID',
    'assets/app.js',
  );
  assert.equal(awsResult.stdout.includes(awsKey), false);
  assert.equal(awsResult.stderr.includes(awsKey), false);

  const harnessSource = await readFile(releaseHarness, 'utf8');
  const buildIndex = harnessSource.indexOf("['PRODUCTION_BUILD'");
  const securityIndex = harnessSource.indexOf("['BUILD_ARTIFACT_SECURITY'");
  const falsifierIndex = harnessSource.indexOf("['BUILD_ARTIFACT_SECURITY_FALSIFIER'");
  const browserIndex = harnessSource.indexOf("['EMP1_RELEASE_CHROMIUM'");
  assert.ok(buildIndex >= 0, 'release harness must retain PRODUCTION_BUILD');
  assert.ok(securityIndex > buildIndex, 'artifact security must run after production build');
  assert.ok(falsifierIndex > securityIndex, 'artifact security falsifier must run after real artifact scan');
  assert.ok(browserIndex > falsifierIndex, 'artifact security gates must run before release Chromium');

  console.log(JSON.stringify({
    schema: 'emp1-professional-build-artifact-security-falsifier/v1',
    status: 'PASS_BUILD_ARTIFACT_SECURITY_FALSIFIERS',
    cleanArtifactAccepted: true,
    bothControlledSourceBasenamesRejected: true,
    wrcRenamedControlledSourceHashRejected: true,
    cauxRenamedControlledSourceHashRejected: true,
    sourceMapRejected: true,
    privateKeyContainerRejected: true,
    environmentCredentialFileRejected: true,
    privateKeySignatureRejected: true,
    githubPatRejectedWithoutValueEcho: true,
    awsAccessKeyRejectedWithoutValueEcho: true,
    releaseHarnessOrderingVerified: true,
    engineeringAuthorityCreated: false,
    releaseAuthorityCreated: false,
  }, null, 2));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function assertControlledSourceHash({
  sourcePath,
  expectedSha256,
  tempCaseName,
  renamedFile,
  violationCode,
}) {
  const bytes = await readFile(sourcePath);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    expectedSha256,
    `${sourcePath} bytes must match the frozen source-custody SHA-256`,
  );
  const directory = await makeCase(tempCaseName, {});
  await copyFile(sourcePath, join(directory, renamedFile));
  assertViolation(runScanner(directory), violationCode, renamedFile);
}

async function makeCase(name, files) {
  const directory = join(tempRoot, name);
  await mkdir(directory, { recursive: true });
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(directory, relativePath);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, content);
  }
  return directory;
}

function runScanner(directory) {
  const result = spawnSync(process.execPath, [scanner, '--dist', directory], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, `scanner launch failed: ${result.error?.code ?? 'unknown'}`);
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  let receipt;
  try {
    receipt = JSON.parse(stdout);
  } catch {
    assert.fail(`scanner did not return JSON receipt; stderr bytes=${Buffer.byteLength(stderr, 'utf8')}`);
  }
  return { status: result.status, stdout, stderr, receipt };
}

function assertViolation(result, code, path) {
  assert.equal(result.status, 1, `expected security rejection for ${code}`);
  assert.equal(result.receipt.status, 'FAIL_BUILD_ARTIFACT_SECURITY_VIOLATIONS');
  assert.ok(
    result.receipt.violations.some((row) => row.code === code && row.path === path),
    `missing violation ${code} at ${path}`,
  );
  assert.equal(result.receipt.diagnosticsExposeMatchedSecretOrSourceContent, false);
  return result;
}
