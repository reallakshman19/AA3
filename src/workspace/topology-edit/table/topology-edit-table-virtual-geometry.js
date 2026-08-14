import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  assertTopologyEditTransientNodeDraft,
} from '../draft/topology-edit-transient-node-draft.js';
import { topologyEditSupportPlacementContext } from '../topology-edit-support-placement.js';

export function topologyEditTableVirtualGeometryFields(
  row,
  canonicalTopology,
  transientDrafts = {},
) {
  if (row?.identity?.canonicalKind === 'SUPPORT') {
    return supportFields(row, canonicalTopology);
  }
  if (row?.identity?.canonicalKind !== 'EDGE') return deepFreeze({});
  const fromBinding = endpointBinding(row, 'FROM');
  const toBinding = endpointBinding(row, 'TO');
  const from = nodeById(canonicalTopology, fromBinding?.nodeId);
  const to = nodeById(canonicalTopology, toBinding?.nodeId);
  const a = displayPoint(from, canonicalTopology, transientDrafts);
  const b = displayPoint(to, canonicalTopology, transientDrafts);
  const edge = recordById(canonicalTopology?.edges, row.identity.canonicalId);
  const outsideDiameterMm = finiteOrNull(edge?.outsideDiameterMm);
  const wallThicknessMm = finiteOrNull(edge?.wallThicknessMm);
  const insideDiameterMm = outsideDiameterMm !== null && wallThicknessMm !== null
    && outsideDiameterMm > (2 * wallThicknessMm)
    ? outsideDiameterMm - (2 * wallThicknessMm)
    : null;
  return deepFreeze({
    fromNodeId: fromBinding?.nodeId ?? null,
    fromPortKey: fromBinding?.portKey ?? null,
    fromX: a?.x ?? null,
    fromY: a?.y ?? null,
    fromZ: a?.z ?? null,
    toNodeId: toBinding?.nodeId ?? null,
    toPortKey: toBinding?.portKey ?? null,
    toX: b?.x ?? null,
    toY: b?.y ?? null,
    toZ: b?.z ?? null,
    deltaX: a && b ? b.x - a.x : null,
    deltaY: a && b ? b.y - a.y : null,
    deltaZ: a && b ? b.z - a.z : null,
    outsideDiameterMm,
    wallThicknessMm,
    insideDiameterMm,
    catalogueRecordId: row.custody?.catalogue?.recordId
      ?? edge?.catalogueRecordId
      ?? edge?.catalogueBinding?.recordId
      ?? null,
  });
}

export function isTopologyEditTableVirtualGeometryKey(key) {
  return VIRTUAL_KEYS.has(String(key ?? ''));
}

const VIRTUAL_KEYS = new Set([
  'fromNodeId', 'fromPortKey', 'fromX', 'fromY', 'fromZ',
  'toNodeId', 'toPortKey', 'toX', 'toY', 'toZ',
  'deltaX', 'deltaY', 'deltaZ',
  'outsideDiameterMm', 'wallThicknessMm', 'insideDiameterMm', 'catalogueRecordId',
  'hostEdgeId', 'supportX', 'supportY', 'supportZ',
]);

function supportFields(row, topology) {
  const support = recordById(topology?.supports, row.identity.canonicalId);
  if (!support) return deepFreeze({});
  try {
    const placement = topologyEditSupportPlacementContext(topology, support);
    return deepFreeze({
      hostEdgeId: placement.hostEdgeId ?? null,
      supportX: finiteOrNull(placement.currentOrigin?.x),
      supportY: finiteOrNull(placement.currentOrigin?.y),
      supportZ: finiteOrNull(placement.currentOrigin?.z),
    });
  } catch {
    return deepFreeze({
      hostEdgeId: null, supportX: null, supportY: null, supportZ: null,
    });
  }
}
function displayPoint(node, topology, drafts) {
  if (!finitePoint(node?.position)) return null;
  const candidate = drafts?.[node.id];
  if (!candidate) return node.position;
  try {
    const draft = assertTopologyEditTransientNodeDraft(candidate);
    return draft.nodeId === node.id
      && draft.basisHash === topology?.canonicalTopologyHash
      ? draft.targetPosition
      : node.position;
  } catch {
    return node.position;
  }
}
function endpointBinding(row, endpoint) {
  const matches = (row?.identity?.portBindings ?? []).filter((entry) => (
    entry?.endpoint === endpoint && entry?.nodeId
  ));
  return matches.length === 1 ? matches[0] : null;
}
function nodeById(topology, id) {
  return recordById(topology?.nodes, id);
}
function recordById(rows, id) {
  if (!id) return null;
  const matches = (rows ?? []).filter((record) => record?.id === id);
  return matches.length === 1 ? matches[0] : null;
}
function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function finitePoint(value) {
  return value && [value.x, value.y, value.z].every(Number.isFinite);
}
