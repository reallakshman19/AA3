#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const markdown = await readFile(resolve(repoRoot, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const COEFF = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);
const lines = markdown.replace(/\r/gu, '').split('\n');
const tables = [];

for (let i = 0; i < lines.length; i += 1) {
  const heading = lines[i].match(/^### Curve Fit Coefficients for Figure (.+?)\s*$/u);
  if (!heading) continue;
  const figureLabel = heading[1].trim();
  let end = lines.length;
  for (let j = i + 1; j < lines.length; j += 1) {
    if (/^### Curve Fit Coefficients for Figure /u.test(lines[j]) || /^## /u.test(lines[j])) { end = j; break; }
  }
  const block = lines.slice(i + 1, end);
  const pageMatch = block.find((line) => /^\*\*PDF Page \d+\*\*/u.test(line))?.match(/PDF Page (\d+)/u);
  assert(pageMatch, `${figureLabel}: PDF page locator missing`);
  const pdfPage = Number(pageMatch[1]);
  const formula = block.find((line) => line.includes('frac') && line.includes('j'));
  assert(formula, `${figureLabel}: curve-fit formula missing`);
  const independentVariable = /\\beta|β/u.test(formula) ? 'BETA' : /\bU\b|U\^/u.test(formula) ? 'U' : 'UNRESOLVED';
  assert.notEqual(independentVariable, 'UNRESOLVED', `${figureLabel}: independent variable`);

  const coefficientRows = [];
  let firstIndex = -1;
  for (let j = 0; j < block.length; j += 1) {
    const cells = parseRow(block[j]);
    if (!cells || !COEFF.includes(cells[0])) continue;
    if (firstIndex < 0) firstIndex = j;
    const rawValues = cells.slice(1);
    const values = rawValues.map((cell) => Number(cell));
    assert(values.every(Number.isFinite), `${figureLabel}/${cells[0]}: numeric values`);
    coefficientRows.push({ name: cells[0], rawValues, values });
  }
  assert.deepEqual(coefficientRows.map((row) => row.name), COEFF, `${figureLabel}: a..j rows`);
  const columnCount = coefficientRows[0].values.length;
  assert(columnCount > 0, `${figureLabel}: response columns`);
  assert(coefficientRows.every((row) => row.values.length === columnCount), `${figureLabel}: consistent columns`);

  const headerRows = block.slice(0, firstIndex).map(parseRow).filter((row) => row && row.length === columnCount + 1)
    .filter((row) => !row.every((cell) => /^:?-+:?$/u.test(cell)));
  const detailHeader = [...headerRows].reverse().find((row) => row[0] === '') ?? headerRows.at(-1) ?? null;
  assert(detailHeader, `${figureLabel}: response headers`);

  const normalizedFigure = figureLabel.replace(/\s+-\s+(Original|Extrapolated.*)$/u, '');
  const variant = /Extrapolated/iu.test(figureLabel) ? 'EXTRAPOLATED' : /Original/iu.test(figureLabel) ? 'ORIGINAL' : 'STANDARD';
  const shellFamily = /^(SR|SP|SM)-/u.test(normalizedFigure) ? 'SPHERICAL' : 'CYLINDRICAL';
  const attachmentFamily = /^SR-/u.test(normalizedFigure) ? 'SOLID_OR_RIGID'
    : /^(SP|SM)-/u.test(normalizedFigure) ? 'HOLLOW_CYLINDRICAL'
      : 'CYLINDRICAL_SHELL_ATTACHMENT';

  tables.push({
    figureLabel,
    normalizedFigure,
    variant,
    shellFamily,
    attachmentFamily,
    independentVariable,
    pdfPage,
    columnCount,
    responseColumnHeaders: detailHeader.slice(1),
    scalarCount: columnCount * 10,
  });
}

const summary = new Map();
for (const row of tables) {
  const key = `${row.shellFamily}|${row.attachmentFamily}|${row.variant}|${row.independentVariable}`;
  const entry = summary.get(key) ?? { tables: 0, curves: 0, scalars: 0 };
  entry.tables += 1;
  entry.curves += row.columnCount;
  entry.scalars += row.scalarCount;
  summary.set(key, entry);
}

const duplicateLabels = tables.map((row) => row.figureLabel).filter((value, index, all) => all.indexOf(value) !== index);
assert.deepEqual(duplicateLabels, [], 'duplicate exact figure labels');

console.log(JSON.stringify({
  schema: 'emp1-pr1286-wrc-all-curve-source-audit/v1',
  status: 'PASS',
  source: {
    pdfSha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
    pdfBlobSha1: 'ce861233928154145a9257efbbf8dbef3f5a17d1',
    extractionMarkdownBlobSha1: '810a39d845e15bae92d9c30abb8d452401e711d2',
  },
  tableCount: tables.length,
  responseCurveCount: tables.reduce((sum, row) => sum + row.columnCount, 0),
  scalarCoefficientCount: tables.reduce((sum, row) => sum + row.scalarCount, 0),
  summary: Object.fromEntries(summary),
  tables,
}, null, 2));

function parseRow(line) {
  const trimmed = String(line).trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}
