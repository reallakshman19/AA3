#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
const source = readFileSync(TARGET, 'utf8');

const pressurePattern = /\? closedEndPressureAxialStrain\(input\.row, frame\.material\.elasticModulus\)\s*\n\s*\* input\.pressureLengthScale/g;
const rigidPattern = /kind: 'RIGID',\s*\n\s*pressureLengthScale: 0,/g;

assert.equal([...source.matchAll(pressurePattern)].length, 1,
  'Expected exactly one generic straight pressure-strain expression.');
assert.equal([...source.matchAll(rigidPattern)].length, 1,
  'Expected exactly one rigid pressureLengthScale: 0 build site.');

let patched = source.replace(
  pressurePattern,
  `? (input.pressureAxialStrainOverride ?? (\n        closedEndPressureAxialStrain(input.row, frame.material.elasticModulus)\n        * input.pressureLengthScale))`,
);
patched = patched.replace(
  rigidPattern,
  `kind: 'RIGID',\n    pressureLengthScale: 0,\n    pressureAxialStrainOverride: (\n      (1 - 2 * Number(input.row.POISSONS))\n      * Number(input.row.PRESSURE1) * KPA_TO_PA\n      * Math.PI * physicalSection.dimensions.innerDiameter ** 2 / 4\n    ) / (materialState.elasticModulus * authority.stiffnessSection.area),`,
);

assert.notEqual(patched, source, 'Rigid Bourdon candidate patch produced no change.');
assert.match(patched, /pressureAxialStrainOverride/u, 'Pressure override was not installed.');
writeFileSync(TARGET, patched, 'utf8');
console.log('Issue 947 diagnostic rigid Bourdon production patch applied.');
