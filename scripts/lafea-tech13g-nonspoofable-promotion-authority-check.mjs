#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD,
  evaluateLafea4ShellProductRefinementPromotion,
  requireLafea4ShellProductRefinementPromotionAuthorized,
} from '../src/workspace/lafea4-shell-product-refinement-promotion.js';
import { buildLafea4ShellProductRefinementUiPolicy } from '../src/workspace/lafea4-shell-product-refinement-ui-policy.js';

const policy = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/product-refinement-promotion-v1.json', import.meta.url),
  'utf8',
));
const promotionSource = fs.readFileSync(
  new URL('../src/workspace/lafea4-shell-product-refinement-promotion.js', import.meta.url),
  'utf8',
);
const uiSource = fs.readFileSync(
  new URL('../src/workspace/lafea4-shell-product-refinement-ui-policy.js', import.meta.url),
  'utf8',
);

assert.equal(LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD, null);
assert.equal(evaluateLafea4ShellProductRefinementPromotion.length, 0);
assert.equal(requireLafea4ShellProductRefinementPromotionAuthorized.length, 0);
assert.equal(buildLafea4ShellProductRefinementUiPolicy.length, 1);
assert.equal(policy.productionAuthorityArgumentAccepted, false);
assert.equal(policy.callerSuppliedPromotionRecordMayActivate, false);
assert.equal(policy.activationRequiresActualActivePathCheck, true);
assert.equal(policy.activationActivePathCheck,
  'scripts/lafea-tech13g-active-promotion-path-check.mjs');
assert.match(promotionSource,
  /const record = LAFEA4_SHELL_PRODUCT_REFINEMENT_PROMOTION_RECORD;/u);
assert.match(uiSource,
  /export function buildLafea4ShellProductRefinementUiPolicy\(stageValue\)/u);
assert.doesNotMatch(uiSource,
  /buildLafea4ShellProductRefinementUiPolicy\(stageValue,\s*promotionRecord/u);

console.log(JSON.stringify({
  check: 'lafea-tech13g-nonspoofable-promotion-authority',
  status: 'PASS',
  productionTrustRoot: 'NULL',
  productionResolverAuthorityArgumentCount: evaluateLafea4ShellProductRefinementPromotion.length,
  productionRequireAuthorityArgumentCount: requireLafea4ShellProductRefinementPromotionAuthorized.length,
  uiPolicyArgumentCount: buildLafea4ShellProductRefinementUiPolicy.length,
  callerSuppliedPromotionRecordMayActivate: false,
  activePathCheck: policy.activationActivePathCheck,
}, null, 2));
