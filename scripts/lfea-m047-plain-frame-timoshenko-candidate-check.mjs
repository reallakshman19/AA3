#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    args.set(key, value);
  }
  const source = args.get('--source');
  if (!source) throw new TypeError('Usage: --source <patched caesar-accdb-linear-solve.js>.');
  return resolve(source);
}

const sourcePath = parseArguments(process.argv.slice(2));
const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/gu, '\n');

const requiredOnce = [
  "input.kind === 'FRAME' && teeModifier === null",
  'function plainFrameTimoshenkoProfile() {',
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  'profile: input.profile ?? frameProfile(),',
];
for (const token of requiredOnce) {
  assert.equal(source.split(token).length - 1, 1, `expected one I015 token: ${token}`);
}

assert.equal(
  source.split("profileId: 'LINEAR-FRAME-ELEMENT-R1'").length - 1,
  2,
  'Timoshenko and Euler variants must share the frozen frame profileId',
);
assert.ok(
  !source.includes('LINEAR-FRAME-ELEMENT-R1-TIMOSHENKO-COWPER-0P53'),
  'I015 must not invent a second frame profileId',
);
assert.ok(source.includes("kind: 'BEND_INCOMING_STRAIGHT'"), 'bend incoming straight kind must remain explicit');
assert.ok(source.includes("kind: 'BEND_ARC'"), 'bend arc kind must remain explicit');
assert.ok(source.includes("kind: 'RIGID'"), 'rigid kind must remain explicit');
assert.ok(source.includes("kind: 'REDUCER'"), 'reducer kind must remain explicit');
assert.ok(source.includes("straightPipeFormulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1'"), 'Euler fallback profile must remain present');
assert.ok(source.includes('shearDeformation: false'), 'Euler fallback must remain shear-disabled');
assert.ok(source.includes('phiXY: 0,'), 'gravity vector formula must be unchanged by I015');
assert.ok(source.includes('phiXZ: 0,'), 'gravity vector formula must be unchanged by I015');

const legitimatePointZeroOne = 'bendLengthErrorLimit: { value: 0.01, source: PROFILE_SOURCE },';
assert.equal(
  source.split(legitimatePointZeroOne).length - 1,
  1,
  'the frozen 0.01 bend-length conditioning authority must remain present exactly once',
);
assert.equal(
  source.split('0.01').length - 1,
  1,
  'I015 must not introduce any additional 0.01 diagnostic grouping/length threshold',
);
assert.ok(!source.includes('12.231989'), 'I015 must not carry the thermal diagnostic coefficient');

process.stdout.write('lfea-m047-plain-frame-timoshenko-candidate-check: PASS\n');
