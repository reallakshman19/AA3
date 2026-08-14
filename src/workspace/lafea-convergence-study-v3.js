/** Auditable convergence ancestry plus conservative standard-GCI admissibility. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { validateLafeaResponseFunctionalV3 } from './lafea-response-functional-v3.js';

export const LAFEA_CONVERGENCE_STUDY_V3_SCHEMA = 'lafea-convergence-study/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'commonAnalysisStateHash', 'meshProfileHash',
  'solverCapabilityHash', 'solverQualificationHash', 'loadBcHash',
  'materialSectionHash', 'responseFunctionalHash', 'refinementFamilyHash',
  'systematicRefinement', 'topologyChanged', 'minimumRefinementRatio',
  'asymptoticRangeEvidenceHash', 'levels',
]);
const LEVEL_KEYS = Object.freeze([
  'levelId', 'commonAnalysisStateHash', 'meshContentHash', 'executionHash',
  'responseHash', 'effectiveH', 'responseValue',
]);

export function createLafeaConvergenceStudyV3(value, responseFunctionalValue) {
  exact(value, KEYS, 'LAFEA_CONVERGENCE_V3_KEYS_INVALID');
  const functional = validateLafeaResponseFunctionalV3(responseFunctionalValue);
  if (value.responseFunctionalHash !== functional.functionalHash) {
    fail('LAFEA_CONVERGENCE_V3_FUNCTIONAL_HASH_MISMATCH');
  }
  if (value.stageId !== functional.stageId) fail('LAFEA_CONVERGENCE_V3_FUNCTIONAL_STAGE_MISMATCH');
  const commonAnalysisStateHash = sha(value.commonAnalysisStateHash, 'COMMON_ANALYSIS_STATE_HASH');
  const levels = canonicalLevels(value.levels, commonAnalysisStateHash);
  const minimumRefinementRatio = greaterThanOne(value.minimumRefinementRatio, 'MINIMUM_REFINEMENT_RATIO');
  const refinementRatios = freeze(levels.slice(0, -1).map((level, index) =>
    level.effectiveH / levels[index + 1].effectiveH));
  const differences = levels.slice(0, -1).map((level, index) =>
    levels[index + 1].responseValue - level.responseValue);
  const nonZeroSigns = differences.filter((difference) => difference !== 0).map(Math.sign);
  const monotoneResponse = nonZeroSigns.length === differences.length
    && new Set(nonZeroSigns).size <= 1;
  const reasons = [];
  if (!functional.convergenceEligible) reasons.push('FUNCTIONAL_NONCONVERGENT_BY_CONSTRUCTION');
  if (value.systematicRefinement !== true) reasons.push('REFINEMENT_NOT_SYSTEMATIC');
  if (value.topologyChanged === true) reasons.push('TOPOLOGY_CHANGED');
  if (refinementRatios.some((ratio) => ratio < minimumRefinementRatio)) {
    reasons.push('REFINEMENT_RATIO_BELOW_GOVERNED_MINIMUM');
  }
  if (!monotoneResponse) reasons.push('STANDARD_GCI_RESPONSE_NOT_MONOTONE');
  const asymptoticRangeEvidenceHash = optionalSha(
    value.asymptoticRangeEvidenceHash,
    'ASYMPTOTIC_RANGE_EVIDENCE_HASH',
  );
  if (asymptoticRangeEvidenceHash === null) reasons.push('ASYMPTOTIC_RANGE_UNPROVEN');
  const record = freeze({
    schema: exactText(value.schema, LAFEA_CONVERGENCE_STUDY_V3_SCHEMA, 'SCHEMA'),
    stageId: value.stageId,
    commonAnalysisStateHash,
    meshProfileHash: text(value.meshProfileHash, 'MESH_PROFILE_HASH'),
    solverCapabilityHash: sha(value.solverCapabilityHash, 'SOLVER_CAPABILITY_HASH'),
    solverQualificationHash: sha(value.solverQualificationHash, 'SOLVER_QUALIFICATION_HASH'),
    loadBcHash: sha(value.loadBcHash, 'LOAD_BC_HASH'),
    materialSectionHash: sha(value.materialSectionHash, 'MATERIAL_SECTION_HASH'),
    responseFunctionalHash: functional.functionalHash,
    refinementFamilyHash: sha(value.refinementFamilyHash, 'REFINEMENT_FAMILY_HASH'),
    systematicRefinement: boolean(value.systematicRefinement, 'SYSTEMATIC_REFINEMENT'),
    topologyChanged: boolean(value.topologyChanged, 'TOPOLOGY_CHANGED'),
    minimumRefinementRatio,
    asymptoticRangeEvidenceHash,
    levels,
    refinementRatios,
    monotoneResponse,
    standardGciAdmissible: reasons.length === 0,
    inadmissibilityReasons: freeze(reasons),
    alternativeEvidencePolicy: reasons.length
      ? 'DIRECT_FUNCTIONAL_STABILITY_WITH_AUDITABLE_LEVEL_ANCESTRY'
      : null,
  });
  return freeze({
    ...record,
    studyHash: canonicalLafeaSha256({
      schema: 'lafea-convergence-study-hash-input/v3', study: record,
    }),
    engineeringAuthority: false,
  });
}

function canonicalLevels(value, commonAnalysisStateHash) {
  if (!Array.isArray(value) || value.length < 3) fail('LAFEA_CONVERGENCE_V3_LEVEL_COUNT_INVALID');
  const levels = value.map((row, index) => {
    exact(row, LEVEL_KEYS, 'LAFEA_CONVERGENCE_V3_LEVEL_KEYS_INVALID');
    if (row.commonAnalysisStateHash !== commonAnalysisStateHash) {
      fail('LAFEA_CONVERGENCE_V3_LEVEL_ANALYSIS_STATE_MISMATCH');
    }
    return freeze({
      levelId: text(row.levelId, `LEVEL_${index}_ID`),
      commonAnalysisStateHash,
      meshContentHash: sha(row.meshContentHash, `LEVEL_${index}_MESH_CONTENT_HASH`),
      executionHash: sha(row.executionHash, `LEVEL_${index}_EXECUTION_HASH`),
      responseHash: sha(row.responseHash, `LEVEL_${index}_RESPONSE_HASH`),
      effectiveH: positive(row.effectiveH, `LEVEL_${index}_EFFECTIVE_H`),
      responseValue: finite(row.responseValue, `LEVEL_${index}_RESPONSE_VALUE`),
    });
  });
  for (let index = 1; index < levels.length; index += 1) {
    if (!(levels[index].effectiveH < levels[index - 1].effectiveH)) {
      fail('LAFEA_CONVERGENCE_V3_EFFECTIVE_H_NOT_STRICTLY_DECREASING');
    }
  }
  unique(levels.map((row) => row.levelId), 'LEVEL_ID');
  unique(levels.map((row) => row.meshContentHash), 'MESH_CONTENT_HASH');
  unique(levels.map((row) => row.executionHash), 'EXECUTION_HASH');
  return freeze(levels);
}
function unique(values, field) {
  if (new Set(values).size !== values.length) fail(`LAFEA_CONVERGENCE_V3_${field}_DUPLICATE`);
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return out;
}
function optionalSha(value, field) { return value === null ? null : sha(value, field); }
function positive(value, field) {
  if (!Number.isFinite(value) || value <= 0) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return value;
}
function greaterThanOne(value, field) {
  if (!Number.isFinite(value) || value <= 1) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return value;
}
function finite(value, field) {
  if (!Number.isFinite(value)) fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return Object.is(value, -0) ? 0 : value;
}
function boolean(value, field) {
  if (typeof value !== 'boolean') fail(`LAFEA_CONVERGENCE_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
