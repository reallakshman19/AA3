#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WRC_PRIMARY_CURVE_COUNT,
  WRC_PRIMARY_SCALAR_COUNT,
  WRC_PRIMARY_CURVE_FIT_MODEL,
  WRC_PRIMARY_PDF_BLOB_SHA1,
  WRC_PRIMARY_PDF_SHA256,
  WRC_PRIMARY_EXTRACTION_BLOB_SHA1,
  parsePrimaryWrcCoefficientTables,
  parsePrimaryWrcCoefficientTablesFromPdfText,
  comparePrimaryWrcCoefficientExtractions,
} from './emp1-wrc-primary-coefficient-source-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const tables = parsePrimaryWrcCoefficientTables(markdown);
const retainedCsv = await readFile(resolve(repoRoot, 'docs/04_WRC537_NUMERICAL_TABLES.csv'), 'utf8');
const retainedCurveRows = retainedCsv.trim().split(/\r?\n/u).slice(1).filter(Boolean).length;

const pdfTextPath = readArg('--pdf-text');
let crossCheck = null;
if (pdfTextPath) {
  const pdfText = scopeSphericalHollowCoefficientText(await readFile(resolve(pdfTextPath), 'utf8'));
  const pdfTables = parsePrimaryWrcCoefficientTablesFromPdfText(pdfText);
  crossCheck = comparePrimaryWrcCoefficientExtractions(tables, pdfTables);
  if (crossCheck.status !== 'PASS') {
    console.error(JSON.stringify(crossCheck, null, 2));
    process.exit(1);
  }
  if (crossCheck.comparedScalars !== WRC_PRIMARY_SCALAR_COUNT) {
    throw new TypeError(`EMP1_WRC_PRIMARY_PDF_TEXT_SCALAR_COUNT:${crossCheck.comparedScalars}`);
  }
}

const report = {
  schema: 'emp1-pr1286-wrc-source-table-audit/v3',
  status: crossCheck?.status === 'PASS' ? 'PASS_SOURCE_AND_PDF_TEXT' : 'PASS_SOURCE_EXTRACTION_ONLY',
  source: {
    pdfBlobSha1: WRC_PRIMARY_PDF_BLOB_SHA1,
    pdfSha256: WRC_PRIMARY_PDF_SHA256,
    extractionMarkdownBlobSha1: WRC_PRIMARY_EXTRACTION_BLOB_SHA1,
  },
  curveFit: {
    model: WRC_PRIMARY_CURVE_FIT_MODEL,
    equation: 'Y=(a+cX+eX^2+gX^3+iX^4)/(1+bX+dX^2+fX^3+hX^4+jX^5)',
  },
  sourceTableCount: tables.length,
  responseCurveCount: WRC_PRIMARY_CURVE_COUNT,
  scalarCoefficientCount: WRC_PRIMARY_SCALAR_COUNT,
  retainedLegacyCurveRows: retainedCurveRows,
  retainedLegacyScalarAssumption: retainedCurveRows * 10,
  sourceVsRetainedCurveDelta: WRC_PRIMARY_CURVE_COUNT - retainedCurveRows,
  sourceVsRetainedScalarDelta: WRC_PRIMARY_SCALAR_COUNT - retainedCurveRows * 10,
  crossCheck,
  tables: tables.map((table) => ({
    figure: table.figure,
    pdfPage: table.pdfPage,
    independentVariable: table.independentVariable,
    formulaModel: table.formulaModel,
    columnCount: table.columnCount,
    responseColumnHeaders: table.responseColumnHeaders,
    scalarCoefficientCount: table.columnCount * 10,
  })),
};

console.log(JSON.stringify(report, null, 2));

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
