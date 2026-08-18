#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA4_PARENT_NORMAL_ACTIVATION_AUTHORITY,
  LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_SCHEMA,
  LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS,
  LAFEA4_PARENT_NORMAL_BLOCKED_STATUS,
  LAFEA4_PARENT_NORMAL_PRODUCT_EFFECT,
  LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
  validateLafea4ParentNormalActivationRecord,
} from '../src/workspace/lafea4-parent-normal-activation-record.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH,
  renderLafea4ParentNormalProductionActivationSource,
  validateLafea4ParentNormalPromotionRecordForHead,
} from '../src/workspace/lafea4-parent-normal-promotion-source.js';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const definition = readJson(
  'validation/lafea4-refinement/parent-normal-trust-root-promotion-protocol-v1.json',
);
const activationDefinition = readJson(
  'validation/lafea4-refinement/parent-normal-activation-record-v1.json',
);
const plan = readJson('validation/lafea-independent-qualification/plan-v1.json');
const expectedHead = 'a'.repeat(40);
const authorized = syntheticActivationRecord(expectedHead);

validateLafea4ParentNormalActivationRecord(authorized);
assert.equal(authorized.status, LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS);
assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);
assert.equal(definition.currentState.productionActivationRecord, null);
assert.equal(definition.currentState.hardGateActivated, false);
assert.equal(definition.currentState.productionBindingAuthorized, false);
assert.equal(definition.releaseQualified, false);

const sourceA = renderLafea4ParentNormalProductionActivationSource(authorized);
const sourceB = renderLafea4ParentNormalProductionActivationSource(
  structuredClone(authorized),
);
assert.equal(sourceA, sourceB);
assert.ok(sourceA.includes(authorized.semanticHash));
assert.ok(sourceA.includes(authorized.evidenceDigest));
assert.ok(sourceA.includes(expectedHead));
assert.ok(sourceA.includes(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY));
assert.match(sourceA, /deepFreeze\(ACTIVATION_RECORD\)/u);
assert.match(sourceA, /DO NOT HAND-EDIT THIS RECORD/u);
assert.equal(
  validateLafea4ParentNormalPromotionRecordForHead(authorized, expectedHead).semanticHash,
  authorized.semanticHash,
);
assert.throws(
  () => validateLafea4ParentNormalPromotionRecordForHead(authorized, 'b'.repeat(40)),
  (error) => error?.code === 'LAFEA4_PARENT_NORMAL_PROMOTION_RECORD_HEAD_MISMATCH',
);

