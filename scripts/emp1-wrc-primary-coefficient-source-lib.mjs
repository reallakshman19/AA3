import assert from 'node:assert/strict';

export const WRC_PRIMARY_PDF_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
export const WRC_PRIMARY_PDF_BLOB_SHA1 = 'ce861233928154145a9257efbbf8dbef3f5a17d1';
export const WRC_PRIMARY_EXTRACTION_BLOB_SHA1 = '810a39d845e15bae92d9c30abb8d452401e711d2';
export const WRC_PRIMARY_CURVE_FIT_MODEL = 'RATIONAL_5_OVER_6';
export const WRC_PRIMARY_COEFFICIENT_NAMES = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);
export const WRC_PRIMARY_EXPECTED_TABLES = Object.freeze([
  ...Array.from({ length: 10 }, (_, i) => `SP-${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `SM-${i + 1}`),
]);
export const WRC_PRIMARY_CURVE_COUNT = 115;
export const WRC_PRIMARY_SCALAR_COUNT = 1150;

export const WRC_PRIMARY_RATIONAL_ROLES = Object.freeze({
  a: Object.freeze({ part: 'NUMERATOR', power: 0 }),
  b: Object.freeze({ part: 'DENOMINATOR', power: 1 }),
  c: Object.freeze({ part: 'NUMERATOR', power: 1 }),
  d: Object.freeze({ part: 'DENOMINATOR', power: 2 }),
  e: Object.freeze({ part: 'NUMERATOR', power: 2 }),
  f: Object.freeze({ part: 'DENOMINATOR', power: 3 }),
  g: Object.freeze({ part: 'NUMERATOR', power: 3 }),
  h: Object.freeze({ part: 'DENOMINATOR', power: 4 }),
  i: Object.freeze({ part: 'NUMERATOR', power: 4 }),
  j: Object.freeze({ part: 'DENOMINATOR', power: 5 }),
});

/** Parse the PR1286 extraction of the exact pinned WRC PDF coefficient tables. */
export function parsePrimaryWrcCoefficientTables(markdown) {
  const lines = String(markdown ?? '').replace(/\r/gu, '').split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^### Curve Fit Coefficients for Figure ((?:SP|SM)-\d+)\s*$/u);
    if (!heading) continue;

    const figure = heading[1];
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^### Curve Fit Coefficients for Figure /u.test(lines[j]) || /^## /u.test(lines[j])) {
        end = j;
        break;
      }
    }
    const block = lines.slice(i + 1, end);
    const pageMatch = block.find((line) => /^\*\*PDF Page \d+\*\*/u.test(line))?.match(/PDF Page (\d+)/u);
    assert(pageMatch, `${figure}: PDF page locator missing`);
    const pdfPage = Number(pageMatch[1]);

    const formulaLine = block.find((line) => line.includes('frac') && line.includes('a + c') && line.includes('j U^5'));
    assert(formulaLine, `${figure}: rational curve-fit formula missing`);
    assert(formulaIsQualified(formulaLine), `${figure}: unqualified curve-fit formula`);

    const coefficientRows = [];
    let firstCoefficientIndex = -1;
    for (let j = 0; j < block.length; j += 1) {
      const cells = parseMarkdownRow(block[j]);
      if (!cells || !WRC_PRIMARY_COEFFICIENT_NAMES.includes(cells[0])) continue;
      if (firstCoefficientIndex < 0) firstCoefficientIndex = j;
      const rawValues = cells.slice(1);
      const values = rawValues.map(parsePublishedNumber);
      coefficientRows.push({ name: cells[0], rawValues, values });
    }
    assert(firstCoefficientIndex >= 0, `${figure}: coefficient table missing`);
    assert.deepEqual(coefficientRows.map((row) => row.name), WRC_PRIMARY_COEFFICIENT_NAMES, `${figure}: coefficient rows a..j`);
    const columnCount = coefficientRows[0].values.length;
    assert(columnCount > 0, `${figure}: response columns missing`);
    for (const row of coefficientRows) assert.equal(row.values.length, columnCount, `${figure}/${row.name}: column count`);

    const headerRows = block
      .slice(0, firstCoefficientIndex)
      .map(parseMarkdownRow)
      .filter((row) => row && row.length === columnCount + 1)
      .filter((row) => !row.every((cell) => /^:?-+:?$/u.test(cell)));
    const detailHeader = [...headerRows].reverse().find((row) => row[0] === '') ?? headerRows.at(-1) ?? null;
    assert(detailHeader, `${figure}: response-column header missing`);
    const responseColumnHeaders = detailHeader.slice(1);
    assert.equal(responseColumnHeaders.length, columnCount, `${figure}: response header count`);

    results.push({
      figure,
      pdfPage,
      independentVariable: 'U',
      formulaModel: WRC_PRIMARY_CURVE_FIT_MODEL,
      columnCount,
      responseColumnHeaders,
      coefficientRows,
    });
  }

  validatePrimaryTableSet(results);
  return results;
}

/**
 * Independently parse Poppler layout text extracted directly from the frozen PDF.
 * This parser does not consume the Markdown table rows.
 */
export function parsePrimaryWrcCoefficientTablesFromPdfText(pdfText) {
  const text = String(pdfText ?? '').replace(/\r/gu, '');
  const results = [];
  const heading = /Curve Fit Coefficients for Figure ((?:SP|SM)-\d+)/gu;
  const matches = [...text.matchAll(heading)];

  for (let index = 0; index < matches.length; index += 1) {
    const figure = matches[index][1];
    if (!WRC_PRIMARY_EXPECTED_TABLES.includes(figure)) continue;
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const block = text.slice(start, end);
    const coefficientRows = [];

    for (const line of block.split('\n')) {
      const rowMatch = line.match(/^\s*([a-j])\s+(.*)$/u);
      if (!rowMatch) continue;
      const rawValues = extractPublishedNumbers(rowMatch[2]);
      if (!rawValues.length) continue;
      coefficientRows.push({
        name: rowMatch[1],
        rawValues,
        values: rawValues.map(parsePublishedNumber),
      });
    }

    if (coefficientRows.length !== 10) continue;
    const columnCount = coefficientRows[0].values.length;
    if (!coefficientRows.every((row) => row.values.length === columnCount)) continue;
    results.push({ figure, columnCount, coefficientRows });
  }

  validatePrimaryTableSet(results, { requirePageAndHeaders: false });
  return results;
}

export function comparePrimaryWrcCoefficientExtractions(markdownTables, pdfTextTables) {
  const failures = [];
  const pdfByFigure = new Map(pdfTextTables.map((table) => [table.figure, table]));
  let comparedScalars = 0;

  for (const sourceTable of markdownTables) {
    const pdfTable = pdfByFigure.get(sourceTable.figure);
    if (!pdfTable) {
      failures.push({ code: 'PDF_TABLE_MISSING', figure: sourceTable.figure });
      continue;
    }
    if (pdfTable.columnCount !== sourceTable.columnCount) {
      failures.push({
        code: 'COLUMN_COUNT_MISMATCH',
        figure: sourceTable.figure,
        markdown: sourceTable.columnCount,
        pdfText: pdfTable.columnCount,
      });
      continue;
    }
    for (let r = 0; r < WRC_PRIMARY_COEFFICIENT_NAMES.length; r += 1) {
      const sourceRow = sourceTable.coefficientRows[r];
      const pdfRow = pdfTable.coefficientRows[r];
      if (sourceRow.name !== pdfRow.name) {
        failures.push({ code: 'COEFFICIENT_ROW_MISMATCH', figure: sourceTable.figure, row: r });
        continue;
      }
      for (let c = 0; c < sourceTable.columnCount; c += 1) {
        comparedScalars += 1;
        if (!Object.is(sourceRow.values[c], pdfRow.values[c])) {
          failures.push({
            code: 'COEFFICIENT_VALUE_MISMATCH',
            figure: sourceTable.figure,
            coefficient: sourceRow.name,
            column: c + 1,
            markdownRaw: sourceRow.rawValues[c],
            pdfTextRaw: pdfRow.rawValues[c],
            markdownValue: sourceRow.values[c],
            pdfTextValue: pdfRow.values[c],
          });
        }
      }
    }
  }

  return {
    schema: 'emp1-wrc-primary-coefficient-cross-check/v1',
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    comparedTables: markdownTables.length,
    comparedCurves: markdownTables.reduce((sum, table) => sum + table.columnCount, 0),
    comparedScalars,
  };
}

export function buildPrimaryWrcCoefficientPackage(markdownTables, { pdfTextCrossCheck = null } = {}) {
  if (pdfTextCrossCheck && pdfTextCrossCheck.status !== 'PASS') {
    throw new TypeError('EMP1_WRC_PRIMARY_COEFFICIENT_PDF_TEXT_CROSS_CHECK_NOT_PASS');
  }
  const pdfTextVerified = pdfTextCrossCheck?.status === 'PASS' && pdfTextCrossCheck.comparedScalars === WRC_PRIMARY_SCALAR_COUNT;
  const curves = [];

  for (const table of markdownTables) {
    for (let columnIndex = 0; columnIndex < table.columnCount; columnIndex += 1) {
      const responseColumn = table.responseColumnHeaders[columnIndex];
      const curveId = `${table.figure}|column=${columnIndex + 1}|${normalizeHeader(responseColumn)}`;
      curves.push({
        curveId,
        figure: table.figure,
        responseColumn,
        responseColumnIndex: columnIndex + 1,
        independentVariable: table.independentVariable,
        curveFitModel: WRC_PRIMARY_CURVE_FIT_MODEL,
        sourceLocator: {
          document: 'WRC537_2013.pdf',
          pdfPage: table.pdfPage,
          figure: table.figure,
          responseColumn,
          responseColumnIndex: columnIndex + 1,
        },
        coefficients: WRC_PRIMARY_COEFFICIENT_NAMES.map((name, rowIndex) => ({
          coefficientName: name,
          role: WRC_PRIMARY_RATIONAL_ROLES[name],
          rawPublishedValue: table.coefficientRows[rowIndex].rawValues[columnIndex],
          value: table.coefficientRows[rowIndex].values[columnIndex],
          primarySourceLocator: {
            document: 'WRC537_2013.pdf',
            pdfPage: table.pdfPage,
            figure: table.figure,
            responseColumn,
            responseColumnIndex: columnIndex + 1,
            coefficientRow: name,
          },
          primarySourceRawPdfSha256: WRC_PRIMARY_PDF_SHA256,
          pdfTextVerified,
        })),
      });
    }
  }

  assert.equal(curves.length, WRC_PRIMARY_CURVE_COUNT, 'primary WRC curve count');
  assert.equal(curves.reduce((sum, curve) => sum + curve.coefficients.length, 0), WRC_PRIMARY_SCALAR_COUNT, 'primary WRC scalar count');

  return {
    schema: 'emp1-wrc-primary-coefficient-package/v2',
    status: pdfTextVerified ? 'PASS_SOURCE_TRANSCRIPTION' : 'BLOCKED_PDF_TEXT_CROSS_CHECK_NOT_RUN',
    engineeringAuthority: pdfTextVerified,
    productionAuthority: false,
    source: {
      repository: 'reallaksh19/XML_Compare_Utilities',
      pinnedCommit: 'dc1371afcd44c12de86b2dad6eddf00f1f0b3c55',
      path: 'docs/emp.1/WRC537_2013.pdf',
      gitBlobSha1: WRC_PRIMARY_PDF_BLOB_SHA1,
      rawPdfSha256: WRC_PRIMARY_PDF_SHA256,
      extractionMarkdownPath: 'docs/emp1/WRC537_2013_Tables_and_Charts.md',
      extractionMarkdownGitBlobSha1: WRC_PRIMARY_EXTRACTION_BLOB_SHA1,
    },
    curveFit: {
      model: WRC_PRIMARY_CURVE_FIT_MODEL,
      equation: 'Y=(a+cX+eX^2+gX^3+iX^4)/(1+bX+dX^2+fX^3+hX^4+jX^5)',
      sphericalIndependentVariable: 'U',
      coefficientRoles: WRC_PRIMARY_RATIONAL_ROLES,
    },
    tableCount: markdownTables.length,
    curveCount: curves.length,
    scalarCoefficientCount: WRC_PRIMARY_SCALAR_COUNT,
    pdfTextCrossCheck,
    curves,
  };
}

export function evaluateWrcPrimaryRationalCurve(coefficients, x) {
  if (!Number.isFinite(x)) throw new TypeError('EMP1_WRC_CURVE_X_NOT_FINITE');
  const byName = new Map(coefficients.map((row) => [row.coefficientName, Number(row.value)]));
  for (const name of WRC_PRIMARY_COEFFICIENT_NAMES) {
    if (!Number.isFinite(byName.get(name))) throw new TypeError(`EMP1_WRC_CURVE_COEFFICIENT_NOT_FINITE:${name}`);
  }
  const numerator = byName.get('a')
    + byName.get('c') * x
    + byName.get('e') * x ** 2
    + byName.get('g') * x ** 3
    + byName.get('i') * x ** 4;
  const denominator = 1
    + byName.get('b') * x
    + byName.get('d') * x ** 2
    + byName.get('f') * x ** 3
    + byName.get('h') * x ** 4
    + byName.get('j') * x ** 5;
  if (!Number.isFinite(denominator) || denominator === 0) throw new RangeError('EMP1_WRC_CURVE_DENOMINATOR_INVALID');
  const y = numerator / denominator;
  if (!Number.isFinite(y)) throw new RangeError('EMP1_WRC_CURVE_RESULT_NOT_FINITE');
  return { y, numerator, denominator };
}

function validatePrimaryTableSet(tables, { requirePageAndHeaders = true } = {}) {
  assert.equal(tables.length, WRC_PRIMARY_EXPECTED_TABLES.length, 'expected exactly 20 SP/SM tables');
  const byFigure = new Map(tables.map((table) => [table.figure, table]));
  assert.equal(byFigure.size, tables.length, 'duplicate SP/SM table');
  for (const figure of WRC_PRIMARY_EXPECTED_TABLES) assert(byFigure.has(figure), `missing ${figure}`);
  let curves = 0;
  let scalars = 0;
  for (const table of tables) {
    assert.deepEqual(table.coefficientRows.map((row) => row.name), WRC_PRIMARY_COEFFICIENT_NAMES, `${table.figure}: a..j`);
    assert(table.columnCount > 0, `${table.figure}: no response columns`);
    for (const row of table.coefficientRows) {
      assert.equal(row.values.length, table.columnCount, `${table.figure}/${row.name}: count`);
      for (const value of row.values) assert(Number.isFinite(value), `${table.figure}/${row.name}: finite`);
    }
    if (requirePageAndHeaders) {
      assert(Number.isInteger(table.pdfPage) && table.pdfPage > 0, `${table.figure}: page`);
      assert.equal(table.responseColumnHeaders.length, table.columnCount, `${table.figure}: headers`);
    }
    curves += table.columnCount;
    scalars += table.columnCount * 10;
  }
  assert.equal(curves, WRC_PRIMARY_CURVE_COUNT, 'source-derived response curve count');
  assert.equal(scalars, WRC_PRIMARY_SCALAR_COUNT, 'source-derived scalar count');
}

function parseMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function parsePublishedNumber(value) {
  const text = String(value).trim();
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) throw new TypeError(`EMP1_WRC_SOURCE_COEFFICIENT_NOT_NUMERIC:${text}`);
  return parsed;
}

function extractPublishedNumbers(text) {
  return String(text).match(/[-+]?(?:\d+\.\d+E[+-]\d+|\d+(?:\.\d+)?)/gu) ?? [];
}

function formulaIsQualified(line) {
  const plain = String(line)
    .replace(/\$+/gu, '')
    .replace(/\\left|\\right/gu, '')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/gu, '($1)/($2)')
    .replace(/\\/gu, '')
    .replace(/[{}]/gu, '')
    .replace(/\s+/gu, '')
    .replace(/U/gu, 'X');
  return plain.includes('a+cX+eX^2+gX^3+iX^4')
    && plain.includes('1+bX+dX^2+fX^3+hX^4+jX^5');
}

function normalizeHeader(value) {
  return String(value).trim().replace(/\s+/gu, '').replace(/[^A-Za-z0-9()_-]/gu, '');
}
