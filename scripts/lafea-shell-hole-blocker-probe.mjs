#!/usr/bin/env node
import fs from 'node:fs';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import { LAFEA_SHELL_ELEMENT, planLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';

const SOURCE_HASH = `sha256:${'8'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const geometry = createLafeaShellMidsurfaceGeometry({
  schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  stageId: 'LAFEA.4', geometryId: 'SHELL-HOLE-BLOCKER-PROBE', lengthUnit: 'mm',
  origin: { x: 12, y: -18, z: 31 },
  axisU: { x: ROOT2, y: ROOT2, z: 0 }, axisV: { x: 0, y: 0, z: 1 },
  orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
  vertices: [
    { vertexId: 'O1', u: 0, v: 0 }, { vertexId: 'O2', u: 240, v: 0 },
    { vertexId: 'O3', u: 240, v: 160 }, { vertexId: 'O4', u: 0, v: 160 },
    { vertexId: 'H1', u: 80, v: 50 }, { vertexId: 'H2', u: 80, v: 110 },
    { vertexId: 'H3', u: 160, v: 110 }, { vertexId: 'H4', u: 160, v: 50 },
  ],
  segments: [
    seg('OS1','O1','O2'), seg('OS2','O2','O3'), seg('OS3','O3','O4'), seg('OS4','O4','O1'),
    seg('HS1','H1','H2'), seg('HS2','H2','H3'), seg('HS3','H3','H4'), seg('HS4','H4','H1'),
  ],
  loops: [
    { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1','OS2','OS3','OS4'] },
    { loopId: 'HOLE', role: 'HOLE', segmentIds: ['HS1','HS2','HS3','HS4'] },
  ],
});
const domain = createLafeaShellAnalysisDomain({
  schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  stageId: 'LAFEA.4', domainId: 'SHELL-HOLE-BLOCKER-PROBE', sourceHash: SOURCE_HASH,
  midsurfaceGeometryHash: geometry.semanticHash, lengthUnit: 'mm',
  topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
});
const parent = createLafeaShellMidsurfaceEvidence({
  schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  stageId: 'LAFEA.4', sourceHash: SOURCE_HASH, analysisDomain: domain, geometry,
  producerRef: 'SHELL-HOLE-BLOCKER-PROBE',
});
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1', profileIdentity: 'SHELL_HOLE_BLOCKER_40',
  sourceRevision: 'SHELL_HOLE_V2', semanticHash: undefined,
  fields: {
    continuumElement: 'T3', shellElement: LAFEA_SHELL_ELEMENT, globalTargetSize: 40,
    adjacentSizeRatioMax: 1.5, aspectRatioWarn: 5, aspectRatioBlock: 10,
    scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2, adaptiveLevels: 3,
  },
});
const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
const quality = qualifyLafeaAnalysisMesh('LAFEA.4', plan.mesh, profile);
const nodeById = new Map(plan.mesh.nodes.map((node) => [node.nodeId, node]));
const elementById = new Map(plan.mesh.elements.map((element) => [element.elementId, element]));
const blockers = quality.elementResults.filter((row) => row.worstStatus === 'BLOCK').map((row) => {
  const element = elementById.get(row.elementId);
  return {
    elementId: row.elementId,
    nodeIds: element.nodeIds,
    uv: element.nodeIds.map((nodeId) => projectUv(nodeById.get(nodeId))),
    metrics: row.metrics.map((metric) => ({ metric: metric.metric, value: metric.value, status: metric.status })),
  };
});
const payload = {
  schema: 'lafea-shell-hole-blocker-probe/v1', targetElementLength: 40,
  nodeCount: plan.nodeCount, elementCount: plan.elementCount,
  blockingElementIds: quality.blockingElementIds, blockers,
};
fs.writeFileSync('shell-hole-blockers.json', `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ status: 'CAPTURED', blockingElementCount: blockers.length }));

function projectUv(node) {
  const dx = node.x - geometry.origin.x; const dy = node.y - geometry.origin.y; const dz = node.z - geometry.origin.z;
  return {
    u: dx * geometry.axisU.x + dy * geometry.axisU.y + dz * geometry.axisU.z,
    v: dx * geometry.axisV.x + dy * geometry.axisV.y + dz * geometry.axisV.z,
  };
}
function seg(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }
