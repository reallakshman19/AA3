#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import { qualifyRefinedMeshAdjacentSizeRatio } from '../src/core/lafea-meshing/refinement-fields.js';
import { createLafeaAnalysisGeometry } from '../src/workspace/lafea-analysis-geometry-contract.js';
import { createLafeaAnalysisGeometryEvidence } from '../src/workspace/lafea-analysis-geometry-evidence.js';
import { createLafeaContinuumAnalysisDomain } from '../src/workspace/lafea-continuum-analysis-domain.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  createLafeaRetainedMeshRefinementCommand,
} from '../src/workspace/lafea-mesh-refinement-command.js';
import {
  lafeaMeshGenerationConfiguration,
  produceLafeaAnalysisMeshEvidence,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import {
  planLafeaRetainedMeshRefinement,
  produceLafeaRetainedMeshRefinement,
} from '../src/workspace/lafea-retained-mesh-refinement.js';

const SOURCE_HASH = `sha256:${'d'.repeat(64)}`;
const family = requiredEnum(process.env.PR1270_FAMILY, ['T3', 'T6'], 'family');
const globalTarget = positive(process.env.PR1270_HGLOBAL ?? '30', 'global');
const localTarget = positive(process.env.PR1270_HLOCAL, 'local');
const width = positive(process.env.PR1270_WIDTH, 'width');
const height = positive(process.env.PR1270_HEIGHT, 'height');
const xf = fraction(process.env.PR1270_XF, 'xf');
const yf = fraction(process.env.PR1270_YF, 'yf');
const caseId = process.env.PR1270_CASE_ID ?? 'NOFLIP_CASE';

const geometry = createLafeaAnalysisGeometry({
  schema: 'lafea-analysis-geometry/v1', stageId: 'LAFEA.3',
  geometryId: `${caseId}-G`, coordinateSystemId: 'GLOBAL', lengthUnit: 'mm',
  orientationPolicy: 'OUTER_CCW_HOLES_CW_V1',
  vertices: [
    { vertexId: 'V1', x: 0, y: 0 }, { vertexId: 'V2', x: width, y: 0 },
    { vertexId: 'V3', x: width, y: height }, { vertexId: 'V4', x: 0, y: height },
  ],
  segments: [
    line('S1', 'V1', 'V2'), line('S2', 'V2', 'V3'),
    line('S3', 'V3', 'V4'), line('S4', 'V4', 'V1'),
  ],
  loops: [{ loopId: 'L1', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
});
const domain = createLafeaContinuumAnalysisDomain({
  schema: 'lafea-continuum-analysis-domain/v1', stageId: 'LAFEA.3',
  sourceHash: SOURCE_HASH, applicationRef: caseId,
  units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
  formulation: 'PLANE_STRESS', region: { regionId: 'R1', materialRef: 'MAT' },
  physicalCases: [{ caseId: 'C1' }], attachments: [],
}, geometry);
const geometryEvidence = createLafeaAnalysisGeometryEvidence({
  schema: 'lafea-analysis-geometry-evidence/v1', stageId: 'LAFEA.3',
  sourceHash: SOURCE_HASH, analysisDomain: domain, geometry,
  producerRef: 'PR1270-NOFLIP-DIAG', profileId: 'LAFEA3_DOMAIN_FIRST_GEOMETRY_V1',
});
const stage = {
  stageId: 'LAFEA.3', domainFirstProfileActive: true,
  sourceAuthority: { stageId: 'LAFEA.3', sourceHash: SOURCE_HASH },
  retainedAnalysisGeometryEvidence: geometryEvidence,
  analysisDomainProjection: { state: 'CURRENT_PASS', analysisDomainHash: domain.semanticHash },
  analysisGeometryProjection: { state: 'CURRENT_PASS', analysisGeometryHash: geometry.semanticHash },
};
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1', profileIdentity: `${caseId}-${family}`,
  sourceRevision: 'PR1270-NOFLIP-DIAG', semanticHash: undefined,
  fields: {
    ...defaultProfileFields(PROFILE_KINDS.MESH), continuumElement: family,
    shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1', globalTargetSize: globalTarget,
  },
});
const parent = produceLafeaAnalysisMeshEvidence(
  stage, lafeaMeshGenerationConfiguration(profile),
).evidence;
assert.equal(parent.qualification, 'PASS');
const requested = { x: width * xf, y: height * yf };
const targetElementId = nearestElement(parent.mesh, requested);
const command = createLafeaRetainedMeshRefinementCommand({
  schema: LAFEA_RETAINED_MESH_REFINEMENT_COMMAND_SCHEMA,
  commandId: `${caseId}-CMD`, stageId: 'LAFEA.3',
  parentMeshArtifactHash: parent.artifactHash, parentMeshHash: parent.meshHash,
  kind: 'TARGET_LENGTH', targetType: 'ELEMENT', targetIds: [targetElementId],
  targetElementLength: localTarget, lengthUnit: 'mm', reason: 'PR1270 no-flip matrix',
});
const plan = planLafeaRetainedMeshRefinement({ stage, meshProfile: profile, parentEvidence: parent, command });
const before = localCornerCount(parent.mesh, plan.targets[0], plan.influenceRadius);
const child = produceLafeaRetainedMeshRefinement({ stage, meshProfile: profile, parentEvidence: parent, command });
const adjacency = qualifyRefinedMeshAdjacentSizeRatio(child.evidence.mesh, profile.fields.adjacentSizeRatioMax);
const after = localCornerCount(child.evidence.mesh, plan.targets[0], plan.influenceRadius);
assert.equal(child.qualification, 'PASS');
assert.equal(adjacency.qualification, 'PASS');
assert.equal(adjacency.violatingAdjacencyCount, 0);
assert.ok(child.localPointCount > 0);
assert.ok(after > before);
console.log(`PR1270_NOFLIP_CASE=${JSON.stringify({
  caseId, family, globalTarget, localTarget, targetRatio: localTarget / globalTarget,
  width, height, xf, yf, targetElementId, influenceRadius: plan.influenceRadius,
  parentNodes: parent.mesh.nodes.length, childNodes: child.evidence.mesh.nodes.length,
  parentElements: parent.mesh.elements.length, childElements: child.evidence.mesh.elements.length,
  localPointCount: child.localPointCount, localCornerGain: after - before,
  maximumAllowed: adjacency.maximumAllowed, maximumObserved: adjacency.maximumObserved,
  violatingAdjacencyCount: adjacency.violatingAdjacencyCount, qualification: adjacency.qualification,
})}`);

function line(segmentId, startVertexId, endVertexId) { return { segmentId, type: 'LINE', startVertexId, endVertexId }; }
function nearestElement(mesh, point) {
  const nodes = new Map(mesh.nodes.map((n) => [n.nodeId, n]));
  return mesh.elements.map((e) => {
    const c = e.nodeIds.slice(0, 3).map((id) => nodes.get(id));
    const x = c.reduce((s, n) => s + n.x, 0) / 3;
    const y = c.reduce((s, n) => s + n.y, 0) / 3;
    return { id: e.elementId, d: Math.hypot(x - point.x, y - point.y) };
  }).sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))[0].id;
}
function localCornerCount(mesh, target, radius) {
  const corners = new Set(mesh.elements.flatMap((e) => e.nodeIds.slice(0, 3)));
  return mesh.nodes.filter((n) => corners.has(n.nodeId)
    && Math.hypot(n.x - target.x, n.y - target.y) <= radius).length;
}
function positive(value, label) { const n = Number(value); assert.ok(Number.isFinite(n) && n > 0, label); return n; }
function fraction(value, label) { const n = Number(value); assert.ok(Number.isFinite(n) && n > 0 && n < 1, label); return n; }
function requiredEnum(value, values, label) { assert.ok(values.includes(value), label); return value; }
