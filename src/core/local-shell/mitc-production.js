import {
  FORMULA_IDS,
  QUALIFICATION_STATES,
} from './constants.js';
import {
  ShellModelError,
  ShellSingularSystemError,
} from './errors.js';
import { deepFreeze, semanticHash } from './json.js';
import {
  MITC_ADOPTION_EXECUTION_SCHEMA,
  solveExperimentalMitcLoadCase,
} from './mitc-adoption-solve.js';
import { recoverExperimentalMitcLoadCase } from './mitc-adoption-recovery.js';
import {
  MITC_PRODUCTION_FORMULATION_FAMILY,
  MITC_PRODUCTION_MODEL_SCHEMA,
  MITC_PRODUCTION_QUALIFICATION_STATE,
  MITC_PRODUCTION_ROUTE_STATUS,
  createMitcMechanicsModelFromProduction,
  validateCanonicalMitcProductionModel,
} from './mitc-production-model.js';
import { cleanNumber } from './numeric.js';

export const MITC_PRODUCTION_RESULT_SCHEMA = 'local-shell-result/v2';
export const MITC_PRODUCTION_ENGINEERING_LEVEL =
  'LINEAR_2_5D_REISSNER_MINDLIN_MITC_5DOF';

export function calculateMitcProductionShell(model) {
  let canonical;
  try {
    canonical = validateCanonicalMitcProductionModel(model);
    return acceptedResult(canonical);
  } catch (error) {
    return rejectedResult(canonical ?? model, error);
  }
}

function acceptedResult(model) {
  const mechanicsModel = createMitcMechanicsModelFromProduction(model);
  const solvedCases = model.loadCases.map((loadCase) => solveCase(
    model,
    mechanicsModel,
    loadCase,
  ));
  const firstCase = solvedCases[0];
  const meshEvidence = productionMeshEvidence(firstCase.solved.meshEvidence);
  const loadCaseResults = solvedCases.map(({ solved, recovered }) =>
    productionLoadCase(model, solved, recovered));
  const formulaTrace = uniqueFormulaIds([
    ...meshEvidence.formulaIds,
    ...loadCaseResults.flatMap((loadCase) => loadCase.formulaIds),
  ]);
  const payload = {
    schema: MITC_PRODUCTION_RESULT_SCHEMA,
    modelIdentity: model.modelIdentity,
    modelVersion: model.modelVersion,
    sourceAncestry: [...model.sourceAncestry],
    formulation: MITC_PRODUCTION_FORMULATION_FAMILY,
    formulations: uniqueStrings(model.elements.map((element) => element.formulation)),
    engineeringLevel: MITC_PRODUCTION_ENGINEERING_LEVEL,
    routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
    qualification: {
      state: QUALIFICATION_STATES.ACCEPTED,
      engineeringLevel: MITC_PRODUCTION_ENGINEERING_LEVEL,
      accepted: true,
      summary: 'MITC production route numerical qualifications accepted; release qualification remains pending executable validation',
    },
    productionQualification: productionQualification(),
    canonicalModelSemanticHash: model.semanticHash,
    meshEvidence,
    loadCaseResults,
    formulaTrace,
    diagnostics: [],
    limitations: uniqueStrings([
      ...model.limitations,
      'RELEASE_QUALIFICATION_PENDING_EXECUTABLE_VALIDATION',
    ]),
  };
  return deepFreeze({ ...payload, semanticHash: semanticHash(payload) });
}

function solveCase(model, mechanicsModel, loadCase) {
  const solved = solveExperimentalMitcLoadCase(mechanicsModel, {
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    loadCaseId: loadCase.loadCaseId,
    constraints: model.constraints,
    nodalLoads: loadCase.nodalLoads,
    pressureLoads: loadCase.pressureLoads,
    sourceReference: loadCase.sourceReference,
  });
  const recovered = recoverExperimentalMitcLoadCase(mechanicsModel, solved);
  return { solved, recovered };
}

