import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSharedPipingModelFromWorkspaceDataset } from '../src/core/shared-piping-model/adapters/workspace-dataset-to-shared.js';
import { buildPipingPortTopologyGraph } from '../src/core/piping-topology/topology-graph.js';
import { buildTopologyEditCandidate } from '../src/workspace/topology-edit/topology-edit-candidate-builder.js';
import { createTopologyEditCommandRequest } from '../src/workspace/topology-edit/topology-edit-command-contract.js';
import { resolveTopologyEditCommand } from '../src/workspace/topology-edit/topology-edit-command-resolver.js';
import {
  applyCanonicalTopologyToWorkspaceEntities,
  buildCanonicalTopologyFromWorkspaceDataset,
} from '../src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;

function rawDataset() {
  const dataset = {
    schema: 'analysis-workspace-dataset/v1',
    datasetId: 'support-placement-round-trip',
    version: 0,
    sourceSchema: 'SupportPlacementFixture.v1',
    sourceName: 'SUPPORT-PLACEMENT',
    sourceSnapshot: {
      schema: 'source-package-snapshot/v1',
      datasetId: 'support-placement-round-trip',
      sourceSchema: 'SupportPlacementFixture.v1',
      sourceSemanticHash: SOURCE_HASH,
      sourceByteHash: 'sha256:immutable-source-bytes',
      sourcePackage: { schema: 'SupportPlacementFixture.v1', units: { length: 'MM' } },
      diagnostics: [],
    },
    sourceModel: { nodes: [], diagnostics: [] },
    entities: [pipeEntity(), supportEntity()],
    nativeAuthoring: { canonicalDatasetVersion: 0 },
  };
  return withSharedModel(dataset);
}
function pipeEntity() {
  return {
    entityId: 'pipe:p1', sourceEntityId: 'pipe:p1', name: 'P-1', entityType: 'PIPE',
    selectionType: 'component', category: 'pipe', componentReference: 'pipe:p1',
    nominalDiameterMm: 100, outsideDiameterMm: 114,
    properties: {
      identity: { entityId: 'pipe:p1', sourceEntityId: 'pipe:p1', name: 'P-1', entityType: 'PIPE' },
      geometry: {
        start: { x: 0, y: 0, z: 0 }, end: { x: 1000, y: 0, z: 0 }, center: { x: 500, y: 0, z: 0 },
      },
      sourceAttributes: {}, attributes: { TYPE: 'PIPE' }, enrichedAttributes: {}, nativeParams: {}, diagnostics: [],
    },
  };
}
function supportEntity() {
  const point = { x: 250, y: 0, z: 0 };
  return {
    entityId: 'support:s1', sourceEntityId: 'support:s1', name: 'S-1', entityType: 'SUPPORT',
    selectionType: 'support', category: 'support', componentReference: 'support:s1',
    nominalDiameterMm: null, outsideDiameterMm: null,
    properties: {
      identity: { entityId: 'support:s1', sourceEntityId: 'support:s1', name: 'S-1', entityType: 'SUPPORT' },
      geometry: { start: point, end: point, center: point },
      sourceAttributes: { STATION_MM: 250 },
      attributes: {
        TYPE: 'SUPPORT', SUPPORT_TYPE: 'REST', STATION_MM: 250, VENDOR_TOKEN: 'KEEP-ME',
      },
      enrichedAttributes: {}, nativeParams: {}, diagnostics: [],
    },
  };
}
function withSharedModel(dataset) {
  return { ...dataset, sharedModel: buildSharedPipingModelFromWorkspaceDataset(dataset) };
}
function attachmentModel() {
  return {
    attachments: [{
      attachmentId: 'attachment:support:s1',
      supportKey: 'support:s1', attachedComponentKey: 'pipe:p1', attachedPortKey: null,
      evidenceType: 'GEOMETRIC',
      projectedPointCanonical: { x: 250, y: 0, z: 0 },
      segmentParameter: 0.25,
      distanceCanonical: 0,
    }],
  };
}
function canonicalFixture() {
  const dataset = rawDataset();
  const graph = buildPipingPortTopologyGraph(dataset.sharedModel);
  const canonical = buildCanonicalTopologyFromWorkspaceDataset(dataset, graph, attachmentModel());
  return { dataset, graph, canonical };
}
function basis(topology) {
  return {
    sourceHash: topology.sourceHash,
    baseCanonicalHash: topology.canonicalTopologyHash,
    priorDraftHash: topology.canonicalTopologyHash,
    sessionVersion: 0,
  };
}
function editedTopology(base) {
  const support = base.supports[0];
  const host = base.edges.find((edge) => edge.componentKey === 'pipe:p1');
  const request = createTopologyEditCommandRequest({
    commandId: 'command:support-placement-round-trip',
    commandType: 'UPDATE_SUPPORT_PLACEMENT',
    basis: basis(base),
    payload: { supportId: support.id, hostEdgeId: host.id, stationMm: 600 },
  });
  const resolved = resolveTopologyEditCommand({
    request, canonicalTopology: base, authority: basis(base),
  });
  return buildTopologyEditCandidate({ canonicalTopology: base, resolvedCommand: resolved }).canonicalTopology;
}

