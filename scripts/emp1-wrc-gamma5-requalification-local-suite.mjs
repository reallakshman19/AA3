#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const evidenceRoot = resolve(root, 'validation/emp1/wrc537-2013');
const options = parseArgs(process.argv.slice(2));

if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw suiteError('EMP1_LOCAL_REQUALIFICATION_EXPLICIT_EXPECTED_HEAD_REQUIRED');
}

const actualHead = git(['rev-parse', 'HEAD']);
assert.equal(actualHead, options.expectedHead,
  `EMP1_LOCAL_REQUALIFICATION_HEAD_MISMATCH:${actualHead}:${options.expectedHead}`);

const dirty = git(['status', '--porcelain=v1', '--untracked-files=all']);
assert.equal(dirty, '',
  `EMP1_LOCAL_REQUALIFICATION_DIRTY_CHECKOUT_REJECTED:${dirty.replace(/\n/gu, '|')}`);

const outputDir = resolve(root, options.outputDir);
assertInsideEvidenceRoot(outputDir);
const outputDirRelative = normalizePath(relative(root, outputDir));
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const paths = Object.freeze({
  observation: relative(root, resolve(outputDir, '01-observation.json')),
  replay: relative(root, resolve(outputDir, '02-replay-receipt.json')),
  falsifiers: relative(root, resolve(outputDir, '03-falsifier-receipt.json')),
  manifest: relative(root, resolve(outputDir, '04-evidence-manifest.json')),
  receipt: relative(root, resolve(outputDir, '05-local-execution-receipt.json')),
});

const executed = [];

run('exact-head-observation', 'scripts/emp1-wrc-gamma5-exact-head-requalification.mjs', [
  '--expected-head', options.expectedHead,
  '--write-record', paths.observation,
]);

run('observation-full-matrix-verifier',
  'scripts/emp1-wrc-gamma5-requalification-observation-check.mjs', [
    '--record', paths.observation,
    '--expected-observed-head', options.expectedHead,
  ]);

const fullGamma5Suite = [
  ['independent-oracle-import-firewall',
    'scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs'],
  ['independent-oracle-decoupling',
    'scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs'],
  ['independent-oracle-falsifiers',
    'scripts/emp1-wrc537-independent-oracle-falsifiers.mjs'],
  ['post-authority-oracle-falsifiers',
    'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs'],
  ['full-table5-independent-handcalc',
    'scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs'],
  ['r0-outside-radius-custody',
    'scripts/emp1-wrc537-r0-outside-radius-custody-check.mjs'],
  ['r0-source-authority',
    'scripts/emp1-wrc537-r0-source-authority-check.mjs'],
  ['r0-unit-coherence',
    'scripts/emp1-wrc537-r0-unit-coherence-check.mjs'],
  ['candidate-qualification-binding',
    'scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs'],
  ['workbench-product-qualification',
    'scripts/emp1-workbench-product-run-qualification.mjs'],
  ['cylindrical-applicability',
    'scripts/emp1-wrc537-cylindrical-applicability-check.mjs'],
  ['eight-point-extrema-scope',
    'scripts/emp1-wrc537-eight-point-extrema-scope-check.mjs'],
  ['unity-stress-concentration-authority',
    'scripts/emp1-wrc537-stress-concentration-authority-check.mjs'],
  ['longitudinal-moment-curve-selection',
    'scripts/emp1-wrc537-longitudinal-moment-curve-selection-check.mjs'],
  ['zero-dp-load-producer',
    'scripts/emp1-a-zero-dp-wrc-load-producer-qualification.mjs'],
  ['cylindrical-axis-authority',
    'scripts/emp1-wrc537-cylindrical-axis-authority-check.mjs'],
  ['gamma5-suspended-production-candidate',
    'scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs'],
  ['public-product-truth',
    'scripts/emp1-public-product-check.mjs'],
];

for (const [name, script] of fullGamma5Suite) run(name, script);

run('subordinate-evidence-replay',
  'scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs', [
    '--record', paths.observation,
    '--expected-observed-head', options.expectedHead,
    '--write-receipt', paths.replay,
  ]);

run('anti-forgery-falsifiers',
  'scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs', [
    '--record', paths.observation,
    '--expected-observed-head', options.expectedHead,
    '--write-receipt', paths.falsifiers,
  ]);

run('exact-head-evidence-manifest',
  'scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs', [
    '--expected-head', options.expectedHead,
    '--observation', paths.observation,
    '--replay-receipt', paths.replay,
    '--falsifier-receipt', paths.falsifiers,
    '--write-manifest', paths.manifest,
  ]);

const [observation, replay, falsifiers, manifest] = await Promise.all([
  readJson(paths.observation),
  readJson(paths.replay),
  readJson(paths.falsifiers),
  readJson(paths.manifest),
]);

