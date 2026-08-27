#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createCalculationDefaultsObservability,
  NON_FEA_COMMON_CHECK_REPORT_SCHEMA,
  NON_FEA_CONFIGURED_DEFAULT_USAGE_LEDGER_SCHEMA,
  NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA,
} from '../src/workspace/project-data/non-fea-calculation-defaults-observability-model.js';

const usageLedger = {
  schema: NON_FEA_CONFIGURED_DEFAULT_USAGE_LEDGER_SCHEMA,
  semanticHash: 'fnv1a64:1111111111111111',
  rows: [
    usage('VALVE-MASS-150', 'COMPONENT_WEIGHT', 'WEIGHT_AND_GRAVITY', 'V-100'),
    usage('VALVE-MASS-150', 'COMPONENT_WEIGHT', 'SUSTAINED_REACTIONS', 'V-100'),
    usage('OPE-DENSITY-L100', 'OPERATING_FLUID_DENSITY', 'WEIGHT_AND_GRAVITY', 'P-100'),
  ],
};

const productProvider = {
  schema: NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA,
  profileId: 'LOAD_CALC_STANDARD_DEFAULTS_V1',
  profileVersion: 6,
  semanticHash: 'fnv1a64:2222222222222222',
  usageRows: [
    productUsage('PD-GRAVITY', 'loadCalculation.gravityMPerS2', 9.80665, 'm/s²', 'Standard gravity.'),
    productUsage('PD-LOAD-FACTOR', 'loadCalculation.loadFactor', 1, 'ratio', 'Unfactored screening load.'),
  ],
  shadowedRows: [{
    defaultId: 'PD-SOURCE-UP-AXIS',
    projectDataPath: 'sourcesAndUnits.sourceUpAxis',
    defaultSemanticHash: 'fnv1a64:3333333333333333',
    status: 'SHADOWED_BY_HIGHER_AUTHORITY',
    existingAuthority: 'SOURCE_EXPLICIT',
    existingSource: 'StagedJSON',
  }],
};

const report = {
  schema: NON_FEA_COMMON_CHECK_REPORT_SCHEMA,
  semanticHash: 'fnv1a64:4444444444444444',
  packageState: 'PARTIALLY_READY',
  readyMethodIds: ['WEIGHT_AND_GRAVITY'],
  blockedMethodIds: ['SUSTAINED_MEMBER_ACTIONS', 'SUSTAINED_STRESS'],
  blockers: [
    blocker('SUSTAINED_MEMBER_ACTIONS', 'FLEXURAL_COVERAGE_INCOMPLETE', 'FLEXURAL_COVERAGE', 'Flexural evidence is missing for: P-200.'),
    blocker('SUSTAINED_STRESS', 'FLEXURAL_COVERAGE_INCOMPLETE', 'FLEXURAL_COVERAGE', 'Flexural evidence is missing for: P-200.'),
  ],
  methodRows: [
    method('WEIGHT_AND_GRAVITY', 'READY', [
      coverage('MASS_COVERAGE', 'READY', 'MASS_COVERAGE_READY', 4, 4, []),
    ]),
    method('SUSTAINED_MEMBER_ACTIONS', 'BLOCKED', [
      coverage('MASS_COVERAGE', 'READY', 'MASS_COVERAGE_READY', 4, 4, []),
      coverage('FLEXURAL_COVERAGE', 'BLOCKED', 'FLEXURAL_COVERAGE_INCOMPLETE', 4, 3, ['P-200']),
    ]),
    method('SUSTAINED_STRESS', 'BLOCKED', [
      coverage('MASS_COVERAGE', 'READY', 'MASS_COVERAGE_READY', 4, 4, []),
      coverage('FLEXURAL_COVERAGE', 'BLOCKED', 'FLEXURAL_COVERAGE_INCOMPLETE', 4, 3, ['P-200']),
      coverage('SECTION_COVERAGE', 'READY', 'SECTION_COVERAGE_READY', 4, 4, []),
    ]),
  ],
};

const model = createCalculationDefaultsObservability({
  configuredDefaultUsageLedger: usageLedger,
  productDefaultProvider: productProvider,
  report,
});

