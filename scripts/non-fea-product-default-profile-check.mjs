#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
  createNonFeaProductDefaultProvider,
  isProductDefaultEvidence,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';

function clone(value) {
  return structuredClone(value);
}

function rowHash(row) {
  return semanticHash({
    defaultId: row.defaultId,
    projectDataPath: row.projectDataPath,
    value: row.value,
    unit: row.unit,
    basis: row.basis,
  });
}

function withGravity(defaultProfile, gravity, version = defaultProfile.version + 1) {
  const next = clone(defaultProfile);
  next.version = version;
  const row = next.defaults.find((candidate) => candidate.defaultId === 'PD-GRAVITY');
  row.value = gravity;
  row.semanticHash = rowHash(row);
  return next;
}

function checkEmptyProfileDefaults() {
  const source = createEmptyProjectDataProfile();
  const before = JSON.stringify(source);
  const provider = createNonFeaProductDefaultProvider({ profile: source });

  assert.equal(JSON.stringify(source), before, 'provider must not mutate stored Project Data');
  assert.equal(provider.schema, 'non-fea-product-default-provider/v1');
  assert.equal(provider.profileId, 'LOAD_CALC_STANDARD_DEFAULTS_V1');
  assert.equal(provider.profileVersion, 4);
  assert.equal(provider.usageRows.length, LOAD_CALC_STANDARD_DEFAULTS_V1.defaults.length);
  assert.equal(provider.shadowedRows.length, 0);
  assert.equal(provider.effectiveProfile.loadCalculation.gravityMPerS2.value, 9.80665);
  assert.deepEqual(provider.effectiveProfile.loadCalculation.activeLoadCases.value, ['EMPTY', 'OPE', 'HYD']);
  assert.equal(provider.effectiveProfile.sourcesAndUnits.sourceUpAxis.value, 'Z');
  assert.equal(provider.effectiveProfile.thermoMechanicalBasis.fluidPhaseAndFillState.value.cases.OPE.fillFraction, 1);
  assert.equal(
    provider.effectiveProfile.loadCalculation.componentMassCompositionPolicy.value.defaultMode,
    'COMPONENT_EXPLICIT_POINT_MASS',
  );
  assert.equal(
    provider.effectiveProfile.loadCalculation.forceOutputConvention.value,
    'POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY',
  );
  assert.equal(
    provider.effectiveProfile.loadCalculation.momentOutputConvention.value,
    'SIGNED_ROUTE_CHAINAGE_FIRST_MOMENT_NMM',
  );
  assert.equal(
    provider.effectiveProfile.loadCalculation.analysisBasis.value,
    'ROUTE_CHAINAGE_1D_STATIC_GRAVITY',
  );
  assert.equal(
    provider.effectiveProfile.loadCalculation.resultSignConvention.value,
    'SOURCE_Z_UP_POSITIVE_SUPPORT_REACTION',
  );
  assert.equal(isProductDefaultEvidence(provider.effectiveProfile.loadCalculation.gravityMPerS2), true);
  assert.equal(isProductDefaultEvidence(provider.effectiveProfile.loadCalculation.componentMassCompositionPolicy), true);
  assert.equal(isProductDefaultEvidence(provider.effectiveProfile.loadCalculation.forceOutputConvention), true);
  assert.equal(provider.effectiveProfile.loadCalculation.pipeSectionProperties.value, null,
    'product profile must not invent universal pipe OD/wall data');
  assert.equal(provider.effectiveProfile.loadCalculation.componentWeightsKg.value, null,
    'product profile must not invent component masses');

  const gravityUsage = provider.usageRows.find((row) => row.defaultId === 'PD-GRAVITY');
  const gravityDefinition = LOAD_CALC_STANDARD_DEFAULTS_V1.defaults
    .find((row) => row.defaultId === 'PD-GRAVITY');
  assert.equal(gravityUsage.defaultSemanticHash, gravityDefinition.semanticHash);
  assert.equal(
    provider.effectiveProfile.loadCalculation.gravityMPerS2.evidence.defaultSemanticHash,
    gravityDefinition.semanticHash,
  );

  const { semanticHash: supplied, ...base } = provider;
  assert.equal(supplied, semanticHash(base), 'provider semantic hash must bind effective values and usage evidence');
}

