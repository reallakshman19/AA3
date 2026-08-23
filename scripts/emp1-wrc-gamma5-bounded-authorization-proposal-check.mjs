#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
if (!/^[0-9a-f]{40}$/u.test(options.expectedHead ?? '')) {
  throw checkError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_EXPECTED_HEAD_REQUIRED');
}
if (!options.evidenceDir || !options.proposalPath) {
  throw checkError('EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_PATHS_REQUIRED');
}

const proposal = JSON.parse(await readFile(resolve(root, options.proposalPath), 'utf8'));
assert.equal(proposal.schema, 'emp1-wrc537-gamma5-bounded-authorization-proposal/v1');
assert.equal(proposal.status, 'READY_TO_DRAFT_SEPARATE_BOUNDED_AUTHORIZATION_CHANGE_NOT_AUTHORIZED');
assert.equal(proposal.proposalIsAuthorization, false);
assert.equal(proposal.observedSuspendedHeadSha, options.expectedHead);
assert.equal(proposal.proposalSemanticHash, semanticHash(proposal));
assert.equal(proposal.proposedBoundedAuthorization.productionRouteAuthorized, true);
assert.equal(proposal.proposedBoundedAuthorization.boundedEngineeringUseAuthorized, true);
assert.equal(proposal.proposedBoundedAuthorization.globalEmp1CRouteAuthority, false);
assert.equal(proposal.proposedBoundedAuthorization.codeComplianceAuthorized, false);
assert.equal(proposal.proposedBoundedAuthorization.releaseQualified, false);
assert.equal(proposal.authorityBoundary.globalEmp1CRouteAuthority, false);
assert.equal(proposal.authorityBoundary.codeComplianceAuthorized, false);
assert.equal(proposal.authorityBoundary.releaseQualified, false);
assert.equal(proposal.postPromotionGate.exactHeadRequalificationRequired, true);
assert.equal(proposal.postPromotionGate.promotionMayNotBeDeclaredCompleteFromThisProposal, true);
assert.deepEqual(proposal.futureChangeFileAllowlist, [
  'src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js',
  'src/core/emp1/emp1-c-bounded-route-registry.js',
  'validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json',
]);
assert.deepEqual(proposal.forbiddenGlobalAuthorityFiles, [
  'src/core/emp1/emp1-c-qualification-evidence.generated.js',
  'src/core/emp1/emp1-c-qualification-state.js',
  'validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json',
]);
assert.equal(proposal.exactAllowedFutureMutations.length, 12,
  'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_EXPECTED_12_MUTATIONS');

const completed = spawnSync(process.execPath, [
  'scripts/emp1-wrc-gamma5-bounded-authorization-proposal.mjs',
  '--expected-head', options.expectedHead,
  '--evidence-dir', options.evidenceDir,
], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, GITHUB_ACTIONS: 'false' },
});
assert.equal(completed.status, 0,
  `EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_REBUILD_FAILED\nSTDOUT:\n${completed.stdout ?? ''}\nSTDERR:\n${completed.stderr ?? ''}`);
const rebuilt = lastJsonObject(completed.stdout ?? '');
assert.deepEqual(rebuilt, proposal,
  'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_REBUILT_PROPOSAL_DRIFT');

const receiptPayload = {
  schema: 'emp1-wrc537-gamma5-bounded-authorization-proposal-check/v1',
  observedSuspendedHeadSha: options.expectedHead,
  proposalSemanticHash: proposal.proposalSemanticHash,
  proposalRebuiltFromCurrentEvidenceAndSource: true,
  exactMutationSetMatched: true,
  mutationCount: proposal.exactAllowedFutureMutations.length,
  targetFileAllowlistMatched: true,
  forbiddenGlobalAuthorityFilesMatched: true,
  postPromotionExactHeadGateRequired: true,
  authorization: {
    productionRouteAuthorizedByThisCheck: false,
    authorizationChangeAppliedByThisCheck: false,
    globalEmp1CRouteAuthority: false,
    codeComplianceAuthorized: false,
    releaseQualified: false,
  },
};
const receipt = {
  ...receiptPayload,
  checkSemanticHash: sha256Canonical(receiptPayload),
  status: 'PASS_BOUNDED_AUTHORIZATION_PROPOSAL_INTEGRITY_NOT_AUTHORIZED',
};
if (options.writeReceipt) {
  const expected = join(resolve(root, options.evidenceDir), '09-bounded-authorization-proposal-check-receipt.json');
  assert.equal(resolve(root, options.writeReceipt), expected,
    'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_RECEIPT_MUST_BE_09_IN_EVIDENCE_DIRECTORY');
  await writeFile(expected, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(receipt, null, 2));

function semanticHash(value) {
  const { proposalSemanticHash: _hash, status: _status, ...payload } = value;
  return sha256Canonical(payload);
}
function lastJsonObject(text) {
  const records = extractJsonObjects(text);
  assert.ok(records.length > 0, 'EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_REBUILD_JSON_REQUIRED');
  return records.at(-1);
}
function extractJsonObjects(text) {
  const records = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') { if (depth === 0) start = index; depth += 1; continue; }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);
        try { records.push(JSON.parse(candidate)); } catch { /* ignore non-JSON */ }
        start = -1;
      }
    }
  }
  return records;
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
    else throw checkError(`EMP1_BOUNDED_AUTHORIZATION_PROPOSAL_CHECK_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  return out;
}
function checkError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
