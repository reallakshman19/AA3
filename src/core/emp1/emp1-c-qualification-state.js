import { EMP1_C_RETAINED_QUALIFICATION_EVIDENCE } from './emp1-c-qualification-evidence.generated.js';

export const EMP1_C_QUALIFICATION_SCHEMA = 'emp1-c-qualification-state/v1';

export const EMP1_C_BLOCKER_CODES = Object.freeze({
  WRC_DATASET_NOT_READY: 'WRC_DATASET_NOT_READY',
  WRC_DIMENSIONAL_CONTRACT_UNRESOLVED: 'WRC_DIMENSIONAL_CONTRACT_UNRESOLVED',
  WRC_NUMERICAL_COEFFICIENTS_MISSING: 'WRC_NUMERICAL_COEFFICIENTS_MISSING',
  WRC_SIGN_ARBITRATION_OPEN: 'WRC_SIGN_ARBITRATION_OPEN',
  CAUX_PP24_31_NOT_FROZEN: 'CAUX_PP24_31_NOT_FROZEN',
  METHOD_AUTHORITY_NOT_GRANTED: 'EMP1_C_METHOD_AUTHORITY_NOT_GRANTED',
  EXECUTION_ROUTE_NOT_REGISTERED: 'EMP1_C_EXECUTION_ROUTE_NOT_REGISTERED',
});

const REQUIRED_WRC_COEFFICIENTS_PER_CURVE = 10;
const REQUIRED_WRC_INDEPENDENT_VARIABLE = 'U';

/**
 * Runtime evidence is generated from retained WRC/CAUx qualification artifacts.
 * The generated module is checked for exact drift by
 * scripts/emp1-c-qualification-evidence-check.mjs. No numerical WRC datum or
 * benchmark expected value is created here.
 */
export const EMP1_C_CURRENT_QUALIFICATION_EVIDENCE = deepFreeze(
  EMP1_C_RETAINED_QUALIFICATION_EVIDENCE,
);

