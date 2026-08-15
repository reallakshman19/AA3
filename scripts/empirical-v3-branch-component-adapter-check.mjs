import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import { EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA } from '../src/workspace/engineering-loads/adapters/canonical-component-rom-route.js';
import { buildEmpiricalV3BranchComponentAuthorityBundle } from '../src/workspace/engineering-loads/adapters/empirical-v3-branch-component-authority-builder.js';

const runId = 'RUN:V3:BRANCH-ADAPTER';
const h = (value) => semanticHash({ value });
const pipe = (id, a, b) => ({
  componentId: id,
  sourceType: 'PIPE',
  kind: 'STRAIGHT',
  nodeAId: a,
  nodeBId: b,
  sourcePortKeys: [`${id}:A`, `${id}:B`],
  geometry: null,
  geometryAuthoritySemanticHash: null,
});

const routeMaterial = {
  schema: EMPIRICAL_CANONICAL_COMPONENT_ROM_ROUTE_SCHEMA,
  datasetId: 'DATASET-1',
  connectedComponentId: 'CC-1',
  topologyGraphSemanticHash: h('topology'),
  sharedModelSemanticHash: h('shared-model'),
  nodes: [
    { id: 'N1', pointM: { x: 0, y: 0, z: 0 }, sourcePortKeys: ['P1:A'] },
    { id: 'N2', pointM: { x: 1, y: 0, z: 0 }, sourcePortKeys: ['P1:B', 'P2:A'] },
    { id: 'N3', pointM: { x: 2, y: 0, z: 0 }, sourcePortKeys: ['P2:B', 'P3:A'] },
    { id: 'N4', pointM: { x: 3, y: 0, z: 0 }, sourcePortKeys: ['P3:B'] },
  ],
  components: [pipe('P1', 'N1', 'N2'), pipe('P2', 'N2', 'N3'), pipe('P3', 'N3', 'N4')],
  evidence: { topologyAuthority: 'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH' },
};
const route = { ...routeMaterial, semanticHash: semanticHash(routeMaterial) };

const common = (processHash = h('process-A')) => [
  { kind: 'PROCESS', ref: 'process:basis', semanticHash: processHash },
  { kind: 'PIPING_CLASS', ref: 'class:91261M7', semanticHash: h('class') },
  { kind: 'MATERIAL_MAPPING', ref: 'material:A106B', semanticHash: h('material') },
  { kind: 'INSULATION', ref: 'insulation:basis', semanticHash: h('insulation') },
  { kind: 'LOAD_PARTICIPATION', ref: 'loads:basis', semanticHash: h('loads') },
];
const basis = (p3Process = h('process-A'), label = 'SOURCE-BRANCH-A') => ['P1', 'P2', 'P3'].map((id) => ({
  componentId: id,
  commonAuthorityRefs: common(id === 'P3' ? p3Process : h('process-A')),
  sourceEvidenceRefs: [],
  riskRefs: [],
  observedSourceBranchLabel: label,
}));
const locals = (p2Wt = h('wt-P2')) => ['P1', 'P2', 'P3'].map((id) => ({
  componentId: id,
  localAuthorityRefs: [
    { kind: 'IDENTITY', ref: `identity:${id}`, semanticHash: h(`identity-${id}`) },
    { kind: 'NPS', ref: `nps:${id}`, semanticHash: h(id === 'P2' ? 'DN200' : 'DN150') },
    { kind: 'WT', ref: `wt:${id}`, semanticHash: id === 'P2' ? p2Wt : h(`wt-${id}`) },
    { kind: 'SECTION', ref: `section:${id}`, semanticHash: h(`section-${id}-${id === 'P2' ? p2Wt : 'base'}`) },
  ],
  sourceEvidenceRefs: [],
  riskRefs: [],
}));

const build = (componentBasisRows, componentLocalRows = locals()) => buildEmpiricalV3BranchComponentAuthorityBundle({
  runId,
  route,
  componentBasisRows,
  componentLocalRows,
});

const base = build(basis());
assert.equal(base.branches.length, 1, 'DN/WT differences must remain component-local');

const relabelled = build(basis(h('process-A'), 'SOURCE-BRANCH-B'));
assert.equal(relabelled.semanticHash, base.semanticHash, 'source BRANCH label must not be calculation authority');
assert.notEqual(relabelled.evidenceHash, base.evidenceHash, 'source BRANCH label remains audit evidence');

const processBoundary = build(basis(h('process-B')));
assert.equal(processBoundary.branches.length, 2, 'process authority change must split connected calculation branches');

const revisedWt = build(basis(), locals(h('wt-P2-revised')));
assert.equal(revisedWt.branches[0].branchId, base.branches[0].branchId);
assert.notEqual(revisedWt.semanticHash, base.semanticHash, 'component-local revision must still invalidate downstream bundle identity');

assert.throws(() => buildEmpiricalV3BranchComponentAuthorityBundle({
  runId,
  route,
  componentBasisRows: basis(),
  componentLocalRows: locals(),
  chainage: [],
}), /unsupported keys/i);

const surrogateBasis = basis();
surrogateBasis[0] = { ...surrogateBasis[0], topologyEditConfidence: 'HIGH' };
assert.throws(() => build(surrogateBasis), /unsupported keys/i);

console.log('PASS empirical-v3-branch-component-adapter-check');