assert.equal(model.package.state, 'PARTIALLY_READY');
assert.equal(model.package.readyMethodCount, 1);
assert.equal(model.package.blockedMethodCount, 2);

assert.equal(model.configuredUsage.receiptCount, 3,
  'usage summary must preserve method-level usage receipts');
assert.equal(model.configuredUsage.selectedTargetFieldCount, 2,
  'same target-field selected for multiple methods must count once as an effective selection');
assert.equal(model.configuredUsage.configuredDefaultCount, 2);
assert.equal(model.configuredUsage.affectedTargetCount, 2);
const valve = model.configuredUsage.defaults.find((row) => row.defaultId === 'VALVE-MASS-150');
assert.ok(valve);
assert.equal(valve.targetCount, 1);
assert.equal(valve.methodCount, 2);
assert.equal(valve.receiptCount, 2);
assert.deepEqual(valve.targetIds, ['V-100']);
assert.deepEqual(valve.methodIds, ['SUSTAINED_REACTIONS', 'WEIGHT_AND_GRAVITY']);

assert.equal(model.productUsage.appliedCount, 2);
assert.equal(model.productUsage.shadowedCount, 1);
assert.equal(model.productUsage.applied[0].authority, 'PRODUCT_DEFAULT');
assert.equal(model.productUsage.shadowed[0].existingAuthority, 'SOURCE_EXPLICIT');
assert.notEqual(model.productUsage.appliedCount, model.configuredUsage.selectedTargetFieldCount,
  'Product-profile fills and target configured-default selections are distinct metrics');

assert.equal(model.coverage.requestedCount, 3);
assert.equal(model.coverage.readyCount, 2);
assert.equal(model.coverage.incompleteCount, 1);
const mass = coverageRow(model, 'MASS_COVERAGE');
assert.equal(mass.coveragePercent, 100);
assert.deepEqual(mass.methodIds, ['SUSTAINED_MEMBER_ACTIONS', 'SUSTAINED_STRESS', 'WEIGHT_AND_GRAVITY']);
const flexural = coverageRow(model, 'FLEXURAL_COVERAGE');
assert.equal(flexural.coveragePercent, 75);
assert.equal(flexural.ready, false);
assert.deepEqual(flexural.missing, ['P-200']);
const section = coverageRow(model, 'SECTION_COVERAGE');
assert.equal(section.coveragePercent, 100);

assert.equal(model.exceptions.blockerReceiptCount, 2);
assert.equal(model.exceptions.exceptionGroupCount, 1,
  'same checker exception across methods should be grouped for presentation, not duplicated as separate engineering issues');
assert.deepEqual(model.exceptions.rows[0].methodIds, ['SUSTAINED_MEMBER_ACTIONS', 'SUSTAINED_STRESS']);
assert.equal(model.exceptions.rows[0].occurrenceCount, 2);

const inconsistent = structuredClone(report);
inconsistent.methodRows[1].requirements[0].details.covered = 3;
inconsistent.methodRows[1].requirements[0].details.missing = ['P-X'];
inconsistent.methodRows[1].requirements[0].details.ready = false;
assert.throws(() => createCalculationDefaultsObservability({
  configuredDefaultUsageLedger: usageLedger,
  productDefaultProvider: productProvider,
  report: inconsistent,
}), /inconsistent across requested methods/u,
'UI projection must fail closed if canonical repeated coverage evidence disagrees');

const dishonestReady = structuredClone(report);
honestCoverage(dishonestReady, 'FLEXURAL_COVERAGE').details.ready = true;
assert.throws(() => createCalculationDefaultsObservability({
  configuredDefaultUsageLedger: usageLedger,
  productDefaultProvider: productProvider,
  report: dishonestReady,
}), /ready flag disagrees with missing evidence/u,
'coverage readiness must not contradict the checker missing list');

