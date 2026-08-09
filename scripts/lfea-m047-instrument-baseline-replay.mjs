#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASELINE_COMMIT = '882d59a99c3a03847d20bec34770ba57ff479d91';
const MARKER = `        gravityWeightN: entry.gravityWeightN,\n      })),`;
const REPLACEMENT = `        gravityWeightN: entry.gravityWeightN,\n        replayElementContribution: Object.freeze({\n          globalStiffness: Object.freeze([...entry.contribution.globalStiffness]),\n          equivalentLoadGlobal: Object.freeze([...entry.contribution.equivalentLoadGlobal]),\n          initialStrainLoadGlobal: Object.freeze([...entry.contribution.initialStrainLoadGlobal]),\n        }),\n      })),`;

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

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
  return { source: resolve(source), manifest: resolve(manifest) };
}

const input = parseArguments(process.argv.slice(2));
const before = readFileSync(input.source, 'utf8');
const occurrences = before.split(MARKER).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one baseline element-ledger instrumentation marker; found ${occurrences}.`);
}
if (before.includes('replayElementContribution')) {
  throw new Error('Baseline source is already instrumented for replay.');
}
const after = before.replace(MARKER, REPLACEMENT);
if (after === before) throw new Error('Replay instrumentation did not change the baseline source.');
writeFileSync(input.source, after, 'utf8');

const manifest = {
  schema: 'lfea-m047-baseline-replay-instrumentation/v1',
  baselineCommit: BASELINE_COMMIT,
  changedPath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  purpose: 'EVIDENCE_ONLY_ELEMENT_CONTRIBUTION_LEDGER',
  numericalExecutionChanged: false,
  originalSourceSha256: sha256(before),
  instrumentedSourceSha256: sha256(after),
  addedFields: [
    'replayElementContribution.globalStiffness',
    'replayElementContribution.equivalentLoadGlobal',
    'replayElementContribution.initialStrainLoadGlobal',
  ],
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`M047 baseline replay instrumentation: ${manifest.originalSourceSha256} -> ${manifest.instrumentedSourceSha256}\n`);
