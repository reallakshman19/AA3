import { compileLinearStiffnessPreflight } from '../linear-fea-solver/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { requireInputXmlLinearPhysicalCasePreparation } from './inputxml-linear-physical-cases-contract.js';
import { compileInputXmlStiffnessElementAuthorities } from './inputxml-linear-stiffness-elements.js';
import {
  INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_SCHEMA,
  sealInputXmlLinearStiffnessPreflight,
} from './inputxml-linear-stiffness-preflight-contract.js';
import {
  INPUTXML_STIFFNESS_PREFLIGHT_PROFILE_ID,
  inputXmlStiffnessFrameElementProfile,
  inputXmlStiffnessSolverProfile,
} from './inputxml-linear-stiffness-profile.js';

export function preflightInputXmlLinearSolve(physicalPreparation, options) {
  if (options === undefined) options = {};
  const accepted = requireInputXmlLinearPhysicalCasePreparation(physicalPreparation);
  const structural = accepted.structuralPreparation;
  const compilation = structural.compilation;
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const solverProfile = inputXmlStiffnessSolverProfile(options.solverProfile);
  const elements = compileInputXmlStiffnessElementAuthorities(structural, frameProfile, {
    sourcePreparation: accepted.sourcePreparation,
    bendFactorAuthority: options.bendFactorAuthority ?? null,
    branchFactorAuthority: options.branchFactorAuthority ?? null,
    capabilityProfile: options.capabilityProfile,
  });
  const generic = compileLinearStiffnessPreflight({
    compilation,
    elementContributions: elements.elementContributions,
    solverProfile,
  });
  const effectiveStiffnessStateHash = elements.effectiveStiffnessStateHash;
  const status = generic.status === 'QUALIFIED'
    ? 'PASS'
    : generic.status === 'CONDITIONAL'
      ? 'WARN'
      : 'BLOCK';
  const summary = Object.freeze({
    nodeCount: compilation.model.nodes.length,
    elementCount: elements.elementLedger.length,
    connectedComponentCount: generic.components.length,
    floatingComponentCount: generic.components.filter((row) => row.floating).length,
    dofCount: generic.dofMap.dofCount,
    freeDofCount: generic.assembly.freeDofCount,
    constrainedDofCount: generic.assembly.constrainedDofCount,
    inactiveDofCount: generic.assembly.inactiveDofCount,
    elementStiffnessCount: elements.elementLedger.length,
    pipingComponentCount: elements.pipingComponents.length,
    exactBendComponentCount: elements.pipingComponents
      .filter((row) => row.componentType === 'BEND').length,
    eligibleBendCount: elements.eligibleBendCount,
    bendExactMechanicsApplied: elements.bendExactMechanicsApplied,
    eligibleTeeJunctionCount: elements.eligibleTeeJunctionCount,
    exactTeeJunctionCount: elements.branchJunctions.length,
    teeExactMechanicsApplied: elements.teeExactMechanicsApplied,
    factorizationKind: generic.factorization.kind,
    conditionEstimate: generic.factorization.conditionEstimate,
    warningCount: generic.findings.filter((row) => row.disposition === 'WARN').length,
    blockingFindingCount: generic.findings.filter((row) => row.disposition === 'BLOCK').length,
  });

  return sealInputXmlLinearStiffnessPreflight({
    schema: INPUTXML_LINEAR_STIFFNESS_PREFLIGHT_SCHEMA,
    preflightId: `IXPF-${semanticHash({
      profile: INPUTXML_STIFFNESS_PREFLIGHT_PROFILE_ID,
      physicalPreparation: accepted.semanticHash,
      mechanicalStiffnessState: compilation.stiffnessStateHash,
      effectiveStiffnessState: effectiveStiffnessStateHash,
      capabilityProfile: elements.capabilityProfileHash,
      bendFactorAuthority: elements.bendFactorAuthority?.semanticHash ?? null,
      branchFactorAuthority: elements.branchFactorAuthority?.semanticHash ?? null,
      genericPreflight: generic.semanticHash,
    })}`,
    analysisProfileId: accepted.analysisProfileId,
    physicalPreparationSemanticHash: accepted.semanticHash,
    physicalPreparationEvidenceHash: accepted.evidenceHash,
    structuralPreparationSemanticHash: structural.semanticHash,
    structuralPreparationEvidenceHash: structural.evidenceHash,
    mechanicalModelSemanticHash: compilation.mechanicalModelSemanticHash,
    stiffnessStateHash: compilation.stiffnessStateHash,
    effectiveStiffnessStateHash,
    productionCapabilityProfileHash: elements.capabilityProfileHash,
    bendFactorAuthority: elements.bendFactorAuthority,
    branchFactorAuthority: elements.branchFactorAuthority,
    bendExactMechanicsApplied: elements.bendExactMechanicsApplied,
    teeExactMechanicsApplied: elements.teeExactMechanicsApplied,
    eligibleBendCount: elements.eligibleBendCount,
    eligibleTeeJunctionCount: elements.eligibleTeeJunctionCount,
    frameElementProfileSemanticHash: frameProfile.semanticHash,
    solverProfileSemanticHash: solverProfile.semanticHash,
    genericPreflightSemanticHash: generic.semanticHash,
    genericPreflightEvidenceHash: generic.evidenceHash,
    stiffnessAssessmentHash: '',
    genericPreflight: generic,
    elementLedger: elements.elementLedger,
    status,
    summary,
    executionBoundary: Object.freeze({
      stiffnessPreflight: status === 'PASS' ? 'QUALIFIED' : status === 'WARN' ? 'CONDITIONAL' : 'BLOCKED',
      factorizationHandle: 'NOT_RETAINED',
      solveExecution: 'NOT_AUTHORIZED',
    }),
  });
}
