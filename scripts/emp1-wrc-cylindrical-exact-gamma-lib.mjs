const COEFFICIENT_NAMES = Object.freeze(['a','b','c','d','e','f','g','h','i','j']);
const VARIANTS = Object.freeze(['ORIGINAL','EXTRAPOLATED']);
const ROUND_OFF_RELATIVE_TOLERANCE = 1e-12;

export const EMP1_WRC_EXACT_GAMMA_SCHEMA = 'emp1-wrc-cylindrical-exact-gamma-package/v1';
export const EMP1_WRC_PRIMARY_PDF_SHA256 = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

export function parseCylindricalExactGammaPackage(markdown) {
  const lines = String(markdown ?? '').replace(/\r/gu, '').split('\n');
  const curves = [];
  const unresolvedRows = [];
  const tables = [];

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^### Curve Fit Coefficients for Figure (.+?)\s*$/u);
    if (!heading) continue;
    const figureLabel = heading[1].trim();
    if (/^(?:SR|SP|SM)-/u.test(figureLabel)) continue;

    const variant = /Extrapolated/iu.test(figureLabel) ? 'EXTRAPOLATED'
      : /Original/iu.test(figureLabel) ? 'ORIGINAL' : null;
    if (!variant) continue;

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^### Curve Fit Coefficients for Figure /u.test(lines[j]) || /^## /u.test(lines[j])) {
        end = j;
        break;
      }
    }
    const block = lines.slice(i + 1, end);
    const pageMatch = block.find((line) => /^\*\*PDF Page \d+\*\*/u.test(line))?.match(/PDF Page (\d+)/u);
    if (!pageMatch) throw new TypeError(`EMP1_WRC_CYL_TABLE_PAGE_MISSING:${figureLabel}`);
    const pdfPage = Number(pageMatch[1]);
    const formula = block.find((line) => line.includes('frac') && /\\beta|β/u.test(line) && line.includes('j'));
    if (!formula) throw new TypeError(`EMP1_WRC_CYL_RATIONAL_FORMULA_MISSING:${figureLabel}`);

    const normalizedFigure = figureLabel.replace(/\s+[–-]\s+(?:Original|Extrapolated.*)$/u, '').trim();
    const parsed = parseCoefficientRows(block, { figureLabel, normalizedFigure, variant, pdfPage })
      ?? parseGammaRows(block, { figureLabel, normalizedFigure, variant, pdfPage });
    if (!parsed) throw new TypeError(`EMP1_WRC_CYL_TABLE_ORIENTATION_UNSUPPORTED:${figureLabel}`);

    curves.push(...parsed.curves);
    unresolvedRows.push(...parsed.unresolvedRows);
    tables.push({
      figureLabel,
      figure: normalizedFigure,
      variant,
      pdfPage,
      orientation: parsed.orientation,
      curveCount: parsed.curves.length + parsed.unresolvedRows.length,
      qualifiedCurveCount: parsed.curves.length,
      unresolvedCurveCount: parsed.unresolvedRows.length,
    });
  }

  const original = curves.filter((row) => row.variant === 'ORIGINAL').length;
  const extrapolated = curves.filter((row) => row.variant === 'EXTRAPOLATED').length;
  const unresolvedOriginal = unresolvedRows.filter((row) => row.variant === 'ORIGINAL').length;
  const unresolvedExtrapolated = unresolvedRows.filter((row) => row.variant === 'EXTRAPOLATED').length;

  return deepFreeze({
    schema: EMP1_WRC_EXACT_GAMMA_SCHEMA,
    status: unresolvedRows.length ? 'PASS_WITH_BOUNDED_SOURCE_RESTRICTION' : 'PASS',
    engineeringAuthority: true,
    productionAuthority: false,
    source: {
      document: 'WRC537_2013.pdf',
      rawPdfSha256: EMP1_WRC_PRIMARY_PDF_SHA256,
      independentVariable: 'BETA',
      curveFitModel: 'RATIONAL_5_OVER_6',
    },
    capability: {
      admittedGammaPolicy: 'EXACT_SOURCE_TABULATED_GAMMA_ONLY',
      nonTabulatedGamma: 'BLOCKED_NO_INTERPOLATION_AUTHORITY',
      originalVsExtrapolated: 'EXPLICIT_VARIANT_REQUIRED_NO_FALLBACK',
      machineRoundOffTolerance: ROUND_OFF_RELATIVE_TOLERANCE,
    },
    counts: {
      tables: tables.length,
      qualifiedCurves: curves.length,
      unresolvedCurves: unresolvedRows.length,
      originalQualifiedCurves: original,
      originalUnresolvedCurves: unresolvedOriginal,
      extrapolatedQualifiedCurves: extrapolated,
      extrapolatedUnresolvedCurves: unresolvedExtrapolated,
      sourceQualifiedScalars: curves.length * COEFFICIENT_NAMES.length,
      sourceUnresolvedScalars: unresolvedRows.length * COEFFICIENT_NAMES.length,
    },
    tables,
    curves,
    unresolvedRows,
  });
}

