import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { finalizeCanonicalTopology } from '../src/workspace/topology-edit/topology-edit-canonical-state.js';
import {
  applyTopologyEditAuthoredBendProjection,
} from '../src/workspace/topology-edit/authoring/topology-edit-authored-bend-geometry.js';
import {
  createVisualPrimitive,
} from '../src/workspace/topology-edit/visual-geometry-contract.js';
import {
  materializeTopologyEditPrimitive,
} from '../src/workspace/topology-edit/topology-edit-primitive-geometry.js';

function canonical() {
  return finalizeCanonicalTopology({
    schema: 'topology-edit-canonical-topology/v1',
    datasetId: 'typed-bend',
    datasetVersion: 1,
    sourceHash: 'source:typed-bend',
    topologyGraphHash: 'graph:typed-bend',
    nodes: [
      { id: 'node:left', position: { x: -500, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:corner', position: { x: 0, y: 0, z: 0 }, portKeys: [] },
      { id: 'node:up', position: { x: 0, y: 500, z: 0 }, portKeys: [] },
    ],
    edges: [
      {
        id: 'edge:left', fromNodeId: 'node:left', toNodeId: 'node:corner',
        diameterMm: 100, outsideDiameterMm: 100, entityType: 'PIPE',
        createdByCommandId: 'command:left',
      },
      {
        id: 'edge:up', fromNodeId: 'node:corner', toNodeId: 'node:up',
        diameterMm: 100, outsideDiameterMm: 100, entityType: 'PIPE',
        createdByCommandId: 'command:up',
      },
    ],
    bends: [{
      id: 'bend:corner',
      nodeId: 'node:corner',
      edgeIds: ['edge:left', 'edge:up'],
      position: { x: 0, y: 0, z: 0 },
      radiusMm: 100,
      angleDeg: 90,
      radiusAuthority: 'TEST',
      createdByCommandId: 'command:bend',
    }],
    junctions: [], supports: [], boundaries: [], rigids: [],
  });
}

function pipePrimitive(id, start, end) {
  return createVisualPrimitive({
    primitiveId: `visual:${id}`,
    canonicalEntityId: id,
    canonicalType: 'PIPE',
    modelRole: 'DRAFT',
    partRole: 'body',
    kind: 'PIPE_CYLINDER',
    parameters: { start, end, outsideDiameterMm: 100, radialSegments: 16 },
  });
}

function projection() {
  return Object.freeze({
    elements: Object.freeze([]),
    segments: Object.freeze([
      Object.freeze({
        id: 'segment:left', entityId: 'edge:left', kind: 'PIPE',
        start: { x: -500, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 },
        radiusMm: 50, pickTarget: { objectId: 'edge:left' },
      }),
      Object.freeze({
        id: 'segment:up', entityId: 'edge:up', kind: 'PIPE',
        start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 500, z: 0 },
        radiusMm: 50, pickTarget: { objectId: 'edge:up' },
      }),
    ]),
    primitives: Object.freeze([
      pipePrimitive('edge:left', { x: -500, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
      pipePrimitive('edge:up', { x: 0, y: 0, z: 0 }, { x: 0, y: 500, z: 0 }),
    ]),
  });
}

test('authored bend projection trims typed pipes and appends one exact typed elbow', () => {
  const before = projection();
  const result = applyTopologyEditAuthoredBendProjection(before, canonical());

  assert.equal(before.primitives.length, 2);
  assert.deepEqual(before.primitives[0].parameters.end, { x: 0, y: 0, z: 0 });
  assert.equal(result.primitives.length, 3);

  const left = result.primitives.find((row) => row.canonicalEntityId === 'edge:left');
  const up = result.primitives.find((row) => row.canonicalEntityId === 'edge:up');
  const bend = result.primitives.find((row) => row.canonicalEntityId === 'bend:corner');
  assert.ok(Math.abs(left.parameters.end.x + 100) < 1e-9);
  assert.ok(Math.abs(left.parameters.end.y) < 1e-9);
  assert.ok(Math.abs(up.parameters.start.x) < 1e-9);
  assert.ok(Math.abs(up.parameters.start.y - 100) < 1e-9);
  assert.ok(bend);
  assert.equal(bend.kind, 'ELBOW_ARC');
  assert.equal(bend.partRole, 'authored-elbow-arc');
  assert.equal(bend.canonicalType, 'ELBOW');
  assert.equal(bend.parameters.centerlineRadiusMm, 100);
  assert.equal(bend.parameters.outsideDiameterMm, 100);
  assert.ok(Math.abs(bend.parameters.angleRad - Math.PI / 2) < 1e-9);
  assert.match(bend.primitiveId, /^visual:fnv1a64:[a-f0-9]{16}$/u);

  const material = new THREE.MeshBasicMaterial();
  try {
    for (const primitive of [left, up, bend]) {
      const rendered = materializeTopologyEditPrimitive(primitive, {
        material,
        radialSegments: 16,
        markerSize: 10,
        pickUserData: {
          canonicalId: primitive.canonicalEntityId,
          pickTarget: {
            objectKind: 'component',
            objectId: primitive.canonicalEntityId,
            partRole: primitive.partRole,
          },
        },
      });
      assert.equal(rendered.bounds.isEmpty(), false);
      rendered.object.traverse((object) => object.geometry?.dispose?.());
    }
  } finally {
    material.dispose();
  }

  const repeated = applyTopologyEditAuthoredBendProjection(result, canonical());
  assert.equal(repeated.primitives.length, 3);
  assert.equal(
    repeated.primitives.filter((row) => row.partRole === 'authored-elbow-arc').length,
    1,
  );
  assert.equal(
    repeated.primitives.find((row) => row.canonicalEntityId === 'bend:corner').primitiveId,
    bend.primitiveId,
  );
});
