import { assembleGlobalSystem } from './assembly.js';
import {
  canonicalConstraint,
  canonicalNodalLoad,
  canonicalPressureLoad,
} from './canonical-records.js';
import { FORMULA_IDS } from './constants.js';
import { buildExperimentalMitcElementEvidence } from './mitc-adoption-element.js';
import {
  assembleExperimentalMitcPressureLoads,
} from './mitc-adoption-loads.js';
import {
  MITC_ADOPTION_PRODUCTION_QUALIFICATION,
  MITC_ADOPTION_ROUTE_STATUS,
  validateExperimentalMitcAdoptionModel,
} from './mitc-adoption-model.js';
import { deepFreeze } from './json.js';
import { generalizedTotals } from './loads.js';
import { solveLoadCase } from './solver.js';
import { exactKeys, uniqueBy } from './validation.js';

export const MITC_ADOPTION_EXECUTION_SCHEMA = 'local-shell-mitc-adoption-execution/v1';

/**
 * Experimental assembly/linear-solve composition only. Element mechanics,
 * pressure integration and the shared shell numerical owners remain separate.
 * No stress recovery or registered LAFEA.4 route consumes this function.
 */
export function solveExperimentalMitcLoadCase(model, request) {
  const canonical = validateExperimentalMitcAdoptionModel(model);
  const execution = canonicalExecutionRequest(request, canonical);
  const elements = buildExperimentalMitcElementEvidence(canonical);
  const solverModel = { ...canonical, constraints: execution.constraints };
  const assembly = assembleGlobalSystem(solverModel, elements);
  if (!assembly.symmetry.accepted) {
    const error = new TypeError('Experimental MITC global stiffness symmetry failed');
    error.code = 'MITC_ADOPTION_GLOBAL_SYMMETRY_FAILED';
    error.evidence = assembly.symmetry;
    throw error;
  }
  const loads = assembleCombinedLoads(canonical, execution);
  const solution = solveLoadCase(solverModel, assembly, loads);
  return deepFreeze({
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    modelIdentity: canonical.modelIdentity,
    modelVersion: canonical.modelVersion,
    loadCaseId: execution.loadCaseId,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: MITC_ADOPTION_PRODUCTION_QUALIFICATION,
    sourceReference: execution.sourceReference,
    meshEvidence: {
      dofOrdering: assembly.dofOrdering,
      stiffnessStorage: assembly.stiffnessStorage,
      retainedStiffness: assembly.retainedStiffness,
      globalStiffnessSymmetry: assembly.symmetry,
      elementAssembly: assembly.elementAssembly,
      elements,
    },
    appliedLoadEvidence: loads,
    displacement: solution.displacement,
    reaction: solution.reaction,
    freeDofIdentities: solution.freeDofIdentities,
    constrainedDofIdentities: solution.constrainedDofIdentities,
    prescribedValues: solution.prescribedValues,
    solverEvidence: solution.solverEvidence,
    freeDofResiduals: solution.freeDofResiduals,
    freeDofResidualQualification: solution.freeDofResidualQualification,
    forceEquilibrium: solution.forceEquilibrium,
    momentEquilibrium: solution.momentEquilibrium,
    formulaIds: uniqueFormulaIds([
      ...elements.flatMap((element) => element.formulaIds),
      ...loads.formulaIds,
      ...solution.formulaIds,
    ]),
  });
}

function canonicalExecutionRequest(source, model) {
  exactKeys(source, [
    'schema', 'loadCaseId', 'constraints', 'nodalLoads', 'pressureLoads', 'sourceReference',
  ], 'MITC adoption execution request');
  if (source.schema !== MITC_ADOPTION_EXECUTION_SCHEMA) {
    throw new TypeError(`execution schema must be ${MITC_ADOPTION_EXECUTION_SCHEMA}`);
  }
  if (typeof source.loadCaseId !== 'string' || source.loadCaseId.length === 0) {
    throw new TypeError('loadCaseId must be a non-empty string');
  }
  if (typeof source.sourceReference !== 'string' || source.sourceReference.length === 0) {
    throw new TypeError('sourceReference must be a non-empty string');
  }
  const nodeIds = new Set(model.nodes.map((node) => node.nodeId));
  const elementIds = new Set(model.elements.map((element) => element.elementId));
  const constraints = canonicalConstraints(source.constraints, nodeIds);
  const nodalLoads = canonicalNodalLoads(source.nodalLoads, nodeIds);
  const pressureLoads = canonicalPressureLoads(source.pressureLoads, elementIds);
  return {
    schema: MITC_ADOPTION_EXECUTION_SCHEMA,
    loadCaseId: source.loadCaseId,
    constraints,
    nodalLoads,
    pressureLoads,
    sourceReference: source.sourceReference,
  };
}

