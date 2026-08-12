import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveAllSupportRestraintGeometry,
  projectSupportGeometryToViewport,
} from '../src/workspace/topology-edit/support-restraint-family.js';
import {
  TopologyEditSupportViewportBackend,
} from '../src/workspace/topology-edit/topology-edit-support-viewport-backend.js';

const CONFIGURATION = {
  supportMarkerSize: 70,
  pickingRadius: 28,
  cameraFitMargin: 1.25,
  clickTimingMs: 300,
  doubleClickTimingMs: 300,
  clickTravelTolerancePx: 5,
  zoomRate: 1,
  navigationSensitivity: 1,
  perspectiveFovDeg: 45,
  meshRadialSegments: 16,
  cameraNearMm: 0.1,
  cameraFarMm: 1_000_000,
};

const TOPOLOGY = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({ id: 'node:a', position: Object.freeze({ x: 0, y: 0, z: 0 }) }),
    Object.freeze({ id: 'node:b', position: Object.freeze({ x: 1000, y: 0, z: 0 }) }),
  ]),
  edges: Object.freeze([
    Object.freeze({
      id: 'edge:pipe-1', componentKey: 'P-1', fromNodeId: 'node:a', toNodeId: 'node:b',
      outsideDiameterMm: 100,
    }),
  ]),
  supports: Object.freeze([
    Object.freeze({
      id: 'support:S-007', entityId: 'S-007', hostEntityId: 'P-1',
      origin: Object.freeze({ x: 500, y: 0, z: 0 }),
      restraint: Object.freeze({
        restraintId: 'restraint:guide-1', supportType: 'GUIDE', gapMm: 2,
      }),
    }),
  ]),
});

test('rich support Preview materializes the exact permanent guide geometry and pick identity', () => {
  const overlays = deriveAllSupportRestraintGeometry({
    canonicalTopology: TOPOLOGY,
    verticalAxis: 'Z',
  });
  const projection = projectSupportGeometryToViewport(overlays, { markerSizeMm: 70 });
  const backend = new TopologyEditSupportViewportBackend({ navigationConfiguration: CONFIGURATION });

  backend.renderProjection(backend.groups.supportGroup, projection, 0x22d3ee, 1, 70);
  const applied = pickGeometryManifest(backend.groups.supportGroup);
  assert.ok(applied.some((row) => row.pick.partRole === 'guide-rail-positive'));
  assert.ok(applied.some((row) => row.pick.partRole === 'guide-rail-negative'));

  backend.renderGhost({
    elements: [],
    segments: [],
    primitives: [],
    engineeringSupportProjection: projection,
  }, 70);
  const ghost = pickGeometryManifest(backend.groups.ghostGroup);

  assert.deepEqual(ghost, applied);
  assert.equal(backend.groups.ghostGroup.userData.nonPickable, true);
  backend.destroy();
});

function pickGeometryManifest(group) {
  const rows = [];
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (object === group || !object.geometry) return;
    const direct = object.userData?.pickTarget ?? null;
    const table = Array.isArray(object.userData?.pickTable) ? object.userData.pickTable : [];
    const picks = [direct, ...table].filter(Boolean);
    if (!picks.length) return;
    object.geometry.computeBoundingBox?.();
    const bounds = object.geometry.boundingBox;
    const shape = {
      geometryType: object.geometry.type,
      position: vector(object.position),
      quaternion: quaternion(object.quaternion),
      scale: vector(object.scale),
      bounds: bounds ? { min: vector(bounds.min), max: vector(bounds.max) } : null,
    };
    const fallbackPartRole = object.userData?.partRole ?? '';
    for (const target of picks) {
      rows.push({
        pick: {
          objectKind: target.objectKind ?? '',
          objectId: target.objectId ?? '',
          partRole: target.partRole || fallbackPartRole || '',
          supportId: target.supportId ?? '',
          restraintId: target.restraintId ?? '',
          restraintFamily: target.restraintFamily ?? '',
        },
        shape,
      });
    }
  });
  return rows.sort((left, right) => JSON.stringify(left.pick).localeCompare(JSON.stringify(right.pick)));
}

function vector(value) {
  return [value.x, value.y, value.z].map(round);
}

function quaternion(value) {
  return [value.x, value.y, value.z, value.w].map(round);
}

function round(value) {
  return Number(Number(value).toFixed(9));
}
