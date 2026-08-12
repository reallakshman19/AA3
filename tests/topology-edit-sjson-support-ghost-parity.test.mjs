import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TopologyEditSjsonGovernedViewportBackend,
} from '../src/workspace/topology-edit/topology-edit-sjson-governed-viewport-backend-v2.js';
import {
  TOPOLOGY_EDIT_SUPPORT_RENDER_STYLES,
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

const PROJECTION = Object.freeze({
  renderStyle: TOPOLOGY_EDIT_SUPPORT_RENDER_STYLES.TOPO_VALIDATOR_COMPACT,
  compactMarkerRadiusMm: 37.8,
  compactMarkerDisplayScale: 3,
  glyphMetrics: { placementAuthority: 'HOST_OD_HALF_CONTACT_PLUS_TWO_THIRDS_OD_GLYPH_V1' },
  elements: Object.freeze([{
    id: 'support:1', entityId: 'support:1', type: 'SUPPORT', x: 100, y: 0, z: 0,
    supportFamily: 'GUIDE', colorInt: 0x4ade80,
    pickTarget: { objectKind: 'support', objectId: 'support:1', supportId: 'support:1' },
  }]),
  segments: Object.freeze([{
    id: 'restraint:1:direction', entityId: 'restraint:1', type: 'RESTRAINT_DIRECTION',
    start: { x: 100, y: 70, z: 0 }, end: { x: 100, y: 50, z: 0 },
    colorInt: 0x4ade80,
    directionalArrows: Object.freeze([
      Object.freeze({ polarity: 'POSITIVE', start: { x: 100, y: 70, z: 0 }, end: { x: 100, y: 50, z: 0 } }),
      Object.freeze({ polarity: 'NEGATIVE', start: { x: 100, y: -70, z: 0 }, end: { x: 100, y: -50, z: 0 } }),
    ]),
    pickTarget: {
      objectKind: 'restraint', objectId: 'restraint:1', supportId: 'support:1',
      restraintId: 'restraint:1', restraintFamily: 'GUIDE',
    },
  }]),
  glyphOverlays: Object.freeze([]),
});

test('governed support Preview uses the same pick-proxy geometry as permanent Apply projection', () => {
  const backend = new TopologyEditSjsonGovernedViewportBackend({ navigationConfiguration: CONFIGURATION });
  backend.renderProjection(backend.groups.supportGroup, PROJECTION, 0x22d3ee, 1, 70);
  const applied = pickGeometryManifest(backend.groups.supportGroup);

  backend.renderGhost({
    elements: [],
    segments: [],
    primitives: [],
    governedSupportProjection: PROJECTION,
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
    const pick = object.userData?.pickTarget;
    if (!pick?.objectId || !object.geometry) return;
    object.geometry.computeBoundingBox?.();
    rows.push({
      pick: {
        objectKind: pick.objectKind ?? '',
        objectId: pick.objectId ?? '',
        supportId: pick.supportId ?? '',
        restraintId: pick.restraintId ?? '',
        restraintFamily: pick.restraintFamily ?? '',
      },
      geometryType: object.geometry.type,
      position: vector(object.position),
      quaternion: quaternion(object.quaternion),
      bounds: object.geometry.boundingBox
        ? { min: vector(object.geometry.boundingBox.min), max: vector(object.geometry.boundingBox.max) }
        : null,
    });
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
