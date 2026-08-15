import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';
import {
  canonicalLengthFactor,
  validatePipingPortTopologyGraph,
} from '../../../core/piping-topology/index.js';
import {
  normalizeCircularElbowGeometry,
} from '../../../core/empirical-piping-mechanics/index.js';

export const EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_SCHEMA =
  'empirical-canonical-elbow-geometry-authority/v1';

const POINT_TOLERANCE_M = 1e-9;
const TANGENT_COLLINEAR_TOLERANCE = 1e-10;
const ELBOW_TYPES = new Set(['ELBOW', 'BEND', 'ELBO']);

export function buildCanonicalElbowGeometryAuthority(input) {
  exactKeys(input, ['dataset', 'topologyGraph', 'componentKey'], 'canonical elbow geometry input');
  const dataset = requireDataset(input.dataset);
  const graph = requireExactTopology(input.topologyGraph, dataset);
  const componentKey = requiredText(input.componentKey, 'componentKey');
  const topologyComponent = uniqueBy(
    graph.components,
    (row) => row.componentKey,
    componentKey,
    'topology component',
  );
  if (!ELBOW_TYPES.has(stringValue(topologyComponent.type).toUpperCase())) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_COMPONENT_TYPE_UNSUPPORTED',
      `Component ${componentKey} is ${topologyComponent.type || 'UNKNOWN'}, not an elbow/bend.`,
    );
  }
  if (!Array.isArray(topologyComponent.portKeys) || topologyComponent.portKeys.length !== 2) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_PORT_COUNT_INVALID',
      `Elbow ${componentKey} must own exactly two topology ports.`,
    );
  }

  const entity = uniqueBy(
    dataset.entities,
    (row) => row.entityId,
    componentKey,
    'workspace entity',
  );
  const sourceGeometry = requireExplicitSourceGeometry(entity, componentKey);
  const factorToMm = canonicalLengthFactor(graph.profile.lengthUnit);
  if (!(factorToMm > 0)) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_LENGTH_UNIT_UNRESOLVED',
      `Topology source length unit ${graph.profile.lengthUnit || 'unknown'} cannot be normalized.`,
    );
  }
  const sourceToM = factorToMm / 1000;
  const sourceStartM = scalePoint(sourceGeometry.start, sourceToM);
  const sourceEndM = scalePoint(sourceGeometry.end, sourceToM);
  const sourceCenterM = scalePoint(sourceGeometry.center, sourceToM);
  const portByKey = new Map(graph.ports.map((row) => [row.portKey, row]));
  const ports = topologyComponent.portKeys.map((portKey) => requiredMap(
    portByKey,
    portKey,
    `topology port ${portKey}`,
  ));
  const portPointsM = ports.map((port) => canonicalPointToM(
    port.positionCanonical,
    `topology port ${port.portKey}.positionCanonical`,
  ));
  const binding = bindSourceEndpointsToPorts({
    sourceStartM,
    sourceEndM,
    ports,
    portPointsM,
  });

  const radialStart = subtractPoint(sourceStartM, sourceCenterM);
  const radialEnd = subtractPoint(sourceEndM, sourceCenterM);
  const crossRadials = cross(radialStart, radialEnd);
  if (!(magnitude(crossRadials) > 0)) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_PLANE_UNRESOLVED',
      `Elbow ${componentKey} source start/center/end do not define a unique bend plane.`,
    );
  }
  const planeNormal = normalize(crossRadials);
  const geometry = normalizeCircularElbowGeometry({
    componentId: componentKey,
    startPointM: sourceStartM,
    endPointM: sourceEndM,
    centerPointM: sourceCenterM,
    planeNormal,
  });
  const tangentContinuity = evaluateTangentContinuity({
    graph,
    topologyComponent,
    portByKey,
    binding,
    geometry,
  });

  const material = {
    schema: EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_SCHEMA,
    datasetId: dataset.datasetId,
    componentKey,
    sourceEntityId: entity.sourceEntityId ?? null,
    sourcePath: stringValue(entity.sourcePath),
    sourceSnapshot: {
      sourceSemanticHash: stringValue(dataset.sourceSnapshot?.sourceSemanticHash),
      sourceByteHash: dataset.sourceSnapshot?.sourceByteHash ?? null,
    },
    authorityBindings: {
      sharedModelSemanticHash: dataset.sharedModel.semanticHash,
      topologyGraphSemanticHash: graph.semanticHash,
    },
    sourceGeometry: {
      startSourcePath: sourceGeometry.sources.start,
      endSourcePath: sourceGeometry.sources.end,
      centerSourcePath: sourceGeometry.sources.center,
      centerWasExplicit: true,
      sourceLengthUnit: graph.profile.lengthUnit,
      canonicalLengthUnit: 'mm',
    },
    portBindings: binding.portBindings,
    geometry,
    tangentContinuity,
    policy: {
      sourceBackedEndpointsRequired: true,
      explicitSourceCenterRequired: true,
      derivedMidpointCenterPermitted: false,
      rendererGeometryConsumed: false,
      rendererLongRadiusFallbackPermitted: false,
      toleranceInferredTopologyConsumed: false,
      bendPlaneAuthority: 'DERIVED_ONLY_FROM_SOURCE_BACKED_START_CENTER_END_POINTS',
      sweepDomain: 'POSITIVE_MINOR_ARC_STRICTLY_BELOW_180_DEG',
      pointConsistencyToleranceM: POINT_TOLERANCE_M,
      tangentCollinearityTolerance: TANGENT_COLLINEAR_TOLERANCE,
    },
  };
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

