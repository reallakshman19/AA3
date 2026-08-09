#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const I015_SELECTION = `    profile: input.kind === 'FRAME' && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;
const I021_SELECTION = `    profile: (input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')\n      && teeModifier === null\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;

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
  if (!source || !manifest) throw new TypeError('Usage: --source <caesar-accdb-linear-solve.js> --manifest <json>.');
  const unknown = [...args.keys()].filter((key) => !['--source', '--manifest'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { source: resolve(source), manifest: resolve(manifest) };
}

const input = parseArguments(process.argv.slice(2));
const originalRaw = readFileSync(input.source, 'utf8');
const original = normalized(originalRaw);
const originalHash = sha256(original);
if (originalHash !== EXPECTED_I015_SOURCE_SHA256) {
  throw new Error(`I021 requires the exact accepted I015 solver source ${EXPECTED_I015_SOURCE_SHA256}; found ${originalHash}.`);
}
if (count(original, I015_SELECTION) !== 1) {
  throw new Error(`I021 expected exactly one accepted I015 selection boundary; found ${count(original, I015_SELECTION)}.`);
}
if (original.includes(I021_SELECTION)) throw new Error('I021 candidate appears to be already applied.');

const source = original.replace(I015_SELECTION, I021_SELECTION);
const required = [
  "(input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')",
  '&& teeModifier === null',
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  'shearDeformation: true',
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "kind: 'BEND_ARC'",
  'stiffnessFrame: componentEntry.frameElement',
  'effectiveLocalStiffness: componentEntry.effectiveLocalStiffness',
  'effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness',
];
for (const token of required) if (!source.includes(token)) throw new Error(`I021 patched source is missing ${token}.`);
if (source.includes("input.kind === 'BEND_ARC'") && source.includes('plainFrameTimoshenkoProfile')) {
  const selectionStart = source.indexOf('profile: (input.kind');
  const selectionEnd = source.indexOf('frameProfile(),', selectionStart);
  const selection = source.slice(selectionStart, selectionEnd);
  if (selection.includes('BEND_ARC')) throw new Error('I021 selection boundary leaked into BEND_ARC.');
}

writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i021-candidate-manifest/v1',
  issueId: 'M047',
  parentIteration: 'M047-I015',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  parentI015SourceSha256: originalHash,
  candidateSha256: sha256(source),
  mechanicsDelta: {
    retainedI015SelectedKind: 'FRAME',
    additionallySelectedKind: 'BEND_INCOMING_STRAIGHT',
    teeModifierRequiredNull: true,
    formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearCorrectionFactorY: 0.53,
    shearCorrectionFactorZ: 0.53,
    shearCorrectionAuthority: 'COWPER-1966-THIN-ANNULUS-INPUT',
    bendIncomingStraightsChanged: true,
    teeModifiedBendIncomingStraightsChanged: false,
    bendArcsChanged: false,
    teesChanged: false,
    reducersChanged: false,
    rigidsChanged: false,
    bourdonChanged: false,
    pressureChanged: false,
    thermalAuthorityChanged: false,
    gravityLoadFormulaChanged: false,
    toleranceChanged: false,
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`M047 I021 candidate applied: ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}\n`);
