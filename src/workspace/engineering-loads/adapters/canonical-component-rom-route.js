import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';
import {
  validatePipingPortTopologyGraph,
} from '../../../core/piping-topology/index.js';
import {
  requireCanonicalElbowGeometryAuthority,
} from './canonical-elbow-geometry-authority.js';

export const EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA =
  'empirical-canonical-component-rom-route/v1';

const JOINT_POINT_TOLERANCE_M = 1e-12;
const ELBOW_TYPES = new Set(['ELBOW', 'BEND', 'ELBO']);

export function buildCanonicalComponentRomRoute(input) {
  exactKeys(
    input,
    ['topologyGraph', 'connectedComponentId', 'elbowGeometryAuthorities'],
    'canonical component ROM route input',
  );
  const graph = requireExactTopology(input.topologyGraph);
  const connectedComponentId = requiredText(
    input.connectedComponentId,
    'connectedComponentId',
  );
  const region = graph.connectedComponents.find(
    (row) => row.connectedComponentId === connectedComponentId,
  );
  if (!region) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_REGION_MISSING',
      `Connected topology region ${connectedComponentId} is absent.`,
    );
  }
  if (region.cyclic === true) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_LOOP_UNSUPPORTED',
      'Current mixed-component ROM route must be acyclic.',
    );
  }

  const componentByKey = new Map(graph.components.map((row) => [row.componentKey, row]));
  const components = region.componentKeys.map((componentKey) => requiredMap(
    componentByKey,
    componentKey,
    'topology component',
  ));
  components.forEach(requireSupportedTwoPortComponent);

  const elbowComponents = components
    .filter((row) => ELBOW_TYPES.has(stringValue(row.type).toUpperCase()))
    .sort(byField('componentKey'));
  const elbowAuthorityByComponent = requireElbowAuthorityCoverage(
    input.elbowGeometryAuthorities,
    elbowComponents,
    graph,
  );

  const portByKey = new Map(graph.ports.map((row) => [row.portKey, row]));
  const regionPortKeys = components.flatMap((row) => row.portKeys);
  const dsu = createDisjointSet(regionPortKeys);
  graph.connections.forEach((connection) => {
    if (dsu.parent.has(connection.portAKey) && dsu.parent.has(connection.portBKey)) {
      union(dsu, connection.portAKey, connection.portBKey);
    }
  });

  const groups = new Map();
  regionPortKeys.forEach((portKey) => {
    const root = find(dsu, portKey);
    const values = groups.get(root) || [];
    values.push(portKey);
    groups.set(root, values);
  });
  const nodeByPortKey = new Map();
  const nodes = [...groups.values()].map((portKeys) => {
    const sortedPortKeys = [...portKeys].sort();
    const points = sortedPortKeys.map((portKey) => canonicalPointToM(
      requiredMap(portByKey, portKey, 'route port').positionCanonical,
      `${portKey}.positionCanonical`,
    ));
    const pointM = points[0];
    points.slice(1).forEach((point, index) => {
      const residual = distance(pointM, point);
      if (residual > JOINT_POINT_TOLERANCE_M) {
        throw coded(
          'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_CONNECTED_PORT_POSITION_MISMATCH',
          `Connected ports ${sortedPortKeys[0]} and ${sortedPortKeys[index + 1]} differ by ${residual} m.`,
        );
      }
    });
    const nodeId = `NODE:${semanticHash({ portKeys: sortedPortKeys }).slice('fnv1a64:'.length)}`;
    sortedPortKeys.forEach((portKey) => nodeByPortKey.set(portKey, nodeId));
    return deepFreeze({
      id: nodeId,
      pointM,
      sourcePortKeys: sortedPortKeys,
    });
  }).sort(byField('id'));

  const routeComponents = components.map((component) => {
    const [portAKey, portBKey] = component.portKeys;
    const nodeAId = requiredMap(nodeByPortKey, portAKey, 'component node A');
    const nodeBId = requiredMap(nodeByPortKey, portBKey, 'component node B');
    if (nodeAId === nodeBId) {
      throw coded(
        'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ZERO_TOPOLOGY_SPAN',
        `Component ${component.componentKey} collapses to one route node.`,
      );
    }
    if (stringValue(component.type).toUpperCase() === 'PIPE') {
      const pointA = canonicalPointToM(
        requiredMap(portByKey, portAKey, 'straight port A').positionCanonical,
        `${portAKey}.positionCanonical`,
      );
      const pointB = canonicalPointToM(
        requiredMap(portByKey, portBKey, 'straight port B').positionCanonical,
        `${portBKey}.positionCanonical`,
      );
      if (!(distance(pointA, pointB) > JOINT_POINT_TOLERANCE_M)) {
        throw coded(
          'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_STRAIGHT_LENGTH_INVALID',
          `Straight PIPE ${component.componentKey} has zero mechanics length.`,
        );
      }
      return deepFreeze({
        componentId: component.componentKey,
        sourceType: component.type,
        kind: 'STRAIGHT',
        nodeAId,
        nodeBId,
        sourcePortKeys: [...component.portKeys],
        geometry: null,
        geometryAuthoritySemanticHash: null,
      });
    }

    const authority = requiredMap(
      elbowAuthorityByComponent,
      component.componentKey,
      'elbow geometry authority',
    );
    requireCurrentElbowNeighborContinuity(authority, component, portByKey);
    return deepFreeze({
      componentId: component.componentKey,
      sourceType: component.type,
      kind: 'CIRCULAR_ELBOW',
      nodeAId,
      nodeBId,
      sourcePortKeys: [...component.portKeys],
      geometry: authority.geometry,
      geometryAuthoritySemanticHash: authority.semanticHash,
    });
  }).sort(byField('componentId'));

  if (routeComponents.length !== nodes.length - 1) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_NOT_TREE',
      `Current ROM route requires componentCount=nodeCount-1; got ${routeComponents.length} components and ${nodes.length} nodes.`,
    );
  }

  const material = {
    schema: EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA,
    datasetId: graph.datasetId,
    connectedComponentId,
    topologyGraphSemanticHash: graph.semanticHash,
    sharedModelSemanticHash: graph.sharedModelSemanticHash,
    nodes,
    components: routeComponents,
    evidence: {
      topologyAuthority: 'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH',
      topologyClass: 'CONNECTED_ACYCLIC_TWO_PORT_COMPONENT_TREE',
      supportedComponentKinds: ['STRAIGHT', 'CIRCULAR_ELBOW'],
      elbowGeometryAuthority: 'SOURCE_BACKED_CANONICAL_ELBOW_GEOMETRY_AUTHORITY',
      rendererGeometryConsumed: false,
      toleranceInferredTopologyConsumed: false,
      finiteElementDiscretizationCreated: false,
      connectedPortCoincidenceToleranceM: JOINT_POINT_TOLERANCE_M,
      sourceComponentCount: routeComponents.length,
      routeNodeCount: nodes.length,
      elbowCount: elbowComponents.length,
    },
  };
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