assert.equal(observation.observedHeadSha, options.expectedHead);
assert.equal(replay.observedHeadSha, options.expectedHead);
assert.equal(falsifiers.observedHeadSha, options.expectedHead);
assert.equal(manifest.observedHeadSha, options.expectedHead);
assert.equal(observation.authorization.authorizationChangeAppliedByThisObservation, false);
assert.equal(replay.authorizationChangeApplied, false);
assert.equal(falsifiers.authorizationChangeApplied, false);
assert.equal(manifest.authorization.authorizationChangeAppliedByEvidenceBundle, false);
assert.equal(manifest.authorization.productionRouteAuthorized, false);
assert.equal(manifest.authorization.globalEmp1CRouteAuthority, false);
assert.equal(manifest.authorization.codeComplianceAuthorized, false);
assert.equal(manifest.authorization.releaseQualified, false);
assert.equal(manifest.qualificationSummary.physicalWrcLoadsPassed, 6);
assert.equal(manifest.qualificationSummary.stressComparisonsPassed, 32);
assert.ok(manifest.qualificationSummary.maxToleranceRatio >= 0
  && manifest.qualificationSummary.maxToleranceRatio <= 1);
assert.equal(manifest.qualificationSummary.antiForgeryFalsifiersPassed, 10);

const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-local-requalification-suite/v1',
  observedHeadSha: options.expectedHead,
  observedTreeSha: git(['rev-parse', 'HEAD^{tree}']),
  observedParentShas: git(['show', '-s', '--format=%P', 'HEAD'])
    .split(/\s+/u).filter(Boolean),
  checkoutCleanBeforeExecution: true,
  sourceMutationOutsideEvidenceDirectoryDetected: false,
  workflowIndependentExecution: true,
  outputDirectory: outputDirRelative,
  executedSteps: executed,
  evidence: {
    observation: await fileDescriptor(paths.observation),
    replayReceipt: await fileDescriptor(paths.replay),
    falsifierReceipt: await fileDescriptor(paths.falsifiers),
    evidenceManifest: await fileDescriptor(paths.manifest),
    evidenceBundleSemanticHash: manifest.evidenceBundleSemanticHash,
  },
  qualificationSummary: structuredClone(manifest.qualificationSummary),
  authorization: {
    productionRouteAuthorized: false,
    authorizationChangeAppliedByLocalSuite: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};

const receipt = {
  ...receiptPayload,
  localSuiteSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED',
};
await writeFile(resolve(root, paths.receipt), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
assertOnlyEvidenceOutputDirty();
console.log(JSON.stringify(receipt, null, 2));

function run(name, script, args = []) {
  const completed = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'false',
      EMP1_EXPECTED_HEAD_SHA: options.expectedHead,
      EMP1_EXACT_HEAD_PARENT_SHA: options.expectedHead,
    },
  });
  if (completed.status !== 0) {
    throw suiteError([
      `EMP1_LOCAL_REQUALIFICATION_STEP_FAILED:${name}:${script}`,
      `STDOUT:\n${completed.stdout ?? ''}`,
      `STDERR:\n${completed.stderr ?? ''}`,
    ].join('\n'));
  }
  const stdout = completed.stdout ?? '';
  const stderr = completed.stderr ?? '';
  executed.push({
    index: executed.length + 1,
    name,
    script,
    args,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    exitStatus: completed.status,
  });
  assertOnlyEvidenceOutputDirty();
  process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

function assertOnlyEvidenceOutputDirty() {
  const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  const lines = status.split(/\n/u).filter(Boolean);
  const allowedPrefix = `${outputDirRelative}/`;
  const unexpected = lines.filter((line) => {
    const path = normalizePath(line.slice(3).replace(/^"|"$/gu, ''));
    return !path.startsWith(allowedPrefix);
  });
  assert.deepEqual(unexpected, [],
    `EMP1_LOCAL_REQUALIFICATION_SOURCE_MUTATION_OUTSIDE_EVIDENCE_DIR:${unexpected.join('|')}`);
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function fileDescriptor(path) {
  const buffer = await readFile(resolve(root, path));
  return {
    path,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.byteLength,
  };
}

function assertInsideEvidenceRoot(path) {
  const prefix = evidenceRoot.endsWith(sep) ? evidenceRoot : `${evidenceRoot}${sep}`;
  assert.ok(path.startsWith(prefix),
    `EMP1_LOCAL_REQUALIFICATION_OUTPUT_OUTSIDE_EVIDENCE_ROOT:${path}`);
}

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function parseArgs(args) {
  const out = {
    expectedHead: null,
    outputDir: 'validation/emp1/wrc537-2013/.emp1-gamma5-local-requalification',
  };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--output-dir') out.outputDir = args[++index] ?? null;
    else throw suiteError(`EMP1_LOCAL_REQUALIFICATION_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  if (!out.outputDir) throw suiteError('EMP1_LOCAL_REQUALIFICATION_OUTPUT_DIR_REQUIRED');
  return out;
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sha256Canonical(value) {
  return createHash('sha256').update(JSON.stringify(sortValue(value)), 'utf8').digest('hex');
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

function suiteError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
