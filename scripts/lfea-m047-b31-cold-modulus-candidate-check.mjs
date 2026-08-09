#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  if (!source) throw new TypeError('Usage: --source <caesar-accdb-linear-solve.js>.');
  const unknown = [...args.keys()].filter((key) => key !== '--source');
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return resolve(source);
}

const sourcePath = parseArguments(process.argv.slice(2));
const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/gu, '\n');
const required = [
  "  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(row.MODULUS)));",
  "thermalExpansionCoefficient: solveProfile.thermalExpansionCoefficientPerKelvin",
  "input.kind === 'FRAME' && teeModifier === null",
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`I016 candidate boundary is missing ${token}.`);
}
const prohibited = [
  "Number(caseMode.thermal ? row.HOT_MOD1 : row.MODULUS)",
];
for (const token of prohibited) {
  if (source.includes(token)) throw new Error(`I016 candidate still contains prohibited hot-modulus flexibility selection ${token}.`);
}

const coldSelectionCount = source.split("const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(row.MODULUS)));" ).length - 1;
if (coldSelectionCount !== 1) throw new Error(`I016 expected exactly one cold-modulus flexibility selection; found ${coldSelectionCount}.`);

process.stdout.write('M047 I016 cold-modulus candidate boundary PASS\n');