export function selectExactGammaCurve(pkg, { figure, variant, gamma }) {
  validatePackage(pkg);
  if (typeof figure !== 'string' || !figure.trim()) throw new TypeError('EMP1_WRC_EXACT_GAMMA_FIGURE_REQUIRED');
  if (!VARIANTS.includes(variant)) throw new TypeError('EMP1_WRC_EXACT_GAMMA_VARIANT_REQUIRED');
  if (!Number.isFinite(gamma) || gamma <= 0) throw new TypeError('EMP1_WRC_EXACT_GAMMA_VALUE_INVALID');

  const family = pkg.curves.filter((row) => row.figure === figure.trim() && row.variant === variant);
  const unresolved = pkg.unresolvedRows.filter((row) => row.figure === figure.trim() && row.variant === variant);
  if (!family.length && !unresolved.length) {
    return blocked('BLOCKED_FIGURE_VARIANT_NOT_SOURCE_QUALIFIED', figure, variant, gamma, [], unresolved);
  }

  const matches = family.filter((row) => gammaRoundOffEquivalent(gamma, row.gamma));
  if (matches.length > 1) throw new TypeError(`EMP1_WRC_EXACT_GAMMA_AMBIGUOUS_SOURCE_ROWS:${figure}:${variant}:${gamma}`);
  if (matches.length === 1) {
    return deepFreeze({
      status: 'PASS_EXACT_SOURCE_TABULATED_GAMMA',
      engineeringAuthority: true,
      productionAuthority: false,
      interpolationUsed: false,
      extrapolationFallbackUsed: false,
      requestedGamma: gamma,
      sourceGamma: matches[0].gamma,
      machineRoundOffDelta: gamma - matches[0].gamma,
      curve: matches[0],
    });
  }

  return blocked(
    unresolved.length ? 'BLOCKED_GAMMA_NOT_TABULATED_AND_SOURCE_ROW_UNRESOLVED' : 'BLOCKED_NON_TABULATED_GAMMA',
    figure,
    variant,
    gamma,
    family.map((row) => row.gamma).sort((a,b) => a-b),
    unresolved,
  );
}

export function evaluateCylindricalRationalCurve(curve, beta) {
  if (!curve || curve.independentVariable !== 'BETA') throw new TypeError('EMP1_WRC_CYL_CURVE_INVALID');
  if (!Number.isFinite(beta) || beta < 0) throw new TypeError('EMP1_WRC_CYL_BETA_INVALID');
  const c = curve.coefficients;
  const numerator = c.a + c.c*beta + c.e*beta**2 + c.g*beta**3 + c.i*beta**4;
  const denominator = 1 + c.b*beta + c.d*beta**2 + c.f*beta**3 + c.h*beta**4 + c.j*beta**5;
  if (!Number.isFinite(denominator) || denominator === 0) throw new RangeError('EMP1_WRC_CYL_CURVE_DENOMINATOR_INVALID');
  const y = numerator / denominator;
  if (!Number.isFinite(y)) throw new RangeError('EMP1_WRC_CYL_CURVE_RESULT_INVALID');
  return deepFreeze({ y, numerator, denominator, beta, sourceGamma: curve.gamma });
}

function parseCoefficientRows(block, context) {
  const rows = [];
  let firstIndex = -1;
  for (let i = 0; i < block.length; i += 1) {
    const cells = parseRow(block[i]);
    if (!cells || !COEFFICIENT_NAMES.includes(cells[0])) continue;
    if (firstIndex < 0) firstIndex = i;
    const values = cells.slice(1).map(parseFinitePublishedNumber);
    rows.push({ name: cells[0], values });
  }
  if (!rows.length) return null;
  if (rows.length !== 10 || rows.some((row, index) => row.name !== COEFFICIENT_NAMES[index])) {
    throw new TypeError(`EMP1_WRC_CYL_COEFFICIENT_ROWS_INVALID:${context.figureLabel}`);
  }
  const curveCount = rows[0].values.length;
  if (!curveCount || rows.some((row) => row.values.length !== curveCount)) {
    throw new TypeError(`EMP1_WRC_CYL_COEFFICIENT_SHAPE_INVALID:${context.figureLabel}`);
  }
  const headers = block.slice(0, firstIndex).map(parseRow).filter((row) => row && row.length === curveCount + 1)
    .filter((row) => !row.every((cell) => /^:?-+:?$/u.test(cell)));
  const header = [...headers].reverse().find((row) => row[0] === '') ?? headers.at(-1);
  if (!header) throw new TypeError(`EMP1_WRC_CYL_GAMMA_HEADER_MISSING:${context.figureLabel}`);
  const curves = [];
  const unresolvedRows = [];
  header.slice(1).forEach((rawGamma, columnIndex) => {
    const gamma = parseGamma(rawGamma);
    const coefficients = Object.fromEntries(rows.map((row) => [row.name, row.values[columnIndex]]));
    const base = sourceCurve(context, columnIndex + 1, rawGamma, coefficients);
    if (gamma == null) unresolvedRows.push({ ...base, gamma: null, productionSelectable: false });
    else curves.push({ ...base, gamma, productionSelectable: true });
  });
  return { orientation: 'COEFFICIENT_ROWS_GAMMA_COLUMNS', curves, unresolvedRows };
}

