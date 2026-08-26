#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  NON_FEA_PRODUCT_SCREENING_SNAPSHOT_ACTOR,
  NON_FEA_PRODUCT_SCREENING_SNAPSHOT_STATEMENT,
  createNonFeaReadyProductScreeningConfirmation,
} from '../src/workspace/non-fea-common-input-runtime.js';

const REPORT_HASH = 'fnv1a64:1234567890abcdef';
const CAPTURED_AT = '2026-08-26T09:45:00.000Z';
const readyReport = Object.freeze({
  packageState: 'READY',
  readyMethodIds: Object.freeze(['WEIGHT_AND_GRAVITY']),
  blockedMethodIds: Object.freeze([]),
  blockers: Object.freeze([]),
  semanticHash: REPORT_HASH,
});

const confirmation = createNonFeaReadyProductScreeningConfirmation(
  readyReport,
  CAPTURED_AT,
);

assert.equal(
  confirmation.confirmationId,
  `PRODUCT-SCREENING:${REPORT_HASH}`,
  'READY screening identity must bind the exact checker report semantic hash.',
);
assert.equal(confirmation.confirmedAt, CAPTURED_AT);
assert.equal(confirmation.confirmedBy, NON_FEA_PRODUCT_SCREENING_SNAPSHOT_ACTOR);
assert.equal(
  confirmation.confirmedBy,
  'Load Calc product screening snapshot (system)',
  'System snapshot provenance must not impersonate a user or reviewer.',
);
assert.equal(confirmation.acceptPartial, false);
assert.deepEqual(confirmation.acknowledgedBlockedMethods, []);
assert.equal(confirmation.statement, NON_FEA_PRODUCT_SCREENING_SNAPSHOT_STATEMENT);
assert.match(confirmation.statement, /no user approval/u);
assert.match(confirmation.statement, /no .*partial-method acceptance/u);
assert.equal(Object.isFrozen(confirmation), true);

assert.deepEqual(
  createNonFeaReadyProductScreeningConfirmation(readyReport, CAPTURED_AT),
  confirmation,
  'Same READY report and capture time must produce deterministic screening provenance.',
);

for (const [label, report] of [
  ['partial', {
    ...readyReport,
    packageState: 'PARTIALLY_READY',
    blockedMethodIds: ['SUSTAINED_MEMBER_ACTIONS'],
  }],
  ['blocked', {
    ...readyReport,
    packageState: 'BLOCKED',
    readyMethodIds: [],
    blockedMethodIds: ['WEIGHT_AND_GRAVITY'],
  }],
  ['ready-with-zero-ready-methods', {
    ...readyReport,
    readyMethodIds: [],
  }],
  ['ready-with-blocked-method', {
    ...readyReport,
    blockedMethodIds: ['SUSTAINED_MEMBER_ACTIONS'],
  }],
]) {
  assert.throws(
    () => createNonFeaReadyProductScreeningConfirmation(report, CAPTURED_AT),
    (error) => error?.code === 'COMMON_INPUT_PRODUCT_SCREENING_SNAPSHOT_NOT_READY',
    `${label} report must not create a product screening seal confirmation.`,
  );
}

assert.throws(
  () => createNonFeaReadyProductScreeningConfirmation(
    { ...readyReport, semanticHash: '' },
    CAPTURED_AT,
  ),
  (error) => error?.code === 'COMMON_INPUT_PRODUCT_SCREENING_SNAPSHOT_REPORT_HASH_REQUIRED',
  'READY report without semantic identity must fail closed.',
);

for (const invalidTime of [
  '2026-08-26 09:45:00Z',
  'not-a-time',
  '',
]) {
  assert.throws(
    () => createNonFeaReadyProductScreeningConfirmation(readyReport, invalidTime),
    (error) => error?.code === 'COMMON_INPUT_PRODUCT_SCREENING_SNAPSHOT_TIMESTAMP_INVALID',
    `Non-canonical capture time must fail: ${JSON.stringify(invalidTime)}`,
  );
}

const runtimeSource = await readFile(
  new URL('../src/workspace/non-fea-common-input-runtime.js', import.meta.url),
  'utf8',
);
assert.match(
  runtimeSource,
  /export function sealCurrentReadyNonFeaCalculationSnapshot/u,
  'READY-only snapshot runtime helper is missing.',
);
assert.match(
  runtimeSource,
  /before\.commonInput && before\.staleness\?\.stale === false && !before\.error/u,
  'Current sealed Common Input must be reused instead of needlessly resealed.',
);
assert.match(
  runtimeSource,
  /createNonFeaReadyProductScreeningConfirmation\(\s*evaluated\.report,\s*capturedAt,/u,
  'Runtime helper must pass the current checker report through the READY-only authority gate.',
);
assert.match(
  runtimeSource,
  /nonFeaCommonInputStore\.seal\(confirmation\)/u,
  'Runtime helper must use the existing Common Input seal contract rather than bypass it.',
);
assert.doesNotMatch(
  runtimeSource,
  /acceptPartial:\s*true/u,
  'READY-only runtime helper must not manufacture partial acceptance.',
);

console.log(JSON.stringify({
  check: 'non-fea-ready-screening-snapshot',
  status: 'PASS',
  reportSemanticHash: REPORT_HASH,
  confirmationId: confirmation.confirmationId,
  confirmedBy: confirmation.confirmedBy,
  acceptPartial: confirmation.acceptPartial,
  acknowledgedBlockedMethodCount: confirmation.acknowledgedBlockedMethods.length,
  partialAndBlockedAutoAcceptanceRejected: true,
  userApprovalAsserted: false,
  runtimeUsesExistingSealContract: true,
}, null, 2));
