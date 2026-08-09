#!/usr/bin/env node
import fs from 'node:fs';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { buildLafeaMeshTopology } from '../src/workspace/lafea-mesh-geometry-topology-adapter.js';
import { generateLafeaAnalysisMesh } from '../src/workspace/lafea-mesh-producer-engine.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import { buildLafeaDomainFirstMeshCustodyProjection } from '../src/workspace/lafea-domain-first-mesh-custody.js';
import { mp2SquareWithCircularHole } from './lafea-mp2-domain-geometry-fixtures.mjs';

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const report = { schema: 'lafea-mesh-hole-diagnostic/v2' };
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
  report.engine = summarizeEngine(generated);
  try {
    generateLafeaAnalysisMesh(adapter, {
      targetElementLength: 1.5,
      curvatureToleranceDegrees: 15,
      elementFamily: 'Q8',
    });
    report.q8 = { status: 'UNEXPECTED_SUCCESS' };
  } catch (error) {
    report.q8 = { status: 'ERROR', code: error?.code ?? null, message: error?.message ?? String(error) };
  }

  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3', sourceHash: SOURCE_HASH, applicationRef: 'HOLE_DIAGNOSTIC',
    units: { length: 'm', force: 'N', stress: 'Pa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT_A' },
    physicalCases: [{ caseId: 'C1' }], attachments: [],
  }, geometry);
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH, analysisDomain: domain, geometry,
    producerRef: 'HOLE_DIAGNOSTIC', profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  const stage = {
    stageId: 'LAFEA.3', document: {}, domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: geometryEvidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
  };
  const profile = canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: 'HOLE_DIAGNOSTIC_T6_1P5',
    sourceRevision: 'R3', semanticHash: undefined,
    fields: {
      continuumElement: 'T6', shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: 1.5, adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5, aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2, adaptiveLevels: 3,
    },
  });
  const produced = produceLafeaAnalysisMeshEvidence(stage, lafeaMeshGenerationConfiguration(profile));
  report.evidence = {
    qualification: produced.evidence.qualification,
    status: produced.evidence.status,
    blockingElementCount: produced.evidence.quality.blockingElementIds.length,
    warningElementCount: produced.evidence.quality.warningElementIds.length,
    gateResults: produced.evidence.quality.gateResults,
    firstBlockingElements: produced.evidence.quality.elementResults
      .filter((row) => row.worstStatus === 'BLOCK')
      .slice(0, 12),
  };
  const custody = buildLafeaDomainFirstMeshCustodyProjection(stage, produced.evidence);
  report.custody = { state: custody.state, usableForRun: custody.usableForRun, reasons: custody.reasons ?? custody.invalidReasons ?? custody.staleReasons ?? [] };
  report.status = 'COMPLETE';
} catch (error) {
  report.status = 'ERROR';
  report.errorName = error?.name ?? null;
  report.errorCode = error?.code ?? null;
  report.errorMessage = error?.message ?? String(error);
  report.stack = error?.stack ?? null;
}
fs.writeFileSync('hole-diagnostic.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));

function summarizeEngine(generated) {
  const nodeById = new Map(generated.mesh.nodes.map((node) => [node.nodeId, node]));
  return {
    strategy: generated.strategy,
    strategyReason: generated.strategyReason,
    holeCount: generated.holeCount,
    interiorPointCount: generated.interiorPointCount,
    nodeCount: generated.nodeCount,
    elementCount: generated.elementCount,
    minimumNodeRadius: Math.min(...generated.mesh.nodes.map((node) => Math.hypot(node.x - 5, node.y - 5))),
    minimumCornerCentroidRadius: Math.min(...generated.mesh.elements.map((element) => {
      const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
      const x = corners.reduce((sum, node) => sum + node.x, 0) / 3;
      const y = corners.reduce((sum, node) => sum + node.y, 0) / 3;
      return Math.hypot(x - 5, y - 5);
    })),
    circularBoundaryNodeCount: generated.mesh.nodes.filter((node) => Math.abs(Math.hypot(node.x - 5, node.y - 5) - 1) <= 1e-10).length,
  };
}
