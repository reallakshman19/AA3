#!/usr/bin/env node

/**
 * Validate reusable CAESAR configuration precedence against the real BM4_NL profile.
 * Inputs are the checked-in profile layers; outputs are resolved authority records.
 * Missing or disputed settings raise instead of falling back to inferred defaults.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CAESAR_CONFIGURATION_PRECEDENCE,
  CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
  normalizeCaesarConfigurationAuthority,
  resolveCaesarConfigurationLedger,
  resolveCaesarConfigurationSetting,
} from '../src/core/fea-benchmarks/caesar-configuration-authority.js';

const profilePath = resolve(
  'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-l20-linear-solve.profile.json',
);
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const authority = normalizeCaesarConfigurationAuthority(profile.configurationAuthority);

assert.deepEqual(authority.precedence, CAESAR_CONFIGURATION_PRECEDENCE);
assert.deepEqual(
  resolveCaesarConfigurationSetting(authority, 'BOURDON_PRESSURE', null),
  {
    setting: 'BOURDON_PRESSURE',
    caseId: null,
    level: 'INDIVIDUAL_FILE_SETTING',
    value: 'TRANSLATION_AND_ROTATION',
    source: authority.layers.individualFile.source,
  },
);
assert.deepEqual(
  resolveCaesarConfigurationSetting(authority, 'AMBIENT_TEMPERATURE', null).value,
  { value: 21, unit: 'C' },
);
assert.equal(
  resolveCaesarConfigurationSetting(authority, 'DEFAULT_TRANS_RESTRAINT_STIFF', null).value.value,
  1e12,
);
assert.equal(
  resolveCaesarConfigurationSetting(authority, 'DEFAULT_ROT_RESTRAINT_STIFF', null).value.value,
  1e12,
);
assert.equal(authority.precedenceDirection, CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION);
for (const caseId of ['L19', 'L20']) {
  // The model input is the highest-authority coefficient; a load case scales it
  // with a separate multiplier and never replaces it.
  const coefficient = resolveCaesarConfigurationSetting(
    authority,
    'COEFFICIENT_OF_FRICTION_MU',
    caseId,
  );
  assert.equal(coefficient.level, 'MODEL_INPUT');
  assert.equal(coefficient.value, 0.3);
  const multiplier = resolveCaesarConfigurationSetting(authority, 'FRICTION_MULTIPLIER', caseId);
  assert.equal(multiplier.level, 'LOAD_CASE_SETTING');
  assert.equal(multiplier.value, 0);
  assert.equal(
    resolveCaesarConfigurationSetting(authority, 'FLEXIBILITY_ELASTIC_MODULUS', caseId).value,
    'EC',
  );
  const ledger = resolveCaesarConfigurationLedger(authority, 'COEFFICIENT_OF_FRICTION_MU', caseId);
  assert.deepEqual(
    ledger.candidates.filter((entry) => entry.declared).map((entry) => entry.level),
    ['OVERALL_GLOBAL_DEFAULT', 'MODEL_INPUT'],
  );
  assert.equal(ledger.resolved.level, 'MODEL_INPUT');
}
assert.throws(
  () => resolveCaesarConfigurationSetting(authority, 'B31J_SMOOTH_90_CORRECTION', null),
  /is unresolved/u,
);
assert.throws(
  () => normalizeCaesarConfigurationAuthority({
    ...profile.configurationAuthority,
    precedence: [...CAESAR_CONFIGURATION_PRECEDENCE].reverse(),
  }),
  /precedence must be declared lowest authority first/u,
);
assert.throws(
  () => normalizeCaesarConfigurationAuthority({
    ...profile.configurationAuthority,
    precedenceDirection: 'HIGHEST_TO_LOWEST_AUTHORITY',
  }),
  /precedenceDirection must be/u,
);

process.stdout.write('CAESAR configuration authority: PASS\n');
