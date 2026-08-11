import { semanticHash } from '../../core/shared-piping-model/index.js';

export function validateTopologyEditEngineeringCommandEffect(candidate) {
  if (candidate.commandType === 'REPLACE_INLINE_COMPONENT') {
    return validateReplacement(candidate);
  }
  if (candidate.commandType === 'UPDATE_JUNCTION_BRANCH_RELATION') {
    return validateJunctionRelation(candidate);
  }
  return [finding(
    'ENGINEERING_COMMAND_TYPE_UNSUPPORTED',
    `Unsupported engineering command ${candidate.commandType}.`,
    [candidate.commandType],
  )];
}

function validateReplacement(candidate) {
  const delta = candidate.topologyDelta;
  const payload = candidate.resolvedPayload ?? {};
  const binding = payload.catalogueBinding ?? {};
  const edge = (candidate.canonicalTopology.edges ?? []).find((row) => row.id === payload.edgeId);
  const exactDelta = sameIds(delta.edges.changedIds, [payload.edgeId])
    && noChanges(delta.edges, ['addedIds', 'removedIds'])
    && noCollectionChanges(delta, ['nodes', 'junctions', 'supports', 'boundaries', 'rigids', 'bends']);
  const exactAuthority = edge?.id === payload.edgeId
    && edge?.topologyOperation === 'REPLACE_INLINE_COMPONENT'
    && edge?.entityType === binding.componentType
    && edge?.catalogueRecordHash === binding.recordHash
    && edge?.catalogueHash === binding.catalogueHash
    && edge?.catalogueSourceHash === binding.sourceHash
    && edge?.lastModifiedByCommandId === candidate.commandId
    && typeAuthority(edge, binding);
  if (exactDelta && exactAuthority) return [];
  return [finding(
    'REPLACE_INLINE_COMPONENT_DELTA_INVALID',
    'REPLACE_INLINE_COMPONENT must change exactly one existing component edge while preserving canonical identity and exact catalogue custody.',
    [...changes(delta.edges), payload.edgeId].filter(Boolean),
  )];
}

function typeAuthority(edge, binding) {
  if (binding.componentType === 'VALVE') {
    return edge.valveType === binding.valveType
      && edge.valveFaceToFaceMm === binding.valveFaceToFaceMm;
  }
  if (binding.componentType === 'FLANGE') {
    return edge.flangeType === binding.flangeType
      && edge.flangeFacing === binding.flangeFacing
      && edge.flangeClass === binding.flangeClass
      && edge.componentLengthMm === binding.componentLengthMm;
  }
  if (binding.componentType === 'REDUCER') {
    return edge.reducerType === binding.reducerType
      && edge.reducerOrientation === binding.reducerOrientation
      && edge.secondaryNominalSizeMm === binding.secondaryNominalSizeMm
      && edge.componentLengthMm === binding.componentLengthMm;
  }
  return false;
}

function validateJunctionRelation(candidate) {
  const delta = candidate.topologyDelta;
  const payload = candidate.resolvedPayload ?? {};
  const junction = (candidate.canonicalTopology.junctions ?? [])
    .find((row) => row.id === payload.junctionId);
  const relation = junction?.branchRelation;
  const exactDelta = sameIds(delta.junctions.changedIds, [payload.junctionId])
    && noChanges(delta.junctions, ['addedIds', 'removedIds'])
    && noCollectionChanges(delta, ['nodes', 'edges', 'supports', 'boundaries', 'rigids', 'bends']);
  const exactAuthority = junction?.topologyOperation === 'UPDATE_JUNCTION_BRANCH_RELATION'
    && junction?.lastModifiedByCommandId === candidate.commandId
    && relation?.relationHash === payload.relationHash
    && relation?.reducerEdgeId === payload.reducerEdgeId
    && relation?.reducerRecordHash === payload.reducerCatalogueBinding?.recordHash
    && relation?.branchNodeId === payload.branchNodeId
    && relation?.branchPortKey === payload.branchPortKey
    && semanticHash(relation?.runNodeIds ?? []) === semanticHash(payload.runNodeIds ?? []);
  if (exactDelta && exactAuthority) return [];
  return [finding(
    'UPDATE_JUNCTION_BRANCH_RELATION_DELTA_INVALID',
    'UPDATE_JUNCTION_BRANCH_RELATION must change exactly one existing tee junction and retain the exact branch-port/reducer catalogue relation.',
    [...changes(delta.junctions), payload.junctionId, payload.reducerEdgeId].filter(Boolean),
  )];
}

function noCollectionChanges(delta, keys) {
  return keys.every((key) => changes(delta[key]).length === 0);
}
function noChanges(delta, fields) {
  return fields.every((field) => (delta?.[field] ?? []).length === 0);
}
function changes(delta = {}) {
  return [
    ...(delta.addedIds ?? []),
    ...(delta.removedIds ?? []),
    ...(delta.changedIds ?? []),
  ];
}
function sameIds(actual, expected) {
  return semanticHash([...(actual ?? [])].sort()) === semanticHash([...expected].sort());
}
function finding(code, message, targetIds = []) {
  return { code, message, targetIds: [...new Set(targetIds)].sort() };
}
