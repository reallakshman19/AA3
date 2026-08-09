#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MARKER = '        gravityWeightN: entry.gravityWeightN,';
const INSERTION = [
  '        replayFrameRecord: entry.recoveryFrame,',
  '        replayEffectiveLocalStiffness: entry.effectiveLocalStiffness,',
  MARKER,
].join('\n');

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
const before = readFileSync(sourcePath, 'utf8');
if (before.includes('replayFrameRecord: entry.recoveryFrame')) {
  process.stdout.write('M047 I013 frame-record instrumentation already present.\n');
  process.exit(0);
}
const matches = before.split(MARKER).length - 1;
if (matches !== 1) {
  throw new Error(`Expected exactly one element-ledger gravity marker; found ${matches}.`);
}
const after = before.replace(MARKER, INSERTION);
writeFileSync(sourcePath, after, 'utf8');
process.stdout.write('M047 I013 instrumented sealed frame record + effective local stiffness into the evidence ledger.\n');
