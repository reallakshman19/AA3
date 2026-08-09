#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/index.js';

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.out) {
  throw new TypeError('Usage: node scripts/lfea-issue947-bourdon-mode-diagnostics.mjs --package <json> --out <json>');
}
const baselinePackage = JSON.parse(readFileSync(args.package, 'utf8'));
const modes = ['DISABLED', 'TRANSLATION_ONLY', 'TRANSLATION_AND_ROTATION'];
const solved = Object.fromEntries(modes.map((mode) => {
  const candidate = cloneWithMode(baselinePackage, mode);
  const result = solveCaesarAccdbLinearBenchmark(candidate);
  return [mode, extract(result.cases.L19.rows)];
}));

const reference = extract(baselinePackage.references.L19.rows);
const output = {
  schema: 'lfea-issue947-bourdon-mode-diagnostics/v1',
  sourceAccdbSha256: baselinePackage.source.sha256,
  caseId: 'L19',
  formula: baselinePackage.cases.find((entry) => entry.caseId === 'L19')?.formula ?? null,
  reference,
  modes: solved,
  deltas: {
    translationOnlyMinusDisabled: difference(solved.TRANSLATION_ONLY, solved.DISABLED),
    translationAndRotationMinusDisabled: difference(solved.TRANSLATION_AND_ROTATION, solved.DISABLED),
    translationAndRotationMinusTranslationOnly: difference(solved.TRANSLATION_AND_ROTATION, solved.TRANSLATION_ONLY),
  },
  interpretationGuard: [
    'DISABLED preserves pressure-stiffened bend stiffness because INPUT pressure is unchanged; it removes Bourdon displacement loads only.',
    'TRANSLATION_ONLY and TRANSLATION_AND_ROTATION use the current adapter semantics and are diagnostics, not assertions that either bend translation implementation matches CAESAR.',
    'No reference values are used by the solve or by any update rule.',
  ],
};
writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function cloneWithMode(value, mode) {
  const clone = structuredClone(value);
  clone.profile.linearSolve.bourdonPressureEffects.mode = mode;
  clone.profile.linearSolve.bourdonPressureEffects.source = `ISSUE_947_DIAGNOSTIC_${mode}`;
  return clone;
}

function extract(rows) {
  const wanted = [
    ['NODE', '20090', 'FORCE', 'UY'],
    ['NODE', '20090', 'ROTATION', 'RZ'],
    ['NODE', '20120', 'ROTATION', 'RZ'],
    ['ELEMENT', 'INPUT_ELEMENT:4|20030->20090|', 'GLOBAL_END_FORCE_TO', 'FY'],
    ['ELEMENT', 'INPUT_ELEMENT:4|20030->20090|', 'GLOBAL_END_MOMENT_TO', 'MZ'],
    ['ELEMENT', 'INPUT_ELEMENT:5|20090->20120|', 'GLOBAL_END_FORCE_FROM', 'FY'],
    ['ELEMENT', 'INPUT_ELEMENT:5|20090->20120|', 'GLOBAL_END_MOMENT_FROM', 'MZ'],
    ['ELEMENT', 'INPUT_ELEMENT:5|20090->20120|', 'GLOBAL_END_FORCE_TO', 'FY'],
    ['ELEMENT', 'INPUT_ELEMENT:5|20090->20120|', 'GLOBAL_END_MOMENT_TO', 'MZ'],
    ['ELEMENT', 'INPUT_ELEMENT:6|20120->20130|', 'GLOBAL_END_FORCE_FROM', 'FY'],
    ['ELEMENT', 'INPUT_ELEMENT:6|20120->20130|', 'GLOBAL_END_MOMENT_FROM', 'MZ'],
  ];
  const index = new Map(rows.map((row) => [key(row), row]));
  return Object.fromEntries(wanted.map(([entityKind, entityId, quantity, component]) => {
    const row = index.get(`${entityKind}|${entityId}|${quantity}|${component}`);
    return [`${entityKind}:${entityId}:${quantity}:${component}`, row?.value ?? null];
  }));
}

function difference(left, right) {
  return Object.fromEntries(Object.keys(left).map((key) => [
    key,
    left[key] === null || right[key] === null ? null : left[key] - right[key],
  ]));
}

function key(row) {
  return `${row.entityKind}|${row.entityId}|${row.quantity}|${row.component}`;
}

function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const name = token.slice(2);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for --${name}.`);
    result[name] = value;
    index += 1;
  }
  return result;
}