test('certified support placement writeback preserves source station and reopens exact override', () => {
  const { dataset, canonical: base } = canonicalFixture();
  const baseSupport = base.supports.find((row) => row.entityId === 'support:s1');
  assert.equal(baseSupport.attachmentId, 'attachment:support:s1');
  assert.equal(baseSupport.attachmentSegmentParameter, 0.25);
  assert.deepEqual(baseSupport.origin, { x: 250, y: 0, z: 0 });
  assert.equal(baseSupport.originAuthority, 'ATTACHMENT_PROJECTED_POINT');

  const edited = editedTopology(base);
  const entities = applyCanonicalTopologyToWorkspaceEntities(
    dataset, base, edited, 'session:support-placement',
  );
  const support = entities.find((entity) => entity.entityId === 'support:s1');

  assert.deepEqual(support.properties.geometry.center, { x: 600, y: 0, z: 0 });
  assert.equal(support.properties.attributes.STATION_MM, 250);
  assert.equal(support.properties.attributes.VENDOR_TOKEN, 'KEEP-ME');
  assert.equal(support.properties.sourceAttributes.STATION_MM, 250);
  assert.equal(support.properties.attributes.TOPOLOGY_EDIT_SUPPORT_STATION_MM, 600);
  assert.equal(
    support.properties.attributes.TOPOLOGY_EDIT_SUPPORT_PLACEMENT_AUTHORITY,
    'CERTIFIED_TABLE_OVERRIDE',
  );

  const committed = withSharedModel({ ...dataset, version: 1, entities });
  const graph = buildPipingPortTopologyGraph(committed.sharedModel);
  const reopened = buildCanonicalTopologyFromWorkspaceDataset(committed, graph, attachmentModel());
  const reopenedSupport = reopened.supports.find((row) => row.entityId === 'support:s1');

  assert.equal(reopened.sourceHash, base.sourceHash);
  assert.equal(reopenedSupport.attachmentId, 'attachment:support:s1');
  assert.equal(reopenedSupport.attachmentSegmentParameter, 0.25);
  assert.equal(reopenedSupport.placementOverride.stationMm, 600);
  assert.equal(reopenedSupport.placementOverride.hostEdgeId, edited.supports[0].placementOverride.hostEdgeId);
  assert.deepEqual(reopenedSupport.placementOverride.origin, { x: 600, y: 0, z: 0 });
  assert.equal(
    reopenedSupport.placementOverride.placementHash,
    edited.supports[0].placementOverride.placementHash,
  );
  assert.equal(reopenedSupport.updatedByCommandId, 'command:support-placement-round-trip');
});

test('support placement reopen rejects tampered committed geometry', () => {
  const { dataset, canonical: base } = canonicalFixture();
  const edited = editedTopology(base);
  const entities = applyCanonicalTopologyToWorkspaceEntities(
    dataset, base, edited, 'session:support-placement',
  );
  const tampered = JSON.parse(JSON.stringify(entities));
  const support = tampered.find((entity) => entity.entityId === 'support:s1');
  support.properties.geometry.center.x = 601;
  const committed = withSharedModel({ ...dataset, version: 1, entities: tampered });
  const graph = buildPipingPortTopologyGraph(committed.sharedModel);
  assert.throws(
    () => buildCanonicalTopologyFromWorkspaceDataset(committed, graph, attachmentModel()),
    /support placement center differs from canonical host station/,
  );
});

test('support placement reopen rejects tampered audit hash without rewriting source custody', () => {
  const { dataset, canonical: base } = canonicalFixture();
  const edited = editedTopology(base);
  const entities = applyCanonicalTopologyToWorkspaceEntities(
    dataset, base, edited, 'session:support-placement',
  );
  const tampered = JSON.parse(JSON.stringify(entities));
  const support = tampered.find((entity) => entity.entityId === 'support:s1');
  support.properties.attributes.TOPOLOGY_EDIT_SUPPORT_PLACEMENT_HASH = 'sha256:tampered';
  const committed = withSharedModel({ ...dataset, version: 1, entities: tampered });
  const graph = buildPipingPortTopologyGraph(committed.sharedModel);
  assert.throws(
    () => buildCanonicalTopologyFromWorkspaceDataset(committed, graph, attachmentModel()),
    /support placement audit hash mismatch/,
  );
  assert.equal(dataset.sourceSnapshot.sourceByteHash, 'sha256:immutable-source-bytes');
});
