#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { qualifyRefinedMeshAdjacentSizeRatio } from '../src/core/lafea-meshing/refinement-fields.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';

const GLOBAL = 30;
const GROWTH = 1.5;
const families = ['T3'];
const localTargets = [22.5, 15, 11.25, 7.5];
const targetCases = [
  { name: 'CENTER', u: 0.50, v: 0.50 },
  { name: 'NEAR_EDGE', u: 0.15, v: 0.50 },
  { name: 'NEAR_CORNER', u: 0.15, v: 0.15 },
];
const geometries = [
  affineRegion('ROTATED_30', 200, 120, 90, 30, 'POSITIVE_ROTATION_INVARIANCE'),
  affineRegion('SHEAR_75', 200, 120, 75, 0, 'POSITIVE_MARGINAL'),
  affineRegion('SHEAR_65', 200, 120, 65, 0, 'NEGATIVE_CONTROL'),
];

const rows = [];
for (const family of families) {
  for (const geometry of geometries) {
    for (const localTarget of localTargets) {
      for (const targetCase of targetCases) {
        rows.push(runCase({ family, geometry, localTarget, targetCase }));
      }
    }
  }
}

const positives = rows.filter((row) => row.geometryExpectation !== 'NEGATIVE_CONTROL');
const negatives = rows.filter((row) => row.geometryExpectation === 'NEGATIVE_CONTROL');
const positiveFailures = positives.filter((row) => !row.acceptancePass);
const negativeBlocks = negatives.filter((row) => row.qualityWorstStatus === 'BLOCK');
const rotationRows = rows.filter((row) => row.geometryId === 'ROTATED_30');
const rotationInvariantFailures = rotationRows.filter((row) => (
  Math.abs(row.maximumObservedAdjacency - row.unrotatedControl.maximumObservedAdjacency) > 1e-11
  || Math.abs(row.independentMinimumScaledJacobian - row.unrotatedControl.independentMinimumScaledJacobian) > 1e-11
  || Math.abs(row.independentMaximumAspectRatio - row.unrotatedControl.independentMaximumAspectRatio) > 1e-11
));

const receipt = {
  check: 'PR1270_AFFINE_BALANCED_METRIC_SCREEN_V2',
  classification: 'QUALIFICATION_CONTROL_NOT_PRODUCT_MESHER',
  globalTarget: GLOBAL,
  adjacentSizeRatioMax: GROWTH,
  cases: rows.length,
  positiveCases: positives.length,
  positivePassCount: positives.length - positiveFailures.length,
  negativeCases: negatives.length,
  negativeQualityBlockCount: negativeBlocks.length,
  rotationInvariantFailureCount: rotationInvariantFailures.length,
  positiveWorstAdjacency: maxFinite(positives.map((row) => row.maximumObservedAdjacency)),
  positiveWorstAxisIntervalRatio: maxFinite(positives.map((row) => row.maximumAxisIntervalRatio)),
  positiveWorstAspectRatio: maxFinite(positives.map((row) => row.independentMaximumAspectRatio)),
  positiveMinimumScaledJacobian: minFinite(positives.map((row) => row.independentMinimumScaledJacobian)),
  negativeMinimumScaledJacobian: minFinite(negatives.map((row) => row.independentMinimumScaledJacobian)),
  maximumBoundaryResidual: maxFinite(rows.map((row) => row.maximumBoundaryResidual)),
  positiveFailureCaseIds: positiveFailures.map((row) => row.caseId),
  negativeBlockCaseIds: negativeBlocks.map((row) => row.caseId),
  rotationInvariantFailureCaseIds: rotationInvariantFailures.map((row) => row.caseId),
  qualification: positiveFailures.length === 0
    && negativeBlocks.length > 0
    && rotationInvariantFailures.length === 0
    ? 'PASS'
    : 'BLOCK',
  rows,
};

fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/pr1270-affine-metric-screen.json', `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`PR1270_AFFINE_METRIC_SCREEN=${JSON.stringify({
  check: receipt.check,
  qualification: receipt.qualification,
  cases: receipt.cases,
  positivePassCount: receipt.positivePassCount,
  positiveCases: receipt.positiveCases,
  negativeQualityBlockCount: receipt.negativeQualityBlockCount,
  negativeCases: receipt.negativeCases,
  rotationInvariantFailureCount: receipt.rotationInvariantFailureCount,
  positiveWorstAdjacency: receipt.positiveWorstAdjacency,
  positiveWorstAxisIntervalRatio: receipt.positiveWorstAxisIntervalRatio,
  positiveWorstAspectRatio: receipt.positiveWorstAspectRatio,
  positiveMinimumScaledJacobian: receipt.positiveMinimumScaledJacobian,
  negativeMinimumScaledJacobian: receipt.negativeMinimumScaledJacobian,
  maximumBoundaryResidual: receipt.maximumBoundaryResidual,
  positiveFailureCaseIds: receipt.positiveFailureCaseIds,
  negativeBlockCaseIds: receipt.negativeBlockCaseIds,
  rotationInvariantFailureCaseIds: receipt.rotationInvariantFailureCaseIds,
})}`);

assert.equal(positiveFailures.length, 0, `affine positive envelope failed ${positiveFailures.length}/${positives.length}`);
assert.ok(negativeBlocks.length > 0, '65-degree negative control did not trigger a production quality BLOCK');
assert.equal(rotationInvariantFailures.length, 0, '30-degree rigid rotation changed mesh metrics');

function runCase({ family, geometry, localTarget, targetCase }) {
  const targetU = targetCase.u * geometry.lengthA;
  const targetV = targetCase.v * geometry.lengthB;
  const mesh = buildMappedMesh({ geometry, family, localTarget, targetU, targetV });
  const profile = meshProfile(family);
  const quality = qualifyLafeaAnalysisMesh('LAFEA.3', mesh, profile);
  const adjacency = qualifyRefinedMeshAdjacentSizeRatio(mesh, GROWTH);
  const independent = independentTriangleAudit(mesh);
  const boundary = boundaryAudit(mesh, geometry);
  const axes = axisDiagnostics(geometry, localTarget, targetU, targetV);
  const unrotated = geometry.id === 'ROTATED_30'
    ? controlMetrics(buildMappedMesh({
      geometry: affineRegion('ROTATED_0_CONTROL', geometry.lengthA, geometry.lengthB, 90, 0, 'CONTROL'),
      family,
      localTarget,
      targetU,
      targetV,
    }))
    : null;
  const targetPoint = mapPoint(geometry, targetU, targetV);
  const targetNode = nearestCornerNode(mesh, targetPoint);
  const targetResidual = Math.hypot(targetNode.x - targetPoint.x, targetNode.y - targetPoint.y);
  const acceptancePass = quality.worstStatus !== 'BLOCK'
    && adjacency.qualification === 'PASS'
    && axes.maximumAxisIntervalRatio <= GROWTH + 1e-12
    && boundary.maximumResidual <= 1e-9 * Math.max(1, geometry.lengthA, geometry.lengthB)
    && targetResidual <= 1e-10;
  return {
    caseId: `${family}_${geometry.id}_H${String(localTarget).replace('.', '_')}_${targetCase.name}`,
    family,
    geometryId: geometry.id,
    geometryExpectation: geometry.expectation,
    includedAngleDeg: geometry.includedAngleDeg,
    rotationDeg: geometry.rotationDeg,
    localTarget,
    targetCase: targetCase.name,
    targetU,
    targetV,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    qualityWorstStatus: quality.worstStatus,
    maximumObservedAdjacency: adjacency.maximumObserved,
    violatingAdjacencyCount: adjacency.violatingAdjacencyCount,
    maximumAxisIntervalRatio: axes.maximumAxisIntervalRatio,
    independentMaximumAspectRatio: independent.maximumAspectRatio,
    independentMinimumScaledJacobian: independent.minimumScaledJacobian,
    independentMinimumAngleDeg: independent.minimumAngleDeg,
    maximumBoundaryResidual: boundary.maximumResidual,
    nonManifoldBoundaryOwnerCount: boundary.nonManifoldBoundaryOwnerCount,
    targetResidual,
    balancingInsertions: axes.balancingInsertions,
    unrotatedControl: unrotated,
    acceptancePass,
  };
}

function buildMappedMesh({ geometry, family, localTarget, targetU, targetV }) {
  const uAxis = balancedMetricAxis(0, geometry.lengthA, targetU, localTarget, GLOBAL, GROWTH);
  const vAxis = balancedMetricAxis(0, geometry.lengthB, targetV, localTarget, GLOBAL, GROWTH);
  const elements = [];
  for (let j = 0; j < vAxis.coordinates.length - 1; j += 1) {
    for (let i = 0; i < uAxis.coordinates.length - 1; i += 1) {
      const p00 = mapPoint(geometry, uAxis.coordinates[i], vAxis.coordinates[j]);
      const p10 = mapPoint(geometry, uAxis.coordinates[i + 1], vAxis.coordinates[j]);
      const p11 = mapPoint(geometry, uAxis.coordinates[i + 1], vAxis.coordinates[j + 1]);
      const p01 = mapPoint(geometry, uAxis.coordinates[i], vAxis.coordinates[j + 1]);
      elements.push(rawElement(family, p00, p10, p11));
      elements.push(rawElement(family, p00, p11, p01));
    }
  }
  return weld(elements, family);
}

function balancedMetricAxis(minimum, maximum, target, local, global, growth) {
  const beta = 1 - 1 / growth;
  const cutoffDistance = (global - local) / beta;
  const cutoffMetric = Math.log(global / local) / beta;
  const metricDistance = (distance) => distance <= cutoffDistance
    ? Math.log((local + beta * distance) / local) / beta
    : cutoffMetric + (distance - cutoffDistance) / global;
  const physicalDistance = (metricValue) => metricValue <= cutoffMetric
    ? local * (Math.exp(beta * metricValue) - 1) / beta
    : cutoffDistance + global * (metricValue - cutoffMetric);
  const leftMetric = metricDistance(target - minimum);
  const rightMetric = metricDistance(maximum - target);
  const epsilon = 64 * Number.EPSILON * Math.max(1, leftMetric, rightMetric, growth);
  let leftCount = Math.max(1, Math.ceil(leftMetric - epsilon));
  let rightCount = Math.max(1, Math.ceil(rightMetric - epsilon));
  let balancingInsertions = 0;
  while (balancingInsertions <= 256) {
    const leftFirst = physicalDistance(leftMetric / leftCount);
    const rightFirst = physicalDistance(rightMetric / rightCount);
    const ratio = Math.max(leftFirst, rightFirst) / Math.min(leftFirst, rightFirst);
    if (ratio <= growth + epsilon) break;
    if (leftFirst >= rightFirst) leftCount += 1;
    else rightCount += 1;
    balancingInsertions += 1;
  }
  assert.ok(balancingInsertions <= 256, 'metric balancing limit');
  const leftStep = leftMetric / leftCount;
  const rightStep = rightMetric / rightCount;
  const left = [];
  for (let index = leftCount; index >= 1; index -= 1) left.push(target - physicalDistance(index * leftStep));
  const right = [];
  for (let index = 1; index <= rightCount; index += 1) right.push(target + physicalDistance(index * rightStep));
  const coordinates = [...left, target, ...right];
  coordinates[0] = minimum;
  coordinates[coordinates.length - 1] = maximum;
  const intervals = coordinates.slice(1).map((value, index) => value - coordinates[index]);
  const ratios = intervals.slice(1).map((value, index) => Math.max(value, intervals[index]) / Math.min(value, intervals[index]));
  return { coordinates, intervals, maximumRatio: ratios.length ? Math.max(...ratios) : 1, balancingInsertions };
}

function axisDiagnostics(geometry, localTarget, targetU, targetV) {
  const u = balancedMetricAxis(0, geometry.lengthA, targetU, localTarget, GLOBAL, GROWTH);
  const v = balancedMetricAxis(0, geometry.lengthB, targetV, localTarget, GLOBAL, GROWTH);
  return {
    maximumAxisIntervalRatio: Math.max(u.maximumRatio, v.maximumRatio),
    balancingInsertions: u.balancingInsertions + v.balancingInsertions,
  };
}

function affineRegion(id, lengthA, lengthB, includedAngleDeg, rotationDeg, expectation) {
  const rotation = rotationDeg * Math.PI / 180;
  const angleB = (rotationDeg + includedAngleDeg) * Math.PI / 180;
  const a = { x: lengthA * Math.cos(rotation), y: lengthA * Math.sin(rotation) };
  const b = { x: lengthB * Math.cos(angleB), y: lengthB * Math.sin(angleB) };
  return Object.freeze({ id, lengthA, lengthB, includedAngleDeg, rotationDeg, expectation, origin: { x: 17, y: -23 }, a, b });
}
function mapPoint(geometry, u, v) {
  return {
    x: geometry.origin.x + (u / geometry.lengthA) * geometry.a.x + (v / geometry.lengthB) * geometry.b.x,
    y: geometry.origin.y + (u / geometry.lengthA) * geometry.a.y + (v / geometry.lengthB) * geometry.b.y,
  };
}
function rawElement(family, p0, p1, p2) {
  return family === 'T3'
    ? [p0, p1, p2]
    : [p0, p1, p2, midpoint(p0, p1), midpoint(p1, p2), midpoint(p2, p0)];
}
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function weld(rawElements, family) {
  const byKey = new Map();
  const keysByElement = rawElements.map((nodes) => nodes.map((node) => {
    const key = `${node.x},${node.y}`;
    if (!byKey.has(key)) byKey.set(key, { x: node.x, y: node.y });
    return key;
  }));
  const ordered = [...byKey.entries()].sort(([, a], [, b]) => a.x - b.x || a.y - b.y);
  const idByKey = new Map(ordered.map(([key], index) => [key, `N${String(index + 1).padStart(6, '0')}`]));
  const nodes = ordered.map(([key, node]) => ({ nodeId: idByKey.get(key), x: node.x, y: node.y, z: 0 }));
  const elements = keysByElement.map((keys, index) => ({
    elementId: `E${String(index + 1).padStart(6, '0')}`,
    elementType: family,
    nodeIds: keys.map((key) => idByKey.get(key)),
  }));
  return { schema: 'lafea-analysis-mesh/v1', meshIdentity: `PR1270_AFFINE_SCREEN:${family}`, nodes, elements };
}
function meshProfile(family) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `PR1270-AFFINE-${family}`,
    sourceRevision: 'PR1270-AFFINE-DIAG', semanticHash: undefined,
    fields: { ...defaultProfileFields(PROFILE_KINDS.MESH), continuumElement: family,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1', globalTargetSize: GLOBAL },
  });
}
function independentTriangleAudit(mesh) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let maximumAspectRatio = 1;
  let minimumScaledJacobian = 1;
  let minimumAngle = Math.PI;
  for (const element of mesh.elements) {
    const p = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    const lengths = [distance(p[0], p[1]), distance(p[1], p[2]), distance(p[2], p[0])];
    const longest = Math.max(...lengths); const shortest = Math.min(...lengths);
    maximumAspectRatio = Math.max(maximumAspectRatio, longest / shortest);
    const cross = Math.abs((p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x));
    minimumScaledJacobian = Math.min(minimumScaledJacobian, cross / (lengths[0] * lengths[2]));
    minimumAngle = Math.min(minimumAngle, ...triangleAngles(lengths));
  }
  return { maximumAspectRatio, minimumScaledJacobian, minimumAngleDeg: minimumAngle * 180 / Math.PI };
}
function triangleAngles([a, b, c]) {
  return [
    Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))),
    Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b))),
    Math.acos(clamp((b * b + c * c - a * a) / (2 * a * b))),
  ];
}
function clamp(value) { return Math.max(-1, Math.min(1, value)); }
function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function boundaryAudit(mesh, geometry) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const owners = new Map();
  for (const element of mesh.elements) {
    const ids = element.nodeIds.slice(0, 3);
    for (let edge = 0; edge < 3; edge += 1) {
      const a = ids[edge]; const b = ids[(edge + 1) % 3]; const key = [a, b].sort().join(':');
      owners.set(key, (owners.get(key) ?? 0) + 1);
    }
  }
  let maximumResidual = 0; let nonManifoldBoundaryOwnerCount = 0;
  for (const [key, count] of owners.entries()) {
    if (count > 2) nonManifoldBoundaryOwnerCount += 1;
    if (count !== 1) continue;
    for (const id of key.split(':')) maximumResidual = Math.max(maximumResidual, boundaryResidual(nodeById.get(id), geometry));
  }
  return { maximumResidual, nonManifoldBoundaryOwnerCount };
}
function boundaryResidual(point, geometry) {
  const corners = [
    mapPoint(geometry, 0, 0), mapPoint(geometry, geometry.lengthA, 0),
    mapPoint(geometry, geometry.lengthA, geometry.lengthB), mapPoint(geometry, 0, geometry.lengthB),
  ];
  return Math.min(
    pointSegmentDistance(point, corners[0], corners[1]),
    pointSegmentDistance(point, corners[1], corners[2]),
    pointSegmentDistance(point, corners[2], corners[3]),
    pointSegmentDistance(point, corners[3], corners[0]),
  );
}
function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y; const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
function nearestCornerNode(mesh, point) {
  const cornerIds = new Set(mesh.elements.flatMap((element) => element.nodeIds.slice(0, 3)));
  return mesh.nodes.filter((node) => cornerIds.has(node.nodeId))
    .sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
}
function controlMetrics(mesh) {
  const adjacency = qualifyRefinedMeshAdjacentSizeRatio(mesh, GROWTH);
  const independent = independentTriangleAudit(mesh);
  return { maximumObservedAdjacency: adjacency.maximumObserved,
    independentMinimumScaledJacobian: independent.minimumScaledJacobian,
    independentMaximumAspectRatio: independent.maximumAspectRatio };
}
function maxFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.max(...rows) : null; }
function minFinite(values) { const rows = values.filter(Number.isFinite); return rows.length ? Math.min(...rows) : null; }
