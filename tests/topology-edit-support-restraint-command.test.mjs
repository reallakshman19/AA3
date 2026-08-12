import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTopologyEditCommandRequest,
} from '../src/workspace/topology-edit/topology-edit-command-contract.js';
import {
  resolveTopologyEditCommand,
} from '../src/workspace/topology-edit/topology-edit-command-resolver.js';
import {
  buildTopologyEditCandidate,
} from '../src/workspace/topology-edit/topology-edit-candidate-builder.js';
import {
  validateTopologyEditCandidate,
} from '../src/workspace/topology-edit/topology-edit-candidate-validator.js';
import {
  finalizeCanonicalTopology,
} from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import {
  deriveSupportRestraintGeometry,
  supportRestraintRows,
} from '../src/workspace/topology-edit/support-restraint-family.js';

function fixture({ hostEntityId = 'pipe:p1' } = {}) {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'support-command', datasetVersion: 1,
    sourceHash: 'sha256:support-source', topologyGraphHash: 'sha256:support-graph',
    nodes: [
      { id: 'node:n1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:n2', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:p1', componentKey: 'pipe:p1',
      fromNodeId: 'node:n1', toNodeId: 'node:n2', entityType: 'PIPE',
      outsideDiameterMm: 114,
    }],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{
      id: 'support:s1', nodeId: 'node:n1', hostEntityId,
      stationMm: 0, resolved: true,
      restraints: [{
        id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1,
        sourcePaths: ['source.supports[0].restraints[0]'],
      }],
    }],
  });
}
function basis(base) {
  return {
    sourceHash: base.sourceHash,
    baseCanonicalHash: base.canonicalTopologyHash,
    priorDraftHash: base.canonicalTopologyHash,
    sessionVersion: 0,
  };
}
function request(base, overrides = {}) {
  return createTopologyEditCommandRequest({
    commandId: 'cmd:update-support-restraint',
    commandType: 'UPDATE_SUPPORT_RESTRAINT',
    basis: basis(base),
    payload: {
      supportId: 'support:s1',
      family: 'GUIDE',
      direction: 'LOCAL_Y',
      gapMm: 4,
      travelMm: 12,
      ...overrides,
    },
  });
}

test('UPDATE_SUPPORT_RESTRAINT resolves exact support, host, and node revisions', () => {
  const base = fixture();
  const resolved = resolveTopologyEditCommand({
    request: request(base),
    canonicalTopology: base,
    authority: basis(base),
  });

  assert.equal(resolved.commandType, 'UPDATE_SUPPORT_RESTRAINT');
  assert.equal(resolved.targets.supports.length, 1);
  assert.equal(resolved.targets.supports[0].id, 'support:s1');
  assert.equal(resolved.targets.edges[0].id, 'edge:p1');
  assert.equal(resolved.targets.nodes[0].id, 'node:n1');
  assert.ok(resolved.targetRevisions['support:s1']);
  assert.ok(resolved.targetRevisions['edge:p1']);
  assert.ok(resolved.targetRevisions['node:n1']);
});

test('UPDATE_SUPPORT_RESTRAINT changes one support, preserves imported evidence, and drives geometry through certified override', () => {
  const base = fixture();
  const resolved = resolveTopologyEditCommand({
    request: request(base),
    canonicalTopology: base,
    authority: basis(base),
  });
  const candidate = buildTopologyEditCandidate({
    canonicalTopology: base,
    resolvedCommand: resolved,
  });
  const report = validateTopologyEditCandidate({
    candidate,
    baseCanonicalTopology: base,
  });

  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.deepEqual(candidate.topologyDelta.supports.changedIds, ['support:s1']);
  assert.deepEqual(candidate.topologyDelta.nodes.changedIds, []);
  assert.deepEqual(candidate.topologyDelta.edges.changedIds, []);

  const support = candidate.canonicalTopology.supports[0];
  assert.equal(support.restraints[0].id, 'restraint:source:1');
  assert.equal(support.restraintAuthority, 'CERTIFIED_TABLE_OVERRIDE');
  assert.equal(support.restraint.type, 'GUIDE');
  assert.equal(support.restraint.direction, 'LOCAL_Y');
  assert.equal(support.restraint.gapMm, 4);
  assert.equal(support.restraint.travelMm, 12);
  assert.deepEqual(supportRestraintRows(support), [support.restraint]);

  const geometry = deriveSupportRestraintGeometry({
    canonicalTopology: candidate.canonicalTopology,
    support,
  });
  assert.equal(geometry.restraints.length, 1);
  assert.equal(geometry.restraints[0].family, 'GUIDE');
  assert.equal(geometry.restraints[0].restraintId, support.restraint.restraintId);
  assert.deepEqual(geometry.restraints[0].direction, { x: 0, y: -1, z: 0 });
});

test('UPDATE_SUPPORT_RESTRAINT rejects invalid engineering input and stale support revisions', () => {
  const base = fixture();
  assert.throws(() => request(base, { family: 'NOT_A_SUPPORT' }), /unsupported family/);
  assert.throws(() => request(base, { direction: '' }), /direction is required/);
  assert.throws(() => request(base, { gapMm: -1 }), /gapMm must be non-negative/);

  const stale = createTopologyEditCommandRequest({
    ...request(base),
    expectedTargetRevisions: { 'support:s1': 'sha256:stale-support-revision' },
  });
  assert.throws(() => resolveTopologyEditCommand({
    request: stale,
    canonicalTopology: base,
    authority: basis(base),
  }), /stale target revision for support:s1/);
});

test('UPDATE_SUPPORT_RESTRAINT fails closed when shared host authority is unresolved', () => {
  const base = fixture({ hostEntityId: 'pipe:missing' });
  assert.throws(() => resolveTopologyEditCommand({
    request: request(base),
    canonicalTopology: base,
    authority: basis(base),
  }), /support support:s1 host authority is UNRESOLVED/);
  assert.equal(base.supports[0].restraint, undefined);
});
