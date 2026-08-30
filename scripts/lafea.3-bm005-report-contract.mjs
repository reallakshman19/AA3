import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';

export const BM005_REPORT_SCHEMA = 'lafea3-bm005-audit-report/v1';
export const BM005_REPORT_HASH_PROFILE = 'LAFEA_CANONICAL_JSON_SHA256_V1';

export function createBm005AuditReport(input) {
  const definition = benchmarkDefinition(input?.benchmarkDefinition);
  const sourceRegistry = oracleRegistry(input?.oracleSourceRegistry, definition);
  const candidateHeadSha = gitSha(input?.candidateHeadSha, 'BM005_REPORT_CANDIDATE_HEAD_INVALID');
  const cleanTree = input?.cleanTree === true;
  const observations = observationRows(input?.observations, definition);
  const convergence = convergenceEvidence(input?.convergence, definition, observations);
  const negativeControl = negativeEvidence(input?.negativeControl, definition);
  const lineage = lineageEvidence(input?.lineage);
  const expected = definition.oracle.fixedProbeExpected.displacementMagnitudeMm;
  const finest = observations.at(-1);
  const absoluteError = Math.abs(finest.value - expected);
  const relativeError = Math.abs(expected) > 0 ? absoluteError / Math.abs(expected) : null;
  const gciFineAbsolute = nullableFinite(convergence.gciFineAbsolute, 'BM005_REPORT_GCI_FINE_INVALID');
  const oracleCoveredByGci = gciFineAbsolute !== null && absoluteError <= gciFineAbsolute;
  const asymptoticRangeAccepted = convergence.classification
    === definition.acceptance.requireConvergenceClassification;
  const pointwiseAcceptanceEligible = convergence.pointwiseAcceptanceEligible === true;
  const oracleComparison = freeze({
    expectedValue: expected,
    actualFineValue: finest.value,
    units: definition.probe.units,
    absoluteError,
    relativeError,
    gciFineAbsolute,
    gciFinePercent: nullableFinite(convergence.gciFinePercent, 'BM005_REPORT_GCI_FINE_PERCENT_INVALID'),
    richardsonExtrapolatedValue: nullableFinite(
      convergence.richardsonExtrapolatedValue,
      'BM005_REPORT_RICHARDSON_INVALID',
    ),
    oracleCoveredByGci,
    status: oracleCoveredByGci ? 'PASS' : 'FAIL',
  });
  const benchmarkQualified = cleanTree
    && observations.length >= definition.acceptance.minimumLevels
    && new Set(observations.map((row) => row.meshHash)).size === observations.length
    && asymptoticRangeAccepted
    && pointwiseAcceptanceEligible
    && oracleCoveredByGci
    && negativeControl.status === 'PASS_EXPECTED_REJECTION';
  const resultPublicationQualified = input?.resultPublicationQualified === true;
  const authority = freeze({
    benchmarkQualified,
    resultPublicationQualified,
    releaseQualified: false,
    coreFeaCompletionProven: false,
    reasons: freeze(qualificationReasons({
      cleanTree,
      observations,
      definition,
      asymptoticRangeAccepted,
      pointwiseAcceptanceEligible,
      oracleCoveredByGci,
      negativeControl,
    })),
  });
  const benchmarkDefinitionHash = canonicalLafeaSha256(definition);
  const oracleSourceRegistryHash = canonicalLafeaSha256(sourceRegistry);
  const semantic = freeze({
    schema: BM005_REPORT_SCHEMA,
    benchmarkId: definition.benchmarkId,
    stageId: definition.stageId,
    route: definition.route,
    benchmarkDefinitionHash,
    oracleSourceRegistryHash,
    lineage,
    observations,
    convergence: freeze({
      classification: convergence.classification,
      observedOrders: freeze([...convergence.observedOrders]),
      observedOrder: nullableFinite(convergence.observedOrder, 'BM005_REPORT_OBSERVED_ORDER_INVALID'),
      richardsonExtrapolatedValue: oracleComparison.richardsonExtrapolatedValue,
      gciFineAbsolute: oracleComparison.gciFineAbsolute,
      gciFinePercent: oracleComparison.gciFinePercent,
      pointwiseAcceptanceEligible,
      asymptoticRangeAccepted,
    }),
    oracleComparison,
    negativeControl,
    authority,
  });
  const semanticHash = canonicalLafeaSha256({
    schema: 'lafea3-bm005-semantic-hash-input/v1',
    report: semantic,
  });
  const qualificationEvidence = freeze(structuredClone(input?.qualificationEvidence ?? {}));
  const diagnostics = freeze(normalizeDiagnostics(input?.diagnostics));
  const evidenceHash = canonicalLafeaSha256({
    schema: 'lafea3-bm005-evidence-hash-input/v1',
    semanticHash,
    candidateHeadSha,
    qualificationEvidence,
    diagnostics,
  });
  return freeze({
    schema: BM005_REPORT_SCHEMA,
    benchmarkId: definition.benchmarkId,
    stageId: definition.stageId,
    route: definition.route,
    candidateHeadSha,
    cleanTree,
    hashProfile: BM005_REPORT_HASH_PROFILE,
    benchmarkDefinition: definition,
    benchmarkDefinitionHash,
    oracleSourceRegistry: sourceRegistry,
    oracleSourceRegistryHash,
    lineage,
    observations,
    convergence: semantic.convergence,
    oracleComparison,
    negativeControl,
    authority,
    qualificationEvidence,
    diagnostics,
    semanticHash,
    evidenceHash,
  });
}

