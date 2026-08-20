#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WRC_PRIMARY_CURVE_COUNT,
  WRC_PRIMARY_SCALAR_COUNT,
  buildPrimaryWrcCoefficientPackage,
  comparePrimaryWrcCoefficientExtractions,
  evaluateWrcPrimaryRationalCurve,
  parsePrimaryWrcCoefficientTables,
  parsePrimaryWrcCoefficientTablesFromPdfText,
} from './emp1-wrc-primary-coefficient-source-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const tables = parsePrimaryWrcCoefficientTables(markdown);

assert.equal(tables.length, 20);
assert.equal(tables.reduce((sum, table) => sum + table.columnCount, 0), WRC_PRIMARY_CURVE_COUNT);
assert.equal(tables.reduce((sum, table) => sum + table.columnCount * 10, 0), WRC_PRIMARY_SCALAR_COUNT);

const extractionOnly = buildPrimaryWrcCoefficientPackage(tables);
assert.equal(extractionOnly.status, 'BLOCKED_PDF_TEXT_CROSS_CHECK_NOT_RUN');
assert.equal(extractionOnly.engineeringAuthority, false);
assert.equal(extractionOnly.curveCount, 115);
assert.equal(extractionOnly.scalarCoefficientCount, 1150);

const firstCurve = extractionOnly.curves.find((curve) => curve.figure === 'SP-1' && curve.responseColumnIndex === 1);
assert(firstCurve, 'SP-1 first response curve missing');
const x = 0.25;
const got = evaluateWrcPrimaryRationalCurve(firstCurve.coefficients, x);
const c = Object.fromEntries(firstCurve.coefficients.map((row) => [row.coefficientName, row.value]));
const expectedNumerator = c.a + c.c*x + c.e*x**2 + c.g*x**3 + c.i*x**4;
const expectedDenominator = 1 + c.b*x + c.d*x**2 + c.f*x**3 + c.h*x**4 + c.j*x**5;
assert.equal(got.numerator, expectedNumerator);
assert.equal(got.denominator, expectedDenominator);
assert.equal(got.y, expectedNumerator / expectedDenominator);

const zeroDenominator = [
  ['a', 1], ['b', -1], ['c', 0], ['d', 0], ['e', 0],
  ['f', 0], ['g', 0], ['h', 0], ['i', 0], ['j', 0],
].map(([coefficientName, value]) => ({ coefficientName, value }));
assert.throws(() => evaluateWrcPrimaryRationalCurve(zeroDenominator, 1), /EMP1_WRC_CURVE_DENOMINATOR_INVALID/u);

const pdfTextPath = readArg('--pdf-text');
let pdfTextCrossCheck = null;
let qualifiedPackage = null;
if (pdfTextPath) {
  const pdfText = scopeSphericalHollowCoefficientText(await readFile(resolve(pdfTextPath), 'utf8'));
  const pdfTables = parsePrimaryWrcCoefficientTablesFromPdfText(pdfText);
  pdfTextCrossCheck = comparePrimaryWrcCoefficientExtractions(tables, pdfTables);
  assert.equal(pdfTextCrossCheck.status, 'PASS');
  assert.equal(pdfTextCrossCheck.comparedTables, 20);
  assert.equal(pdfTextCrossCheck.comparedCurves, 115);
  assert.equal(pdfTextCrossCheck.comparedScalars, 1150);

  const mutated = structuredClone(pdfTables);
  mutated[0].coefficientRows[0].values[0] += 1;
  const mutationAudit = comparePrimaryWrcCoefficientExtractions(tables, mutated);
  assert.equal(mutationAudit.status, 'FAIL');
  assert(mutationAudit.failures.some((row) => row.code === 'COEFFICIENT_VALUE_MISMATCH'));

  qualifiedPackage = buildPrimaryWrcCoefficientPackage(tables, { pdfTextCrossCheck });
  assert.equal(qualifiedPackage.status, 'PASS_SOURCE_TRANSCRIPTION');
  assert.equal(qualifiedPackage.engineeringAuthority, true);
  assert.equal(qualifiedPackage.productionAuthority, false);
  assert.equal(qualifiedPackage.curves.length, 115);
  assert.equal(qualifiedPackage.curves.flatMap((curve) => curve.coefficients).length, 1150);
  assert(qualifiedPackage.curves.every((curve) => curve.coefficients.every((row) => row.pdfTextVerified === true)));
}

console.log(JSON.stringify({
  schema: 'emp1-wrc-primary-coefficient-source-self-test/v2',
  status: 'PASS',
  sourceInventory: { tableCount: 20, curveCount: 115, scalarCount: 1150 },
  rationalEvaluationProof: {
    figure: 'SP-1',
    responseColumn: firstCurve.responseColumn,
    x,
    numerator: got.numerator,
    denominator: got.denominator,
    y: got.y,
  },
  pdfTextCrossCheck,
  qualifiedPackageStatus: qualifiedPackage?.status ?? 'NOT_RUN',
  negativeProofs: [
    'DENOMINATOR_ZERO_REJECTED',
    ...(pdfTextPath ? ['ONE_SCALAR_PDF_TEXT_MUTATION_REJECTED'] : []),
  ],
  authorityNote: 'PASS_SOURCE_TRANSCRIPTION qualifies the spherical-hollow SP/SM transcription only. Complete WRC scope, runtime selection, and benchmark authorization are separate gates.',
}, null, 2));

function scopeSphericalHollowCoefficientText(text) {
  const source = String(text ?? '').replace(/\r/gu, '');
  const start = source.indexOf('Curve Fit Coefficients for Figure SP-1');
  if (start < 0) throw new TypeError('EMP1_WRC_PDF_TEXT_SP1_BOUNDARY_MISSING');
  const afterSm10 = source.indexOf('Curve Fit Coefficients for Figure 1A', start);
  if (afterSm10 < 0) throw new TypeError('EMP1_WRC_PDF_TEXT_CYLINDRICAL_BOUNDARY_MISSING');
  return source.slice(start, afterSm10);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}
