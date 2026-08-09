#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const I015_SELECTION = `    profile: input.kind === 'FRAME' && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;
const I022_SELECTION = `    profile: (input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')\n      && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;
const I015_BEND_PROFILE = `      section,\n      frameElementProfile: frameProfile(),\n      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,\n      referenceVector: null,\n      factorSet: factorResult.componentFactorSet,`;
const I022_BEND_PROFILE = `      section,\n      frameElementProfile: plainFrameTimoshenkoProfile(),\n      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,\n      referenceVector: null,\n      factorSet: factorResult.componentFactorSet,`;

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
  if (!source || !manifest) throw new TypeError('Usage: --source <solver.js> --manifest <json>.');
  return { source: resolve(source), manifest: resolve(manifest) };
}

const input = parseArguments(process.argv.slice(2));
const original = normalized(readFileSync(input.source, 'utf8'));
const originalHash = sha256(original);
if (originalHash !== EXPECTED_I015_SOURCE_SHA256) {
  throw new Error(`I022 requires exact accepted I015 source ${EXPECTED_I015_SOURCE_SHA256}; found ${originalHash}.`);
}
if (count(original, I015_SELECTION) !== 1) {
  throw new Error(`I022 expected one I015 analysis-carrier selection; found ${count(original, I015_SELECTION)}.`);
}
if (count(original, I015_BEND_PROFILE) !== 1) {
  throw new Error(`I022 expected one bend component base-frame profile site; found ${count(original, I015_BEND_PROFILE)}.`);
}

let source = original.replace(I015_SELECTION, I022_SELECTION);
source = source.replace(I015_BEND_PROFILE, I022_BEND_PROFILE);
if (count(source, I022_SELECTION) !== 1 || count(source, I022_BEND_PROFILE) !== 1) {
  throw new Error('I022 patched source does not contain the two exact governed ownership changes.');
}

for (const token of [
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  'shearDeformation: true',
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "componentType: 'BEND'",
  'factorSet: factorResult.componentFactorSet',
  'stiffnessFrame: componentEntry.frameElement',
  'effectiveLocalStiffness: componentEntry.effectiveLocalStiffness',
  'effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness',
]) {
  if (!source.includes(token)) throw new Error(`I022 patched source is missing ${token}.`);
}

writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i022-candidate-manifest/v1',
  issueId: 'M047',
  parentIteration: 'M047-I015',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  parentI015SourceSha256: originalHash,
  candidateSha256: sha256(source),
  mechanicsDelta: {
    retainedI015OrdinaryFrameShear: true,
    nonTeeBendIncomingStraightShear: true,
    teeModifiedBendIncomingStraightShear: false,
    bendArcBaseFrameShear: true,
    bendFlexibilityFactorCalculationChanged: false,
    bendFlexibilityCorrectionCodeChanged: false,
    bendPressureStiffeningChanged: false,
    bendSubdivisionChanged: false,
    teeMechanicsChanged: false,
    reducerMechanicsChanged: false,
    rigidMechanicsChanged: false,
    bourdonChanged: false,
    pressureLoadChanged: false,
    thermalAuthorityChanged: false,
    gravityLoadChanged: false,
    toleranceChanged: false,
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: 0.53,
    shearCorrectionFactorZ: 0.53,
    shearCorrectionAuthority: 'COWPER-1966-THIN-ANNULUS-INPUT',
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`M047 I022 bend-composite candidate applied: ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}`);
