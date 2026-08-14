/** Global mesh-connectivity qualification beyond local element metrics. */
import { canonicalLafeaAnalysisMesh } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_TOPOLOGY_QUALIFICATION_V3_SCHEMA = 'lafea-mesh-topology-qualification/v3';

export function qualifyLafeaMeshTopologyV3(meshValue, { requireSingleComponent = true } = {}) {
  if (typeof requireSingleComponent !== 'boolean') {
    fail('LAFEA_MESH_TOPOLOGY_V3_COMPONENT_POLICY_INVALID');
  }
  const mesh = canonicalLafeaAnalysisMesh(meshValue);
  const nodeIds = new Set(mesh.nodes.map((node) => node.nodeId));
  const nodeUse = new Map(mesh.nodes.map((node) => [node.nodeId, []]));
  const edgeUse = new Map();
  const cellUse = new Map();

  for (const element of mesh.elements) {
    const edges = elementEdges(element);
    const cellKey = `${element.elementType}\u0000${[...element.nodeIds].sort().join('\u0000')}`;
    if (!cellUse.has(cellKey)) cellUse.set(cellKey, []);
    cellUse.get(cellKey).push(element.elementId);
    for (const nodeId of element.nodeIds) {
      if (!nodeIds.has(nodeId)) fail('LAFEA_MESH_TOPOLOGY_V3_NODE_MISSING');
      nodeUse.get(nodeId).push(element.elementId);
    }
    for (const edge of edges) {
      if (!edgeUse.has(edge.key)) edgeUse.set(edge.key, []);
      edgeUse.get(edge.key).push(freeze({
        elementId: element.elementId,
        midsideNodeId: edge.midsideNodeId,
      }));
    }
  }

  const unusedNodeIds = [...nodeUse.entries()].filter(([, users]) => users.length === 0)
    .map(([nodeId]) => nodeId).sort();
  const duplicateCells = [...cellUse.values()].filter((users) => users.length > 1)
    .map((users) => Object.freeze([...users].sort()));
  const nonManifoldEdges = [...edgeUse.entries()].filter(([, users]) => users.length > 2)
    .map(([key, users]) => freeze({
      nodeIds: freeze(key.split('\u0000')),
      elementIds: freeze(users.map((row) => row.elementId).sort()),
    }));
  const highOrderEdgeMismatches = [...edgeUse.entries()].filter(([, users]) => {
    if (users.length !== 2) return false;
    return users[0].midsideNodeId !== users[1].midsideNodeId;
  }).map(([key, users]) => freeze({
    nodeIds: freeze(key.split('\u0000')),
    uses: freeze(users.map((row) => freeze({
      elementId: row.elementId,
      midsideNodeId: row.midsideNodeId,
    })).sort((a, b) => a.elementId.localeCompare(b.elementId))),
  }));
  const boundaryEdges = [...edgeUse.entries()].filter(([, users]) => users.length === 1)
    .map(([key]) => Object.freeze(key.split('\u0000')));

  const edgeComponents = connectedComponents(mesh.elements, edgeUse);
  const elementToEdgeComponent = new Map();
  edgeComponents.forEach((component, index) => component.forEach((elementId) => {
    elementToEdgeComponent.set(elementId, index);
  }));
  const pointOnlyConnectionNodeIds = [...nodeUse.entries()].filter(([, users]) => {
    const components = new Set(users.map((elementId) => elementToEdgeComponent.get(elementId)));
    return components.size > 1;
  }).map(([nodeId]) => nodeId).sort();

  const findings = [];
  if (unusedNodeIds.length) findings.push(finding('UNUSED_NODES', unusedNodeIds));
  if (duplicateCells.length) findings.push(finding('DUPLICATE_CELLS', duplicateCells));
  if (nonManifoldEdges.length) findings.push(finding('NON_MANIFOLD_EDGES', nonManifoldEdges));
  if (highOrderEdgeMismatches.length) {
    findings.push(finding('HIGH_ORDER_EDGE_NODE_MISMATCH', highOrderEdgeMismatches));
  }
  if (pointOnlyConnectionNodeIds.length) {
    findings.push(finding('POINT_ONLY_COMPONENT_CONNECTIONS', pointOnlyConnectionNodeIds));
  }
  if (requireSingleComponent && edgeComponents.length !== 1) {
    findings.push(finding('DISCONNECTED_EDGE_COMPONENTS', edgeComponents));
  }
  const core = freeze({
    schema: LAFEA_MESH_TOPOLOGY_QUALIFICATION_V3_SCHEMA,
    meshIdentity: mesh.meshIdentity,
    requireSingleComponent,
    elementCount: mesh.elements.length,
    nodeCount: mesh.nodes.length,
    boundaryEdgeCount: boundaryEdges.length,
    edgeComponentCount: edgeComponents.length,
    edgeComponents: freeze(edgeComponents),
    unusedNodeIds: freeze(unusedNodeIds),
    duplicateCells: freeze(duplicateCells),
    nonManifoldEdges: freeze(nonManifoldEdges),
    highOrderEdgeMismatches: freeze(highOrderEdgeMismatches),
    pointOnlyConnectionNodeIds: freeze(pointOnlyConnectionNodeIds),
    findings: freeze(findings),
    qualification: findings.length ? 'BLOCK' : 'PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-topology-qualification-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}

function connectedComponents(elements, edgeUse) {
  const adjacency = new Map(elements.map((element) => [element.elementId, new Set()]));
  for (const users of edgeUse.values()) {
    for (const left of users) for (const right of users) {
      if (left.elementId !== right.elementId) adjacency.get(left.elementId).add(right.elementId);
    }
  }
  const ordered = elements.map((element) => element.elementId).sort();
  const visited = new Set();
  const out = [];
  for (const seed of ordered) {
    if (visited.has(seed)) continue;
    const component = [];
    const queue = [seed];
    visited.add(seed);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const neighbour of [...adjacency.get(current)].sort()) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    out.push(Object.freeze(component.sort()));
  }
  return Object.freeze(out);
}

function elementEdges(element) {
  if (element.elementType === 'T3' || element.elementType === 'CST_DKT_TRI3_THIN_SHELL_V1') {
    return edgesFrom(element.nodeIds.slice(0, 3), [null, null, null]);
  }
  if (element.elementType === 'T6') {
    return edgesFrom(element.nodeIds.slice(0, 3), element.nodeIds.slice(3, 6));
  }
  if (element.elementType === 'Q8') {
    return edgesFrom(element.nodeIds.slice(0, 4), element.nodeIds.slice(4, 8));
  }
  fail('LAFEA_MESH_TOPOLOGY_V3_ELEMENT_TYPE_UNSUPPORTED');
}
function edgesFrom(corners, midsides) {
  return corners.map((a, index) => {
    const b = corners[(index + 1) % corners.length];
    return freeze({
      key: a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`,
      midsideNodeId: midsides[index],
    });
  });
}
function finding(code, entities) {
  return freeze({ code: `LAFEA_MESH_TOPOLOGY_V3_${code}`, entities });
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