export function evaluateEmp1CQualificationState(evidence = EMP1_C_CURRENT_QUALIFICATION_EVIDENCE) {
  const normalized = normalizeEvidence(evidence);
  const blockers = [];

  const datasetReady = normalized.wrcDataset.status === 'PASS'
    && normalized.wrcDataset.extractionStatus === 'READY_FOR_IMPLEMENTATION'
    && normalized.wrcDataset.unresolvedJsonPathCount === 0
    && normalized.wrcDataset.openIssueCount === 0
    && normalized.wrcDataset.numericalDataCount > 0
    && nonEmpty(normalized.wrcDataset.semanticHash)
    && normalized.wrcDataset.sourceCustodyQualified === true
    && nonEmpty(normalized.wrcDataset.sourceRawPdfSha256);
  if (!datasetReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
    `WRC extraction package is not READY_FOR_IMPLEMENTATION (${normalized.wrcDataset.unresolvedJsonPathCount} unresolved fields; ${normalized.wrcDataset.openIssueCount} open issues; numericalData=${normalized.wrcDataset.numericalDataCount}; sourceCustody=${normalized.wrcDataset.sourceCustodyState}/${normalized.wrcDataset.sourceQualificationState}).`,
    {
      status: normalized.wrcDataset.status,
      extractionStatus: normalized.wrcDataset.extractionStatus,
      unresolvedJsonPathCount: normalized.wrcDataset.unresolvedJsonPathCount,
      openIssueCount: normalized.wrcDataset.openIssueCount,
      numericalDataCount: normalized.wrcDataset.numericalDataCount,
      semanticHashPresent: nonEmpty(normalized.wrcDataset.semanticHash),
      sourceCustodyQualified: normalized.wrcDataset.sourceCustodyQualified,
      sourceCustodyState: normalized.wrcDataset.sourceCustodyState,
      sourceQualificationState: normalized.wrcDataset.sourceQualificationState,
      sourceRawPdfSha256Present: nonEmpty(normalized.wrcDataset.sourceRawPdfSha256),
    },
  ));

  const dimensionalContractReady = normalized.wrcDataset.dimensionalContractStatus === 'PASS'
    && normalized.wrcDataset.dimensionalViolationCount === 0
    && normalized.wrcDataset.dimensionalViolationIds.length === 0;
  if (!dimensionalContractReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_DIMENSIONAL_CONTRACT_UNRESOLVED,
    `WRC retained coefficient/equation dimensional contract is not qualified (${normalized.wrcDataset.dimensionalViolationCount} contradiction(s): ${normalized.wrcDataset.dimensionalViolationIds.join(', ') || 'UNRESOLVED'}). Source arbitration is required; the runtime must not infer a corrected WRC formula.`,
    {
      status: normalized.wrcDataset.dimensionalContractStatus,
      violationCount: normalized.wrcDataset.dimensionalViolationCount,
      violationIds: normalized.wrcDataset.dimensionalViolationIds,
    },
  ));

  const coefficientsReady = normalized.wrcDataset.coefficientCurveRows > 0
    && normalized.wrcDataset.coefficientSchemaQualified === true
    && normalized.wrcDataset.coefficientsPerCurve === REQUIRED_WRC_COEFFICIENTS_PER_CURVE
    && normalized.wrcDataset.requiredScalarCoefficientCount
      === normalized.wrcDataset.coefficientCurveRows * normalized.wrcDataset.coefficientsPerCurve
    && normalized.wrcDataset.numericScalarCoefficientCount
      === normalized.wrcDataset.requiredScalarCoefficientCount
    && normalized.wrcDataset.unresolvedScalarCoefficientCount === 0
    && normalized.wrcDataset.missingScalarCoefficientCount === 0
    && normalized.wrcDataset.invalidScalarCoefficientCount === 0
    && normalized.wrcDataset.independentVariable === REQUIRED_WRC_INDEPENDENT_VARIABLE
    && normalized.wrcDataset.independentVariableQualified === true;
  if (!coefficientsReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
    `WRC a–j numerical coefficient payload is not qualified (${normalized.wrcDataset.numericScalarCoefficientCount}/${normalized.wrcDataset.requiredScalarCoefficientCount} named scalar coefficients numeric across ${normalized.wrcDataset.coefficientCurveRows} response-curve rows; schema=${normalized.wrcDataset.coefficientSchema}/${normalized.wrcDataset.coefficientSchemaQualified ? 'QUALIFIED' : 'BLOCKED'}; unresolved=${normalized.wrcDataset.unresolvedScalarCoefficientCount}; missing=${normalized.wrcDataset.missingScalarCoefficientCount}; invalid=${normalized.wrcDataset.invalidScalarCoefficientCount}; independentVariable=${normalized.wrcDataset.independentVariable}/${normalized.wrcDataset.independentVariableRepresentation}/${normalized.wrcDataset.independentVariableQualified ? 'QUALIFIED' : 'BLOCKED'}).`,
    {
      coefficientCurveRows: normalized.wrcDataset.coefficientCurveRows,
      coefficientSchema: normalized.wrcDataset.coefficientSchema,
      coefficientSchemaQualified: normalized.wrcDataset.coefficientSchemaQualified,
      coefficientsPerCurve: normalized.wrcDataset.coefficientsPerCurve,
      requiredScalarCoefficientCount: normalized.wrcDataset.requiredScalarCoefficientCount,
      numericScalarCoefficientCount: normalized.wrcDataset.numericScalarCoefficientCount,
      unresolvedScalarCoefficientCount: normalized.wrcDataset.unresolvedScalarCoefficientCount,
      missingScalarCoefficientCount: normalized.wrcDataset.missingScalarCoefficientCount,
      invalidScalarCoefficientCount: normalized.wrcDataset.invalidScalarCoefficientCount,
      independentVariable: normalized.wrcDataset.independentVariable,
      independentVariableRepresentation: normalized.wrcDataset.independentVariableRepresentation,
      independentVariableQualified: normalized.wrcDataset.independentVariableQualified,
    },
  ));

  const signReady = normalized.signArbitration.status === 'PASS'
    && normalized.signArbitration.resolutionAuthority === 'PINNED_WRC_PDF'
    && normalized.signArbitration.openConflicts.length === 0
    && normalized.signArbitration.sourceCustodyQualified === true;
  if (!signReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
    `WRC load/sign convention arbitration remains open (${normalized.signArbitration.openConflicts.length} recorded conflict(s)); only the source-qualified pinned WRC PDF may resolve it.`,
    {
      status: normalized.signArbitration.status,
      resolutionAuthority: normalized.signArbitration.resolutionAuthority,
      openConflicts: normalized.signArbitration.openConflicts,
      sourceCustodyQualified: normalized.signArbitration.sourceCustodyQualified,
    },
  ));

  const cauxReady = normalized.cauxBenchmark.status === 'PASS'
    && normalized.cauxBenchmark.sourceIdentityVerified === true
    && normalized.cauxBenchmark.sourceCustodyQualified === true
    && nonEmpty(normalized.cauxBenchmark.sourceRawPdfSha256)
    && normalized.cauxBenchmark.expectedValuesFrozen === true
    && normalized.cauxBenchmark.independentHandCalculationStatus === 'PASS'
    && nonEmpty(normalized.cauxBenchmark.benchmarkHash);
  if (!cauxReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
    `CAUx 2017 pp.${displayPageRange(normalized.cauxBenchmark.pageRange)} benchmark values and independent hand calculation are not frozen (sourceCustody=${normalized.cauxBenchmark.sourceCustodyState}/${normalized.cauxBenchmark.sourceQualificationState}; benchmark=${normalized.cauxBenchmark.status}; independent=${normalized.cauxBenchmark.independentHandCalculationStatus}).`,
    {
      status: normalized.cauxBenchmark.status,
      sourceIdentityVerified: normalized.cauxBenchmark.sourceIdentityVerified,
      sourceCustodyQualified: normalized.cauxBenchmark.sourceCustodyQualified,
      sourceCustodyState: normalized.cauxBenchmark.sourceCustodyState,
      sourceQualificationState: normalized.cauxBenchmark.sourceQualificationState,
      sourceRawPdfSha256Present: nonEmpty(normalized.cauxBenchmark.sourceRawPdfSha256),
      pageRange: normalized.cauxBenchmark.pageRange,
      expectedValuesFrozen: normalized.cauxBenchmark.expectedValuesFrozen,
      independentHandCalculationStatus: normalized.cauxBenchmark.independentHandCalculationStatus,
      benchmarkHashPresent: nonEmpty(normalized.cauxBenchmark.benchmarkHash),
      supplementalPrecheckVerdict: normalized.cauxBenchmark.supplementalPrecheckVerdict,
      supplementalPrecheckMaySatisfyCauxA4: normalized.cauxBenchmark.supplementalPrecheckMaySatisfyCauxA4,
    },
  ));

  const technicalQualificationReady = datasetReady
    && dimensionalContractReady
    && coefficientsReady
    && signReady
    && cauxReady;
  const methodAuthorized = normalized.methodAuthorization.engineeringUseAuthorized === true
    && nonEmpty(normalized.methodAuthorization.qualificationRecordHash);
  if (technicalQualificationReady && !methodAuthorized) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.METHOD_AUTHORITY_NOT_GRANTED,
    'EMP.1.C technical qualification gates are complete, but engineering-use authority has not been granted by a retained qualification record.',
    {
      engineeringUseAuthorized: normalized.methodAuthorization.engineeringUseAuthorized,
      qualificationRecordHashPresent: nonEmpty(normalized.methodAuthorization.qualificationRecordHash),
      authoritySource: normalized.methodAuthorization.authoritySource,
    },
  ));

  const routeRegistered = normalized.execution.routeRegistered === true;
  if (technicalQualificationReady && methodAuthorized && !routeRegistered) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.EXECUTION_ROUTE_NOT_REGISTERED,
    'EMP.1.C method authority is qualified, but no production local-correlation execution route is registered.',
    { routeRegistered },
  ));

  const runAuthorized = technicalQualificationReady && methodAuthorized && routeRegistered;
  return deepFreeze({
    schema: EMP1_C_QUALIFICATION_SCHEMA,
    state: runAuthorized ? 'READY_TO_RUN' : 'BLOCKED',
    technicalQualificationReady,
    engineeringUseAuthorized: methodAuthorized,
    runAuthorized,
    blockerCodes: blockers.map((item) => item.code),
    blockers,
    gateStatus: {
      wrcDatasetReady: datasetReady,
      wrcDimensionalContractReady: dimensionalContractReady,
      numericalCoefficientsReady: coefficientsReady,
      signArbitrationReady: signReady,
      cauxBenchmarkReady: cauxReady,
      methodAuthorized,
      executionRouteRegistered: routeRegistered,
    },
    evidence: normalized,
  });
}

