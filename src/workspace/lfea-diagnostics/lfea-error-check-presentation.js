import { buildLfeaDiagnosticPresentation } from './lfea-diagnostic-presentation.js';

export const LFEA_ERROR_CHECK_PRESENTATION_SCHEMA = 'lfea-error-check-presentation/v1';

export const LFEA_ERROR_CHECK_CATEGORIES = Object.freeze([
  Object.freeze({
    categoryId: 'SOURCE_AND_UNITS',
    title: 'Source & Units',
    governedCategories: Object.freeze(['SOURCE', 'SCHEMA', 'UNIT']),
  }),
  Object.freeze({
    categoryId: 'GEOMETRY_AND_TOPOLOGY',
    title: 'Geometry & Topology',
    governedCategories: Object.freeze(['GEOMETRY', 'TOPOLOGY']),
  }),
  Object.freeze({
    categoryId: 'ELEMENTS_AND_PROPERTIES',
    title: 'Elements & Properties',
    governedCategories: Object.freeze(['COMPONENT', 'MATERIAL', 'SECTION', 'RIGID']),
  }),
  Object.freeze({
    categoryId: 'RESTRAINTS_AND_SUPPORTS',
    title: 'Restraints & Supports',
    governedCategories: Object.freeze(['RESTRAINT', 'CONSTRAINT']),
  }),
  Object.freeze({
    categoryId: 'LOADS_PRESSURE_THERMAL',
    title: 'Loads, Pressure & Thermal',
    governedCategories: Object.freeze(['LOAD', 'PRESSURE', 'THERMAL', 'PHYSICAL_CASE']),
  }),
  Object.freeze({
    categoryId: 'REPRESENTABILITY_AND_APPROXIMATIONS',
    title: 'Representability & Approximations',
    governedCategories: Object.freeze(['MECHANISM', 'STIFFNESS', 'CONDITIONING', 'UNSUPPORTED_FEATURE']),
  }),
  Object.freeze({
    categoryId: 'READINESS_AND_AUTHORIZATION',
    title: 'Readiness & Authorization',
    governedCategories: Object.freeze(['AUTHORIZATION', 'STALE_EVIDENCE', 'TAMPER']),
  }),
  Object.freeze({
    categoryId: 'OTHER_UNCLASSIFIED',
    title: 'Other / Unclassified',
    governedCategories: Object.freeze([]),
  }),
]);

const CATEGORY_BY_GOVERNED = new Map(
  LFEA_ERROR_CHECK_CATEGORIES
    .filter((entry) => entry.categoryId !== 'OTHER_UNCLASSIFIED')
    .flatMap((entry) => entry.governedCategories.map((category) => [category, entry])),
);
const CATEGORY_BY_ID = new Map(LFEA_ERROR_CHECK_CATEGORIES.map((entry) => [entry.categoryId, entry]));
const DISPOSITIONS = Object.freeze(['PASS', 'ADVISORY', 'CONDITIONAL', 'BLOCK']);

/**
 * Group UI02's already-governed diagnostic presentation by piping-engineering
 * topic. This function does not inspect finding messages, raw severities or
 * capability effects. The original governed category and sealed disposition
 * remain attached to every row.
 */
export function buildLfeaErrorCheckPresentation(preFlight, options = {}) {
  if (!preFlight) return emptyPresentation(options);
  const governed = buildLfeaDiagnosticPresentation(preFlight, options);
  const seenFindingIds = new Set();
  const rows = Object.freeze(governed.rows.map((row) => {
    if (seenFindingIds.has(row.findingId)) {
      throw new TypeError(`Duplicate governed finding id ${row.findingId} cannot enter the common Error Check.`);
    }
    seenFindingIds.add(row.findingId);
    const engineeringCategory = CATEGORY_BY_GOVERNED.get(row.category)
      ?? CATEGORY_BY_ID.get('OTHER_UNCLASSIFIED');
    return Object.freeze({
      ...row,
      governedCategory: row.category,
      engineeringCategoryId: engineeringCategory.categoryId,
      engineeringCategoryTitle: engineeringCategory.title,
    });
  }));
  const sections = Object.freeze(LFEA_ERROR_CHECK_CATEGORIES
    .map((entry) => sectionFor(entry, rows))
    .filter((section) => section.findingCount > 0));

  if (rows.length !== governed.findingCount || seenFindingIds.size !== governed.findingCount) {
    throw new TypeError('Common Error Check must retain every governed finding exactly once.');
  }

  return Object.freeze({
    schema: LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
    empty: false,
    source: governed.source,
    preFlightStatus: governed.preFlightStatus,
    solveAuthorized: governed.solveAuthorized,
    preparationSemanticHash: governed.preparationSemanticHash,
    preparationEvidenceHash: governed.preparationEvidenceHash,
    findingCount: governed.findingCount,
    counts: governed.counts,
    rows,
    sections,
    evidenceSummary: evidenceSummary(preFlight),
  });
}

