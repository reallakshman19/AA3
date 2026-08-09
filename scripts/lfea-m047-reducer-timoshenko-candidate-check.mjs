#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const repoRoot = args.get('--repo-root');
  const source = args.get('--source');
  const manifest = args.get('--manifest');
  if (!repoRoot || !source || !manifest) {
    throw new TypeError('Usage: --repo-root <baseline-source> --source <reducer-condensation.js> --manifest <json>.');
  }
  return { repoRoot: resolve(repoRoot), source: resolve(source), manifest: resolve(manifest) };
}

function normalized(text) { return text.replace(/\r\n/gu, '\n'); }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function close(actual, expected, label, relative = 3e-8, absolute = 1e-6) {
  const limit = Math.max(absolute, relative * Math.max(1, Math.abs(expected)));
  assert.ok(Math.abs(actual - expected) <= limit, `${label}: ${actual} != ${expected} within ${limit}`);
}
function annulus(outerDiameter, wallThickness) {
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return { innerDiameter, area, secondMoment, polarMoment: 2 * secondMoment };
}

const input = parseArguments(process.argv.slice(2));
const sourceText = normalized(readFileSync(input.source, 'utf8'));
const manifest = JSON.parse(readFileSync(input.manifest, 'utf8'));
assert.equal(manifest.schema, 'lfea-m047-i024-candidate-manifest/v1');
assert.equal(manifest.candidateSha256, sha256(sourceText));
for (const token of [
  'shearDeformation: true',
  'shearCorrectionFactorY: 0.53',
  'shearCorrectionFactorZ: 0.53',
  'phiXY: stiffnessResult.phiXY',
  'phiXZ: stiffnessResult.phiXZ',
  'const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });',
]) {
  assert.ok(sourceText.includes(token), `I024 source missing ${token}`);
}

const reducerModule = await import(pathToFileURL(resolve(input.repoRoot, 'src/core/linear-fea-reducer-condensation/index.js')).href);
const frameModule = await import(pathToFileURL(resolve(input.repoRoot, 'src/core/linear-fea-frame-element/index.js')).href);
const canonicalModule = await import(pathToFileURL(resolve(input.repoRoot, 'src/core/shared-piping-model/canonical-json.js')).href);
const {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  compileTenCylinderReducerAuthority,
  computeReducerCondensationRequestSemanticHash,
  sealReducerCondensationRequest,
} = reducerModule;
const { frameLocalStiffness, distributedLoadLocalVector, thermalInitialStrainVector } = frameModule;
const { semanticHash } = canonicalModule;

function sealedRequest(overrides = {}) {
  const base = {
    schema: REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId: 'M047-I024-UNIFORM-REDUCER',
    length: 1.5,
    fromSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
    toSection: { outerDiameter: 0.32385, wallThickness: 0.0127 },
    segmentCount: 10,
    samplingRule: REDUCER_SAMPLING_RULE,
    material: {
      elasticModulus: 200e9,
      shearModulus: 77e9,
      massDensity: 7850,
      thermalExpansionCoefficient: 12e-6,
    },
    gravity: {
      enabled: true,
      acceleration: 9.80665,
      directionLocal: [0, -1, 0],
      fluidDensity: 850,
      insulationThickness: 0.05,
      insulationDensity: 120,
    },
    thermal: { installationTemperature: 20, operatingTemperature: 220 },
    sourceEvidence: {
      sourceId: 'M047-I024-REDUCER-CONDENSATION',
      sourceRevision: '882d59a99c3a03847d20bec34770ba57ff479d91',
      sourceSemanticHash: semanticHash({ issue: 'M047', iteration: 'I024', rule: 'ten-cylinder-reducer' }),
    },
    semanticHash: '',
    ...overrides,
  };
  base.semanticHash = computeReducerCondensationRequestSemanticHash(base);
  return sealReducerCondensationRequest({ ...base, semanticHash: '' });
}

const request = sealedRequest();
const authority = compileTenCylinderReducerAuthority(request);
assert.equal(authority.segments.length, 10);
assert.equal(authority.structuralParticipation.condensedInternalStationCount, 9);
assert.equal(authority.condensed.localStiffness.length, 144);
assert.equal(authority.condensed.gravityLocalVector.length, 12);
assert.equal(authority.condensed.thermalInitialStrainLocalVector.length, 12);

