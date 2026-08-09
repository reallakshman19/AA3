#!/usr/bin/env node
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
  LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  createLafeaCurvedHoleShellAnalysisDomain,
  createLafeaCurvedHoleShellMidsurfaceEvidence,
  createLafeaCurvedHoleShellMidsurfaceGeometry,
  curvedHoleShellUvAtPoint3d,
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import { LAFEA_SHELL_ELEMENT, planLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const R = 100;
const U = Math.PI * R / 4;
const ROOT2 = Math.sqrt(0.5);
const HOLE = Object.freeze({ uMin: -20, uMax: 20, vMin: 45, vMax: 75 });
const OUTER = Object.freeze({ uMin: -U, uMax: U, vMin: 0, vMax: 120 });

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  const parent = parentFor(stageId);
  const rows = [];
  for (const target of [22.5, 20, 18, 16, 15, 14, 12, 10, 9, 8]) {
    const profile = profileFor(stageId, target);
    try {
      const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
      const quality = qualifyLafeaAnalysisMesh(stageId, plan.mesh, profile);
      const nodeById = new Map(plan.mesh.nodes.map((node) => [node.nodeId, node]));
      const blocked = quality.elementResults
        .filter((row) => row.worstStatus === 'BLOCK')
        .map((row) => {
          const element = plan.mesh.elements.find((candidate) => candidate.elementId === row.elementId);
          const nodes = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
          const uv = nodes.map((node) => curvedHoleShellUvAtPoint3d(parent.geometry, physicalPoint(node)));
          return {
            elementId: row.elementId,
            aspectRatio: row.metrics.find((metric) => metric.metric === 'ASPECT_RATIO')?.value,
            scaledJacobian3d: row.metrics.find((metric) => metric.metric === 'SCALED_JACOBIAN')?.value,
            scaledJacobianUv: triangleScaledJacobian2d(uv),
            nodeIds: element.nodeIds,
            nodeDetails: nodes.map((node, index) => ({
              nodeId: node.nodeId,
              xyz: { x: node.x, y: node.y, z: node.z },
              uv: uv[index],
              clearance: clearance(uv[index]),
            })),
          };
        });
      rows.push({
        target,
        nodes: plan.mesh.nodes.length,
        elements: plan.mesh.elements.length,
        worstStatus: quality.worstStatus,
        gateResults: quality.gateResults,
        blockingCount: blocked.length,
        blocked,
      });
    } catch (error) {
      rows.push({ target, error: error?.code ?? error?.message ?? String(error) });
    }
  }
  console.log(JSON.stringify({ stageId, rows }, null, 2));
}

function parentFor(stageId) {
  const geometry = createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `CURVED-HOLE-PROBE-${stageId}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: R,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: [
      { vertexId: 'O1', u: -U, v: 0 }, { vertexId: 'O2', u: U, v: 0 },
      { vertexId: 'O3', u: U, v: 120 }, { vertexId: 'O4', u: -U, v: 120 },
      { vertexId: 'H1', u: -20, v: 45 }, { vertexId: 'H2', u: -20, v: 75 },
      { vertexId: 'H3', u: 20, v: 75 }, { vertexId: 'H4', u: 20, v: 45 },
    ],
    segments: [
      segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
      segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
      segment('HS1', 'H1', 'H2'), segment('HS2', 'H2', 'H3'),
      segment('HS3', 'H3', 'H4'), segment('HS4', 'H4', 'H1'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['HS1', 'HS2', 'HS3', 'HS4'] },
    ],
  });
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `CURVED-HOLE-PROBE-DOMAIN-${stageId}`,
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  return createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId,
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'CURVED-HOLE-QUALITY-PROBE',
  });
}

function profileFor(stageId, target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CURVED_HOLE_PROBE_${stageId.replace('.', '_')}_${target}`,
    sourceRevision: 'R9-PROBE', semanticHash: undefined,
    fields: {
      continuumElement: 'T3', shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: target, adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5, aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function physicalPoint(node) { return { x: node.x, y: node.y, z: node.z }; }
function triangleScaledJacobian2d(nodes) {
  return Math.min(...nodes.map((origin, index) => {
    const first = subtract2(nodes[(index + 1) % 3], origin);
    const second = subtract2(nodes[(index + 2) % 3], origin);
    const denominator = norm2(first) * norm2(second);
    if (!(denominator > 0)) return 0;
    return Math.abs(first.u * second.v - first.v * second.u) / denominator;
  }));
}
function clearance(point) {
  return {
    outer: Math.min(point.u - OUTER.uMin, OUTER.uMax - point.u, point.v - OUTER.vMin, OUTER.vMax - point.v),
    hole: Math.min(
      Math.hypot(point.u - clamp(point.u, HOLE.uMin, HOLE.uMax), point.v - clamp(point.v, HOLE.vMin, HOLE.vMax)),
      Math.abs(point.u - HOLE.uMin), Math.abs(point.u - HOLE.uMax),
      Math.abs(point.v - HOLE.vMin), Math.abs(point.v - HOLE.vMax),
    ),
  };
}
function subtract2(left, right) { return { u: left.u - right.u, v: left.v - right.v }; }
function norm2(value) { return Math.hypot(value.u, value.v); }
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
function segment(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }
