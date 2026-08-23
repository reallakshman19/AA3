#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw reviewError('EMP1_REQUALIFICATION_REVIEW_EXPLICIT_EXPECTED_HEAD_REQUIRED');
}
if (!options.evidenceDir) throw reviewError('EMP1_REQUALIFICATION_REVIEW_EVIDENCE_DIR_REQUIRED');

const actualHead = git(['rev-parse', 'HEAD']);
assert.equal(actualHead, options.expectedHead,
  `EMP1_REQUALIFICATION_REVIEW_HEAD_MISMATCH:${actualHead}:${options.expectedHead}`);

const evidenceDir = resolve(root, options.evidenceDir);
const paths = Object.freeze({
  observation: join(evidenceDir, '01-observation.json'),
  replay: join(evidenceDir, '02-replay-receipt.json'),
  falsifiers: join(evidenceDir, '03-falsifier-receipt.json'),
  manifest: join(evidenceDir, '04-evidence-manifest.json'),
  localReceipt: join(evidenceDir, '05-local-execution-receipt.json'),
});
const stored = await readBundle(paths);
verifyStoredBundle(stored);
const producerPaths = producerEvidencePaths(stored.localReceipt.json);
assert.equal(stored.manifest.json.evidenceFiles[0].path, producerPaths.observation);
assert.equal(stored.manifest.json.evidenceFiles[1].path, producerPaths.replay);
assert.equal(stored.manifest.json.evidenceFiles[2].path, producerPaths.falsifiers);

