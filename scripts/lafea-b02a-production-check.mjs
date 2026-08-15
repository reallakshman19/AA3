#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualifyB02RectangleCase } from './lib/lafea-b02-rectangle-qualification.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-b02-definitions/B02A-nonuniform-bending.json');
const convergencePolicy = read('validation/lafea-b02-definitions/B02E-convergence.json');
const receipt = qualifyB02RectangleCase(definition, convergencePolicy);
if (receipt.caseId !== 'B02A' || receipt.status !== 'PASS') process.exit(1);
console.log(JSON.stringify(receipt));

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
