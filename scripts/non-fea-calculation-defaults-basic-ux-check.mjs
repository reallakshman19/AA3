#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
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
assert.ok(model.rows.every((row) => row.editable === true));
assert.ok(model.rows.every((row) => row.resetAvailable === false));
const sourceAxisRow = model.rows.find((row) => row.fieldId === 'SOURCE_UP_AXIS');
assert.deepEqual(sourceAxisRow.options, ['X', 'Y', 'Z']);
assert.equal(sourceAxisRow.value, 'Z', 'Product default remains Z when no higher source/project axis exists');

const gravity = createBasicCalculationDefaultUpdate(effective, 'GRAVITY_ACCELERATION', 9.7);
assert.equal(gravity.projectDataPath, 'loadCalculation.gravityMPerS2');
assert.equal(gravity.value, 9.7);
assert.equal(gravity.evidence.source, NON_FEA_CALCULATION_DEFAULT_PROJECT_SOURCE);
assert.equal(gravity.evidence.authority, 'PROJECT_POLICY');
assert.equal(gravity.evidence.previousAuthority, 'PRODUCT_DEFAULT');
assert.equal(gravity.approved, true);

const gravityOwned = replaceProjectDataValue(
  effective,
  gravity.projectDataPath,
  gravity.value,
  gravity.evidence,
  gravity.approved,
);
const gravityOwnedRow = createBasicCalculationDefaultsModel(gravityOwned).rows
  .find((row) => row.fieldId === 'GRAVITY_ACCELERATION');
assert.equal(gravityOwnedRow.effectiveAuthority, 'PROJECT_POLICY');
assert.equal(gravityOwnedRow.editable, true);
assert.equal(gravityOwnedRow.resetAvailable, true);
const resetGravity = createBasicCalculationDefaultReset(gravityOwned, 'GRAVITY_ACCELERATION');
assert.equal(resetGravity.value, null);
assert.equal(resetGravity.evidence, null);
assert.equal(resetGravity.approved, false);

const sourceOwned = replaceProjectDataValue(
  effective,
  'loadCalculation.gravityMPerS2',
  9.81,
  { source: 'SOURCE-GRAVITY', authority: 'SOURCE_EXPLICIT' },
  true,
);
const sourceOwnedRow = createBasicCalculationDefaultsModel(sourceOwned).rows
  .find((row) => row.fieldId === 'GRAVITY_ACCELERATION');
assert.equal(sourceOwnedRow.effectiveAuthority, 'SOURCE_EXPLICIT');
assert.equal(sourceOwnedRow.editable, false,
  'Basic defaults must not overwrite higher source authority');
assert.equal(sourceOwnedRow.resetAvailable, false);
assert.throws(
  () => createBasicCalculationDefaultUpdate(sourceOwned, 'GRAVITY_ACCELERATION', 9.7),
  /cannot be overwritten/u,
);
assert.throws(
  () => createBasicCalculationDefaultReset(sourceOwned, 'GRAVITY_ACCELERATION'),
  /not owned by Basic Calculation Defaults/u,
);

const cases = createBasicCalculationDefaultUpdate(effective, 'ACTIVE_LOAD_CASES', ['HYD', 'EMPTY']);
assert.deepEqual(cases.value, ['EMPTY', 'HYD']);
const method = createBasicCalculationDefaultUpdate(effective, 'GRAVITY_METHOD', 'CHAINAGE_TRIBUTARY_SPAN_V3_COG');
assert.equal(method.value, 'CHAINAGE_TRIBUTARY_SPAN_V3_COG');

const yAxis = createBasicCalculationDefaultUpdate(effective, 'SOURCE_UP_AXIS', 'Y');
assert.equal(yAxis.value, 'Y');
assert.equal(yAxis.projectDataPath, 'sourcesAndUnits.sourceUpAxis');
assert.equal(yAxis.evidence.authority, 'PROJECT_POLICY');
const xAxis = createBasicCalculationDefaultUpdate(effective, 'SOURCE_UP_AXIS', 'X');
assert.equal(xAxis.value, 'X');

const elastic = createBasicCalculationDefaultUpdate(effective, 'ELASTIC_THERMAL', {
  elasticModulusPa: 195e9,
  thermalExpansionPerK: 11.5e-6,
});
assert.equal(elastic.projectDataPath, 'thermoMechanicalBasis.materialElasticProperties');
assert.equal(elastic.value.DEFAULT.elasticModulusPa, 195e9);
assert.equal(elastic.value.DEFAULT.thermalExpansionPerK, 11.5e-6);
assert.equal(elastic.evidence.authority, 'PROJECT_POLICY');