function canonicalConstraints(source, nodeIds) {
  if (!Array.isArray(source)) throw new TypeError('constraints must be an array');
  const rows = source.map(canonicalConstraint).sort(by('constraintId'));
  uniqueBy(rows, 'constraintId', 'constraintId');
  const targets = new Set();
  for (const row of rows) {
    if (!nodeIds.has(row.nodeId)) throw new TypeError(`Unresolved MITC constraint node ${row.nodeId}`);
    const target = `${row.nodeId}:${row.dof}`;
    if (targets.has(target)) throw new TypeError(`Duplicate MITC prescribed DOF ${target}`);
    targets.add(target);
  }
  return rows;
}

function canonicalNodalLoads(source, nodeIds) {
  if (!Array.isArray(source)) throw new TypeError('nodalLoads must be an array');
  const rows = source.map(canonicalNodalLoad).sort(by('loadId'));
  uniqueBy(rows, 'loadId', 'loadId');
  for (const row of rows) {
    if (!nodeIds.has(row.nodeId)) throw new TypeError(`Unresolved MITC nodal-load node ${row.nodeId}`);
  }
  return rows;
}

function canonicalPressureLoads(source, elementIds) {
  if (!Array.isArray(source)) throw new TypeError('pressureLoads must be an array');
  const rows = source.map(canonicalPressureLoad).sort(by('pressureLoadId'));
  uniqueBy(rows, 'pressureLoadId', 'pressureLoadId');
  uniqueBy(rows, 'elementId', 'pressure application on element');
  for (const row of rows) {
    if (!elementIds.has(row.elementId)) throw new TypeError(`Unresolved MITC pressure element ${row.elementId}`);
  }
  return rows;
}

function assembleCombinedLoads(model, execution) {
  const pressure = assembleExperimentalMitcPressureLoads(model, execution.pressureLoads);
  const vector = [...pressure.forceVector];
  const dofIndex = new Map(pressure.dofOrdering.map((identity, index) => [identity, index]));
  const nodalContributions = execution.nodalLoads.map((load) => {
    const values = [load.fx, load.fy, load.fz, load.m1, load.m2];
    ['UX', 'UY', 'UZ', 'R1', 'R2'].forEach((dof, index) => {
      vector[dofIndex.get(`${load.nodeId}:${dof}`)] += values[index];
    });
    return {
      type: 'NODAL_FORCE_AND_TANGENT_MOMENT',
      identity: load.loadId,
      nodeId: load.nodeId,
      generalizedValues: values,
      sourceReference: load.sourceReference,
      formulaId: FORMULA_IDS.NODAL_LOAD,
    };
  });
  const totals = generalizedTotals(model.nodes, vector);
  return {
    loadCaseId: execution.loadCaseId,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: MITC_ADOPTION_PRODUCTION_QUALIFICATION,
    forceVector: vector,
    appliedForce: totals.force,
    appliedMomentAboutOrigin: totals.moment,
    pressureEvidence: pressure,
    nodalContributions,
    formulaIds: uniqueFormulaIds([
      ...pressure.formulaIds,
      ...(nodalContributions.length ? [FORMULA_IDS.NODAL_LOAD] : []),
    ]),
  };
}

function uniqueFormulaIds(values) {
  return [...new Set(values)].sort();
}

function by(field) {
  return (left, right) => left[field] < right[field] ? -1 : left[field] > right[field] ? 1 : 0;
}
