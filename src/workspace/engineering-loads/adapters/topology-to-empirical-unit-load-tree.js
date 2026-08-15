import {
  validatePipingPortTopologyGraph,
} from '../../../core/piping-topology/index.js';
import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';
import {
  buildRootedTreeUnitForceActions,
} from '../../../core/empirical-piping-mechanics/index.js';

export const EMPIRICAL_EXACT_TOPOLOGY_UNIT_LOAD_SCHEMA =
  'empirical-exact-topology-straight-pipe-unit-load-actions/v1';

const POSITION_CONSISTENCY_M = 1e-9;

export function buildExactTopologyStraightPipeUnitLoadActions(input) {
  exactKeys(input, ['topologyGraph', 'rootPortKey', 'cases'], 'exact-topology unit-load input');
  const graph = input.topologyGraph;
  const validation = validatePipingPortTopologyGraph(graph);
  if (!validation.ok) {
    throw new TypeError(`Invalid piping topology graph: ${validation.errors.join(' ')}`);
  }
  if (graph.profile.allowToleranceInference !== false) {
    throw new TypeError('Exact-topology unit-load adapter rejects tolerance inference.');
  }
  if (graph.connections.some((row) => row.evidenceType === 'TOLERANCE_INFERRED')) {
    throw new TypeError('Tolerance-inferred topology connection is outside the exact unit-load route domain.');
  }
  if (graph.summary.ambiguousPortCount > 0) {
    throw new TypeError('Ambiguous topology ports are outside the exact unit-load route domain.');
  }
  const components = requireStraightPipeComponents(graph.components);
  const portById = requirePorts(graph.ports);
  const allPortIds = components.flatMap((component) => component.portKeys);
  const dsu = createDisjointSet(allPortIds);
  graph.connections.forEach((connection) => {
    if (dsu.parent.has(connection.portAKey) && dsu.parent.has(connection.portBKey)) {
      union(dsu, connection.portAKey, connection.portBKey);
    }
  });
  const groups = new Map();
  allPortIds.forEach((portId) => {
    const root = find(dsu, portId);
    const rows = groups.get(root) || [];
    rows.push(portId);
    groups.set(root, rows);
  });
  const nodeByPortId = {};
  const nodes = [...groups.values()].map((portIds) => {
    const sorted = [...portIds].sort();
    const pointsM = sorted.map((portId) => canonicalMmPointToM(portById.get(portId), portId));
    pointsM.slice(1).forEach((point) => {
      if (distance(pointsM[0], point) > POSITION_CONSISTENCY_M) {
        throw new TypeError(`Connected topology joint ${sorted[0]} has conflicting positions.`);
      }
    });
    const nodeId = `NODE:${sorted[0]}`;
    sorted.forEach((portId) => { nodeByPortId[portId] = nodeId; });
    return deepFreeze({ id: nodeId, pointM: pointsM[0] });
  }).sort(byId);
  const segments = components.map((component) => {
    const nodeAId = nodeByPortId[component.portKeys[0]];
    const nodeBId = nodeByPortId[component.portKeys[1]];
    if (nodeAId === nodeBId) {
      throw new TypeError(`Component ${component.componentKey} closes onto one mechanical joint.`);
    }
    return deepFreeze({
      segmentId: component.componentKey,
      nodeAId,
      nodeBId,
    });
  });
  const rootPortKey = requiredString(input.rootPortKey, 'rootPortKey');
  if (!portById.has(rootPortKey) || !nodeByPortId[rootPortKey]) {
    throw new TypeError(`rootPortKey ${rootPortKey} is not part of the straight-pipe route.`);
  }
  const mechanics = buildRootedTreeUnitForceActions({
    nodes,
    segments,
    rootNodeId: nodeByPortId[rootPortKey],
    cases: requireCases(input.cases, portById, nodeByPortId),
  });
  const base = {
    schema: EMPIRICAL_EXACT_TOPOLOGY_UNIT_LOAD_SCHEMA,
    datasetId: requiredString(graph.datasetId, 'topologyGraph.datasetId'),
    topologySemanticHash: requiredString(graph.semanticHash, 'topologyGraph.semanticHash'),
    sharedModelSemanticHash: requiredString(
      graph.sharedModelSemanticHash,
      'topologyGraph.sharedModelSemanticHash',
    ),
    rootPortKey,
    rootNodeId: mechanics.rootNodeId,
    mechanics,
    evidence: {
      sourceAuthority: 'VALIDATED_PIPING_PORT_TOPOLOGY_GRAPH',
      topologyProfileId: requiredString(graph.profile.profileId, 'topologyGraph.profile.profileId'),
      toleranceInferenceConsumed: false,
      componentDomain: 'TWO_PORT_STRAIGHT_PIPE_ONLY',
      canonicalLengthConversion: 'mm_to_m_divide_by_1000',
      jointPositionConsistencyToleranceM: POSITION_CONSISTENCY_M,
      callerInternalActionsConsumed: false,
    },
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function requireStraightPipeComponents(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('topologyGraph.components must be non-empty.');
  }
  return value.map((component, index) => {
    requireRecord(component, `topologyGraph.components[${index}]`);
    const componentKey = requiredString(
      component.componentKey,
      `topologyGraph.components[${index}].componentKey`,
    );
    if (stringValue(component.type).toUpperCase() !== 'PIPE') {
      throw new TypeError(`Component ${componentKey} is not a straight PIPE.`);
    }
    if (!Array.isArray(component.portKeys) || component.portKeys.length !== 2) {
      throw new TypeError(`Component ${componentKey} must have exactly two ports.`);
    }
    const portKeys = component.portKeys.map((portKey, portIndex) => requiredString(
      portKey,
      `${componentKey}.portKeys[${portIndex}]`,
    ));
    if (portKeys[0] === portKeys[1]) {
      throw new TypeError(`Component ${componentKey} has duplicate port identity.`);
    }
    return deepFreeze({ componentKey, portKeys });
  }).sort((left, right) => left.componentKey.localeCompare(right.componentKey));
}

function requirePorts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('topologyGraph.ports must be non-empty.');
  }
  const map = new Map();
  value.forEach((port, index) => {
    requireRecord(port, `topologyGraph.ports[${index}]`);
    const portKey = requiredString(port.portKey, `topologyGraph.ports[${index}].portKey`);
    if (map.has(portKey)) throw new TypeError(`Duplicate topology port ${portKey}.`);
    map.set(portKey, port);
  });
  return map;
}

