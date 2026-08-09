#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authorityPath = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';
const profilePaths = [
  'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-linear-solve.profile.json',
  'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-l20-linear-solve.profile.json',
];

const authority = readJson(authorityPath);
assert.equal(authority.schema, 'bm4nl-caesar-settings-authority/v1');
assert.equal(authority.benchmarkId, 'BM4_NL');
assert.equal(authority.caesarVersion, '14.000');
assert.deepEqual(authority.precedence, [
  'LOAD_CASE_SETTING',
  'INDIVIDUAL_FILE_SETTING',
  'MODEL_INPUT',
  'OVERALL_SETTING',
]);

assert.equal(authority.overall.settings.BOURDON_PRESSURE, 'NONE');
assert.equal(authority.individualFile.settings.BOURDON_PRESSURE, 'TRANSLATION_AND_ROTATION');
assert.equal(authority.effective.BOURDON_PRESSURE, 'TRANSLATION_AND_ROTATION');
assert.deepEqual(authority.individualFile.settings.AMBIENT_TEMPERATURE, { value: 21, unit: 'C' });
assert.deepEqual(authority.effective.AMBIENT_TEMPERATURE, { value: 21, unit: 'C' });
assert.equal(authority.overall.settings.Z_AXIS_UP, 'NO');
assert.equal(authority.overall.settings.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.modelInput.settings.COEFFICIENT_OF_FRICTION_MU, 0.3);
assert.equal(authority.loadCases.cases.L19.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.loadCases.cases.L20.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.effective.L19.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.effective.L20.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.overall.settings.DEFAULT_CODE, 'B31.3_2022');
assert.equal(authority.overall.settings.MIN_WALL_MILL_TOLERANCE_PERCENT, 12.5);
assert.equal(authority.overall.settings.DEFAULT_TRANS_RESTRAINT_STIFF, 1e12);
assert.equal(authority.overall.settings.DEFAULT_ROT_RESTRAINT_STIFF, 1e12);
assert.equal(authority.overall.settings.FRICT_STIF, 1e6);
assert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, 1);
assert.equal(authority.overall.settings.APPLY_B31J_SIFS_AND_FLEX, 'DEFAULT');
assert.equal(authority.overall.settings.ENFORCE_B31J_SIFS_ONLY, false);

const requiredBindings = new Map(authority.bindings.map((entry) => [entry.setting, entry]));
assert.equal(requiredBindings.get('BOURDON_PRESSURE')?.status, 'BOUND');
assert.equal(requiredBindings.get('AMBIENT_TEMPERATURE')?.status, 'BOUND');
assert.equal(requiredBindings.get('COEFFICIENT_OF_FRICTION_MU')?.status, 'RECORDED_MODEL_INPUT');
assert.equal(requiredBindings.get('L19.COEFFICIENT_OF_FRICTION_MU')?.status, 'BOUND_CASE_EFFECTIVE');
assert.equal(requiredBindings.get('L20.COEFFICIENT_OF_FRICTION_MU')?.status, 'BOUND_CASE_EFFECTIVE');
assert.equal(requiredBindings.get('DEFAULT_TRANS_RESTRAINT_STIFF')?.status, 'RECORDED_PENDING_SOURCE_UNIT_AUDIT');
assert.equal(requiredBindings.get('DEFAULT_ROT_RESTRAINT_STIFF')?.status, 'RECORDED_PENDING_SOURCE_UNIT_AUDIT');
assert.equal(requiredBindings.get('FRICT_STIF')?.status, 'RECORDED_NON_GOVERNING_L19_L20');
assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BOUND_MODE_PRESENT_AND_CONVERGED');
assert.equal(requiredBindings.get('BEND_LENGTH_ATTACHMENT_PERCENT')?.status, 'BOUND_GEOMETRY_TRIGGER_AUDIT_ONLY');
assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'BOUND_B31J_REQUIRED_BY_CODE');
assert.equal(requiredBindings.get('B31J_SMOOTH_90_BEND_FLEXIBILITY')?.status, 'BOUND_TRUE');

const profileEvidence = [];
for (const profilePath of profilePaths) {
  const profile = readJson(profilePath);
  assert.equal(profile.benchmarkId, 'BM4_NL');
  assert.deepEqual(profile.installationTemperature, { value: 21, unit: 'C' }, `${profilePath}: ambient/file override drift`);
  assert.equal(
    profile.linearSolve.bourdonPressureEffects.mode,
    'TRANSLATION_AND_ROTATION',
    `${profilePath}: individual-file Bourdon override must win over overall NONE`,
  );
  assert.match(
    profile.linearSolve.bourdonPressureEffects.source,
    /BM4NL_CAESAR_SETTINGS_AUTHORITY_V1.*INDIVIDUAL_FILE_OVERRIDE/u,
    `${profilePath}: Bourdon source must cite settings custody`,
  );
  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);
  assert.match(
    profile.linearSolve.b31jSmooth90FlexibilityCorrection.source,
    /CAESAR_II_V14.*B31J_REQUIRED.*SMOOTH_90/u,
    `${profilePath}: B31.3-2022 with Version-14 B31J Default must bind the B31J smooth-90 1.3/h rule`,
  );
  profileEvidence.push({
    profileId: profile.profileId,
    installationTemperature: profile.installationTemperature,
    bourdonPressureEffects: profile.linearSolve.bourdonPressureEffects,
    smooth90: profile.linearSolve.b31jSmooth90FlexibilityCorrection,
  });
}

const result = {
  check: 'lfea-issue947-caesar-settings-custody',
  status: 'PASS',
  authorityPath,
  precedence: authority.precedence,
  effective: authority.effective,
  rawConfigurationScalars: {
    defaultTransRestraintStiffness: authority.overall.settings.DEFAULT_TRANS_RESTRAINT_STIFF,
    defaultRotRestraintStiffness: authority.overall.settings.DEFAULT_ROT_RESTRAINT_STIFF,
    frictionStiffness: authority.overall.settings.FRICT_STIF,
  },
  frictionCustody: {
    overallDefaultMu: authority.overall.settings.COEFFICIENT_OF_FRICTION_MU,
    modelInputMu: authority.modelInput.settings.COEFFICIENT_OF_FRICTION_MU,
    L19EffectiveMu: authority.effective.L19.COEFFICIENT_OF_FRICTION_MU,
    L20EffectiveMu: authority.effective.L20.COEFFICIENT_OF_FRICTION_MU,
    qualification: 'L19_AND_L20_FRICTIONLESS_BY_CASE_SETTING_NOT_BY_MODEL_INPUT',
  },
  unresolved: authority.bindings
    .filter((entry) => entry.status.startsWith('UNRESOLVED') || entry.status.includes('PENDING_') || entry.status.includes('REQUIRES_') || entry.status === 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3')
    .map((entry) => ({ setting: entry.setting, status: entry.status })),
  profiles: profileEvidence,
};

fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync('.work/bm4nl-caesar-settings-custody.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
