import assert from 'node:assert/strict';
import {
  SUPPORT_ACTION_TRIAD_REASON,
  SUPPORT_ACTION_TRIAD_STATUS,
  computeSupportActionTriadSemanticHash,
  projectSupportActionTriad,
  requireSupportActionTriad,
} from '../src/core/linear-piping-support-action-triad/index.js';

const TOLERANCE = 1e-10;
const vector = (x, y, z) => ({ x, y, z });

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to equal ${expected} within ${tolerance}.`,
  );
}

const horizontalX = projectSupportActionTriad({
  forceGlobal: vector(10, 20, 30),
  tangentGlobal: vector(4, 0, 0),
  upGlobal: vector(0, 0, 9),
  parallelTolerance: TOLERANCE,
});
assert.equal(horizontalX.status, SUPPORT_ACTION_TRIAD_STATUS.RESOLVED);
assert.equal(horizontalX.reason, null);
assert.deepEqual(horizontalX.axialUnit, vector(1, 0, 0));
assert.deepEqual(horizontalX.lateralUnit, vector(0, 1, 0));
assert.deepEqual(horizontalX.verticalUnit, vector(0, 0, 1));
assert.equal(horizontalX.fAxial, 10);
assert.equal(horizontalX.fLateral, 20);
assert.equal(horizontalX.fVertical, 30);

const horizontalY = projectSupportActionTriad({
  forceGlobal: vector(10, 20, 30),
  tangentGlobal: vector(0, 2, 0),
  upGlobal: vector(0, 0, 1),
  parallelTolerance: TOLERANCE,
});
assert.deepEqual(horizontalY.lateralUnit, vector(-1, 0, 0));
assert.deepEqual(horizontalY.verticalUnit, vector(0, 0, 1));
assert.equal(horizontalY.fAxial, 20);
assert.equal(horizontalY.fLateral, -10);
assert.equal(horizontalY.fVertical, 30);

// Repository-qualified local-axis fixture geometry: (0,0,0) -> (0,0,5).
// Here axial and global up coincide, so a three-component engineering triad
// does not exist even though the frame-element package can manufacture e2/e3.
const verticalRiser = projectSupportActionTriad({
  forceGlobal: vector(10, 20, 30),
  tangentGlobal: vector(0, 0, 5),
  upGlobal: vector(0, 0, 1),
  parallelTolerance: TOLERANCE,
});
assert.equal(verticalRiser.status, SUPPORT_ACTION_TRIAD_STATUS.BLOCKED_AXIS_DEGENERATE);
assert.equal(verticalRiser.reason, SUPPORT_ACTION_TRIAD_REASON.AXIAL_PARALLEL_TO_VERTICAL);
assert.equal(verticalRiser.fAxial, 30);
assert.equal(verticalRiser.fLateral, null);
assert.equal(verticalRiser.fVertical, null);
assert.equal(verticalRiser.lateralUnit, null);
assert.equal(verticalRiser.verticalUnit, null);

const downwardRiser = projectSupportActionTriad({
  forceGlobal: vector(10, 20, 30),
  tangentGlobal: vector(0, 0, -5),
  upGlobal: vector(0, 0, 1),
  parallelTolerance: TOLERANCE,
});
assert.equal(downwardRiser.status, SUPPORT_ACTION_TRIAD_STATUS.BLOCKED_AXIS_DEGENERATE);
assert.equal(downwardRiser.fAxial, -30);

const oblique = projectSupportActionTriad({
  forceGlobal: vector(2, 3, 5),
  tangentGlobal: vector(1, 0, 1),
  upGlobal: vector(0, 0, 1),
  parallelTolerance: TOLERANCE,
});
assert.equal(oblique.status, SUPPORT_ACTION_TRIAD_STATUS.RESOLVED);
close(oblique.fAxial, 7 / Math.sqrt(2));
assert.equal(oblique.fLateral, 3);
close(oblique.fVertical, 3 / Math.sqrt(2));

const almostVertical = projectSupportActionTriad({
  forceGlobal: vector(1, 2, 3),
  tangentGlobal: vector(Math.sqrt(2e-10), 0, 1),
  upGlobal: vector(0, 0, 1),
  parallelTolerance: TOLERANCE,
});
assert.equal(almostVertical.status, SUPPORT_ACTION_TRIAD_STATUS.BLOCKED_AXIS_DEGENERATE);

assert.throws(
  () => projectSupportActionTriad({
    forceGlobal: vector(0, 0, 0),
    tangentGlobal: vector(0, 0, 0),
    upGlobal: vector(0, 0, 1),
    parallelTolerance: TOLERANCE,
  }),
  (error) => error?.code === 'SUPPORT_ACTION_TRIAD_DIRECTION_INVALID',
);
assert.throws(
  () => projectSupportActionTriad({
    forceGlobal: vector(0, 0, 0),
    tangentGlobal: vector(1, 0, 0),
    upGlobal: vector(0, 0, 1),
    parallelTolerance: 0,
  }),
  (error) => error?.code === 'SUPPORT_ACTION_TRIAD_TOLERANCE_INVALID',
);

assert.ok(Object.isFrozen(horizontalX));
assert.ok(Object.isFrozen(horizontalX.forceGlobal));
requireSupportActionTriad(horizontalX);

const tampered = { ...horizontalX, fVertical: 999 };
assert.throws(
  () => requireSupportActionTriad(tampered),
  (error) => error?.code === 'SUPPORT_ACTION_TRIAD_HASH_MISMATCH',
);

const coherentlyRehashed = { ...horizontalX, fVertical: 999, semanticHash: '' };
coherentlyRehashed.semanticHash = computeSupportActionTriadSemanticHash(coherentlyRehashed);
assert.throws(
  () => requireSupportActionTriad(coherentlyRehashed),
  (error) => error?.code === 'SUPPORT_ACTION_TRIAD_CONTENT_MISMATCH',
);

console.log('linear-piping-support-action-triad-check: PASS');
