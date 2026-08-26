#!/usr/bin/env node

const SCHEMA = 'lfea-s4-reducer-parity-evidence/v1';
const ORIENTATIONS = Object.freeze(['LARGE_TO_SMALL', 'SMALL_TO_LARGE']);
const STRUCTURAL = Object.freeze(['STRUCTURAL_AXIAL', 'STRUCTURAL_TORSION', 'STRUCTURAL_TRANSVERSE_FORCE', 'STRUCTURAL_END_MOMENT']);
const GRAVITY = Object.freeze(['GRAVITY_METAL', 'GRAVITY_FLUID', 'GRAVITY_INSULATION']);
const THERMAL = Object.freeze(['THERMAL_FREE', 'THERMAL_FIXED']);
const PAIRED = Object.freeze([...STRUCTURAL, ...GRAVITY, ...THERMAL]);
const CODE = Object.freeze(['CODE_SIF_BASELINE', 'CODE_SIF_VARIED']);
const CANDIDATES = Object.freeze([
  'MIDPOINT_LINEAR_INTERPOLATION', 'START_STATION_LINEAR_INTERPOLATION',
  'END_STATION_LINEAR_INTERPOLATION', 'NODE_AVERAGE_OR_TRAPEZOIDAL_EQUIVALENT',
  'FROM_SECTION_ALL_TEN', 'TO_SECTION_ALL_TEN',
]);
const GRAVITY_RULES = new Set(['FROM_END', 'TO_END', 'AVERAGE', 'PROGRESSIVE_SECTION', 'OTHER_SOURCE_QUALIFIED']);
const HASH = /^[0-9a-f]{64}$/u;
const GEOMETRY = Object.freeze({
  length: 0.500,
  largeOuterDiameter: 0.27305,
  largeWallThickness: 0.015062,
  smallOuterDiameter: 0.21905,
  smallWallThickness: 0.012700,
});
const LARGE = Object.freeze({ outerDiameter: GEOMETRY.largeOuterDiameter, wallThickness: GEOMETRY.largeWallThickness });
const SMALL = Object.freeze({ outerDiameter: GEOMETRY.smallOuterDiameter, wallThickness: GEOMETRY.smallWallThickness });

export function validateS4ReducerParityEvidence(value) {
  requireRecord(value, 'evidence');
  requireEqual(value.schema, SCHEMA, 'S4_REDUCER_EVIDENCE_SCHEMA_INVALID');
  requireEqual(value.protocolId, 'S4_Reducer_Parity_Protocol_20260824', 'S4_REDUCER_PROTOCOL_ID_INVALID');
  requireEqual(value.evidenceClass, 'CONTROLLED_CAESAR_OBSERVATION', 'S4_REDUCER_EVIDENCE_CLASS_INVALID');
  requireText(value.caesarVersion, 'caesarVersion');
  requireText(value.build, 'build');
  requireRecord(value.geometry, 'geometry');
  for (const [field, expected] of Object.entries(GEOMETRY)) requireClose(value.geometry[field], expected, field);
  requireRecord(value.tolerancePolicy, 'tolerancePolicy');
  const tolerance = value.tolerancePolicy.observationTolerance;
  requirePositive(tolerance, 'tolerancePolicy.observationTolerance');
  requireText(value.tolerancePolicy.source, 'tolerancePolicy.source');
  if (value.tolerancePolicy.fittedToCaesar !== false) fail('S4_REDUCER_TOLERANCE_FITTING_FORBIDDEN');
  if (value.productionAuthorizationRequested !== false || value.reducerExactMechanicsRequested !== false) {
    fail('S4_REDUCER_EVIDENCE_CANNOT_AUTHORIZE_PRODUCTION');
  }

  const runs = requireArray(value.runs, 'runs');
  requireUnique(runs.map((run) => requireRun(run, value.caesarVersion, value.build)));
  requirePairedCoverage(runs);
  requirePairedControlState(runs);
  requireCodeBoundaryCoverage(runs);
  const acceptedCandidate = requireCandidateComparisons(value.candidateComparisons, tolerance);

  requireRecord(value.decisions, 'decisions');
  requireDecision(value.decisions.sectionSamplingRule, CANDIDATES);
  if (value.decisions.sectionSamplingRule !== acceptedCandidate) {
    fail('S4_REDUCER_SECTION_DECISION_COMPARISON_MISMATCH', {
      decision: value.decisions.sectionSamplingRule,
      acceptedCandidate,
    });
  }
  for (const field of ['metalGravityRule', 'fluidGravityRule', 'insulationGravityRule']) {
    if (!GRAVITY_RULES.has(value.decisions[field])) fail('S4_REDUCER_GRAVITY_DECISION_INVALID', { field, value: value.decisions[field] });
  }

  requireAcceptance(value.acceptance, tolerance);
  requireIndependentReview(value.independentReview, runs);
  if (value.status !== 'QUALIFIED') fail('S4_REDUCER_EVIDENCE_STATUS_NOT_QUALIFIED', { status: value.status });

  return Object.freeze({
    schema: 'lfea-s4-reducer-parity-intake/v1',
    status: 'QUALIFIED_PARITY_EVIDENCE_ONLY',
    caesarVersion: value.caesarVersion,
    build: value.build,
    runCount: runs.length,
    sectionSamplingRule: value.decisions.sectionSamplingRule,
    productionUseAuthorized: false,
    reducerExactMechanicsAuthorized: false,
  });
}

