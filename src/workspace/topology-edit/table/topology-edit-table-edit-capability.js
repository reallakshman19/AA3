import { topologyEditTableColumnsFor } from './topology-edit-table-columns.js';
import { createTopologyEditCapabilityReceipt } from '../editor-state/topology-edit-capability-contract.js';
import {
  SUPPORT_GEOMETRY_POLICY_REQUIRED,
  topologyEditAffectedEdgeIds,
  topologyEditSupportGeometryDependencies,
} from '../professional/topology-edit-support-geometry-dependency.js';

const CERTIFIED_EDITOR_TO_INTENT = Object.freeze({
  PIPE_LENGTH: 'PIPE_LENGTH',
  VALVE_REPLACE: 'VALVE_REPLACEMENT',
  BRANCH_RECONFIGURE: 'TEE_REDUCER_RELATION',
});

const SUPPORT_MUTATION_KEYS = new Set([
  'stationMm', 'supportType', 'direction', 'gapMm', 'travelMm',
]);
const UNCERTIFIED_PROPERTIES = Object.freeze({
  PIPE: new Set(['slopePercent']),
  ELBOW: new Set(['angleDeg', 'radiusMm', 'turnIntent']),
  FLANGE: new Set(['flangeType', 'flangeFacing', 'rating']),
  REDUCER: new Set(['reducerType', 'reducerOrientation']),
});
const NODE_DEPENDANT_COLLECTIONS = Object.freeze([
  'junctions', 'boundaries', 'rigids', 'bends',
]);

export function deriveTopologyEditTableCellCapability(input = {}) {
  const row = input.row;
  const columnKey = String(input.columnKey ?? '').trim();
  const context = {
    basisCanonicalHash: input.basisCanonicalHash ?? input.projection?.authority?.canonicalTopologyHash ?? null,
    selectionHash: input.selectionHash ?? null,
    selectionRevision: input.selectionRevision ?? null,
  };
  if (!row || !columnKey) {
    return receipt('BLOCKED', 'SELECTION_REQUIRED', 'Select an exact table row and property.', row, columnKey, context);
  }
  const descriptor = topologyEditTableColumnsFor(row.elementType)
    .find((column) => column.key === columnKey);
  if (row.elementType === 'SUPPORT' && SUPPORT_MUTATION_KEYS.has(columnKey)) {
    return receipt(
      'UNREPRESENTABLE',
      'SUPPORT_EDIT_NOT_CERTIFIED',
      'Support editing is not certified in this recovery slice.',
      row,
      columnKey,
      context,
    );
  }
  if (UNCERTIFIED_PROPERTIES[row.elementType]?.has(columnKey)) {
    return receipt(
      'UNREPRESENTABLE',
      'TABLE_INTENT_NOT_CERTIFIED',
      `${descriptor?.label || columnKey} is visible but not yet backed by a certified Table intent.`,
      row,
      columnKey,
      context,
    );
  }
  if (descriptor?.readOnly) {
    return receipt('BLOCKED', 'READ_ONLY_PROPERTY', 'This property is explicitly read-only.', row, columnKey, context);
  }
  if (!descriptor?.editor) {
    return receipt('BLOCKED', 'READ_ONLY_PROPERTY', 'No certified editor is declared for this property.', row, columnKey, context);
  }
  const intentKind = CERTIFIED_EDITOR_TO_INTENT[descriptor.editor];
  if (!intentKind) {
    return receipt(
      'UNREPRESENTABLE',
      'TABLE_INTENT_NOT_CERTIFIED',
      `${descriptor.label} is visible but not yet backed by a certified Table intent.`,
      row,
      columnKey,
      context,
      { editor: descriptor.editor },
    );
  }
  if (intentKind === 'PIPE_LENGTH') {
    const available = row.elementType === 'PIPE' && row.identity?.canonicalKind === 'EDGE';
    return available
      ? receipt('AVAILABLE', 'READY', 'Certified PIPE_LENGTH intent is available.', row, columnKey, context, { intentKind })
      : receipt('BLOCKED', 'TABLE_TARGET_KIND_INVALID', 'PIPE_LENGTH requires an exact PIPE edge row.', row, columnKey, context, { intentKind });
  }
  if (intentKind === 'VALVE_REPLACEMENT') {
    if (row.elementType !== 'VALVE' || row.identity?.canonicalKind !== 'EDGE') {
      return receipt('BLOCKED', 'TABLE_TARGET_KIND_INVALID', 'VALVE_REPLACEMENT requires an exact VALVE edge row.', row, columnKey, context, { intentKind });
    }
    if (token(row.fields?.valveType) !== 'GATE') {
      return receipt('BLOCKED', 'VALVE_TARGET_NOT_CERTIFIED', 'The certified Table replacement path currently requires an observed GATE valve.', row, columnKey, context, { intentKind });
    }
    return receipt(
      'NEEDS_INPUT',
      'EXACT_CATALOGUE_RECORD_REQUIRED',
      'Choose an exact BALL valve catalogue record and geometry policy before staging.',
      row,
      columnKey,
      context,
      { intentKind },
      ['catalogueBinding', 'geometryPolicy'],
    );
  }
  if (intentKind === 'TEE_REDUCER_RELATION') {
    if (row.elementType !== 'TEE' || row.identity?.canonicalKind !== 'JUNCTION') {
      return receipt('BLOCKED', 'TABLE_TARGET_KIND_INVALID', 'TEE_REDUCER_RELATION requires an exact TEE junction row.', row, columnKey, context, { intentKind });
    }
    return receipt(
      'NEEDS_INPUT',
      'REQUIRED_ENGINEERING_INPUT_MISSING',
      'Choose the exact branch binding and reducer with exact catalogue custody before staging.',
      row,
      columnKey,
      context,
      { intentKind },
      ['branchPortKey', 'reducerCanonicalId'],
    );
  }
  return receipt('UNREPRESENTABLE', 'TABLE_INTENT_NOT_CERTIFIED', 'No certified Table intent is available.', row, columnKey, context);
}

