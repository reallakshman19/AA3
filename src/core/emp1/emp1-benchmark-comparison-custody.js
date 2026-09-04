export const EMP1_BENCHMARK_COMPARISON_CUSTODY_SCHEMA =
  'emp1-benchmark-comparison-custody/v1';

const BENCHMARK_EVIDENCE_SCHEMA = 'emp1-benchmark-evidence/v1';
const RETAINABLE_COMPARISON_STATES = new Set([
  'COMPARISON_QUALIFIED',
  'WITHIN_TOLERANCE_NOT_QUALIFIED',
  'OUTSIDE_TOLERANCE',
]);
const FALSE_AUTHORITY_FIELDS = Object.freeze([
  'wrcMethodAuthority',
  'engineeringUseAuthorized',
  'productionUseAuthorized',
  'codeComplianceAuthorized',
  'releaseAuthorityGranted',
]);
const FALSE_EVIDENCE_BOUNDARY_FIELDS = Object.freeze([
  'createsWrcMethodAuthority',
  'createsEngineeringUseAuthority',
  'createsProductionAuthority',
  'createsCodeComplianceAuthority',
  'createsReleaseAuthority',
]);
const FORBIDDEN_PROVENANCE_FLAGS = Object.freeze([
  'inferredWithoutExecution',
  'approximateValues',
  'derivedFromConsoleSummary',
  'manuallyReconstructed',
]);

/**
 * Bind an already-projected EMP.1 benchmark comparison to explicit execution
 * provenance and a route-authority snapshot. This owner never evaluates WRC,
 * selects a tolerance, changes expected values, or creates engineering authority.
 */
export function createEmp1BenchmarkComparisonCustody(input) {
  const value = requireRecord(input, 'EMP1_BENCHMARK_CUSTODY_INPUT_REQUIRED');
  const evidence = requireEvidence(value.evidence);
  const execution = requireExecution(value.execution, evidence);
  const routeAuthority = requireRouteAuthority(value.routeAuthority, evidence.routeRelationship);

  return deepFreeze({
    schema: EMP1_BENCHMARK_COMPARISON_CUSTODY_SCHEMA,
    custodyId: requiredString(value.custodyId, 'EMP1_BENCHMARK_CUSTODY_ID_REQUIRED'),
    state: 'RETAINED_ACTUAL_EXECUTION_COMPARISON',
    benchmark: {
      benchmarkId: evidence.benchmarkId,
      comparator: copy(evidence.comparator),
      caseId: evidence.caseId ?? null,
      authorityRole: evidence.authorityRole ?? null,
      sourceEvidence: copy(evidence.sourceEvidence),
      freezeEvidence: copy(evidence.freezeEvidence),
    },
    methodRelationship: copy(evidence.methodRelationship),
    routeRelationship: copy(evidence.routeRelationship),
    routeAuthority,
    execution,
    comparison: {
      state: evidence.comparison.state,
      quantities: copy(evidence.comparison.quantities),
      summary: copy(evidence.comparison.summary),
    },
    limitations: copy(array(evidence.limitations).map(String)),
    authority: noAuthority(),
    authorityBoundary: custodyAuthorityBoundary(),
  });
}