export const S4_REDUCER_PARITY_EVIDENCE_SCHEMA = SCHEMA;
export const S4_REDUCER_REQUIRED_PAIRED_FAMILIES = PAIRED;
export const S4_REDUCER_SECTION_CANDIDATES = CANDIDATES;

function requireRun(run, version, build) {
  requireRecord(run, 'run');
  requireText(run.runId, 'run.runId');
  if (![...PAIRED, ...CODE].includes(run.family)) fail('S4_REDUCER_RUN_FAMILY_INVALID', { family: run.family });
  if (!ORIENTATIONS.includes(run.modelOrientation)) fail('S4_REDUCER_RUN_ORIENTATION_INVALID', { runId: run.runId });
  requireText(run.caesarVersion, 'run.caesarVersion');
  requireText(run.build, 'run.build');
  if (run.caesarVersion !== version || run.build !== build) {
    fail('S4_REDUCER_RUN_VERSION_BUILD_MISMATCH', {
      runId: run.runId,
      runVersion: run.caesarVersion,
      runBuild: run.build,
      packageVersion: version,
      packageBuild: build,
    });
  }
  requireClose(run.length, GEOMETRY.length, 'run.length');
  requireSectionCustody(run);
  requireNonEmptyRecord(run.materialState, 'run.materialState');
  for (const field of ['jobFileHash', 'inputSourceHash', 'outputFileHash']) requireHash(run[field], `run.${field}`);
  requireRawArtifacts(run.rawArtifacts);
  for (const field of ['units', 'loadCase', 'restraints', 'reportLocator', 'artifactLocator', 'observer', 'observationDate']) requireText(run[field], `run.${field}`);
  requireFamilySourceState(run);
  requireFamilyResults(run);
  return run.runId;
}

function requireRawArtifacts(value) {
  requireRecord(value, 'run.rawArtifacts');
  for (const field of ['jobFile', 'inputSource', 'outputFile']) {
    requireSafeRelativePath(value[field], `run.rawArtifacts.${field}`);
  }
}

function requireSafeRelativePath(value, field) {
  requireText(value, field);
  const normalized = value.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (normalized.startsWith('/')
    || /^[A-Za-z]:\//u.test(normalized)
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    fail('S4_REDUCER_RAW_ARTIFACT_PATH_INVALID', { field, value });
  }
}

function requireSectionCustody(run) {
  requireNonEmptyRecord(run.fromSection, 'run.fromSection');
  requireNonEmptyRecord(run.toSection, 'run.toSection');
  const expectedFrom = run.modelOrientation === 'LARGE_TO_SMALL' ? LARGE : SMALL;
  const expectedTo = run.modelOrientation === 'LARGE_TO_SMALL' ? SMALL : LARGE;
  requireSection(run.fromSection, expectedFrom, 'run.fromSection');
  requireSection(run.toSection, expectedTo, 'run.toSection');
}

function requireSection(actual, expected, field) {
  requireClose(actual.outerDiameter, expected.outerDiameter, `${field}.outerDiameter`);
  requireClose(actual.wallThickness, expected.wallThickness, `${field}.wallThickness`);
}

function requireFamilySourceState(run) {
  if (STRUCTURAL.includes(run.family) || CODE.includes(run.family)) requireNonEmptyRecord(run.appliedLoad, 'run.appliedLoad');
  if (GRAVITY.includes(run.family)) requireNonEmptyRecord(run.gravitySourceState, 'run.gravitySourceState');
  if (THERMAL.includes(run.family)) requireNonEmptyRecord(run.thermalState, 'run.thermalState');
}

