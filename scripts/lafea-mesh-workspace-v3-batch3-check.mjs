#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { LAFEA_ANALYSIS_MESH_SCHEMA } from '../src/workspace/lafea-analysis-mesh-contract.js';
import { qualifyLafeaMeshTopologyV3 } from '../src/workspace/lafea-mesh-topology-qualification-v3.js';
import { qualifyLafeaShellOrientationV3 } from '../src/workspace/lafea-shell-orientation-qualification-v3.js';

const shell = mesh([
  node('N1', 0, 0), node('N2', 1, 0), node('N3', 1, 1), node('N4', 0, 1),
], [element('E1', ['N1', 'N2', 'N3']), element('E2', ['N1', 'N3', 'N4'])]);
assert.equal(qualifyLafeaMeshTopologyV3(shell).qualification, 'PASS');
assert.equal(qualifyLafeaShellOrientationV3(shell, {
  midsurfaceEvidenceHash: hash('MIDSURFACE'), allowDisconnectedPatches: false,
  anchors: [{ elementId: 'E1', expectedNormal: [0, 0, 1] }],
}).qualification, 'PASS');

const flipped = structuredClone(shell);
flipped.elements[1].nodeIds = ['N1', 'N4', 'N3'];
assert.equal(qualifyLafeaShellOrientationV3(flipped, {
  midsurfaceEvidenceHash: hash('MIDSURFACE'), allowDisconnectedPatches: false,
  anchors: [{ elementId: 'E1', expectedNormal: [0, 0, 1] }],
}).qualification, 'BLOCK');
const reversed = structuredClone(shell);
for (const row of reversed.elements) row.nodeIds = [row.nodeIds[0], row.nodeIds[2], row.nodeIds[1]];
assert.equal(qualifyLafeaShellOrientationV3(reversed, {
  midsurfaceEvidenceHash: hash('MIDSURFACE'), allowDisconnectedPatches: false,
  anchors: [{ elementId: 'E1', expectedNormal: [0, 0, 1] }],
}).qualification, 'BLOCK');
assert.throws(() => qualifyLafeaShellOrientationV3(shell, {
  midsurfaceEvidenceHash: hash('MIDSURFACE'), allowDisconnectedPatches: false,
  anchors: [{ elementId: 'E404', expectedNormal: [0, 0, 1] }],
}), (error) => error?.code === 'LAFEA_SHELL_ORIENTATION_V3_ANCHOR_ELEMENT_UNKNOWN');

const duplicate = structuredClone(shell);
duplicate.elements.push(element('E3', ['N1', 'N2', 'N3']));
assert.equal(qualifyLafeaMeshTopologyV3(duplicate).qualification, 'BLOCK');
const nonManifold = mesh([
  node('A', 0, 0), node('B', 1, 0), node('C', 0, 1), node('D', 0, -1), node('E', .5, .5),
], [element('T1', ['A', 'B', 'C']), element('T2', ['B', 'A', 'D']), element('T3', ['A', 'B', 'E'])]);
assert.equal(qualifyLafeaMeshTopologyV3(nonManifold).qualification, 'BLOCK');

const t6 = {
  schema: LAFEA_ANALYSIS_MESH_SCHEMA, meshIdentity: 'T6-CONFORMING',
  nodes: [
    node('A', 0, 0), node('B', 1, 0), node('C', 0, 1), node('D', 1, 1),
    node('AB', .5, 0), node('BC', .5, .5), node('CA', 0, .5),
    node('BD', 1, .5), node('DC', .5, 1),
  ],
  elements: [
    { elementId: 'Q1', elementType: 'T6', nodeIds: ['A', 'B', 'C', 'AB', 'BC', 'CA'] },
    { elementId: 'Q2', elementType: 'T6', nodeIds: ['B', 'D', 'C', 'BD', 'DC', 'BC'] },
  ],
};
const t6Topology = qualifyLafeaMeshTopologyV3(t6);
assert.equal(t6Topology.qualification, 'PASS');
assert.deepEqual(t6Topology.unusedNodeIds, []);
const mismatchedT6 = structuredClone(t6);
mismatchedT6.nodes.push(node('BC_ALT', .5, .5));
mismatchedT6.elements[1].nodeIds[5] = 'BC_ALT';
const mismatched = qualifyLafeaMeshTopologyV3(mismatchedT6);
assert.equal(mismatched.qualification, 'BLOCK');
assert.equal(mismatched.highOrderEdgeMismatches.length, 1);

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch3', status: 'PASS',
  topologyBlocksDuplicateCells: true, topologyBlocksNonManifoldEdges: true,
  highOrderMidsideNodesCountAsUsed: true, highOrderInterfaceMismatchBlocks: true,
  orientationBlocksLocalFlip: true, orientationAnchorBlocksGlobalReversal: true,
  unknownOrientationAnchorRejected: true,
}));

function mesh(nodes, elements) {
  return { schema: LAFEA_ANALYSIS_MESH_SCHEMA, meshIdentity: 'V3-SHELL', nodes, elements };
}
function node(nodeId, x, y) { return { nodeId, x, y, z: 0 }; }
function element(elementId, nodeIds) {
  return { elementId, elementType: 'CST_DKT_TRI3_THIN_SHELL_V1', nodeIds };
}
function hash(value) {
  return canonicalLafeaSha256({ schema: 'lafea-mesh-workspace-v3-batch3-fixture/v1', value });
}