function productionMeshEvidence(source) {
  const elements = source.elements.map((element) => {
    const {
      routeStatus: _experimentalRouteStatus,
      contributesToLafea4ProductionQualification: _experimentalQualification,
      ...evidence
    } = element;
    return {
      ...evidence,
      routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
      productionQualificationState: MITC_PRODUCTION_QUALIFICATION_STATE,
    };
  });
  return {
    dofOrdering: [...source.dofOrdering],
    stiffnessStorage: source.stiffnessStorage,
    retainedStiffness: source.retainedStiffness,
    globalStiffnessSymmetry: source.globalStiffnessSymmetry,
    elementAssembly: source.elementAssembly,
    elements,
    formulaIds: uniqueFormulaIds([
      FORMULA_IDS.GLOBAL_ASSEMBLY,
      ...elements.flatMap((element) => element.formulaIds ?? []),
    ]),
  };
}

function productionLoadCase(model, solved, recovered) {
  const nodalDisplacements = recoverNodalDisplacements(model, solved);
  const reactions = recoverReactions(model, solved);
  const appliedLoadEvidence = productionAppliedLoadEvidence(solved.appliedLoadEvidence);
  const checks = [
    solved.freeDofResidualQualification,
    solved.forceEquilibrium?.qualification,
    solved.momentEquilibrium?.qualification,
    recovered.energyQualification,
  ].filter(Boolean);
  const qualification = {
    accepted: checks.every((check) => check.accepted === true),
    checks,
  };
  if (!qualification.accepted) {
    const error = new TypeError(`MITC production load case ${solved.loadCaseId} failed retained qualification`);
    error.code = 'MITC_PRODUCTION_LOAD_CASE_QUALIFICATION_FAILED';
    error.evidence = qualification;
    throw error;
  }
  return {
    loadCaseId: solved.loadCaseId,
    routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
    productionQualification: productionQualification(),
    nodalDisplacements,
    reactions,
    freeDofIdentities: [...solved.freeDofIdentities],
    constrainedDofIdentities: [...solved.constrainedDofIdentities],
    solverEvidence: solved.solverEvidence,
    freeDofResiduals: solved.freeDofResiduals,
    freeDofResidualQualification: solved.freeDofResidualQualification,
    forceEquilibrium: solved.forceEquilibrium,
    momentEquilibrium: solved.momentEquilibrium,
    appliedLoadEvidence,
    elementResults: recovered.elementResults,
    inPlaneInvariantAuthority: recovered.inPlaneInvariantAuthority,
    transverseShearAuthority: recovered.transverseShearAuthority,
    transverseShearIncludedInInPlaneVonMises:
      recovered.transverseShearIncludedInInPlaneVonMises,
    membraneStrainEnergy: recovered.membraneStrainEnergy,
    bendingStrainEnergy: recovered.bendingStrainEnergy,
    transverseShearStrainEnergy: recovered.transverseShearStrainEnergy,
    totalStrainEnergy: recovered.totalStrainEnergy,
    globalStrainEnergy: recovered.stiffnessStrainEnergy,
    energyQualification: recovered.energyQualification,
    qualification,
    formulaIds: uniqueFormulaIds([
      ...(solved.formulaIds ?? []),
      ...(recovered.formulaIds ?? []),
    ]),
  };
}

function productionAppliedLoadEvidence(source) {
  const {
    routeStatus: _experimentalRouteStatus,
    contributesToLafea4ProductionQualification: _experimentalQualification,
    pressureEvidence,
    ...evidence
  } = source;
  const productionPressure = pressureEvidence
    ? productionPressureEvidence(pressureEvidence)
    : pressureEvidence;
  return {
    ...evidence,
    routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
    productionQualificationState: MITC_PRODUCTION_QUALIFICATION_STATE,
    pressureEvidence: productionPressure,
  };
}

function productionPressureEvidence(source) {
  const {
    routeStatus: _experimentalRouteStatus,
    contributesToLafea4ProductionQualification: _experimentalQualification,
    ...evidence
  } = source;
  return {
    ...evidence,
    routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
    productionQualificationState: MITC_PRODUCTION_QUALIFICATION_STATE,
  };
}

function recoverNodalDisplacements(model, solved) {
  const dofIndex = new Map(
    solved.meshEvidence.dofOrdering.map((identity, index) => [identity, index]),
  );
  return model.nodes.map((node) => ({
    nodeId: node.nodeId,
    ux: valueAt(solved.displacement, dofIndex, `${node.nodeId}:UX`),
    uy: valueAt(solved.displacement, dofIndex, `${node.nodeId}:UY`),
    uz: valueAt(solved.displacement, dofIndex, `${node.nodeId}:UZ`),
    r1: valueAt(solved.displacement, dofIndex, `${node.nodeId}:R1`),
    r2: valueAt(solved.displacement, dofIndex, `${node.nodeId}:R2`),
  }));
}