function requireCases(value, portById, nodeByPortId) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('cases must be a non-empty array.');
  }
  return value.map((loadCase, index) => {
    exactKeys(loadCase, ['caseId', 'portKey', 'direction'], `cases[${index}]`);
    const portKey = requiredString(loadCase.portKey, `cases[${index}].portKey`);
    if (!portById.has(portKey) || !nodeByPortId[portKey]) {
      throw new TypeError(`Case port ${portKey} is not part of the straight-pipe route.`);
    }
    return deepFreeze({
      caseId: requiredString(loadCase.caseId, `cases[${index}].caseId`),
      nodeId: nodeByPortId[portKey],
      direction: loadCase.direction,
    });
  });
}

function canonicalMmPointToM(port, portId) {
  const point = port?.positionCanonical;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
    throw new TypeError(`Topology port ${portId} has no canonical millimeter position.`);
  }
  return deepFreeze({
    x: point.x / 1000,
    y: point.y / 1000,
    z: point.z / 1000,
  });
}

function createDisjointSet(ids) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw new TypeError('Component port ownership must be unique.');
  }
  return {
    parent: new Map(unique.map((id) => [id, id])),
    rank: new Map(unique.map((id) => [id, 0])),
  };
}

function find(dsu, value) {
  const parent = dsu.parent.get(value);
  if (parent === value) return value;
  const root = find(dsu, parent);
  dsu.parent.set(value, root);
  return root;
}

function union(dsu, left, right) {
  let a = find(dsu, left);
  let b = find(dsu, right);
  if (a === b) return;
  const aRank = dsu.rank.get(a);
  const bRank = dsu.rank.get(b);
  if (aRank < bRank) [a, b] = [b, a];
  dsu.parent.set(b, a);
  if (aRank === bRank) dsu.rank.set(a, aRank + 1);
}

function exactKeys(value, keys, label) {
  requireRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}

function requiredString(value, field) {
  const normalized = stringValue(value);
  if (!normalized) throw new TypeError(`${field} must be a non-empty string.`);
  return normalized;
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function byId(left, right) {
  return left.id.localeCompare(right.id);
}