function checkHigherAuthorityWins() {
  const empty = createEmptyProjectDataProfile();
  const project = replaceProjectDataValue(
    empty,
    'loadCalculation.gravityMPerS2',
    9.81,
    { source: 'Project engineering basis', authority: 'PROJECT_POLICY' },
    true,
  );
  const provider = createNonFeaProductDefaultProvider({ profile: project });

  assert.equal(provider.effectiveProfile.loadCalculation.gravityMPerS2.value, 9.81);
  assert.equal(provider.effectiveProfile.loadCalculation.gravityMPerS2.evidence.authority, 'PROJECT_POLICY');
  assert.equal(provider.usageRows.some((row) => row.defaultId === 'PD-GRAVITY'), false,
    'shadowed product default must not be reported as used');
  const shadow = provider.shadowedRows.find((row) => row.defaultId === 'PD-GRAVITY');
  assert.equal(shadow?.status, 'SHADOWED_BY_HIGHER_AUTHORITY');
  assert.equal(shadow?.existingAuthority, 'PROJECT_POLICY');
  assert.equal(typeof shadow?.defaultSemanticHash, 'string');
}

function checkLegacyPhase2Upgrade() {
  const project = replaceProjectDataValue(
    createEmptyProjectDataProfile(),
    'loadCalculation.gravityMPerS2',
    9.81,
    { source: 'Legacy project basis', authority: 'PROJECT_POLICY' },
    true,
  );
  const legacy = clone(project);
  for (const field of [
    'componentMassCompositionPolicy',
    'forceOutputConvention',
    'momentOutputConvention',
    'analysisBasis',
    'resultSignConvention',
  ]) delete legacy.loadCalculation[field];
  const before = JSON.stringify(legacy);
  const provider = createNonFeaProductDefaultProvider({ profile: legacy });

  assert.equal(JSON.stringify(legacy), before, 'legacy source profile must remain unmodified');
  assert.equal(provider.effectiveProfile.loadCalculation.gravityMPerS2.value, 9.81,
    'existing legacy Project Data evidence must survive additive upgrade');
  assert.equal(provider.effectiveProfile.loadCalculation.gravityMPerS2.evidence.authority, 'PROJECT_POLICY');
  assert.equal(
    provider.effectiveProfile.loadCalculation.componentMassCompositionPolicy.value.defaultMode,
    'COMPONENT_EXPLICIT_POINT_MASS',
  );
  assert.equal(
    provider.effectiveProfile.loadCalculation.forceOutputConvention.value,
    'POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY',
  );
  for (const field of [
    'componentMassCompositionPolicy',
    'forceOutputConvention',
    'momentOutputConvention',
    'analysisBasis',
    'resultSignConvention',
  ]) {
    assert.equal(provider.effectiveProfile.loadCalculation[field].evidence.authority, 'PRODUCT_DEFAULT');
  }
  assert.notEqual(provider.sourceProjectDataSemanticHash, provider.upgradedProjectDataSemanticHash,
    'legacy structural upgrade must remain visible in provider hashes');
}

function checkDefaultChangeInvalidatesHashes() {
  const source = createEmptyProjectDataProfile();
  const first = createNonFeaProductDefaultProvider({ profile: source });
  const changedDefaults = withGravity(LOAD_CALC_STANDARD_DEFAULTS_V1, 9.7);
  const second = createNonFeaProductDefaultProvider({
    profile: source,
    defaultProfile: changedDefaults,
  });

  assert.notEqual(first.productDefaultProfileSemanticHash, second.productDefaultProfileSemanticHash);
  assert.notEqual(first.effectiveProjectDataProfileSemanticHash, second.effectiveProjectDataProfileSemanticHash);
  assert.notEqual(first.semanticHash, second.semanticHash);
  assert.equal(second.effectiveProfile.loadCalculation.gravityMPerS2.value, 9.7);
}

function checkTamperedDefaultHashRejected() {
  const invalid = clone(LOAD_CALC_STANDARD_DEFAULTS_V1);
  invalid.defaults[0].value = 'cm';
  assert.throws(
    () => createNonFeaProductDefaultProvider({
      profile: createEmptyProjectDataProfile(),
      defaultProfile: invalid,
    }),
    /Product default semantic hash mismatch/,
  );
}

function checkDuplicatePathRejected() {
  const invalid = clone(LOAD_CALC_STANDARD_DEFAULTS_V1);
  const duplicate = { ...clone(invalid.defaults[0]), defaultId: 'PD-DUPLICATE-PATH' };
  duplicate.semanticHash = rowHash(duplicate);
  invalid.defaults.push(duplicate);
  assert.throws(
    () => createNonFeaProductDefaultProvider({
      profile: createEmptyProjectDataProfile(),
      defaultProfile: invalid,
    }),
    /Duplicate product default path/,
  );
}

checkEmptyProfileDefaults();
checkHigherAuthorityWins();
checkLegacyPhase2Upgrade();
checkDefaultChangeInvalidatesHashes();
checkTamperedDefaultHashRejected();
checkDuplicatePathRejected();

console.log('Non-FEA product-default profile check: PASS');
