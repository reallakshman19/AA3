#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BUILD_FRAME_NEEDLE = `  const frame = input.stiffnessFrame ?? compileUnloadedFrame({\n    elementId: input.elementId,\n    axesResult,\n    material: input.material,\n    section: input.section,\n  });`;
const BUILD_FRAME_REPLACEMENT = `  const frame = input.stiffnessFrame ?? compileUnloadedFrame({\n    elementId: input.elementId,\n    axesResult,\n    material: input.material,\n    section: input.section,\n    profile: input.kind === 'FRAME' && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),\n  });`;

const COMPILE_PROFILE_NEEDLE = `    profile: frameProfile(),\n    distributedLoads: [],`;
const COMPILE_PROFILE_REPLACEMENT = `    profile: input.profile ?? frameProfile(),\n    distributedLoads: [],`;

const FRAME_PROFILE_NEEDLE = `function frameProfile() {\n  return sealFrameElementProfile({`;
const FRAME_PROFILE_REPLACEMENT = `function plainFrameTimoshenkoProfile() {\n  return sealFrameElementProfile({\n    schema: 'fea-linear-frame-element-profile/v1',\n    profileId: 'LINEAR-FRAME-ELEMENT-R1-TIMOSHENKO-COWPER-0P53',\n    straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',\n    shearDeformation: true,\n    shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },\n    shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },\n    releaseRule: 'STATIC_CONDENSATION_V1',\n    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',\n    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },\n    semanticHash: '',\n  });\n}\n\nfunction frameProfile() {\n  return sealFrameElementProfile({`;

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
  if (!source || !manifest) throw new TypeError('Usage: --source <caesar-accdb-linear-solve.js> --manifest <json>.');
  const unknown = [...args.keys()].filter((key) => !['--source', '--manifest'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { source: resolve(source), manifest: resolve(manifest) };
}

function normalized(text) { return text.replace(/\r\n/gu, '\n'); }
function count(text, needle) { return text.split(needle).length - 1; }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

const input = parseArguments(process.argv.slice(2));
const originalRaw = readFileSync(input.source, 'utf8');
let source = normalized(originalRaw);
for (const [label, needle] of [
  ['buildFrameElement compile call', BUILD_FRAME_NEEDLE],
  ['compileUnloadedFrame profile', COMPILE_PROFILE_NEEDLE],
  ['frameProfile declaration', FRAME_PROFILE_NEEDLE],
]) {
  const matches = count(source, needle);
  if (matches !== 1) throw new Error(`I015 expected exactly one ${label} baseline needle; found ${matches}.`);
}
if (source.includes('plainFrameTimoshenkoProfile')) throw new Error('I015 candidate appears to be already applied.');
source = source.replace(BUILD_FRAME_NEEDLE, BUILD_FRAME_REPLACEMENT)
  .replace(COMPILE_PROFILE_NEEDLE, COMPILE_PROFILE_REPLACEMENT)
  .replace(FRAME_PROFILE_NEEDLE, FRAME_PROFILE_REPLACEMENT);

const required = [
  "input.kind === 'FRAME' && teeModifier === null",
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  'shearDeformation: true',
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "straightPipeFormulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1'",
  'shearDeformation: false',
];
for (const token of required) if (!source.includes(token)) throw new Error(`I015 patched source is missing ${token}.`);

writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i015-candidate-manifest/v1',
  issueId: 'M047',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  originalSha256: sha256(normalized(originalRaw)),
  candidateSha256: sha256(source),
  mechanicsDelta: {
    selectedKind: 'FRAME',
    teeModifierRequiredNull: true,
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: 0.53,
    shearCorrectionFactorZ: 0.53,
    shearCorrectionAuthority: 'COWPER-1966-THIN-ANNULUS-INPUT',
    lengthCutoffApplied: false,
    bendsChanged: false,
    bendIncomingStraightsChanged: false,
    teesChanged: false,
    reducersChanged: false,
    rigidsChanged: false,
    bourdonChanged: false,
    pressureChanged: false,
    thermalAuthorityChanged: false,
    gravityLoadFormulaChanged: false,
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`M047 I015 candidate applied: ${manifest.originalSha256} -> ${manifest.candidateSha256}\n`);
