#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const I015_SELECTION = `    profile: input.kind === 'FRAME' && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;
const I023_SELECTION = `    profile: input.kind === 'FRAME'\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;

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
  throw new Error(`I023 requires exact accepted I015 source ${EXPECTED_I015_SOURCE_SHA256}; found ${originalHash}.`);
}
if (count(original, I015_SELECTION) !== 1) {
  throw new Error(`I023 expected one accepted I015 selection site; found ${count(original, I015_SELECTION)}.`);
}
const source = original.replace(I015_SELECTION, I023_SELECTION);
if (count(source, I023_SELECTION) !== 1) throw new Error('I023 tee-FRAME selection did not materialize exactly once.');
for (const token of [
  'const condensed = condenseTeeEndConditions(',
  'baseEffectiveLocalStiffness,',
  'baseEquivalentLocal,',
  'baseInitialLocal,',
  'teeModifier,',
  'teeJunctionNodeId: teeModifier?.junctionNodeId ?? null',
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
]) {
  if (!source.includes(token)) throw new Error(`I023 patched source lost required tee/base-beam ownership token: ${token}.`);
}
writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i023-candidate-manifest/v1',
  issueId: 'M047',
  parentIteration: 'M047-I015',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  parentI015SourceSha256: originalHash,
  candidateSha256: sha256(source),
  mechanicsDelta: {
    retainedI015OrdinaryFrameShear: true,
    teeModifiedFrameShear: true,
    teeModifiedBendIncomingStraightShear: false,
    teeCondensationCodeChanged: false,
    teeDirectionalFactorAuthorityChanged: false,
    teeRigidOffsetAuthorityChanged: false,
    bendMechanicsChanged: false,
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
console.log(`M047 I023 tee-FRAME candidate applied: ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}`);
