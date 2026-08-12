#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as neutral from '../src/core/shared-primitives/index.js';
import {
  LAFEA_CANONICAL_SHA256_PROFILE,
  canonicalLafeaJson,
  canonicalLafeaSha256,
} from '../src/workspace/lafea-canonical-sha256.js';
import {
  lafeaSupportedUnits,
  lafeaUnitFactor,
} from '../src/core/lafea-common-input/units.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = path.join(ROOT, 'src/core/shared-primitives');
const EXPECTED_FILES = [
  'canonical-json-sha256.js',
  'index.js',
  'units.js',
];
const EXPECTED_EXPORTS = [
  'CANONICAL_JSON_SHA256_PROFILE',
  'canonicalJson',
  'canonicalSha256',
  'supportedUnits',
  'unitFactor',
];

assert.deepEqual(fs.readdirSync(SHARED).sort(), EXPECTED_FILES);
assert.deepEqual(Object.keys(neutral).sort(), EXPECTED_EXPORTS.sort());
assert.equal(neutral.CANONICAL_JSON_SHA256_PROFILE, 'CANONICAL_JSON_SHA256_V1');
assert.equal(LAFEA_CANONICAL_SHA256_PROFILE, 'LAFEA_CANONICAL_JSON_SHA256_V1');

for (const file of EXPECTED_FILES) {
  const source = fs.readFileSync(path.join(SHARED, file), 'utf8');
  assert.doesNotMatch(source, /\bLAFEA\b|\bLFEA\b/iu, `${file} must be product-neutral`);
  assert.doesNotMatch(
    source,
    /from\s+['"][^'"]*(?:workspace|lafea|lfea|lifecycle|release|mesh|solver|comparison|controller)[^'"]*['"]/iu,
    `${file} must not import product/workflow authority`,
  );
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
    assert.ok(match[1].startsWith('./'), `${file} may import only sibling neutral primitives`);
  }
}

const specimen = {
  z: -0,
  a: [3, { beta: true, alpha: 'x' }],
  n: null,
};
const expectedCanonical = '{"a":[3,{"alpha":"x","beta":true}],"n":null,"z":0}';
assert.equal(neutral.canonicalJson(specimen), expectedCanonical);
assert.equal(canonicalLafeaJson(specimen), expectedCanonical);
const expectedDigest = `sha256:${createHash('sha256').update(expectedCanonical, 'utf8').digest('hex')}`;
assert.equal(neutral.canonicalSha256(specimen), expectedDigest);
assert.equal(canonicalLafeaSha256(specimen), expectedDigest);

const cyclic = {};
cyclic.self = cyclic;
assert.throws(() => neutral.canonicalJson(cyclic), TypeError);
assert.throws(() => neutral.canonicalJson({ value: Infinity }), TypeError);
assert.throws(() => neutral.canonicalJson(new Date()), TypeError);
const sparse = [];
sparse[1] = 1;
assert.throws(() => neutral.canonicalJson(sparse), TypeError);
const accessor = {};
Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 1 });
assert.throws(() => neutral.canonicalJson(accessor), TypeError);

const unitCases = [
  ['length', 'mm', 1], ['length', 'm', 1000],
  ['force', 'N', 1], ['force', 'kN', 1000],
  ['moment', 'N·mm', 1], ['moment', 'N*m', 1000], ['moment', 'kN*m', 1_000_000],
  ['pressure', 'Pa', 1e-6], ['pressure', 'MPa', 1],
  ['stress', 'kPa', 1e-3], ['modulus', 'GPa', 1000],
];
for (const [dimension, unit, factor] of unitCases) {
  assert.equal(neutral.unitFactor(dimension, unit), factor);
  assert.equal(lafeaUnitFactor(dimension, unit), factor);
}
assert.equal(neutral.unitFactor('temperature', 'K'), null);
assert.equal(lafeaUnitFactor('temperature', 'K'), null);
assert.deepEqual(neutral.supportedUnits('modulus'), ['MPa', 'GPa']);
assert.deepEqual(lafeaSupportedUnits('modulus'), ['MPa', 'GPa']);
assert.ok(Object.isFrozen(neutral.supportedUnits('stress')));

const canonicalWrapper = fs.readFileSync(path.join(ROOT, 'src/workspace/lafea-canonical-sha256.js'), 'utf8');
const unitsWrapper = fs.readFileSync(path.join(ROOT, 'src/core/lafea-common-input/units.js'), 'utf8');
assert.match(canonicalWrapper, /shared-primitives\/canonical-json-sha256\.js/u);
assert.match(unitsWrapper, /shared-primitives\/units\.js/u);
assert.doesNotMatch(canonicalWrapper, /function\s+sha256Hex|function\s+stringifyValue/u);
assert.doesNotMatch(unitsWrapper, /UNIT_FACTORS/u);

console.log(JSON.stringify({
  schema: 'lafea-stage15-neutral-shared-primitives-check/v1',
  check: 'lafea-stage15-neutral-shared-primitives',
  status: 'PASS',
  roadmap: 'A15',
  neutralPackage: 'src/core/shared-primitives',
  extractedPrimitives: ['canonical-json-sha256', 'unit-factors'],
  lafeaCompatibilitySurfacesPreserved: true,
  canonicalDigestParity: true,
  unitFactorParity: true,
  sharedPackageContainsLafeaAuthority: false,
  stageRegistryMovedToShared: false,
  lifecycleReleaseMovedToShared: false,
  meshT6MovedToShared: false,
  convergenceMovedToShared: false,
  resultContractsMovedToShared: false,
  comparisonMovedToShared: false,
  uiControllersMovedToShared: false,
  numericalAuthorityChanged: false,
  releaseAuthorityChanged: false,
}));