function requireFamilyResults(run) {
  requireNonEmptyRecord(run.reportedResults, 'run.reportedResults');
  const result = run.reportedResults;
  if (run.family === 'STRUCTURAL_AXIAL') {
    requireNonEmptyRecord(result.displacements, 'run.reportedResults.displacements');
    requireNonEmptyRecord(result.reactions, 'run.reportedResults.reactions');
  } else if (run.family === 'STRUCTURAL_TORSION') {
    requireNonEmptyRecord(result.rotations, 'run.reportedResults.rotations');
    requireNonEmptyRecord(result.reactions, 'run.reportedResults.reactions');
  } else if (run.family === 'STRUCTURAL_TRANSVERSE_FORCE' || run.family === 'STRUCTURAL_END_MOMENT') {
    requireNonEmptyRecord(result.displacements, 'run.reportedResults.displacements');
    requireNonEmptyRecord(result.rotations, 'run.reportedResults.rotations');
    requireNonEmptyRecord(result.reactions, 'run.reportedResults.reactions');
  } else if (GRAVITY.includes(run.family)) {
    requireFinite(result.totalWeight, 'run.reportedResults.totalWeight');
    requireFinite(result.firstMomentOrEquivalent, 'run.reportedResults.firstMomentOrEquivalent');
    requireNonEmptyRecord(result.reactions, 'run.reportedResults.reactions');
  } else if (run.family === 'THERMAL_FREE') {
    requireNonEmptyRecord(result.displacements, 'run.reportedResults.displacements');
  } else if (run.family === 'THERMAL_FIXED') {
    requireNonEmptyRecord(result.reactions, 'run.reportedResults.reactions');
  } else if (CODE.includes(run.family)) {
    requireNonEmptyRecord(result.structuralResponse, 'run.reportedResults.structuralResponse');
    requireText(result.codeSifState, 'run.reportedResults.codeSifState');
  }
}

function requirePairedCoverage(runs) {
  for (const family of PAIRED) {
    for (const orientation of ORIENTATIONS) {
      const count = runs.filter((run) => run.family === family && run.modelOrientation === orientation).length;
      if (count !== 1) fail('S4_REDUCER_REQUIRED_CASE_MISSING_OR_DUPLICATED', { family, orientation, count });
    }
  }
}

function requirePairedControlState(runs) {
  for (const family of PAIRED) {
    const pair = ORIENTATIONS.map((orientation) => runs.find((run) => run.family === family && run.modelOrientation === orientation));
    const fields = ['materialState', 'units', 'restraints'];
    if (STRUCTURAL.includes(family)) fields.push('appliedLoad');
    if (GRAVITY.includes(family)) fields.push('gravitySourceState');
    if (THERMAL.includes(family)) fields.push('thermalState');
    for (const field of fields) {
      if (canonicalValue(pair[0][field]) !== canonicalValue(pair[1][field])) {
        fail('S4_REDUCER_ORIENTATION_PAIR_CONTROL_STATE_MISMATCH', { family, field });
      }
    }
  }
}

function requireCodeBoundaryCoverage(runs) {
  const baseline = runs.filter((run) => run.family === 'CODE_SIF_BASELINE');
  const varied = runs.filter((run) => run.family === 'CODE_SIF_VARIED');
  if (baseline.length !== 1 || varied.length !== 1 || baseline[0].modelOrientation !== varied[0].modelOrientation) {
    fail('S4_REDUCER_CODE_BOUNDARY_PAIR_INVALID');
  }
  for (const field of ['materialState', 'units', 'restraints', 'appliedLoad']) {
    if (canonicalValue(baseline[0][field]) !== canonicalValue(varied[0][field])) {
      fail('S4_REDUCER_CODE_BOUNDARY_CONTROL_STATE_MISMATCH', { field });
    }
  }
}

function requireCandidateComparisons(value, tolerance) {
  const rows = requireArray(value, 'candidateComparisons');
  if (rows.length !== CANDIDATES.length) fail('S4_REDUCER_CANDIDATE_COVERAGE_INVALID');
  const byId = new Map();
  for (const row of rows) {
    requireRecord(row, 'candidateComparison');
    if (!CANDIDATES.includes(row.candidateId) || byId.has(row.candidateId)) fail('S4_REDUCER_CANDIDATE_ID_INVALID', { candidateId: row.candidateId });
    requireNonNegative(row.maximumNormalizedError, 'candidateComparison.maximumNormalizedError');
    if (typeof row.accepted !== 'boolean') fail('S4_REDUCER_CANDIDATE_ACCEPTED_FLAG_INVALID');
    byId.set(row.candidateId, row);
  }
  const accepted = [...byId.values()].filter((row) => row.accepted);
  if (accepted.length !== 1) fail('S4_REDUCER_SECTION_RULE_NOT_UNIQUE', { accepted: accepted.map((row) => row.candidateId) });
  requireWithin(accepted[0].maximumNormalizedError, tolerance, 'S4_REDUCER_ACCEPTED_CANDIDATE_OUTSIDE_TOLERANCE');
  const competing = [...byId.values()].filter((row) => !row.accepted && row.maximumNormalizedError <= tolerance);
  if (competing.length > 0) fail('S4_REDUCER_SECTION_RULE_NOT_UNIQUE', { competingInsideTolerance: competing.map((row) => row.candidateId), observationTolerance: tolerance });
  return accepted[0].candidateId;
}

