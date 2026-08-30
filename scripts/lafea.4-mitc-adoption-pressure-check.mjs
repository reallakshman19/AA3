import assert from 'node:assert/strict';
import { CANONICAL_UNITS } from '../src/core/local-shell/constants.js';
import {
  assembleExperimentalMitcPressureLoads,
} from '../src/core/local-shell/mitc-adoption-loads.js';
import {
  createExperimentalMitcAdoptionModel,
  MITC3_TOPOLOGY,
  MITC4_TOPOLOGY,
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
} from '../src/core/local-shell/mitc-adoption-model.js';
import { MITC3_FORMULATION } from '../src/core/local-shell/mitc3-element.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { flatNode, qualificationProfile } from './lafea.4-fixtures.mjs';

const pressure = 2;

// Rectangular Q4 independent hand oracle: uniform pressure on an affine
// rectangle gives p*A/4 at every node. This is a consequence of the integral,
// not the implementation rule used for general quads.
{
  const model = mitc4Model('MITC4-PRESSURE-RECTANGLE', [
    [0, 0], [100, 0], [100, 50], [0, 50],
  ]);
  const result = assembleExperimentalMitcPressureLoads(model, [load('P1')]);
  const contribution = result.contributions[0];
  const area = 100 * 50;
  const expectedWeight = area / 4;
  const expectedForce = pressure * area;

  contribution.nodalAreaWeights.forEach((value) => close(value, expectedWeight));
  contribution.nodalForces.forEach((force) => {
    close(force[0], 0); close(force[1], 0); close(force[2], pressure * expectedWeight);
  });
  vectorClose(result.appliedForce, [0, 0, expectedForce]);
  vectorClose(result.appliedMomentAboutOrigin, [25 * expectedForce, -50 * expectedForce, 0]);
  assert.equal(contribution.forceParity.accepted, true);
  assert.equal(contribution.momentParity.accepted, true);
  assert.equal(result.routeStatus, MITC_ADOPTION_ROUTE_STATUS);
  assert.equal(result.contributesToLafea4ProductionQualification, false);
  assert.equal(result.geometryConfiguration, 'UNDEFORMED_REFERENCE_CONFIGURATION');
  assert.equal(result.followerLoadAuthority, false);
  assertRotationalEntriesZero(result.forceVector);
  console.log('✅ MITC4 rectangle pressure reproduces the independent p*A/4 special case and centroid resultant.');
}

// Distorted planar Q4: the consistent nodal shares are NOT equal. For the
// polygon (0,0),(4,0),(5,3),(0,2), direct bilinear integration gives area
// weights [5/2,17/6,3,8/3]. Their sum is the independent shoelace area 11.
// The polygon centroid is (79/33,43/33), so the pressure resultant moment is
// centroid x [0,0,pA] = [86/3,-158/3,0] for p=2.
{
  const model = mitc4Model('MITC4-PRESSURE-DISTORTED', [
    [0, 0], [4, 0], [5, 3], [0, 2],
  ]);
  const result = assembleExperimentalMitcPressureLoads(model, [load('P1')]);
  const contribution = result.contributions[0];
  const expectedWeights = [5 / 2, 17 / 6, 3, 8 / 3];
  contribution.nodalAreaWeights.forEach((value, index) => close(value, expectedWeights[index]));
  close(contribution.representedArea, 11);
  vectorClose(result.appliedForce, [0, 0, 22]);
  vectorClose(result.appliedMomentAboutOrigin, [86 / 3, -158 / 3, 0]);
  assert.notEqual(contribution.nodalAreaWeights[0], contribution.nodalAreaWeights[2]);
  assert.equal(contribution.forceParity.accepted, true);
  assert.equal(contribution.momentParity.accepted, true);
  console.log('✅ Distorted MITC4 uses true consistent Q4 nodal shares and matches independent polygon area/centroid force-moment oracles.');
}

// Reversing pressure sense must reverse force AND first moment while retaining
// the same reference geometry and nodal area weights.
{
  const model = mitc4Model('MITC4-PRESSURE-SENSE', [
    [0, 0], [4, 0], [5, 3], [0, 2],
  ]);
  const forward = assembleExperimentalMitcPressureLoads(model, [load('P1')]);
  const reverse = assembleExperimentalMitcPressureLoads(model, [
    load('P1', 'OPPOSITE_ELEMENT_NORMAL'),
  ]);
  forward.contributions[0].nodalAreaWeights.forEach((value, index) => {
    close(reverse.contributions[0].nodalAreaWeights[index], value);
  });
  vectorClose(reverse.appliedForce, forward.appliedForce.map((value) => -value));
  vectorClose(
    reverse.appliedMomentAboutOrigin,
    forward.appliedMomentAboutOrigin.map((value) => -value),
  );
  console.log('✅ Opposite pressure sense reverses both resultant force and moment without changing reference geometry.');
}

// MITC3 independent hand oracle: a right triangle of base 100 and height 50
// has A=2500, so each consistent node share is A/3 and total force is p*A.
{
  const nodes = [flatNode('A', 0, 0), flatNode('B', 100, 0), flatNode('C', 0, 50)];
  const model = createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'MITC3-PRESSURE-TRIANGLE',
    nodes,
    elements: [{
      elementId: 'T1', formulation: MITC3_FORMULATION, topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C'], materialId: 'MAT', thickness: 2, sourceReference: 'T1-SRC',
    }],
  }));
  const result = assembleExperimentalMitcPressureLoads(model, [load('P1', 'ALONG_ELEMENT_NORMAL', 'T1')]);
  const contribution = result.contributions[0];
  contribution.nodalAreaWeights.forEach((value) => close(value, 2500 / 3));
  vectorClose(result.appliedForce, [0, 0, 5000]);
  vectorClose(result.appliedMomentAboutOrigin, [250000 / 3, -500000 / 3, 0]);
  assert.equal(contribution.forceParity.accepted, true);
  assert.equal(contribution.momentParity.accepted, true);
  console.log('✅ MITC3 pressure reproduces the exact p*A/3 TRI3 consistent-load hand oracle.');
}

// Fail closed: no negative pressure magnitude, no unresolved element and no
// duplicate pressure application on one element in a single assembled set.
{
  const model = mitc4Model('MITC4-PRESSURE-NEGATIVE-CONTROLS', [
    [0, 0], [4, 0], [5, 3], [0, 2],
  ]);
  assert.throws(
    () => assembleExperimentalMitcPressureLoads(model, [{ ...load('P1'), pressure: -1 }]),
    /must be non-negative/,
  );
  assert.throws(
    () => assembleExperimentalMitcPressureLoads(model, [load('P1', 'ALONG_ELEMENT_NORMAL', 'UNKNOWN')]),
    /Unresolved MITC pressure element UNKNOWN/,
  );
  assert.throws(
    () => assembleExperimentalMitcPressureLoads(model, [load('P1'), load('P2')]),
    /pressure application on element/,
  );
  console.log('✅ MITC pressure adoption boundary fails closed on invalid magnitude, target and duplicate application.');
}

console.log('\n✅ LAFEA.4 experimental MITC pressure adoption check passed.');

function mitc4Model(modelIdentity, points) {
  const ids = ['A', 'B', 'C', 'D'];
  const nodes = points.map(([x, y], index) => flatNode(ids[index], x, y));
  return createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity,
    nodes,
    elements: [{
      elementId: 'Q1', formulation: MITC4_FORMULATION, topology: MITC4_TOPOLOGY,
      nodeIds: ids, materialId: 'MAT', thickness: 2, sourceReference: 'Q1-SRC',
    }],
  }));
}

function load(pressureLoadId, sense = 'ALONG_ELEMENT_NORMAL', elementId = 'Q1') {
  return {
    pressureLoadId,
    elementId,
    pressure,
    sense,
    sourceReference: `${pressureLoadId}-SRC`,
  };
}

function adoptionSource({ modelIdentity, nodes, elements }) {
  return {
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity,
    modelVersion: '1',
    sourceAncestry: ['fixture/local-shell-mitc-adoption-pressure/v1'],
    units: { ...CANONICAL_UNITS },
    materials: [{
      materialId: 'MAT', elasticModulus: 200000, poissonRatio: 0.3, sourceReference: 'MAT-SRC',
    }],
    nodes,
    elements,
    qualificationProfile: qualificationProfile(),
    mitcQualification: {
      quadPlanarity: { absolute: 1e-9, relative: 1e-8 },
      rigidBodyEnergy: { absolute: 1e-9, relative: 1e-9 },
    },
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: false,
  };
}

function assertRotationalEntriesZero(vector) {
  vector.forEach((value, index) => {
    if (index % 5 === 3 || index % 5 === 4) close(value, 0);
  });
}

function vectorClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => close(value, expected[index]));
}

function close(actual, expected, tolerance = 1e-9) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `${actual} != ${expected}`,
  );
}