export function requireCanonicalComponentRomRoute(value) {
  requireRecord(value, 'canonical component ROM route');
  if (value.schema !== EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA) {
    throw new TypeError(
      `Canonical component ROM route schema must be ${EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA}.`,
    );
  }
  const { semanticHash: actual, ...material } = value;
  if (!stringValue(actual) || actual !== semanticHash(material)) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_HASH_MISMATCH',
      'Canonical component ROM route semantic hash mismatch.',
    );
  }
  if (!Array.isArray(value.nodes) || !Array.isArray(value.components)
      || value.components.length !== value.nodes.length - 1) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_INVALID',
      'Canonical component ROM route is not a connected tree-sized contract.',
    );
  }
  value.components.filter((row) => row.kind === 'CIRCULAR_ELBOW').forEach((row) => {
    if (!stringValue(row.geometryAuthoritySemanticHash) || !row.geometry?.semanticHash) {
      throw coded(
        'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_AUTHORITY_MISSING',
        `Elbow ${row.componentId} lacks sealed geometry authority.`,
      );
    }
  });
  return deepFreeze(value);
}

function requireExactTopology(value) {
  const validation = validatePipingPortTopologyGraph(value);
  if (!validation.ok) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_TOPOLOGY_INVALID',
      `Invalid piping topology graph: ${validation.errors.join(' ')}`,
    );
  }
  if (value.profile.allowToleranceInference !== false
      || value.connections.some((row) => row.evidenceType === 'TOLERANCE_INFERRED')
      || (value.summary?.ambiguousPortCount || 0) > 0) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_EXACT_TOPOLOGY_REQUIRED',
      'Mixed-component ROM route requires non-ambiguous exact topology.',
    );
  }
  return value;
}