function normalizeEvidence(value) {
  if (!value || typeof value !== 'object') throw new TypeError('EMP1_C_QUALIFICATION_EVIDENCE_REQUIRED');
  return {
    derivation: normalizeDerivation(value.derivation),
    wrcDataset: normalizeDataset(value.wrcDataset),
    signArbitration: normalizeSign(value.signArbitration),
    cauxBenchmark: normalizeCaux(value.cauxBenchmark),
    methodAuthorization: normalizeMethod(value.methodAuthorization),
    execution: normalizeExecution(value.execution),
  };
}

function normalizeDerivation(value = {}) {
  return {
    mode: text(value.mode, 'CALLER_SUPPLIED_EVIDENCE'),
    manualSummaryPermitted: value.manualSummaryPermitted === true,
    retainedAuditObservedMatch: value.retainedAuditObservedMatch === true,
    retainedExtractionPinVerified: value.retainedExtractionPinVerified === true,
    artifactPaths: value.artifactPaths && typeof value.artifactPaths === 'object'
      ? { ...value.artifactPaths }
      : {},
  };
}

function normalizeDataset(value = {}) {
  return {
    status: text(value.status, 'UNRESOLVED'),
    extractionStatus: text(value.extractionStatus, 'UNRESOLVED'),
    unresolvedJsonPathCount: count(value.unresolvedJsonPathCount),
    openIssueCount: count(value.openIssueCount),
    numericalDataCount: count(value.numericalDataCount),
    dimensionalContractStatus: text(value.dimensionalContractStatus, 'UNRESOLVED'),
    dimensionalViolationCount: count(value.dimensionalViolationCount),
    dimensionalViolationIds: Array.isArray(value.dimensionalViolationIds)
      ? value.dimensionalViolationIds.map((item) => text(item, 'UNRESOLVED_DIMENSIONAL_VIOLATION'))
      : ['UNRESOLVED_DIMENSIONAL_VIOLATION'],
    coefficientCurveRows: count(value.coefficientCurveRows),
    coefficientSchema: text(value.coefficientSchema, 'UNRESOLVED'),
    coefficientSchemaQualified: value.coefficientSchemaQualified === true,
    coefficientsPerCurve: count(value.coefficientsPerCurve),
    requiredScalarCoefficientCount: count(value.requiredScalarCoefficientCount),
    numericScalarCoefficientCount: count(value.numericScalarCoefficientCount),
    unresolvedScalarCoefficientCount: count(value.unresolvedScalarCoefficientCount),
    missingScalarCoefficientCount: count(value.missingScalarCoefficientCount),
    invalidScalarCoefficientCount: count(value.invalidScalarCoefficientCount),
    independentVariable: text(value.independentVariable, 'UNRESOLVED'),
    independentVariableRepresentation: text(value.independentVariableRepresentation, 'UNRESOLVED'),
    independentVariableQualified: value.independentVariableQualified === true,
    semanticHash: nullableText(value.semanticHash),
    sourceCustodyQualified: value.sourceCustodyQualified === true,
    sourceCustodyState: text(value.sourceCustodyState, 'UNRESOLVED'),
    sourceQualificationState: text(value.sourceQualificationState, 'BLOCKED'),
    sourceRawPdfSha256: nullableText(value.sourceRawPdfSha256),
  };
}

