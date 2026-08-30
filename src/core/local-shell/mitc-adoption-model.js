import { canonicalMaterial, canonicalNode, canonicalUnits } from './canonical-records.js';
import { ShellModelError } from './errors.js';
import { canonicalFacet, canonicalQuadFacet, nodeBasisEvidence } from './geometry.js';
import { codeUnitCompare, deepFreeze, semanticHash, strictClone } from './json.js';
import { positiveNumber } from './numeric.js';
import { canonicalQualificationProfile } from './profile.js';
import {
  exactKeys,
  member,
  nonEmptyString,
  stringArray,
  toleranceRule,
  uniqueBy,
} from './validation.js';
import { MITC3_FORMULATION } from './mitc3-element.js';
import { MITC4_FORMULATION } from './mitc4-element.js';

export const MITC_ADOPTION_MODEL_SCHEMA = 'local-shell-mitc-adoption-model/v1';
export const MITC_ADOPTION_ROUTE_STATUS = 'EXPERIMENTAL_NONPRODUCTION';
export const MITC_ADOPTION_PRODUCTION_QUALIFICATION = false;
export const MITC3_TOPOLOGY = 'TRI3';
export const MITC4_TOPOLOGY = 'QUAD4';

const SOURCE_KEYS = [
  'schema', 'modelIdentity', 'modelVersion', 'sourceAncestry', 'units',
  'materials', 'nodes', 'elements', 'qualificationProfile',
  'mitcQualification', 'routeStatus', 'contributesToLafea4ProductionQualification',
];
const MODEL_KEYS = [...SOURCE_KEYS, 'semanticHash'];
const FORMULATIONS = [MITC4_FORMULATION, MITC3_FORMULATION];
const TOPOLOGIES = [MITC4_TOPOLOGY, MITC3_TOPOLOGY];

export function createExperimentalMitcAdoptionModel(source) {
  const body = canonicalBody(strictClone(source));
  return deepFreeze({ ...body, semanticHash: semanticHash(body) });
}

export function validateExperimentalMitcAdoptionModel(model) {
  const cloned = strictClone(model);
  exactKeys(cloned, MODEL_KEYS, 'MITC adoption model');
  const { semanticHash: retainedHash, ...source } = cloned;
  const body = canonicalBody(source);
  if (retainedHash !== semanticHash(body)) {
    throw new ShellModelError('MITC adoption model semanticHash does not reconstruct');
  }
  return deepFreeze({ ...body, semanticHash: retainedHash });
}

function canonicalBody(source) {
  exactKeys(source, SOURCE_KEYS, 'MITC adoption source');
  if (source.schema !== MITC_ADOPTION_MODEL_SCHEMA) {
    throw new ShellModelError(`schema must be ${MITC_ADOPTION_MODEL_SCHEMA}`);
  }
  requireExperimentalRoute(source);
  const qualificationProfile = canonicalQualificationProfile(source.qualificationProfile);
  const mitcQualification = canonicalMitcQualification(source.mitcQualification);
  const geometryProfile = { ...qualificationProfile, quadPlanarity: mitcQualification.quadPlanarity };
  const materials = source.materials.map(canonicalMaterial).sort(by('materialId'));
  const nodes = source.nodes.map(canonicalNode).sort(by('nodeId'));
  uniqueBy(materials, 'materialId', 'materialId');
  uniqueBy(nodes, 'nodeId', 'nodeId');
  nodes.forEach((node) => nodeBasisEvidence(node, qualificationProfile));
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]));
  const materialIds = new Set(materials.map((material) => material.materialId));
  const elements = canonicalElements(source.elements, nodeMap, materialIds, geometryProfile);
  return {
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity: nonEmptyString(source.modelIdentity, 'modelIdentity'),
    modelVersion: nonEmptyString(source.modelVersion, 'modelVersion'),
    sourceAncestry: canonicalStrings(source.sourceAncestry, 'sourceAncestry'),
    units: canonicalUnits(source.units),
    materials,
    nodes,
    elements,
    qualificationProfile,
    mitcQualification,
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  };
}

