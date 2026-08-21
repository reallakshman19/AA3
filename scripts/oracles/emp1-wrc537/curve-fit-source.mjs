import assert from 'node:assert/strict';

const COEFFICIENT_ORDER = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);

/** Parse one ORIGINAL cylindrical WRC curve row directly from the retained source transcription. */
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
  const rows = block.replace(/\r/gu, '').split('\n').map(parseRow).filter(Boolean);
  const direct = rows.find((row) => row.length === 11
    && Number(row[0]) === gamma
    && row.slice(1).every((cell) => Number.isFinite(Number(cell))));
  assert(direct, `WRC_SOURCE_EXACT_GAMMA_ROW_MISSING:${figure}:${gamma}`);
  return deepFreeze({
    figure,
    variant: 'ORIGINAL',
    pdfPage: page,
    gamma,
    coefficientOrder: [...COEFFICIENT_ORDER],
    coefficients: Object.fromEntries(COEFFICIENT_ORDER.map((name, index) => [name, Number(direct[index + 1])])),
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
