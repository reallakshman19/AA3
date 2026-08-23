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
const AUTHORIZATION_RECORD_PATH = 'validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json';
const ROUTE_PATH = 'src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
const REGISTRY_PATH = 'src/core/emp1/emp1-c-bounded-route-registry.js';
for (const [value, code] of [
  [options.expectedHead, 'EMP1_POST_PROMOTION_FALSIFIER_EXPECTED_HEAD_REQUIRED'],
  [options.authorizationBase, 'EMP1_POST_PROMOTION_FALSIFIER_AUTHORIZATION_BASE_REQUIRED'],
]) {
  if (!/^[0-9a-f]{40}$/u.test(value ?? '')) throw falsifierError(code);
}
if (!options.evidenceDir) throw falsifierError('EMP1_POST_PROMOTION_FALSIFIER_EVIDENCE_DIR_REQUIRED');

const canonicalRecord = resolve(root, AUTHORIZATION_RECORD_PATH);
const baseline = runGate(resolve(root, options.evidenceDir), canonicalRecord, null, null);
assert.equal(baseline.status, 0,
  `EMP1_POST_PROMOTION_FALSIFIER_BASELINE_FAILED\nSTDOUT:\n${baseline.stdout ?? ''}\nSTDERR:\n${baseline.stderr ?? ''}`);

