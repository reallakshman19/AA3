import { deepFreeze } from '../../../core/shared-piping-model/index.js';
import {
  assertTopologyEditTransientNodeDraft,
} from '../draft/topology-edit-transient-node-draft.js';

export function topologyEditTableVirtualGeometryFields(
  row,
  canonicalTopology,
  transientDrafts = {},
) {
  if (row?.identity?.canonicalKind !== 'EDGE') return deepFreeze({});
  const fromBinding = endpointBinding(row, 'FROM');
  const toBinding = endpointBinding(row, 'TO');
  const from = nodeById(canonicalTopology, fromBinding?.nodeId);
  const to = nodeById(canonicalTopology, toBinding?.nodeId);
  const a = displayPoint(from, canonicalTopology, transientDrafts);
  const b = displayPoint(to, canonicalTopology, transientDrafts);
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
  });
}

export function isTopologyEditTableVirtualGeometryKey(key) {
  return VIRTUAL_KEYS.has(String(key ?? ''));
}

const VIRTUAL_KEYS = new Set([
  'fromNodeId', 'fromPortKey', 'fromX', 'fromY', 'fromZ',
  'toNodeId', 'toPortKey', 'toX', 'toY', 'toZ',
  'deltaX', 'deltaY', 'deltaZ',
]);

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
  if (!id) return null;
  const matches = (topology?.nodes ?? []).filter((node) => node?.id === id);
  return matches.length === 1 ? matches[0] : null;
}
function finitePoint(value) {
  return value && [value.x, value.y, value.z].every(Number.isFinite);
}