function requireAcceptance(value, tolerance) {
  requireRecord(value, 'acceptance');
  const trueFlags = [
    'sectionSamplingUnique', 'axialTorsionBendingParity', 'metalGravityQualified',
    'fluidGravityQualified', 'insulationGravityQualified', 'gravityFirstMomentQualified',
    'thermalParityQualified', 'codeBoundaryQualified',
  ];
  for (const field of trueFlags) {
    if (value[field] !== true) fail('S4_REDUCER_ACCEPTANCE_NOT_MET', { field });
  }
  const residuals = [
    'axialTorsionBendingMaximumNormalizedError',
    'metalGravityNormalizedError',
    'fluidGravityNormalizedError',
    'insulationGravityNormalizedError',
    'gravityFirstMomentMaximumNormalizedError',
    'thermalMaximumNormalizedError',
    'codeBoundaryNormalizedDelta',
  ];
  for (const field of residuals) requireWithin(value[field], tolerance, 'S4_REDUCER_ACCEPTANCE_RESIDUAL_OUTSIDE_TOLERANCE', field);
  if (value.expectedValuesRebaselined !== false || value.tolerancesWidenedToFitCaesar !== false) fail('S4_REDUCER_ACCEPTANCE_GAMING_FORBIDDEN');
}

function requireIndependentReview(value, runs) {
  requireRecord(value, 'independentReview');
  requireEqual(value.status, 'APPROVED', 'S4_REDUCER_INDEPENDENT_REVIEW_REQUIRED');
  requireText(value.reviewer, 'independentReview.reviewer');
  requireText(value.reviewDate, 'independentReview.reviewDate');
  requireText(value.reviewLocator, 'independentReview.reviewLocator');
  const observers = new Set(runs.map((run) => run.observer));
  if (observers.has(value.reviewer)) fail('S4_REDUCER_REVIEWER_NOT_INDEPENDENT', { reviewer: value.reviewer });
}

function canonicalValue(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function requireDecision(value, allowed) { if (!allowed.includes(value)) fail('S4_REDUCER_SECTION_DECISION_INVALID', { value }); }
function requireWithin(value, tolerance, code, field) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > tolerance) fail(code, { field: field ?? null, value, tolerance }); }
function requireHash(value, field) { if (!HASH.test(String(value ?? ''))) fail('S4_REDUCER_HASH_INVALID', { field }); }
function requireRecord(value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('S4_REDUCER_RECORD_REQUIRED', { field }); }
function requireNonEmptyRecord(value, field) { requireRecord(value, field); if (Object.keys(value).length === 0) fail('S4_REDUCER_RECORD_EMPTY', { field }); }
function requireArray(value, field) { if (!Array.isArray(value) || value.length === 0) fail('S4_REDUCER_ARRAY_REQUIRED', { field }); return value; }
function requireText(value, field) { if (typeof value !== 'string' || value.trim() === '') fail('S4_REDUCER_TEXT_REQUIRED', { field }); }
function requirePositive(value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) fail('S4_REDUCER_POSITIVE_NUMBER_REQUIRED', { field }); }
function requireNonNegative(value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail('S4_REDUCER_NONNEGATIVE_NUMBER_REQUIRED', { field }); }
function requireFinite(value, field) { if (typeof value !== 'number' || !Number.isFinite(value)) fail('S4_REDUCER_FINITE_NUMBER_REQUIRED', { field }); }
function requireClose(value, expected, field) { if (typeof value !== 'number' || Math.abs(value - expected) > 1e-12) fail('S4_REDUCER_PROTOCOL_GEOMETRY_MISMATCH', { field, value, expected }); }
function requireEqual(actual, expected, code) { if (actual !== expected) fail(code, { actual, expected }); }
function requireUnique(values) { if (new Set(values).size !== values.length) fail('S4_REDUCER_RUN_ID_DUPLICATED'); }
function fail(code, evidence) { const error = new Error(code); error.code = code; error.evidence = evidence ?? null; throw error; }
