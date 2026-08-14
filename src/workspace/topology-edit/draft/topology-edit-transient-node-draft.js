import { deepFreeze, semanticHash } from '../../../core/shared-piping-model/index.js';

export const TOPOLOGY_EDIT_TRANSIENT_NODE_DRAFT_SCHEMA = 'TopologyEditTransientNodeDraft.v1';

export function createTopologyEditTransientNodeDraft(input = {}) {
  const material = {
    schema: TOPOLOGY_EDIT_TRANSIENT_NODE_DRAFT_SCHEMA,
    basisHash: requiredText(input.basisHash, 'basisHash'),
    nodeId: requiredNodeId(input.nodeId),
    targetPosition: finitePoint(input.targetPosition, 'targetPosition'),
    previewHash: nullableText(input.previewHash),
    source: requiredSource(input.source ?? 'INTERACTION'),
  };
  return deepFreeze({ ...material, draftHash: semanticHash(material) });
}

export function assertTopologyEditTransientNodeDraft(value) {
  if (value?.schema !== TOPOLOGY_EDIT_TRANSIENT_NODE_DRAFT_SCHEMA) {
    throw new TypeError(`Transient node draft must use ${TOPOLOGY_EDIT_TRANSIENT_NODE_DRAFT_SCHEMA}.`);
  }
  const material = { ...value };
  delete material.draftHash;
  if (semanticHash(material) !== value.draftHash) {
    throw new Error('TopologyEditTransientNodeDraft: draft hash mismatch.');
  }
  return value;
}

export function topologyEditTransientNodeDraftMap(drafts = []) {
  const result = {};
  for (const draftInput of drafts) {
    const draft = assertTopologyEditTransientNodeDraft(draftInput);
    result[draft.nodeId] = draft;
  }
  return deepFreeze(result);
}

function requiredNodeId(value) {
  const text = requiredText(value, 'nodeId');
  if (!text.startsWith('node:')) {
    throw new RangeError('TopologyEditTransientNodeDraft: nodeId must use exact node identity.');
  }
  return text;
}
function requiredSource(value) {
  const source = requiredText(value, 'source').toUpperCase();
  if (!['INTERACTION', 'TABLE'].includes(source)) {
    throw new RangeError(`TopologyEditTransientNodeDraft: unsupported source ${source}.`);
  }
  return source;
}
function finitePoint(value, label) {
  const point = value && typeof value === 'object' && !Array.isArray(value)
    ? { x: Number(value.x), y: Number(value.y), z: Number(value.z) }
    : null;
  if (!point || !Object.values(point).every(Number.isFinite)) {
    throw new RangeError(`TopologyEditTransientNodeDraft: ${label} must contain finite x, y and z.`);
  }
  return point;
}
function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`TopologyEditTransientNodeDraft: ${label} is required.`);
  return text;
}
function nullableText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}
