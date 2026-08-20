#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourcePath = resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md');
const text = await readFile(sourcePath, 'utf8');

const COEFFICIENTS = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);
const EXPECTED_FIGURES = Object.freeze([
  ...Array.from({ length: 10 }, (_, i) => `SP-${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `SM-${i + 1}`),
]);
const EXPECTED_FORMULA_NORMALIZED = normalizeFormula(
  'Y=(a+cX+eX^2+gX^3+iX^4)/(1+bX+dX^2+fX^3+hX^4+jX^5)',
);

const tables = parseSourceTables(text);
const byFigure = new Map(tables.map((row) => [row.figure, row]));

assert.equal(tables.length, EXPECTED_FIGURES.length, 'expected exactly 20 SP/SM source tables');
for (const figure of EXPECTED_FIGURES) {
  assert(byFigure.has(figure), `missing source coefficient table ${figure}`);
}
assert.equal(byFigure.size, tables.length, 'duplicate figure headings are not permitted');

let responseCurveCount = 0;
let scalarCoefficientCount = 0;
for (const table of tables) {
  assert.equal(table.coefficientRows.length, 10, `${table.figure}: expected a..j rows`);
  assert.deepEqual(table.coefficientRows.map((row) => row.name), COEFFICIENTS, `${table.figure}: coefficient names/order`);
  assert(table.columnCount > 0, `${table.figure}: at least one response column required`);
  for (const row of table.coefficientRows) {
    assert.equal(row.values.length, table.columnCount, `${table.figure}/${row.name}: inconsistent column count`);
    for (const value of row.values) assert(Number.isFinite(value), `${table.figure}/${row.name}: non-numeric coefficient`);
  }
  assert.equal(table.formulaModel, 'RATIONAL_5_OVER_6', `${table.figure}: wrong curve-fit model`);
  responseCurveCount += table.columnCount;
  scalarCoefficientCount += table.columnCount * COEFFICIENTS.length;
}

const retainedCsv = await readFile(resolve(repoRoot, 'docs/04_WRC537_NUMERICAL_TABLES.csv'), 'utf8');
const retainedCurveRows = retainedCsv.trim().split(/\r?\n/u).slice(1).filter(Boolean).length;

const report = {
  schema: 'emp1-pr1286-wrc-source-table-audit/v1',
  status: 'PASS',
  source: {
    pdfBlobSha1: 'ce861233928154145a9257efbbf8dbef3f5a17d1',
    pdfSha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
    extractionMarkdownBlobSha1: '810a39d845e15bae92d9c30abb8d452401e711d2',
  },
  curveFit: {
    model: 'RATIONAL_5_OVER_6',
    equation: 'Y=(a+cX+eX^2+gX^3+iX^4)/(1+bX+dX^2+fX^3+hX^4+jX^5)',
    numerator: [
      { coefficient: 'a', power: 0 },
      { coefficient: 'c', power: 1 },
      { coefficient: 'e', power: 2 },
      { coefficient: 'g', power: 3 },
      { coefficient: 'i', power: 4 },
    ],
    denominator: [
      { coefficient: null, value: 1, power: 0 },
      { coefficient: 'b', power: 1 },
      { coefficient: 'd', power: 2 },
      { coefficient: 'f', power: 3 },
      { coefficient: 'h', power: 4 },
      { coefficient: 'j', power: 5 },
    ],
  },
  sourceTableCount: tables.length,
  responseCurveCount,
  scalarCoefficientCount,
  retainedLegacyCurveRows: retainedCurveRows,
  retainedLegacyScalarAssumption: retainedCurveRows * 10,
  sourceVsRetainedCurveDelta: responseCurveCount - retainedCurveRows,
  tables: tables.map(({ coefficientRows, ...table }) => ({
    ...table,
    scalarCoefficientCount: table.columnCount * 10,
    coefficientValueCount: coefficientRows.reduce((sum, row) => sum + row.values.length, 0),
  })),
};

console.log(JSON.stringify(report, null, 2));

function parseSourceTables(source) {
  const lines = source.replace(/\r/gu, '').split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^### Curve Fit Coefficients for Figure ((?:SP|SM)-\d+)\s*$/u);
    if (!heading) continue;

    const figure = heading[1];
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^### Curve Fit Coefficients for Figure /u.test(lines[j])) { end = j; break; }
      if (/^## /u.test(lines[j])) { end = j; break; }
    }
    const block = lines.slice(i + 1, end);
    const pageMatch = block.find((line) => /^\*\*PDF Page \d+\*\*/u.test(line))?.match(/PDF Page (\d+)/u);
    assert(pageMatch, `${figure}: PDF page locator missing`);
    const pdfPage = Number(pageMatch[1]);

    const formulaLine = block.find((line) => line.includes('frac') && line.includes('a + c') && line.includes('j U^5'));
    assert(formulaLine, `${figure}: rational curve-fit formula missing`);
    const formulaModel = formulaIsQualified(formulaLine) ? 'RATIONAL_5_OVER_6' : 'UNQUALIFIED';

    const coefficientRows = [];
    let firstCoefficientIndex = -1;
    for (let j = 0; j < block.length; j += 1) {
      const cells = parseMarkdownRow(block[j]);
      if (!cells || !COEFFICIENTS.includes(cells[0])) continue;
      if (firstCoefficientIndex < 0) firstCoefficientIndex = j;
      const values = cells.slice(1).map((cell) => Number(cell));
      coefficientRows.push({ name: cells[0], rawValues: cells.slice(1), values });
    }
    assert(firstCoefficientIndex >= 0, `${figure}: coefficient table missing`);
    assert.equal(coefficientRows.length, 10, `${figure}: expected 10 coefficient rows`);
    const columnCount = coefficientRows[0].values.length;

    const headerRows = block
      .slice(0, firstCoefficientIndex)
      .map(parseMarkdownRow)
      .filter((row) => row && row.length === columnCount + 1)
      .filter((row) => !row.every((cell) => /^:?-+:?$/u.test(cell)));
    const detailHeader = [...headerRows].reverse().find((row) => row[0] === '') ?? headerRows.at(-1) ?? null;
    assert(detailHeader, `${figure}: response-column header missing`);

    results.push({
      figure,
      pdfPage,
      independentVariable: 'U',
      formulaModel,
      columnCount,
      responseColumnHeaders: detailHeader.slice(1),
      sourceLocator: {
        document: 'WRC537_2013.pdf',
        page: pdfPage,
        figure,
        extractionMarkdown: 'docs/emp1/WRC537_2013_Tables_and_Charts.md',
      },
      coefficientRows,
    });
  }
  return results;
}

function parseMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function formulaIsQualified(line) {
  const plain = line
    .replace(/\$+/gu, '')
    .replace(/\\left|\\right/gu, '')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/gu, '($1)/($2)')
    .replace(/\\/gu, '')
    .replace(/[{}]/gu, '')
    .replace(/\s+/gu, '')
    .replace(/U/g, 'X')
    .replace(/\^/gu, '^');
  return plain.includes('Y=')
    && plain.includes('a+cX+eX^2+gX^3+iX^4')
    && plain.includes('1+bX+dX^2+fX^3+hX^4+jX^5');
}

function normalizeFormula(value) {
  return String(value).replace(/\s+/gu, '');
}

void EXPECTED_FORMULA_NORMALIZED;
