import { SURFACES } from './constants.js';
import {
  canonicalConstraint,
  canonicalLoadCase,
} from './canonical-records.js';
import { ShellModelError } from './errors.js';
import {
  canonicalStringify,
  codeUnitCompare,
  deepFreeze,
  semanticHash,
  strictClone,
} from './json.js';
import {
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
  createExperimentalMitcAdoptionModel,
} from './mitc-adoption-model.js';
import {
  exactKeys,
  nonEmptyString,
  stringArray,
  uniqueBy,
} from './validation.js';

export const MITC_PRODUCTION_MODEL_SCHEMA = 'local-shell-model/v2';
export const MITC_PRODUCTION_FORMULATION_FAMILY = 'MITC_REISSNER_MINDLIN_5DOF_V1';
export const MITC_PRODUCTION_ROUTE_STATUS = 'PRODUCTION_ROUTE_REGISTERED';
export const MITC_PRODUCTION_QUALIFICATION_STATE = 'PENDING_EXECUTABLE_VALIDATION';

export const MITC_PRODUCTION_LIMITATIONS = Object.freeze([
  'NO_DRILLING_DOF',
  'NO_DRILLING_PENALTY_OR_ARTIFICIAL_STIFFNESS',
  'NO_TRANSVERSE_NORMAL_STRESS',
  'NO_THICKNESS_STRETCHING',
  'NO_CONTACT_OR_FRICTION',
  'NO_LARGE_DISPLACEMENT',
  'NO_FOLLOWER_PRESSURE',
  'NO_PLASTICITY',
  'NO_MATERIAL_NONLINEARITY',
  'NO_BUCKLING',
  'NO_FATIGUE',
  'NO_CRACK_OR_FRACTURE',
  'NO_AUTOMATIC_OR_ADAPTIVE_MESHING',
  'NO_ATTACHMENT_TEMPLATE',
  'NO_WELD_STRESS',
  'NO_CODE_COMPLIANCE',
  'NO_NODAL_STRESS',
  'NO_STRESS_AVERAGING_OR_SMOOTHING',
  'NO_STRESS_EXTRAPOLATION',
  'NO_CONTOUR_AUTHORITY',
]);

export const MITC_PRODUCTION_RESULT_REQUEST = Object.freeze({
  stressSurfaces: Object.freeze([...SURFACES]),
  retainElementMatrices: true,
  retainTransverseShear: true,
});

const SOURCE_KEYS = [
  'schema', 'modelIdentity', 'modelVersion', 'sourceAncestry', 'units',
  'formulationFamily', 'materials', 'nodes', 'elements', 'constraints',
  'loadCases', 'resultRequests', 'qualificationProfile', 'mitcQualification',
  'limitations',
];
const MODEL_KEYS = [...SOURCE_KEYS, 'semanticHash'];

export function createCanonicalMitcProductionModel(source) {
  const body = canonicalBody(strictClone(source));
  return deepFreeze({ ...body, semanticHash: semanticHash(body) });
}

export function validateCanonicalMitcProductionModel(model) {
  const cloned = strictClone(model);
  exactKeys(cloned, MODEL_KEYS, 'MITC production model');
  const { semanticHash: retainedHash, ...source } = cloned;
  const body = canonicalBody(source);
  if (retainedHash !== semanticHash(body)) {
    throw new ShellModelError('MITC production model semanticHash does not reconstruct');
  }
  if (canonicalStringify(body) !== canonicalStringify(source)) {
    throw new ShellModelError('MITC production model is not in canonical ordering');
  }
  return deepFreeze({ ...body, semanticHash: retainedHash });
}

export function createMitcMechanicsModelFromProduction(model) {
  const canonical = validateCanonicalMitcProductionModel(model);
  return createExperimentalMitcAdoptionModel({
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity: canonical.modelIdentity,
    modelVersion: canonical.modelVersion,
    sourceAncestry: canonical.sourceAncestry,
    units: canonical.units,
    materials: canonical.materials,
    nodes: canonical.nodes,
    elements: canonical.elements,
    qualificationProfile: canonical.qualificationProfile,
    mitcQualification: canonical.mitcQualification,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  });
}

