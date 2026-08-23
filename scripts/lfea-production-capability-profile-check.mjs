#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  PRODUCTION_REPRESENTABLE_COMPONENT_KINDS,
  productionAuthorizedPressureEffects,
  productionComponentIsRepresentable,
  productionComponentLimitation,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const ROOT = path.resolve('src/core/linear-piping-analysis-consumer');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

assert.equal(PRODUCTION_CAPABILITY_PROFILE.schema, PRODUCTION_CAPABILITY_PROFILE_SCHEMA);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.profileId, 'LFEA_PRODUCTION_CAPABILITY_R1');
assert.deepEqual(productionAuthorizedPressureEffects(), {
  codeStress: true,
  pressureStiffening: false,
  axialThrust: false,
  bourdon: false,
});

assert.equal(productionComponentLimitation('BEND'), 'GENERIC_APPROX_BEND_STRAIGHT_CHORD');
assert.equal(productionComponentLimitation('REDUCER'), 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION');
assert.equal(productionComponentLimitation('TEE'), 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY');
assert.equal(productionComponentLimitation('STRAIGHT_PIPE'), null);
assert.equal(productionComponentIsRepresentable('BEND'), true);
assert.equal(productionComponentIsRepresentable('REDUCER'), true);
assert.equal(productionComponentIsRepresentable('TEE'), true);
assert.equal(productionComponentIsRepresentable('STRAIGHT_PIPE'), true);
assert.equal(productionComponentIsRepresentable('RIGID'), true);
assert.equal(productionComponentIsRepresentable('UNKNOWN'), false);
assert.equal(Object.isFrozen(PRODUCTION_REPRESENTABLE_COMPONENT_KINDS), true);
assert.throws(() => PRODUCTION_REPRESENTABLE_COMPONENT_KINDS.push('UNKNOWN'), TypeError);

const bendOn = { ...PRODUCTION_CAPABILITY_PROFILE, bendExactMechanics: true };
assert.equal(productionComponentLimitation('BEND', bendOn), null);
assert.equal(productionComponentLimitation('REDUCER', bendOn), 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION');
assert.equal(productionComponentLimitation('TEE', bendOn), 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY');

const pressureOn = {
  ...PRODUCTION_CAPABILITY_PROFILE,
  pressureStiffening: true,
  pressureAxialThrust: true,
  pressureBourdon: true,
};
assert.deepEqual(productionAuthorizedPressureEffects(pressureOn), {
  codeStress: true,
  pressureStiffening: true,
  axialThrust: true,
  bourdon: true,
});

const capabilityConsumers = [
  'inputxml-feature-inventory.js',
  'generic-inputxml-solve-case.js',
  'inputxml-linear-preparation-load-authorities.js',
];
const oldPressureLiteral = /codeStress:\s*true,\s*pressureStiffening:\s*false,\s*axialThrust:\s*false,\s*bourdon:\s*false/u;
for (const relativePath of capabilityConsumers) {
  const source = read(relativePath);
  assert.doesNotMatch(source, oldPressureLiteral, `${relativePath} must not own a hardcoded pressure capability declaration.`);
  assert.match(source, /productionAuthorizedPressureEffects/u, `${relativePath} must consume the production capability profile.`);
}

const inventory = read('inputxml-feature-inventory.js');
assert.match(inventory, /productionComponentLimitation/u);
assert.match(inventory, /productionComponentIsRepresentable/u);
assert.doesNotMatch(
  inventory,
  /componentKind\s*===\s*'BEND'[\s\S]{0,300}GENERIC_APPROX_BEND_STRAIGHT_CHORD/u,
  'Component limitation ownership must remain in production-capability-profile.js.',
);

const consumerSources = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(path.join(ROOT, name), 'utf8'))
  .join('\n');

const benchmarkFor = Object.freeze({
  bendExactMechanics: 'scripts/lfea-b3.18-bm1-bend-check.mjs',
  teeExactMechanics: 'scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs',
  reducerExactMechanics: 'scripts/lfea-b3.23-reducer-condensation-check.mjs',
  pressureBourdon: 'scripts/lfea-m047-tee-rigid-thermal-check.mjs',
});
for (const [flag, benchmark] of Object.entries(benchmarkFor)) {
  if (PRODUCTION_CAPABILITY_PROFILE[flag] !== true) continue;
  assert.equal(fs.existsSync(benchmark), true, `${flag} is enabled without benchmark ${benchmark}.`);
}

if (PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics) {
  assert.match(consumerSources, /compilePipingComponent|buildBendComponent/u,
    'bendExactMechanics cannot be true until the production consumer reaches bend mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics) {
  assert.match(consumerSources, /compilePipingComponent|buildBranchComponent/u,
    'teeExactMechanics cannot be true until the production consumer reaches branch mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics) {
  assert.match(consumerSources, /compileTenCylinderReducerAuthority/u,
    'reducerExactMechanics cannot be true until the production consumer reaches reducer mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.pressureBourdon) {
  assert.match(consumerSources, /deriveMec21BendPressureFreeState/u,
    'pressureBourdon cannot be true until the production consumer reaches Bourdon mechanics.');
}

const aggregate = fs.readFileSync('scripts/linear-piping-analysis-consumer-check.mjs', 'utf8');
assert.match(
  aggregate,
  /lfea-production-capability-profile-check\.mjs/u,
  'The production capability check must remain wired into check:linear-piping-analysis-consumer.',
);

console.log('LFEA production capability profile check PASS');