const section = annulus(request.fromSection.outerDiameter, request.fromSection.wallThickness);
const directTimoshenko = frameLocalStiffness({
  elasticModulus: request.material.elasticModulus,
  shearModulus: request.material.shearModulus,
  area: section.area,
  secondMomentY: section.secondMoment,
  secondMomentZ: section.secondMoment,
  polarMoment: section.polarMoment,
  length: request.length,
  shearDeformation: true,
  shearCorrectionFactorY: 0.53,
  shearCorrectionFactorZ: 0.53,
});
const directEuler = frameLocalStiffness({
  elasticModulus: request.material.elasticModulus,
  shearModulus: request.material.shearModulus,
  area: section.area,
  secondMomentY: section.secondMoment,
  secondMomentZ: section.secondMoment,
  polarMoment: section.polarMoment,
  length: request.length,
  shearDeformation: false,
});

for (let index = 0; index < 144; index += 1) {
  close(authority.condensed.localStiffness[index], directTimoshenko.matrix[index], `uniform condensed stiffness[${index}]`, 5e-8, 2e-3);
}
for (const index of [0, 6 * 12 + 6, 3 * 12 + 3, 9 * 12 + 9]) {
  close(directTimoshenko.matrix[index], directEuler.matrix[index], `axial/torsion invariant[${index}]`, 1e-12, 1e-6);
}
assert.ok(Math.abs(directTimoshenko.matrix[1 * 12 + 1] - directEuler.matrix[1 * 12 + 1]) > 1,
  'I024 Timoshenko bending stiffness must differ materially from Euler-Bernoulli.');
assert.ok(directTimoshenko.phiXY > 0 && directTimoshenko.phiXZ > 0, 'I024 direct shear flexibility must be active.');

const metalLineWeight = request.material.massDensity * section.area * request.gravity.acceleration;
const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
const fluidLineWeight = request.gravity.fluidDensity * fluidArea * request.gravity.acceleration;
const insulatedOd = request.fromSection.outerDiameter + 2 * request.gravity.insulationThickness;
const insulationArea = Math.PI * (insulatedOd ** 2 - request.fromSection.outerDiameter ** 2) / 4;
const insulationLineWeight = request.gravity.insulationDensity * insulationArea * request.gravity.acceleration;
const lineWeight = metalLineWeight + fluidLineWeight + insulationLineWeight;
const directGravity = distributedLoadLocalVector({
  primitive: {
    kind: 'DISTRIBUTED_LOAD',
    basis: 'ELEMENT_LOCAL',
    startIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
    endIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
  },
  axes: null,
  length: request.length,
  phiXY: directTimoshenko.phiXY,
  phiXZ: directTimoshenko.phiXZ,
});
for (let index = 0; index < 12; index += 1) {
  close(authority.condensed.gravityLocalVector[index], directGravity[index], `uniform condensed gravity[${index}]`, 8e-8, 2e-5);
}

const axialStrain = request.material.thermalExpansionCoefficient
  * (request.thermal.operatingTemperature - request.thermal.installationTemperature);
const directThermal = thermalInitialStrainVector({
  elasticModulus: request.material.elasticModulus,
  area: section.area,
  axialStrain,
});
for (let index = 0; index < 12; index += 1) {
  close(authority.condensed.thermalInitialStrainLocalVector[index], directThermal[index], `uniform condensed thermal[${index}]`, 8e-8, 2e-3);
}

assert.deepEqual(compileTenCylinderReducerAuthority(request), authority, 'I024 reducer authority must remain deterministic.');
console.log(JSON.stringify({
  check: 'lfea-m047-reducer-timoshenko-candidate',
  status: 'PASS',
  candidateSha256: manifest.candidateSha256,
  uniformAuthorityHash: authority.semanticHash,
  phiXY: directTimoshenko.phiXY,
  phiXZ: directTimoshenko.phiXZ,
  gravityResultantY: authority.condensed.gravityLocalVector[1] + authority.condensed.gravityLocalVector[7],
  thermalResultantX: authority.condensed.thermalInitialStrainLocalVector[0] + authority.condensed.thermalInitialStrainLocalVector[6],
}, null, 2));
