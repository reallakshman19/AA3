import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scaleBm4lFrictionStiffnessPackage,
} from '../src/core/fea-benchmarks/caesar-friction-sensitivity.js';

function packageFixture() {
  return Object.freeze({
    schema: 'caesar-accdb-benchmark-package/v1',
    benchmarkId: 'BM4_L',
    source: Object.freeze({ sha256: 'a'.repeat(64) }),
    profile: Object.freeze({
      configurationAuthority: Object.freeze({
        schema: 'caesar-configuration-authority/v1',
        layers: Object.freeze({
          overallGlobalDefault: Object.freeze({
            source: 'TEST',
            settings: Object.freeze({
              FRICT_STIF: Object.freeze({ value: 1e6, unit: 'DISPLAYED_CAESAR_UNITS' }),
              COEFFICIENT_OF_FRICTION_MU: 0,
            }),
          }),
          modelInput: Object.freeze({ source: 'TEST', settings: Object.freeze({ COEFFICIENT_OF_FRICTION_MU: 0.3 }) }),
          individualFile: Object.freeze({ source: 'TEST', settings: Object.freeze({}) }),
          loadCase: Object.freeze({ source: 'TEST', cases: Object.freeze({}) }),
        }),
      }),
    }),
  });
}

test('0.5x and 2x sensitivity scale only FRICT_STIF and never mutate the nominal package', () => {
  const nominal = packageFixture();
  const half = scaleBm4lFrictionStiffnessPackage(nominal, 0.5);
  const twice = scaleBm4lFrictionStiffnessPackage(nominal, 2);

  assert.equal(nominal.profile.configurationAuthority.layers.overallGlobalDefault.settings.FRICT_STIF.value, 1e6);
  assert.equal(half.profile.configurationAuthority.layers.overallGlobalDefault.settings.FRICT_STIF.value, 5e5);
  assert.equal(twice.profile.configurationAuthority.layers.overallGlobalDefault.settings.FRICT_STIF.value, 2e6);
  assert.equal(half.profile.configurationAuthority.layers.modelInput.settings.COEFFICIENT_OF_FRICTION_MU, 0.3);
  assert.equal(twice.profile.configurationAuthority.layers.modelInput.settings.COEFFICIENT_OF_FRICTION_MU, 0.3);
  assert.equal(half.source, nominal.source);
  assert.equal(twice.source, nominal.source);
  assert.equal(half.diagnosticFrictionStiffnessScale, 0.5);
  assert.equal(twice.diagnosticFrictionStiffnessScale, 2);
});

test('sensitivity rejects zero or negative stiffness multipliers', () => {
  const nominal = packageFixture();
  assert.throws(() => scaleBm4lFrictionStiffnessPackage(nominal, 0), /must be finite and positive/);
  assert.throws(() => scaleBm4lFrictionStiffnessPackage(nominal, -1), /must be finite and positive/);
});
