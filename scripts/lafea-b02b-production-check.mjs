#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualifyB02RectangleCase } from './lib/lafea-b02-rectangle-qualification.mjs';

// Promoted to the V2 oracle correction (issue #1716/#1735): the V1
// independent oracle's shear-stress sign was structurally wrong (see
// B02B-nonuniform-shear-v2.json's v2OracleCorrection). Pointing here at V2 so
// this check measures error against the corrected oracle rather than a
// demonstrably-wrong sign. A residual magnitude gap (T6/Q8 both ~6.3-6.5% at
// the frozen mesh ladder, vs the sign-flip's former ~190%+) remains under
// investigation -- see the supplementary convergence study.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-b02-definitions/B02B-nonuniform-shear-v2.json');
const convergencePolicy = read('validation/lafea-b02-definitions/B02E-convergence.json');
const receipt = qualifyB02RectangleCase(definition, convergencePolicy);
if (receipt.caseId !== 'B02B-V2' || receipt.status !== 'PASS') process.exit(1);
console.log(JSON.stringify(receipt));

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