function requireEvidence(value) {
  const evidence = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_EVIDENCE_REQUIRED');
  if (evidence.schema !== BENCHMARK_EVIDENCE_SCHEMA) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EVIDENCE_SCHEMA_INVALID');
  }
  requiredString(evidence.benchmarkId, 'EMP1_BENCHMARK_CUSTODY_BENCHMARK_ID_REQUIRED');
  requireComparator(evidence.comparator);
  requireNoAuthority(evidence.authority, 'EVIDENCE');
  requireEvidenceBoundary(evidence.authorityBoundary);
  requireFreezeEvidence(evidence.freezeEvidence);

  const route = requireRouteRelationship(evidence.routeRelationship);
  const comparison = requireRecord(
    evidence.comparison,
    'EMP1_BENCHMARK_CUSTODY_COMPARISON_REQUIRED',
  );
  if (!RETAINABLE_COMPARISON_STATES.has(comparison.state)) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_COMPARISON_STATE_NOT_RETAINABLE');
  }
  if (comparison.state === 'COMPARISON_QUALIFIED'
    && route.comparisonQualificationAvailable !== true) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_COMPARISON_QUALIFICATION_ROUTE_MISMATCH');
  }
  const quantities = array(comparison.quantities);
  if (quantities.length === 0) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_QUANTITIES_REQUIRED');
  }
  const quantityIds = quantities.map((quantity) => {
    const row = requireRecord(quantity, 'EMP1_BENCHMARK_CUSTODY_QUANTITY_INVALID');
    return requiredString(row.quantityId, 'EMP1_BENCHMARK_CUSTODY_QUANTITY_ID_REQUIRED');
  });
  if (new Set(quantityIds).size !== quantityIds.length) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_QUANTITY_IDS_NOT_UNIQUE');
  }
  requireRecord(comparison.summary, 'EMP1_BENCHMARK_CUSTODY_SUMMARY_REQUIRED');
  requiredString(
    evidence.sourceEvidence?.semanticHash,
    'EMP1_BENCHMARK_CUSTODY_SOURCE_SEMANTIC_HASH_REQUIRED',
  );
  return { ...evidence, routeRelationship: route, comparison: { ...comparison, quantities } };
}

function requireComparator(value) {
  const comparator = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_COMPARATOR_REQUIRED');
  requiredString(comparator.id, 'EMP1_BENCHMARK_CUSTODY_COMPARATOR_ID_REQUIRED');
  requiredString(comparator.name, 'EMP1_BENCHMARK_CUSTODY_COMPARATOR_NAME_REQUIRED');
}

function requireFreezeEvidence(value) {
  const freeze = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_FREEZE_EVIDENCE_REQUIRED');
  if (freeze.state !== 'REFERENCE_FROZEN'
    || freeze.expectedValuesFrozenBeforeEmpObservation !== true
    || freeze.productionOutputUsedToChooseExpectedValues !== false
    || freeze.productionOutputUsedToChooseDefinition !== false
    || freeze.toleranceDerivedFromProduction !== false
    || freeze.toleranceFrozenBeforeEmpObservation !== true) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_FREEZE_EVIDENCE_INVALID');
  }
}

function requireRouteRelationship(value) {
  const route = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_ROUTE_REQUIRED');
  const booleans = ['registered', 'engineeringUseAuthorized', 'comparisonQualificationAvailable'];
  for (const field of booleans) {
    if (typeof route[field] !== 'boolean') {
      throw custodyError(`EMP1_BENCHMARK_CUSTODY_ROUTE_FIELD_REQUIRED:${field}`);
    }
  }
  requiredString(route.routeId, 'EMP1_BENCHMARK_CUSTODY_ROUTE_ID_REQUIRED');
  const expectedState = route.engineeringUseAuthorized
    ? 'ENGINEERING_USE_AUTHORIZED'
    : 'OUTSIDE_AUTHORIZED_ENGINEERING_ROUTE';
  if (route.state !== expectedState) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_ROUTE_STATE_MISMATCH');
  }
  return route;
}

