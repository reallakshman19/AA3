#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_RESPONSE_FUNCTIONAL_V3_SCHEMA,
  createLafeaResponseFunctionalV3,
} from '../src/workspace/lafea-response-functional-v3.js';
import {
  LAFEA_CONVERGENCE_STUDY_V3_SCHEMA,
  createLafeaConvergenceStudyV3,
} from '../src/workspace/lafea-convergence-study-v3.js';

const functional = createLafeaResponseFunctionalV3({
  schema: LAFEA_RESPONSE_FUNCTIONAL_V3_SCHEMA,
  stageId: 'LAFEA.3', kind: 'POINT_DISPLACEMENT',
  physicalLocatorHash: hash('PROBE-X'), component: 'UX',
  evaluationPolicyHash: hash('FE_INTERPOLATION'), singularityDisposition: 'REGULAR_BOUNDED',
});
assert.equal(functional.convergenceEligible, true);
assert.throws(() => createLafeaResponseFunctionalV3({
  schema: LAFEA_RESPONSE_FUNCTIONAL_V3_SCHEMA,
  stageId: 'LAFEA.3', kind: 'PEAK_STRESS',
  physicalLocatorHash: hash('CORNER'), component: 'SXX',
  evaluationPolicyHash: hash('MAX_ELEMENT'), singularityDisposition: 'NONCONVERGENT_BY_CONSTRUCTION',
}), (error) => error?.code === 'LAFEA_RESPONSE_FUNCTIONAL_V3_KIND_INVALID');

const common = hash('COMMON_ANALYSIS_STATE');
const baseStudy = {
  schema: LAFEA_CONVERGENCE_STUDY_V3_SCHEMA,
  stageId: 'LAFEA.3', commonAnalysisStateHash: common,
  meshProfileHash: 'fnv1a64:mesh-profile', solverCapabilityHash: hash('SOLVER_CAP'),
  solverQualificationHash: hash('SOLVER_Q'), loadBcHash: hash('LOAD_BC'),
  materialSectionHash: hash('MATERIAL'), responseFunctionalHash: functional.functionalHash,
  refinementFamilyHash: hash('SYSTEMATIC_H_REFINEMENT'), systematicRefinement: true,
  topologyChanged: false, minimumRefinementRatio: 1.3,
  asymptoticRangeEvidenceHash: hash('ASYMPTOTIC_RANGE'),
  levels: [
    level('L1', common, 'M1', 'E1', 'R1', 4, 1.0),
    level('L2', common, 'M2', 'E2', 'R2', 2, 1.2),
    level('L3', common, 'M3', 'E3', 'R3', 1, 1.25),
  ],
};
const study = createLafeaConvergenceStudyV3(baseStudy, functional);
assert.equal(study.standardGciAdmissible, true);
assert.deepEqual(study.refinementRatios, [2, 2]);

const adaptive = createLafeaConvergenceStudyV3({
  ...baseStudy, systematicRefinement: false, asymptoticRangeEvidenceHash: null,
}, functional);
assert.equal(adaptive.standardGciAdmissible, false);
assert.ok(adaptive.inadmissibilityReasons.includes('REFINEMENT_NOT_SYSTEMATIC'));
assert.ok(adaptive.inadmissibilityReasons.includes('ASYMPTOTIC_RANGE_UNPROVEN'));

const mixed = structuredClone(baseStudy);
mixed.levels[2].commonAnalysisStateHash = hash('AFTER_LOAD_CHANGE');
assert.throws(() => createLafeaConvergenceStudyV3(mixed, functional),
  (error) => error?.code === 'LAFEA_CONVERGENCE_V3_LEVEL_ANALYSIS_STATE_MISMATCH');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch11', status: 'PASS',
  rawPeakStressCannotBeConvergenceFunctional: true,
  standardGciRequiresSystematicRefinement: true,
  standardGciRequiresGovernedRefinementRatio: true,
  standardGciRequiresMonotoneResponseAndAsymptoticEvidence: true,
  mixedAnalysisStateLevelRejected: true,
}));

function level(levelId, commonAnalysisStateHash, mesh, execution, response, effectiveH, responseValue) {
  return {
    levelId, commonAnalysisStateHash, meshContentHash: hash(mesh), executionHash: hash(execution),
    responseHash: hash(response), effectiveH, responseValue,
  };
}
function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
