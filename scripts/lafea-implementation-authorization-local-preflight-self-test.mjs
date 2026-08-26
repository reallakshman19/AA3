#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATHS = Object.freeze({
  preflight: 'scripts/lafea-implementation-authorization-local-preflight.mjs',
  runtime: 'scripts/lib/lafea-implementation-authorization-local-runtime.mjs',
  importClosure: 'scripts/lib/lafea-implementation-authorization-static-import-closure.mjs',
  retain: 'scripts/lafea-implementation-authorization-gate-retain.mjs',
  main: 'scripts/lafea-implementation-authorization-gate-check.mjs',
  q1: 'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
  q3: 'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  canonical: 'src/workspace/lafea-canonical-sha256.js',
});
const productionSources = Object.freeze({
  preflight: fs.readFileSync(path.join(REPOSITORY_ROOT, PATHS.preflight), 'utf8'),
  runtime: fs.readFileSync(path.join(REPOSITORY_ROOT, PATHS.runtime), 'utf8'),
  importClosure: fs.readFileSync(path.join(REPOSITORY_ROOT, PATHS.importClosure), 'utf8'),
});
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-auth-local-harness-'));

try {
  const wrongCwdRepo = createSyntheticRepository(path.join(sandbox, 'wrong-cwd'), 'SUCCESS');
  const wrongCwd = runHarness(wrongCwdRepo, sandbox);
  assert.notEqual(wrongCwd.status, 0);
  assertFailure(wrongCwd, 'NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED', false, 'NOT_RUN');

  const malformedRepo = createSyntheticRepository(path.join(sandbox, 'malformed'), 'SUCCESS', {
    mainSource: 'export const broken = ;\n',
  });
  const malformed = runHarness(malformedRepo);
  assert.notEqual(malformed.status, 0);
  assertFailure(malformed, 'NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED', false, 'NOT_RUN');

  const missingImportRepo = createSyntheticRepository(path.join(sandbox, 'missing-import'), 'SUCCESS', {
    mainSource: "import './missing-transitive-module.js';\nexport {};\n",
  });
  const missingImport = runHarness(missingImportRepo);
  assert.notEqual(missingImport.status, 0);
  assertFailure(missingImport, 'NOT_RUN_ENVIRONMENT_OR_CHECKOUT_PREFLIGHT_FAILED', false, 'NOT_RUN');

  const delegatedRepo = createSyntheticRepository(path.join(sandbox, 'delegated'), 'EXIT_7');
  const delegated = runHarness(delegatedRepo);
  assert.equal(delegated.status, 7);
  assertFailure(
    delegated,
    'DELEGATED_ENGINEERING_GATE_NONZERO_STOP_AT_FIRST_CHILD_FAILURE',
    true,
    'UNKNOWN_OR_PARTIAL_SEE_FIRST_CHILD_FAILURE',
  );

  const tamperedRepo = createSyntheticRepository(path.join(sandbox, 'tampered'), 'TAMPER_REPORT');
  const tampered = runHarness(tamperedRepo);
  assert.notEqual(tampered.status, 0);
  assertFailure(
    tampered,
    'POST_GATE_EVIDENCE_VERIFICATION_FAILED',
    true,
    'CHILD_RETURNED_ZERO_BUT_EXACT_HEAD_EVIDENCE_NOT_ACCEPTED',
  );

  const headMismatchRepo = createSyntheticRepository(path.join(sandbox, 'head-mismatch'), 'HEAD_MISMATCH');
  const headMismatch = runHarness(headMismatchRepo);
  assert.notEqual(headMismatch.status, 0);
  assertFailure(
    headMismatch,
    'POST_GATE_EVIDENCE_VERIFICATION_FAILED',
    true,
    'CHILD_RETURNED_ZERO_BUT_EXACT_HEAD_EVIDENCE_NOT_ACCEPTED',
  );

  const successRepo = createSyntheticRepository(path.join(sandbox, 'success'), 'SUCCESS');
  const success = runHarness(successRepo);
  assert.equal(success.status, 0, success.stderr);
  const successReceipt = JSON.parse(success.stdout);
  assert.equal(successReceipt.schema, 'lafea-implementation-authorization-local-execution/v1');
  assert.equal(successReceipt.status, 'PASS');
  assert.equal(successReceipt.preflight.schema, 'lafea-implementation-authorization-local-preflight/v2');
  assert.equal(successReceipt.preflight.staticImportClosure.localModuleCount > 0, true);
  assert.equal(successReceipt.verification.status, 'PASS');
  assert.deepEqual(successReceipt.verification.q1ToQ5, {
    q1: 'PASS', q2: 'PASS', q3: 'PASS', q4: 'PASS', q5: 'PASS',
  });
  assert.equal(successReceipt.implementationAuthorizationEvidenceVerified, true);
  assert.equal(successReceipt.localHarnessAuthorityCreated, false);
  assert.equal(successReceipt.releaseAuthorityGranted, false);

  process.stdout.write(`${JSON.stringify({
    schema: 'lafea-implementation-authorization-local-preflight-self-test/v2',
    status: 'PASS',
    checks: Object.freeze({
      wrongCwdRemainsNotRun: true,
      parserFailureRemainsNotRun: true,
      missingTransitiveStaticImportRemainsNotRun: true,
      delegatedExitStatusPropagated: true,
      delegatedFailureDoesNotOverstateQ1ToQ5: true,
      tamperedRetainedReportRejectedPostGate: true,
      repositoryHeadMismatchRejectedPostGate: true,
      validEnvelopeHashAndFileBindingAccepted: true,
      successfulHarnessReportsQ1ToQ5PassOnlyAfterVerification: true,
    }),
    engineeringMechanicsExecuted: false,
    engineeringAuthorityCreated: false,
    releaseAuthorityGranted: false,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

function runHarness(repo, cwd = repo.root) {
  return spawnSync(process.execPath, [repo.preflightPath], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function assertFailure(result, classification, gateEntered, q1ToQ5Disposition) {
  const receipt = parseLastJsonObject(result.stderr);
  assert.equal(receipt.schema, 'lafea-implementation-authorization-local-failure/v2');
  assert.equal(receipt.classification, classification);
  assert.equal(receipt.delegatedEngineeringGateEntered, gateEntered);
  assert.equal(receipt.q1ToQ5Disposition, q1ToQ5Disposition);
  assert.equal(receipt.implementationAuthorizationEvidenceVerified, false);
  assert.equal(receipt.releaseAuthorityGranted, false);
}

function createSyntheticRepository(root, mode, options = {}) {
  for (const relativePath of Object.values(PATHS)) {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  }
  fs.mkdirSync(path.join(root, 'reports/qualification'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify({
    name: 'advanced-analysis', private: true, type: 'module',
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, '.gitignore'), '/reports/qualification/lafea-implementation-authorization-gate.json\n');
  fs.writeFileSync(path.join(root, PATHS.preflight), productionSources.preflight);
  fs.writeFileSync(path.join(root, PATHS.runtime), productionSources.runtime);
  fs.writeFileSync(path.join(root, PATHS.importClosure), productionSources.importClosure);
  fs.writeFileSync(path.join(root, PATHS.main), options.mainSource ?? 'export {};\n');
  fs.writeFileSync(path.join(root, PATHS.q1), 'export {};\n');
  fs.writeFileSync(path.join(root, PATHS.q3), 'export {};\n');
  fs.writeFileSync(path.join(root, PATHS.canonical), canonicalStubSource());
  fs.writeFileSync(path.join(root, PATHS.retain), retainSource(mode));

  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'lafea-self-test@example.invalid']);
  git(root, ['config', 'user.name', 'LAFEA local harness self-test']);
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', `synthetic ${mode}`]);

  return Object.freeze({
    root,
    preflightPath: path.join(root, PATHS.preflight),
  });
}

function retainSource(mode) {
  if (mode === 'EXIT_7') return 'process.exit(7);\n';
  return `
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const actualHead = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const repositoryHead = ${JSON.stringify(mode)} === 'HEAD_MISMATCH' ? '0000000000000000000000000000000000000000' : actualHead;
const receipt = {
  schema: 'lafea-implementation-authorization-gate-receipt/v1',
  status: 'PASS',
  authority: { releaseAuthorityGranted: false },
  q1: { status: 'PASS' }, q2: { status: 'PASS' }, q3: { status: 'PASS' },
  q4: { status: 'PASS' }, q5: { status: 'PASS' },
};
const body = {
  schema: 'lafea-implementation-authorization-exact-head-envelope/v4',
  repository: 'reallaksh19/Advanced_Analysis',
  repositoryHead,
  checkoutCleanBeforeExecution: true,
  checkoutCleanAfterEngineeringChecks: true,
  checkerPaths: [
    'scripts/lafea-implementation-authorization-gate-check.mjs',
    'scripts/lafea3-direct-loaded-element-authorization-check.mjs',
    'scripts/lafea4-independent-pressure-resultant-authorization-check.mjs',
  ],
  reportPath: 'reports/qualification/lafea-implementation-authorization-gate.json',
  evidenceStatus: 'PASS',
  releaseAuthorityGranted: false,
  receipt,
  q1DirectLoadedElementEvidence: { status: 'PASS' },
  q3IndependentPressureEvidence: { status: 'PASS' },
};
const envelope = { ...body, evidenceArtifactHash: canonicalLafeaSha256({
  schema: 'lafea-implementation-authorization-exact-head-envelope-hash-input/v4', evidence: body,
}) };
const reportPath = path.join(root, 'reports/qualification/lafea-implementation-authorization-gate.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const retained = ${JSON.stringify(mode)} === 'TAMPER_REPORT' ? { ...envelope, evidenceStatus: 'TAMPERED' } : envelope;
fs.writeFileSync(reportPath, JSON.stringify(retained, null, 2) + '\\n');
process.stdout.write(JSON.stringify(envelope, null, 2) + '\\n');
`;
}

function canonicalStubSource() {
  return `
import crypto from 'node:crypto';
export function canonicalLafeaJson(value) { return stable(value); }
export function canonicalLafeaSha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(stable(value)).digest('hex');
}
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}
`;
}

function parseLastJsonObject(stderr) {
  const starts = [];
  for (let index = 0; index < stderr.length; index += 1) if (stderr[index] === '{') starts.push(index);
  for (let index = starts.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(stderr.slice(starts[index])); } catch { /* continue */ }
  }
  throw new Error(`no trailing JSON receipt found in stderr: ${stderr}`);
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
