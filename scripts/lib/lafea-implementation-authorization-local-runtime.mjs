import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  canonicalLafeaJson,
  canonicalLafeaSha256,
} from '../../src/workspace/lafea-canonical-sha256.js';

export const AUTHORIZATION_REPOSITORY = 'reallaksh19/Advanced_Analysis';
export const AUTHORIZATION_REPORT_RELATIVE_PATH =
  'reports/qualification/lafea-implementation-authorization-gate.json';
export const AUTHORIZATION_ENTRYPOINTS = Object.freeze([
  'scripts/lafea-implementation-authorization-gate-check.mjs',
  'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
  'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  'scripts/lafea-implementation-authorization-gate-retain.mjs',
]);
export const AUTHORIZATION_REQUIRED_PATHS = Object.freeze([
  'package.json',
  ...AUTHORIZATION_ENTRYPOINTS,
  'scripts/lib/lafea-implementation-authorization-static-import-closure.mjs',
]);

export function runLocalAuthorizationPreflight({
  root,
  cwd = process.cwd(),
  env = process.env,
  nodeExecutable = process.execPath,
} = {}) {
  assert.ok(root, 'authorization preflight requires repository root');
  const repositoryRoot = path.resolve(root);
  assert.equal(path.resolve(cwd), repositoryRoot, `run from repository root: ${repositoryRoot}`);

  const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson?.name, 'advanced-analysis', 'unexpected repository package identity');
  assert.equal(packageJson?.type, 'module', 'authorization runner requires repository ESM contract');
  assert.equal(typeof globalThis.structuredClone, 'function', 'Node runtime lacks structuredClone');
  assert.equal(typeof globalThis.URL, 'function', 'Node runtime lacks URL');
  assert.ok(process.versions?.node, 'Node runtime version identity is unavailable');

  for (const relativePath of AUTHORIZATION_REQUIRED_PATHS) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, `required authorization path missing: ${relativePath}`);
    assert.equal(fs.statSync(absolutePath).isFile(), true, `required authorization path is not a file: ${relativePath}`);
  }

  const gitTopLevel = git(repositoryRoot, ['rev-parse', '--show-toplevel']).trim();
  assert.equal(path.resolve(gitTopLevel), repositoryRoot, 'Git top-level directory does not match repository root');
  const repositoryHead = git(repositoryRoot, ['rev-parse', '--verify', 'HEAD']).trim();
  assert.match(repositoryHead, /^[0-9a-f]{40}$/u, 'exact repository HEAD must be a full Git SHA');
  assertCleanCheckout(repositoryRoot, 'authorization execution requires a clean checkout');

  const requestedReport = env.LAFEA_IMPLEMENTATION_AUTHORIZATION_REPORT_PATH;
  const defaultReportPath = path.resolve(repositoryRoot, AUTHORIZATION_REPORT_RELATIVE_PATH);
  if (typeof requestedReport === 'string' && requestedReport.trim()) {
    assert.equal(
      path.resolve(repositoryRoot, requestedReport),
      defaultReportPath,
      'local exact-head authorization runner requires the governed default report path',
    );
  }

  for (const relativePath of AUTHORIZATION_ENTRYPOINTS) {
    execFileSync(nodeExecutable, ['--check', path.join(repositoryRoot, relativePath)], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  const importClosure = runStaticImportClosure(repositoryRoot, nodeExecutable);
  assert.equal(importClosure?.status, 'PASS');

  return Object.freeze({
    schema: 'lafea-implementation-authorization-local-preflight/v2',
    status: 'PASS',
    repository: AUTHORIZATION_REPOSITORY,
    repositoryHead,
    repositoryRoot,
    packageIdentity: packageJson.name,
    packageType: packageJson.type,
    nodeVersion: process.versions.node,
    gitAvailable: true,
    checkoutClean: true,
    reportPath: AUTHORIZATION_REPORT_RELATIVE_PATH,
    syntaxCheckedEntrypoints: AUTHORIZATION_ENTRYPOINTS,
    staticImportClosure: Object.freeze({
      schema: importClosure.schema,
      localModuleCount: importClosure.localModuleCount,
      nodeBuiltins: importClosure.nodeBuiltins,
      externalPackages: importClosure.externalPackages,
    }),
    engineeringAuthorityCreated: false,
    releaseAuthorityGranted: false,
    delegatedEntryPoint: 'scripts/lafea-implementation-authorization-gate-retain.mjs',
  });
}

export function verifyRetainedAuthorizationEnvelope({
  root,
  repositoryHead,
  envelope,
} = {}) {
  assert.ok(root, 'receipt verification requires repository root');
  assert.match(repositoryHead ?? '', /^[0-9a-f]{40}$/u, 'receipt verification requires exact repository head');
  assertRecord(envelope, 'retained exact-head envelope');
  assert.equal(envelope.schema, 'lafea-implementation-authorization-exact-head-envelope/v4');
  assert.equal(envelope.repository, AUTHORIZATION_REPOSITORY);
  assert.equal(envelope.repositoryHead, repositoryHead, 'retained envelope HEAD does not match preflight HEAD');
  assert.equal(envelope.checkoutCleanBeforeExecution, true);
  assert.equal(envelope.checkoutCleanAfterEngineeringChecks, true);
  assert.equal(envelope.evidenceStatus, 'PASS');
  assert.equal(envelope.releaseAuthorityGranted, false);
  assert.deepEqual(envelope.checkerPaths, AUTHORIZATION_ENTRYPOINTS.slice(0, 3));
  assert.equal(envelope.reportPath, AUTHORIZATION_REPORT_RELATIVE_PATH);

  assertRecord(envelope.receipt, 'main Q1-Q5 receipt');
  assert.equal(envelope.receipt.schema, 'lafea-implementation-authorization-gate-receipt/v1');
  assert.equal(envelope.receipt.status, 'PASS');
  assert.equal(envelope.receipt.authority?.releaseAuthorityGranted, false);
  for (const question of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    assert.equal(envelope.receipt[question]?.status, 'PASS', `${question.toUpperCase()} must be PASS in retained receipt`);
  }
  assert.equal(envelope.q1DirectLoadedElementEvidence?.status, 'PASS');
  assert.equal(envelope.q3IndependentPressureEvidence?.status, 'PASS');

  const { evidenceArtifactHash, ...body } = envelope;
  assert.equal(
    evidenceArtifactHash,
    canonicalLafeaSha256({
      schema: 'lafea-implementation-authorization-exact-head-envelope-hash-input/v4',
      evidence: body,
    }),
    'retained exact-head envelope evidenceArtifactHash mismatch',
  );

  const reportPath = path.resolve(root, AUTHORIZATION_REPORT_RELATIVE_PATH);
  assert.equal(fs.existsSync(reportPath), true, 'retained authorization report file is missing after delegated PASS');
  const retainedFileEnvelope = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(
    canonicalLafeaJson(retainedFileEnvelope),
    canonicalLafeaJson(envelope),
    'retained report file does not match delegated stdout envelope',
  );
  assertCleanCheckout(path.resolve(root), 'checkout changed after retained receipt write');

  return Object.freeze({
    schema: 'lafea-implementation-authorization-local-verification/v1',
    status: 'PASS',
    repository: AUTHORIZATION_REPOSITORY,
    repositoryHead,
    reportPath: AUTHORIZATION_REPORT_RELATIVE_PATH,
    exactHeadEnvelopeSchema: envelope.schema,
    evidenceArtifactHash,
    q1ToQ5: Object.freeze({ q1: 'PASS', q2: 'PASS', q3: 'PASS', q4: 'PASS', q5: 'PASS' }),
    q1DirectLoadedElementEvidence: 'PASS',
    q3IndependentPressureEvidence: 'PASS',
    retainedFileMatchesDelegatedEnvelope: true,
    checkoutCleanAfterReceiptWrite: true,
    implementationAuthorizationEvidenceVerified: true,
    localHarnessAuthorityCreated: false,
    releaseAuthorityGranted: false,
  });
}

export function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function assertCleanCheckout(root, message) {
  const dirty = git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim();
  assert.equal(dirty, '', `${message}; dirty state:\n${dirty}`);
}

function runStaticImportClosure(root, nodeExecutable) {
  const worker = path.join(root, 'scripts/lib/lafea-implementation-authorization-static-import-closure.mjs');
  const stdout = execFileSync(
    nodeExecutable,
    ['--experimental-vm-modules', '--no-warnings', worker, root, ...AUTHORIZATION_ENTRYPOINTS],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  return JSON.parse(stdout);
}

function assertRecord(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}
