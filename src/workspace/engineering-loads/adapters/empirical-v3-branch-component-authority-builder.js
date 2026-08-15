import { semanticHash } from '../../../core/empirical-piping-mechanics/identity.js';
import { deepFreeze } from '../../../core/shared-primitives/immutable.js';
import {
  EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  EMPIRICAL_V3_BRANCH_COMMON_AUTHORITY_KINDS,
  computeEmpiricalV3BranchSamenessHash,
  sealEmpiricalV3BranchAuthority,
} from '../../../core/empirical-v3-safety/branch-authority.js';
import {
  bindComponentToBranch,
} from '../../../core/empirical-v3-safety/component-authority.js';
import {
  requireCanonicalComponentRomRoute,
} from './canonical-component-rom-route.js';

export const EMPIRICAL_V3_BRANCH_COMPONENT_BUNDLE_SCHEMA =
  'empirical-v3-branch-component-authority-bundle/v1';

const BUNDLE_INPUT_KEYS = ['runId', 'route', 'componentBasisRows', 'componentLocalRows'];
const BASIS_ROW_KEYS = [
  'componentId',
  'commonAuthorityRefs',
  'sourceEvidenceRefs',
  'riskRefs',
  'observedSourceBranchLabel',
];
const LOCAL_ROW_KEYS = ['componentId', 'localAuthorityRefs', 'sourceEvidenceRefs', 'riskRefs'];

/**
 * Derives calculation branches from exact route connectivity plus equal
 * branch-common authority identities. Imported BRANCH labels are retained only
 * in the evidence projection and never participate in branch identity.
 */