const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-gamma5-independent-review-'));
const replayedSteps = [];
try {
  const temp = Object.freeze({
    observation: join(tempRoot, '01-observation.json'),
    replay: join(tempRoot, '02-replay-receipt.json'),
    falsifiers: join(tempRoot, '03-falsifier-receipt.json'),
    manifest: join(tempRoot, '04-evidence-manifest.json'),
  });

  runAndMatch('exact-head-observation',
    'scripts/emp1-wrc-gamma5-exact-head-requalification.mjs', [
      '--expected-head', options.expectedHead,
      '--write-record', temp.observation,
    ], new Map([[temp.observation, producerPaths.observation]]));
  await assertFileBytesEqual(temp.observation, paths.observation,
    'EMP1_REQUALIFICATION_REVIEW_OBSERVATION_BYTE_DRIFT');

  runAndMatch('observation-full-matrix-verifier',
    'scripts/emp1-wrc-gamma5-requalification-observation-check.mjs', [
      '--record', temp.observation,
      '--expected-observed-head', options.expectedHead,
    ], new Map([[temp.observation, producerPaths.observation]]));

  const fullGamma5Suite = [
    ['independent-oracle-import-firewall', 'scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs'],
    ['independent-oracle-decoupling', 'scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs'],
    ['independent-oracle-falsifiers', 'scripts/emp1-wrc537-independent-oracle-falsifiers.mjs'],
    ['post-authority-oracle-falsifiers', 'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs'],
    ['full-table5-independent-handcalc', 'scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs'],
    ['r0-outside-radius-custody', 'scripts/emp1-wrc537-r0-outside-radius-custody-check.mjs'],
    ['r0-source-authority', 'scripts/emp1-wrc537-r0-source-authority-check.mjs'],
    ['r0-unit-coherence', 'scripts/emp1-wrc537-r0-unit-coherence-check.mjs'],
    ['candidate-qualification-binding', 'scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs'],
    ['workbench-product-qualification', 'scripts/emp1-workbench-product-run-qualification.mjs'],
    ['cylindrical-applicability', 'scripts/emp1-wrc537-cylindrical-applicability-check.mjs'],
    ['eight-point-extrema-scope', 'scripts/emp1-wrc537-eight-point-extrema-scope-check.mjs'],
    ['unity-stress-concentration-authority', 'scripts/emp1-wrc537-stress-concentration-authority-check.mjs'],
    ['longitudinal-moment-curve-selection', 'scripts/emp1-wrc537-longitudinal-moment-curve-selection-check.mjs'],
    ['zero-dp-load-producer', 'scripts/emp1-a-zero-dp-wrc-load-producer-qualification.mjs'],
    ['cylindrical-axis-authority', 'scripts/emp1-wrc537-cylindrical-axis-authority-check.mjs'],
    ['gamma5-suspended-production-candidate', 'scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs'],
    ['public-product-truth', 'scripts/emp1-public-product-check.mjs'],
  ];
  for (const [name, script] of fullGamma5Suite) runAndMatch(name, script);

  runAndMatch('subordinate-evidence-replay',
    'scripts/emp1-wrc-gamma5-requalification-observation-replay-check.mjs', [
      '--record', temp.observation,
      '--expected-observed-head', options.expectedHead,
      '--write-receipt', temp.replay,
    ], new Map([
      [temp.observation, producerPaths.observation],
      [temp.replay, producerPaths.replay],
    ]));
  await assertFileBytesEqual(temp.replay, paths.replay,
    'EMP1_REQUALIFICATION_REVIEW_REPLAY_RECEIPT_BYTE_DRIFT');

  runAndMatch('anti-forgery-falsifiers',
    'scripts/emp1-wrc-gamma5-requalification-observation-falsifiers.mjs', [
      '--record', temp.observation,
      '--expected-observed-head', options.expectedHead,
      '--write-receipt', temp.falsifiers,
    ], new Map([
      [temp.observation, producerPaths.observation],
      [temp.falsifiers, producerPaths.falsifiers],
    ]));
  await assertFileBytesEqual(temp.falsifiers, paths.falsifiers,
    'EMP1_REQUALIFICATION_REVIEW_FALSIFIER_RECEIPT_BYTE_DRIFT');

  runAndMatch('exact-head-evidence-manifest',
    'scripts/emp1-wrc-gamma5-requalification-evidence-manifest.mjs', [
      '--expected-head', options.expectedHead,
      '--observation', producerPaths.observation,
      '--replay-receipt', producerPaths.replay,
      '--falsifier-receipt', producerPaths.falsifiers,
      '--write-manifest', temp.manifest,
    ], new Map([[temp.manifest, producerPaths.manifest]]));
  await assertFileBytesEqual(temp.manifest, paths.manifest,
    'EMP1_REQUALIFICATION_REVIEW_MANIFEST_BYTE_DRIFT');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

assert.equal(replayedSteps.length, 23,
  'EMP1_REQUALIFICATION_REVIEW_EXPECTED_23_REPLAYED_STEPS');

const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-independent-review-gate/v1',
  observedHeadSha: options.expectedHead,
  observedTreeSha: git(['rev-parse', 'HEAD^{tree}']),
  observedParentShas: git(['show', '-s', '--format=%P', 'HEAD']).split(/\s+/u).filter(Boolean),
  evidenceDirectoryName: basename(evidenceDir),
  localSuiteSemanticHash: stored.localReceipt.json.localSuiteSemanticHash,
  evidenceBundleSemanticHash: stored.manifest.json.evidenceBundleSemanticHash,
  observationSemanticHash: stored.observation.json.observationSemanticHash,
  candidateQualificationSha256: stored.observation.json.candidateQualificationSha256,
  oracleSemanticHash: stored.observation.json.oracleSemanticHash,
  sourceDocumentSha256: stored.observation.json.sourceDocumentSha256,
  datasetHash: stored.observation.json.datasetHash,
  loadProducerQualificationSha256: stored.observation.json.loadProducerQualificationSha256,
  independentReplay: {
    exactStoredBundleVerified: true,
    all23ProducerStepsReexecuted: true,
    all23StdoutAndStderrHashesMatched: true,
    observationByteIdentical: true,
    replayReceiptByteIdentical: true,
    falsifierReceiptByteIdentical: true,
    manifestByteIdentical: true,
  },
  qualificationSummary: structuredClone(stored.manifest.json.qualificationSummary),
  authorizationReview: {
    evidenceEligibleForSeparateAuthorizationReview: true,
    productionRouteAuthorizedByThisReview: false,
    authorizationChangeAppliedByThisReview: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const reviewReceipt = {
  ...receiptPayload,
  reviewSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_INDEPENDENT_EXACT_HEAD_EVIDENCE_REPLAY_READY_FOR_SEPARATE_AUTHORIZATION_REVIEW_ROUTE_STILL_SUSPENDED',
};
if (options.writeReceipt) {
  const expectedReceiptPath = join(evidenceDir, '06-independent-review-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expectedReceiptPath,
    'EMP1_REQUALIFICATION_REVIEW_RECEIPT_MUST_BE_06_IN_EVIDENCE_DIRECTORY');
  await writeFile(expectedReceiptPath, `${JSON.stringify(reviewReceipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(reviewReceipt, null, 2));

function runAndMatch(name, script, args = [], replacements = new Map()) {
  const expected = stored.localReceipt.json.executedSteps.find((step) => step.name === name);
  assert.ok(expected, `EMP1_REQUALIFICATION_REVIEW_STORED_STEP_REQUIRED:${name}`);
  assert.equal(expected.script, script,
    `EMP1_REQUALIFICATION_REVIEW_STORED_SCRIPT_DRIFT:${name}`);
  const normalizedArgs = args.map((arg) => replacements.get(arg) ?? arg);
  assert.deepEqual(expected.args, normalizedArgs,
    `EMP1_REQUALIFICATION_REVIEW_STORED_ARGS_DRIFT:${name}`);
  assert.equal(expected.exitStatus, 0,
    `EMP1_REQUALIFICATION_REVIEW_STORED_EXIT_STATUS_NOT_ZERO:${name}`);
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
  assert.equal(completed.status, 0,
    `EMP1_REQUALIFICATION_REVIEW_REPLAY_STEP_FAILED:${name}:${script}\nSTDOUT:\n${completed.stdout ?? ''}\nSTDERR:\n${completed.stderr ?? ''}`);
  const stdoutSha256 = sha256(completed.stdout ?? '');
  const stderrSha256 = sha256(completed.stderr ?? '');
  assert.equal(stdoutSha256, expected.stdoutSha256,
    `EMP1_REQUALIFICATION_REVIEW_STDOUT_HASH_DRIFT:${name}`);
  assert.equal(stderrSha256, expected.stderrSha256,
    `EMP1_REQUALIFICATION_REVIEW_STDERR_HASH_DRIFT:${name}`);
  replayedSteps.push({ name, script, stdoutSha256, stderrSha256 });
}

async function readBundle(bundlePaths) {
  const entries = await Promise.all(Object.entries(bundlePaths).map(async ([key, path]) => {
    const buffer = await readFile(path);
    return [key, { path, buffer, json: JSON.parse(buffer.toString('utf8')), sha256: sha256Buffer(buffer) }];
  }));
  return Object.fromEntries(entries);
}

function verifyStoredBundle(bundle) {
  const localReceipt = bundle.localReceipt.json;
  const manifest = bundle.manifest.json;
  const observation = bundle.observation.json;
  assert.equal(localReceipt.schema, 'emp1-wrc537-gamma5-local-requalification-suite/v1');
  assert.equal(localReceipt.status,
    'PASS_LOCAL_EXACT_HEAD_REQUALIFICATION_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED');
  assert.equal(localReceipt.observedHeadSha, options.expectedHead);
  assert.equal(localReceipt.observedTreeSha, git(['rev-parse', 'HEAD^{tree}']));
  assert.deepEqual(localReceipt.observedParentShas,
    git(['show', '-s', '--format=%P', 'HEAD']).split(/\s+/u).filter(Boolean));
  assert.equal(localReceipt.executedSteps.length, 23);
  assert.equal(new Set(localReceipt.executedSteps.map((step) => step.name)).size, 23);
  assert.equal(localReceipt.checkoutCleanBeforeExecution, true);
  assert.equal(localReceipt.sourceMutationOutsideEvidenceDirectoryDetected, false);
  assert.equal(localReceipt.workflowIndependentExecution, true);
  assert.equal(localReceipt.authorization.productionRouteAuthorized, false);
  assert.equal(localReceipt.authorization.authorizationChangeAppliedByLocalSuite, false);
  assert.equal(localReceipt.authorization.globalEmp1CRouteAuthority, false);
  assert.equal(localReceipt.authorization.codeComplianceAuthorized, false);
  assert.equal(localReceipt.authorization.releaseQualified, false);
  assert.equal(localReceipt.localSuiteSemanticHash, semanticHashLocalReceipt(localReceipt));

  assert.equal(manifest.schema, 'emp1-wrc537-gamma5-requalification-evidence-manifest/v1');
  assert.equal(manifest.status,
    'PASS_EXACT_HEAD_EVIDENCE_BUNDLE_READY_FOR_ENGINEERING_REVIEW_ROUTE_STILL_SUSPENDED');
  assert.equal(manifest.observedHeadSha, options.expectedHead);
  assert.equal(manifest.observedTreeSha, localReceipt.observedTreeSha);
  assert.deepEqual(manifest.observedParentShas, localReceipt.observedParentShas);
  assert.equal(manifest.executionContext.githubActions, false,
    'EMP1_REQUALIFICATION_REVIEW_LOCAL_MANIFEST_MUST_BE_NON_ACTIONS');
  for (const key of ['githubEventName', 'githubRef', 'githubBaseRef', 'githubHeadRef', 'githubRunId', 'githubRunAttempt']) {
    assert.equal(manifest.executionContext[key], null,
      `EMP1_REQUALIFICATION_REVIEW_LOCAL_MANIFEST_GITHUB_CONTEXT_MUST_BE_NULL:${key}`);
  }
  assert.equal(manifest.evidenceBundleSemanticHash, semanticHashManifest(manifest));
  assert.equal(manifest.authorization.productionRouteAuthorized, false);
  assert.equal(manifest.authorization.authorizationChangeAppliedByEvidenceBundle, false);
  assert.equal(manifest.authorization.globalEmp1CRouteAuthority, false);
  assert.equal(manifest.authorization.codeComplianceAuthorized, false);
  assert.equal(manifest.authorization.releaseQualified, false);
  assert.equal(manifest.qualificationSummary.physicalWrcLoadsPassed, 6);
  assert.equal(manifest.qualificationSummary.stressComparisonsPassed, 32);
  assert.equal(manifest.qualificationSummary.antiForgeryFalsifiersPassed, 10);
  assert.ok(manifest.qualificationSummary.maxToleranceRatio >= 0
    && manifest.qualificationSummary.maxToleranceRatio <= 1);

  assert.equal(observation.observedHeadSha, options.expectedHead);
  assert.equal(observation.authorization.productionRouteAuthorizedBeforeObservation, false);
  assert.equal(observation.authorization.authorizationChangeAppliedByThisObservation, false);
  assert.equal(observation.authorization.globalEmp1CRouteAuthority, false);
  assert.equal(observation.authorization.codeComplianceAuthorized, false);
  assert.equal(observation.authorization.releaseQualified, false);

  const descriptors = [
    ['observation', bundle.observation],
    ['replayReceipt', bundle.replay],
    ['falsifierReceipt', bundle.falsifiers],
    ['evidenceManifest', bundle.manifest],
  ];
  for (const [key, file] of descriptors) {
    const descriptor = localReceipt.evidence[key];
    assert.ok(descriptor, `EMP1_REQUALIFICATION_REVIEW_LOCAL_DESCRIPTOR_REQUIRED:${key}`);
    assert.equal(descriptor.sha256, file.sha256,
      `EMP1_REQUALIFICATION_REVIEW_LOCAL_DESCRIPTOR_HASH_DRIFT:${key}`);
    assert.equal(descriptor.bytes, file.buffer.byteLength,
      `EMP1_REQUALIFICATION_REVIEW_LOCAL_DESCRIPTOR_SIZE_DRIFT:${key}`);
  }
  assert.equal(localReceipt.evidence.evidenceBundleSemanticHash, manifest.evidenceBundleSemanticHash);
  assert.deepEqual(localReceipt.qualificationSummary, manifest.qualificationSummary);
}

function producerEvidencePaths(localReceipt) {
  const find = (name) => {
    const step = localReceipt.executedSteps.find((value) => value.name === name);
    assert.ok(step, `EMP1_REQUALIFICATION_REVIEW_PRODUCER_STEP_REQUIRED:${name}`);
    return step;
  };
  return {
    observation: find('exact-head-observation').args[3],
    replay: find('subordinate-evidence-replay').args[5],
    falsifiers: find('anti-forgery-falsifiers').args[5],
    manifest: find('exact-head-evidence-manifest').args[9],
  };
}

async function assertFileBytesEqual(actualPath, expectedPath, code) {
  const [actual, expected] = await Promise.all([readFile(actualPath), readFile(expectedPath)]);
  assert.equal(actual.equals(expected), true, code);
}
function semanticHashLocalReceipt(receipt) {
  const { localSuiteSemanticHash: _hash, status: _status, ...payload } = receipt;
  return sha256Canonical(payload);
}
function semanticHashManifest(manifest) {
  const { evidenceBundleSemanticHash: _hash, status: _status, ...payload } = manifest;
  return sha256Canonical(payload);
}
function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
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
function parseArgs(args) {
  const out = { expectedHead: null, evidenceDir: null, writeReceipt: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--evidence-dir') out.evidenceDir = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else throw reviewError(`EMP1_REQUALIFICATION_REVIEW_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function reviewError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