function benchmarkDefinition(value) {
  if (!value || value.schema !== 'lafea3-bm005-benchmark-definition/v1'
    || value.benchmarkId !== 'BM-005-LAME-CONT-CYL-01'
    || value.stageId !== 'LAFEA.3'
    || value.route !== 'T3_T6_Q8_LINEAR_CONTINUUM'
    || value.freezePolicy?.definitionFrozenBeforeObservations !== true
    || value.freezePolicy?.productionOutputMayModifyOracle !== false
    || value.acceptance?.releaseQualified !== false) {
    fail('BM005_REPORT_BENCHMARK_DEFINITION_INVALID');
  }
  if (!Array.isArray(value.mesh?.levels)
    || value.mesh.levels.length < value.acceptance.minimumLevels
    || value.mesh.elementFamily !== 'Q8') {
    fail('BM005_REPORT_MESH_LADDER_INVALID');
  }
  return freeze(structuredClone(value));
}

function oracleRegistry(value, definition) {
  if (!value || value.schema !== 'lafea3-bm005-source-registry/v1'
    || value.benchmarkId !== definition.benchmarkId
    || value.oracleDerivation?.productionResultUsed !== false
    || value.custodyPolicy?.productionOutputMayModifyOracle !== false
    || !Array.isArray(value.sources)
    || !value.sources.some((row) => row.role === 'independentOracle'
      && row.publisher && row.author && row.edition && row.year
      && row.chapter && row.section && Array.isArray(row.pages)
      && Array.isArray(row.equationIdentifiers))) {
    fail('BM005_REPORT_ORACLE_SOURCE_INVALID');
  }
  return freeze(structuredClone(value));
}

function observationRows(value, definition) {
  if (!Array.isArray(value) || value.length !== definition.mesh.levels.length) {
    fail('BM005_REPORT_OBSERVATIONS_INVALID');
  }
  return freeze(value.map((row, index) => {
    const declared = definition.mesh.levels[index];
    if (!row || row.levelId !== declared.levelId || row.h !== declared.h) {
      fail('BM005_REPORT_OBSERVATION_ORDER_INVALID');
    }
    return freeze({
      levelId: row.levelId,
      h: finite(row.h, 'BM005_REPORT_H_INVALID'),
      meshProfileHash: hash(row.meshProfileHash, 'BM005_REPORT_PROFILE_HASH_INVALID'),
      meshHash: hash(row.meshHash, 'BM005_REPORT_MESH_HASH_INVALID'),
      solverModelHash: hash(row.solverModelHash, 'BM005_REPORT_SOLVER_HASH_INVALID'),
      executionHash: hash(row.executionHash, 'BM005_REPORT_EXECUTION_HASH_INVALID'),
      recoveryHash: hash(row.recoveryHash, 'BM005_REPORT_RECOVERY_HASH_INVALID'),
      probeEvidenceHash: hash(row.probeEvidenceHash, 'BM005_REPORT_PROBE_HASH_INVALID'),
      value: finite(row.value, 'BM005_REPORT_VALUE_INVALID'),
      units: text(row.units, 'BM005_REPORT_UNITS_INVALID'),
    });
  }));
}

