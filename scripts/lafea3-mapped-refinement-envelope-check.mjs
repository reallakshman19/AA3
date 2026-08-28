#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { qualifyRefinedMeshAdjacentSizeRatio } from '../src/core/lafea-meshing/refinement-fields.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';
import {
  LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY,
  buildLafea3MappedRetainedRefinementMesh,
} from '../src/workspace/lafea-retained-mesh-refinement-grading.js';

const GLOBAL_TARGET = 30;
const GROWTH_MAX = 1.5;
const LOCAL_TARGETS = Object.freeze([22.5, 15, 11.25, 7.5]);
const ELEMENT_FAMILIES = Object.freeze(['T3', 'T6']);
const TARGET_CASES = Object.freeze([
  Object.freeze({ id: 'CENTER', u: 0.50, v: 0.50 }),
  Object.freeze({ id: 'NEAR_EDGE', u: 0.15, v: 0.50 }),
  Object.freeze({ id: 'NEAR_CORNER', u: 0.15, v: 0.15 }),
]);
const POSITIVE_GEOMETRIES = Object.freeze([
  Object.freeze({ id: 'ROTATED_30', lengthA: 200, lengthB: 120, includedAngleDeg: 90, rotationDeg: 30 }),
  Object.freeze({ id: 'SHEAR_75', lengthA: 200, lengthB: 120, includedAngleDeg: 75, rotationDeg: 0 }),
]);
const TOLERANCE = 1e-10;

assert.equal(LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.construction, 'SOURCE_AFFINE_BALANCED_METRIC_GRID_V1');
assert.equal(LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.adjacentSizeRatioMax, GROWTH_MAX);
assert.equal(LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.minimumIncludedAngleDeg, 75);
assert.equal(LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.minimumTargetParametricOffset, 0.15);
assert.deepEqual(LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.elementFamilies, ['T3', 'T6']);

const rows = [];
for (const family of ELEMENT_FAMILIES) {
  const profile = meshProfileFor(family);
  for (const geometryCase of POSITIVE_GEOMETRIES) {
    const geometry = affineGeometry(geometryCase);
    for (const localTarget of LOCAL_TARGETS) {
      for (const targetCase of TARGET_CASES) {
        const target = mappedPoint(geometryCase, targetCase.u, targetCase.v);
        const result = buildLafea3MappedRetainedRefinementMesh({
          geometry,
          targets: [target],
          elementFamily: family,
          localTargetElementLength: localTarget,
          globalTargetElementLength: GLOBAL_TARGET,
          adjacentSizeRatioMax: GROWTH_MAX,
          producerRevision: 'PR1270-MAPPED-ENVELOPE',
        });
        const quality = qualifyLafeaAnalysisMesh('LAFEA.3', result.mesh, profile);
        const adjacency = qualifyRefinedMeshAdjacentSizeRatio(result.mesh, GROWTH_MAX);
        assert.notEqual(quality.worstStatus, 'BLOCK', `${family}/${geometryCase.id}/${localTarget}/${targetCase.id} quality`);
        assert.equal(adjacency.qualification, 'PASS', `${family}/${geometryCase.id}/${localTarget}/${targetCase.id} adjacency`);
        assert.equal(adjacency.violatingAdjacencyCount, 0);
        assert.ok(
          result.construction.maximumAxisIntervalRatio <= GROWTH_MAX + TOLERANCE,
          `${family}/${geometryCase.id}/${localTarget}/${targetCase.id} mapped-axis growth`,
        );

        const row = Object.freeze({
          family,
          geometryId: geometryCase.id,
          localTarget,
          targetCase: targetCase.id,
          nodeCount: result.mesh.nodes.length,
          elementCount: result.mesh.elements.length,
          maximumObservedAdjacency: adjacency.maximumObserved,
          maximumAxisIntervalRatio: result.construction.maximumAxisIntervalRatio,
          maximumAspectRatio: gateValue(quality, 'ASPECT_RATIO'),
          minimumScaledJacobian: gateValue(quality, 'SCALED_JACOBIAN'),
          minimumAngleDeg: gateValue(quality, 'MINIMUM_ANGLE_DEGREES'),
        });
        rows.push(row);

        if (geometryCase.id === 'ROTATED_30') {
          const controlCase = { ...geometryCase, id: 'ROTATED_0_CONTROL', rotationDeg: 0 };
          const control = buildLafea3MappedRetainedRefinementMesh({
            geometry: affineGeometry(controlCase),
            targets: [mappedPoint(controlCase, targetCase.u, targetCase.v)],
            elementFamily: family,
            localTargetElementLength: localTarget,
            globalTargetElementLength: GLOBAL_TARGET,
            adjacentSizeRatioMax: GROWTH_MAX,
            producerRevision: 'PR1270-MAPPED-ROTATION-CONTROL',
          });
          const controlQuality = qualifyLafeaAnalysisMesh('LAFEA.3', control.mesh, profile);
          const controlAdjacency = qualifyRefinedMeshAdjacentSizeRatio(control.mesh, GROWTH_MAX);
          assertClose(adjacency.maximumObserved, controlAdjacency.maximumObserved, 'rotation adjacency invariance');
          assertClose(gateValue(quality, 'ASPECT_RATIO'), gateValue(controlQuality, 'ASPECT_RATIO'), 'rotation aspect-ratio invariance');
          assertClose(gateValue(quality, 'SCALED_JACOBIAN'), gateValue(controlQuality, 'SCALED_JACOBIAN'), 'rotation scaled-Jacobian invariance');
          assertClose(gateValue(quality, 'MINIMUM_ANGLE_DEGREES'), gateValue(controlQuality, 'MINIMUM_ANGLE_DEGREES'), 'rotation minimum-angle invariance');
        }
      }
    }
  }
}

