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
} from '../src/workspace/lafea-shell-curved-hole-midsurface-contract.js';
import { LAFEA_SHELL_ELEMENT, planLafeaShellAnalysisMesh } from '../src/workspace/lafea-shell-mesh-producer.js';
import { qualifyLafeaAnalysisMesh } from '../src/workspace/lafea-analysis-mesh-quality.js';

const SOURCE_HASH = `sha256:${'c'.repeat(64)}`;
const R = 100;
const U = Math.PI * R / 4;
const ROOT2 = Math.sqrt(0.5);

for (const stageId of ['LAFEA.4', 'LAFEA.5']) {
  for (const fixture of [oneHole(), twoHoles()]) {
    const parent = parentFor(stageId, fixture);
    const rows = [];
    for (const target of [22.5, 20, 18, 16, 15, 14, 12, 10, 9, 8]) {
      const profile = profileFor(stageId, target, fixture.label);
      try {
        const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
        const quality = qualifyLafeaAnalysisMesh(stageId, plan.mesh, profile);
        const blocked = quality.elementResults
          .filter((row) => row.worstStatus === 'BLOCK')
          .map((row) => ({
            elementId: row.elementId,
            aspectRatio: row.metrics.find((metric) => metric.metric === 'ASPECT_RATIO')?.value,
            scaledJacobian: row.metrics.find((metric) => metric.metric === 'SCALED_JACOBIAN')?.value,
            nodeIds: plan.mesh.elements.find((element) => element.elementId === row.elementId)?.nodeIds,
          }));
        rows.push({
          target,
          nodes: plan.mesh.nodes.length,
          elements: plan.mesh.elements.length,
          minimumMaterialLigament: plan.minimumMaterialLigament,
          maximumQualifiedTargetElementLength: plan.maximumQualifiedTargetElementLength,
          worstStatus: quality.worstStatus,
          gateResults: quality.gateResults,
          blockingCount: blocked.length,
          blocked,
        });
      } catch (error) {
        rows.push({ target, error: error?.code ?? error?.message ?? String(error) });
      }
    }
    console.log(JSON.stringify({ stageId, case: fixture.label, rows }, null, 2));
  }
}

function parentFor(stageId, fixture) {
  const geometry = createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId,
    geometryId: `CURVED-HOLE-PROBE-${stageId}-${fixture.label}`,
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: R,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: fixture.vertices,
    segments: fixture.segments,
    loops: fixture.loops,
  });
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId,
    domainId: `CURVED-HOLE-PROBE-DOMAIN-${stageId}-${fixture.label}`,
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

function oneHole() {
  return topology('ONE', [[
    { u: -20, v: 45 }, { u: -20, v: 75 },
    { u: 20, v: 75 }, { u: 20, v: 45 },
  ]]);
}
function twoHoles() {
  return topology('TWO', [[
    { u: -38, v: 40 }, { u: -38, v: 70 },
    { u: -20, v: 70 }, { u: -20, v: 40 },
  ], [
    { u: 20, v: 40 }, { u: 20, v: 70 },
    { u: 38, v: 70 }, { u: 38, v: 40 },
  ]]);
}
function topology(label, holes) {
  const vertices = [
    { vertexId: 'O1', u: -U, v: 0 }, { vertexId: 'O2', u: U, v: 0 },
    { vertexId: 'O3', u: U, v: 120 }, { vertexId: 'O4', u: -U, v: 120 },
  ];
  const segments = [
    segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
    segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
  ];
  const loops = [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] }];
  holes.forEach((polygon, holeIndex) => {
    const prefix = `H${holeIndex + 1}`;
    const ids = polygon.map((point, index) => {
      const vertexId = `${prefix}V${index + 1}`;
      vertices.push({ vertexId, ...point });
      return vertexId;
    });
    const segmentIds = ids.map((_, index) => `${prefix}S${index + 1}`);
    ids.forEach((id, index) => segments.push(segment(segmentIds[index], id, ids[(index + 1) % ids.length])));
    loops.push({ loopId: prefix, role: 'HOLE', segmentIds });
  });
  return { label, vertices, segments, loops };
}
function profileFor(stageId, target, label) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `CURVED_HOLE_PROBE_${stageId.replace('.', '_')}_${label}_${target}`,
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
function segment(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }
