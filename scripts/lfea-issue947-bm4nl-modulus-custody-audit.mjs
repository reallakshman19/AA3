#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const authorityPath = args.authority
  ?? 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-b31-material.authority.json';
const packagePath = args.package;
const outPath = args.out ?? '.work/bm4nl-b31-material-custody.json';
if (!packagePath) throw new TypeError('--package is required');

const authority = readJson(authorityPath);
const pkg = readJson(packagePath);
assert.equal(authority.schema, 'bm4nl-b31-material-authority/v1');
assert.equal(authority.benchmarkId, 'BM4_NL');
assert.equal(pkg.benchmarkId, 'BM4_NL');

const rows = pkg.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
assert.ok(Array.isArray(rows), 'canonical package is missing INPUT_BASIC_ELEMENT_DATA rows');
assert.equal(rows.length, authority.bm4nlFalsification.expectedElementCount);

const coldValues = uniqueNumbers(rows.map((row) => Number(row.MODULUS)));
const hotValues = uniqueNumbers(rows.map((row) => Number(row.HOT_MOD1)));
assert.deepEqual(coldValues, [authority.bm4nlFalsification.expectedModulusKPa]);
assert.deepEqual(hotValues, [authority.bm4nlFalsification.expectedModulusKPa]);
assert.deepEqual(coldValues, hotValues, 'BM4_NL Ec/Eh equality falsification precondition changed');

const source = fs.readFileSync('src/core/fea-benchmarks/caesar-accdb-linear-solve.js', 'utf8');
assert.match(source, /Number\(row\.MODULUS\)/u, 'ACCDB solver must source flexibility modulus from MODULUS/Ec');
assert.doesNotMatch(
  source,
  /caseMode\.thermal\s*\?\s*row\.HOT_MOD1\s*:\s*row\.MODULUS/u,
  'thermal-case presence must not select HOT_MOD1/Eh for B31.3 flexibility',
);
assert.match(source, /ACCDB-MAT-COLD-EC/u, 'material state evidence must identify cold Ec basis');

const result = {
  check: 'lfea-issue947-bm4nl-modulus-custody-audit',
  status: 'PASS',
  benchmarkId: authority.benchmarkId,
  code: authority.code,
  elementCount: rows.length,
  coldModulusKPa: coldValues[0],
  hotModulusKPa: hotValues[0],
  coldHotRelativeDifference: relativeDifference(coldValues[0], hotValues[0]),
  selectedSourceField: authority.flexibilityElasticModulus.accdbField,
  excludedCaseSelectorField: authority.flexibilityElasticModulus.hotFieldRetainedForCustody,
  L19Basis: authority.qualification.L19,
  L20Basis: authority.qualification.L20,
  falsification: 'EC_EQUALS_EH_FOR_PINNED_BM4NL_SO_THIS_SEMANTIC_FIX_HAS_ZERO_STIFFNESS_DELTA',
};

fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outPath}`).pathname, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function parseArgs(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i];
    const value = tokens[i + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument list near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function uniqueNumbers(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function relativeDifference(a, b) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}