export function requireCanonicalElbowGeometryAuthority(value) {
  requireRecord(value, 'canonical elbow geometry authority');
  if (value.schema !== EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_SCHEMA) {
    throw new TypeError(
      `Canonical elbow geometry authority schema must be ${EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_SCHEMA}.`,
    );
  }
  const { semanticHash: actual, ...material } = value;
  if (!stringValue(actual) || actual !== semanticHash(material)) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_GEOMETRY_AUTHORITY_HASH_MISMATCH',
      'Canonical elbow geometry authority semantic hash mismatch.',
    );
  }
  normalizeCircularElbowGeometry({
    componentId: value.geometry.componentId,
    startPointM: value.geometry.startPointM,
    endPointM: value.geometry.endPointM,
    centerPointM: value.geometry.centerPointM,
    planeNormal: value.geometry.planeNormal,
  });
  return deepFreeze(value);
}

function requireDataset(value) {
  if (!value || value.schema !== 'analysis-workspace-dataset/v1'
      || !stringValue(value.datasetId) || !Array.isArray(value.entities)
      || !value.sharedModel || !stringValue(value.sharedModel.semanticHash)) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_DATASET_INVALID',
      'Canonical elbow geometry requires an active analysis-workspace-dataset/v1 with shared-model custody.',
    );
  }
  return value;
}

function requireExactTopology(value, dataset) {
  const validation = validatePipingPortTopologyGraph(value);
  if (!validation.ok) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_TOPOLOGY_INVALID',
      `Invalid piping topology graph: ${validation.errors.join(' ')}`,
    );
  }
  if (value.datasetId !== dataset.datasetId
      || value.sharedModelSemanticHash !== dataset.sharedModel.semanticHash) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_TOPOLOGY_STALE',
      'Topology graph is not current for the supplied workspace dataset.',
    );
  }
  if (value.profile.allowToleranceInference !== false
      || value.connections.some((row) => row.evidenceType === 'TOLERANCE_INFERRED')) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_TOLERANCE_TOPOLOGY_REJECTED',
      'Canonical elbow mechanics requires exact topology; tolerance-inferred connections are prohibited.',
    );
  }
  if ((value.summary?.ambiguousPortCount || 0) > 0) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_AMBIGUOUS_TOPOLOGY_REJECTED',
      'Ambiguous topology ports are outside the elbow geometry authority domain.',
    );
  }
  return value;
}

function requireExplicitSourceGeometry(entity, componentKey) {
  if (!ELBOW_TYPES.has(stringValue(entity?.entityType).toUpperCase())) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_ENTITY_TYPE_MISMATCH',
      `Workspace entity ${componentKey} is not an elbow/bend.`,
    );
  }
  const geometry = entity?.properties?.geometry;
  if (!geometry || !geometry.start || !geometry.end || !geometry.center) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_SOURCE_GEOMETRY_MISSING',
      `Elbow ${componentKey} requires source-backed start, end and center points.`,
    );
  }
  if (geometry.explicitCenter !== true
      || !stringValue(geometry.sources?.center)
      || geometry.sources.center === 'derived.midpoint') {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_EXPLICIT_CENTER_REQUIRED',
      `Elbow ${componentKey} requires an explicit source center; a derived midpoint is not mechanics authority.`,
    );
  }
  if (!stringValue(geometry.sources?.start) || !stringValue(geometry.sources?.end)) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_ENDPOINT_PROVENANCE_MISSING',
      `Elbow ${componentKey} source endpoints require retained source paths.`,
    );
  }
  requirePoint(geometry.start, `${componentKey}.geometry.start`);
  requirePoint(geometry.end, `${componentKey}.geometry.end`);
  requirePoint(geometry.center, `${componentKey}.geometry.center`);
  return geometry;
}

function bindSourceEndpointsToPorts({ sourceStartM, sourceEndM, ports, portPointsM }) {
  const direct = distance(sourceStartM, portPointsM[0]) <= POINT_TOLERANCE_M
    && distance(sourceEndM, portPointsM[1]) <= POINT_TOLERANCE_M;
  const reverse = distance(sourceStartM, portPointsM[1]) <= POINT_TOLERANCE_M
    && distance(sourceEndM, portPointsM[0]) <= POINT_TOLERANCE_M;
  if (direct === reverse) {
    throw coded(
      'EMPIRICAL_CANONICAL_ELBOW_PORT_ENDPOINT_BINDING_FAILED',
      'Source elbow endpoints must bind uniquely to the two exact topology ports.',
    );
  }
  const startIndex = direct ? 0 : 1;
  const endIndex = direct ? 1 : 0;
  return deepFreeze({
    portBindings: [
      {
        sourceEndpoint: 'START',
        portKey: ports[startIndex].portKey,
        residualM: distance(sourceStartM, portPointsM[startIndex]),
      },
      {
        sourceEndpoint: 'END',
        portKey: ports[endIndex].portKey,
        residualM: distance(sourceEndM, portPointsM[endIndex]),
      },
    ],
    startPortKey: ports[startIndex].portKey,
    endPortKey: ports[endIndex].portKey,
  });
}

