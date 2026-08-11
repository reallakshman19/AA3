export const LFEA_GOVERNED_JOURNEY_SCHEMA = 'lfea-governed-journey/v1';

/**
 * Project the already-governed native InputXML custody chain into standalone
 * application state. This module is deliberately read-only: it does not parse
 * source, create engineering authority, mutate the model, authorize a solve or
 * execute a solver.
 *
 * @param {{sourceSnapshot?:object|null,preFlight?:object|null}} input
 * @returns {Readonly<Record<string, unknown>>}
 */
export function createLfeaGovernedJourneyProjection({ sourceSnapshot = null, preFlight = null } = {}) {
  const source = sourceProjection(sourceSnapshot, preFlight);
  const review = reviewProjection(sourceSnapshot, preFlight);
  const model = modelProjection(sourceSnapshot, preFlight);
  const analysis = analysisProjection(sourceSnapshot, preFlight);

  return deepFreeze({
    schema: LFEA_GOVERNED_JOURNEY_SCHEMA,
    source,
    review,
    model,
    analysis,
  });
}

function sourceProjection(snapshot, preFlight) {
  return {
    status: text(snapshot?.sourceStatus) ?? 'EMPTY',
    fileName: text(snapshot?.fileName),
    contentSha256: text(snapshot?.contentSha256),
    unitDeclared: booleanOrNull(snapshot?.unitDeclared),
    sourceUnit: text(snapshot?.sourceUnit),
    unitAuthority: text(snapshot?.unitAuthority),
    requestedProfileId: text(snapshot?.requestedProfileId),
    requestedCaseIds: stringArray(snapshot?.requestedCaseIds),
    preFlightSemanticHash: text(snapshot?.preFlightSemanticHash ?? preFlight?.semanticHash),
    sourceSemanticHash: text(preFlight?.sourceSummary?.sourceSemanticHash),
    sourceContentHash: text(preFlight?.sourceSummary?.sourceContentHash),
  };
}

function reviewProjection(snapshot, preFlight) {
  const findings = Array.isArray(preFlight?.preparation?.findings)
    ? preFlight.preparation.findings
    : [];
  const blocking = findings.filter((row) => row?.disposition === 'BLOCK');
  const conditional = findings.filter((row) => row?.disposition === 'CONDITIONAL');
  const authorized = Boolean(preFlight?.solveAuthorized);
  const status = !preFlight
    ? 'NOT_READY'
    : preFlight.status === 'BLOCK'
      ? 'BLOCKED'
      : authorized
        ? 'AUTHORIZED'
        : preFlight.status === 'WARN'
          ? 'REVIEW_REQUIRED'
          : 'READY';

  return {
    status,
    readyToReview: Boolean(preFlight),
    solveAuthorized: authorized,
    preFlightStatus: text(snapshot?.preFlightStatus ?? preFlight?.status) ?? 'NOT_PREPARED',
    findingCount: findings.length,
    blockingFindingCount: blocking.length,
    conditionalFindingCount: conditional.length,
    blockingFindingIds: blocking.map((row) => row.findingId).filter(Boolean),
    conditionalFindingIds: conditional.map((row) => row.findingId).filter(Boolean),
    limitationsAccepted: stringArray(preFlight?.limitationsAccepted),
    approverIdentity: text(preFlight?.approverIdentity),
    authorizationSemanticHash: text(
      snapshot?.authorizationSemanticHash ?? preFlight?.authorization?.semanticHash,
    ),
    preparationSemanticHash: text(preFlight?.preparation?.semanticHash),
    diagnosticsSemanticHash: text(preFlight?.diagnostics?.semanticHash),
  };
}

function modelProjection(snapshot, preFlight) {
  const preparation = preFlight?.preparation ?? null;
  const structural = preparation?.structuralPreparation ?? null;
  const physical = preparation?.physicalPreparation ?? null;
  const sourcePreparation = preparation?.sourcePreparation ?? null;
  const cases = Array.isArray(physical?.physicalCases) ? physical.physicalCases : [];

  return {
    status: preparation ? preparation.status : 'NOT_COMPILED',
    nodeCount: integerOrNull(snapshot?.nodeCount ?? preFlight?.sourceSummary?.nodeCount),
    elementCount: integerOrNull(snapshot?.elementCount ?? preFlight?.sourceSummary?.elementCount),
    modelSemanticHash: text(preparation?.modelSemanticHash),
    sourceBundleSemanticHash: text(preparation?.sourceBundleSemanticHash),
    stiffnessStateHash: text(preparation?.stiffnessStateHash),
    loadStateHash: text(preparation?.loadStateHash),
    materialResolutionCount: integerOrNull(sourcePreparation?.summary?.materialResolutionCount),
    sectionResolutionCount: integerOrNull(sourcePreparation?.summary?.sectionResolutionCount),
    constraintCount: integerOrNull(structural?.summary?.constraintCount),
    physicalCaseCount: integerOrNull(physical?.summary?.physicalCaseCount ?? cases.length),
    physicalCases: cases.map((row) => ({
      caseId: text(row?.caseId),
      caseRole: text(row?.caseRole),
      loadCaseSemanticHash: text(row?.loadCase?.semanticHash),
      physicalLoadCaseHash: text(row?.loadCase?.physicalLoadCaseHash),
    })),
  };
}

function analysisProjection(snapshot, preFlight) {
  const status = text(preFlight?.status ?? snapshot?.preFlightStatus) ?? 'NOT_PREPARED';
  const solveAuthorized = Boolean(preFlight?.solveAuthorized);
  const blocked = status === 'BLOCK';
  const readyForExecutionHandoff = Boolean(preFlight) && solveAuthorized && !blocked;

  return {
    status: !preFlight
      ? 'NOT_READY'
      : blocked
        ? 'BLOCKED'
        : solveAuthorized
          ? 'AUTHORIZED_FOR_EXECUTION_HANDOFF'
          : 'REVIEW_REQUIRED',
    requestedProfileId: text(preFlight?.preparation?.requestedProfileId ?? snapshot?.requestedProfileId),
    requestedCaseIds: stringArray(preFlight?.preparation?.requestedCaseIds ?? snapshot?.requestedCaseIds),
    readyToReview: Boolean(preFlight),
    solveAuthorized,
    readyForExecutionHandoff,
    nativeExecutionConnected: false,
    readyToRun: false,
    authorizationSemanticHash: text(preFlight?.authorization?.semanticHash),
    modelSemanticHash: text(preFlight?.preparation?.modelSemanticHash),
    stiffnessStateHash: text(preFlight?.preparation?.stiffnessStateHash),
    loadStateHash: text(preFlight?.preparation?.loadStateHash),
    limitationCodes: stringArray(preFlight?.preparation?.limitations),
    executionBoundary: preFlight?.preparation?.executionBoundary
      ? structuredClone(preFlight.preparation.executionBoundary)
      : null,
  };
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry)).filter((entry) => entry.length > 0);
}

function integerOrNull(value) {
  return Number.isInteger(value) ? value : null;
}

function booleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function text(value) {
  const result = String(value ?? '').trim();
  return result || null;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