function convergenceEvidence(value, definition, observations) {
  if (!value || !Array.isArray(value.levels)
    || value.levels.length !== observations.length
    || !Array.isArray(value.observedOrders)
    || value.definitionWasFrozenBeforeObservations !== true
    || value.releaseAuthorityGranted !== false) {
    fail('BM005_REPORT_CONVERGENCE_INVALID');
  }
  if (value.levels.some((row, index) => row.levelId !== observations[index].levelId
    || row.h !== observations[index].h
    || row.meshHash !== observations[index].meshHash
    || row.probeEvidenceHash !== observations[index].probeEvidenceHash)) {
    fail('BM005_REPORT_CONVERGENCE_OBSERVATION_BINDING_INVALID');
  }
  if (definition.acceptance.rawMeshMaximumStressMayQualifyConvergence !== false) {
    fail('BM005_REPORT_MOVING_MAXIMUM_POLICY_INVALID');
  }
  return value;
}

function negativeEvidence(value, definition) {
  if (!value || value.negativeCaseId !== definition.negativeControl.negativeCaseId
    || !definition.negativeControl.expectedErrorCodes.includes(value.actualErrorCode)
    || !['solver', 'preflight'].includes(value.actualBoundary)) {
    fail('BM005_REPORT_NEGATIVE_CONTROL_INVALID');
  }
  const earlier = value.actualBoundary === 'preflight';
  const pass = value.actualBoundary === definition.negativeControl.expectedFirstEngineeringBoundary
    || (earlier && definition.negativeControl.allowEarlierGovernedPreflightRejection === true);
  return freeze({
    negativeCaseId: value.negativeCaseId,
    expectedFirstEngineeringBoundary: definition.negativeControl.expectedFirstEngineeringBoundary,
    expectedErrorCodes: freeze([...definition.negativeControl.expectedErrorCodes]),
    actualBoundary: value.actualBoundary,
    actualErrorCode: value.actualErrorCode,
    status: pass ? 'PASS_EXPECTED_REJECTION' : 'FAIL_UNEXPECTED_REJECTION',
    releaseQualified: false,
  });
}

function lineageEvidence(value) {
  const fields = [
    'sourceHash', 'analysisDomainHash', 'analysisGeometryHash',
    'baseMeshProfileHash', 'convergenceDefinitionHash',
  ];
  if (!value || fields.some((key) => typeof value[key] !== 'string' || !value[key])) {
    fail('BM005_REPORT_LINEAGE_INVALID');
  }
  return freeze(Object.fromEntries(fields.map((key) => [key, value[key]])));
}

function qualificationReasons(options) {
  const reasons = [];
  if (!options.cleanTree) reasons.push('REPOSITORY_TREE_NOT_CLEAN');
  if (options.observations.length < options.definition.acceptance.minimumLevels) {
    reasons.push('INSUFFICIENT_MESH_LEVELS');
  }
  if (new Set(options.observations.map((row) => row.meshHash)).size !== options.observations.length) {
    reasons.push('MESH_LEVELS_NOT_DISTINCT');
  }
  if (!options.asymptoticRangeAccepted) reasons.push('ASYMPTOTIC_RANGE_NOT_DEMONSTRATED');
  if (!options.pointwiseAcceptanceEligible) reasons.push('POINTWISE_PROBE_NOT_ACCEPTANCE_ELIGIBLE');
  if (!options.oracleCoveredByGci) reasons.push('ANALYTICAL_ORACLE_OUTSIDE_FINE_GCI');
  if (options.negativeControl.status !== 'PASS_EXPECTED_REJECTION') {
    reasons.push('NEGATIVE_CONTROL_NOT_QUALIFIED');
  }
  return reasons.length ? reasons : ['BM005_BENCHMARK_QUALIFIED'];
}

function normalizeDiagnostics(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail('BM005_REPORT_DIAGNOSTICS_INVALID');
  return value.map((row) => String(row));
}
function gitSha(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) fail(code);
  return value;
}
function hash(value, code) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail(code);
  return value;
}
function text(value, code) {
  if (typeof value !== 'string' || !value.trim()) fail(code);
  return value.trim();
}
function finite(value, code) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(code);
  return Object.is(value, -0) ? 0 : value;
}
function nullableFinite(value, code) {
  if (value === null || value === undefined) return null;
  return finite(value, code);
}
function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
