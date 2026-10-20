import { buildLfeaDiagnosticPresentation } from './lfea-diagnostic-presentation.js';
import { lfeaFindingSuggestedAction } from '../lfea-finding-suggested-action.js';
import {
  LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
  LFEA_ERROR_CHECK_TRIAGE,
  TRIAGE_BY_DISPOSITION,
  LFEA_LIMITATION_KIND,
  LFEA_COMPONENT_FACTOR_AUTHORITY_CODES,
  lfeaLimitationKind,
  LFEA_ERROR_CHECK_CATEGORIES,
  CATEGORY_BY_GOVERNED,
  CATEGORY_BY_ID,
  DISPOSITIONS,
} from './lfea-error-check-categories.js';

export {
  LFEA_ERROR_CHECK_PRESENTATION_SCHEMA,
  LFEA_ERROR_CHECK_TRIAGE,
  TRIAGE_BY_DISPOSITION,
  LFEA_LIMITATION_KIND,
  LFEA_COMPONENT_FACTOR_AUTHORITY_CODES,
  lfeaLimitationKind,
  LFEA_ERROR_CHECK_CATEGORIES,
  CATEGORY_BY_GOVERNED,
  CATEGORY_BY_ID,
  DISPOSITIONS,
};

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
    triage: triageSummary(rows),
    distinctIssueCount: new Set(rows.map((row) => `${row.code}::${row.disposition}`)).size,
    rows,
    sections,
    evidenceSummary: evidenceSummary(preFlight),
  });
}

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
    groups: groupRows(sectionRows),
  });
}

function groupRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.code}::${row.disposition}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  const groups = [...byKey.entries()].map(([groupId, groupRowList]) => {
    const first = groupRowList[0];
    const triage = TRIAGE_BY_DISPOSITION.get(first.disposition) ?? null;
    return Object.freeze({
      groupId,
      code: first.code,
      disposition: first.disposition,
      limitationKind: lfeaLimitationKind(first.code, first.disposition),
      presentationLevel: first.presentationLevel,
      presentationLabel: first.presentationLabel,
      triageId: triage?.triageId ?? 'INFORMATIONAL',
      plainMessage: first.plainMessage,
      suggestedAction: lfeaFindingSuggestedAction(first.code),
      occurrences: groupRowList.length,
      findingIds: Object.freeze(groupRowList.map((row) => row.findingId)),
      sourceFeatureIds: Object.freeze(
        [...new Set(groupRowList.flatMap((row) => row.sourceFeatureIds ?? []))].sort(compareAscii),
      ),
      rows: Object.freeze([...groupRowList]),
    });
  });
  return Object.freeze(groups.sort((a, b) => {
    const severity = DISPOSITIONS.indexOf(b.disposition) - DISPOSITIONS.indexOf(a.disposition);
    if (severity !== 0) return severity;
    const kind = limitationKindRank(a.limitationKind) - limitationKindRank(b.limitationKind);
    if (kind !== 0) return kind;
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return compareAscii(a.code, b.code);
  }));
}

function triageSummary(rows) {
  return Object.freeze(LFEA_ERROR_CHECK_TRIAGE.map((entry) => {
    const bucketRows = rows.filter((row) => entry.dispositions.includes(row.disposition));
    return Object.freeze({
      triageId: entry.triageId,
      title: entry.title,
      lead: entry.lead,
      clearedText: entry.clearedText,
      findingCount: bucketRows.length,
      distinctIssueCount: new Set(bucketRows.map((row) => `${row.code}::${row.disposition}`)).size,
      cleared: bucketRows.length === 0,
    });
  }));
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
    triage: triageSummary([]),
    distinctIssueCount: 0,
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

function limitationKindRank(kind) {
  if (kind === LFEA_LIMITATION_KIND.RESULT_AFFECTING) return 0;
  if (kind === LFEA_LIMITATION_KIND.PROCESS_NOTE) return 1;
  return 2;
}

function compareAscii(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}