function requireExecution(value, evidence) {
  const execution = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_EXECUTION_REQUIRED');
  if (execution.kind !== 'ACTUAL_EMP_COMPARISON_EXECUTION' || execution.executed !== true) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_ACTUAL_EXECUTION_REQUIRED');
  }
  if (execution.provenanceClass !== 'DIRECT_EXECUTION_OBSERVATION'
    || execution.projectionInputSource !== 'ACTUAL_EXECUTION_RESULT') {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EXECUTION_PROVENANCE_INVALID');
  }
  for (const field of FORBIDDEN_PROVENANCE_FLAGS) {
    if (execution[field] !== false) {
      throw custodyError(`EMP1_BENCHMARK_CUSTODY_FORBIDDEN_PROVENANCE:${field}`);
    }
  }
  const repositoryCommit = requiredString(
    execution.repositoryCommit,
    'EMP1_BENCHMARK_CUSTODY_EXECUTION_COMMIT_REQUIRED',
  );
  if (!/^[0-9a-f]{40}$/i.test(repositoryCommit)) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EXECUTION_COMMIT_INVALID');
  }
  requiredString(execution.scriptPath, 'EMP1_BENCHMARK_CUSTODY_EXECUTION_SCRIPT_REQUIRED');
  requiredString(execution.executedAt, 'EMP1_BENCHMARK_CUSTODY_EXECUTED_AT_REQUIRED');
  requiredString(execution.executor, 'EMP1_BENCHMARK_CUSTODY_EXECUTOR_REQUIRED');

  const expectedIds = evidence.comparison.quantities.map((quantity) => quantity.quantityId);
  const observedIds = array(execution.observedQuantityIds).map(String);
  if (new Set(observedIds).size !== observedIds.length) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EXECUTION_QUANTITY_IDS_NOT_UNIQUE');
  }
  if (observedIds.length !== expectedIds.length
    || observedIds.some((quantityId, index) => quantityId !== expectedIds[index])) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EXECUTION_QUANTITY_SET_MISMATCH');
  }

  return deepFreeze({
    kind: execution.kind,
    executed: true,
    provenanceClass: execution.provenanceClass,
    projectionInputSource: execution.projectionInputSource,
    repositoryCommit,
    scriptPath: execution.scriptPath,
    executedAt: execution.executedAt,
    executor: execution.executor,
    observedQuantityIds: [...observedIds],
    inferredWithoutExecution: false,
    approximateValues: false,
    derivedFromConsoleSummary: false,
    manuallyReconstructed: false,
  });
}

function requireRouteAuthority(value, routeRelationship) {
  const authority = requireRecord(value, 'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_REQUIRED');
  const snapshot = requireRecord(
    authority.snapshot,
    'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_SNAPSHOT_REQUIRED',
  );
  const snapshotHash = requiredString(
    authority.snapshotHash,
    'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_HASH_REQUIRED',
  );
  requiredString(authority.capturedAt, 'EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_CAPTURED_AT_REQUIRED');
  if (snapshot.routeId !== routeRelationship.routeId) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_ID_MISMATCH');
  }
  for (const field of ['registered', 'engineeringUseAuthorized', 'comparisonQualificationAvailable']) {
    if (snapshot[field] !== routeRelationship[field]) {
      throw custodyError(`EMP1_BENCHMARK_CUSTODY_ROUTE_AUTHORITY_MISMATCH:${field}`);
    }
  }
  return deepFreeze({
    snapshotHash,
    capturedAt: authority.capturedAt,
    snapshot: copy(snapshot),
  });
}

function requireNoAuthority(value, source) {
  const authority = requireRecord(value, `EMP1_BENCHMARK_CUSTODY_${source}_AUTHORITY_REQUIRED`);
  for (const field of FALSE_AUTHORITY_FIELDS) {
    if (authority[field] !== false) {
      throw custodyError(`EMP1_BENCHMARK_CUSTODY_${source}_AUTHORITY_MUST_BE_FALSE:${field}`);
    }
  }
}

function requireEvidenceBoundary(value) {
  const boundary = requireRecord(
    value,
    'EMP1_BENCHMARK_CUSTODY_EVIDENCE_AUTHORITY_BOUNDARY_REQUIRED',
  );
  if (boundary.projectionOnly !== true) {
    throw custodyError('EMP1_BENCHMARK_CUSTODY_EVIDENCE_PROJECTION_ONLY_REQUIRED');
  }
  for (const field of FALSE_EVIDENCE_BOUNDARY_FIELDS) {
    if (boundary[field] !== false) {
      throw custodyError(`EMP1_BENCHMARK_CUSTODY_EVIDENCE_BOUNDARY_MUST_BE_FALSE:${field}`);
    }
  }
}

function noAuthority() {
  return Object.freeze(Object.fromEntries(FALSE_AUTHORITY_FIELDS.map((field) => [field, false])));
}

function custodyAuthorityBoundary() {
  return Object.freeze({
    custodyOnly: true,
    executesWrcMethod: false,
    selectsTolerance: false,
    mutatesExpectedValues: false,
    createsWrcMethodAuthority: false,
    createsEngineeringUseAuthority: false,
    createsProductionAuthority: false,
    createsCodeComplianceAuthority: false,
    createsReleaseAuthority: false,
  });
}

function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw custodyError(code);
  return value;
}

function requiredString(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw custodyError(code);
  return value;
}

function custodyError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