function canonicalMitcQualification(source) {
  exactKeys(source, ['quadPlanarity', 'rigidBodyEnergy'], 'mitcQualification');
  return {
    quadPlanarity: toleranceRule(source.quadPlanarity, 'mitcQualification.quadPlanarity'),
    rigidBodyEnergy: toleranceRule(source.rigidBodyEnergy, 'mitcQualification.rigidBodyEnergy'),
  };
}

function canonicalElements(source, nodeMap, materialIds, geometryProfile) {
  if (!Array.isArray(source) || source.length === 0) {
    throw new ShellModelError('elements must be a non-empty array');
  }
  const elements = source.map(canonicalMitcElement);
  uniqueBy(elements, 'elementId', 'elementId');
  const topologySets = new Set();
  for (const element of elements) {
    for (const nodeId of element.nodeIds) {
      if (!nodeMap.has(nodeId)) throw new ShellModelError(`Unresolved node ${nodeId}`);
    }
    if (!materialIds.has(element.materialId)) {
      throw new ShellModelError(`Unresolved material ${element.materialId}`);
    }
    const canonical = element.formulation === MITC4_FORMULATION
      ? canonicalQuadFacet(element.nodeIds, nodeMap, geometryProfile, element.elementId)
      : canonicalFacet(element.nodeIds, nodeMap, geometryProfile, element.elementId);
    element.nodeIds = canonical.nodeIds;
    const setKey = [...element.nodeIds].sort(codeUnitCompare).join('\u0000');
    if (topologySets.has(setKey)) throw new ShellModelError(`Duplicate MITC element node set ${setKey}`);
    topologySets.add(setKey);
  }
  return elements.sort(by('elementId'));
}

function canonicalMitcElement(source) {
  exactKeys(source, [
    'elementId', 'formulation', 'topology', 'nodeIds', 'materialId',
    'thickness', 'sourceReference',
  ], 'MITC element');
  const formulation = member(source.formulation, FORMULATIONS, 'element.formulation');
  const topology = member(source.topology, TOPOLOGIES, 'element.topology');
  requireMatchingTopology(formulation, topology);
  const nodeIds = stringArray(source.nodeIds, 'element.nodeIds');
  const expectedCount = formulation === MITC4_FORMULATION ? 4 : 3;
  if (nodeIds.length !== expectedCount || new Set(nodeIds).size !== expectedCount) {
    throw new ShellModelError(`${formulation} requires exactly ${expectedCount} unique node IDs`);
  }
  return {
    elementId: nonEmptyString(source.elementId, 'element.elementId'),
    formulation,
    topology,
    nodeIds,
    materialId: nonEmptyString(source.materialId, 'element.materialId'),
    thickness: positiveNumber(source.thickness, 'element.thickness'),
    sourceReference: nonEmptyString(source.sourceReference, 'element.sourceReference'),
  };
}

function requireMatchingTopology(formulation, topology) {
  if (formulation === MITC4_FORMULATION && topology !== MITC4_TOPOLOGY) {
    throw new ShellModelError(`${MITC4_FORMULATION} requires topology ${MITC4_TOPOLOGY}`);
  }
  if (formulation === MITC3_FORMULATION && topology !== MITC3_TOPOLOGY) {
    throw new ShellModelError(`${MITC3_FORMULATION} requires topology ${MITC3_TOPOLOGY}`);
  }
}

function requireExperimentalRoute(source) {
  if (source.routeStatus !== MITC_ADOPTION_ROUTE_STATUS) {
    throw new ShellModelError(`routeStatus must be ${MITC_ADOPTION_ROUTE_STATUS}`);
  }
  if (source.contributesToLafea4ProductionQualification !== false) {
    throw new ShellModelError('MITC adoption evidence must not contribute to LAFEA.4 production qualification');
  }
}

function canonicalStrings(source, label) {
  const values = stringArray(source, label).sort(codeUnitCompare);
  if (new Set(values).size !== values.length) throw new ShellModelError(`${label} contains duplicates`);
  return values;
}

function by(field) {
  return (left, right) => codeUnitCompare(left[field], right[field]);
}
