#!/usr/bin/env node
import assert from 'node:assert/strict';

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

const ROOT2 = Math.sqrt(0.5);
const TARGET = 40;
const configurations = [
  {
    name: 'HISTORICAL_PROBE_METADATA',
    sourceHash: `sha256:${'c'.repeat(64)}`,
    geometryId: 'SHELL-HOLE-PROBE-1',
    domainId: 'SHELL-HOLE-PROBE-1',
    profileIdentity: 'SHELL_HOLE_PROBE_40',
    sourceRevision: 'SHELL_HOLE_PROBE',
  },
  {
    name: 'PERMANENT_LADDER_METADATA',
    sourceHash: `sha256:${'9'.repeat(64)}`,
    geometryId: 'SHELL-HOLE-LADDER-ONE_RECT_HOLE',
    domainId: 'SHELL-HOLE-LADDER-ONE_RECT_HOLE',
    profileIdentity: 'SHELL_HOLE_LADDER_ONE_RECT_HOLE_40',
    sourceRevision: 'SHELL_HOLE_V2',
  },
];

const rows = configurations.map((configuration) => {
  const parent = shellParent(configuration);
  const profile = shellProfile(configuration);
  const plan = planLafeaShellAnalysisMesh({ midsurfaceEvidence: parent, meshProfile: profile });
  const quality = qualifyLafeaAnalysisMesh('LAFEA.4', plan.mesh, profile);
  const blockers = quality.elementResults
    .filter((row) => row.worstStatus === 'BLOCK')
    .map((row) => ({
      elementId: row.elementId,
      metrics: row.metrics.map((metric) => ({
        metric: metric.metric,
        value: metric.value,
        status: metric.status,
      })),
    }));
  return {
    name: configuration.name,
    sourceHash: configuration.sourceHash,
    geometryId: configuration.geometryId,
    profileIdentity: configuration.profileIdentity,
    nodeCount: plan.nodeCount,
    elementCount: plan.elementCount,
    nodes: plan.mesh.nodes,
    elements: plan.mesh.elements,
    worstStatus: quality.worstStatus,
    blockingElementIds: quality.blockingElementIds,
    blockers,
  };
});

assert.equal(rows[0].nodeCount, rows[1].nodeCount, 'metadata changed node count');
assert.equal(rows[0].elementCount, rows[1].elementCount, 'metadata changed element count');
assert.equal(JSON.stringify(rows[0].nodes), JSON.stringify(rows[1].nodes),
  'metadata changed canonical node coordinates/numbering');
assert.equal(JSON.stringify(rows[0].elements), JSON.stringify(rows[1].elements),
  'metadata changed canonical element connectivity/numbering');
assert.deepEqual(rows[0].blockingElementIds, rows[1].blockingElementIds,
  'metadata changed quality classification');

console.log(JSON.stringify({
  schema: 'lafea-shell-hole-metadata-invariance-probe/v1',
  status: 'PASS',
  metadataInvariant: true,
  targetElementLength: TARGET,
  rows: rows.map(({ nodes, elements, ...row }) => row),
}, null, 2));

function shellParent(configuration) {
  const geometry = createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: configuration.geometryId,
    lengthUnit: 'mm',
    origin: { x: 12, y: -18, z: 31 },
    axisU: { x: ROOT2, y: ROOT2, z: 0 },
    axisV: { x: 0, y: 0, z: 1 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION_WITH_HOLES,
    vertices: [
      { vertexId: 'O1', u: 0, v: 0 },
      { vertexId: 'O2', u: 240, v: 0 },
      { vertexId: 'O3', u: 240, v: 160 },
      { vertexId: 'O4', u: 0, v: 160 },
      { vertexId: 'H1V1', u: 80, v: 50 },
      { vertexId: 'H1V2', u: 80, v: 110 },
      { vertexId: 'H1V3', u: 160, v: 110 },
      { vertexId: 'H1V4', u: 160, v: 50 },
    ],
    segments: [
      segment('OS1', 'O1', 'O2'), segment('OS2', 'O2', 'O3'),
      segment('OS3', 'O3', 'O4'), segment('OS4', 'O4', 'O1'),
      segment('H1S1', 'H1V1', 'H1V2'), segment('H1S2', 'H1V2', 'H1V3'),
      segment('H1S3', 'H1V3', 'H1V4'), segment('H1S4', 'H1V4', 'H1V1'),
    ],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1', 'OS2', 'OS3', 'OS4'] },
      { loopId: 'H1_HOLE', role: 'HOLE', segmentIds: ['H1S1', 'H1S2', 'H1S3', 'H1S4'] },
    ],
  });
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: configuration.domainId,
    sourceHash: configuration.sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY_WITH_HOLES,
  });
  return createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: configuration.sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'SHELL-HOLE-METADATA-INVARIANCE-PROBE',
  });
}

function shellProfile(configuration) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: configuration.profileIdentity,
    sourceRevision: configuration.sourceRevision,
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: TARGET,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function segment(segmentId, startVertexId, endVertexId) {
  return { segmentId, startVertexId, endVertexId };
}