assert.equal(rows.length, 48, 'positive mapped-refinement qualification matrix must remain 48 cases');
assert.ok(Math.max(...rows.map((row) => row.maximumObservedAdjacency)) <= GROWTH_MAX + TOLERANCE);
assert.ok(Math.min(...rows.map((row) => row.minimumScaledJacobian)) > 0.2);

const negativeCases = [
  {
    id: 'ANGLE_55',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ANGLE_NOT_QUALIFIED',
    run: () => build({ geometryCase: { id: 'ANGLE_55', lengthA: 200, lengthB: 120, includedAngleDeg: 55, rotationDeg: 0 } }),
  },
  {
    id: 'ANGLE_65_CONSERVATIVE_BLOCK',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ANGLE_NOT_QUALIFIED',
    run: () => build({ geometryCase: { id: 'ANGLE_65', lengthA: 200, lengthB: 120, includedAngleDeg: 65, rotationDeg: 0 } }),
  },
  {
    id: 'SIDE_RATIO_4',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_SOURCE_GEOMETRY_ASPECT_NOT_QUALIFIED',
    run: () => build({ geometryCase: { id: 'SIDE_RATIO_4', lengthA: 400, lengthB: 100, includedAngleDeg: 90, rotationDeg: 0 } }),
  },
  {
    id: 'TARGET_OFFSET_0_14',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_TARGET_LOCATION_NOT_QUALIFIED',
    run: () => build({ targetCase: { id: 'OUTSIDE_TARGET_ENVELOPE', u: 0.14, v: 0.50 } }),
  },
  {
    id: 'MULTIPLE_TARGETS',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_MAPPED_SINGLE_TARGET_ONLY',
    run: () => {
      const geometryCase = POSITIVE_GEOMETRIES[0];
      return buildLafea3MappedRetainedRefinementMesh({
        geometry: affineGeometry(geometryCase),
        targets: [mappedPoint(geometryCase, 0.5, 0.5), mappedPoint(geometryCase, 0.6, 0.6)],
        elementFamily: 'T3', localTargetElementLength: 15,
        globalTargetElementLength: GLOBAL_TARGET, adjacentSizeRatioMax: GROWTH_MAX,
        producerRevision: 'PR1270-MAPPED-NEGATIVE',
      });
    },
  },
  {
    id: 'UNQUALIFIED_GROWTH_1_4',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_MAPPED_GROWTH_NOT_QUALIFIED',
    run: () => build({ adjacentSizeRatioMax: 1.4 }),
  },
  {
    id: 'Q8_FAMILY',
    expectedCode: 'LAFEA3_RETAINED_REFINEMENT_MAPPED_FAMILY_NOT_QUALIFIED',
    run: () => build({ elementFamily: 'Q8' }),
  },
];
for (const negative of negativeCases) {
  assert.throws(negative.run, (error) => error?.code === negative.expectedCode, negative.id);
}

