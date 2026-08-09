#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  import.meta.url,
));
let content = readFileSync(path, 'utf8');

const helperImport = "import { resolveCaesarBendPressureStiffeningPressurePa } from './caesar-bend-pressure-authority.js';\n";
if (!content.includes(helperImport)) {
  const anchor = "import { semanticHash } from '../shared-piping-model/canonical-json.js';\n";
  const count = occurrences(content, anchor);
  if (count !== 1) throw new Error(`Expected one import anchor; found ${count}.`);
  content = content.replace(anchor, `${helperImport}${anchor}`);
}

const oldPressure = '        pressure: Number(row.PRESSURE1) * KPA_TO_PA,';
const newPressure = '        pressure: resolveCaesarBendPressureStiffeningPressurePa(row),';
if (!content.includes(newPressure)) {
  const count = occurrences(content, oldPressure);
  if (count !== 1) throw new Error(`Expected one bend P1 pressure binding; found ${count}.`);
  content = content.replace(oldPressure, newPressure);
}

if (occurrences(content, helperImport) !== 1) {
  throw new Error('Bend pressure authority import must occur exactly once.');
}
if (occurrences(content, newPressure) !== 1) {
  throw new Error('Bend pressure authority binding must occur exactly once.');
}
if (content.includes(oldPressure)) {
  throw new Error('Legacy P1-only bend pressure-stiffening binding remains after patch.');
}

writeFileSync(path, content, 'utf8');
console.log(JSON.stringify({
  patch: 'issue-947-bend-pressure-stiffening-authority',
  status: 'APPLIED',
  path,
}, null, 2));

function occurrences(text, value) {
  return text.split(value).length - 1;
}
