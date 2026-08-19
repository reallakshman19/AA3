export const EMP1_C_QUALIFICATION_SCHEMA = 'emp1-c-qualification-state/v1';

export const EMP1_C_BLOCKER_CODES = Object.freeze({
  WRC_DATASET_NOT_READY: 'WRC_DATASET_NOT_READY',
  WRC_NUMERICAL_COEFFICIENTS_MISSING: 'WRC_NUMERICAL_COEFFICIENTS_MISSING',
  WRC_SIGN_ARBITRATION_OPEN: 'WRC_SIGN_ARBITRATION_OPEN',
  CAUX_PP24_31_NOT_FROZEN: 'CAUX_PP24_31_NOT_FROZEN',
  METHOD_AUTHORITY_NOT_GRANTED: 'EMP1_C_METHOD_AUTHORITY_NOT_GRANTED',
  EXECUTION_ROUTE_NOT_REGISTERED: 'EMP1_C_EXECUTION_ROUTE_NOT_REGISTERED',
});

/**
 * Frozen evidence summary for the currently merged EMP.1.C qualification state.
 * This is qualification metadata only; it contains no WRC coefficient, equation,
 * sign resolution or CAUx expected value and therefore cannot manufacture method
 * authority. Future source-qualified work may pass a replacement evidence object
 * to evaluateEmp1CQualificationState().
 */
export const EMP1_C_CURRENT_QUALIFICATION_EVIDENCE = deepFreeze({
  schema: 'emp1-c-qualification-evidence/v1',
  wrcDataset: {
    status: 'BLOCKED',
    extractionStatus: 'NOT_READY_FOR_IMPLEMENTATION',
    unresolvedJsonPathCount: 21,
    openIssueCount: 7,
    numericalDataCount: 0,
    coefficientInventoryRows: 120,
    numericCoefficientRows: 0,
    unresolvedCoefficientRows: 120,
    unresolvedParameterRows: 120,
    semanticHash: null,
  },
  signArbitration: {
    status: 'BLOCKED',
    resolutionAuthority: 'PINNED_WRC_PDF_ONLY',
    openConflicts: [
      'SPHERICAL_M1_DERIVED_D_TO_C_VS_HEXAGON_A_TO_B',
      'SPHERICAL_M2_DERIVED_B_TO_A_VS_HEXAGON_D_TO_C',
    ],
  },
  cauxBenchmark: {
    status: 'NOT_RUN',
    sourceIdentityVerified: true,
    pageRange: '24-31',
    expectedValuesFrozen: false,
    independentHandCalculationStatus: 'NOT_RUN',
    benchmarkHash: null,
  },
  methodAuthorization: {
    engineeringUseAuthorized: false,
    qualificationRecordHash: null,
  },
  execution: {
    routeRegistered: false,
  },
});

