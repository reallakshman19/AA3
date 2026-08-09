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
assert.deepEqual(authority.precedence, ['INDIVIDUAL_FILE_SETTING', 'OVERALL_SETTING']);

assert.equal(authority.overall.settings.BOURDON_PRESSURE, 'NONE');
assert.equal(authority.individualFile.settings.BOURDON_PRESSURE, 'TRANSLATION_AND_ROTATION');
assert.equal(authority.effective.BOURDON_PRESSURE, 'TRANSLATION_AND_ROTATION');
assert.deepEqual(authority.individualFile.settings.AMBIENT_TEMPERATURE, { value: 21, unit: 'C' });
assert.deepEqual(authority.effective.AMBIENT_TEMPERATURE, { value: 21, unit: 'C' });
assert.equal(authority.overall.settings.Z_AXIS_UP, 'NO');
assert.equal(authority.overall.settings.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(authority.overall.settings.DEFAULT_CODE, 'B31.3_2022');
assert.equal(authority.overall.settings.MIN_WALL_MILL_TOLERANCE_PERCENT, 12.5);
assert.equal(authority.overall.settings.APPLY_B31J_SIFS_AND_FLEX, 'DEFAULT');
assert.equal(authority.overall.settings.ENFORCE_B31J_SIFS_ONLY, false);

const requiredBindings = new Map(authority.bindings.map((entry) => [entry.setting, entry]));
assert.equal(requiredBindings.get('BOURDON_PRESSURE')?.status, 'BOUND');
assert.equal(requiredBindings.get('AMBIENT_TEMPERATURE')?.status, 'BOUND');
assert.equal(requiredBindings.get('DEFAULT_TRANS_RESTRAINT_STIFF')?.status, 'UNRESOLVED_UNIT_AND_APPLICATION');
assert.equal(requiredBindings.get('DEFAULT_ROT_RESTRAINT_STIFF')?.status, 'UNRESOLVED_UNIT_AND_APPLICATION');
assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'RECORDED_REQUIRES_FORMULATION_MAPPING');
assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3');

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
  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, false);
  assert.match(
    profile.linearSolve.b31jSmooth90FlexibilityCorrection.source,
    /BM4NL_CAESAR_SETTINGS_AUTHORITY_V1.*DOES_NOT_RESOLVE_SMOOTH90/u,
    `${profilePath}: smooth-90 must remain fail-closed because overall B31J DEFAULT is not Note-3 authority`,
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
  unresolved: authority.bindings
    .filter((entry) => entry.status.startsWith('UNRESOLVED') || entry.status.includes('REQUIRES_') || entry.status === 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3')
    .map((entry) => ({ setting: entry.setting, status: entry.status })),
  profiles: profileEvidence,
};

fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync('.work/bm4nl-caesar-settings-custody.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