const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-post-promotion-gate-falsifiers-'));
const detections = [];
try {
  const mutations = [
    {
      name: 'authorization-record-semantic-hash-corruption',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.authorizationRecordSemanticHash = '0'.repeat(64);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-proposal-hash-substitution-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.proposalSemanticHash = 'f'.repeat(64);
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-base-tree-substitution-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.authorizationBaseTreeSha = 'a'.repeat(40);
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-global-authority-escalation-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.authorityBoundary.globalEmp1CRouteAuthority = true;
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-code-compliance-escalation-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.authorityBoundary.codeComplianceAuthorized = true;
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-evidence-hash-substitution-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.suspendedEvidenceFiles[0].sha256 = 'b'.repeat(64);
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-post-promotion-gate-disabled-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.postPromotionQualification.required = false;
        record.postPromotionQualification.completed = true;
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'authorization-record-process-metadata-pattern-broadened-with-rehash',
      async mutate(ctx) {
        const record = await readJson(ctx.recordPath);
        record.processMetadataPolicy.workreportPattern = 'agents/.*';
        record.authorizationRecordSemanticHash = recordHash(record);
        await writeJson(ctx.recordPath, record);
      },
    },
    {
      name: 'proposal-global-authority-escalation-with-rehash',
      async mutate(ctx) {
        const path = join(ctx.evidenceDir, '08-bounded-authorization-proposal.json');
        const proposal = await readJson(path);
        proposal.proposedBoundedAuthorization.globalEmp1CRouteAuthority = true;
        proposal.authorityBoundary.globalEmp1CRouteAuthority = true;
        proposal.proposalSemanticHash = semanticHash(proposal, 'proposalSemanticHash');
        await writeJson(path, proposal);
      },
    },
    {
      name: 'proposal-post-promotion-gate-disabled-with-rehash',
      async mutate(ctx) {
        const path = join(ctx.evidenceDir, '08-bounded-authorization-proposal.json');
        const proposal = await readJson(path);
        proposal.postPromotionGate.exactHeadRequalificationRequired = false;
        proposal.postPromotionGate.promotionMayNotBeDeclaredCompleteFromThisProposal = false;
        proposal.proposalSemanticHash = semanticHash(proposal, 'proposalSemanticHash');
        await writeJson(path, proposal);
      },
    },
    {
      name: 'route-source-extra-logic-injection',
      async mutate(ctx) {
        ctx.routeOverride = join(ctx.dir, 'route-override.js');
        const source = await readFile(resolve(root, ROUTE_PATH), 'utf8');
        await writeFile(ctx.routeOverride, `${source}\nexport const FORGED_EXTRA_AUTHORITY = true;\n`, 'utf8');
      },
    },
    {
      name: 'registry-nonzero-dp-scope-expansion',
      async mutate(ctx) {
        ctx.registryOverride = join(ctx.dir, 'registry-override.js');
        const source = await readFile(resolve(root, REGISTRY_PATH), 'utf8');
        const before = '    differentialPressure: 0,';
        assert.equal(source.split(before).length - 1, 1,
          'EMP1_POST_PROMOTION_FALSIFIER_REGISTRY_DP_PREIMAGE_REQUIRED');
        await writeFile(ctx.registryOverride, source.replace(before, '    differentialPressure: 1,'), 'utf8');
      },
    },
  ];

  for (let index = 0; index < mutations.length; index += 1) {
    const mutation = mutations[index];
    const dir = join(tempRoot, `${String(index + 1).padStart(2, '0')}-${mutation.name}`);
    const evidenceDir = join(dir, 'evidence');
    const recordPath = join(dir, 'authorization-record.json');
    await cp(resolve(root, options.evidenceDir), evidenceDir, { recursive: true });
    await cp(canonicalRecord, recordPath);
    const ctx = { dir, evidenceDir, recordPath, routeOverride: null, registryOverride: null };
    await mutation.mutate(ctx);
    const result = runGate(evidenceDir, recordPath, ctx.routeOverride, ctx.registryOverride);
    assert.notEqual(result.status, 0,
      `EMP1_POST_PROMOTION_FALSIFIER_NOT_DETECTED:${mutation.name}`);
    detections.push({ name: mutation.name, detected: true });
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

assert.equal(detections.length, 12);
assert.ok(detections.every((item) => item.detected === true));
const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-post-promotion-exact-head-gate-falsifiers/v1',
  observedAuthorizationHeadSha: options.expectedHead,
  authorizationBaseHeadSha: options.authorizationBase,
  baselinePostPromotionGateRequiredAndPassed: true,
  mutationCount: detections.length,
  detections,
  authorization: {
    productionRouteAuthorizedOnObservedHead: true,
    authorizationChangeAppliedByFalsifiers: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const receipt = {
  ...receiptPayload,
  falsifierSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_POST_PROMOTION_EXACT_HEAD_GATE_ANTI_FORGERY_FALSIFIERS',
};
if (options.writeReceipt) {
  const expectedPath = join(resolve(root, options.evidenceDir),
    '12-post-promotion-exact-head-falsifier-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expectedPath,
    'EMP1_POST_PROMOTION_FALSIFIER_RECEIPT_MUST_BE_12_IN_EVIDENCE_DIRECTORY');
  await writeJson(expectedPath, receipt);
}
console.log(JSON.stringify(receipt, null, 2));

function runGate(evidenceDir, recordPath, routeOverride, registryOverride) {
  const args = [
    'scripts/emp1-wrc-gamma5-post-promotion-exact-head-gate.mjs',
    '--expected-head', options.expectedHead,
    '--authorization-base', options.authorizationBase,
    '--evidence-dir', evidenceDir,
    '--authorization-record-override', recordPath,
  ];
  if (routeOverride) args.push('--route-source-override', routeOverride);
  if (registryOverride) args.push('--registry-source-override', registryOverride);
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, EMP1_POST_PROMOTION_FALSIFIER_MODE: 'true' },
  });
}
async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function recordHash(record) { return semanticHash(record, 'authorizationRecordSemanticHash'); }
function semanticHash(value, hashField) {
  const { [hashField]: _hash, status: _status, ...payload } = value;
  return sha256Canonical(payload);
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
  const out = { expectedHead: null, authorizationBase: null, evidenceDir: null, writeReceipt: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--authorization-base') out.authorizationBase = args[++index] ?? null;
    else if (args[index] === '--evidence-dir') out.evidenceDir = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else throw falsifierError(`EMP1_POST_PROMOTION_FALSIFIER_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function falsifierError(code) { const error = new TypeError(code); error.code = code; return error; }