function evaluateTangentContinuity({ graph, topologyComponent, portByKey, binding, geometry }) {
  const componentByKey = new Map(graph.components.map((row) => [row.componentKey, row]));
  const rows = [
    { endpoint: 'START', portKey: binding.startPortKey, tangent: geometry.tangentStart },
    { endpoint: 'END', portKey: binding.endPortKey, tangent: geometry.tangentEnd },
  ].map((row) => {
    const port = requiredMap(portByKey, row.portKey, `elbow ${row.endpoint} port`);
    if (!Array.isArray(port.peerPortKeys) || port.peerPortKeys.length === 0) {
      return deepFreeze({ ...row, status: 'NOT_EVALUATED_UNCONNECTED', neighborComponentKey: null });
    }
    if (port.peerPortKeys.length !== 1) {
      throw coded(
        'EMPIRICAL_CANONICAL_ELBOW_MULTI_PEER_PORT_UNSUPPORTED',
        `Elbow port ${row.portKey} has multiple peers.`,
      );
    }
    const peer = requiredMap(portByKey, port.peerPortKeys[0], 'elbow peer port');
    const neighbor = requiredMap(componentByKey, peer.componentKey, 'elbow neighbor component');
    if (stringValue(neighbor.type).toUpperCase() !== 'PIPE' || neighbor.portKeys.length !== 2) {
      return deepFreeze({
        ...row,
        status: 'NOT_EVALUATED_NON_STRAIGHT_NEIGHBOR',
        neighborComponentKey: neighbor.componentKey,
      });
    }
    const otherPortKey = neighbor.portKeys.find((key) => key !== peer.portKey);
    const other = requiredMap(portByKey, otherPortKey, 'neighbor straight-pipe other port');
    const peerPointM = canonicalPointToM(peer.positionCanonical, `${peer.portKey}.positionCanonical`);
    const otherPointM = canonicalPointToM(other.positionCanonical, `${other.portKey}.positionCanonical`);
    const outward = normalize(subtractPoint(otherPointM, peerPointM));
    const absoluteDot = Math.abs(dot(row.tangent, outward));
    const residual = 1 - absoluteDot;
    if (residual > TANGENT_COLLINEAR_TOLERANCE) {
      throw coded(
        'EMPIRICAL_CANONICAL_ELBOW_TANGENT_DISCONTINUITY',
        `Elbow ${topologyComponent.componentKey} ${row.endpoint} tangent is not collinear with straight neighbor ${neighbor.componentKey}; residual ${residual}.`,
      );
    }
    return deepFreeze({
      ...row,
      status: 'PASS_STRAIGHT_NEIGHBOR_COLLINEAR',
      neighborComponentKey: neighbor.componentKey,
      neighborPortKey: peer.portKey,
      tangentDotNeighborOutward: dot(row.tangent, outward),
      collinearityResidual: residual,
    });
  });
  return deepFreeze({
    rows,
    evaluatedStraightNeighborCount: rows.filter((row) => row.status === 'PASS_STRAIGHT_NEIGHBOR_COLLINEAR').length,
    tolerance: TANGENT_COLLINEAR_TOLERANCE,
  });
}

function canonicalPointToM(value, label) {
  requirePoint(value, label);
  return { x: value.x / 1000, y: value.y / 1000, z: value.z / 1000 };
}
function scalePoint(value, factor) { return { x: value.x * factor, y: value.y * factor, z: value.z * factor }; }
function requirePoint(value, label) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) {
    throw new TypeError(`${label} must be a finite point.`);
  }
  return value;
}
function uniqueBy(values, keyOf, key, label) {
  const rows = (values || []).filter((row) => keyOf(row) === key);
  if (rows.length !== 1) throw coded('EMPIRICAL_CANONICAL_ELBOW_IDENTITY_UNRESOLVED', `${label} ${key} resolved ${rows.length} times.`);
  return rows[0];
}
function requiredMap(map, key, label) {
  if (!map.has(key)) throw coded('EMPIRICAL_CANONICAL_ELBOW_REFERENCE_MISSING', `${label} ${key || '<missing>'} is unresolved.`);
  return map.get(key);
}
function exactKeys(value, keys, label) {
  requireRecord(value, label);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} contains unexpected or missing keys.`);
  }
}
function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}
function subtractPoint(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function magnitude(v) { return Math.hypot(...v); }
function normalize(v) { const m = magnitude(v); if (!(m > 0)) throw new RangeError('Cannot normalize zero vector.'); return v.map((x) => x / m); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
