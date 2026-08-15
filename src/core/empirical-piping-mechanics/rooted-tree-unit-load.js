import {
  EMPIRICAL_FORMULA_IDS,
  deepFreeze,
  requireFiniteNumber,
  requireNonEmptyString,
} from './contracts.js';

const UNIT_VECTOR_TOLERANCE = 1e-12;
const ZERO_TOLERANCE = 1e-14;
const BASIS_CANDIDATES = Object.freeze([
  Object.freeze({ label: 'GLOBAL_Z', vector: Object.freeze([0, 0, 1]) }),
  Object.freeze({ label: 'GLOBAL_Y', vector: Object.freeze([0, 1, 0]) }),
  Object.freeze({ label: 'GLOBAL_X', vector: Object.freeze([1, 0, 0]) }),
]);
const ACTION_FORMULA_TRACE = Object.freeze([
  EMPIRICAL_FORMULA_IDS.rootedTreePathSelection,
  EMPIRICAL_FORMULA_IDS.unitForceCutEquilibrium,
  EMPIRICAL_FORMULA_IDS.unitForceMomentTransport,
  EMPIRICAL_FORMULA_IDS.unitForceLocalProjection,
]);

export function buildDeterministicMemberAxes(pointI, pointJ) {
  const i = requirePoint(pointI, 'pointI');
  const j = requirePoint(pointJ, 'pointJ');
  const chord = subtract(j, i);
  const lengthM = magnitude(chord);
  if (!(lengthM > ZERO_TOLERANCE)) throw new RangeError('Member endpoints must define positive length.');
  const x = scale(chord, 1 / lengthM);
  const reference = [...BASIS_CANDIDATES].sort((left, right) => {
    const delta = Math.abs(dot(left.vector, x)) - Math.abs(dot(right.vector, x));
    return Math.abs(delta) > ZERO_TOLERANCE ? delta : basisOrder(left.label) - basisOrder(right.label);
  })[0];
  const yCandidate = cross(reference.vector, x);
  const yMagnitude = magnitude(yCandidate);
  if (!(yMagnitude > ZERO_TOLERANCE)) throw new RangeError('Unable to construct member transverse basis.');
  const y = scale(yCandidate, 1 / yMagnitude);
  const z = normalize(cross(x, y), 'member local z');
  return deepFreeze({
    lengthM,
    x,
    y,
    z,
    referenceBasis: reference.label,
    handedness: 'RIGHT_HANDED_X_CROSS_Y_EQUALS_Z',
    transverseOrientationAuthority: 'DETERMINISTIC_ONLY_AXISYMMETRIC_SECTION_REQUIRED_FOR_MECHANICAL_USE',
  });
}

