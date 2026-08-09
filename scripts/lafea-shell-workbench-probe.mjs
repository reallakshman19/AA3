#!/usr/bin/env node
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';

const sourceHash = `sha256:${'e'.repeat(64)}`;
const root2 = Math.sqrt(0.5);
const geometry = createLafeaShellMidsurfaceGeometry({
  schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  stageId: 'LAFEA.4', geometryId: 'PROBE', lengthUnit: 'mm',
  origin: { x: 10, y: -20, z: 30 }, axisU: { x: root2, y: root2, z: 0 },
  axisV: { x: 0, y: 0, z: 1 }, orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  vertices: [{ vertexId: 'V1', u: 0, v: 0 }, { vertexId: 'V2', u: 200, v: 0 }, { vertexId: 'V3', u: 200, v: 120 }, { vertexId: 'V4', u: 0, v: 120 }],
  segments: [{ segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' }, { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' }, { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' }, { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' }],
  loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
});
const domain = createLafeaShellAnalysisDomain({
  schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA, stageId: 'LAFEA.4', domainId: 'PROBE-DOMAIN',
  sourceHash, midsurfaceGeometryHash: geometry.semanticHash, lengthUnit: 'mm',
  topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
});
const parent = createLafeaShellMidsurfaceEvidence({
  schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA, stageId: 'LAFEA.4', sourceHash,
  analysisDomain: domain, geometry, producerRef: 'P2-8-PROBE',
});
const workbench = createLafeaWorkbenchOrchestratorStore();
workbench.selectStage('LAFEA.4');
workbench.initializeLifecycle(sourceHash, 'P2-8-PROBE-SOURCE');
console.log(JSON.stringify({ before: workbench.getState().stages['LAFEA.4'] }, null, 2));
const result = workbench.registerShellMidsurfaceEvidence(parent, 'LAFEA.4');
console.log(JSON.stringify({ result, after: workbench.getState().stages['LAFEA.4'], diagnostics: workbench.getState().diagnostics }, null, 2));
workbench.destroy();