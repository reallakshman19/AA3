import { requireLinearStiffnessPreflight } from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze, isPlainRecord } from '../shared-piping-model/immutable.js';
import { requireInputXmlLinearPhysicalCasePreparation } from './inputxml-linear-physical-cases-contract.js';
import {
  requireInputXmlProductionBendFactorAuthority,
} from './inputxml-production-bend-factor-authority.js';

export const INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_SCHEMA =
  'fea-inputxml-linear-stiffness-preflight/v1';
export const INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_STATUSES = Object.freeze([
  'PASS',
  'WARN',
  'BLOCK',
]);

const HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/u;

export function sealInputXmlLinearStiffnessPreflight(value) {
  requireDraft(value);
  const draft = structuredClone(value);
  draft.stiffnessAssessmentHash = semanticHash(stiffnessAssessmentProjection(draft));
  const semantic = semanticHash(semanticProjection(draft));
  const evidence = semanticHash(evidenceProjection(draft, semantic));
  return deepFreeze({ ...draft, semanticHash: semantic, evidenceHash: evidence });
}

export function requireInputXmlLinearStiffnessPreflight(value, expectedPhysicalPreparation) {
  if (expectedPhysicalPreparation === undefined) expectedPhysicalPreparation = null;
  if (!isPlainRecord(value) || value.schema !== INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_SCHEMA) {
    throw new TypeError('InputXML linear stiffness preflight schema is invalid.');
  }
  requireDraft(value);
  const assessment = semanticHash(stiffnessAssessmentProjection(value));
  if (value.stiffnessAssessmentHash !== assessment) {
    throw new TypeError('InputXML stiffness assessment hash mismatch.');
  }
  const semantic = semanticHash(semanticProjection(value));
  if (value.semanticHash !== semantic) {
    throw new TypeError('InputXML stiffness preflight semantic hash mismatch.');
  }
  if (value.evidenceHash !== semanticHash(evidenceProjection(value, semantic))) {
    throw new TypeError('InputXML stiffness preflight evidence hash mismatch.');
  }
  if (expectedPhysicalPreparation !== null) {
    const physical = requireInputXmlLinearPhysicalCasePreparation(expectedPhysicalPreparation);
    if (value.physicalPreparationSemanticHash !== physical.semanticHash
      || value.physicalPreparationEvidenceHash !== physical.evidenceHash
      || value.structuralPreparationSemanticHash !== physical.structuralPreparationSemanticHash
      || value.structuralPreparationEvidenceHash !== physical.structuralPreparationEvidenceHash) {
      throw new TypeError('InputXML stiffness preflight is stale for the supplied physical-case preparation.');
    }
  }
  return value;
}

export function stiffnessAssessmentProjection(value) {
  return {
    schema: value.schema,
    analysisProfileId: value.analysisProfileId,
    stiffnessStateHash: value.stiffnessStateHash,
    effectiveStiffnessStateHash: value.effectiveStiffnessStateHash,
    productionCapabilityProfileHash: value.productionCapabilityProfileHash,
    bendFactorAuthority: value.bendFactorAuthority,
    bendExactMechanicsApplied: value.bendExactMechanicsApplied,
    eligibleBendCount: value.eligibleBendCount,
    frameElementProfileSemanticHash: value.frameElementProfileSemanticHash,
    solverProfileSemanticHash: value.solverProfileSemanticHash,
    genericAssessment: {
      stiffnessStateHash: value.genericPreflight?.stiffnessStateHash,
      dofMap: value.genericPreflight?.dofMap,
      components: value.genericPreflight?.components,
      assembly: value.genericPreflight?.assembly,
      factorization: value.genericPreflight?.factorization,
      findings: value.genericPreflight?.findings,
      status: value.genericPreflight?.status,
    },
    elementLedger: value.elementLedger,
    status: value.status,
    summary: value.summary,
  };
}