export function deriveTopologyEditTableNodePositionCapability(input = {}) {
  const row = input.row;
  const endpoint = token(input.endpoint);
  const projection = input.projection;
  const topology = input.canonicalTopology;
  const context = {
    basisCanonicalHash: input.basisCanonicalHash ?? projection?.authority?.canonicalTopologyHash ?? null,
    selectionHash: input.selectionHash ?? null,
    selectionRevision: input.selectionRevision ?? null,
  };
  const property = `nodePosition:${endpoint || 'ENDPOINT'}`;
  if (!row || !['FROM', 'TO'].includes(endpoint)) {
    return receipt('BLOCKED', 'SELECTION_REQUIRED', 'Select an exact EDGE endpoint.', row, property, context, {
      intentKind: 'NODE_POSITION', endpoint: endpoint || null,
    });
  }
  if (row.identity?.canonicalKind !== 'EDGE') {
    return receipt('BLOCKED', 'TABLE_TARGET_KIND_INVALID', 'NODE_POSITION requires an exact canonical EDGE row.', row, property, context, {
      intentKind: 'NODE_POSITION', endpoint,
    });
  }
  if (!topology || topology.canonicalTopologyHash !== projection?.authority?.canonicalTopologyHash) {
    return receipt('BLOCKED', 'CANONICAL_BASIS_STALE', 'Canonical topology differs from the Table projection.', row, property, context, {
      intentKind: 'NODE_POSITION', endpoint,
    });
  }
  const bindings = (row.identity?.portBindings ?? []).filter((entry) => entry?.endpoint === endpoint && entry?.nodeId);
  if (bindings.length !== 1) {
    return receipt('BLOCKED', 'NODE_ENDPOINT_AMBIGUOUS', `EDGE ${endpoint} endpoint does not resolve one canonical node.`, row, property, context, {
      intentKind: 'NODE_POSITION', endpoint,
    });
  }
  const nodeId = bindings[0].nodeId;
  const nodes = (topology.nodes ?? []).filter((node) => node?.id === nodeId);
  if (nodes.length !== 1 || !finitePoint(nodes[0]?.position)) {
    return receipt('BLOCKED', 'NODE_POSITION_UNRESOLVED', `Canonical node ${nodeId} has no exact finite position.`, row, property, context, {
      intentKind: 'NODE_POSITION', endpoint, nodeId,
    });
  }
  const supportDependencies = topologyEditSupportGeometryDependencies(topology, {
    movedNodeIds: [nodeId],
    affectedEdgeIds: topologyEditAffectedEdgeIds(topology, [nodeId]),
  });
  if (supportDependencies.length) {
    return receipt(
      'UNREPRESENTABLE',
      SUPPORT_GEOMETRY_POLICY_REQUIRED,
      `Node ${nodeId} affects support-host geometry; support movement policy must be certified before editing.`,
      row,
      property,
      context,
      { intentKind: 'NODE_POSITION', endpoint, nodeId, supportDependencies },
    );
  }
  const dependants = nodeDependants(topology, nodeId);
  if (dependants.length) {
    return receipt(
      'UNREPRESENTABLE',
      'NODE_DEPENDANT_POLICY_REQUIRED',
      `Node ${nodeId} participates in certified dependent records; move policy must be defined before editing.`,
      row,
      property,
      context,
      { intentKind: 'NODE_POSITION', endpoint, nodeId, dependants },
    );
  }
  return receipt(
    'AVAILABLE',
    'READY',
    `Certified NODE_POSITION editing is available for ${endpoint} node ${nodeId}.`,
    row,
    property,
    context,
    {
      intentKind: 'NODE_POSITION',
      endpoint,
      nodeId,
      movementModes: ['NODE_ONLY', 'CONNECTED_RUN'],
    },
  );
}

export function topologyEditTableRowCapabilityMap(row, projection) {
  const result = {};
  for (const column of topologyEditTableColumnsFor(row?.elementType)) {
    result[column.key] = deriveTopologyEditTableCellCapability({ row, columnKey: column.key, projection });
  }
  return Object.freeze(result);
}

function nodeDependants(topology, nodeId) {
  const result = [];
  for (const collection of NODE_DEPENDANT_COLLECTIONS) {
    for (const record of topology?.[collection] ?? []) {
      if (!recordNodeIds(record).includes(nodeId)) continue;
      result.push(`${collection}:${record.id}`);
    }
  }
  return result.sort();
}
function recordNodeIds(record) {
  return [...new Set([
    record?.nodeId, record?.fromNodeId, record?.toNodeId,
    ...(record?.nodeIds ?? []), ...(record?.fromNodeIds ?? []), ...(record?.toNodeIds ?? []),
  ].filter(Boolean))];
}
function finitePoint(value) {
  return value && [value.x, value.y, value.z].every(Number.isFinite);
}
function receipt(status, reasonCode, reason, row, columnKey, context, details = {}, missingEvidence = []) {
  return createTopologyEditCapabilityReceipt({
    surfaceId: 'ENGINEERING_TABLE',
    actionId: `${row?.elementType || 'ROW'}:${columnKey || 'PROPERTY'}`,
    status,
    reasonCode,
    reason,
    ...context,
    missingEvidence,
    details: {
      canonicalId: row?.identity?.canonicalId ?? null,
      elementType: row?.elementType ?? null,
      property: columnKey || null,
      ...details,
    },
  });
}
function token(value) { return String(value ?? '').trim().toUpperCase(); }