const blocked = blockedActivationRecord(authorized);
validateLafea4ParentNormalActivationRecord(blocked);
assert.equal(blocked.status, LAFEA4_PARENT_NORMAL_BLOCKED_STATUS);
assert.throws(
  () => renderLafea4ParentNormalProductionActivationSource(blocked),
  (error) => error?.code === 'LAFEA4_PARENT_NORMAL_PROMOTION_RECORD_NOT_AUTHORIZED',
);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lafea-tech12f-render-'));
try {
  const generated = path.join(tempRoot, 'activation.mjs');
  fs.writeFileSync(generated, sourceA);
  const module = await import(`${pathToFileURL(generated).href}?tech12f=1`);
  const replay = validateLafea4ParentNormalActivationRecord(
    module.LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
  );
  assert.equal(replay.semanticHash, authorized.semanticHash);
  assert.equal(
    module.LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
    LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY,
  );
  assertDeepFrozen(module.LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const requiredId = 'TECH12F_TRUST_ROOT_PROMOTION_PROTOCOL';
assert.ok(LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.includes(requiredId));
assert.ok(activationDefinition.requiredEngineeringStepIds.includes(requiredId));
assert.equal(activationDefinition.authorizationRequirements.tech12fTrustRootPromotionProtocolMustPass, true);
const planRows = plan.steps.filter((row) => row.id === requiredId);
assert.equal(planRows.length, 1);
assert.equal(planRows[0].classification, 'ENGINEERING');
assert.equal(planRows[0].required, true);
assert.deepEqual(
  planRows[0].args,
  ['scripts/lafea-tech12f-trust-root-promotion-protocol-check.mjs'],
);
const ids = plan.steps.map((row) => row.id);
assert.ok(ids.indexOf('TECH12E_DORMANT_PRODUCTION_GATE') < ids.indexOf(requiredId));
assert.ok(ids.indexOf(requiredId) < ids.indexOf('TECH7_GRADED_REFINEMENT_EXECUTOR'));

assert.equal(
  definition.sourceGeneration.onlyAuthorizedProductionPath,
  LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH,
);
assert.equal(definition.recordAuthenticity.semanticHashAloneIsInsufficient, true);
assert.equal(definition.recordAuthenticity.tech12dGeneratorMustReplayOriginalTech8Bundle, true);
assert.equal(definition.recordAuthenticity.reconstructedRecordMustMatchSuppliedRecordExactly, true);
assert.equal(definition.promotionDiff.trackedChangedFileCount, 1);
assert.equal(
  definition.promotionDiff.onlyTrackedChangedFile,
  LAFEA4_PARENT_NORMAL_PRODUCTION_TRUST_ROOT_PATH,
);
assert.equal(definition.promotionDiff.generatorDoesNotCommit, true);
assert.equal(definition.promotionDiff.generatorDoesNotPush, true);
assert.equal(definition.promotionDiff.generatorDoesNotMerge, true);

const generator = readText('scripts/lafea-tech12f-parent-normal-promotion-source.mjs');
for (const requiredSourceToken of [
  'lafea-tech12d-parent-normal-activation-record.mjs',
  'requireExactCleanCheckout(repoRoot, expectedHead)',
  'LAFEA4_PARENT_NORMAL_PROMOTION_RECORD_NOT_EXACT_TECH8_RECONSTRUCTION',
  'requireTrustRootOnlyTrackedDiff(repoRoot)',
  "['status', '--porcelain=v1', '--untracked-files=no']",
  "['diff', '--name-only']",
  "['diff', '--check']",
  "cli['write-trust-root']",
  'fs.writeFileSync(trustRootPath, source)',
]) assert.ok(generator.includes(requiredSourceToken), requiredSourceToken);
assert.ok(!generator.includes('git commit'));
assert.ok(!generator.includes('git push'));
assert.ok(!generator.includes('merge_pull_request'));

const promotionRenderer = readText('src/workspace/lafea4-parent-normal-promotion-source.js');
assert.ok(promotionRenderer.includes('validateLafea4ParentNormalActivationRecord'));
assert.ok(promotionRenderer.includes('AUTHORIZED_FOR_FUTURE_PROMOTION'));
const productionGate = readText('src/workspace/lafea4-parent-normal-production-gate.js');
assert.ok(!productionGate.includes('lafea4-parent-normal-promotion-source'));
const productionActivation = readText('src/workspace/lafea4-parent-normal-production-activation.js');
assert.match(
  productionActivation,
  /LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD\s*=\s*null\s*;/u,
);

console.log(JSON.stringify({
  check: 'lafea-tech12f-trust-root-promotion-protocol',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  currentHardGateActivated: false,
  currentProductionBindingAuthorized: false,
  syntheticAuthorizedRecordHash: authorized.semanticHash,
  deterministicRenderBytes: Buffer.byteLength(sourceA, 'utf8'),
  deterministicRenderReplay: true,
  blockedRecordRejected: true,
  wrongHeadRejected: true,
  exactTech8ReplayRequiredByGenerator: true,
  trustRootOnlyDiffRequired: true,
  automaticCommitPushMerge: false,
  releaseQualified: false,
}, null, 2));

function syntheticActivationRecord(head) {
  const core = {
    schema: LAFEA4_PARENT_NORMAL_ACTIVATION_RECORD_SCHEMA,
    stageId: 'LAFEA.4',
    authority: LAFEA4_PARENT_NORMAL_ACTIVATION_AUTHORITY,
    status: LAFEA4_PARENT_NORMAL_AUTHORIZED_STATUS,
    reasons: [],
    expectedHead: head,
    qualificationId: 'LAFEA4-INDEPENDENT-QUALIFICATION-V1',
    runId: 'TECH12F-SYNTHETIC-AUTHORIZED-RENDER-FIXTURE',
    evidenceDigest: 'b'.repeat(64),
    planSha256: 'c'.repeat(64),
    runnerSha256: 'd'.repeat(64),
    packageLockSha256: 'e'.repeat(64),
    verifierSha256: 'f'.repeat(64),
    manifestDisposition: 'PASS',
    qualificationComplete: true,
    preflightAccepted: true,
    postflightAccepted: true,
    dependencyInstallSucceeded: true,
    browserRequested: true,
    browserProvisionSucceeded: true,
    requiredEngineeringStepIds: LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS,
    requiredStepDisposition: Object.fromEntries(
      LAFEA4_PARENT_NORMAL_REQUIRED_ENGINEERING_STEP_IDS.map((id) => [id, 'PASS']),
    ),
    integrityVerified: true,
    exactCheckoutVerified: true,
    toolingParityVerified: true,
    productEffect: LAFEA4_PARENT_NORMAL_PRODUCT_EFFECT,
    hardGateActivated: false,
    retainedMeshAcceptanceChanged: false,
    solverAuthorizationChanged: false,
    releaseQualificationChanged: false,
    productionBindingAuthorized: false,
    releaseQualified: false,
  };
  return {
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-parent-normal-activation-record-hash-input/v1',
      record: core,
    }),
  };
}
function blockedActivationRecord(valid) {
  const core = {
    ...structuredClone(valid),
    status: LAFEA4_PARENT_NORMAL_BLOCKED_STATUS,
    reasons: ['TECH12F-SYNTHETIC-BLOCKED-FIXTURE'],
  };
  delete core.semanticHash;
  return {
    ...core,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea4-parent-normal-activation-record-hash-input/v1',
      record: core,
    }),
  };
}
function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}
function readJson(relative) { return JSON.parse(readText(relative)); }
function readText(relative) { return fs.readFileSync(path.join(repoRoot, relative), 'utf8'); }