function requireDraft(value) {
  if (!isPlainRecord(value) || value.schema !== INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_SCHEMA) {
    throw new TypeError('InputXML stiffness preflight draft is invalid.');
  }
  for (const key of [
    'preflightId',
    'analysisProfileId',
    'physicalPreparationSemanticHash',
    'physicalPreparationEvidenceHash',
    'structuralPreparationSemanticHash',
    'structuralPreparationEvidenceHash',
    'mechanicalModelSemanticHash',
    'stiffnessStateHash',
    'effectiveStiffnessStateHash',
    'productionCapabilityProfileHash',
    'frameElementProfileSemanticHash',
    'solverProfileSemanticHash',
    'genericPreflightSemanticHash',
    'genericPreflightEvidenceHash',
  ]) {
    if (typeof value[key] !== 'string' || value[key].length === 0) {
      throw new TypeError(`InputXML stiffness preflight ${key} is invalid.`);
    }
  }
  for (const key of [
    'stiffnessStateHash',
    'effectiveStiffnessStateHash',
    'productionCapabilityProfileHash',
  ]) {
    if (!HASH_PATTERN.test(value[key])) {
      throw new TypeError(`InputXML stiffness preflight ${key} is not a semantic hash.`);
    }
  }
  if (typeof value.bendExactMechanicsApplied !== 'boolean'
    || !Number.isInteger(value.eligibleBendCount) || value.eligibleBendCount < 0) {
    throw new TypeError('InputXML stiffness preflight bend authority summary is invalid.');
  }
  if (value.bendFactorAuthority !== null) {
    requireInputXmlProductionBendFactorAuthority(value.bendFactorAuthority);
  }
  if (value.bendExactMechanicsApplied && value.bendFactorAuthority === null) {
    throw new TypeError('Exact bend mechanics cannot be retained without bend factor authority.');
  }
  if (value.bendExactMechanicsApplied && value.eligibleBendCount < 1) {
    throw new TypeError('Exact bend mechanics claims no eligible bend source.');
  }

  const generic = requireLinearStiffnessPreflight(value.genericPreflight);
  if (generic.semanticHash !== value.genericPreflightSemanticHash
    || generic.evidenceHash !== value.genericPreflightEvidenceHash
    || generic.mechanicalModelSemanticHash !== value.mechanicalModelSemanticHash
    || generic.stiffnessStateHash !== value.stiffnessStateHash
    || generic.solverProfileSemanticHash !== value.solverProfileSemanticHash) {
    throw new TypeError('InputXML stiffness preflight generic authority identity is stale.');
  }
  if (!Array.isArray(value.elementLedger) || value.elementLedger.length !== generic.assembly.elementCount
    || !INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_STATUSES.includes(value.status)
    || value.status !== inputXmlStatus(generic.status)
    || !isPlainRecord(value.summary)
    || !isPlainRecord(value.executionBoundary)) {
    throw new TypeError('InputXML stiffness preflight retained evidence is invalid.');
  }
  const ids = new Set();
  for (const row of value.elementLedger) {
    if (!isPlainRecord(row) || typeof row.elementId !== 'string' || ids.has(row.elementId)
      || typeof row.frameElementSemanticHash !== 'string'
      || typeof row.globalStiffnessHash !== 'string'
      || !Array.isArray(row.stiffnessRelevantLimitationCodes)
      || !['FRAME_ELEMENT', 'PIPING_COMPONENT'].includes(row.authorityKind)) {
      throw new TypeError('InputXML stiffness preflight element ledger is malformed or duplicated.');
    }
    if (row.authorityKind === 'PIPING_COMPONENT'
      && (typeof row.pipingComponentSemanticHash !== 'string'
        || row.flexibilityDoubleCountGuardAccepted !== true)) {
      throw new TypeError('InputXML stiffness preflight component ledger lacks qualified flexibility evidence.');
    }
    ids.add(row.elementId);
  }
  if (value.executionBoundary.stiffnessPreflight !== statusAvailability(value.status)
    || value.executionBoundary.factorizationHandle !== 'NOT_RETAINED'
    || value.executionBoundary.solveExecution !== 'NOT_AUTHORIZED') {
    throw new TypeError('InputXML stiffness preflight execution boundary is invalid.');
  }
}

function semanticProjection(value) {
  return {
    schema: value.schema,
    preflightId: value.preflightId,
    analysisProfileId: value.analysisProfileId,
    physicalPreparationSemanticHash: value.physicalPreparationSemanticHash,
    structuralPreparationSemanticHash: value.structuralPreparationSemanticHash,
    mechanicalModelSemanticHash: value.mechanicalModelSemanticHash,
    stiffnessStateHash: value.stiffnessStateHash,
    effectiveStiffnessStateHash: value.effectiveStiffnessStateHash,
    productionCapabilityProfileHash: value.productionCapabilityProfileHash,
    bendFactorAuthority: value.bendFactorAuthority,
    bendExactMechanicsApplied: value.bendExactMechanicsApplied,
    eligibleBendCount: value.eligibleBendCount,
    frameElementProfileSemanticHash: value.frameElementProfileSemanticHash,
    solverProfileSemanticHash: value.solverProfileSemanticHash,
    genericPreflightSemanticHash: value.genericPreflightSemanticHash,
    stiffnessAssessmentHash: value.stiffnessAssessmentHash,
    genericPreflight: value.genericPreflight,
    elementLedger: value.elementLedger,
    status: value.status,
    summary: value.summary,
    executionBoundary: value.executionBoundary,
  };
}

function evidenceProjection(value, semantic) {
  return {
    ...semanticProjection(value),
    semanticHash: semantic,
    physicalPreparationEvidenceHash: value.physicalPreparationEvidenceHash,
    structuralPreparationEvidenceHash: value.structuralPreparationEvidenceHash,
    genericPreflightEvidenceHash: value.genericPreflightEvidenceHash,
  };
}

function inputXmlStatus(status) {
  if (status === 'QUALIFIED') return 'PASS';
  if (status === 'CONDITIONAL') return 'WARN';
  return 'BLOCK';
}

function statusAvailability(status) {
  if (status === 'PASS') return 'QUALIFIED';
  if (status === 'WARN') return 'CONDITIONAL';
  return 'BLOCKED';
}
