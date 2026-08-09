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

const SOURCE_HASH = `sha256:${'a'.repeat(64)}`;
const geometry = createLafeaAnalysisGeometry({
  schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3', geometryId: 'FILLETED-PLATE',
  coordinateSystemId: 'GLOBAL', lengthUnit: 'mm', orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
  vertices: [
    { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: 200, y: 0 },
    { vertexId: 'VF1', x: 200, y: 100 }, { vertexId: 'VF2', x: 180, y: 120 },
    { vertexId: 'V4', x: 0, y: 120 },
  ],
  segments: [
    line('S1', 'V1', 'V2'), line('S2', 'V2', 'VF1'),
    { segmentId: 'SF', type: 'CIRCULAR_ARC', startVertexId: 'VF1', endVertexId: 'VF2', centerX: 180, centerY: 100, radius: 20, sweep: 'CCW' },
    line('S3', 'VF2', 'V4'), line('S4', 'V4', 'V1'),
  ],
  loops: [{ loopId: 'L_OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'SF', 'S3', 'S4'] }],
});
const adapter = buildLafeaMeshTopology(geometry);
const generated = generateLafeaAnalysisMesh(adapter, {
  targetElementLength: 30, curvatureToleranceDegrees: 15, elementFamily: 'Q8',
});
const domain = createLafeaContinuumAnalysisDomain({
  schema: 'lafea-continuum-analysis-domain/v1', stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
  applicationRef: 'CHECK', units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
  formulation: 'PLANE_STRESS', region: { regionId: 'R1', materialRef: 'MAT_A' },
  physicalCases: [{ caseId: 'C1' }], attachments: [],
}, geometry);
const geometryEvidence = createLafeaAnalysisGeometryEvidence({
  schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3', sourceHash: SOURCE_HASH,
  analysisDomain: domain, geometry, producerRef: 'CHECK_GEOMETRY_PRODUCER',
  profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
});
const stage = {
  stageId: 'LAFEA.3', document: {}, domainFirstProfileActive: true,
  sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
  retainedAnalysisGeometryEvidence: geometryEvidence,
  analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
  analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
};
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1', profileIdentity: 'CHECK_Q8_30', sourceRevision: 'R3', semanticHash: undefined,
  fields: {
    continuumElement: 'Q8', shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1', globalTargetSize: 30,
    adjacentSizeRatioMax: 1.5, aspectRatioWarn: 5, aspectRatioBlock: 10,
    scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2, adaptiveLevels: 3,
  },
});
const produced = produceLafeaAnalysisMeshEvidence(stage, lafeaMeshGenerationConfiguration(profile));
const report = {
  schema: 'lafea-logical-side-diagnostic/v1',
  strategy: generated.strategy,
  strategyReason: generated.strategyReason,
  nodeCount: generated.nodeCount,
  elementCount: generated.elementCount,
  boundarySegmentCount: generated.boundarySegmentCount,
  characteristicLengthMin: generated.characteristicLengthMin,
  characteristicLengthMedian: generated.characteristicLengthMedian,
  characteristicLengthMax: generated.characteristicLengthMax,
  qualification: produced.evidence.qualification,
  qualityStatus: produced.evidence.quality.status,
  blockingElementIds: produced.evidence.quality.blockingElementIds,
  warningElementIds: produced.evidence.quality.warningElementIds,
  gates: produced.evidence.quality.gates,
};
fs.writeFileSync('logical-side-diagnostic.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));

function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}