function parseGammaRows(block, context) {
  const rows = block.map(parseRow).filter(Boolean);
  const header = rows.find((row) => row.length === 11 && row[0] === '' && row.slice(1).join('|') === COEFFICIENT_NAMES.join('|'));
  if (!header) return null;
  const data = rows.filter((row) => row.length === 11 && row.slice(1).every((cell) => cell !== '' && Number.isFinite(Number(cell))));
  if (!data.length) return null;
  const curves = [];
  const unresolvedRows = [];
  data.forEach((row, rowIndex) => {
    const rawGamma = row[0].trim();
    const gamma = parseGamma(rawGamma);
    const coefficients = Object.fromEntries(COEFFICIENT_NAMES.map((name, index) => [name, parseFinitePublishedNumber(row[index + 1])]));
    const base = sourceCurve(context, rowIndex + 1, rawGamma, coefficients);
    if (gamma == null) unresolvedRows.push({ ...base, gamma: null, productionSelectable: false });
    else curves.push({ ...base, gamma, productionSelectable: true });
  });
  return { orientation: 'GAMMA_ROWS_COEFFICIENT_COLUMNS', curves, unresolvedRows };
}

function sourceCurve(context, sourceRowOrColumn, rawGamma, coefficients) {
  return {
    curveId: `${context.normalizedFigure}|${context.variant}|source=${sourceRowOrColumn}|gamma=${rawGamma || 'UNRESOLVED'}`,
    figure: context.normalizedFigure,
    figureLabel: context.figureLabel,
    variant: context.variant,
    independentVariable: 'BETA',
    curveFitModel: 'RATIONAL_5_OVER_6',
    gammaRaw: rawGamma,
    sourceRowOrColumn,
    coefficients,
    sourceLocator: {
      document: 'WRC537_2013.pdf',
      rawPdfSha256: EMP1_WRC_PRIMARY_PDF_SHA256,
      pdfPage: context.pdfPage,
      figure: context.figureLabel,
    },
  };
}

function blocked(status, figure, variant, gamma, availableGammas, unresolvedRows) {
  return deepFreeze({
    status,
    engineeringAuthority: false,
    productionAuthority: false,
    interpolationUsed: false,
    extrapolationFallbackUsed: false,
    requestedGamma: gamma,
    figure,
    variant,
    availableSourceGammas: availableGammas,
    unresolvedSourceRows: unresolvedRows.map((row) => ({ curveId: row.curveId, sourceLocator: row.sourceLocator })),
  });
}

function gammaRoundOffEquivalent(actual, source) {
  const tolerance = Math.max(1, Math.abs(source)) * ROUND_OFF_RELATIVE_TOLERANCE;
  return Math.abs(actual - source) <= tolerance;
}
function parseGamma(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const direct = Number(text);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = text.match(/(?:γ|gamma)?\s*=?\s*([0-9]+(?:\.[0-9]+)?)/iu);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}
function parseFinitePublishedNumber(raw) {
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value)) throw new TypeError(`EMP1_WRC_CYL_COEFFICIENT_NOT_NUMERIC:${raw}`);
  return value;
}
function parseRow(line) {
  const text = String(line ?? '').trim();
  if (!text.startsWith('|') || !text.endsWith('|')) return null;
  return text.slice(1,-1).split('|').map((cell) => cell.trim());
}
function validatePackage(pkg) {
  if (!pkg || pkg.schema !== EMP1_WRC_EXACT_GAMMA_SCHEMA || pkg.source?.rawPdfSha256 !== EMP1_WRC_PRIMARY_PDF_SHA256) {
    throw new TypeError('EMP1_WRC_EXACT_GAMMA_PACKAGE_INVALID');
  }
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
