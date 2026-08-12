import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { sealStressFactorSet } from '../core/linear-fea-b31-code-engine/index.js';
import { derivePressureStressContribution } from '../core/linear-piping-code-application/pressure-stress-derivation.js';

const SUSTAINED_PHYSICAL_CASE_ROLES = Object.freeze(['WEIGHT_BASE', 'WEIGHT_PRESSURE']);

/**
 * Real candidates only: the exact same eligibility rules
 * native-b31-code-stations.js/native-b31-authority-contract.js enforce at
 * stage() time, applied here so a person only ever sees selectable options
 * that will actually be accepted -- nothing is offered that stage() would
 * reject.
 */
export function listB31SustainedCandidates(preFlight) {
  const structural = preFlight?.preparation?.structuralPreparation;
  const physicalCases = preFlight?.preparation?.physicalPreparation?.physicalCases;
  if (!structural || !Array.isArray(physicalCases)) return [];
  const elements = structural.segmentBindings.filter((binding) => (
    binding.componentKind === 'STRAIGHT_PIPE'
    && binding.representabilityDisposition === 'IMPLEMENTED_EXACTLY'
    && binding.limitationCode === null
  ));
  const cases = physicalCases.filter((row) => SUSTAINED_PHYSICAL_CASE_ROLES.includes(row.caseRole));
  const rows = [];
  for (const binding of elements) {
    for (const end of ['I', 'J']) {
      for (const physicalCase of cases) {
        rows.push({
          elementId: binding.elementId, end, caseId: physicalCase.caseId, caseRole: physicalCase.caseRole,
          candidateId: `${binding.elementId}:${end}:${physicalCase.caseId}`,
        });
      }
    }
  }
  return rows;
}

/**
 * Build one real SUSTAINED check for a selected candidate. Every field is
 * either read directly from already-sealed preFlight authority (section
 * resolution) or derived through the existing, generic, production formula
 * (derivePressureStressContribution, S = P*Do/(4t)) -- nothing here
 * recomputes stiffness, flexibility, or a new engineering result.
 *
 * stressFactorSet is a disclosed unity default: the native B31 boundary's
 * only valid target is an exact straight pipe (never a bend/tee/olet), and
 * the production straight-pipe convention already established at
 * scripts/lfea-b3.18-bm1-bend-authorities.mjs's bm1CodeStressFactorSet
 * non-bend branch is SIF = 1. This mirrors that exact shape, generalized to
 * any candidate rather than one benchmark fixture.
 */
export function buildB31SustainedCheck({ preFlight, elementId, end, caseId, checkId }) {
  const structural = preFlight.preparation.structuralPreparation;
  const binding = structural.segmentBindings.find((row) => row.elementId === elementId);
  if (!binding) throw authoringError('LFEA_B31_AUTHORING_ELEMENT_MISSING', `Element ${elementId} is not a governed structural binding.`);
  const sectionResolution = structural.sectionResolutions
    .find((row) => row.semanticHash === binding.analysisSectionSemanticHash);
  if (!sectionResolution) throw authoringError('LFEA_B31_AUTHORING_SECTION_MISSING', `No retained section resolution for ${elementId}.`);
  const physicalCase = preFlight.preparation.physicalPreparation.physicalCases.find((row) => row.caseId === caseId);
  if (!physicalCase) throw authoringError('LFEA_B31_AUTHORING_CASE_MISSING', `Physical case ${caseId} is not retained.`);

  return Object.freeze({
    checkId, category: 'SUSTAINED', elementId, end, combinationId: caseId,
    actionSource: Object.freeze({ kind: 'SINGLE_CASE', caseId }),
    evaluationCaseId: caseId,
    stressFactorSet: unityStraightPipeStressFactorSet(elementId, binding.sourceSegmentId ?? binding.sourceFeatureId ?? elementId),
    sectionBasisReason: 'Reviewer explicitly selected this retained B-2.3 nominal section as the sustained code section; no corrosion allowance or alternate section is inferred.',
    sustainedSectionResolution: sectionResolution,
    pressureStressContribution: pressureStressContributionFor(physicalCase, elementId, sectionResolution),
    coldTemperature: null, sustainedStress: null, occasionalCategoryId: null,
  });
}

function pressureStressContributionFor(physicalCase, elementId, sectionResolution) {
  const primitive = physicalCase.loadCase.primitives
    .find((row) => row.kind === 'PRESSURE' && row.elementId === elementId);
  if (!primitive || primitive.authorizedEffects.codeStress !== true) {
    return Object.freeze({
      value: 0,
      source: `NO_CODE_STRESS_AUTHORIZED_PRESSURE_PRIMITIVE_ON_${elementId}_IN_${physicalCase.caseId}_V1`,
    });
  }
  return derivePressureStressContribution({ pressurePrimitive: primitive, sectionResolution });
}

function unityStraightPipeStressFactorSet(componentId, sourceRevision) {
  const source = 'LFEA native B31 authoring; disclosed unity stress factor for an exact straight-pipe target';
  const directional = Object.freeze({
    axial: Object.freeze({ value: 1, source }), torsional: Object.freeze({ value: 1, source }),
    inPlaneBending: Object.freeze({ value: 1, source }), outOfPlaneBending: Object.freeze({ value: 1, source }),
  });
  return sealStressFactorSet({
    schema: 'fea-b31-stress-factor-set/v1',
    factorSetId: `${componentId}.LFEA-NATIVE.UNITY`,
    componentId,
    sourceIdentity: Object.freeze({
      standard: 'LFEA_NATIVE_STRAIGHT_PIPE_UNITY', edition: '01', ruleId: 'NON-BEND-UNITY',
      sourceRevision: String(sourceRevision),
      sourceSemanticHash: semanticHash({ componentId, sourceRevision, source }),
    }),
    applicability: Object.freeze({ status: 'WITHIN_RANGE', ruleId: 'NON-BEND-UNITY', evaluatedBy: 'LFEA_NATIVE_B31_AUTHORING' }),
    momentDirectionMapping: Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' }),
    sustainedIndices: directional, occasionalIndices: directional, displacementSifs: directional,
    userOverride: null,
    semanticHash: '',
  });
}

function authoringError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NATIVE_B31_AUTHORING';
  return error;
}