function requireSupportedTwoPortComponent(component) {
  const type = stringValue(component.type).toUpperCase();
  if (type !== 'PIPE' && !ELBOW_TYPES.has(type)) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_COMPONENT_UNSUPPORTED',
      `Component ${component.componentKey} type ${type || 'UNKNOWN'} is outside the current mixed route.`,
    );
  }
  if (!Array.isArray(component.portKeys) || component.portKeys.length !== 2) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_PORT_COUNT_INVALID',
      `Component ${component.componentKey} must own exactly two ports.`,
    );
  }
}

function requireElbowAuthorityCoverage(values, elbowComponents, graph) {
  if (!Array.isArray(values)) {
    throw new TypeError('elbowGeometryAuthorities must be an array.');
  }
  const byComponent = new Map();
  values.forEach((value) => {
    const authority = requireCanonicalElbowGeometryAuthority(value);
    if (authority.datasetId !== graph.datasetId
        || authority.authorityBindings.topologyGraphSemanticHash !== graph.semanticHash
        || authority.authorityBindings.sharedModelSemanticHash !== graph.sharedModelSemanticHash) {
      throw coded(
        'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_AUTHORITY_STALE',
        `Elbow geometry authority ${authority.componentKey} is stale for the selected topology.`,
      );
    }
    if (byComponent.has(authority.componentKey)) {
      throw coded(
        'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_AUTHORITY_DUPLICATE',
        `Elbow ${authority.componentKey} has duplicate geometry authorities.`,
      );
    }
    byComponent.set(authority.componentKey, authority);
  });
  const expected = elbowComponents.map((row) => row.componentKey).sort();
  const actual = [...byComponent.keys()].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_AUTHORITY_COVERAGE_MISMATCH',
      'Elbow geometry authorities must cover exactly every elbow in the selected region.',
    );
  }
  return byComponent;
}

function requireCurrentElbowNeighborContinuity(authority, component, portByKey) {
  const rowByPort = new Map(authority.tangentContinuity.rows.map((row) => [row.portKey, row]));
  component.portKeys.forEach((portKey) => {
    const port = requiredMap(portByKey, portKey, 'elbow route port');
    if (!Array.isArray(port.peerPortKeys) || port.peerPortKeys.length === 0) return;
    const row = requiredMap(rowByPort, portKey, 'elbow tangent-continuity row');
    if (row.status !== 'PASS_STRAIGHT_NEIGHBOR_COLLINEAR') {
      throw coded(
        'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_ELBOW_NEIGHBOR_DOMAIN_UNSUPPORTED',
        `Connected elbow port ${portKey} is not qualified against a straight PIPE neighbor.`,
      );
    }
  });
}

function canonicalPointToM(value, label) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) {
    throw new TypeError(`${label} must be a finite canonical millimetre point.`);
  }
  return deepFreeze({ x: value.x / 1000, y: value.y / 1000, z: value.z / 1000 });
}
function createDisjointSet(ids) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_PORT_OWNERSHIP_DUPLICATE',
      'Selected component port ownership must be unique.',
    );
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
  const ar = dsu.rank.get(a);
  const br = dsu.rank.get(b);
  if (ar < br) [a, b] = [b, a];
  dsu.parent.set(b, a);
  if (ar === br) dsu.rank.set(a, ar + 1);
}
function requiredMap(map, key, label) {
  if (!map.has(key)) {
    throw coded(
      'EMPIRICAL_CANONICAL_COMPONENT_ROUTE_REFERENCE_MISSING',
      `${label} ${key || '<missing>'} is unresolved.`,
    );
  }
  return map.get(key);
}
function exactKeys(value, keys, label) {
  requireRecord(value, label);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function byField(field) { return (left, right) => String(left[field]).localeCompare(String(right[field])); }
function coded(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