export function buildRootedTreeUnitForceActions(input) {
  requireRecord(input, 'rooted-tree unit-load input');
  const nodes = requireNodes(input.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const segments = requireSegments(input.segments, nodeById);
  const rootNodeId = requireNonEmptyString(input.rootNodeId, 'rootNodeId');
  if (!nodeById.has(rootNodeId)) throw new TypeError(`rootNodeId ${rootNodeId} does not exist.`);
  const cases = requireCases(input.cases, nodeById, rootNodeId);
  const oriented = orientConnectedTree(nodes, segments, rootNodeId);
  const pathByCaseId = Object.fromEntries(cases.map((loadCase) => [
    loadCase.caseId,
    pathSegmentIds(loadCase.nodeId, rootNodeId, oriented.parentByNodeId),
  ]));
  const outputSegments = oriented.segments.map((segment) => {
    const axes = buildDeterministicMemberAxes(segment.pointI, segment.pointJ);
    const actionByCaseId = Object.fromEntries(cases.map((loadCase) => [
      loadCase.caseId,
      pathByCaseId[loadCase.caseId].has(segment.segmentId)
        ? actionAtSegment(segment, axes, nodeById.get(loadCase.nodeId).pointM, loadCase.direction)
        : zeroAction(),
    ]));
    return deepFreeze({
      segmentId: segment.segmentId,
      sourceNodeIds: [segment.sourceNodeAId, segment.sourceNodeBId],
      nodeIId: segment.nodeIId,
      nodeJId: segment.nodeJId,
      pointI: segment.pointI,
      pointJ: segment.pointJ,
      lengthM: axes.lengthM,
      axes,
      actionByCaseId,
      formulaTrace: ACTION_FORMULA_TRACE,
    });
  });
  return deepFreeze({
    schema: 'empirical-rooted-tree-unit-force-actions/v1',
    rootNodeId,
    caseIds: cases.map((row) => row.caseId),
    cases,
    nodes,
    segments: outputSegments,
    evidence: {
      topologyClass: 'CONNECTED_ACYCLIC_ROOTED_TREE',
      unitLoadMagnitudeN: 1,
      loadType: 'TRANSLATIONAL_FORCE_ONLY',
      actionAuthority: 'STATIC_CUT_EQUILIBRIUM_AND_MOMENT_TRANSPORT',
      internalActionsAcceptedFromCaller: false,
      localAxisPolicy: 'DETERMINISTIC_RIGHT_HANDED_TRANSVERSE_BASIS',
      sectionOrientationAuthority: 'AXISYMMETRIC_SECTION_REQUIRED_UNLESS_SEPARATE_PRINCIPAL_AXIS_AUTHORITY_EXISTS',
      segmentCount: outputSegments.length,
      nodeCount: nodes.length,
      formulaTrace: ACTION_FORMULA_TRACE,
    },
  });
}

function actionAtSegment(segment, axes, loadPoint, direction) {
  const force = direction;
  const internalForce = scale(force, -1);
  const momentI = scale(cross(subtract(loadPoint, segment.pointI), force), -1);
  const momentJ = scale(cross(subtract(loadPoint, segment.pointJ), force), -1);
  return deepFreeze({
    axialN: endField(dot(internalForce, axes.x), dot(internalForce, axes.x)),
    bendingMomentYNm: endField(dot(momentI, axes.y), dot(momentJ, axes.y)),
    bendingMomentZNm: endField(dot(momentI, axes.z), dot(momentJ, axes.z)),
    torsionNm: endField(dot(momentI, axes.x), dot(momentJ, axes.x)),
  });
}

function orientConnectedTree(nodes, segments, rootNodeId) {
  if (segments.length !== nodes.length - 1) {
    throw new TypeError('Rooted mechanical route must be a tree with segmentCount = nodeCount - 1.');
  }
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  segments.forEach((segment) => {
    adjacency.get(segment.nodeAId).push({ segment, otherNodeId: segment.nodeBId });
    adjacency.get(segment.nodeBId).push({ segment, otherNodeId: segment.nodeAId });
  });
  const visited = new Set([rootNodeId]);
  const queue = [rootNodeId];
  const parentByNodeId = new Map([[rootNodeId, null]]);
  const oriented = [];
  while (queue.length) {
    const parentNodeId = queue.shift();
    const rows = [...adjacency.get(parentNodeId)].sort((a, b) => a.segment.segmentId.localeCompare(b.segment.segmentId));
    for (const row of rows) {
      if (visited.has(row.otherNodeId)) continue;
      visited.add(row.otherNodeId);
      queue.push(row.otherNodeId);
      parentByNodeId.set(row.otherNodeId, {
        parentNodeId,
        segmentId: row.segment.segmentId,
      });
      const parentPoint = nodes.find((node) => node.id === parentNodeId).pointM;
      const childPoint = nodes.find((node) => node.id === row.otherNodeId).pointM;
      oriented.push(deepFreeze({
        segmentId: row.segment.segmentId,
        sourceNodeAId: row.segment.nodeAId,
        sourceNodeBId: row.segment.nodeBId,
        nodeIId: parentNodeId,
        nodeJId: row.otherNodeId,
        pointI: parentPoint,
        pointJ: childPoint,
      }));
    }
  }
  if (visited.size !== nodes.length) throw new TypeError('Rooted mechanical route must be connected.');
  return deepFreeze({
    segments: oriented.sort((a, b) => a.segmentId.localeCompare(b.segmentId)),
    parentByNodeId,
  });
}

function pathSegmentIds(nodeId, rootNodeId, parentByNodeId) {
  const result = new Set();
  let current = nodeId;
  while (current !== rootNodeId) {
    const parent = parentByNodeId.get(current);
    if (!parent) throw new TypeError(`Node ${nodeId} is not connected to root ${rootNodeId}.`);
    result.add(parent.segmentId);
    current = parent.parentNodeId;
  }
  return result;
}

function requireNodes(value) {
  if (!Array.isArray(value) || value.length < 2) throw new TypeError('nodes must contain at least two nodes.');
  const rows = value.map((node, index) => {
    requireRecord(node, `nodes[${index}]`);
    exactKeys(node, ['id', 'pointM'], `nodes[${index}]`);
    return deepFreeze({ id: requireNonEmptyString(node.id, `nodes[${index}].id`), pointM: requirePoint(node.pointM, `nodes[${index}].pointM`) });
  });
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new TypeError('node ids must be unique.');
  return deepFreeze(rows.sort((a, b) => a.id.localeCompare(b.id)));
}

function requireSegments(value, nodeById) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('segments must be a non-empty array.');
  const pairs = new Set();
  const rows = value.map((segment, index) => {
    requireRecord(segment, `segments[${index}]`);
    exactKeys(segment, ['segmentId', 'nodeAId', 'nodeBId'], `segments[${index}]`);
    const segmentId = requireNonEmptyString(segment.segmentId, `segments[${index}].segmentId`);
    const nodeAId = requireNonEmptyString(segment.nodeAId, `segments[${index}].nodeAId`);
    const nodeBId = requireNonEmptyString(segment.nodeBId, `segments[${index}].nodeBId`);
    if (nodeAId === nodeBId) throw new TypeError(`Segment ${segmentId} is a self-loop.`);
    if (!nodeById.has(nodeAId) || !nodeById.has(nodeBId)) throw new TypeError(`Segment ${segmentId} references a missing node.`);
    const pair = [nodeAId, nodeBId].sort().join('\0');
    if (pairs.has(pair)) throw new TypeError(`Duplicate mechanical segment pair ${nodeAId}/${nodeBId}.`);
    pairs.add(pair);
    if (!(distance(nodeById.get(nodeAId).pointM, nodeById.get(nodeBId).pointM) > ZERO_TOLERANCE)) throw new RangeError(`Segment ${segmentId} has zero length.`);
    return deepFreeze({ segmentId, nodeAId, nodeBId });
  });
  if (new Set(rows.map((row) => row.segmentId)).size !== rows.length) throw new TypeError('segment ids must be unique.');
  return deepFreeze(rows.sort((a, b) => a.segmentId.localeCompare(b.segmentId)));
}

