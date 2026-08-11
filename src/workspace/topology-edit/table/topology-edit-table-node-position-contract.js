import { deepFreeze, stringValue } from '../../../core/shared-piping-model/index.js';

const NODE_ENDPOINTS = new Set(['FROM', 'TO']);
const NODE_MOVEMENT_MODES = new Set(['NODE_ONLY', 'CONNECTED_RUN']);

export function normalizeTopologyEditTableNodePositionPayload(requestedValue, geometryPolicy, row) {
  if (row?.identity?.canonicalKind !== 'EDGE') {
    throw new RangeError('TopologyEditTableIntent: NODE_POSITION requires an exact canonical EDGE row.');
  }
  const endpoint = requiredEnum(requestedValue?.endpoint, NODE_ENDPOINTS, 'requestedValue.endpoint');
  const nodeId = requiredText(requestedValue?.nodeId, 'requestedValue.nodeId');
  const bindings = (row.identity?.portBindings ?? []).filter((entry) => (
    entry?.endpoint === endpoint && entry?.nodeId === nodeId
  ));
  if (bindings.length !== 1) {
    throw new RangeError(
      `TopologyEditTableIntent: ${endpoint} node ${nodeId} is not the exact EDGE endpoint binding.`,
    );
  }
  return {
    requestedValue: {
      endpoint,
      nodeId,
      expectedPosition: finitePoint(requestedValue?.expectedPosition, 'requestedValue.expectedPosition'),
      position: finitePoint(requestedValue?.position, 'requestedValue.position'),
    },
    geometryPolicy: {
      movementMode: requiredEnum(
        geometryPolicy?.movementMode,
        NODE_MOVEMENT_MODES,
        'geometryPolicy.movementMode',
      ),
    },
  };
}

export function topologyEditTableNodePositionPriorValue(payload) {
  return deepFreeze({
    endpoint: payload.requestedValue.endpoint,
    nodeId: payload.requestedValue.nodeId,
    position: payload.requestedValue.expectedPosition,
  });
}

function requiredEnum(value, allowed, label) {
  const text = requiredText(value, label).toUpperCase();
  if (!allowed.has(text)) {
    throw new RangeError(`TopologyEditTableIntent: ${label} has unsupported value ${text}.`);
  }
  return text;
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditTableIntent: ${label} is required.`);
  return text;
}
function finitePoint(value, label) {
  const point = value && typeof value === 'object' && !Array.isArray(value)
    ? { x: Number(value.x), y: Number(value.y), z: Number(value.z) }
    : null;
  if (!point || !Object.values(point).every(Number.isFinite)) {
    throw new RangeError(`TopologyEditTableIntent: ${label} must contain finite x, y and z coordinates.`);
  }
  return point;
}
