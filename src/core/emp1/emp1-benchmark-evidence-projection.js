export const EMP1_BENCHMARK_EVIDENCE_SCHEMA = 'emp1-benchmark-evidence/v1';
export const EMP1_BENCHMARK_COMPARISON_STATE = Object.freeze({
  REFERENCE_NOT_AVAILABLE: 'REFERENCE_NOT_AVAILABLE',
  COMPARISON_QUALIFIED: 'COMPARISON_QUALIFIED',
  WITHIN_TOLERANCE_NOT_QUALIFIED: 'WITHIN_TOLERANCE_NOT_QUALIFIED',
  OUTSIDE_TOLERANCE: 'OUTSIDE_TOLERANCE',
});
const FALSE_AUTHORITY_FIELDS = Object.freeze([
  'wrcMethodAuthority',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
  'codeComplianceAuthorized',
  'releaseAuthorityGranted',
]);
/**
 * Project retained external benchmark evidence into a read-only EMP.1 view model.
 *
 * This module does not execute WRC equations, select tolerances, authorize routes,
 * or create code/release authority; it validates supplied evidence only.
 */
export function projectEmp1BenchmarkEvidence(input) {
  const value = requireRecord(input, 'EMP1_BENCHMARK_INPUT_REQUIRED');
  const comparator = projectComparator(value.comparator);
  const routeRelationship = projectRoute(value.route);
  if (value.referenceAvailable === false) {
    if (value.benchmark != null || value.qualification != null) {
      throw benchmarkError('EMP1_BENCHMARK_UNAVAILABLE_REFERENCE_MUST_NOT_CARRY_EVIDENCE');
    }
    if (array(value.comparison?.quantities).length > 0) {
      throw benchmarkError('EMP1_BENCHMARK_UNAVAILABLE_REFERENCE_MUST_NOT_CARRY_QUANTITIES');
    }
    return deepFreeze({
      schema: EMP1_BENCHMARK_EVIDENCE_SCHEMA,
      benchmarkId: value.benchmarkId ?? `${comparator.id}:REFERENCE_NOT_AVAILABLE`,
      comparator,
      caseId: value.caseId ?? null,
      authorityRole: value.authorityRole ?? null,
      sourceEvidence: { state: EMP1_BENCHMARK_COMPARISON_STATE.REFERENCE_NOT_AVAILABLE },
      freezeEvidence: { state: 'NOT_AVAILABLE' },
      methodRelationship: value.methodRelationship ?? null,
      routeRelationship,
      comparison: {
        state: EMP1_BENCHMARK_COMPARISON_STATE.REFERENCE_NOT_AVAILABLE,
        quantities: [],
        summary: null,
      },
      limitations: stringArray(value.limitations),
      authority: noAuthority(),
      authorityBoundary: authorityBoundary(),
    });
  }
  const benchmark = requireRecord(value.benchmark, 'EMP1_BENCHMARK_REFERENCE_REQUIRED');
  const qualification = requireRecord(
    value.qualification,
    'EMP1_BENCHMARK_QUALIFICATION_REQUIRED',
  );
  requireNoAuthority(benchmark.authority, 'REFERENCE');
  requireNoAuthority(qualification.authority, 'QUALIFICATION');
  verifyEvidenceIdentity(benchmark, qualification);
  const freezeEvidence = projectFreezeEvidence(benchmark, qualification, value.comparison);
  const comparison = projectComparison(value.comparison, routeRelationship);
  return deepFreeze({
    schema: EMP1_BENCHMARK_EVIDENCE_SCHEMA,
    benchmarkId: requiredString(benchmark.benchmarkId, 'EMP1_BENCHMARK_ID_REQUIRED'),
    comparator,
    caseId: value.caseId ?? benchmark.benchmarkId,
    authorityRole: requiredString(
      benchmark.source?.authorityRole,
      'EMP1_BENCHMARK_AUTHORITY_ROLE_REQUIRED',
    ),
    sourceEvidence: {
      semanticHash: requiredString(benchmark.semanticHash, 'EMP1_BENCHMARK_SEMANTIC_HASH_REQUIRED'),
      sourceDocument: benchmark.source?.document ?? null,
      sourceHash: benchmark.source?.rawPdfSha256 ?? null,
      custodyState: benchmark.source?.custodyState ?? null,
      directObservationState: benchmark.observation?.directPdfObservationStatus
        ?? qualification.source?.directPdfPageReobservation
        ?? null,
      qualificationState: qualification.status ?? null,
      qualificationId: qualification.qualificationId ?? null,
    },
    freezeEvidence,
    methodRelationship: value.methodRelationship ?? null,
    routeRelationship,
    comparison,
    limitations: stringArray(value.limitations),
    authority: noAuthority(),
    authorityBoundary: authorityBoundary(),
  });
}
function projectComparator(value) {
  const comparator = requireRecord(value, 'EMP1_BENCHMARK_COMPARATOR_REQUIRED');
  return Object.freeze({
    id: requiredString(comparator.id, 'EMP1_BENCHMARK_COMPARATOR_ID_REQUIRED'),
    name: requiredString(comparator.name, 'EMP1_BENCHMARK_COMPARATOR_NAME_REQUIRED'),
    version: comparator.version == null ? null : String(comparator.version),
  });
}
function projectRoute(value) {
  const route = requireRecord(value, 'EMP1_BENCHMARK_ROUTE_REQUIRED');
  if (typeof route.registered !== 'boolean'
    || typeof route.engineeringUseAuthorized !== 'boolean'
    || typeof route.comparisonQualificationAvailable !== 'boolean') {
    throw benchmarkError('EMP1_BENCHMARK_ROUTE_AUTHORITY_FIELDS_REQUIRED');
  }
  return Object.freeze({
    routeId: requiredString(route.routeId, 'EMP1_BENCHMARK_ROUTE_ID_REQUIRED'),
    registered: route.registered,
    engineeringUseAuthorized: route.engineeringUseAuthorized,
    comparisonQualificationAvailable: route.comparisonQualificationAvailable,
    state: route.engineeringUseAuthorized
      ? 'ENGINEERING_USE_AUTHORIZED'
      : 'OUTSIDE_AUTHORIZED_ENGINEERING_ROUTE',
  });
}
function verifyEvidenceIdentity(benchmark, qualification) {
  const semanticHash = requiredString(benchmark.semanticHash, 'EMP1_BENCHMARK_SEMANTIC_HASH_REQUIRED');
  if (qualification.benchmark?.semanticHash !== semanticHash) {
    throw benchmarkError('EMP1_BENCHMARK_QUALIFICATION_HASH_MISMATCH');
  }
  const sourceHash = benchmark.source?.rawPdfSha256 ?? null;
  const qualificationSourceHash = qualification.source?.rawPdfSha256 ?? null;
  if (sourceHash && qualificationSourceHash && sourceHash !== qualificationSourceHash) {
    throw benchmarkError('EMP1_BENCHMARK_SOURCE_HASH_MISMATCH');
  }
}
function projectFreezeEvidence(benchmark, qualification, comparison) {
  const benchmarkFreeze = requireRecord(benchmark.freeze, 'EMP1_BENCHMARK_FREEZE_REQUIRED');
  const qualificationFreeze = requireRecord(
    qualification.freeze,
    'EMP1_BENCHMARK_QUALIFICATION_FREEZE_REQUIRED',
  );
  if (benchmarkFreeze.expectedValuesFrozen !== true
    || benchmarkFreeze.frozenBeforeProductionComparison !== true
    || benchmarkFreeze.productionOutputObservedForExpectedValueSelection !== false
    || benchmarkFreeze.productionOutputUsedToChooseDefinition !== false
    || benchmarkFreeze.toleranceDerivedFromProduction !== false
    || qualificationFreeze.expectedValuesFrozenBeforeProductionObservation !== true
    || qualificationFreeze.productionOutputObservedForExpectedValueSelection !== false
    || qualificationFreeze.productionOutputUsedToChooseDefinition !== false) {
    throw benchmarkError('EMP1_BENCHMARK_FREEZE_NOT_ANTI_CIRCULAR');
  }
  if (comparison?.toleranceFrozenBeforeEmpObservation !== true) {
    throw benchmarkError('EMP1_BENCHMARK_TOLERANCE_FREEZE_REQUIRED');
  }
  return Object.freeze({
    state: 'REFERENCE_FROZEN',
    expectedValuesFrozenBeforeEmpObservation: true,
    productionOutputUsedToChooseExpectedValues: false,
    productionOutputUsedToChooseDefinition: false,
    toleranceDerivedFromProduction: false,
    toleranceFrozenBeforeEmpObservation: true,
  });
}
function projectComparison(value, routeRelationship) {
  const comparison = requireRecord(value, 'EMP1_BENCHMARK_COMPARISON_REQUIRED');
  const quantities = array(comparison.quantities).map(projectQuantity);
  if (quantities.length === 0) throw benchmarkError('EMP1_BENCHMARK_COMPARISON_QUANTITIES_REQUIRED');
  const allWithinTolerance = quantities.every((quantity) => quantity.withinTolerance);
  const qualificationClaimed = comparison.qualificationAvailable === true;
  if (qualificationClaimed && routeRelationship.comparisonQualificationAvailable !== true) {
    throw benchmarkError('EMP1_BENCHMARK_ROUTE_COMPARISON_QUALIFICATION_MISMATCH');
  }
  if (qualificationClaimed && !allWithinTolerance) {
    throw benchmarkError('EMP1_BENCHMARK_QUALIFICATION_CLAIM_OUTSIDE_TOLERANCE');
  }
  const state = !allWithinTolerance
    ? EMP1_BENCHMARK_COMPARISON_STATE.OUTSIDE_TOLERANCE
    : qualificationClaimed
      ? EMP1_BENCHMARK_COMPARISON_STATE.COMPARISON_QUALIFIED
      : EMP1_BENCHMARK_COMPARISON_STATE.WITHIN_TOLERANCE_NOT_QUALIFIED;
  return Object.freeze({
    state,
    quantities: Object.freeze(quantities),
    summary: projectSummary(quantities, comparison.governing),
  });
}
function projectQuantity(value) {
  const quantity = requireRecord(value, 'EMP1_BENCHMARK_QUANTITY_INVALID');
  const referenceValue = finiteNumber(quantity.referenceValue, 'EMP1_BENCHMARK_REFERENCE_VALUE_INVALID');
  const emp1Value = finiteNumber(quantity.emp1Value, 'EMP1_BENCHMARK_EMP1_VALUE_INVALID');
  const referenceUnit = requiredString(quantity.referenceUnit, 'EMP1_BENCHMARK_REFERENCE_UNIT_REQUIRED');
  const emp1Unit = requiredString(quantity.emp1Unit, 'EMP1_BENCHMARK_EMP1_UNIT_REQUIRED');
  if (referenceUnit !== emp1Unit) throw benchmarkError('EMP1_BENCHMARK_UNIT_MISMATCH');
  const tolerance = projectTolerance(quantity.tolerance);
  const absoluteDifference = emp1Value - referenceValue;
  const relativeDifferencePercent = referenceValue === 0
    ? null
    : absoluteDifference / referenceValue * 100;
  const withinTolerance = tolerance.kind === 'RELATIVE_PERCENT'
    ? relativeDifferencePercent != null
      && Math.abs(relativeDifferencePercent) <= tolerance.value
    : Math.abs(absoluteDifference) <= tolerance.value;
  return Object.freeze({
    quantityId: requiredString(quantity.quantityId, 'EMP1_BENCHMARK_QUANTITY_ID_REQUIRED'),
    location: quantity.location == null ? null : String(quantity.location),
    description: quantity.description == null ? null : String(quantity.description),
    referenceValue,
    referenceUnit,
    emp1Value,
    emp1Unit,
    absoluteDifference,
    relativeDifferencePercent,
    tolerance,
    toleranceBasis: requiredString(
      quantity.toleranceBasis,
      'EMP1_BENCHMARK_TOLERANCE_BASIS_REQUIRED',
    ),
    withinTolerance,
    status: withinTolerance ? 'WITHIN_TOLERANCE' : 'OUTSIDE_TOLERANCE',
    sourceLocator: requiredString(quantity.sourceLocator, 'EMP1_BENCHMARK_SOURCE_LOCATOR_REQUIRED'),
  });
}
function projectTolerance(value) {
  const tolerance = requireRecord(value, 'EMP1_BENCHMARK_TOLERANCE_REQUIRED');
  const kind = requiredString(tolerance.kind, 'EMP1_BENCHMARK_TOLERANCE_KIND_REQUIRED');
  if (!['RELATIVE_PERCENT', 'ABSOLUTE'].includes(kind)) {
    throw benchmarkError('EMP1_BENCHMARK_TOLERANCE_KIND_UNSUPPORTED');
  }
  const amount = finiteNumber(tolerance.value, 'EMP1_BENCHMARK_TOLERANCE_VALUE_INVALID');
  if (amount < 0) throw benchmarkError('EMP1_BENCHMARK_TOLERANCE_VALUE_INVALID');
  return Object.freeze({ kind, value: amount, unit: tolerance.unit ?? null });
}
function projectSummary(quantities, governing) {
  const maxAbsolute = quantities.reduce((a, b) => (
    Math.abs(b.absoluteDifference) > Math.abs(a.absoluteDifference) ? b : a
  ));
  const relative = quantities.filter((quantity) => quantity.relativeDifferencePercent != null);
  const maxRelative = relative.length === 0 ? null : relative.reduce((a, b) => (
    Math.abs(b.relativeDifferencePercent) > Math.abs(a.relativeDifferencePercent) ? b : a
  ));
  const governingEvidence = governing == null ? null : requireRecord(
    governing,
    'EMP1_BENCHMARK_GOVERNING_INVALID',
  );
  return Object.freeze({
    comparedQuantities: quantities.length,
    withinToleranceCount: quantities.filter((quantity) => quantity.withinTolerance).length,
    worstAbsoluteDifference: Math.abs(maxAbsolute.absoluteDifference),
    worstAbsoluteDifferenceQuantityId: maxAbsolute.quantityId,
    worstRelativeDifferencePercent: maxRelative == null
      ? null
      : Math.abs(maxRelative.relativeDifferencePercent),
    worstRelativeDifferenceQuantityId: maxRelative?.quantityId ?? null,
    governingReferenceLocation: governingEvidence?.referenceLocation ?? null,
    governingEmp1Location: governingEvidence?.emp1Location ?? null,
    governingLocationAgreement: governingEvidence == null
      ? null
      : governingEvidence.referenceLocation === governingEvidence.emp1Location,
  });
}
function requireNoAuthority(value, source) {
  const authority = requireRecord(value, `EMP1_BENCHMARK_${source}_AUTHORITY_REQUIRED`);
  for (const field of FALSE_AUTHORITY_FIELDS) {
    if (authority[field] !== false) {
      throw benchmarkError(`EMP1_BENCHMARK_${source}_AUTHORITY_MUST_BE_FALSE:${field}`);
    }
  }
}
function noAuthority() {
  return Object.freeze(Object.fromEntries(FALSE_AUTHORITY_FIELDS.map((field) => [field, false])));
}
function authorityBoundary() {
  return Object.freeze({
    projectionOnly: true,
    createsWrcMethodAuthority: false,
    createsEngineeringUseAuthority: false,
    createsProductionAuthority: false,
    createsCodeComplianceAuthority: false,
    createsReleaseAuthority: false,
  });
}
function stringArray(value) {
  return Object.freeze(array(value).map(String));
}
function array(value) {
  return Array.isArray(value) ? value : [];
}
function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw benchmarkError(code);
  return value;
}
function requiredString(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw benchmarkError(code);
  return value;
}
function finiteNumber(value, code) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw benchmarkError(code);
  return value;
}
function benchmarkError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