const elasticOwned = replaceProjectDataValue(
  effective,
  elastic.projectDataPath,
  elastic.value,
  elastic.evidence,
  elastic.approved,
);
const resetElastic = createBasicCalculationDefaultReset(elasticOwned, 'ELASTIC_THERMAL');
assert.equal(resetElastic.projectDataPath, 'thermoMechanicalBasis.materialElasticProperties');
assert.equal(resetElastic.value, null, 'reset must clear the complete Basic-owned path, not fabricate mixed per-property authority');
assert.equal(resetElastic.evidence, null);
assert.equal(resetElastic.approved, false);

const keyedElasticOwned = replaceProjectDataValue(
  effective,
  elastic.projectDataPath,
  {
    DEFAULT: elastic.value.DEFAULT,
    CLASS_A: { elasticModulusPa: 205e9, thermalExpansionPerK: 12.2e-6 },
  },
  elastic.evidence,
  elastic.approved,
);
const keyedElasticRow = createBasicCalculationDefaultsModel(keyedElasticOwned).rows
  .find((row) => row.fieldId === 'ELASTIC_THERMAL');
assert.equal(keyedElasticRow.editable, false,
  'Basic editor must not take custody of a map containing non-DEFAULT keyed values');
assert.equal(keyedElasticRow.resetAvailable, false);
assert.throws(
  () => createBasicCalculationDefaultUpdate(keyedElasticOwned, 'ELASTIC_THERMAL', {
    elasticModulusPa: 190e9,
    thermalExpansionPerK: 11e-6,
  }),
  /keyed values beyond DEFAULT/u,
);
assert.throws(
  () => createBasicCalculationDefaultReset(keyedElasticOwned, 'ELASTIC_THERMAL'),
  /keyed values beyond DEFAULT/u,
);

assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'SOURCE_UP_AXIS', 'Q'), /must be one of/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'LENGTH_UNIT', 'm'), /must be one of/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'GRAVITY_ACCELERATION', ''), /must not be blank/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'CORROSION_ALLOWANCE', ''), /must not be blank/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'RESTRAINT_PRELOAD', ''), /must not be blank/u);
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
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'ELASTIC_THERMAL', {
  elasticModulusPa: 200e9,
  thermalExpansionPerK: 0,
}), /greater than zero/u);
assert.throws(() => createBasicCalculationDefaultUpdate(effective, 'ELASTIC_THERMAL', {
  elasticModulusPa: 200e9,
  thermalExpansionPerK: '',
}), /must not be blank/u);

const [routerSource, viewSource, legacySource] = await Promise.all([
  read('../src/workspace/project-data/project-data-view.js'),
  read('../src/workspace/project-data/non-fea-calculation-defaults-view.js'),
  read('../src/workspace/project-data/non-fea-project-data-view-v2.js'),
]);
assert.match(routerSource, /renderNonFeaCalculationDefaultsView/u);
assert.doesNotMatch(routerSource, /renderNonFeaProjectDataViewV2/u,
  'normal Load Calc router must no longer point directly at the authority-heavy editor');
assert.match(viewSource, /data-role="non-fea-calculation-defaults"/u);
assert.match(viewSource, /Value[\s\S]*Unit[\s\S]*Scope[\s\S]*Effective authority[\s\S]*Basis[\s\S]*Reset/u);
assert.match(viewSource, /cannot overwrite independent higher authority/u);
assert.match(viewSource, /renderNonFeaProjectDataViewV2/u,
  'advanced authority editor must remain reachable from Calculation Defaults');
assert.match(viewSource, /data-role="calculation-defaults-scoped"/u,
  'D2 scoped configured-default authoring must remain present');
assert.doesNotMatch(viewSource, /Scope editor[\s\S]*D2 successor/u,
  'the superseded D1 D2-successor placeholder must remain absent');
assert.match(legacySource, /data-role="non-fea-configured-default-ledger"/u,
  'existing configured-default policy/ledger authority must remain intact in Advanced');

console.log(JSON.stringify({
  check: 'non-fea-calculation-defaults-basic-ux',
  status: 'PASS',
  basicRows: model.rows.length,
  productProfile: `${model.productDefaultProfileId}@${model.productDefaultProfileVersion}`,
  projectOverrideAuthority: gravity.evidence.authority,
  higherAuthorityOverwriteBlocked: true,
  destructiveKeyedMapResetBlocked: true,
  pathLevelCompositeReset: true,
  blankNumericCoercionBlocked: true,
  projectDataPositiveEngineeringLeavesPreserved: true,
  supportedAxes: sourceAxisRow.options,
  invalidAxisBlocked: true,
  unsupportedUnitBlocked: true,
  invalidNumbersBlocked: true,
  invalidCasesBlocked: true,
  advancedAuthorityEditorRetained: true,
  scopedDefaultEditorRetained: true,
}, null, 2));

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