function requireCases(value, nodeById, rootNodeId) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('cases must be a non-empty array.');
  const rows = value.map((loadCase, index) => {
    requireRecord(loadCase, `cases[${index}]`);
    exactKeys(loadCase, ['caseId', 'nodeId', 'direction'], `cases[${index}]`);
    const caseId = requireNonEmptyString(loadCase.caseId, `cases[${index}].caseId`);
    const nodeId = requireNonEmptyString(loadCase.nodeId, `cases[${index}].nodeId`);
    if (!nodeById.has(nodeId)) throw new TypeError(`Case ${caseId} references missing node ${nodeId}.`);
    if (nodeId === rootNodeId) throw new TypeError(`Case ${caseId} cannot apply unit load at fixed root ${rootNodeId}.`);
    const direction = requireVector(loadCase.direction, `cases[${index}].direction`);
    const norm = magnitude(direction);
    if (Math.abs(norm - 1) > UNIT_VECTOR_TOLERANCE) throw new RangeError(`Case ${caseId} direction must be an exact unit vector within ${UNIT_VECTOR_TOLERANCE}.`);
    return deepFreeze({ caseId, nodeId, direction });
  });
  if (new Set(rows.map((row) => row.caseId)).size !== rows.length) throw new TypeError('case ids must be unique.');
  return deepFreeze(rows.sort((a, b) => a.caseId.localeCompare(b.caseId)));
}

function zeroAction() { return deepFreeze({ axialN: endField(0, 0), bendingMomentYNm: endField(0, 0), bendingMomentZNm: endField(0, 0), torsionNm: endField(0, 0) }); }
function endField(i, j) { return deepFreeze({ i: cleanZero(i), j: cleanZero(j) }); }
function cleanZero(value) { return Math.abs(value) <= ZERO_TOLERANCE ? 0 : value; }
function requirePoint(value, label) { requireRecord(value, label); exactKeys(value, ['x', 'y', 'z'], label); return deepFreeze({ x: requireFiniteNumber(value.x, `${label}.x`), y: requireFiniteNumber(value.y, `${label}.y`), z: requireFiniteNumber(value.z, `${label}.z`) }); }
function requireVector(value, label) { if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain exactly three components.`); return deepFreeze(value.map((item, index) => requireFiniteNumber(item, `${label}[${index}]`))); }
function subtract(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
function scale(v, factor) { return v.map((item) => item * factor); }
function dot(a, b) { return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]); }
function cross(a, b) { return [(a[1] * b[2]) - (a[2] * b[1]), (a[2] * b[0]) - (a[0] * b[2]), (a[0] * b[1]) - (a[1] * b[0])]; }
function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }
function normalize(v, label) { const m = magnitude(v); if (!(m > ZERO_TOLERANCE)) throw new RangeError(`${label} has zero magnitude.`); return scale(v, 1 / m); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function basisOrder(label) { return label === 'GLOBAL_Z' ? 0 : label === 'GLOBAL_Y' ? 1 : 2; }
function exactKeys(value, keys, label) { requireRecord(value, label); const actual = Object.keys(value).sort(); const expected = [...keys].sort(); if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new TypeError(`${label} contains unexpected or missing keys.`); }
function requireRecord(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`); }