function recoverReactions(model, solved) {
  const dofIndex = new Map(
    solved.meshEvidence.dofOrdering.map((identity, index) => [identity, index]),
  );
  const constraints = new Map(
    model.constraints.map((constraint) => [
      `${constraint.nodeId}:${constraint.dof}`,
      constraint,
    ]),
  );
  return solved.constrainedDofIdentities.map((identity) => {
    const constraint = constraints.get(identity);
    if (!constraint) throw new TypeError(`Missing MITC production constraint ${identity}`);
    const [nodeId, dof] = identity.split(':');
    return {
      constraintId: constraint.constraintId,
      nodeId,
      dof,
      kind: dof.startsWith('R') ? 'MOMENT' : 'FORCE',
      value: valueAt(solved.reaction, dofIndex, identity),
    };
  });
}

function valueAt(vector, index, identity) {
  const offset = index.get(identity);
  if (!Number.isInteger(offset)) throw new TypeError(`Missing MITC production DOF ${identity}`);
  return cleanNumber(vector[offset]);
}

function productionQualification() {
  return {
    state: MITC_PRODUCTION_QUALIFICATION_STATE,
    qualifiedForRelease: false,
    contributesToLafea4ReleaseQualification: false,
    evidenceState: 'NOT_RUN',
    summary: 'Production dispatch is registered; executable release qualification has not run',
  };
}

function rejectedResult(source, error) {
  const identity = safeIdentity(source);
  const state = error instanceof ShellModelError
    ? QUALIFICATION_STATES.REJECTED_MODEL
    : error instanceof ShellSingularSystemError
      ? QUALIFICATION_STATES.SINGULAR_SYSTEM
      : QUALIFICATION_STATES.NUMERICAL_FAILURE;
  const payload = {
    schema: MITC_PRODUCTION_RESULT_SCHEMA,
    modelIdentity: identity.modelIdentity,
    modelVersion: identity.modelVersion,
    sourceAncestry: identity.sourceAncestry,
    formulation: MITC_PRODUCTION_FORMULATION_FAMILY,
    formulations: [],
    engineeringLevel: MITC_PRODUCTION_ENGINEERING_LEVEL,
    routeStatus: MITC_PRODUCTION_ROUTE_STATUS,
    qualification: {
      state,
      engineeringLevel: MITC_PRODUCTION_ENGINEERING_LEVEL,
      accepted: false,
      summary: error instanceof Error ? error.message : 'Unknown MITC production rejection',
    },
    productionQualification: productionQualification(),
    canonicalModelSemanticHash: identity.semanticHash,
    formulaTrace: [],
    diagnostics: [{
      code: error?.code ?? state,
      message: error instanceof Error ? error.message : 'Unknown MITC production rejection',
    }],
    limitations: uniqueStrings([
      ...identity.limitations,
      'RELEASE_QUALIFICATION_PENDING_EXECUTABLE_VALIDATION',
    ]),
  };
  return deepFreeze({ ...payload, semanticHash: semanticHash(payload) });
}

function safeIdentity(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return emptyIdentity();
  }
  return {
    modelIdentity: typeof source.modelIdentity === 'string' ? source.modelIdentity : null,
    modelVersion: typeof source.modelVersion === 'string' ? source.modelVersion : null,
    sourceAncestry: Array.isArray(source.sourceAncestry)
      ? source.sourceAncestry.filter((value) => typeof value === 'string').sort()
      : [],
    semanticHash: typeof source.semanticHash === 'string' ? source.semanticHash : null,
    limitations: Array.isArray(source.limitations)
      ? source.limitations.filter((value) => typeof value === 'string').sort()
      : [],
  };
}

function emptyIdentity() {
  return {
    modelIdentity: null,
    modelVersion: null,
    sourceAncestry: [],
    semanticHash: null,
    limitations: [],
  };
}

function uniqueFormulaIds(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))].sort();
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))].sort();
}

export function isMitcProductionModel(value) {
  return value?.schema === MITC_PRODUCTION_MODEL_SCHEMA;
}