function canonicalBody(source) {
  exactKeys(source, SOURCE_KEYS, 'MITC production source');
  if (source.schema !== MITC_PRODUCTION_MODEL_SCHEMA) {
    throw new ShellModelError(`schema must be ${MITC_PRODUCTION_MODEL_SCHEMA}`);
  }
  if (source.formulationFamily !== MITC_PRODUCTION_FORMULATION_FAMILY) {
    throw new ShellModelError(
      `formulationFamily must be ${MITC_PRODUCTION_FORMULATION_FAMILY}`,
    );
  }

  // Reuse the already qualified MITC geometry/material/formulation contract as
  // the single canonical mechanics owner. Production custody is added outside
  // that mechanics contract; no element formula or topology fallback is copied.
  const mechanics = createExperimentalMitcAdoptionModel({
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity: nonEmptyString(source.modelIdentity, 'modelIdentity'),
    modelVersion: nonEmptyString(source.modelVersion, 'modelVersion'),
    sourceAncestry: source.sourceAncestry,
    units: source.units,
    materials: source.materials,
    nodes: source.nodes,
    elements: source.elements,
    qualificationProfile: source.qualificationProfile,
    mitcQualification: source.mitcQualification,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  });

  const nodeIds = new Set(mechanics.nodes.map((node) => node.nodeId));
  const elementIds = new Set(mechanics.elements.map((element) => element.elementId));
  const constraints = canonicalConstraints(source.constraints, nodeIds);
  const loadCases = canonicalLoadCases(source.loadCases, nodeIds, elementIds);
  rejectUnreferencedNodes(mechanics.nodes, mechanics.elements);

  return {
    schema: MITC_PRODUCTION_MODEL_SCHEMA,
    modelIdentity: mechanics.modelIdentity,
    modelVersion: mechanics.modelVersion,
    sourceAncestry: [...mechanics.sourceAncestry],
    units: mechanics.units,
    formulationFamily: MITC_PRODUCTION_FORMULATION_FAMILY,
    materials: mechanics.materials,
    nodes: mechanics.nodes,
    elements: mechanics.elements,
    constraints,
    loadCases,
    resultRequests: canonicalResultRequests(source.resultRequests),
    qualificationProfile: mechanics.qualificationProfile,
    mitcQualification: mechanics.mitcQualification,
    limitations: canonicalLimitations(source.limitations),
  };
}

function canonicalConstraints(source, nodeIds) {
  if (!Array.isArray(source)) throw new ShellModelError('constraints must be an array');
  const constraints = source.map(canonicalConstraint).sort(by('constraintId'));
  uniqueBy(constraints, 'constraintId', 'constraintId');
  const targets = new Set();
  for (const constraint of constraints) {
    if (!nodeIds.has(constraint.nodeId)) {
      throw new ShellModelError(`Unresolved constraint node ${constraint.nodeId}`);
    }
    const target = `${constraint.nodeId}:${constraint.dof}`;
    if (targets.has(target)) throw new ShellModelError(`Duplicate prescribed DOF ${target}`);
    targets.add(target);
  }
  return constraints;
}

function canonicalLoadCases(source, nodeIds, elementIds) {
  if (!Array.isArray(source)) throw new ShellModelError('loadCases must be an array');
  const loadCases = source.map(canonicalLoadCase).sort(by('loadCaseId'));
  uniqueBy(loadCases, 'loadCaseId', 'loadCaseId');
  if (loadCases.length === 0) throw new ShellModelError('At least one explicit load case is required');
  for (const loadCase of loadCases) {
    for (const load of loadCase.nodalLoads) {
      if (!nodeIds.has(load.nodeId)) throw new ShellModelError(`Unresolved nodal load node ${load.nodeId}`);
    }
    for (const load of loadCase.pressureLoads) {
      if (!elementIds.has(load.elementId)) throw new ShellModelError(`Unresolved pressure element ${load.elementId}`);
    }
  }
  return loadCases;
}

function canonicalResultRequests(source) {
  exactKeys(
    source,
    ['stressSurfaces', 'retainElementMatrices', 'retainTransverseShear'],
    'MITC production resultRequests',
  );
  const surfaces = stringArray(source.stressSurfaces, 'resultRequests.stressSurfaces')
    .sort(codeUnitCompare);
  const expected = [...SURFACES].sort(codeUnitCompare);
  if (JSON.stringify(surfaces) !== JSON.stringify(expected)) {
    throw new ShellModelError('MITC production resultRequests must retain all fixed stress surfaces');
  }
  if (source.retainElementMatrices !== true) {
    throw new ShellModelError('resultRequests.retainElementMatrices must be true');
  }
  if (source.retainTransverseShear !== true) {
    throw new ShellModelError('resultRequests.retainTransverseShear must be true');
  }
  return {
    stressSurfaces: surfaces,
    retainElementMatrices: true,
    retainTransverseShear: true,
  };
}

function canonicalLimitations(source) {
  const limitations = canonicalStrings(source, 'limitations');
  for (const required of MITC_PRODUCTION_LIMITATIONS) {
    if (!limitations.includes(required)) {
      throw new ShellModelError(`Missing mandatory MITC production limitation ${required}`);
    }
  }
  return limitations;
}

function canonicalStrings(source, label) {
  const values = stringArray(source, label).sort(codeUnitCompare);
  if (new Set(values).size !== values.length) {
    throw new ShellModelError(`${label} contains duplicates`);
  }
  return values;
}

function rejectUnreferencedNodes(nodes, elements) {
  const referenced = new Set(elements.flatMap((element) => element.nodeIds));
  for (const node of nodes) {
    if (!referenced.has(node.nodeId)) {
      throw new ShellModelError(`Disconnected unreferenced node ${node.nodeId}`);
    }
  }
}

function by(field) {
  return (left, right) => codeUnitCompare(left[field], right[field]);
}