/**
 * Display-only category selection. It never mutates the presentation or the
 * pre-flight from which it was projected.
 */
export function selectLfeaErrorCheckSections(presentation, categoryId = 'ALL') {
  requirePresentation(presentation);
  const token = String(categoryId ?? 'ALL').trim().toUpperCase();
  if (token === 'ALL') return presentation.sections;
  if (!CATEGORY_BY_ID.has(token)) {
    throw new TypeError(`Unknown Error Check engineering category ${JSON.stringify(token)}.`);
  }
  return Object.freeze(presentation.sections.filter((section) => section.categoryId === token));
}

function sectionFor(entry, rows) {
  const sectionRows = Object.freeze(rows.filter((row) => row.engineeringCategoryId === entry.categoryId));
  const counts = Object.freeze(Object.fromEntries(DISPOSITIONS.map((disposition) => [
    disposition,
    sectionRows.filter((row) => row.disposition === disposition).length,
  ])));
  return Object.freeze({
    categoryId: entry.categoryId,
    title: entry.title,
    governedCategories: entry.categoryId === 'OTHER_UNCLASSIFIED'
      ? Object.freeze([...new Set(sectionRows.map((row) => row.governedCategory))].sort(compareAscii))
      : entry.governedCategories,
    findingCount: sectionRows.length,
    counts,
    rows: sectionRows,
  });
}

function evidenceSummary(preFlight) {
  const diagnostics = preFlight?.diagnostics ?? null;
  const summary = diagnostics?.summary ?? {};
  return Object.freeze({
    diagnosticsSemanticHash: textOrNull(diagnostics?.semanticHash),
    diagnosticsEvidenceHash: textOrNull(diagnostics?.evidenceHash),
    requestedProfileId: textOrNull(summary.requestedProfileId ?? diagnostics?.requestedProfileId),
    sourceNodeCount: finiteOrNull(summary.sourceNodeCount),
    sourceElementCount: finiteOrNull(summary.sourceElementCount),
    blockedCapabilityIds: copyStrings(summary.blockedCapabilityIds),
    conditionalCapabilityIds: copyStrings(summary.conditionalCapabilityIds),
    authorizedCapabilityIds: copyStrings(summary.authorizedCapabilityIds),
    topologyStatus: textOrNull(diagnostics?.topologyDiagnostics?.status),
    proximityStatus: textOrNull(diagnostics?.proximityDiagnostics?.status),
    representabilityStatus: textOrNull(diagnostics?.representabilityDiagnostics?.status),
  });
}

function emptyPresentation(options) {
  return Object.freeze({
    schema: LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
    empty: true,
    source: Object.freeze({
      kind: textOrNull(options.sourceKind),
      identityKey: textOrNull(options.sourceIdentityKey),
      fileName: textOrNull(options.fileName),
    }),
    preFlightStatus: null,
    solveAuthorized: false,
    preparationSemanticHash: null,
    preparationEvidenceHash: null,
    findingCount: 0,
    counts: Object.freeze({ PASS: 0, ADVISORY: 0, CONDITIONAL: 0, BLOCK: 0 }),
    rows: Object.freeze([]),
    sections: Object.freeze([]),
    evidenceSummary: Object.freeze({
      diagnosticsSemanticHash: null,
      diagnosticsEvidenceHash: null,
      requestedProfileId: null,
      sourceNodeCount: null,
      sourceElementCount: null,
      blockedCapabilityIds: Object.freeze([]),
      conditionalCapabilityIds: Object.freeze([]),
      authorizedCapabilityIds: Object.freeze([]),
      topologyStatus: null,
      proximityStatus: null,
      representabilityStatus: null,
    }),
  });
}

function requirePresentation(value) {
  if (!value || value.schema !== LFEA_ERROR_CHECK_PRESENTATION_SCHEMA || !Array.isArray(value.sections)) {
    throw new TypeError('Error Check category selection requires the common Error Check presentation.');
  }
}

function copyStrings(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((entry) => String(entry)).sort(compareAscii));
}

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function compareAscii(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}
