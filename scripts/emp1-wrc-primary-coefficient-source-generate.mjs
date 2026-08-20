#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPrimaryWrcCoefficientPackage,
  comparePrimaryWrcCoefficientExtractions,
  parsePrimaryWrcCoefficientTables,
  parsePrimaryWrcCoefficientTablesFromPdfText,
} from './emp1-wrc-primary-coefficient-source-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const tables = parsePrimaryWrcCoefficientTables(markdown);
const pdfTextPath = readArg('--pdf-text');
let pdfTextCrossCheck = null;

if (pdfTextPath) {
  const pdfText = scopeSphericalHollowCoefficientText(await readFile(resolve(pdfTextPath), 'utf8'));
  pdfTextCrossCheck = comparePrimaryWrcCoefficientExtractions(
    tables,
    parsePrimaryWrcCoefficientTablesFromPdfText(pdfText),
  );
  if (pdfTextCrossCheck.status !== 'PASS') {
    console.error(JSON.stringify(pdfTextCrossCheck, null, 2));
    process.exit(1);
  }
}

const pkg = buildPrimaryWrcCoefficientPackage(tables, { pdfTextCrossCheck });
const output = resolve(repoRoot, readArg('--output') ?? 'test-results/emp1-source-qualification/wrc537-primary-coefficients-v2.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  schema: 'emp1-wrc-primary-coefficient-generation/v2',
  status: pkg.status,
  output,
  scope: 'SPHERICAL_HOLLOW_SP_SM_ONLY',
  tableCount: pkg.tableCount,
  curveCount: pkg.curveCount,
  scalarCoefficientCount: pkg.scalarCoefficientCount,
  engineeringAuthority: pkg.engineeringAuthority,
  productionAuthority: pkg.productionAuthority,
  pdfTextCrossCheck: pkg.pdfTextCrossCheck,
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
