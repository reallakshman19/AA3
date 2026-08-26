import assert from 'node:assert/strict';

const COEFFICIENT_ORDER = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);

/**
 * Parse one ORIGINAL cylindrical WRC curve at an exact source-tabulated gamma
 * directly from the retained source transcription. The retained extraction has
 * both row-oriented and transposed coefficient tables; both source layouts are
 * handled without interpolation or production-data imports.
 */
export function parseIndependentWrc537OriginalCurve(markdown, figure, gamma) {
  assert.equal(typeof markdown, 'string', 'WRC markdown required');
  assert.equal(typeof figure, 'string', 'figure required');
  assert(Number.isFinite(gamma) && gamma > 0, 'positive gamma required');
  const escaped = figure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^### Curve Fit Coefficients for Figure ${escaped}\\s+[–-]\\s+Original\\s*$`, 'mu');
  const match = heading.exec(markdown);
  assert(match, `WRC_SOURCE_ORIGINAL_CURVE_HEADING_MISSING:${figure}`);
  const rest = markdown.slice(match.index + match[0].length);
  const next = rest.search(/^### Curve Fit Coefficients for Figure |^## /mu);
  const block = next >= 0 ? rest.slice(0, next) : rest;
  const page = Number(block.match(/\*\*PDF Page (\d+)\*\*/u)?.[1]);
  assert(Number.isInteger(page), `WRC_SOURCE_PDF_PAGE_MISSING:${figure}`);
  const lines = block.replace(/\r/gu, '').split('\n');
  const rows = lines.map(parseRow).filter(Boolean);

  let coefficients = parseRowOriented(rows, gamma);
  let sourceLayout = 'GAMMA_ROW';
  if (!coefficients) {
    coefficients = parseTransposed(lines, rows, gamma, figure);
    sourceLayout = 'COEFFICIENT_ROWS';
  }
  assert(coefficients, `WRC_SOURCE_EXACT_GAMMA_ROW_MISSING:${figure}:${gamma}`);

  return deepFreeze({
    figure,
    variant: 'ORIGINAL',
    pdfPage: page,
    gamma,
    sourceLayout,
    coefficientOrder: [...COEFFICIENT_ORDER],
    coefficients,
    sourceParameterResolved: true,
    interpolationUsed: false,
    extrapolationFallbackUsed: false,
  });
}

export function evaluateIndependentWrc537Curve(row, beta) {
  assert(row && typeof row === 'object', 'curve row required');
  assert(Number.isFinite(beta) && beta >= 0, 'finite beta required');
  const c = row.coefficients;
  assert.deepEqual(Object.keys(c), [...COEFFICIENT_ORDER], `WRC_SOURCE_COEFFICIENT_ORDER:${row.figure}`);
  const numerator = c.a + c.c * beta + c.e * beta ** 2 + c.g * beta ** 3 + c.i * beta ** 4;
  const denominator = 1 + c.b * beta + c.d * beta ** 2 + c.f * beta ** 3
    + c.h * beta ** 4 + c.j * beta ** 5;
  assert(Number.isFinite(denominator) && denominator !== 0,
    `WRC_SOURCE_RATIONAL_DENOMINATOR_INVALID:${row.figure}`);
  const y = numerator / denominator;
  assert(Number.isFinite(y), `WRC_SOURCE_RATIONAL_RESULT_INVALID:${row.figure}`);
  return deepFreeze({ figure: row.figure, gamma: row.gamma, beta, y, numerator, denominator });
}

function parseRowOriented(rows, gamma) {
  const header = rows.find((row) => row.length === 11
    && row[0] === ''
    && row.slice(1).join('|') === COEFFICIENT_ORDER.join('|'));
  if (!header) return null;
  const direct = rows.find((row) => row.length === 11
    && Number(row[0]) === gamma
    && row.slice(1).every((cell) => Number.isFinite(Number(cell))));
  if (!direct) return null;
  return Object.fromEntries(COEFFICIENT_ORDER.map((name, index) => [name, Number(direct[index + 1])]));
}

function parseTransposed(lines, rows, gamma, figure) {
  const coefficientRows = rows.filter((row) => COEFFICIENT_ORDER.includes(row[0]));
  if (coefficientRows.length !== COEFFICIENT_ORDER.length) return null;
  const count = coefficientRows[0].length - 1;
  assert(count > 0 && coefficientRows.every((row) => row.length - 1 === count),
    `WRC_SOURCE_COEFFICIENT_SHAPE:${figure}`);
  const firstCoefficientLineIndex = lines.findIndex((line) => {
    const row = parseRow(line);
    return row && COEFFICIENT_ORDER.includes(row[0]);
  });
  assert(firstCoefficientLineIndex >= 0, `WRC_SOURCE_COEFFICIENT_ROWS_MISSING:${figure}`);
  const candidates = lines.slice(0, firstCoefficientLineIndex)
    .map(parseRow)
    .filter((row) => row && row.length === count + 1);
  const gammaHeader = [...candidates].reverse().find((row) => row[0] === '');
  assert(gammaHeader, `WRC_SOURCE_GAMMA_HEADER_MISSING:${figure}`);
  const column = gammaHeader.slice(1).findIndex((value) => Number(value) === gamma);
  if (column < 0) return null;
  return Object.fromEntries(coefficientRows.map((row) => {
    const value = Number(row[column + 1]);
    assert(Number.isFinite(value), `WRC_SOURCE_COEFFICIENT_INVALID:${figure}:${row[0]}:${gamma}`);
    return [row[0], value];
  }));
}

function parseRow(line) {
  const text = String(line ?? '').trim();
  if (!text.startsWith('|') || !text.endsWith('|')) return null;
  return text.slice(1, -1).split('|').map((cell) => cell.trim());
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
