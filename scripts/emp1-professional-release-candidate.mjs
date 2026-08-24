#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const candidateHead = git(['rev-parse', 'HEAD']);
const candidateTree = git(['rev-parse', 'HEAD^{tree}']);
const candidateParent = git(['rev-parse', 'HEAD^']);
const worktreeStatus = git(['status', '--porcelain']);

if (options.expectedHead && options.expectedHead !== candidateHead) {
  throw releaseError(`EMP1_RELEASE_CANDIDATE_HEAD_MISMATCH:${candidateHead}:${options.expectedHead}`);
}
if (options.release && worktreeStatus !== '') {
  throw releaseError('EMP1_RELEASE_CANDIDATE_CLEAN_WORKTREE_REQUIRED');
}

const readiness = runNode(
  'RELEASE_READINESS_POLICY',
  ['scripts/emp1-professional-release-readiness-check.mjs', ...(options.release ? ['--require-release'] : [])],
);
const prerequisiteBlocked = options.release && readiness.exitCode === 2;
if (prerequisiteBlocked) {
  const receipt = createReceipt({
    candidateHead,
    candidateTree,
    candidateParent,
    worktreeStatus,
    mode: 'RELEASE',
    executions: [readiness],
    buildArtifactSha256: null,
    status: 'BLOCKED_RELEASE_PREREQUISITES_NOT_READY',
    releaseCandidateQualified: false,
  });
  await maybeWriteReceipt(receipt, options.writeReceipt);
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(2);
}
if (readiness.exitCode !== 0) {
  const receipt = createReceipt({
    candidateHead,
    candidateTree,
    candidateParent,
    worktreeStatus,
    mode: options.release ? 'RELEASE' : 'DIAGNOSTIC',
    executions: [readiness],
    buildArtifactSha256: null,
    status: readiness.status === 'NOT_RUN_EXECUTION_ENVIRONMENT'
      ? 'NOT_RUN_RELEASE_READINESS_EXECUTION_ENVIRONMENT'
      : 'FAIL_RELEASE_READINESS_POLICY',
    releaseCandidateQualified: false,
  });
  await maybeWriteReceipt(receipt, options.writeReceipt);
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(readiness.status === 'NOT_RUN_EXECUTION_ENVIRONMENT' ? 3 : 1);
}

