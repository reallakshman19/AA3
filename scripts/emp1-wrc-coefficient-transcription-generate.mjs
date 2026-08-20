#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditWrcCoefficientTranscription,
  buildWrcCoefficientTranscriptionTemplate,
} from './emp1-wrc-coefficient-transcription-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourcePath = resolve(repoRoot, 'docs/04_WRC537_NUMERICAL_TABLES.csv');
const outPath = resolve(repoRoot, readArg('--out') ?? 'test-results/emp1-source-qualification/wrc537-coefficient-transcription-template-v1.json');

const numericalCsv = await readFile(sourcePath, 'utf8');
const template = buildWrcCoefficientTranscriptionTemplate(numericalCsv);
const audit = auditWrcCoefficientTranscription(template);

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  schema: 'emp1-wrc-coefficient-transcription-generation/v1',
  status: audit.structuralStatus === 'PASS' && audit.qualificationStatus === 'BLOCKED' ? 'PASS_EXPECTED_BLOCKED' : 'FAIL',
  output: outPath,
  audit,
}, null, 2));

if (audit.structuralStatus !== 'PASS') process.exit(1);
if (audit.qualificationStatus !== 'BLOCKED') {
  console.error('EMP1_WRC_TRANSCRIPTION_TEMPLATE_MUST_REMAIN_BLOCKED_WITHOUT_PRIMARY_VALUES');
  process.exit(1);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}