export function evaluateEmp1CQualificationState(evidence = EMP1_C_CURRENT_QUALIFICATION_EVIDENCE) {
  const normalized = normalizeEvidence(evidence);
  const blockers = [];

  const datasetReady = normalized.wrcDataset.status === 'PASS'
    && normalized.wrcDataset.extractionStatus === 'READY_FOR_IMPLEMENTATION'
    && normalized.wrcDataset.unresolvedJsonPathCount === 0
    && normalized.wrcDataset.openIssueCount === 0
    && normalized.wrcDataset.numericalDataCount > 0
    && nonEmpty(normalized.wrcDataset.semanticHash);
  if (!datasetReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_DATASET_NOT_READY,
    `WRC extraction package is not READY_FOR_IMPLEMENTATION (${normalized.wrcDataset.unresolvedJsonPathCount} unresolved fields; ${normalized.wrcDataset.openIssueCount} open issues; numericalData=${normalized.wrcDataset.numericalDataCount}).`,
    {
      status: normalized.wrcDataset.status,
      extractionStatus: normalized.wrcDataset.extractionStatus,
      unresolvedJsonPathCount: normalized.wrcDataset.unresolvedJsonPathCount,
      openIssueCount: normalized.wrcDataset.openIssueCount,
      numericalDataCount: normalized.wrcDataset.numericalDataCount,
      semanticHashPresent: nonEmpty(normalized.wrcDataset.semanticHash),
    },
  ));

  const coefficientsReady = normalized.wrcDataset.coefficientInventoryRows > 0
    && normalized.wrcDataset.numericCoefficientRows === normalized.wrcDataset.coefficientInventoryRows
    && normalized.wrcDataset.unresolvedCoefficientRows === 0
    && normalized.wrcDataset.unresolvedParameterRows === 0;
  if (!coefficientsReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_NUMERICAL_COEFFICIENTS_MISSING,
    `WRC a–j numerical coefficient payload is not qualified (${normalized.wrcDataset.numericCoefficientRows}/${normalized.wrcDataset.coefficientInventoryRows} retained coefficient rows numeric; ${normalized.wrcDataset.unresolvedCoefficientRows} unresolved coefficient rows; ${normalized.wrcDataset.unresolvedParameterRows} unresolved parameter rows).`,
    {
      coefficientInventoryRows: normalized.wrcDataset.coefficientInventoryRows,
      numericCoefficientRows: normalized.wrcDataset.numericCoefficientRows,
      unresolvedCoefficientRows: normalized.wrcDataset.unresolvedCoefficientRows,
      unresolvedParameterRows: normalized.wrcDataset.unresolvedParameterRows,
    },
  ));

  const signReady = normalized.signArbitration.status === 'PASS'
    && normalized.signArbitration.resolutionAuthority === 'PINNED_WRC_PDF'
    && normalized.signArbitration.openConflicts.length === 0;
  if (!signReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.WRC_SIGN_ARBITRATION_OPEN,
    `WRC load/sign convention arbitration remains open (${normalized.signArbitration.openConflicts.length} recorded conflict(s)); only the pinned WRC PDF may resolve it.`,
    {
      status: normalized.signArbitration.status,
      resolutionAuthority: normalized.signArbitration.resolutionAuthority,
      openConflicts: normalized.signArbitration.openConflicts,
    },
  ));

  const cauxReady = normalized.cauxBenchmark.status === 'PASS'
    && normalized.cauxBenchmark.sourceIdentityVerified === true
    && normalized.cauxBenchmark.expectedValuesFrozen === true
    && normalized.cauxBenchmark.independentHandCalculationStatus === 'PASS'
    && nonEmpty(normalized.cauxBenchmark.benchmarkHash);
  if (!cauxReady) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.CAUX_PP24_31_NOT_FROZEN,
    `CAUx 2017 pp.${normalized.cauxBenchmark.pageRange} benchmark values and independent hand calculation are not frozen (benchmark=${normalized.cauxBenchmark.status}; independent=${normalized.cauxBenchmark.independentHandCalculationStatus}).`,
    {
      status: normalized.cauxBenchmark.status,
      sourceIdentityVerified: normalized.cauxBenchmark.sourceIdentityVerified,
      pageRange: normalized.cauxBenchmark.pageRange,
      expectedValuesFrozen: normalized.cauxBenchmark.expectedValuesFrozen,
      independentHandCalculationStatus: normalized.cauxBenchmark.independentHandCalculationStatus,
      benchmarkHashPresent: nonEmpty(normalized.cauxBenchmark.benchmarkHash),
    },
  ));

  const technicalQualificationReady = datasetReady && coefficientsReady && signReady && cauxReady;
  const methodAuthorized = normalized.methodAuthorization.engineeringUseAuthorized === true
    && nonEmpty(normalized.methodAuthorization.qualificationRecordHash);
  if (technicalQualificationReady && !methodAuthorized) blockers.push(blocker(
    EMP1_C_BLOCKER_CODES.METHOD_AUTHORITY_NOT_GRANTED,
    'EMP.1.C technical qualification gates are complete, but engineering-use authority has not been granted by a retained qualification record.',
    {
      engineeringUseAuthorized: normalized.methodAuthorization.engineeringUseAuthorized,
      qualificationRecordHashPresent: nonEmpty(normalized.methodAuthorization.qualificationRecordHash),
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
    wrcDataset: normalizeDataset(value.wrcDataset),
    signArbitration: normalizeSign(value.signArbitration),
    cauxBenchmark: normalizeCaux(value.cauxBenchmark),
    methodAuthorization: normalizeMethod(value.methodAuthorization),
    execution: normalizeExecution(value.execution),
  };
}

function normalizeDataset(value = {}) {
  return {
    status: text(value.status, 'UNRESOLVED'),
    extractionStatus: text(value.extractionStatus, 'UNRESOLVED'),
    unresolvedJsonPathCount: count(value.unresolvedJsonPathCount),
    openIssueCount: count(value.openIssueCount),
    numericalDataCount: count(value.numericalDataCount),
    coefficientInventoryRows: count(value.coefficientInventoryRows),
    numericCoefficientRows: count(value.numericCoefficientRows),
    unresolvedCoefficientRows: count(value.unresolvedCoefficientRows),
    unresolvedParameterRows: count(value.unresolvedParameterRows),
    semanticHash: nullableText(value.semanticHash),
  };
}

function normalizeSign(value = {}) {
  return {
    status: text(value.status, 'UNRESOLVED'),
    resolutionAuthority: text(value.resolutionAuthority, 'UNRESOLVED'),
    openConflicts: Array.isArray(value.openConflicts)
      ? value.openConflicts.map((item) => text(item, 'UNRESOLVED_CONFLICT'))
      : ['UNRESOLVED_CONFLICT'],
  };
}

function normalizeCaux(value = {}) {
  return {
    status: text(value.status, 'NOT_RUN'),
    sourceIdentityVerified: value.sourceIdentityVerified === true,
    pageRange: text(value.pageRange, '24-31'),
    expectedValuesFrozen: value.expectedValuesFrozen === true,
    independentHandCalculationStatus: text(value.independentHandCalculationStatus, 'NOT_RUN'),
    benchmarkHash: nullableText(value.benchmarkHash),
  };
}

function normalizeMethod(value = {}) {
  return {
    engineeringUseAuthorized: value.engineeringUseAuthorized === true,
    qualificationRecordHash: nullableText(value.qualificationRecordHash),
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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