const [viewSource, aggregateSource, runtimeSource] = await Promise.all([
  read('../src/workspace/project-data/non-fea-calculation-effective-values-view.js'),
  read('./run-non-fea-checks.mjs'),
  read('../src/workspace/non-fea-common-input-runtime.js'),
]);
assert.equal((viewSource.match(/buildCurrentPreFeaRequestInput\(\)/gu) || []).length, 1,
  'D3 + D4 must share one current-input build per inspector render');
assert.match(viewSource, /createPreFeaPipingCheckRequest/u);
assert.match(viewSource, /runPreFeaPipingCheck/u,
  'D4 must reuse the canonical checker rather than implement coverage/readiness rules');
assert.doesNotMatch(viewSource, /evaluateCurrentNonFeaCommonInput/u,
  'Step-3 observability must not mutate the Common Input store merely by being viewed');
assert.doesNotMatch(viewSource, /resolveNonFeaEffectiveValues|resolveNonFeaEnrichment/u,
  'Step-3 observability must not introduce another resolver');
assert.doesNotMatch(viewSource,
  /sealCurrentNonFea|executeCurrentCommonInput|calculateAuthorized|authorizedEmpiricalRuntime/u,
  'Step-3 observability must not seal or execute calculation');
assert.match(viewSource, /data-role="calculation-default-usage-summary"/u);
assert.match(viewSource, /data-role="calculation-coverage-exception-summary"/u);
assert.match(viewSource, /Product-default counts are Project Data profile assumptions/u,
  'UI must distinguish Product-profile fills from target-level configured-default selections');
assert.match(viewSource, /pre-Run readiness exceptions/u,
  'UI must not mislabel checker blockers as post-calculation exceptions');
assert.match(aggregateSource, /non-fea-calculation-defaults-observability-check\.mjs/u,
  'D4 falsifier must be registered in the canonical Non-FEA aggregate');
assert.match(runtimeSource, /configuredDefaultUsageLedger/u,
  'current Common Input runtime must remain the owner of the usage ledger supplied to D4');

console.log(JSON.stringify({
  check: 'non-fea-calculation-defaults-observability',
  status: 'PASS',
  configuredDefaultReceipts: model.configuredUsage.receiptCount,
  configuredTargetFieldSelections: model.configuredUsage.selectedTargetFieldCount,
  productDefaultsApplied: model.productUsage.appliedCount,
  productDefaultsShadowed: model.productUsage.shadowedCount,
  requestedCoverageAreas: model.coverage.requestedCount,
  incompleteCoverageAreas: model.coverage.incompleteCount,
  exceptionGroups: model.exceptions.exceptionGroupCount,
  canonicalCheckerReused: true,
  secondResolverIntroduced: false,
  commonInputStoreMutatedByView: false,
}, null, 2));

function usage(defaultId, fieldId, methodId, targetId) {
  return { defaultId, fieldId, methodId, targetId, reason: `Selected for ${targetId}.` };
}
function productUsage(defaultId, projectDataPath, value, unit, basis) {
  return {
    defaultId,
    projectDataPath,
    value,
    unit,
    basis,
    authority: 'PRODUCT_DEFAULT',
    defaultSemanticHash: `fnv1a64:${defaultId.length.toString(16).padStart(16, '0')}`,
  };
}
function method(methodId, state, requirements) {
  return { methodId, state, requirements, blockers: [] };
}
function coverage(requirementId, state, code, total, covered, missing) {
  return {
    requirementId,
    state,
    code,
    message: missing.length
      ? `${requirementId} is missing for: ${missing.join(', ')}.`
      : `${requirementId} covers ${total} governed entities.`,
    details: { total, covered, missing, ready: missing.length === 0 },
  };
}
function blocker(methodId, code, path, message) {
  return { methodId, code, path, message };
}
function coverageRow(modelValue, requirementId) {
  const row = modelValue.coverage.rows.find((candidate) => candidate.requirementId === requirementId);
  assert.ok(row, `missing coverage row ${requirementId}`);
  return row;
}
function honestCoverage(reportValue, requirementId) {
  for (const methodRow of reportValue.methodRows) {
    const row = methodRow.requirements.find((candidate) => candidate.requirementId === requirementId);
    if (row) return row;
  }
  throw new Error(`missing fixture coverage ${requirementId}`);
}
async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
