import assert from 'node:assert/strict';
import {
  EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  sealEmpiricalV3BranchAuthority,
} from '../src/core/empirical-v3-safety/branch-authority.js';
import {
  bindComponentToBranch,
  componentRefForAuthorization,
} from '../src/core/empirical-v3-safety/component-authority.js';
import { sealEngineeringRiskSet } from '../src/core/empirical-v3-safety/risk-finding.js';
import {
  assessEmpiricalV3CalculationAuthorizationCurrent,
  sealEmpiricalV3CalculationAuthorization,
} from '../src/core/empirical-v3-safety/calculation-authorization.js';

const RUN_ID = 'run:branch-check';

function commonRefs(processHash = 'hash:process-a') {
  return [
    { kind: 'PROCESS', ref: 'process:branch-a', semanticHash: processHash },
    { kind: 'PIPING_CLASS', ref: 'class:600', semanticHash: 'hash:class-600' },
    { kind: 'MATERIAL_MAPPING', ref: 'material:a106b', semanticHash: 'hash:material-map' },
    { kind: 'INSULATION', ref: 'insulation:branch-a', semanticHash: 'hash:insulation' },
    { kind: 'LOAD_PARTICIPATION', ref: 'loads:branch-a', semanticHash: 'hash:loads' },
  ];
}

function branch(processHash = 'hash:process-a') {
  return sealEmpiricalV3BranchAuthority({
    schema: EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
    runId: RUN_ID,
    topologyRef: {
      ref: 'topology:model-1',
      semanticHash: 'hash:topology-exact',
      authority: 'EXACT',
      toleranceInferred: false,
    },
    branchTopologyRef: { ref: 'topology-branch:A', semanticHash: 'hash:branch-subgraph-a' },
    componentIds: ['C2', 'C1'],
    commonAuthorityRefs: commonRefs(processHash).reverse(),
    sourceEvidenceRefs: [{ ref: 'source-branch:BRANCH-7', semanticHash: 'hash:source-branch' }],
    riskRefs: [],
  });
}

function component(branchAuthority, wtHash = 'hash:wt-7.11') {
  return bindComponentToBranch({
    componentId: 'C1',
    componentType: 'PIPE',
    topologyComponentRef: { ref: 'topology-component:C1', semanticHash: 'hash:topo-c1' },
    localAuthorityRefs: [
      { kind: 'NPS', ref: 'quantity:C1:NPS', semanticHash: 'hash:nps150' },
      { kind: 'OD', ref: 'quantity:C1:OD', semanticHash: 'hash:od168.3' },
      { kind: 'WT', ref: 'quantity:C1:WT', semanticHash: wtHash },
      { kind: 'SECTION', ref: 'section:C1', semanticHash: `hash:section:${wtHash}` },
      { kind: 'GEOMETRY', ref: 'geometry:C1', semanticHash: 'hash:geometry-c1' },
    ],
    sourceEvidenceRefs: [],
    riskRefs: [],
  }, branchAuthority);
}

const branchA = branch();
const branchARepeat = branch();
assert.equal(branchA.semanticHash, branchARepeat.semanticHash);
assert.equal(branchA.branchSamenessHash, branchARepeat.branchSamenessHash);
assert.deepEqual(branchA.componentIds, ['C1', 'C2']);

// Imported source BRANCH evidence does not replace exact calculation topology.
assert.equal(branchA.topologyRef.authority, 'EXACT');
assert.throws(() => sealEmpiricalV3BranchAuthority({
  ...branchA,
  branchId: undefined,
  branchSamenessHash: undefined,
  reviewBasisHash: undefined,
  semanticHash: undefined,
  topologyRef: { ...branchA.topologyRef, authority: 'INFERRED', toleranceInferred: true },
}), /requires exact topology|Tolerance-inferred topology/);

// Component-local wall/section changes alter the component authority, not the
// branch-common process/class/material/insulation sameness basis.
const component711 = component(branchA, 'hash:wt-7.11');
const component800 = component(branchA, 'hash:wt-8.00');
assert.notEqual(component711.semanticHash, component800.semanticHash);
assert.equal(component711.branchRef.branchId, component800.branchRef.branchId);
assert.equal(component711.branchRef.reviewBasisHash, branchA.reviewBasisHash);

// A branch-common process change (for example operating temperature) changes
// the branch sameness/review basis and must invalidate downstream authorization.
const branchHotter = branch('hash:process-b-temperature-change');
assert.equal(branchHotter.branchId, branchA.branchId);
assert.notEqual(branchHotter.branchSamenessHash, branchA.branchSamenessHash);
assert.notEqual(branchHotter.reviewBasisHash, branchA.reviewBasisHash);
assert.notEqual(branchHotter.semanticHash, branchA.semanticHash);

// 30 result nodes can reference one branch authority instead of copying process basis.
const nodeBranchRefs = Array.from({ length: 30 }, (_, index) => ({
  nodeId: `N${index + 1}`,
  branchId: branchA.branchId,
  branchSemanticHash: branchA.semanticHash,
}));
assert.equal(new Set(nodeBranchRefs.map((item) => item.branchId)).size, 1);
assert.equal(new Set(nodeBranchRefs.map((item) => item.branchSemanticHash)).size, 1);

// Component authority cannot absorb branch-common PROCESS/CLASS/INSULATION.
assert.throws(() => bindComponentToBranch({
  componentId: 'C1',
  componentType: 'PIPE',
  topologyComponentRef: { ref: 'topology-component:C1', semanticHash: 'hash:topo-c1' },
  localAuthorityRefs: [{ kind: 'PROCESS', ref: 'process:bad-copy', semanticHash: 'hash:bad' }],
}, branchA), /Unsupported component-local authority kind/);
assert.throws(() => bindComponentToBranch({
  componentId: 'NOT-IN-BRANCH',
  componentType: 'PIPE',
  topologyComponentRef: { ref: 'topology-component:X', semanticHash: 'hash:x' },
  localAuthorityRefs: [{ kind: 'WT', ref: 'quantity:X:WT', semanticHash: 'hash:wt' }],
}, branchA), /not a member of branch/);

// Component section mutation invalidates calculation authorization even though
// branch common identity stays stable.
const riskSet = sealEngineeringRiskSet({ runId: RUN_ID, risks: [] });
const baseDependencies = [
  { kind: 'BRANCH', ref: branchA.branchId, semanticHash: branchA.semanticHash },
  componentRefForAuthorization(component711),
  { kind: 'TOPOLOGY', ref: branchA.topologyRef.ref, semanticHash: branchA.topologyRef.semanticHash },
];
const authorization = sealEmpiricalV3CalculationAuthorization({
  runId: RUN_ID,
  policyId: 'EMPIRICAL_V3_P0_RISK_POLICY',
  policyVersion: '1',
  dependencies: baseDependencies,
  riskSet,
  confirmations: [],
});
const staleComponent = assessEmpiricalV3CalculationAuthorizationCurrent(authorization, {
  runId: RUN_ID,
  policyId: 'EMPIRICAL_V3_P0_RISK_POLICY',
  policyVersion: '1',
  dependencies: [
    { kind: 'BRANCH', ref: branchA.branchId, semanticHash: branchA.semanticHash },
    componentRefForAuthorization(component800),
    { kind: 'TOPOLOGY', ref: branchA.topologyRef.ref, semanticHash: branchA.topologyRef.semanticHash },
  ],
  riskSet,
  confirmations: [],
});
assert.equal(staleComponent.current, false);
assert.ok(staleComponent.reasons.includes('DEPENDENCY_IDENTITY_CHANGED'));

console.log('PASS empirical v3 branch / component authority contract');
