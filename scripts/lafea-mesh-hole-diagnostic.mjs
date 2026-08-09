#!/usr/bin/env node
import fs from 'node:fs';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { buildLafeaMeshTopology } from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from '../src/workspace/lafea-mesh-producer-engine.js';
import { mp2SquareWithCircularHole } from './lafea-mp2-domain-geometry-fixtures.mjs';

const report = { schema: 'lafea-mesh-hole-diagnostic/v1' };
try {
  const geometry = createLafeaAnalysisGeometry(mp2SquareWithCircularHole());
  const adapter = buildLafeaMeshTopology(geometry);
  report.geometryHash = geometry.semanticHash;
  report.holeLoopIds = adapter.holeLoopIds;
  const generated = generateLafeaAnalysisMesh(adapter, {
    targetElementLength: 1.5,
    curvatureToleranceDegrees: 15,
    elementFamily: 'T6',
  });
  report.status = 'GENERATED';
  report.strategy = generated.strategy;
  report.strategyReason = generated.strategyReason;
  report.holeCount = generated.holeCount;
  report.interiorPointCount = generated.interiorPointCount;
  report.nodeCount = generated.nodeCount;
  report.elementCount = generated.elementCount;
  const nodeById = new Map(generated.mesh.nodes.map((node) => [node.nodeId, node]));
  report.minimumNodeRadius = Math.min(...generated.mesh.nodes.map((node) =>
    Math.hypot(node.x - 5, node.y - 5)));
  report.minimumCornerCentroidRadius = Math.min(...generated.mesh.elements.map((element) => {
    const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
    const x = corners.reduce((sum, node) => sum + node.x, 0) / 3;
    const y = corners.reduce((sum, node) => sum + node.y, 0) / 3;
    return Math.hypot(x - 5, y - 5);
  }));
  report.circularBoundaryNodeCount = generated.mesh.nodes.filter((node) =>
    Math.abs(Math.hypot(node.x - 5, node.y - 5) - 1) <= 1e-10).length;
} catch (error) {
  report.status = 'ERROR';
  report.errorName = error?.name ?? null;
  report.errorCode = error?.code ?? null;
  report.errorMessage = error?.message ?? String(error);
  report.stack = error?.stack ?? null;
}
fs.writeFileSync('hole-diagnostic.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