export function buildEmpiricalV3BranchComponentAuthorityBundle(input) {
  requireAllowedKeys(input, BUNDLE_INPUT_KEYS, 'branch/component bundle input');
  const runId = requireText(input.runId, 'runId');
  const route = requireCanonicalComponentRomRoute(input.route);
  const routeIds = route.components.map((row) => row.componentId).sort();
  const basisByComponent = normalizeBasisRows(input.componentBasisRows, routeIds);
  const localByComponent = normalizeLocalRows(input.componentLocalRows, routeIds);
  const adjacency = componentAdjacency(route.components);
  const dsu = createDisjointSet(routeIds);

  for (const [leftId, rightId] of adjacency) {
    const left = basisByComponent.get(leftId);
    const right = basisByComponent.get(rightId);
    if (left.samenessHash === right.samenessHash) union(dsu, leftId, rightId);
  }

  const groups = new Map();
  for (const componentId of routeIds) {
    const root = find(dsu, componentId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(componentId);
  }

  const branchByComponent = new Map();
  const branches = [...groups.values()].map((componentIds) => {
    const sortedIds = [...componentIds].sort();
    const firstBasis = basisByComponent.get(sortedIds[0]);
    const topologyMaterial = sortedIds.map((componentId) => {
      const routeComponent = route.components.find((row) => row.componentId === componentId);
      return routeComponentTopologyProjection(routeComponent);
    });
    const branchTopologyHash = semanticHash({
      routeSemanticHash: route.semanticHash,
      components: topologyMaterial,
    });
    const branch = sealEmpiricalV3BranchAuthority({
      schema: EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
      runId,
      topologyRef: {
        ref: `topology:${route.datasetId}:${route.connectedComponentId}`,
        semanticHash: route.topologyGraphSemanticHash,
        authority: 'EXACT',
        toleranceInferred: false,
      },
      branchTopologyRef: {
        ref: `branch-topology:${branchTopologyHash.slice('fnv1a64:'.length)}`,
        semanticHash: branchTopologyHash,
      },
      componentIds: sortedIds,
      commonAuthorityRefs: firstBasis.commonAuthorityRefs,
      sourceEvidenceRefs: mergeRefs(sortedIds.flatMap((id) => basisByComponent.get(id).sourceEvidenceRefs)),
      riskRefs: mergeRefs(sortedIds.flatMap((id) => basisByComponent.get(id).riskRefs)),
    });
    sortedIds.forEach((componentId) => branchByComponent.set(componentId, branch));
    return branch;
  }).sort((a, b) => a.branchId.localeCompare(b.branchId));

  const components = route.components.map((routeComponent) => {
    const local = localByComponent.get(routeComponent.componentId);
    const branch = branchByComponent.get(routeComponent.componentId);
    const topologyComponentHash = semanticHash(routeComponentTopologyProjection(routeComponent));
    return bindComponentToBranch({
      componentId: routeComponent.componentId,
      componentType: routeComponent.sourceType,
      topologyComponentRef: {
        ref: `route-component:${routeComponent.componentId}`,
        semanticHash: topologyComponentHash,
      },
      localAuthorityRefs: local.localAuthorityRefs,
      sourceEvidenceRefs: local.sourceEvidenceRefs,
      riskRefs: local.riskRefs,
    }, branch);
  }).sort((a, b) => a.componentId.localeCompare(b.componentId));

  const semanticMaterial = {
    schema: EMPIRICAL_V3_BRANCH_COMPONENT_BUNDLE_SCHEMA,
    runId,
    routeRef: { ref: route.connectedComponentId, semanticHash: route.semanticHash },
    branchRefs: branches.map((branch) => ({ ref: branch.branchId, semanticHash: branch.semanticHash })),
    componentRefs: components.map((component) => ({ ref: component.componentId, semanticHash: component.semanticHash })),
  };
  const bundleSemanticHash = semanticHash(semanticMaterial);
  const sourceBranchObservations = [...basisByComponent.values()]
    .map((row) => ({
      componentId: row.componentId,
      observedSourceBranchLabel: row.observedSourceBranchLabel,
    }))
    .filter((row) => row.observedSourceBranchLabel)
    .sort((a, b) => a.componentId.localeCompare(b.componentId));

  return deepFreeze({
    ...semanticMaterial,
    branches,
    components,
    sourceBranchObservations,
    semanticHash: bundleSemanticHash,
    evidenceHash: semanticHash({ bundleSemanticHash, sourceBranchObservations }),
  });
}

function normalizeBasisRows(value, routeIds) {
  const rows = requireCoverage(value, routeIds, 'componentBasisRows').map((row, index) => {
    requireAllowedKeys(row, BASIS_ROW_KEYS, `componentBasisRows[${index}]`);
    const commonAuthorityRefs = normalizeCommonRefs(row.commonAuthorityRefs, index);
    return {
      componentId: requireText(row.componentId, `componentBasisRows[${index}].componentId`),
      commonAuthorityRefs,
      samenessHash: computeEmpiricalV3BranchSamenessHash(commonAuthorityRefs),
      sourceEvidenceRefs: normalizeRefs(row.sourceEvidenceRefs ?? [], `componentBasisRows[${index}].sourceEvidenceRefs`),
      riskRefs: normalizeRefs(row.riskRefs ?? [], `componentBasisRows[${index}].riskRefs`),
      observedSourceBranchLabel: optionalText(row.observedSourceBranchLabel),
    };
  });
  return new Map(rows.map((row) => [row.componentId, row]));
}

function normalizeLocalRows(value, routeIds) {
  const rows = requireCoverage(value, routeIds, 'componentLocalRows').map((row, index) => {
    requireAllowedKeys(row, LOCAL_ROW_KEYS, `componentLocalRows[${index}]`);
    return {
      componentId: requireText(row.componentId, `componentLocalRows[${index}].componentId`),
      localAuthorityRefs: normalizeKindRefs(row.localAuthorityRefs, `componentLocalRows[${index}].localAuthorityRefs`),
      sourceEvidenceRefs: normalizeRefs(row.sourceEvidenceRefs ?? [], `componentLocalRows[${index}].sourceEvidenceRefs`),
      riskRefs: normalizeRefs(row.riskRefs ?? [], `componentLocalRows[${index}].riskRefs`),
    };
  });
  return new Map(rows.map((row) => [row.componentId, row]));
}

function normalizeCommonRefs(value, index) {
  const refs = normalizeKindRefs(value, `componentBasisRows[${index}].commonAuthorityRefs`);
  const actual = refs.map((row) => row.kind).sort();
  const expected = [...EMPIRICAL_V3_BRANCH_COMMON_AUTHORITY_KINDS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Component basis must provide exactly branch-common kinds: ${expected.join(', ')}.`);
  }
  return refs;
}

function normalizeKindRefs(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${fieldName} must be a nonempty array.`);
  const refs = value.map((row, index) => ({
    kind: requireText(row?.kind, `${fieldName}[${index}].kind`).toUpperCase(),
    ref: requireText(row?.ref, `${fieldName}[${index}].ref`),
    semanticHash: requireText(row?.semanticHash, `${fieldName}[${index}].semanticHash`),
  }));
  if (new Set(refs.map((row) => row.kind)).size !== refs.length) throw new Error(`${fieldName} contains duplicate kinds.`);
  return refs.sort((a, b) => a.kind.localeCompare(b.kind));
}

function normalizeRefs(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return mergeRefs(value.map((row, index) => ({
    ref: requireText(row?.ref, `${fieldName}[${index}].ref`),
    semanticHash: requireText(row?.semanticHash, `${fieldName}[${index}].semanticHash`),
  })));
}

function requireCoverage(value, routeIds, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  const ids = value.map((row, index) => requireText(row?.componentId, `${fieldName}[${index}].componentId`)).sort();
  if (JSON.stringify(ids) !== JSON.stringify(routeIds)) {
    throw new Error(`${fieldName} must cover every route component exactly once.`);
  }
  if (new Set(ids).size !== ids.length) throw new Error(`${fieldName} contains duplicate component IDs.`);
  return value;
}

function componentAdjacency(components) {
  const byNode = new Map();
  for (const component of components) {
    for (const nodeId of [component.nodeAId, component.nodeBId]) {
      if (!byNode.has(nodeId)) byNode.set(nodeId, []);
      byNode.get(nodeId).push(component.componentId);
    }
  }
  const pairs = [];
  for (const ids of byNode.values()) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) pairs.push([ids[i], ids[j]].sort());
    }
  }
  return [...new Map(pairs.map((pair) => [pair.join('\u0000'), pair])).values()];
}

