#!/usr/bin/env node
/** Diagnostic evidence for P1-5 automatic interior refinement. */
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;

function plate(width, height) {
  return createLafeaAnalysisGeometry({
    schema: 'lafea-analysis-geometry/v1',
    stageId: 'LAFEA.3',
    geometryId: 'PLATE_DIAGNOSTIC',
    coordinateSystemId: 'GLOBAL',
    lengthUnit: 'mm',
    orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
    vertices: [
      { vertexId: 'V1', x: 0, y: 0 },
      { vertexId: 'V2', x: width, y: 0 },
      { vertexId: 'V3', x: width, y: height },
      { vertexId: 'V4', x: 0, y: height },
    ],
    segments: [
      { segmentId: 'S1', type: 'LINE', startVertexId: 'V1', endVertexId: 'V2' },
      { segmentId: 'S2', type: 'LINE', startVertexId: 'V2', endVertexId: 'V3' },
      { segmentId: 'S3', type: 'LINE', startVertexId: 'V3', endVertexId: 'V4' },
      { segmentId: 'S4', type: 'LINE', startVertexId: 'V4', endVertexId: 'V1' },
    ],
    loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
  });
}

function meshProfile(target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `DIAGNOSTIC_T6_${target}`,
    sourceRevision: 'R2',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T6',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function stageFor(geometry) {
  const domain = createLafeaContinuumAnalysisDomain({
    schema: 'lafea-continuum-analysis-domain/v1',
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    applicationRef: 'P1-5-DIAGNOSTIC',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'R1', materialRef: 'MAT_A' },
    physicalCases: [{ caseId: 'C1' }],
    attachments: [],
  }, geometry);
  const evidence = createLafeaAnalysisGeometryEvidence({
    schema: 'lafea-analysis-geometry-evidence/v1',
    stageId: 'LAFEA.3',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'P1-5-DIAGNOSTIC',
    profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
  });
  return {
    stageId: 'LAFEA.3',
    document: {},
    domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
    retainedAnalysisGeometryEvidence: evidence,
    analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
    analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
  };
}

const stage = stageFor(plate(200, 120));
for (const target of [60, 30, 15, 8]) {
  const produced = produceLafeaAnalysisMeshEvidence(
    stage,
    lafeaMeshGenerationConfiguration(meshProfile(target)),
  );
  const quality = produced.evidence.quality;
  const blocking = quality.elementResults
    .filter((row) => row.worstStatus === 'BLOCK')
    .slice(0, 8)
    .map((row) => ({
      elementId: row.elementId,
      metrics: row.metrics.map((metric) => ({
        metric: metric.metric,
        value: metric.value,
        status: metric.status,
      })),
    }));
  console.log(JSON.stringify({
    target,
    strategy: produced.planned.generated.strategy,
    interiorPointCount: produced.planned.generated.interiorPointCount,
    nodeCount: produced.evidence.mesh.nodes.length,
    elementCount: produced.evidence.mesh.elements.length,
    qualification: produced.evidence.qualification,
    gateResults: quality.gateResults,
    blockingElementCount: quality.blockingElementIds.length,
    warningElementCount: quality.warningElementIds.length,
    firstBlockingElements: blocking,
  }));
}
