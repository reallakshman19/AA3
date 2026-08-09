#!/usr/bin/env node
import fs from 'node:fs';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { buildLafeaMeshTopology } from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import {
  insertInteriorPoint,
  pointInPolygonStrict,
  triangulateRefinedRegionAsIndexTriples,
} from '../src/core/lafea-meshing/interior-refinement-t6.js';
import {
  lawsonFlip,
  upgradeToT6,
} from '../src/core/lafea-meshing/constrained-delaunay-t6.js';
import { qualifyScaledJacobian } from '../src/core/lafea-meshing/index.js';
import { arcSweepAngle } from '../src/core/lafea-geometry/vertex-curve.js';
import { mp2SquareWithCircularHole } from './lafea-mp2-domain-geometry-fixtures.mjs';

const TARGET = 1.5;
const CURVATURE_RADIANS = 15 * Math.PI / 180;
const GROWTH = 1.6;
const report = { schema: 'lafea-hole-front-probe/v1', target: TARGET, growth: GROWTH, variants: [] };

try {
  const geometry = createLafeaAnalysisGeometry(mp2SquareWithCircularHole());
  const adapter = buildLafeaMeshTopology(geometry);
  const topology = adapter.topology;
  const region = topology.regions[0];
  const vertexById = new Map(topology.vertices.map((vertex) => [vertex.vertexId, vertex]));
  const minimumSegmentsByCurveId = new Map(
    topology.curves
      .filter((curve) => curve.type === 'ARC')
      .map((curve) => [
        curve.curveId,
        Math.max(1, Math.ceil(Math.abs(arcSweepAngle(curve, vertexById)) / CURVATURE_RADIANS)),
      ]),
  );
  const radii = topology.curves.filter((curve) => curve.type === 'ARC').map((curve) => curve.arc.radius);
  const base = triangulateRefinedRegionAsIndexTriples(topology, region.regionId, {
    targetSize: TARGET,
    chordErrorLimit: radii.length ? Math.max(...radii) : TARGET,
    minimumSegmentsByCurveId,
  });

  for (const layerCount of [0, 1, 2, 3, 4]) {
    report.variants.push(qualifyVariant(base, layerCount));
  }
  report.status = 'COMPLETE';
} catch (error) {
  report.status = 'ERROR';
  report.errorName = error?.name ?? null;
  report.errorCode = error?.code ?? null;
  report.errorMessage = error?.message ?? String(error);
  report.stack = error?.stack ?? null;
}

fs.writeFileSync('hole-front-probe.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));

function qualifyVariant(base, layerCount) {
  const points = base.points.map((point) => ({ x: point.x, y: point.y }));
  const triangles = base.triangleTriples.map((triangle) => [...triangle]);
  const constrainedEdgeKeys = new Set(base.boundaryEdgeKeys);
  const outerRing = base.boundaryRings.find((ring) => ring.role === 'OUTER');
  const holeRings = base.boundaryRings.filter((ring) => ring.role === 'HOLE');
  const outerPolygon = outerRing.globalIndices.map((index) => points[index]);
  const holePolygons = holeRings.map((ring) => ring.globalIndices.map((index) => points[index]));
  let insertedFrontPoints = 0;

  for (let layer = 0; layer < layerCount; layer += 1) {
    for (const ring of holeRings) {
      for (let edgeIndex = 0; edgeIndex < ring.globalIndices.length; edgeIndex += 1) {
        const a = points[ring.globalIndices[edgeIndex]];
        const b = points[ring.globalIndices[(edgeIndex + 1) % ring.globalIndices.length]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const edgeLength = Math.hypot(dx, dy);
        if (!(edgeLength > 0)) continue;
        const offset = cumulativeOffset(edgeLength, layer);
        const candidate = {
          x: (a.x + b.x) / 2 + (-dy / edgeLength) * offset,
          y: (a.y + b.y) / 2 + (dx / edgeLength) * offset,
        };
        if (!pointInPolygonStrict(candidate, outerPolygon)) continue;
        if (holePolygons.some((polygon) => pointInPolygonStrict(candidate, polygon))) continue;
        const clearance = Math.min(TARGET * 0.18, edgeLength * 0.45 * (GROWTH ** layer));
        if (!farEnough(candidate, points, clearance)) continue;
        if (insertInteriorPoint(points, triangles, constrainedEdgeKeys, candidate)) insertedFrontPoints += 1;
      }
    }
  }

  const restored = lawsonFlip(points, triangles, constrainedEdgeKeys);
  const elements = upgradeToT6(points, base.ringCorners, restored, base.edgesByCornerPair);
  const quality = qualitySummary(elements);
  return {
    layerCount,
    insertedFrontPoints,
    pointCount: points.length,
    elementCount: elements.length,
    ...quality,
  };
}

function cumulativeOffset(edgeLength, layer) {
  const baseHeight = edgeLength * Math.sqrt(3) / 2;
  let offset = 0;
  for (let index = 0; index <= layer; index += 1) {
    offset += baseHeight * (GROWTH ** index);
  }
  return offset;
}

function farEnough(point, points, clearance) {
  return points.every((existing) => Math.hypot(point.x - existing.x, point.y - existing.y) >= clearance);
}

function qualitySummary(elements) {
  let minimumScaledJacobian = Infinity;
  let maximumAspectRatio = 0;
  let blockingElementCount = 0;
  let warningElementCount = 0;
  const firstBlockingElements = [];

  elements.forEach((element, index) => {
    const nodes = element.nodes.map((node) => ({ x: node.x, y: node.y, z: 0 }));
    const corners = nodes.slice(0, 3);
    const lengths = corners.map((node, cornerIndex) => distance(node, corners[(cornerIndex + 1) % 3]));
    const aspectRatio = Math.max(...lengths) / Math.min(...lengths);
    const jacobian = qualifyScaledJacobian('T6', nodes, { warn: 0.6, block: 0.2 });
    minimumScaledJacobian = Math.min(minimumScaledJacobian, jacobian.value);
    maximumAspectRatio = Math.max(maximumAspectRatio, aspectRatio);
    const blocked = aspectRatio >= 10 || jacobian.value <= 0.2;
    const warned = !blocked && (aspectRatio >= 5 || jacobian.value <= 0.6);
    if (blocked) {
      blockingElementCount += 1;
      if (firstBlockingElements.length < 8) {
        firstBlockingElements.push({
          elementIndex: index,
          aspectRatio,
          scaledJacobian: jacobian.value,
          corners: corners.map((node) => ({ x: node.x, y: node.y })),
        });
      }
    } else if (warned) {
      warningElementCount += 1;
    }
  });

  return {
    minimumScaledJacobian,
    maximumAspectRatio,
    blockingElementCount,
    warningElementCount,
    firstBlockingElements,
  };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}
