#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw falsifierError('EMP1_REQUALIFICATION_REVIEW_FALSIFIER_EXPECTED_HEAD_REQUIRED');
}
if (!options.evidenceDir) {
  throw falsifierError('EMP1_REQUALIFICATION_REVIEW_FALSIFIER_EVIDENCE_DIR_REQUIRED');
}
const evidenceDir = resolve(root, options.evidenceDir);

const baseline = runReviewGate(evidenceDir);
assert.equal(baseline.status, 0,
  `EMP1_REQUALIFICATION_REVIEW_FALSIFIER_BASELINE_FAILED\nSTDOUT:\n${baseline.stdout}\nSTDERR:\n${baseline.stderr}`);

const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-gamma5-review-falsifiers-'));
const detections = [];
try {
  const mutations = [
    {
      name: 'local-suite-semantic-hash-corruption',
      async mutate(dir) {
        const receipt = await readJson(join(dir, '05-local-execution-receipt.json'));
        receipt.localSuiteSemanticHash = '0'.repeat(64);
        await writeJson(join(dir, '05-local-execution-receipt.json'), receipt);
      },
    },
    {
      name: 'local-suite-authorization-escalation-with-rehash',
      async mutate(dir) {
        const path = join(dir, '05-local-execution-receipt.json');
        const receipt = await readJson(path);
        receipt.authorization.productionRouteAuthorized = true;
        receipt.authorization.authorizationChangeAppliedByLocalSuite = true;
        receipt.localSuiteSemanticHash = localReceiptHash(receipt);
        await writeJson(path, receipt);
      },
    },
    {
      name: 'local-manifest-github-context-pollution-with-coordinated-rehash',
      async mutate(dir) {
        const manifestPath = join(dir, '04-evidence-manifest.json');
        const receiptPath = join(dir, '05-local-execution-receipt.json');
        const manifest = await readJson(manifestPath);
        manifest.executionContext.githubEventName = 'forged-local-context';
        manifest.executionContext.githubRef = 'refs/heads/forged';
        manifest.evidenceBundleSemanticHash = manifestHash(manifest);
        await writeJson(manifestPath, manifest);
        const receipt = await readJson(receiptPath);
        const manifestBuffer = await readFile(manifestPath);
        receipt.evidence.evidenceManifest.sha256 = sha256Buffer(manifestBuffer);
        receipt.evidence.evidenceManifest.bytes = manifestBuffer.byteLength;
        receipt.evidence.evidenceBundleSemanticHash = manifest.evidenceBundleSemanticHash;
        receipt.localSuiteSemanticHash = localReceiptHash(receipt);
        await writeJson(receiptPath, receipt);
      },
    },
    {
      name: 'producer-step-stdout-hash-substitution-with-local-rehash',
      async mutate(dir) {
        const path = join(dir, '05-local-execution-receipt.json');
        const receipt = await readJson(path);
        const step = receipt.executedSteps.find((value) => value.name === 'public-product-truth');
        assert.ok(step);
        step.stdoutSha256 = 'f'.repeat(64);
        receipt.localSuiteSemanticHash = localReceiptHash(receipt);
        await writeJson(path, receipt);
      },
    },
    {
      name: 'manifest-qualification-count-downgrade-with-coordinated-rehash',
      async mutate(dir) {
        const manifestPath = join(dir, '04-evidence-manifest.json');
        const receiptPath = join(dir, '05-local-execution-receipt.json');
        const manifest = await readJson(manifestPath);
        manifest.qualificationSummary.stressComparisonsPassed = 31;
        manifest.evidenceBundleSemanticHash = manifestHash(manifest);
        await writeJson(manifestPath, manifest);
        const receipt = await readJson(receiptPath);
        const manifestBuffer = await readFile(manifestPath);
        receipt.evidence.evidenceManifest.sha256 = sha256Buffer(manifestBuffer);
        receipt.evidence.evidenceManifest.bytes = manifestBuffer.byteLength;
        receipt.evidence.evidenceBundleSemanticHash = manifest.evidenceBundleSemanticHash;
        receipt.qualificationSummary.stressComparisonsPassed = 31;
        receipt.localSuiteSemanticHash = localReceiptHash(receipt);
        await writeJson(receiptPath, receipt);
      },
    },
    {
      name: 'stored-observation-authorization-escalation',
      async mutate(dir) {
        const path = join(dir, '01-observation.json');
        const observation = await readJson(path);
        observation.authorization.globalEmp1CRouteAuthority = true;
        observation.authorization.authorizationChangeAppliedByThisObservation = true;
        await writeJson(path, observation);
      },
    },
  ];

  for (let index = 0; index < mutations.length; index += 1) {
    const mutation = mutations[index];
    const dir = join(tempRoot, `${String(index + 1).padStart(2, '0')}-${mutation.name}`);
    await cp(evidenceDir, dir, { recursive: true });
    await mutation.mutate(dir);
    const result = runReviewGate(dir);
    assert.notEqual(result.status, 0,
      `EMP1_REQUALIFICATION_REVIEW_FALSIFIER_NOT_DETECTED:${mutation.name}`);
    detections.push({ name: mutation.name, detected: true });
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

assert.equal(detections.length, 6);
assert.ok(detections.every((value) => value.detected));
const receipt = {
  schema: 'emp1-wrc537-gamma5-independent-review-gate-falsifiers/v1',
  status: 'PASS_INDEPENDENT_REVIEW_GATE_ANTI_FORGERY_FALSIFIERS',
  observedHeadSha: options.expectedHead,
  baselineIndependentReviewRequiredAndPassed: true,
  mutationCount: detections.length,
  detections,
  authorization: {
    productionRouteAuthorized: false,
    authorizationChangeAppliedByFalsifiers: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
if (options.writeReceipt) {
  const expectedPath = join(evidenceDir, '07-independent-review-falsifier-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expectedPath,
    'EMP1_REQUALIFICATION_REVIEW_FALSIFIER_RECEIPT_MUST_BE_07_IN_EVIDENCE_DIRECTORY');
  await writeJson(expectedPath, receipt);
}
console.log(JSON.stringify(receipt, null, 2));

function runReviewGate(dir) {
  return spawnSync(process.execPath, [
    'scripts/emp1-wrc-gamma5-requalification-review-gate.mjs',
    '--expected-head', options.expectedHead,
    '--evidence-dir', dir,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'false' },
  });
}
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function localReceiptHash(receipt) {
  const { localSuiteSemanticHash: _hash, status: _status, ...payload } = receipt;
  return sha256Canonical(payload);
}
function manifestHash(manifest) {
  const { evidenceBundleSemanticHash: _hash, status: _status, ...payload } = manifest;
  return sha256Canonical(payload);
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
    else throw falsifierError(`EMP1_REQUALIFICATION_REVIEW_FALSIFIER_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function falsifierError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
