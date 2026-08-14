/** Solver diagnostic evidence that records observations without laundering them into causality. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA = 'lafea-solver-diagnostic-evidence/v3';
const TOP_KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'executionHash', 'preFactorization',
  'factorization', 'postSolve', 'thresholds',
]);
const PRE_KEYS = Object.freeze([
  'topologyQualification', 'meshQualityQualification', 'constraintNullspaceDimension',
  'constraintProofHash', 'mechanismProofHash', 'stiffnessScaleRatio',
]);
const FACTOR_KEYS = Object.freeze(['status', 'estimatedRankDeficiency', 'conditionEstimate']);
const POST_KEYS = Object.freeze(['normalizedResidual', 'reactionImbalance', 'energyImbalance']);
const THRESHOLD_KEYS = Object.freeze([
  'stiffnessScaleRatioWarning', 'conditionEstimateWarning', 'normalizedResidualMaximum',
  'reactionImbalanceMaximum', 'energyImbalanceMaximum',
]);

export function diagnoseLafeaSolverExecutionV3(value) {
  exact(value, TOP_KEYS, 'LAFEA_SOLVER_DIAGNOSTIC_V3_KEYS_INVALID');
  const stageId = enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID');
  const pre = canonicalPre(value.preFactorization);
  const factor = canonicalFactor(value.factorization);
  const post = canonicalPost(value.postSolve, factor.status);
  const thresholds = canonicalThresholds(value.thresholds);
  const observations = [];
  const contributors = [];

  if (pre.topologyQualification === 'BLOCK') observations.push(asserted('MESH_TOPOLOGY_INVALID'));
  if (pre.meshQualityQualification === 'BLOCK') observations.push(asserted('MESH_QUALITY_INVALID'));
  if (pre.constraintNullspaceDimension > 0) observations.push(asserted('CONSTRAINT_NULLSPACE_DETECTED'));
  if (pre.mechanismProofHash !== null) observations.push(asserted('KINEMATIC_MECHANISM_PROVEN'));
  if (pre.stiffnessScaleRatio > thresholds.stiffnessScaleRatioWarning) {
    observations.push(asserted('STIFFNESS_SCALE_DISPARITY_DETECTED'));
  }
  if (factor.status === 'SINGULAR') observations.push(asserted('FACTORIZATION_SINGULAR'));
  if (factor.status === 'INDEFINITE') observations.push(asserted('FACTORIZATION_INDEFINITE'));
  if (factor.conditionEstimate !== null
    && factor.conditionEstimate > thresholds.conditionEstimateWarning) {
    observations.push(asserted('ILL_CONDITIONING_DETECTED'));
  }
  if (post.normalizedResidual !== null
    && post.normalizedResidual > thresholds.normalizedResidualMaximum) {
    observations.push(asserted('RESIDUAL_EXCEEDS_TOLERANCE'));
  }
  if (post.reactionImbalance !== null
    && post.reactionImbalance > thresholds.reactionImbalanceMaximum) {
    observations.push(asserted('REACTION_IMBALANCE_EXCEEDS_TOLERANCE'));
  }
  if (post.energyImbalance !== null
    && post.energyImbalance > thresholds.energyImbalanceMaximum) {
    observations.push(asserted('ENERGY_IMBALANCE_EXCEEDS_TOLERANCE'));
  }

  const failedFactorization = factor.status === 'SINGULAR' || factor.status === 'INDEFINITE';
  if (failedFactorization && pre.constraintNullspaceDimension > 0 && pre.mechanismProofHash === null) {
    contributors.push(suggested('INSUFFICIENT_RESTRAINT_OR_PHYSICAL_MECHANISM'));
  }
  if ((failedFactorization || has(observations, 'ILL_CONDITIONING_DETECTED'))
    && pre.meshQualityQualification === 'BLOCK') {
    contributors.push(suggested('MESH_DISTORTION_MAY_CONTRIBUTE'));
  }
  if ((failedFactorization || has(observations, 'ILL_CONDITIONING_DETECTED'))
    && pre.stiffnessScaleRatio > thresholds.stiffnessScaleRatioWarning) {
    contributors.push(suggested('SCALE_DISPARITY_MAY_CONTRIBUTE'));
  }

  const core = freeze({
    schema: exactText(value.schema, LAFEA_SOLVER_DIAGNOSTIC_EVIDENCE_V3_SCHEMA, 'SCHEMA'),
    stageId,
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    executionHash: sha(value.executionHash, 'EXECUTION_HASH'),
    preFactorization: pre,
    factorization: factor,
    postSolve: post,
    thresholds,
    observations: freeze(observations),
    suggestedContributors: freeze(contributors),
    causalConclusion: pre.mechanismProofHash !== null
      ? 'KINEMATIC_MECHANISM_PROVEN_BY_SEPARATE_EVIDENCE'
      : 'NO_UNIQUE_CAUSE_ASSERTED',
  });
  return freeze({
    ...core,
    diagnosticHash: canonicalLafeaSha256({
      schema: 'lafea-solver-diagnostic-evidence-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}

function canonicalPre(value) {
  exact(value, PRE_KEYS, 'LAFEA_SOLVER_DIAGNOSTIC_V3_PRE_KEYS_INVALID');
  const constraintNullspaceDimension = nonNegativeInteger(
    value.constraintNullspaceDimension,
    'CONSTRAINT_NULLSPACE_DIMENSION',
  );
  const constraintProofHash = optionalSha(value.constraintProofHash, 'CONSTRAINT_PROOF_HASH');
  const mechanismProofHash = optionalSha(value.mechanismProofHash, 'MECHANISM_PROOF_HASH');
  if (constraintNullspaceDimension > 0 && constraintProofHash === null) {
    fail('LAFEA_SOLVER_DIAGNOSTIC_V3_CONSTRAINT_PROOF_REQUIRED');
  }
  if (constraintNullspaceDimension === 0 && mechanismProofHash !== null) {
    fail('LAFEA_SOLVER_DIAGNOSTIC_V3_MECHANISM_PROOF_WITHOUT_NULLSPACE_INVALID');
  }
  return freeze({
    topologyQualification: enumValue(value.topologyQualification, ['PASS', 'BLOCK'], 'TOPOLOGY_QUALIFICATION'),
    meshQualityQualification: enumValue(value.meshQualityQualification, ['PASS', 'BLOCK'], 'MESH_QUALITY_QUALIFICATION'),
    constraintNullspaceDimension,
    constraintProofHash,
    mechanismProofHash,
    stiffnessScaleRatio: positive(value.stiffnessScaleRatio, 'STIFFNESS_SCALE_RATIO'),
  });
}
function canonicalFactor(value) {
  exact(value, FACTOR_KEYS, 'LAFEA_SOLVER_DIAGNOSTIC_V3_FACTOR_KEYS_INVALID');
  const status = enumValue(value.status, ['SUCCESS', 'SINGULAR', 'INDEFINITE'], 'FACTORIZATION_STATUS');
  return freeze({
    status,
    estimatedRankDeficiency: nonNegativeInteger(value.estimatedRankDeficiency, 'ESTIMATED_RANK_DEFICIENCY'),
    conditionEstimate: optionalPositive(value.conditionEstimate, 'CONDITION_ESTIMATE'),
  });
}
function canonicalPost(value, factorStatus) {
  exact(value, POST_KEYS, 'LAFEA_SOLVER_DIAGNOSTIC_V3_POST_KEYS_INVALID');
  const record = freeze({
    normalizedResidual: optionalNonNegative(value.normalizedResidual, 'NORMALIZED_RESIDUAL'),
    reactionImbalance: optionalNonNegative(value.reactionImbalance, 'REACTION_IMBALANCE'),
    energyImbalance: optionalNonNegative(value.energyImbalance, 'ENERGY_IMBALANCE'),
  });
  const present = Object.values(record).filter((row) => row !== null).length;
  if (factorStatus === 'SUCCESS' && present !== 3) fail('LAFEA_SOLVER_DIAGNOSTIC_V3_SUCCESS_POST_METRICS_REQUIRED');
  if (factorStatus !== 'SUCCESS' && present !== 0) fail('LAFEA_SOLVER_DIAGNOSTIC_V3_FAILED_FACTOR_POST_METRICS_INVALID');
  return record;
}
function canonicalThresholds(value) {
  exact(value, THRESHOLD_KEYS, 'LAFEA_SOLVER_DIAGNOSTIC_V3_THRESHOLD_KEYS_INVALID');
  return freeze({
    stiffnessScaleRatioWarning: positive(value.stiffnessScaleRatioWarning, 'STIFFNESS_SCALE_RATIO_WARNING'),
    conditionEstimateWarning: positive(value.conditionEstimateWarning, 'CONDITION_ESTIMATE_WARNING'),
    normalizedResidualMaximum: nonNegative(value.normalizedResidualMaximum, 'NORMALIZED_RESIDUAL_MAXIMUM'),
    reactionImbalanceMaximum: nonNegative(value.reactionImbalanceMaximum, 'REACTION_IMBALANCE_MAXIMUM'),
    energyImbalanceMaximum: nonNegative(value.energyImbalanceMaximum, 'ENERGY_IMBALANCE_MAXIMUM'),
  });
}
function asserted(code) { return freeze({ code, certainty: 'ASSERTED_OBSERVATION' }); }
function suggested(code) { return freeze({ code, certainty: 'SUGGESTED_CONTRIBUTOR' }); }
function has(rows, code) { return rows.some((row) => row.code === code); }
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return out;
}
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value;
}
function optionalPositive(value, field) { return value === null ? null : positive(value, field); }
function nonNegative(value, field) {
  if (!Number.isFinite(value) || value < 0) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value;
}
function optionalNonNegative(value, field) { return value === null ? null : nonNegative(value, field); }
function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_SOLVER_DIAGNOSTIC_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
