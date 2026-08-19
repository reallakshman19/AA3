import {
  parseCsv,
  WRC_CURVE_FIT_COEFFICIENT_NAMES,
  WRC_CURVE_FIT_INDEPENDENT_VARIABLE,
} from './emp1-wrc-dataset-readiness-lib.mjs';

export const EMP1_WRC_COEFFICIENT_TRANSCRIPTION_SCHEMA = 'emp1-wrc-coefficient-transcription/v1';
export const EMP1_WRC_EXPECTED_CURVE_COUNT = 120;
export const EMP1_WRC_EXPECTED_SCALAR_COUNT = 1200;

const REQUIRED_CURVE_COLUMNS = Object.freeze([
  'coefficient_family',
  'coefficient_id',
  'load_component',
  'stress_component',
  'stress_class',
  'target_location',
  'surface',
  'parameter_1_name',
  'parameter_1_value',
  'parameter_2_name',
  'parameter_2_value',
  'parameter_3_name',
  'parameter_3_value',
  'source_page',
  'source_section',
  'source_equation',
  'source_table',
  'source_figure',
  'source_note',
]);

const EXPECTED_TABLE_IDS = Object.freeze([
  ...Array.from({ length: 10 }, (_, i) => `SP-${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `SM-${i + 1}`),
]);

const SHA256_HEX = /^[a-f0-9]{64}$/u;

/**
 * Expand the retained one-row-per-response-curve index into the exact scalar
 * transcription shape required by the ninth-order WRC curve-fit representation.
 *
 * This function deliberately supplies NO numerical coefficient values. The
 * retained CSV is qualification input only; each a..j slot remains unresolved
 * until a human/source extraction supplies the raw-PDF custody, source precision,
 * value, and review state required by auditWrcCoefficientTranscription().
 */
export function buildWrcCoefficientTranscriptionTemplate(numericalCsv) {
  const rows = parseCsv(String(numericalCsv ?? ''));
  if (rows.length < 2) throw new TypeError('EMP1_WRC_TRANSCRIPTION_SOURCE_EMPTY');

  const header = rows[0];
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  for (const name of REQUIRED_CURVE_COLUMNS) {
    if (!(name in index)) throw new TypeError(`EMP1_WRC_TRANSCRIPTION_SOURCE_COLUMN_MISSING:${name}`);
  }

  const data = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== ''));
  if (data.length !== EMP1_WRC_EXPECTED_CURVE_COUNT) {
    throw new TypeError(`EMP1_WRC_TRANSCRIPTION_CURVE_COUNT:${data.length}`);
  }

  const curves = data.map((row, sourceRowIndex) => {
    const read = (name) => String(row[index[name]] ?? '').trim();
    if (read('parameter_3_name') !== WRC_CURVE_FIT_INDEPENDENT_VARIABLE) {
      throw new TypeError(`EMP1_WRC_TRANSCRIPTION_INDEPENDENT_VARIABLE:${sourceRowIndex + 2}`);
    }
    if (read('parameter_3_value') !== 'UNRESOLVED') {
      throw new TypeError(`EMP1_WRC_TRANSCRIPTION_LEGACY_U_ORDINATE_NOT_UNRESOLVED:${sourceRowIndex + 2}`);
    }

    const sourceLocator = Object.freeze({
      page: read('source_page'),
      section: read('source_section'),
      equation: read('source_equation'),
      table: read('source_table'),
      figure: read('source_figure'),
      note: read('source_note'),
      locatorAuthority: 'RETAINED_EXTRACTION_UNVERIFIED_AGAINST_PINNED_PDF',
    });
    for (const key of ['page', 'section', 'equation', 'table', 'figure']) {
      if (!sourceLocator[key]) throw new TypeError(`EMP1_WRC_TRANSCRIPTION_SOURCE_LOCATOR_MISSING:${sourceRowIndex + 2}:${key}`);
    }

    const family = read('coefficient_family');
    const coefficientId = read('coefficient_id');
    const gamma = read('parameter_1_value');
    const rho = read('parameter_2_value');
    const sourceTable = read('source_table');
    const curveId = `${sourceTable}|${coefficientId}|gamma=${gamma}|rho=${rho}`;

    return {
      curveId,
      retainedSourceRow: sourceRowIndex + 2,
      coefficientFamily: family,
      coefficientId,
      loadComponent: read('load_component'),
      stressComponent: read('stress_component'),
      stressClass: read('stress_class'),
      targetLocation: read('target_location'),
      surface: read('surface'),
      chartParameters: {
        gamma,
        rho,
      },
      independentVariable: WRC_CURVE_FIT_INDEPENDENT_VARIABLE,
      polynomial: 'Y=a+bU+cU^2+dU^3+eU^4+fU^5+gU^6+hU^7+iU^8+jU^9',
      sourceLocator,
      slots: WRC_CURVE_FIT_COEFFICIENT_NAMES.map((coefficientName, exponent) => ({
        coefficientName,
        exponent,
        value: null,
        publishedPrecision: null,
        primarySourceRawPdfSha256: null,
        primarySourceVerified: false,
        reviewStatus: 'NOT_RUN',
        qualificationState: 'UNRESOLVED_PRIMARY_PDF_TRANSCRIPTION',
      })),
    };
  });

  const template = {
    schema: EMP1_WRC_COEFFICIENT_TRANSCRIPTION_SCHEMA,
    sourceClassification: 'DERIVED_TRANSCRIPTION_TEMPLATE_FROM_RETAINED_CURVE_INDEX',
    engineeringAuthority: false,
    productionAuthority: false,
    retainedExtraction: {
      repository: 'reallaksh19/Advanced_Analysis',
      commit: '67317dc9cb47de8897fa7952b86107ab91b1f75c',
      path: 'docs/04_WRC537_NUMERICAL_TABLES.csv',
      gitBlobSha1: 'a787f9417c3406392bdf052d66fc9f7d1efcf11e',
    },
    primarySource: {
      repository: 'reallaksh19/XML_Compare_Utilities',
      commit: 'dc1371afcd44c12de86b2dad6eddf00f1f0b3c55',
      path: 'docs/emp.1/WRC537_2013.pdf',
      gitBlobSha1: 'ce861233928154145a9257efbbf8dbef3f5a17d1',
      expectedByteCount: 1443744,
      rawPdfSha256: null,
      custodyState: 'UNRESOLVED_RAW_BYTES',
    },
    expectedCurveCount: EMP1_WRC_EXPECTED_CURVE_COUNT,
    coefficientsPerCurve: WRC_CURVE_FIT_COEFFICIENT_NAMES.length,
    expectedScalarCoefficientCount: EMP1_WRC_EXPECTED_SCALAR_COUNT,
    curves,
  };

  const audit = auditWrcCoefficientTranscription(template);
  if (audit.structuralStatus !== 'PASS') {
    throw new TypeError(`EMP1_WRC_TRANSCRIPTION_TEMPLATE_STRUCTURE:${audit.failures.map((row) => row.code).join(',')}`);
  }
  return template;
}

export function auditWrcCoefficientTranscription(pkg) {
  const failures = [];
  const blockers = [];
  const curves = Array.isArray(pkg?.curves) ? pkg.curves : [];
  const frozenPrimarySha256 = pkg?.primarySource?.rawPdfSha256 ?? null;

  if (pkg?.schema !== EMP1_WRC_COEFFICIENT_TRANSCRIPTION_SCHEMA) failures.push({ code: 'FAIL_SCHEMA' });
  if (curves.length !== EMP1_WRC_EXPECTED_CURVE_COUNT) {
    failures.push({ code: 'FAIL_CURVE_COUNT', expected: EMP1_WRC_EXPECTED_CURVE_COUNT, actual: curves.length });
  }

  const curveIds = new Set();
  const tableCounts = new Map();
  let slotCount = 0;
  let numericSlotCount = 0;
  let qualifiedSlotCount = 0;
  let unresolvedSlotCount = 0;

  for (const curve of curves) {
    if (!curve?.curveId || curveIds.has(curve.curveId)) failures.push({ code: 'FAIL_DUPLICATE_OR_MISSING_CURVE_ID', curveId: curve?.curveId ?? null });
    else curveIds.add(curve.curveId);

    if (curve?.independentVariable !== WRC_CURVE_FIT_INDEPENDENT_VARIABLE) {
      failures.push({ code: 'FAIL_INDEPENDENT_VARIABLE', curveId: curve?.curveId ?? null, actual: curve?.independentVariable ?? null });
    }

    const table = curve?.sourceLocator?.table;
    if (!table || !curve?.sourceLocator?.page || !curve?.sourceLocator?.section || !curve?.sourceLocator?.equation || !curve?.sourceLocator?.figure) {
      failures.push({ code: 'FAIL_SOURCE_LOCATOR', curveId: curve?.curveId ?? null });
    }
    if (table) tableCounts.set(table, (tableCounts.get(table) ?? 0) + 1);

    const slots = Array.isArray(curve?.slots) ? curve.slots : [];
    slotCount += slots.length;
    if (slots.length !== WRC_CURVE_FIT_COEFFICIENT_NAMES.length) {
      failures.push({ code: 'FAIL_SLOT_COUNT_PER_CURVE', curveId: curve?.curveId ?? null, actual: slots.length });
    }
    const slotNames = slots.map((slot) => slot?.coefficientName);
    if (slotNames.join('|') !== WRC_CURVE_FIT_COEFFICIENT_NAMES.join('|')) {
      failures.push({ code: 'FAIL_SLOT_NAMES', curveId: curve?.curveId ?? null, actual: slotNames });
    }

    for (const [exponent, slot] of slots.entries()) {
      if (slot?.exponent !== exponent) failures.push({ code: 'FAIL_SLOT_EXPONENT', curveId: curve?.curveId ?? null, coefficientName: slot?.coefficientName ?? null });
      const numeric = typeof slot?.value === 'number' && Number.isFinite(slot.value);
      if (numeric) numericSlotCount += 1;
      else unresolvedSlotCount += 1;
      if (isQualifiedSlot(slot, frozenPrimarySha256)) qualifiedSlotCount += 1;
    }
  }

  for (const table of EXPECTED_TABLE_IDS) {
    if (tableCounts.get(table) !== 6) failures.push({ code: 'FAIL_TABLE_CURVE_COUNT', table, expected: 6, actual: tableCounts.get(table) ?? 0 });
  }
  for (const table of tableCounts.keys()) {
    if (!EXPECTED_TABLE_IDS.includes(table)) failures.push({ code: 'FAIL_UNEXPECTED_TABLE', table });
  }
  if (slotCount !== EMP1_WRC_EXPECTED_SCALAR_COUNT) {
    failures.push({ code: 'FAIL_SCALAR_COUNT', expected: EMP1_WRC_EXPECTED_SCALAR_COUNT, actual: slotCount });
  }

  if (!SHA256_HEX.test(frozenPrimarySha256 ?? '') || pkg?.primarySource?.custodyState !== 'PASS_SOURCE_CUSTODY') {
    blockers.push({ code: 'BLOCK_PRIMARY_PDF_CUSTODY' });
  }
  if (numericSlotCount !== EMP1_WRC_EXPECTED_SCALAR_COUNT) {
    blockers.push({ code: 'BLOCK_NUMERIC_SCALAR_COMPLETENESS', required: EMP1_WRC_EXPECTED_SCALAR_COUNT, actual: numericSlotCount });
  }
  if (qualifiedSlotCount !== EMP1_WRC_EXPECTED_SCALAR_COUNT) {
    blockers.push({ code: 'BLOCK_SOURCE_QUALIFIED_SCALAR_COMPLETENESS', required: EMP1_WRC_EXPECTED_SCALAR_COUNT, actual: qualifiedSlotCount });
  }

  const structuralStatus = failures.length ? 'FAIL' : 'PASS';
  const qualificationStatus = failures.length ? 'FAIL' : blockers.length ? 'BLOCKED' : 'PASS';
  return {
    schema: 'emp1-wrc-coefficient-transcription-audit/v1',
    structuralStatus,
    qualificationStatus,
    failures,
    blockers,
    metrics: {
      curveCount: curves.length,
      tableCount: tableCounts.size,
      slotCount,
      numericSlotCount,
      unresolvedSlotCount,
      qualifiedSlotCount,
    },
  };
}

function isQualifiedSlot(slot, frozenPrimarySha256) {
  if (typeof slot?.value !== 'number' || !Number.isFinite(slot.value)) return false;
  if (slot?.primarySourceVerified !== true) return false;
  if (!SHA256_HEX.test(slot?.primarySourceRawPdfSha256 ?? '')) return false;
  if (slot.primarySourceRawPdfSha256 !== frozenPrimarySha256) return false;
  if (slot?.publishedPrecision == null || String(slot.publishedPrecision).trim() === '' || slot.publishedPrecision === 'UNRESOLVED') return false;
  if (slot?.reviewStatus !== 'QUALIFIED') return false;
  return true;
}
