#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HOT_MODULUS_NEEDLE = "  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(caseMode.thermal ? row.HOT_MOD1 : row.MODULUS)));";
const COLD_MODULUS_REPLACEMENT = "  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(row.MODULUS)));";

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

const matches = count(source, HOT_MODULUS_NEEDLE);
if (matches !== 1) {
  throw new Error(`I016 expected exactly one thermal HOT_MOD1 flexibility-selection needle; found ${matches}.`);
}
if (source.includes(COLD_MODULUS_REPLACEMENT)) {
  throw new Error('I016 candidate appears to be already applied.');
}

source = source.replace(HOT_MODULUS_NEEDLE, COLD_MODULUS_REPLACEMENT);

for (const token of [
  COLD_MODULUS_REPLACEMENT,
  "thermalExpansionCoefficient: solveProfile.thermalExpansionCoefficientPerKelvin",
  "caseMode.thermal ? 'HOT1' : 'AMBIENT'",
  "input.kind === 'FRAME' && teeModifier === null",
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
]) {
  if (!source.includes(token)) throw new Error(`I016 patched source is missing required retained token ${token}.`);
}
if (source.includes(HOT_MODULUS_NEEDLE)) throw new Error('I016 HOT_MOD1 flexibility selection remains active.');

writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i016-candidate-manifest/v1',
  issueId: 'M047',
  iterationId: 'M047-I016',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  originalSha256: sha256(normalized(originalRaw)),
  candidateSha256: sha256(source),
  mechanicsDelta: {
    activePipingCodeFamily: 'ASME_B31_3',
    flexibilityElasticModulusField: 'MODULUS',
    rejectedFlexibilityElasticModulusFieldForB31_3: 'HOT_MOD1',
    authority: 'HEXAGON_CAESAR_II_FAC_FBDR_ONLY_PIPING_CODE_USING_HOT_MODULUS_IN_FLEXIBILITY_ANALYSIS',
    thermalExpansionCoefficientChanged: false,
    temperatureAssignmentChanged: false,
    pressureChanged: false,
    bourdonChanged: false,
    gravityChanged: false,
    frameShearChanged: false,
    bendsChanged: false,
    teesChanged: false,
    reducersChanged: false,
    rigidsChanged: false,
    tolerancesChanged: false,
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`M047 I016 cold-modulus candidate applied: ${manifest.originalSha256} -> ${manifest.candidateSha256}\n`);
