#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw falsifierError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_EXPECTED_HEAD_REQUIRED');
}
if (!options.evidenceDir || !options.proposalPath) {
  throw falsifierError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_PATHS_REQUIRED');
}

const baseline = runCheck(resolve(root, options.proposalPath));
assert.equal(baseline.status, 0,
  `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_BASELINE_FAILED\nSTDOUT:\n${baseline.stdout}\nSTDERR:\n${baseline.stderr}`);
const sourceProposal = JSON.parse(await readFile(resolve(root, options.proposalPath), 'utf8'));

const tempRoot = await mkdtemp(join(tmpdir(), 'emp1-gamma5-bounded-authorization-proposal-falsifiers-'));
const detections = [];
try {
  const mutations = [
    {
      name: 'proposal-semantic-hash-corruption',
      recompute: false,
      mutate(value) { value.proposalSemanticHash = '0'.repeat(64); },
    },
    {
      name: 'candidate-qualification-substitution-with-rehash',
      mutate(value) { value.qualifiedSuccessor.candidateQualificationSha256 = 'f'.repeat(64); },
    },
    {
      name: 'historical-oracle-retained-with-rehash',
      mutate(value) {
        value.qualifiedSuccessor.postAuthorityOracleSemanticHash =
          '5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa';
      },
    },
    {
      name: 'global-emp1-c-authority-escalation-with-rehash',
      mutate(value) {
        value.proposedBoundedAuthorization.globalEmp1CRouteAuthority = true;
        value.authorityBoundary.globalEmp1CRouteAuthority = true;
      },
    },
    {
      name: 'release-authority-escalation-with-rehash',
      mutate(value) {
        value.proposedBoundedAuthorization.releaseQualified = true;
        value.authorityBoundary.releaseQualified = true;
      },
    },
    {
      name: 'global-qualification-file-injected-into-allowlist-with-rehash',
      mutate(value) {
        value.futureChangeFileAllowlist.push('src/core/emp1/emp1-c-qualification-state.js');
      },
    },
    {
      name: 'post-authority-oracle-mutation-removed-with-rehash',
      mutate(value) {
        value.exactAllowedFutureMutations = value.exactAllowedFutureMutations.filter((item) =>
          item.field !== 'FULL_TABLE5_ORACLE_HASH');
      },
    },
    {
      name: 'post-promotion-exact-head-gate-disabled-with-rehash',
      mutate(value) {
        value.postPromotionGate.exactHeadRequalificationRequired = false;
        value.postPromotionGate.promotionMayNotBeDeclaredCompleteFromThisProposal = false;
      },
    },
    {
      name: 'route-source-preimage-hash-substitution-with-rehash',
      mutate(value) { value.currentProductionPreimage.routeSource.sha256 = 'a'.repeat(64); },
    },
    {
      name: 'nonzero-dp-scope-expansion-with-rehash',
      mutate(value) {
        value.proposedBoundedAuthorization.differentialPressure = 1;
        value.authorityBoundary.nonzeroDifferentialPressureAllowed = true;
      },
    },
  ];

  for (let index = 0; index < mutations.length; index += 1) {
    const mutation = mutations[index];
    const proposal = structuredClone(sourceProposal);
    mutation.mutate(proposal);
    if (mutation.recompute !== false) proposal.proposalSemanticHash = proposalHash(proposal);
    const path = join(tempRoot, `${String(index + 1).padStart(2, '0')}-${mutation.name}.json`);
    await writeFile(path, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
    const result = runCheck(path);
    assert.notEqual(result.status, 0,
      `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_NOT_DETECTED:${mutation.name}`);
    detections.push({ name: mutation.name, detected: true });
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

assert.equal(detections.length, 10);
assert.ok(detections.every((item) => item.detected === true));
const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-bounded-authorization-proposal-falsifiers/v1',
  observedSuspendedHeadSha: options.expectedHead,
  baselineProposalIntegrityRequiredAndPassed: true,
  proposalSemanticHash: sourceProposal.proposalSemanticHash,
  mutationCount: detections.length,
  detections,
  authorization: {
    productionRouteAuthorizedByFalsifiers: false,
    authorizationChangeAppliedByFalsifiers: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const receipt = {
  ...receiptPayload,
  falsifierSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_BOUNDED_AUTHORIZATION_PROPOSAL_ANTI_FORGERY_FALSIFIERS_NOT_AUTHORIZED',
};
if (options.writeReceipt) {
  const expected = join(resolve(root, options.evidenceDir), '10-bounded-authorization-proposal-falsifier-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expected,
    'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_RECEIPT_MUST_BE_10_IN_EVIDENCE_DIRECTORY');
  await writeFile(expected, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(receipt, null, 2));

function runCheck(proposalPath) {
  return spawnSync(process.execPath, [
    'scripts/emp1-wrc-gamma5-bounded-authorization-proposal-check.mjs',
    '--expected-head', options.expectedHead,
    '--evidence-dir', options.evidenceDir,
    '--proposal', proposalPath,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'false' },
  });
}
function proposalHash(value) {
  const { proposalSemanticHash: _hash, status: _status, ...payload } = value;
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
  const out = { expectedHead: null, evidenceDir: null, proposalPath: null, writeReceipt: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--evidence-dir') out.evidenceDir = args[++index] ?? null;
    else if (args[index] === '--proposal') out.proposalPath = args[++index] ?? null;
    else if (args[index] === '--write-receipt') out.writeReceipt = args[++index] ?? null;
    else throw falsifierError(`EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_FALSIFIER_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function falsifierError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
