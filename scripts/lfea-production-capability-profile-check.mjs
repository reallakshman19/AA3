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
// Both pressure terms are true because the mechanics are implemented and
// measured, not because flags were flipped. Stiffening uses the element's
// declared pressure, so effective stiffness stays case-independent and the
// sealed stiffness custody check is unaffected.
// axialThrust is true because closed-end pressure axial strain is implemented
// in the frame-element kernel and measured against CAESAR, not because a flag
// was flipped. On BM4_L it takes the weight+pressure case from a 63.29% median
// error to 7.78% and leaves the weight-only case untouched, which is the shape
// a correct pressure term should have. See
// npm run check:lfea-production-caesar-parity.
assert.deepEqual(productionAuthorizedPressureEffects(), {
  codeStress: true,
  pressureStiffening: true,
  axialThrust: true,
  bourdon: true,
});

assert.equal(PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics, true);
// False because it measures worse in production, not because it is unbuilt.
// The mechanics are wired and authorized; the blocker is that production
// straight pipe is Euler-Bernoulli and the condensation is Timoshenko.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics, false);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureStiffening, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureAxialThrust, true);
// Bourdon is the largest single win measured so far: BM4_L's weight+pressure
// median error falls 7.62% -> 1.31% and its pass rate rises 26 points, while
// the weight-only case is byte-identical. It is an initial load, so it is
// naturally per case and touches no sealed stiffness state.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureBourdon, true);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureCodeStress, true);

assert.equal(productionComponentLimitation('BEND'), null);
assert.equal(productionComponentLimitation('TEE'), null);
assert.equal(productionComponentLimitation('REDUCER'), 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION');
assert.equal(productionComponentLimitation('STRAIGHT_PIPE'), null);

const unqualifiedBend = {
  type: 'BEND',
  meta: { bendTangentBasis: 'UNQUALIFIED' },
};
assert.equal(
  productionComponentLimitation('BEND', PRODUCTION_CAPABILITY_PROFILE, unqualifiedBend),
  'GENERIC_APPROX_BEND_STRAIGHT_CHORD',
  'Global bend capability must not clear the limitation for an unqualified source bend.',
);
const qualifiedBend = {
  type: 'BEND',
  meta: {
    bendTangentBasis: 'ACCDB_CORNER_INTERSECTION_V1',
    bendTangentStart: { x: 0, y: 0, z: 0 },
    bendTangentEnd: { x: 1, y: 1, z: 0 },
    bendArcCentre: { x: 0, y: 1, z: 0 },
    bendComputedRadius: 1,
  },
};
assert.equal(
  productionComponentLimitation('BEND', PRODUCTION_CAPABILITY_PROFILE, qualifiedBend),
  null,
);

const type3Tee = {
  startNodeId: '100',
  endNodeId: '200',
  meta: { analysis: { sifs: [{ typeCode: 3, nodeId: '200' }] } },
};
const type5Weldolet = {
  startNodeId: '100',
  endNodeId: '200',
  meta: { analysis: { sifs: [{ typeCode: 5, nodeId: '200' }] } },
};
assert.equal(productionComponentLimitation('TEE', PRODUCTION_CAPABILITY_PROFILE, type3Tee), null);
assert.equal(
  productionComponentLimitation('TEE', PRODUCTION_CAPABILITY_PROFILE, type5Weldolet),
  'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY',
  'TYPE=5 weldolets must remain outside the S6 exact tee capability.',
);

for (const kind of ['BEND', 'REDUCER', 'TEE', 'STRAIGHT_PIPE', 'RIGID']) {
  assert.equal(productionComponentIsRepresentable(kind), true, `${kind} must remain a representable component kind.`);
}
assert.equal(productionComponentIsRepresentable('UNKNOWN'), false);
assert.equal(Object.isFrozen(PRODUCTION_REPRESENTABLE_COMPONENT_KINDS), true);
assert.throws(() => PRODUCTION_REPRESENTABLE_COMPONENT_KINDS.push('UNKNOWN'), TypeError);

const capabilityConsumers = [
  'inputxml-feature-inventory.js',
  'generic-inputxml-solve-case.js',
  'inputxml-linear-preparation-load-authorities.js',
];
const oldPressureLiteral = /codeStress:\s*true,\s*pressureStiffening:\s*false,\s*axialThrust:\s*false,\s*bourdon:\s*false/u;
for (const relativePath of capabilityConsumers) {
  const source = read(relativePath);
  assert.doesNotMatch(source, oldPressureLiteral,
    `${relativePath} must not own a hardcoded pressure capability declaration.`);
  assert.match(source, /productionAuthorizedPressureEffects/u,
    `${relativePath} must consume the production capability profile.`);
}

const inventory = read('inputxml-feature-inventory.js');
assert.match(inventory, /productionComponentLimitation/u);
assert.match(inventory, /productionComponentIsRepresentable/u);

const consumerSources = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith('.js'))
  .sort(compareAscii)
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
  assert.match(consumerSources, /compileInputXmlProductionBendComponents/u,
    'bendExactMechanics cannot be true until governed production reaches bend mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics) {
  assert.match(consumerSources, /compileInputXmlProductionBranchModifiers/u,
    'teeExactMechanics cannot be true until governed production reaches TYPE=3 branch mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics) {
  assert.match(consumerSources, /compileTenCylinderReducerAuthority/u,
    'reducerExactMechanics cannot be true until governed production reaches reducer mechanics.');
}
if (PRODUCTION_CAPABILITY_PROFILE.pressureBourdon) {
  assert.match(consumerSources, /deriveMec21BendPressureFreeState/u,
    'pressureBourdon cannot be true until governed production reaches Bourdon mechanics.');
}

const aggregate = fs.readFileSync('scripts/linear-piping-analysis-consumer-check.mjs', 'utf8');
assert.match(
  aggregate,
  /lfea-production-capability-profile-check\.mjs/u,
  'The production capability check must remain wired into check:linear-piping-analysis-consumer.',
);

console.log('LFEA production capability profile check PASS');

function compareAscii(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
