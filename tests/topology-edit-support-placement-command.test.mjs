import assert from 'node:assert/strict';
import test from 'node:test';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
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
  effectiveTopologyEditSupportOrigin,
  effectiveTopologyEditSupportStationMm,
  topologyEditSupportNonPlacementMaterial,
  topologyEditSupportPlacementContext,
} from '../src/workspace/topology-edit/topology-edit-support-placement.js';

function fixture({ hostEntityId = 'pipe:p1', hostType = 'PIPE', support = {} } = {}) {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'support-placement', datasetVersion: 1,
    sourceHash: 'sha256:support-placement-source', topologyGraphHash: 'sha256:support-placement-graph',
    nodes: [
      { id: 'node:n1', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:n2', position: { x: 1000, y: 0, z: 0 }, portKeys: [] },
    ],
    edges: [{
      id: 'edge:p1', componentKey: 'pipe:p1',
      fromNodeId: 'node:n1', toNodeId: 'node:n2', entityType: hostType,
      outsideDiameterMm: 114,
    }],
    junctions: [], boundaries: [], rigids: [], bends: [],
    supports: [{
      id: 'support:s1', entityId: 'support-source:s1', nodeId: 'node:n1', hostEntityId,
      resolved: true, origin: { x: 250, y: 0, z: 0 },
      originAuthority: 'ATTACHMENT_PROJECTED_POINT',
      attachmentId: 'attachment:source:s1', attachmentSegmentParameter: 0.25,
      attachmentDistanceCanonical: 0,
      attachmentEvidenceType: 'GEOMETRIC',
      restraints: [{
        id: 'restraint:source:1', type: 'REST', direction: '+Z', gapMm: 1,
        sourcePaths: ['source.supports[0].restraints[0]'],
      }],
      ...support,
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
    commandId: 'cmd:update-support-placement',
    commandType: 'UPDATE_SUPPORT_PLACEMENT',
    basis: basis(base),
    payload: {
      supportId: 'support:s1', hostEdgeId: 'edge:p1', stationMm: 600,
      ...overrides,
    },
  });
}
function resolved(base, overrides = {}, expectedTargetRevisions = undefined) {
  const input = request(base, overrides);
  const commandRequest = expectedTargetRevisions
    ? createTopologyEditCommandRequest({ ...input, expectedTargetRevisions })
    : input;
  return resolveTopologyEditCommand({
    request: commandRequest,
    canonicalTopology: base,
    authority: basis(base),
  });
}

test('UPDATE_SUPPORT_PLACEMENT resolves support, exact host, and both host endpoint revisions', () => {
  const base = fixture();
  const command = resolved(base);

  assert.equal(command.commandType, 'UPDATE_SUPPORT_PLACEMENT');
  assert.deepEqual(command.targets.supports.map((row) => row.id), ['support:s1']);
  assert.deepEqual(command.targets.edges.map((row) => row.id), ['edge:p1']);
  assert.deepEqual(command.targets.nodes.map((row) => row.id), ['node:n1', 'node:n2']);
  for (const id of ['support:s1', 'edge:p1', 'node:n1', 'node:n2']) {
    assert.ok(command.targetRevisions[id]);
  }
});

test('UPDATE_SUPPORT_PLACEMENT changes only placement override and preserves imported support evidence', () => {
  const base = fixture();
  const candidate = buildTopologyEditCandidate({
    canonicalTopology: base,
    resolvedCommand: resolved(base),
  });
  const report = validateTopologyEditCandidate({ candidate, baseCanonicalTopology: base });

  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.deepEqual(candidate.topologyDelta.supports.changedIds, ['support:s1']);
  for (const collection of ['nodes', 'edges', 'junctions', 'boundaries', 'rigids', 'bends']) {
    assert.deepEqual(candidate.topologyDelta[collection]?.changedIds ?? [], []);
    assert.deepEqual(candidate.topologyDelta[collection]?.addedIds ?? [], []);
    assert.deepEqual(candidate.topologyDelta[collection]?.removedIds ?? [], []);
  }

  const before = base.supports[0];
  const after = candidate.canonicalTopology.supports[0];
  assert.equal(
    semanticHash(topologyEditSupportNonPlacementMaterial(after)),
    semanticHash(topologyEditSupportNonPlacementMaterial(before)),
  );
  assert.equal(after.placementOverride.authority, 'CERTIFIED_TABLE_OVERRIDE');
  assert.equal(after.placementOverride.hostEdgeId, 'edge:p1');
  assert.equal(after.placementOverride.stationMm, 600);
  assert.equal(after.placementOverride.segmentParameter, 0.6);
  assert.deepEqual(after.placementOverride.origin, { x: 600, y: 0, z: 0 });
  assert.deepEqual(effectiveTopologyEditSupportOrigin(after), { x: 600, y: 0, z: 0 });
  assert.equal(effectiveTopologyEditSupportStationMm(candidate.canonicalTopology, after), 600);
  assert.deepEqual(after.restraints, before.restraints);
  assert.equal(after.attachmentId, before.attachmentId);
  assert.equal(after.attachmentSegmentParameter, before.attachmentSegmentParameter);
  assert.deepEqual(after.origin, before.origin);
});

test('projected attachment point is exact station authority when no segment parameter exists', () => {
  const base = fixture({ support: { attachmentSegmentParameter: null } });
  const context = topologyEditSupportPlacementContext(base, base.supports[0]);
  assert.equal(context.currentStationMm, 250);
  assert.equal(context.stationAuthority, 'ATTACHMENT_PROJECTED_POINT');
  assert.throws(() => resolved(base, { stationMm: 250 }), /placement is a no-op/);
});

test('conflicting attachment segment and projected-point evidence fails closed', () => {
  const base = fixture({ support: { attachmentSegmentParameter: 0.3 } });
  assert.throws(
    () => topologyEditSupportPlacementContext(base, base.supports[0]),
    /conflicting attachment segment and projected-point evidence/,
  );
  assert.throws(() => resolved(base), /conflicting attachment segment and projected-point evidence/);
});

test('UPDATE_SUPPORT_PLACEMENT rejects invalid station, no-op, host drift, and non-straight host', () => {
  const base = fixture();
  assert.throws(() => request(base, { stationMm: -1 }), /stationMm must be finite and non-negative/);
  assert.throws(() => resolved(base, { stationMm: 1001 }), /exceeds host length/);
  assert.throws(() => resolved(base, { stationMm: 250 }), /placement is a no-op/);
  assert.throws(() => resolved(base, { hostEdgeId: 'edge:other' }), /host changed from edge:other to edge:p1/);

  const curved = fixture({ hostType: 'ELBOW' });
  assert.throws(() => resolved(curved), /has no certified station parameterization/);
});

test('UPDATE_SUPPORT_PLACEMENT fails closed for unresolved host and stale support or host revisions', () => {
  const unresolved = fixture({ hostEntityId: 'pipe:missing' });
  assert.throws(() => resolved(unresolved), /host authority is UNRESOLVED/);

  const base = fixture();
  assert.throws(() => resolved(base, {}, {
    'support:s1': 'sha256:stale-support',
  }), /stale target revision for support:s1/);
  assert.throws(() => resolved(base, {}, {
    'edge:p1': 'sha256:stale-host',
  }), /stale target revision for edge:p1/);
});

test('a second station command is based on the certified override and rejects an exact repeat', () => {
  const base = fixture();
  const first = buildTopologyEditCandidate({
    canonicalTopology: base,
    resolvedCommand: resolved(base),
  }).canonicalTopology;
  assert.equal(effectiveTopologyEditSupportStationMm(first, first.supports[0]), 600);

  const secondBasis = {
    sourceHash: first.sourceHash,
    baseCanonicalHash: base.canonicalTopologyHash,
    priorDraftHash: first.canonicalTopologyHash,
    sessionVersion: 1,
  };
  const repeatRequest = createTopologyEditCommandRequest({
    commandId: 'cmd:update-support-placement-repeat',
    commandType: 'UPDATE_SUPPORT_PLACEMENT',
    basis: secondBasis,
    payload: { supportId: 'support:s1', hostEdgeId: 'edge:p1', stationMm: 600 },
  });
  assert.throws(() => resolveTopologyEditCommand({
    request: repeatRequest, canonicalTopology: first, authority: secondBasis,
  }), /placement is a no-op/);
});
