#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
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
import {
  shellMidsurfaceFrameAtUvAny,
} from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { baseSource } from './lafea.4-fixtures.mjs';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-curved-hole/fixed-probe-convergence-v1.json', import.meta.url),
  'utf8',
));
const SOURCE_HASH = `sha256:${'4'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const EDGE_TOLERANCE = 1e-8;

assert.equal(definition.stageId, 'LAFEA.4');
assert.equal(definition.formulation, LAFEA_SHELL_ELEMENT);
assert.equal(definition.benchmarkQualified, false);
assert.equal(definition.releaseQualified, false);
assert.deepEqual(definition.meshTargetsMm, [20, 10, 5]);
assert.ok(definition.prohibitions.includes('NO_MOVING_MAXIMUM_ACCEPTANCE'));
assert.ok(definition.prohibitions.includes('NO_CORNER_SINGULARITY_ACCEPTANCE'));

const geometry = createGeometry(definition.geometry);
const parent = createParent(geometry);
const levels = definition.meshTargetsMm.map((target) => solveLevel(target, parent, geometry));

for (const level of levels) {
  if (definition.acceptance.requireMeshQualityPassAtEveryLevel) {
    assert.equal(level.meshQualification, 'PASS', `mesh target ${level.targetElementLength} must pass quality`);
    assert.equal(level.blockingElementCount, 0);
  }
  if (definition.acceptance.requireForceEquilibriumAtEveryLevel) {
    assert.equal(level.forceEquilibrium, true, `force equilibrium failed at ${level.targetElementLength}`);
  }
  if (definition.acceptance.requireMomentEquilibriumAtEveryLevel) {
    assert.equal(level.momentEquilibrium, true, `moment equilibrium failed at ${level.targetElementLength}`);
  }
}

const probeResults = definition.probes.map((probe) => qualifyProbe(probe, levels, definition));

console.log(JSON.stringify({
  check: 'lafea-tech4-curved-hole-convergence',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  scope: definition.scope,
  levels: levels.map((level) => ({
    targetElementLength: level.targetElementLength,
    nodeCount: level.nodeCount,
    elementCount: level.elementCount,
    minimumScaledJacobian: level.minimumScaledJacobian,
    maximumAdjacentSizeRatio: level.maximumAdjacentSizeRatio,
    forceEquilibrium: level.forceEquilibrium,
    momentEquilibrium: level.momentEquilibrium,
  })),
  probeResults,
  movingMaximumUsed: false,
  benchmarkQualified: false,
  releaseQualified: false,
}, null, 2));

function solveLevel(targetElementLength, parent, geometryValue) {
  const profile = meshProfile(targetElementLength);
  const produced = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: parent,
    meshProfile: profile,
  });
  const mesh = produced.evidence.mesh;
  const source = shellSource(mesh, geometryValue, definition);
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.accepted, true, result.qualification.summary);
  const loadCase = result.loadCaseResults[0];
  const probeRows = definition.probes.map((probe) => sampleProbe(
    probe,
    mesh,
    geometryValue,
    result,
    definition.acceptance.probeContainmentTolerance,
  ));
  const scaledJ = produced.evidence.quality.gateResults.find((row) => row.metric === 'SCALED_JACOBIAN');
  const adjacent = produced.evidence.quality.gateResults.find((row) => row.metric === 'ADJACENT_SIZE_RATIO');
  assert.ok(scaledJ);
  assert.ok(adjacent, 'TECH-1 adjacent-size authority must be present for LAFEA.4');
  return Object.freeze({
    targetElementLength,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    meshQualification: produced.evidence.qualification,
    blockingElementCount: produced.evidence.quality.blockingElementIds.length,
    minimumScaledJacobian: scaledJ.value,
    maximumAdjacentSizeRatio: adjacent.value,
    forceEquilibrium: loadCase.forceEquilibrium.qualification.accepted,
    momentEquilibrium: loadCase.momentEquilibrium.qualification.accepted,
    probeRows,
  });
}

function shellSource(mesh, geometryValue, spec) {
  const uvByNodeId = new Map();
  const nodes = mesh.nodes.map((node) => {
    const uv = curvedHoleShellUvAtPoint3d(geometryValue, node);
    uvByNodeId.set(node.nodeId, uv);
    const frame = shellMidsurfaceFrameAtUvAny(geometryValue, uv.u, uv.v);
    return {
      nodeId: node.nodeId,
      position: [node.x, node.y, node.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `TECH4-${node.nodeId}`,
    };
  });
  const elements = mesh.elements.map((element) => ({
    elementId: element.elementId,
    nodeIds: [...element.nodeIds],
    materialId: 'MAT',
    thickness: spec.geometry.thicknessMm,
    sourceReference: `TECH4-${element.elementId}`,
  }));
  const constraints = boundaryConstraints(nodes, uvByNodeId, geometryValue, spec);
  return baseSource({
    modelIdentity: `TECH4-CURVED-HOLE-${mesh.meshIdentity}`,
    materials: [{ materialId: 'MAT', elasticModulus: spec.material.elasticModulusMpa,
      poissonRatio: spec.material.poissonRatio, sourceReference: 'TECH4-MAT' }],
    nodes,
    elements,
    constraints,
    loadCases: [{
      loadCaseId: 'AXIAL-EXTENSION',
      nodalLoads: [],
      pressureLoads: [],
      sourceReference: 'TECH4-AXIAL-EXTENSION',
    }],
  });
}

function boundaryConstraints(nodes, uvByNodeId, geometryValue, spec) {
  const constraints = [];
  const bottom = spec.loading.bottomRimVmm;
  const top = spec.loading.topRimVmm;
  const extension = spec.loading.nominalAxialStrain * (top - bottom);
  const axis = vector(geometryValue.surface.axisDirection);
  for (const node of nodes) {
    const uv = uvByNodeId.get(node.nodeId);
    if (Math.abs(uv.v - bottom) <= EDGE_TOLERANCE) {
      appendConstraints(constraints, node.nodeId, [0, 0, 0, 0, 0], 'BOTTOM');
    } else if (Math.abs(uv.v - top) <= EDGE_TOLERANCE) {
      appendConstraints(constraints, node.nodeId, [
        axis[0] * extension,
        axis[1] * extension,
        axis[2] * extension,
        0,
        0,
      ], 'TOP');
    }
  }
  assert.ok(constraints.length > 0, 'end-rim constraints are required');
  return constraints;
}

function appendConstraints(target, nodeId, values, rim) {
  ['UX', 'UY', 'UZ', 'R1', 'R2'].forEach((dof, index) => target.push({
    constraintId: `TECH4-${rim}-${nodeId}-${dof}`,
    nodeId,
    dof,
    value: values[index],
    sourceReference: `TECH4-${rim}-${nodeId}-${dof}`,
  }));
}

function sampleProbe(probe, mesh, geometryValue, result, tolerance) {
  const uvByNodeId = new Map(mesh.nodes.map((node) => [
    node.nodeId,
    curvedHoleShellUvAtPoint3d(geometryValue, node),
  ]));
  const candidates = [];
  for (const element of mesh.elements) {
    const points = element.nodeIds.map((nodeId) => uvByNodeId.get(nodeId));
    const barycentric = barycentricCoordinates(probe.uMm, probe.vMm, points);
    if (!barycentric) continue;
    const minimum = Math.min(...barycentric);
    if (minimum >= -tolerance) {
      candidates.push({ elementId: element.elementId, barycentric, minimum });
    }
  }
  assert.ok(candidates.length > 0, `probe ${probe.probeId} is not inside any retained element`);
  candidates.sort((left, right) => right.minimum - left.minimum
    || left.elementId.localeCompare(right.elementId));
  const chosen = candidates[0];
  assert.ok(
    chosen.minimum > tolerance,
    `probe ${probe.probeId} lies on/too near an element edge; mapping is not unique enough`,
  );

  const elementResult = result.loadCaseResults[0].elementResults
    .find((row) => row.elementId === chosen.elementId);
  const elementEvidence = result.meshEvidence.elements
    .find((row) => row.elementId === chosen.elementId);
  assert.ok(elementResult && elementEvidence);
  const axis = vector(geometryValue.surface.axisDirection);
  const [a, b] = localDirection(axis, elementEvidence.localFrame);
  const axialMembraneStress = projectStress(elementResult.membraneStress, a, b);
  return Object.freeze({
    probeId: probe.probeId,
    uMm: probe.uMm,
    vMm: probe.vMm,
    elementId: chosen.elementId,
    minimumBarycentricMargin: chosen.minimum,
    axialMembraneStressMpa: axialMembraneStress,
  });
}

function qualifyProbe(probe, levels, spec) {
  const samples = levels.map((level) => {
    const row = level.probeRows.find((candidate) => candidate.probeId === probe.probeId);
    assert.ok(row);
    return row;
  });
  const values = samples.map((row) => row.axialMembraneStressMpa);
  const d21 = values[1] - values[0];
  const d32 = values[2] - values[1];
  if (spec.acceptance.requireMonotonicThreeLevelSequence) {
    assert.ok(d21 * d32 > 0,
      `${probe.probeId} fixed-probe sequence is not monotonic: ${values.join(', ')}`);
  }
  assert.ok(Math.abs(d32) > Number.EPSILON, `${probe.probeId} fine difference is numerically zero`);
  const r = spec.refinementRatio;
  const apparentOrder = Math.log(Math.abs(d21 / d32)) / Math.log(r);
  assert.ok(Number.isFinite(apparentOrder));
  assert.ok(apparentOrder >= spec.acceptance.minimumApparentOrder,
    `${probe.probeId} apparent order ${apparentOrder} below ${spec.acceptance.minimumApparentOrder}`);
  assert.ok(apparentOrder <= spec.acceptance.maximumApparentOrder,
    `${probe.probeId} apparent order ${apparentOrder} above ${spec.acceptance.maximumApparentOrder}`);
  const denominator = r ** apparentOrder - 1;
  assert.ok(denominator > 0);
  const fineValue = values[2];
  assert.ok(Math.abs(fineValue) > Number.EPSILON);
  const fineGci = spec.gciSafetyFactor
    * Math.abs((values[2] - values[1]) / fineValue)
    / denominator;
  assert.ok(fineGci <= probe.maximumFineGci,
    `${probe.probeId} fine GCI ${fineGci} exceeds ${probe.maximumFineGci}`);
  const extrapolated = values[2] + (values[2] - values[1]) / denominator;
  return Object.freeze({
    probeId: probe.probeId,
    coordinatesMm: Object.freeze({ u: probe.uMm, v: probe.vMm }),
    elementIdsByLevel: Object.freeze(samples.map((row) => row.elementId)),
    minimumBarycentricMarginByLevel: Object.freeze(samples.map((row) => row.minimumBarycentricMargin)),
    axialMembraneStressMpaByLevel: Object.freeze(values),
    apparentOrder,
    extrapolatedAxialMembraneStressMpa: extrapolated,
    fineGci,
    maximumFineGci: probe.maximumFineGci,
    qualification: 'PASS',
  });
}

function createGeometry(spec) {
  const halfSpan = Math.PI * spec.radiusMm / 4;
  return createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'TECH4-CURVED-HOLE-FIXED-PROBE',
    lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER',
      axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 },
      radialDirection: { x: 0, y: 0, z: 1 },
      radius: spec.radiusMm,
    },
    orientationPolicy: LAFEA_SHELL_CURVED_HOLE_ORIENTATION,
    vertices: [
      { vertexId: 'O1', u: -halfSpan, v: spec.outerVMinMm },
      { vertexId: 'O2', u: halfSpan, v: spec.outerVMinMm },
      { vertexId: 'O3', u: halfSpan, v: spec.outerVMaxMm },
      { vertexId: 'O4', u: -halfSpan, v: spec.outerVMaxMm },
      { vertexId: 'H1', u: spec.hole.uMinMm, v: spec.hole.vMinMm },
      { vertexId: 'H2', u: spec.hole.uMinMm, v: spec.hole.vMaxMm },
      { vertexId: 'H3', u: spec.hole.uMaxMm, v: spec.hole.vMaxMm },
      { vertexId: 'H4', u: spec.hole.uMaxMm, v: spec.hole.vMinMm },
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
}

function createParent(geometry) {
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: 'TECH4-CURVED-HOLE-FIXED-PROBE-DOMAIN',
    sourceHash: SOURCE_HASH,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  return createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash: SOURCE_HASH,
    analysisDomain: domain,
    geometry,
    producerRef: 'TECH4-CURVED-HOLE-FIXED-PROBE',
  });
}

function meshProfile(target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `TECH4_LAFEA4_CURVED_HOLE_${target}`,
    sourceRevision: 'TECH4',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function barycentricCoordinates(u, v, triangle) {
  if (triangle.length !== 3) return null;
  const [a, b, c] = triangle;
  const denominator = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
  if (Math.abs(denominator) <= 1e-14) return null;
  const l1 = ((b.v - c.v) * (u - c.u) + (c.u - b.u) * (v - c.v)) / denominator;
  const l2 = ((c.v - a.v) * (u - c.u) + (a.u - c.u) * (v - c.v)) / denominator;
  return [l1, l2, 1 - l1 - l2];
}

function localDirection(global, frame) {
  let a = dot(global, frame.ex);
  let b = dot(global, frame.ey);
  const length = Math.hypot(a, b);
  assert.ok(length > 0);
  a /= length;
  b /= length;
  return [a, b];
}

function projectStress(stress, a, b) {
  return a ** 2 * stress.sigmaX + b ** 2 * stress.sigmaY + 2 * a * b * stress.tauXY;
}
function vector(value) { return Array.isArray(value) ? [...value] : [value.x, value.y, value.z]; }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function segment(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }
