#!/usr/bin/env node

const SCHEMA = 'lfea-s4-reducer-parity-evidence/v1';
const ORIENTATIONS = Object.freeze(['LARGE_TO_SMALL', 'SMALL_TO_LARGE']);
const PAIRED_FAMILIES = Object.freeze([
  'STRUCTURAL_AXIAL',
  'STRUCTURAL_TORSION',
  'STRUCTURAL_TRANSVERSE_FORCE',
  'STRUCTURAL_END_MOMENT',
  'GRAVITY_METAL',
  'GRAVITY_FLUID',
  'GRAVITY_INSULATION',
  'THERMAL_FREE',
  'THERMAL_FIXED',
]);
const CODE_FAMILIES = Object.freeze(['CODE_SIF_BASELINE', 'CODE_SIF_VARIED']);
const SECTION_CANDIDATES = Object.freeze([
  'MIDPOINT_LINEAR_INTERPOLATION',
  'START_STATION_LINEAR_INTERPOLATION',
  'END_STATION_LINEAR_INTERPOLATION',
  'NODE_AVERAGE_OR_TRAPEZOIDAL_EQUIVALENT',
  'FROM_SECTION_ALL_TEN',
  'TO_SECTION_ALL_TEN',
]);
const GRAVITY_RULES = new Set([
  'FROM_END', 'TO_END', 'AVERAGE', 'PROGRESSIVE_SECTION', 'OTHER_SOURCE_QUALIFIED',
]);
const HASH = /^[0-9a-f]{64}$/u;
const PROTOCOL_GEOMETRY = Object.freeze({
  length: 0.500,
  largeOuterDiameter: 0.27305,
  largeWallThickness: 0.015062,
  smallOuterDiameter: 0.21905,
  smallWallThickness: 0.012700,
});

export function validateS4ReducerParityEvidence(value) {
  requireRecord(value, 'evidence');
  requireEqual(value.schema, SCHEMA, 'S4_REDUCER_EVIDENCE_SCHEMA_INVALID');
  requireEqual(value.protocolId, 'S4_Reducer_Parity_Protocol_20260824', 'S4_REDUCER_PROTOCOL_ID_INVALID');
  requireEqual(value.evidenceClass, 'CONTROLLED_CAESAR_OBSERVATION', 'S4_REDUCER_EVIDENCE_CLASS_INVALID');
  requireNonEmpty(value.caesarVersion, 'caesarVersion');
  requireNonEmpty(value.build, 'build');
  requireRecord(value.geometry, 'geometry');
  for (const [field, expected] of Object.entries(PROTOCOL_GEOMETRY)) {
    requireClose(value.geometry[field], expected, field);
  }
  requireRecord(value.tolerancePolicy, 'tolerancePolicy');
  requireFinitePositive(value.tolerancePolicy.observationTolerance, 'tolerancePolicy.observationTolerance');
  requireNonEmpty(value.tolerancePolicy.source, 'tolerancePolicy.source');
  if (value.tolerancePolicy.fittedToCaesar !== false) {
    fail('S4_REDUCER_TOLERANCE_FITTING_FORBIDDEN');
  }
  if (value.productionAuthorizationRequested !== false || value.reducerExactMechanicsRequested !== false) {
    fail('S4_REDUCER_EVIDENCE_CANNOT_AUTHORIZE_PRODUCTION');
  }

  const runs = requireArray(value.runs, 'runs');
  requireUnique(runs.map((run) => requireRun(run)));
  requirePairedCoverage(runs);
  requireCodeBoundaryCoverage(runs);
  const acceptedCandidate = requireCandidateComparisons(value.candidateComparisons);
  requireRecord(value.decisions, 'decisions');
  requireDecision(value.decisions.sectionSamplingRule, SECTION_CANDIDATES, 'sectionSamplingRule');
  if (value.decisions.sectionSamplingRule !== acceptedCandidate) {
    fail('S4_REDUCER_SECTION_DECISION_COMPARISON_MISMATCH', {
      decision: value.decisions.sectionSamplingRule,
      acceptedCandidate,
    });
  }
  for (const field of ['metalGravityRule', 'fluidGravityRule', 'insulationGravityRule']) {
    if (!GRAVITY_RULES.has(value.decisions[field])) fail('S4_REDUCER_GRAVITY_DECISION_INVALID', { field, value: value.decisions[field] });
  }
  requireAcceptance(value.acceptance);
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
export const S4_REDUCER_REQUIRED_PAIRED_FAMILIES = PAIRED_FAMILIES;
export const S4_REDUCER_SECTION_CANDIDATES = SECTION_CANDIDATES;

function requireRun(run) {
  requireRecord(run, 'run');
  requireNonEmpty(run.runId, 'run.runId');
  const allowedFamilies = new Set([...PAIRED_FAMILIES, ...CODE_FAMILIES]);
  if (!allowedFamilies.has(run.family)) fail('S4_REDUCER_RUN_FAMILY_INVALID', { family: run.family });
  if (!ORIENTATIONS.includes(run.modelOrientation)) fail('S4_REDUCER_RUN_ORIENTATION_INVALID', { runId: run.runId });
  for (const field of ['jobFileHash', 'inputSourceHash', 'outputFileHash']) requireHash(run[field], `run.${field}`);
  for (const field of ['units', 'loadCase', 'restraints', 'reportLocator', 'artifactLocator', 'observer', 'observationDate']) {
    requireNonEmpty(run[field], `run.${field}`);
  }
  requireRecord(run.reportedResults, 'run.reportedResults');
  if (Object.keys(run.reportedResults).length === 0) fail('S4_REDUCER_RUN_RESULTS_EMPTY', { runId: run.runId });
  return run.runId;
}

function requirePairedCoverage(runs) {
  for (const family of PAIRED_FAMILIES) {
    for (const orientation of ORIENTATIONS) {
      const count = runs.filter((run) => run.family === family && run.modelOrientation === orientation).length;
      if (count !== 1) fail('S4_REDUCER_REQUIRED_CASE_MISSING_OR_DUPLICATED', { family, orientation, count });
    }
  }
}

function requireCodeBoundaryCoverage(runs) {
  const baseline = runs.filter((run) => run.family === 'CODE_SIF_BASELINE');
  const varied = runs.filter((run) => run.family === 'CODE_SIF_VARIED');
  if (baseline.length !== 1 || varied.length !== 1 || baseline[0].modelOrientation !== varied[0].modelOrientation) {
    fail('S4_REDUCER_CODE_BOUNDARY_PAIR_INVALID');
  }
}

function requireCandidateComparisons(value) {
  const rows = requireArray(value, 'candidateComparisons');
  if (rows.length !== SECTION_CANDIDATES.length) fail('S4_REDUCER_CANDIDATE_COVERAGE_INVALID');
  const byId = new Map();
  for (const row of rows) {
    requireRecord(row, 'candidateComparison');
    if (!SECTION_CANDIDATES.includes(row.candidateId) || byId.has(row.candidateId)) fail('S4_REDUCER_CANDIDATE_ID_INVALID', { candidateId: row.candidateId });
    requireFiniteNonNegative(row.maximumNormalizedError, 'candidateComparison.maximumNormalizedError');
    if (typeof row.accepted !== 'boolean') fail('S4_REDUCER_CANDIDATE_ACCEPTED_FLAG_INVALID');
    byId.set(row.candidateId, row);
  }
  const accepted = [...byId.values()].filter((row) => row.accepted);
  if (accepted.length !== 1) fail('S4_REDUCER_SECTION_RULE_NOT_UNIQUE', { accepted: accepted.map((row) => row.candidateId) });
  return accepted[0].candidateId;
}

function requireAcceptance(value) {
  requireRecord(value, 'acceptance');
  const fields = [
    'sectionSamplingUnique', 'axialTorsionBendingParity', 'metalGravityQualified',
    'fluidGravityQualified', 'insulationGravityQualified', 'gravityFirstMomentQualified',
    'thermalParityQualified', 'codeBoundaryQualified', 'expectedValuesRebaselined',
    'tolerancesWidenedToFitCaesar',
  ];
  for (const field of fields) if (typeof value[field] !== 'boolean') fail('S4_REDUCER_ACCEPTANCE_FIELD_INVALID', { field });
  const requiredTrue = fields.slice(0, 8);
  for (const field of requiredTrue) if (value[field] !== true) fail('S4_REDUCER_ACCEPTANCE_NOT_MET', { field });
  if (value.expectedValuesRebaselined !== false || value.tolerancesWidenedToFitCaesar !== false) {
    fail('S4_REDUCER_ACCEPTANCE_GAMING_FORBIDDEN');
  }
}

function requireIndependentReview(value, runs) {
  requireRecord(value, 'independentReview');
  requireEqual(value.status, 'APPROVED', 'S4_REDUCER_INDEPENDENT_REVIEW_REQUIRED');
  requireNonEmpty(value.reviewer, 'independentReview.reviewer');
  requireNonEmpty(value.reviewDate, 'independentReview.reviewDate');
  requireNonEmpty(value.reviewLocator, 'independentReview.reviewLocator');
  const observers = new Set(runs.map((run) => run.observer));
  if (observers.has(value.reviewer)) fail('S4_REDUCER_REVIEWER_NOT_INDEPENDENT', { reviewer: value.reviewer });
}

function requireDecision(value, allowed, field) {
  if (!allowed.includes(value)) fail('S4_REDUCER_SECTION_DECISION_INVALID', { field, value });
}
function requireHash(value, field) { if (!HASH.test(String(value ?? ''))) fail('S4_REDUCER_HASH_INVALID', { field }); }
function requireRecord(value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('S4_REDUCER_RECORD_REQUIRED', { field }); }
function requireArray(value, field) { if (!Array.isArray(value) || value.length === 0) fail('S4_REDUCER_ARRAY_REQUIRED', { field }); return value; }
function requireNonEmpty(value, field) { if (typeof value !== 'string' || value.trim() === '') fail('S4_REDUCER_TEXT_REQUIRED', { field }); }
function requireFinitePositive(value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) fail('S4_REDUCER_POSITIVE_NUMBER_REQUIRED', { field }); }
function requireFiniteNonNegative(value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail('S4_REDUCER_NONNEGATIVE_NUMBER_REQUIRED', { field }); }
function requireClose(value, expected, field) { if (typeof value !== 'number' || Math.abs(value - expected) > 1e-12) fail('S4_REDUCER_PROTOCOL_GEOMETRY_MISMATCH', { field, value, expected }); }
function requireEqual(actual, expected, code) { if (actual !== expected) fail(code, { actual, expected }); }
function requireUnique(values) { if (new Set(values).size !== values.length) fail('S4_REDUCER_RUN_ID_DUPLICATED'); }
function fail(code, evidence) { const error = new Error(code); error.code = code; error.evidence = evidence ?? null; throw error; }
