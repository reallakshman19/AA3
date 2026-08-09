#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OLD_STIFFNESS = `    const stiffness = frameLocalStiffness({\n      elasticModulus: accepted.material.elasticModulus,\n      shearModulus: accepted.material.shearModulus,\n      area: section.area,\n      secondMomentY: section.secondMomentY,\n      secondMomentZ: section.secondMomentZ,\n      polarMoment: section.polarMoment,\n      length: segmentLength,\n      shearDeformation: false,\n    }).matrix;\n    addElementMatrix(K, stiffness, index, index + 1);`;

const NEW_STIFFNESS = `    const stiffnessResult = frameLocalStiffness({\n      elasticModulus: accepted.material.elasticModulus,\n      shearModulus: accepted.material.shearModulus,\n      area: section.area,\n      secondMomentY: section.secondMomentY,\n      secondMomentZ: section.secondMomentZ,\n      polarMoment: section.polarMoment,\n      length: segmentLength,\n      shearDeformation: true,\n      shearCorrectionFactorY: 0.53,\n      shearCorrectionFactorZ: 0.53,\n    });\n    const stiffness = stiffnessResult.matrix;\n    addElementMatrix(K, stiffness, index, index + 1);`;

const OLD_LOAD_PHI = `      phiXY: 0,\n      phiXZ: 0,`;
const NEW_LOAD_PHI = `      phiXY: stiffnessResult.phiXY,\n      phiXZ: stiffnessResult.phiXZ,`;

function normalized(text) { return text.replace(/\r\n/gu, '\n'); }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function count(text, needle) { return text.split(needle).length - 1; }

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const source = args.get('--source');
  const manifest = args.get('--manifest');
  if (!source || !manifest) throw new TypeError('Usage: --source <reducer-condensation.js> --manifest <json>.');
  return { source: resolve(source), manifest: resolve(manifest) };
}

const input = parseArguments(process.argv.slice(2));
const original = normalized(readFileSync(input.source, 'utf8'));
if (count(original, OLD_STIFFNESS) !== 1) {
  throw new Error(`I024 expected one Euler-Bernoulli reducer cylinder stiffness site; found ${count(original, OLD_STIFFNESS)}.`);
}
if (count(original, OLD_LOAD_PHI) !== 1) {
  throw new Error(`I024 expected one reducer consistent-load phi site; found ${count(original, OLD_LOAD_PHI)}.`);
}

let source = original.replace(OLD_STIFFNESS, NEW_STIFFNESS);
source = source.replace(OLD_LOAD_PHI, NEW_LOAD_PHI);

for (const token of [
  'shearDeformation: true',
  'shearCorrectionFactorY: 0.53',
  'shearCorrectionFactorZ: 0.53',
  'phiXY: stiffnessResult.phiXY',
  'phiXZ: stiffnessResult.phiXZ',
  'const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });',
]) {
  if (!source.includes(token)) throw new Error(`I024 patched reducer source is missing ${token}.`);
}
if (source.includes(OLD_STIFFNESS) || source.includes(OLD_LOAD_PHI)) {
  throw new Error('I024 reducer source still contains an unpatched governed site.');
}

writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i024-candidate-manifest/v1',
  issueId: 'M047',
  parentIteration: 'M047-I015',
  sourcePath: 'src/core/linear-fea-reducer-condensation/reducer-condensation.js',
  originalReducerSha256: sha256(original),
  candidateSha256: sha256(source),
  mechanicsDelta: {
    retainedI015OrdinaryFrameShear: true,
    reducerInternalCylinderShear: true,
    reducerSegmentCountChanged: false,
    reducerSamplingChanged: false,
    reducerCondensationChanged: false,
    reducerGravityAuthorityChanged: false,
    reducerThermalStrainAuthorityChanged: false,
    reducerPublicRecoveryChanged: false,
    bendMechanicsChanged: false,
    teeMechanicsChanged: false,
    rigidMechanicsChanged: false,
    bourdonChanged: false,
    pressureLoadChanged: false,
    thermalExpansionAuthorityChanged: false,
    toleranceChanged: false,
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: 0.53,
    shearCorrectionFactorZ: 0.53,
    shearCorrectionAuthority: 'COWPER-1966-THIN-ANNULUS-INPUT',
    loadInterpolationRule: 'SAME_CYLINDER_PHI_AS_STIFFNESS_BEFORE_SCHUR_CONDENSATION',
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`M047 I024 reducer candidate applied: ${manifest.originalReducerSha256} -> ${manifest.candidateSha256}`);