if (!options.release && !options.executeDiagnostics) {
  const receipt = createReceipt({
    candidateHead,
    candidateTree,
    candidateParent,
    worktreeStatus,
    mode: 'POLICY_ONLY',
    executions: [readiness],
    buildArtifactSha256: null,
    status: 'PASS_POLICY_ONLY_NO_RELEASE_EXECUTION_PERFORMED',
    releaseCandidateQualified: false,
  });
  await maybeWriteReceipt(receipt, options.writeReceipt);
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

const gates = [
  ['SOURCE_CUSTODY', process.execPath, ['scripts/emp1-source-custody-reconciliation-check.mjs']],
  ['P0_SOURCE_SEMANTICS', process.execPath,
    ['scripts/emp1-professional-p0-source-semantics-check.mjs', '--require-ready']],
  ['CAUX_REFERENCE_QUALIFICATION', process.execPath,
    ['scripts/emp1-caux-pp24-31-benchmark-check.mjs', '--require-direct-pdf']],
  ['FROZEN_RELEASE_PROFILE', process.execPath,
    ['scripts/emp1-professional-release-profile-check.mjs']],
  ['PUBLIC_PRODUCT', process.execPath, ['scripts/emp1-public-product-check.mjs']],
  ['CURRENTNESS_FALSIFIERS', process.execPath,
    ['scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs']],
  ['PRODUCTION_BUILD', npmCommand(), ['run', 'build']],
  ['EMP1_CHROMIUM', process.execPath,
    ['scripts/run-playwright.mjs', 'e2e/emp1-workbench-authority.spec.js']],
];
const executions = [readiness];
for (const [gateId, command, args] of gates) executions.push(run(gateId, command, args));

const buildPassed = executions.find((item) => item.gateId === 'PRODUCTION_BUILD')?.status === 'PASS';
const buildArtifactSha256 = buildPassed
  ? await hashDirectory(resolve(root, 'dist'))
  : null;
let fail = executions.find((item) => item.status === 'FAIL');
let notRun = executions.find((item) => item.status === 'NOT_RUN_EXECUTION_ENVIRONMENT');

if (options.release && !fail && !notRun) {
  if (!options.deploymentReceipt) {
    const receipt = createReceipt({
      candidateHead,
      candidateTree,
      candidateParent,
      worktreeStatus,
      mode: 'RELEASE',
      executions,
      buildArtifactSha256,
      status: 'BLOCKED_DEPLOYMENT_EVIDENCE_REQUIRED',
      releaseCandidateQualified: false,
    });
    await maybeWriteReceipt(receipt, options.writeReceipt);
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(2);
  }
  if (!/^[0-9a-f]{64}$/u.test(buildArtifactSha256 ?? '')) {
    throw releaseError('EMP1_RELEASE_CANDIDATE_BUILD_ARTIFACT_HASH_REQUIRED');
  }
  executions.push(runNode('DEPLOYMENT_EVIDENCE', [
    'scripts/emp1-professional-deployment-receipt-check.mjs',
    '--receipt', options.deploymentReceipt,
    '--expected-head', candidateHead,
    '--expected-tree', candidateTree,
    '--expected-artifact-sha256', buildArtifactSha256,
  ]));
  fail = executions.find((item) => item.status === 'FAIL');
  notRun = executions.find((item) => item.status === 'NOT_RUN_EXECUTION_ENVIRONMENT');
}

const allExecutedPass = executions.every((item) => item.status === 'PASS');
const releaseCandidateQualified = options.release
  && Boolean(options.deploymentReceipt)
  && allExecutedPass;
const status = releaseCandidateQualified
  ? 'PASS_EMP1_PROFESSIONAL_RELEASE_CANDIDATE_AND_DEPLOYMENT_EVIDENCE'
  : notRun
    ? 'NOT_RUN_EMP1_PROFESSIONAL_RELEASE_CANDIDATE_EXECUTION_ENVIRONMENT'
    : fail
      ? 'FAIL_EMP1_PROFESSIONAL_RELEASE_CANDIDATE_EXECUTION'
      : 'PASS_DIAGNOSTIC_EXECUTION_RELEASE_NOT_REQUESTED';
const receipt = createReceipt({
  candidateHead,
  candidateTree,
  candidateParent,
  worktreeStatus,
  mode: options.release ? 'RELEASE' : 'DIAGNOSTIC',
  executions,
  buildArtifactSha256,
  status,
  releaseCandidateQualified,
});
await maybeWriteReceipt(receipt, options.writeReceipt);
console.log(JSON.stringify(receipt, null, 2));
if (notRun) process.exit(3);
if (fail) process.exit(1);
if (options.release && !releaseCandidateQualified) process.exit(2);

function createReceipt(input) {
  const payload = {
    schema: 'emp1-professional-release-candidate-receipt/v1',
    candidate: {
      headSha: input.candidateHead,
      treeSha: input.candidateTree,
      parentSha: input.candidateParent,
      cleanWorktree: input.worktreeStatus === '',
      buildArtifactSha256: input.buildArtifactSha256,
    },
    mode: input.mode,
    executions: input.executions,
    releaseCandidateQualified: input.releaseCandidateQualified,
    authorityBoundary: {
      thisHarnessMutatesEngineeringAuthority: false,
      codeComplianceAuthorizedByThisHarness: false,
      deploymentAuthorityGrantedByThisHarness: false,
      broaderApplicationSecurityCertificationClaimed: false,
    },
  };
  return {
    ...payload,
    receiptSemanticHash: sha256Canonical(payload),
    status: input.status,
  };
}

function runNode(gateId, args) {
  return run(gateId, process.execPath, args);
}
function run(gateId, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 32 * 1024 * 1024,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const notRun = Boolean(result.error)
    || result.status == null
    || result.error?.code === 'ENOENT';
  return Object.freeze({
    gateId,
    command: [command, ...args].join(' '),
    status: notRun ? 'NOT_RUN_EXECUTION_ENVIRONMENT' : result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal ?? null,
    errorCode: result.error?.code ?? null,
    stdoutSha256: sha256Text(stdout),
    stderrSha256: sha256Text(stderr),
    stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(stderr, 'utf8'),
  });
}
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw releaseError(`EMP1_RELEASE_CANDIDATE_GIT_REQUIRED:${args.join('_')}`);
  }
  return String(result.stdout ?? '').trim();
}
async function hashDirectory(directory) {
  const rows = [];
  await walk(directory);
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return sha256Text(rows.map((row) => `${row.path}\0${row.sha256}`).join('\n'));

  async function walk(path) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw releaseError('EMP1_RELEASE_BUILD_ARTIFACT_SYMLINK_PROHIBITED');
    if (stat.isFile()) {
      rows.push({
        path: relative(directory, path).replaceAll('\\', '/'),
        sha256: createHash('sha256').update(await readFile(path)).digest('hex'),
      });
      return;
    }
    if (!stat.isDirectory()) return;
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      await walk(join(path, entry.name));
    }
  }
}
function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}
async function maybeWriteReceipt(receipt, path) {
  if (!path) return;
  const resolved = resolve(root, path);
  const allowedRoot = resolve(root, 'validation/emp1/release');
  if (resolved !== allowedRoot && !resolved.startsWith(`${allowedRoot}/`)) {
    throw releaseError('EMP1_RELEASE_CANDIDATE_RECEIPT_PATH_OUTSIDE_RELEASE_VALIDATION');
  }
  await writeFile(resolved, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
function parseArgs(args) {
  const out = {
    release: false,
    executeDiagnostics: false,
    expectedHead: null,
    writeReceipt: null,
    deploymentReceipt: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--release') out.release = true;
    else if (args[index] === '--execute-diagnostics') out.executeDiagnostics = true;
    else if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else if (args[index] === '--deployment-receipt') out.deploymentReceipt = args[++index] ?? null;
    else throw releaseError(`EMP1_RELEASE_CANDIDATE_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  if (out.release && out.executeDiagnostics) {
    throw releaseError('EMP1_RELEASE_CANDIDATE_RELEASE_AND_DIAGNOSTIC_ARE_MUTUALLY_EXCLUSIVE');
  }
  if (out.deploymentReceipt && !out.release) {
    throw releaseError('EMP1_RELEASE_CANDIDATE_DEPLOYMENT_RECEIPT_REQUIRES_RELEASE_MODE');
  }
  if (out.expectedHead && !/^[0-9a-f]{40}$/u.test(out.expectedHead)) {
    throw releaseError('EMP1_RELEASE_CANDIDATE_EXPECTED_HEAD_INVALID');
  }
  return out;
}
function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function sha256Canonical(value) {
  return sha256Text(JSON.stringify(sortValue(value)));
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
function releaseError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
