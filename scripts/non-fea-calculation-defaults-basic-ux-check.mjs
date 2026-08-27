#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmptyProjectDataProfile } from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
  LOAD_CALC_STANDARD_DEFAULTS_V1,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  createBasicCalculationDefaultReset,
  createBasicCalculationDefaultUpdate,
  createBasicCalculationDefaultsModel,
  NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE,
} from '../src/workspace/project-data/non-fea-calculation-defaults-model.js';

const raw = createEmptyProjectDataProfile();
const effective = createNonFeaProductDefaultProvider({ profile: raw }).effectiveProfile;
const model = createBasicCalculationDefaultsModel(effective);

assert.equal(model.rows.length, 10);
assert.equal(model.productDefaultProfileId, LOAD_CALC_STANDARD_DEFAULTS_V1.profileId);
assert.equal(model.productDefaultProfileVersion, LOAD_CALC_STANDARD_DEFAULTS_V1.version);
assert.ok(model.rows.every((row) => row.scope === 'PROJECT_GLOBAL'));
assert.ok(model.rows.every((row) => row.effectiveAuthority === 'PRODUCT_DEFAULT'));
assert.ok(model.rows.every((row) => row.resetAvailable === false));

const gravity = createBasicCalculationDefaultUpdate(effective, 'GRAVITY_ACCELERATION', 9.7);
assert.equal(gravity.projectDataPath, 'loadCalculation.gravityMPerS2');
assert.equal(gravity.value, 9.7);
assert.equal(gravity.evidence.source, NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE);
assert.equal(gravity.evidence.authority, 'PROJECT_POLICY');
assert.equal(gravity.evidence.previousAuthority, 'PRODUCT_DEFAULT');
assert.equal(gravity.approved, true);

const cases = createBasicCalculationDefaultUpdate(effective, 'ACTIVE_LOAD_CASES', ['HYD', 'EMPTY']);
assert.deepEqual(cases.value, ['EMPTY', 'HYD']);
const method = createBasicCalculationDefaultUpdate(effective, 'GRAVITY_METHOD', 'CHAINAGE_TRIBUTARY_SPAN_V3_COG');
assert.equal(method.value, 'CHAINAGE_TRIBUTARY_SPAN_V3_COG');

const elastic = createBasicCalculationDefaultUpdate(effective, 'ELASTIC_THERMAL', {
  elasticModulusPa: 195e9,
  thermalExpansionPerK: 11.5e-6,
});
assert.equal(elastic.projectDataPath, 'thermoMechanicalBasis.materialElasticProperties');
assert.equal(elastic.value.DEFAULT.elasticModulusPa, 195e9);
assert.equal(elastic.value.DEFAULT.thermalExpansionPerK, 11.5e-6);
assert.equal(elastic.evidence.authority, 'PROJECT_POLICY');

const resetElastic = createBasicCalculationDefaultReset('ELASTIC_THERMAL');
assert.equal(resetElastic.projectDataPath, 'thermoMechanicalBasis.materialElasticProperties');
assert.equal(resetElastic.value, null, 'reset must clear the complete path, not fabricate mixed per-property authority');
assert.equal(resetElastic.evidence, null);
assert.equal(resetElastic.approved, false);

assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'SOURCE_UP_AXIS', 'Y'), /must be one of/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'LENGTH_UNIT', 'm'), /must be one of/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'GRAVITY_ACCELERATION', 0), /greater than zero/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'LOAD_FACTOR', -1), /greater than zero/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'FRICTION_COEFFICIENT', -0.1), /non-negative/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'ACTIVE_LOAD_CASES', []), /At least one/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'ACTIVE_LOAD_CASES', ['STARTUP']), /Unknown canonical/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'GRAVITY_METHOD', 'MAGIC'), /must be one of/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'ELASTIC_THERMAL', {
  elasticModulusPa: 0,
  thermalExpansionPerK: 12e-6,
}), /greater than zero/u);

const [routerSource, viewSource, legacySource] = await Promise.all([
  read('../src/workspace/project-data/project-data-view.js'),
  read('../src/workspace/project-data/non-fea-calculation-defaults-view.js'),
  read('../src/workspace/project-data/non-fea-project-data-view-v2.js'),
]);
assert.match(routerSource, /renderNonFeaCalculationDefaultsView/u);
assert.doesNotMatch(routerSource, /renderNonFeaProjectDataViewV2/u,
  'normal Load Calc router must no longer point directly at the authority-heavy editor');
assert.match(viewSource, /data-role="non-fea-calculation-defaults"/u);
assert.match(viewSource, /Value[\s\S]*Unit[\s\S]*Scope[\s\S]*Effective authority[\s\S]*Basis[\s\S]*Actions/u);
assert.match(viewSource, /renderNonFeaProjectDataViewV2/u,
  'advanced authority editor must remain reachable from Calculation Defaults');
assert.match(viewSource, /D2 successor/u,
  'D1 must not falsely claim the engineer-friendly scoped-default editor is complete');
assert.match(legacySource, /data-role="non-fea-configured-default-ledger"/u,
  'existing configured-default policy/ledger authority must remain intact in Advanced');

console.log(JSON.stringify({
  check: 'non-fea-calculation-defaults-basic-ux',
  status: 'PASS',
  basicRows: model.rows.length,
  productProfile: `${model.productDefaultProfileId}@${model.productDefaultProfileVersion}`,
  projectOverrideAuthority: gravity.evidence.authority,
  pathLevelCompositeReset: true,
  unsupportedAxisBlocked: true,
  unsupportedUnitBlocked: true,
  invalidNumbersBlocked: true,
  invalidCasesBlocked: true,
  advancedAuthorityEditorRetained: true,
  scopedDefaultEditorStillD2: true,
}, null, 2));

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