function normalizeSign(value = {}) {
  return {
    status: text(value.status, 'UNRESOLVED'),
    resolutionAuthority: text(value.resolutionAuthority, 'UNRESOLVED'),
    openConflicts: Array.isArray(value.openConflicts)
      ? value.openConflicts.map((item) => text(item, 'UNRESOLVED_CONFLICT'))
      : ['UNRESOLVED_CONFLICT'],
    sourceCustodyQualified: value.sourceCustodyQualified === true,
  };
}

function normalizeCaux(value = {}) {
  return {
    status: text(value.status, 'NOT_RUN'),
    sourceIdentityVerified: value.sourceIdentityVerified === true,
    sourceCustodyQualified: value.sourceCustodyQualified === true,
    sourceCustodyState: text(value.sourceCustodyState, 'UNRESOLVED'),
    sourceQualificationState: text(value.sourceQualificationState, 'BLOCKED'),
    sourceRawPdfSha256: nullableText(value.sourceRawPdfSha256),
    pageRange: text(value.pageRange, '24-31'),
    expectedValuesFrozen: value.expectedValuesFrozen === true,
    independentHandCalculationStatus: text(value.independentHandCalculationStatus, 'NOT_RUN'),
    benchmarkHash: nullableText(value.benchmarkHash),
    supplementalPrecheckVerdict: text(value.supplementalPrecheckVerdict, 'UNRESOLVED'),
    supplementalPrecheckMaySatisfyCauxA4: value.supplementalPrecheckMaySatisfyCauxA4 === true,
  };
}

function normalizeMethod(value = {}) {
  return {
    engineeringUseAuthorized: value.engineeringUseAuthorized === true,
    qualificationRecordHash: nullableText(value.qualificationRecordHash),
    authoritySource: text(value.authoritySource, 'UNRESOLVED'),
  };
}

function normalizeExecution(value = {}) {
  return { routeRegistered: value.routeRegistered === true };
}

function blocker(code, message, evidence) {
  return { code, message, evidence };
}

function count(value) {
  return Number.isInteger(value) && value >= 0 ? value : Number.MAX_SAFE_INTEGER;
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function displayPageRange(value) {
  return String(value ?? '').replace('-', '–');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
