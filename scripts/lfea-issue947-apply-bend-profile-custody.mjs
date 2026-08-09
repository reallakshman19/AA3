#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  import.meta.url,
));
const before = `  const bendDefinitions = buildBendDefinitions({
    benchmarkPackage,
    sourceRows,
    sourcePositions,
    sourceSections,
    material,
  });`;
const after = `  const bendDefinitions = buildBendDefinitions({
    benchmarkPackage,
    solveProfile,
    sourceRows,
    sourcePositions,
    sourceSections,
    material,
  });`;

const text = readFileSync(target, 'utf8');
if (!text.includes(before)) {
  if (text.includes(after)) {
    console.log(JSON.stringify({ patch: 'issue-947-bend-profile-custody', status: 'ALREADY_APPLIED' }, null, 2));
    process.exit(0);
  }
  throw new Error('Expected bend-definition construction block was not found; refusing a fuzzy edit.');
}
const occurrences = text.split(before).length - 1;
if (occurrences !== 1) throw new Error(`Expected one bend-definition construction block; found ${occurrences}.`);
writeFileSync(target, text.replace(before, after));
console.log(JSON.stringify({
  patch: 'issue-947-bend-profile-custody',
  status: 'APPLIED',
  target,
  dataFlow: 'solveCase.solveProfile -> buildBendDefinitions.input.solveProfile',
  mechanicsChanged: false,
}, null, 2));
