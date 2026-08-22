export const LFEA_RESULTS_AUTHORITY_PRESENTATION_SCHEMA = 'lfea-results-authority-presentation/v1';

/**
 * Read-only separation of linear-analysis execution, optional code assessment,
 * and application-qualification evidence. Every engineering value is copied
 * from an already-retained result/presentation; this module derives labels and
 * counts only and owns no solve, recovery, code-method or qualification logic.
 */
export function buildLfeaResultsAuthorityPresentation(input = {}) {
  const analysisState = recordOrNull(input.analysisState, 'analysisState');
  const applicationState = recordOrNull(input.applicationState, 'applicationState');
  const applicationPresentation = recordOrNull(input.applicationPresentation, 'applicationPresentation');

  const execution = buildExecution(analysisState);
  const applicationCurrent = applicationState?.status === 'CURRENT';
  const presentationCurrent = applicationCurrent && applicationPresentation !== null;
  const stalePresentation = !applicationCurrent && applicationPresentation !== null;
  const codeRows = presentationCurrent ? copyCodeRows(applicationPresentation.codeRows) : Object.freeze([]);
  const nozzleRows = presentationCurrent ? copyNozzleRows(applicationPresentation.nozzleRows) : Object.freeze([]);

  const codeAssessment = Object.freeze({
    status: stalePresentation ? 'NOT_CURRENT' : codeRows.length > 0 ? 'PERFORMED' : 'NOT_PERFORMED',
    codeCheckCount: codeRows.length,
    nozzleAssessmentCount: nozzleRows.length,
    codeStatusCounts: countExactStatuses(codeRows, 'status'),
    nozzleAssessmentStatusCounts: countExactStatuses(nozzleRows, 'assessmentStatus'),
    codeRows,
    nozzleRows,
  });

  const qualification = buildQualification(applicationState, applicationPresentation, {
    presentationCurrent,
    stalePresentation,
  });

  return Object.freeze({
    schema: LFEA_RESULTS_AUTHORITY_PRESENTATION_SCHEMA,
    execution,
    codeAssessment,
    qualification,
  });
}

function buildExecution(state) {
  if (!state || state.status !== 'CURRENT') {
    return Object.freeze({
      status: 'NOT_CURRENT',
      caseCount: 0,
      blockedCaseCount: 0,
      cases: Object.freeze([]),
    });
  }
  const cases = Object.freeze((state.cases ?? []).map((row) => Object.freeze({
    caseId: text(row?.caseId),
    executionStatus: text(row?.executionStatus),
    blockingCheckIds: Object.freeze((row?.blockingChecks ?? []).map((check) => text(check?.checkId))),
  })));
  return Object.freeze({
    status: 'CURRENT',
    caseCount: cases.length,
    blockedCaseCount: cases.filter((row) => row.blockingCheckIds.length > 0).length,
    cases,
  });
}

function buildQualification(state, presentation, flags) {
  if (flags.stalePresentation) {
    return Object.freeze({
      availability: 'NOT_CURRENT',
      applicationId: textOrNull(presentation?.applicationId),
      applicationStatus: textOrNull(presentation?.status),
      exportEligibility: textOrNull(presentation?.exportEligibility),
      currency: textOrNull(presentation?.currency),
      applicationResultSemanticHash: textOrNull(presentation?.applicationResultSemanticHash),
      presentationSemanticHash: textOrNull(presentation?.semanticHash),
      presentationEvidenceHash: textOrNull(presentation?.evidenceHash),
      notConfigured: Object.freeze([]),
      limitations: Object.freeze([]),
    });
  }
  if (!flags.presentationCurrent) {
    return Object.freeze({
      availability: 'NOT_AVAILABLE',
      applicationId: null,
      applicationStatus: null,
      exportEligibility: null,
      currency: null,
      applicationResultSemanticHash: null,
      presentationSemanticHash: null,
      presentationEvidenceHash: null,
      notConfigured: Object.freeze([]),
      limitations: Object.freeze([]),
    });
  }
  return Object.freeze({
    availability: 'CURRENT',
    applicationId: textOrNull(state?.applicationId ?? presentation.applicationId),
    applicationStatus: textOrNull(state?.qualificationStatus ?? presentation.status),
    exportEligibility: textOrNull(state?.exportEligibility ?? presentation.exportEligibility),
    currency: textOrNull(presentation.currency),
    applicationResultSemanticHash: textOrNull(
      state?.applicationResultSemanticHash ?? presentation.applicationResultSemanticHash,
    ),
    presentationSemanticHash: textOrNull(state?.presentationSemanticHash ?? presentation.semanticHash),
    presentationEvidenceHash: textOrNull(state?.presentationEvidenceHash ?? presentation.evidenceHash),
    notConfigured: Object.freeze([...(presentation.notConfigured ?? [])].map(text)),
    limitations: Object.freeze((presentation.limitations ?? []).map((row) => Object.freeze({
      sourceKind: textOrNull(row?.sourceKind),
      sourceId: textOrNull(row?.sourceId),
      disclosure: limitationDisclosure(row),
    }))),
  });
}

function copyCodeRows(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((row) => Object.freeze({
    checkId: text(row?.checkId),
    category: textOrNull(row?.category),
    componentId: textOrNull(row?.componentId),
    codePointId: textOrNull(row?.codePointId),
    combinationId: textOrNull(row?.combinationId),
    codeProfileId: textOrNull(row?.codeProfileId),
    calculatedStress: finiteOrNull(row?.calculatedStress),
    allowableStress: finiteOrNull(row?.allowableStress),
    utilization: finiteOrNull(row?.utilization),
    status: text(row?.status),
    semanticHash: textOrNull(row?.semanticHash),
  })));
}

function copyNozzleRows(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((row) => Object.freeze({
    interfaceId: text(row?.interfaceId),
    loadCaseId: textOrNull(row?.loadCaseId),
    assessmentStatus: text(row?.assessmentStatus),
    qualificationStatus: textOrNull(row?.qualificationStatus),
    utilization: finiteOrNull(row?.utilization),
    semanticHash: textOrNull(row?.semanticHash),
  })));
}

function countExactStatuses(rows, key) {
  const counts = {};
  for (const row of rows) {
    const status = text(row?.[key]);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return Object.freeze(Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))));
}

function limitationDisclosure(row) {
  const value = row?.limitation?.disclosure
    ?? row?.limitation?.details?.disclosure
    ?? null;
  if (value !== null && value !== undefined) return String(value);
  if (row?.limitation === null || row?.limitation === undefined) return null;
  return JSON.stringify(row.limitation);
}

function recordOrNull(value, label) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be a record or null.`);
  return value;
}

function finiteOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Retained engineering values must be finite numbers.');
  return value;
}

function text(value) {
  return String(value ?? '').trim();
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}
