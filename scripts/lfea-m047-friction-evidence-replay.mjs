import fs from 'node:fs';
import path from 'node:path';

import {
  replayCaesarFrictionMicroModelEvidence,
  summarizeIndependentSlidePlateauEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-evidence-measurement-replay.js';

const inputPath = requiredArg('--input');
const outputPath = optionalArg('--output');
const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let result;
if (Array.isArray(parsed)) {
  result = {
    schema: 'm047-friction-evidence-replay-result/v1',
    mode: 'SERIES',
    sourceFiles: [path.resolve(inputPath)],
    replays: parsed.map(replayCaesarFrictionMicroModelEvidence),
    slidePlateauSummary: summarizeIndependentSlidePlateauEvidence(parsed),
  };
} else {
  result = {
    schema: 'm047-friction-evidence-replay-result/v1',
    mode: 'SINGLE',
    sourceFiles: [path.resolve(inputPath)],
    replay: replayCaesarFrictionMicroModelEvidence(parsed),
  };
}

const text = `${JSON.stringify(result, null, 2)}\n`;
if (outputPath) fs.writeFileSync(outputPath, text);
else process.stdout.write(text);

function requiredArg(name) {
  const value = optionalArg(name);
  if (!value) throw new TypeError(`${name} is required.`);
  return value;
}

function optionalArg(name) {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