const receipt = Object.freeze({
  schema: 'lafea3-mapped-refinement-envelope-check/v1',
  status: 'PASS',
  construction: LAFEA3_RETAINED_REFINEMENT_MAPPED_POLICY.construction,
  positiveCases: rows.length,
  elementFamilies: ELEMENT_FAMILIES,
  localTargetRatios: LOCAL_TARGETS.map((value) => value / GLOBAL_TARGET),
  positiveGeometries: POSITIVE_GEOMETRIES.map((row) => row.id),
  targetCases: TARGET_CASES.map((row) => row.id),
  maximumObservedAdjacency: Math.max(...rows.map((row) => row.maximumObservedAdjacency)),
  maximumAxisIntervalRatio: Math.max(...rows.map((row) => row.maximumAxisIntervalRatio)),
  maximumAspectRatio: Math.max(...rows.map((row) => row.maximumAspectRatio)),
  minimumScaledJacobian: Math.min(...rows.map((row) => row.minimumScaledJacobian)),
  minimumAngleDeg: Math.min(...rows.map((row) => row.minimumAngleDeg)),
  negativeCases: negativeCases.map((row) => `${row.id}:${row.expectedCode}`),
  thresholdsChanged: false,
  actualMeshAcceptance: 'INDEPENDENT_QUALITY_PLUS_SHARED_EDGE_ADJACENCY',
});
console.log(JSON.stringify(receipt, null, 2));

function build({
  geometryCase = POSITIVE_GEOMETRIES[0],
  targetCase = TARGET_CASES[0],
  elementFamily = 'T3',
  adjacentSizeRatioMax = GROWTH_MAX,
} = {}) {
  return buildLafea3MappedRetainedRefinementMesh({
    geometry: affineGeometry(geometryCase),
    targets: [mappedPoint(geometryCase, targetCase.u, targetCase.v)],
    elementFamily,
    localTargetElementLength: 15,
    globalTargetElementLength: GLOBAL_TARGET,
    adjacentSizeRatioMax,
    producerRevision: 'PR1270-MAPPED-NEGATIVE',
  });
}

function affineGeometry({ id, lengthA, lengthB, includedAngleDeg, rotationDeg }) {
  const origin = { x: 17, y: -23 };
  const aAngle = rotationDeg * Math.PI / 180;
  const bAngle = (rotationDeg + includedAngleDeg) * Math.PI / 180;
  const a = { x: lengthA * Math.cos(aAngle), y: lengthA * Math.sin(aAngle) };
  const b = { x: lengthB * Math.cos(bAngle), y: lengthB * Math.sin(bAngle) };
  const vertices = [
    { vertexId: 'V1', ...origin },
    { vertexId: 'V2', x: origin.x + a.x, y: origin.y + a.y },
    { vertexId: 'V3', x: origin.x + a.x + b.x, y: origin.y + a.y + b.y },
    { vertexId: 'V4', x: origin.x + b.x, y: origin.y + b.y },
  ];
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3',
    geometryId: `PR1270-${id}`, coordinateSystemId: 'GLOBAL', lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1', vertices,
    segments: [line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'), line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1')],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}
function mappedPoint(geometryCase, uFraction, vFraction) {
  const origin = { x: 17, y: -23 };
  const aAngle = geometryCase.rotationDeg * Math.PI / 180;
  const bAngle = (geometryCase.rotationDeg + geometryCase.includedAngleDeg) * Math.PI / 180;
  return {
    x: origin.x + uFraction * geometryCase.lengthA * Math.cos(aAngle)
      + vFraction * geometryCase.lengthB * Math.cos(bAngle),
    y: origin.y + uFraction * geometryCase.lengthA * Math.sin(aAngle)
      + vFraction * geometryCase.lengthB * Math.sin(bAngle),
  };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
function meshProfileFor(continuumElement) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `PR1270_ENVELOPE_${continuumElement}`,
    sourceRevision: 'PR1270', semanticHash: undefined,
    fields: {
      ...defaultProfileFields(PROFILE_KINDS.MESH),
      continuumElement,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: GLOBAL_TARGET,
    },
  });
}
function gateValue(quality, metric) {
  const value = quality.gateResults.find((row) => row.metric === metric)?.value;
  assert.ok(Number.isFinite(value), `${metric} must be finite`);
  return value;
}
function assertClose(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= TOLERANCE * Math.max(1, Math.abs(expected)),
    `${label}: expected ${expected}, received ${actual}`,
  );
}