function routeComponentTopologyProjection(component) {
  return {
    componentId: component.componentId,
    sourceType: component.sourceType,
    kind: component.kind,
    nodeAId: component.nodeAId,
    nodeBId: component.nodeBId,
    sourcePortKeys: [...component.sourcePortKeys].sort(),
    geometryAuthoritySemanticHash: component.geometryAuthoritySemanticHash,
  };
}

function mergeRefs(refs) {
  const map = new Map();
  for (const ref of refs) map.set(`${ref.ref}\u0000${ref.semanticHash}`, ref);
  return [...map.values()].sort((a, b) => a.ref.localeCompare(b.ref) || a.semanticHash.localeCompare(b.semanticHash));
}
function createDisjointSet(ids) {
  return { parent: new Map(ids.map((id) => [id, id])), rank: new Map(ids.map((id) => [id, 0])) };
}
function find(dsu, id) {
  const parent = dsu.parent.get(id);
  if (parent === id) return id;
  const root = find(dsu, parent);
  dsu.parent.set(id, root);
  return root;
}
function union(dsu, left, right) {
  let a = find(dsu, left); let b = find(dsu, right);
  if (a === b) return;
  if (dsu.rank.get(a) < dsu.rank.get(b)) [a, b] = [b, a];
  dsu.parent.set(b, a);
  if (dsu.rank.get(a) === dsu.rank.get(b)) dsu.rank.set(a, dsu.rank.get(a) + 1);
}
function requireAllowedKeys(value, allowed, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${fieldName} must be an object.`);
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) throw new TypeError(`${fieldName} contains unsupported keys: ${extras.join(', ')}.`);
}
function optionalText(value) { const text = String(value ?? '').trim(); return text || null; }
function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${fieldName} is required.`);
  return text;
}
