#!/usr/bin/env node
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
import {
  LAFEA_SHELL_ELEMENT,
  planLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const cases = [
  { name: 'ONE_RECT_HOLE', holes: [{ x0: 80, y0: 50, x1: 160, y1: 110 }] },
  { name: 'TWO_RECT_HOLES', holes: [
    { x0: 45, y0: 48, x1: 85, y1: 96 },
    { x0: 155, y0: 56, x1: 195, y1: 104 },
  ] },
];
const rows = [];
for (const entry of cases) {
  for (const target of [40, 30, 25, 20, 15, 10]) {
    const parent = shellParent(entry.holes);
    const profile = shellProfile(target);
    const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
    const quality = qualifyLafeaAnalysisMesh('LAFEA.4', plan.mesh, profile);
    const blockers = quality.elementResults
      .filter((row) => row.worstStatus === 'BLOCK')
      .map((row) => ({
        elementId: row.elementId,
        aspectRatio: row.metrics.find((metric) => metric.metric === 'ASPECT_RATIO')?.value,
        scaledJacobian: row.metrics.find((metric) => metric.metric === 'SCALED_JACOBIAN')?.value,
      }));
    rows.push({
      case: entry.name,
      target,
      nodes: plan.nodeCount,
      elements: plan.elementCount,
      worstStatus: quality.worstStatus,
      gateResults: quality.gateResults,
      blockingCount: blockers.length,
      blockers: blockers.slice(0, 12),
    });
  }
}
console.log(JSON.stringify({ schema: 'lafea-shell-hole-quality-probe/v1', rows }, null, 2));

function shellParent(holes) {
  const geometry = createLafeaShellMidsurfaceGeometry(geometryValue(holes));
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: `SHELL-HOLE-PROBE-${holes.length}`,
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  });
  return createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'SHELL-HOLE-QUALITY-PROBE',
  });
}
function geometryValue(holes) {
  const vertices = [
    { vertexId: 'O1', u: 0, v: 0 },
    { vertexId: 'O2', u: 240, v: 0 },
    { vertexId: 'O3', u: 240, v: 160 },
    { vertexId: 'O4', u: 0, v: 160 },
  ];
  const segments = [
    segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
    segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
  ];
  const loops = [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] }];
  holes.forEach((rect, index) => {
    const prefix = `H${index + 1}`;
    const points = [
      [rect.x0, rect.y0], [rect.x0, rect.y1],
      [rect.x1, rect.y1], [rect.x1, rect.y0],
    ];
    points.forEach(([u, v], i) => vertices.push({ vertexId: `${prefix}V${i + 1}`, u, v }));
    const ids = [];
    for (let i = 0; i < 4; i += 1) {
      const id = `${prefix}S${i + 1}`;
      ids.push(id);
      segments.push(segment(id, `${prefix}V${i + 1}`, `${prefix}V${((i + 1) % 4) + 1}`));
    }
    loops.push({ loopId: `${prefix}_HOLE`, role: 'HOLE', segmentIds: ids });
  });
  return {
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4', geometryId: `SHELL-HOLE-PROBE-${holes.length}`, lengthUnit: 'mm',
    origin: { x: 12, y: -18, z: 31 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 }, axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
    vertices, segments, loops,
  };
}
function shellProfile(globalTargetSize) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `SHELL_HOLE_PROBE_${globalTargetSize}`,
    sourceRevision: 'SHELL_HOLE_PROBE', semanticHash: undefined,
    fields: {
      continuumElement: 'T3', shellElement: LAFEA_SHELL_ELEMENT, globalTargetSize,
      adjacentSizeRatioMax: 1.5, aspectRatioWarn: 5, aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6, scaledJacobianBlock: 0.2, adaptiveLevels: 3,
    },
  });
}
function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}