#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION,
} from '../src/workspace/lafea4-shell-product-refinement-adapter.js';
import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_EXACT_HEAD_QUALIFICATION_ID,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_BLOCK_CODE,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_PENDING_CODE,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD,
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_SCHEMA,
  createLafea4ShellProductRefinementPromotionRecord,
  evaluateLafea4ShellProductRefinementPromotion,
  requireLafea4ShellProductRefinementPromotionAuthorized,
  validateLafea4ShellProductRefinementPromotionRecord,
} from '../src/workspace/lafea4-shell-product-refinement-promotion.js';

const policy = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/product-refinement-promotion-v1.json', import.meta.url),
  'utf8',
));
assert.equal(policy.currentTrustRoot, 'NULL');
assert.equal(policy.activationRequiresVerifiedExactHeadBundle, true);
assert.equal(policy.runtimeCandidateGateStillRequiredAfterPromotion, true);
assert.equal(policy.runtimeParentNormalGateStillRequiredAfterPromotion, true);
assert.equal(policy.runtimeMeshQualityThresholdsMayChangeOnPromotion, false);

// Production truth is fail-closed.
assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD, null);
const dormant = evaluateLafea4ShellProductRefinementPromotion();
assert.equal(dormant.active, false);
assert.equal(dormant.productRetentionAuthorized, false);
assert.equal(dormant.uiBindingAuthorized, false);
assert.equal(dormant.releaseQualified, false);
assert.equal(dormant.diagnosticCode, LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_PENDING_CODE);
assert.throws(
  () => requireLafea4ShellProductRefinementPromotionAuthorized(),
  (error) => error?.code === LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_BLOCK_CODE,
);

// Qualification seam only: this record is deliberately synthetic and is not
// source-controlled as production authority. It proves the future-active code
// branch can be structurally exercised before any real PASS bundle exists.
const synthetic = createLafea4ShellProductRefinementPromotionRecord({
  schema: LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_SCHEMA,
  stageId: 'LAFEA.4',
  exactHeadQualificationId: LAFEA4_SHELL_PRODUCT_REFINEMENT_EXACT_HEAD_QUALIFICATION_ID,
  qualifiedHead: 'a'.repeat(40),
  bundleEvidenceSha256: '1'.repeat(64),
  bundlePlanSha256: '2'.repeat(64),
  bundleRunnerSha256: '3'.repeat(64),
  capabilityHash: LAFEA4_SHELL_PRODUCT_REFINEMENT_CAPABILITY.capabilityHash,
  qualificationHash: LAFEA4_SHELL_PRODUCT_REFINEMENT_QUALIFICATION.qualificationHash,
  qualificationClassification: 'PASS',
  qualificationComplete: true,
  futurePromotionReviewEligible: true,
  productRetentionAuthorized: true,
  uiBindingAuthorized: true,
  releaseQualified: false,
});
assert.deepEqual(validateLafea4ShellProductRefinementPromotionRecord(synthetic), synthetic);
const active = evaluateLafea4ShellProductRefinementPromotion(synthetic);
assert.equal(active.active, true);
assert.equal(active.productRetentionAuthorized, true);
assert.equal(active.uiBindingAuthorized, true);
assert.equal(active.releaseQualified, false);
assert.equal(active.qualifiedHead, 'a'.repeat(40));
assert.equal(requireLafea4ShellProductRefinementPromotionAuthorized(synthetic).active, true);

const tampered = structuredClone(synthetic);
tampered.bundleEvidenceSha256 = '4'.repeat(64);
assert.throws(
  () => validateLafea4ShellProductRefinementPromotionRecord(tampered),
  /LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD_TAMPERED/,
);
const wrongCapability = { ...synthetic };
delete wrongCapability.semanticHash;
wrongCapability.capabilityHash = `sha256:${'5'.repeat(64)}`;
assert.throws(
  () => createLafea4ShellProductRefinementPromotionRecord(wrongCapability),
  /LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_CONTRACT_INVALID/,
);

console.log(JSON.stringify({
  check: 'lafea-tech13f-dormant-promotion-gate',
  status: 'PASS',
  productionTrustRoot: 'NULL',
  productionProductRetentionAuthorized: dormant.productRetentionAuthorized,
  productionUiBindingAuthorized: dormant.uiBindingAuthorized,
  syntheticFutureActiveBranchExercised: active.active,
  syntheticRecordIsProductionEvidence: false,
  releaseQualified: false,
}, null, 2));
