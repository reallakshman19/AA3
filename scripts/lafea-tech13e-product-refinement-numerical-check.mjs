#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../src/core/local-shell/index.js';
import { canonicalProfile, PROFILE_KINDS } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
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
  cylindricalShellFrameAtUv,
  cylindricalShellUvAtPoint3d,
  curvedShellGeometryBounds,
} from '../src/workspace/lafea-shell-curved-midsurface-contract.js';
import { shellMidsurfaceFrameAtUvAny } from '../src/workspace/lafea-shell-midsurface-dispatch.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { previewLafea4ShellProductRefinement } from '../src/workspace/lafea4-shell-product-refinement-adapter.js';
import {
  evaluateLafea4ShellProductRefinementAcceptance,
  requireLafea4ShellProductRefinementCandidatePass,
} from '../src/workspace/lafea4-shell-product-refinement-acceptance.js';
import { baseSource } from './lafea.4-fixtures.mjs';

const definition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-refinement/product-refinement-numerical-qualification-v1.json', import.meta.url),
  'utf8',
));
const curvedDefinition = JSON.parse(fs.readFileSync(
  new URL('../validation/lafea4-curved-hole/fixed-probe-convergence-v1.json', import.meta.url),
  'utf8',
));
const ROOT2 = Math.sqrt(0.5);
const EDGE_TOLERANCE = 1e-8;
const PROBE_TOLERANCE = 1e-9;

assert.equal(definition.stageId, 'LAFEA.4');
assert.equal(definition.formulation, LAFEA_SHELL_ELEMENT);
assert.equal(definition.productActivation.thisDefinitionActivatesProductRetention, false);
assert.equal(definition.productActivation.thisDefinitionEnablesRefineControl, false);
assert.equal(definition.productActivation.thisDefinitionGrantsReleaseAuthority, false);
assert.equal(curvedDefinition.stageId, 'LAFEA.4');
assert.deepEqual(curvedDefinition.probes.map((row) => row.probeId),
  ['NEAR_SIDE', 'NEAR_TOP', 'FAR_SIDE']);

const smooth = qualifySmoothCylinder(definition.smoothCylinder);
const curvedHole = qualifyCurvedHole(definition.curvedHole, curvedDefinition);

console.log(JSON.stringify({
  check: 'lafea-tech13e-product-refinement-numerical',
  status: 'PASS',
  qualificationId: definition.qualificationId,
  smoothCylinder: smooth,
  curvedHole,
  movingMaximumUsedForProbeAcceptance: false,
  productRetentionActivated: false,
  refineControlEnabled: false,
  releaseQualified: false,
}, null, 2));

function qualifySmoothCylinder(spec) {
  const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
  const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH13E-SMOOTH-CYLINDER');
  const midsurface = createLafeaSimulatedShellMidsurfaceEvidence(
    'LAFEA.4', authority.sourceHash, document,
  );
  const bounds = curvedShellGeometryBounds(midsurface.geometry);
  close(midsurface.geometry.surface.radius, spec.radiusMm, 1e-12);
  close(bounds.axialSpan, spec.lengthMm, 1e-12);
  close(bounds.angularSpanDegrees, spec.spanDegrees, 1e-12);

  const coarseProfile = meshProfile('TECH13E_SMOOTH_COARSE', spec.coarseGlobalTargetMm);
  const fineProfile = meshProfile('TECH13E_SMOOTH_FINE', spec.globalFineTargetMm);
  const coarse = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: midsurface, meshProfile: coarseProfile,
  }).evidence;
  const fine = produceLafeaShellAnalysisMesh({
    midsurfaceEvidence: midsurface, meshProfile: fineProfile,
  }).evidence;
  assert.equal(coarse.qualification, 'PASS');
  assert.equal(fine.qualification, 'PASS');

  const probes = spec.fixedProbes.map((probe) => ({
    ...probe,
    uMm: bounds.uMin + probe.uFraction * (bounds.uMax - bounds.uMin),
    vMm: bounds.vMin + probe.vFraction * (bounds.vMax - bounds.vMin),
  }));
  const localCore = probes.find((probe) => probe.probeId === 'LOCAL_CORE');
  const targetElementId = hostElementAtUv(
    coarse.mesh,
    midsurface.geometry,
    cylindricalShellUvAtPoint3d,
    localCore.uMm,
    localCore.vMm,
  ).elementId;
  const input = {
    stage: { stageId: 'LAFEA.4', lifecycleBinding: { status: 'CURRENT' } },
    parentEvidence: coarse,
    midsurfaceEvidence: midsurface,
    meshProfile: coarseProfile,
    request: {
      commandId: 'TECH13E-SMOOTH-LOCAL-REFINE',
      targetType: 'ELEMENT',
      targetIds: [targetElementId],
      targetElementLength: spec.localTargetMm,
      lengthUnit: midsurface.geometry.lengthUnit,
      reason: 'TECH13E smooth-cylinder local-vs-global qualification',
    },
  };
  const adapter = previewLafea4ShellProductRefinement(input);
  const acceptance = evaluateLafea4ShellProductRefinementAcceptance({
    stage: input.stage,
    parentEvidence: coarse,
    midsurfaceEvidence: midsurface,
    meshProfile: coarseProfile,
    adapterResult: adapter,
  });
  requireLafea4ShellProductRefinementCandidatePass(acceptance);

  const coarseSolve = solveSmoothMesh(coarse.mesh, midsurface.geometry, spec, probes);
  const localSolve = solveSmoothMesh(adapter.productEvidence.mesh, midsurface.geometry, spec, probes);
  const fineSolve = solveSmoothMesh(fine.mesh, midsurface.geometry, spec, probes);
  if (spec.acceptance.forceEquilibriumRequired) {
    assert.equal(localSolve.forceEquilibrium, true);
    assert.equal(fineSolve.forceEquilibrium, true);
  }
  if (spec.acceptance.momentEquilibriumRequired) {
    assert.equal(localSolve.momentEquilibrium, true);
    assert.equal(fineSolve.momentEquilibrium, true);
  }
  assert.ok(localSolve.maximumRelativeAnalyticalStressError
    <= spec.acceptance.maximumCandidateRelativeAnalyticalStressError,
  `smooth candidate analytical stress error ${localSolve.maximumRelativeAnalyticalStressError}`);
  if (spec.acceptance.candidateMayWorsenCoarseAnalyticalError === false) {
    assert.ok(localSolve.maximumRelativeAnalyticalStressError
      <= coarseSolve.maximumRelativeAnalyticalStressError + 1e-12,
    `local refinement worsened smooth analytical error: ${coarseSolve.maximumRelativeAnalyticalStressError} -> ${localSolve.maximumRelativeAnalyticalStressError}`);
  }
  const limits = {
    LOCAL_CORE: spec.acceptance.maximumLocalCoreDifferenceVsGlobalFine,
    TRANSITION: spec.acceptance.maximumTransitionDifferenceVsGlobalFine,
    FAR_FIELD: spec.acceptance.maximumFarFieldDifferenceVsGlobalFine,
  };
  const probeComparisons = probes.map((probe) => {
    const local = localSolve.probes.find((row) => row.probeId === probe.probeId);
    const globalFine = fineSolve.probes.find((row) => row.probeId === probe.probeId);
    const relativeDifference = relativeDifferenceOf(local.hoopMembraneStressMpa,
      globalFine.hoopMembraneStressMpa);
    assert.ok(relativeDifference <= limits[probe.probeId],
      `${probe.probeId} smooth local/global difference ${relativeDifference} > ${limits[probe.probeId]}`);
    return Object.freeze({
      probeId: probe.probeId,
      coordinatesMm: { u: probe.uMm, v: probe.vMm },
      localStressMpa: local.hoopMembraneStressMpa,
      globalFineStressMpa: globalFine.hoopMembraneStressMpa,
      relativeDifference,
      maximumAllowed: limits[probe.probeId],
      qualification: 'PASS',
    });
  });
  return Object.freeze({
    analyticalHoopStressMpa: spec.expectedHoopStressMpa,
    coarse: summary(coarse, coarseSolve),
    local: summary(adapter.productEvidence, localSolve),
    globalFine: summary(fine, fineSolve),
    targetElementIds: [targetElementId],
    candidateAcceptanceHash: acceptance.semanticHash,
    candidateParentNormal: acceptance.parentNormal,
    probeComparisons,
    qualification: 'PASS',
  });
}

function solveSmoothMesh(mesh, geometry, spec, probes) {
  const uvById = new Map();
  const nodes = mesh.nodes.map((node) => {
    const uv = cylindricalShellUvAtPoint3d(geometry, node);
    uvById.set(node.nodeId, uv);
    const frame = cylindricalShellFrameAtUv(geometry, uv.u, uv.v);
    const tangent = vector(frame.rotationBasis1);
    const displacement = tangent.map((value) => value * spec.prescribedHoopStrain * uv.u);
    return {
      nodeId: node.nodeId,
      position: [node.x, node.y, node.z],
      director: vector(frame.director),
      rotationBasis1: tangent,
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `TECH13E-SMOOTH-${node.nodeId}`,
      prescribed: displacement,
    };
  });
  const source = baseSource({
    modelIdentity: `TECH13E-SMOOTH-${mesh.meshIdentity}`,
    materials: [{
      materialId: 'MAT', elasticModulus: spec.elasticModulusMpa,
      poissonRatio: spec.poissonRatio, sourceReference: 'TECH13E-SMOOTH-MAT',
    }],
    nodes: nodes.map(({ prescribed, ...node }) => node),
    elements: mesh.elements.map((element) => ({
      elementId: element.elementId,
      nodeIds: [...element.nodeIds],
      materialId: 'MAT',
      thickness: spec.thicknessMm,
      sourceReference: `TECH13E-SMOOTH-${element.elementId}`,
    })),
    constraints: nodes.flatMap((node) => constraints(node.nodeId, [...node.prescribed, 0, 0], 'SMOOTH')),
    loadCases: [{
      loadCaseId: 'HOOP-STRAIN', nodalLoads: [], pressureLoads: [],
      sourceReference: 'TECH13E-SMOOTH-HOOP-STRAIN',
    }],
  });
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.accepted, true, result.qualification.summary);
  let maximumRelativeAnalyticalStressError = 0;
  for (const row of result.loadCaseResults[0].elementResults) {
    const element = mesh.elements.find((item) => item.elementId === row.elementId);
    const centroid = uvCentroid(element, uvById);
    const tangent = vector(cylindricalShellFrameAtUv(geometry, centroid.u, centroid.v).rotationBasis1);
    const evidence = result.meshEvidence.elements.find((item) => item.elementId === row.elementId);
    const [a, b] = localDirection(tangent, evidence.localFrame);
    const stress = projectStress(row.membraneStress, a, b);
    maximumRelativeAnalyticalStressError = Math.max(maximumRelativeAnalyticalStressError,
      Math.abs(stress - spec.expectedHoopStressMpa) / Math.abs(spec.expectedHoopStressMpa));
  }
  const probeRows = probes.map((probe) => sampleStressProbe({
    probe,
    mesh,
    uvById,
    result,
    globalDirectionAt: (u, v) => vector(cylindricalShellFrameAtUv(geometry, u, v).rotationBasis1),
    valueName: 'hoopMembraneStressMpa',
  }));
  const loadCase = result.loadCaseResults[0];
  return Object.freeze({
    maximumRelativeAnalyticalStressError,
    forceEquilibrium: loadCase.forceEquilibrium.qualification.accepted,
    momentEquilibrium: loadCase.momentEquilibrium.qualification.accepted,
    probes: probeRows,
  });
}

function qualifyCurvedHole(spec, benchmark) {
  const geometry = createCurvedHoleGeometry(benchmark.geometry);
  const midsurface = createCurvedHoleParent(geometry);
  const coarseProfile = meshProfile('TECH13E_HOLE_COARSE', spec.coarseGlobalTargetMm);
  const fineProfile = meshProfile('TECH13E_HOLE_FINE', spec.globalFineTargetMm);
  const coarse = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: midsurface, meshProfile: coarseProfile }).evidence;
  const fine = produceLafeaShellAnalysisMesh({ midsurfaceEvidence: midsurface, meshProfile: fineProfile }).evidence;
  assert.equal(coarse.qualification, 'PASS');
  assert.equal(fine.qualification, 'PASS');

  const targetIds = curvedHoleTargetElements(coarse.mesh, geometry, benchmark, 22.5);
  assert.ok(targetIds.length > 0 && targetIds.length <= spec.maximumTargetElementCount,
    `TECH13E curved-hole target count ${targetIds.length} outside 1..${spec.maximumTargetElementCount}`);
  const input = {
    stage: { stageId: 'LAFEA.4', lifecycleBinding: { status: 'CURRENT' } },
    parentEvidence: coarse,
    midsurfaceEvidence: midsurface,
    meshProfile: coarseProfile,
    request: {
      commandId: 'TECH13E-CURVED-HOLE-LOCAL-REFINE',
      targetType: 'ELEMENT',
      targetIds,
      targetElementLength: spec.localTargetMm,
      lengthUnit: geometry.lengthUnit,
      reason: 'TECH13E curved-hole local-vs-global qualification',
    },
  };
  const adapter = previewLafea4ShellProductRefinement(input);
  const acceptance = evaluateLafea4ShellProductRefinementAcceptance({
    stage: input.stage,
    parentEvidence: coarse,
    midsurfaceEvidence: midsurface,
    meshProfile: coarseProfile,
    adapterResult: adapter,
  });
  requireLafea4ShellProductRefinementCandidatePass(acceptance);
  if (spec.acceptance.candidateAndGlobalFineMeshQualityPassRequired) {
    assert.equal(adapter.productEvidence.qualification, 'PASS');
    assert.equal(fine.qualification, 'PASS');
  }
  if (spec.acceptance.candidateParentNormalPassRequired) assert.equal(acceptance.parentNormal.qualification, 'PASS');

  const localSolve = solveCurvedHoleMesh(adapter.productEvidence.mesh, geometry, benchmark);
  const fineSolve = solveCurvedHoleMesh(fine.mesh, geometry, benchmark);
  if (spec.acceptance.forceEquilibriumRequired) {
    assert.equal(localSolve.forceEquilibrium, true);
    assert.equal(fineSolve.forceEquilibrium, true);
  }
  if (spec.acceptance.momentEquilibriumRequired) {
    assert.equal(localSolve.momentEquilibrium, true);
    assert.equal(fineSolve.momentEquilibrium, true);
  }
  const limits = {
    NEAR_SIDE: spec.acceptance.NEAR_SIDE_maximumRelativeDifferenceVsGlobalFine,
    NEAR_TOP: spec.acceptance.NEAR_TOP_maximumRelativeDifferenceVsGlobalFine,
    FAR_SIDE: spec.acceptance.FAR_SIDE_maximumRelativeDifferenceVsGlobalFine,
  };
  const probeComparisons = benchmark.probes.map((probe) => {
    const local = localSolve.probes.find((row) => row.probeId === probe.probeId);
    const globalFine = fineSolve.probes.find((row) => row.probeId === probe.probeId);
    const relativeDifference = relativeDifferenceOf(local.axialMembraneStressMpa,
      globalFine.axialMembraneStressMpa);
    assert.ok(relativeDifference <= limits[probe.probeId],
      `${probe.probeId} curved-hole local/global difference ${relativeDifference} > ${limits[probe.probeId]}`);
    return Object.freeze({
      probeId: probe.probeId,
      coordinatesMm: { u: probe.uMm, v: probe.vMm },
      localStressMpa: local.axialMembraneStressMpa,
      globalFineStressMpa: globalFine.axialMembraneStressMpa,
      relativeDifference,
      maximumAllowed: limits[probe.probeId],
      qualification: 'PASS',
    });
  });

  const targetUvMap = uvMap(coarse.mesh, geometry, curvedHoleShellUvAtPoint3d);
  const targetUvs = targetIds.map((elementId) => {
    const element = coarse.mesh.elements.find((row) => row.elementId === elementId);
    return uvCentroid(element, targetUvMap);
  });
  const transitionRadius = spec.acceptance.transitionInfluenceRadiusMmExpectedFor15To7_5At1_5;
  const transitionMax = maximumStressInFrozenTransitionZone(
    adapter.productEvidence.mesh, localSolve, targetUvs, spec.localTargetMm, transitionRadius,
  );
  const allowedTransitionMax = fineSolve.maximumAbsoluteAxialMembraneStressMpa
    * (1 + spec.acceptance.transitionZoneMaximumMayExceedGlobalFineOverallMaximumByFraction);
  if (spec.acceptance.transitionZoneArtificialMaximumAllowed === false) {
    assert.ok(transitionMax <= allowedTransitionMax,
      `transition-zone artificial maximum ${transitionMax} > ${allowedTransitionMax}`);
  }

  return Object.freeze({
    coarse: meshOnlySummary(coarse),
    local: summary(adapter.productEvidence, localSolve),
    globalFine: summary(fine, fineSolve),
    targetElementCount: targetIds.length,
    targetElementIds: targetIds,
    candidateAcceptanceHash: acceptance.semanticHash,
    candidateParentNormal: acceptance.parentNormal,
    probeComparisons,
    transitionZone: {
      definition: 'FROZEN_DISTANCE_FROM_PARENT_TARGET_CENTROIDS_V1',
      innerRadiusMm: spec.localTargetMm,
      outerRadiusMm: transitionRadius,
      candidateMaximumAbsoluteAxialMembraneStressMpa: transitionMax,
      globalFineOverallMaximumAbsoluteAxialMembraneStressMpa: fineSolve.maximumAbsoluteAxialMembraneStressMpa,
      maximumAllowed: allowedTransitionMax,
      qualification: 'PASS',
    },
    movingMaximumUsedForProbeAcceptance: false,
    qualification: 'PASS',
  });
}

function solveCurvedHoleMesh(mesh, geometry, spec) {
  const uvById = uvMap(mesh, geometry, curvedHoleShellUvAtPoint3d);
  const nodes = mesh.nodes.map((node) => {
    const uv = uvById.get(node.nodeId);
    const frame = shellMidsurfaceFrameAtUvAny(geometry, uv.u, uv.v);
    return {
      nodeId: node.nodeId,
      position: [node.x, node.y, node.z],
      director: vector(frame.director),
      rotationBasis1: vector(frame.rotationBasis1),
      rotationBasis2: vector(frame.rotationBasis2),
      sourceReference: `TECH13E-HOLE-${node.nodeId}`,
    };
  });
  const constraintsRows = [];
  const bottom = spec.loading.bottomRimVmm;
  const top = spec.loading.topRimVmm;
  const extension = spec.loading.nominalAxialStrain * (top - bottom);
  const axis = vector(geometry.surface.axisDirection);
  for (const node of nodes) {
    const uv = uvById.get(node.nodeId);
    if (Math.abs(uv.v - bottom) <= EDGE_TOLERANCE) {
      constraintsRows.push(...constraints(node.nodeId, [0, 0, 0, 0, 0], 'HOLE-BOTTOM'));
    } else if (Math.abs(uv.v - top) <= EDGE_TOLERANCE) {
      constraintsRows.push(...constraints(node.nodeId, [
        axis[0] * extension, axis[1] * extension, axis[2] * extension, 0, 0,
      ], 'HOLE-TOP'));
    }
  }
  const source = baseSource({
    modelIdentity: `TECH13E-HOLE-${mesh.meshIdentity}`,
    materials: [{ materialId: 'MAT', elasticModulus: spec.material.elasticModulusMpa,
      poissonRatio: spec.material.poissonRatio, sourceReference: 'TECH13E-HOLE-MAT' }],
    nodes,
    elements: mesh.elements.map((element) => ({
      elementId: element.elementId,
      nodeIds: [...element.nodeIds], materialId: 'MAT', thickness: spec.geometry.thicknessMm,
      sourceReference: `TECH13E-HOLE-${element.elementId}`,
    })),
    constraints: constraintsRows,
    loadCases: [{ loadCaseId: 'AXIAL-EXTENSION', nodalLoads: [], pressureLoads: [],
      sourceReference: 'TECH13E-HOLE-AXIAL-EXTENSION' }],
  });
  const result = calculateLocalShell(createCanonicalLocalShellModel(source));
  assert.equal(result.qualification.accepted, true, result.qualification.summary);
  const probes = spec.probes.map((probe) => sampleStressProbe({
    probe: { ...probe, uMm: probe.uMm, vMm: probe.vMm },
    mesh, uvById, result,
    globalDirectionAt: () => axis,
    valueName: 'axialMembraneStressMpa',
  }));
  let maximumAbsoluteAxialMembraneStressMpa = 0;
  const elementStresses = new Map();
  for (const row of result.loadCaseResults[0].elementResults) {
    const evidence = result.meshEvidence.elements.find((item) => item.elementId === row.elementId);
    const [a, b] = localDirection(axis, evidence.localFrame);
    const stress = projectStress(row.membraneStress, a, b);
    elementStresses.set(row.elementId, stress);
    maximumAbsoluteAxialMembraneStressMpa = Math.max(maximumAbsoluteAxialMembraneStressMpa,
      Math.abs(stress));
  }
  const loadCase = result.loadCaseResults[0];
  return Object.freeze({
    forceEquilibrium: loadCase.forceEquilibrium.qualification.accepted,
    momentEquilibrium: loadCase.momentEquilibrium.qualification.accepted,
    maximumAbsoluteAxialMembraneStressMpa,
    elementStresses,
    uvById,
    probes,
  });
}

function maximumStressInFrozenTransitionZone(mesh, solved, targets, inner, outer) {
  let maximum = 0;
  let count = 0;
  for (const element of mesh.elements) {
    const centroid = uvCentroid(element, solved.uvById);
    const distance = Math.min(...targets.map((target) =>
      Math.hypot(centroid.u - target.u, centroid.v - target.v)));
    if (distance <= inner + 1e-12 || distance > outer + 1e-12) continue;
    const stress = solved.elementStresses.get(element.elementId);
    if (!Number.isFinite(stress)) continue;
    maximum = Math.max(maximum, Math.abs(stress));
    count += 1;
  }
  assert.ok(count > 0, 'TECH13E transition-zone must contain retained candidate elements');
  return maximum;
}

function curvedHoleTargetElements(mesh, geometry, benchmark, expansion) {
  const uvById = uvMap(mesh, geometry, curvedHoleShellUvAtPoint3d);
  const selected = new Set();
  for (const element of mesh.elements) {
    const c = uvCentroid(element, uvById);
    if (c.u >= benchmark.geometry.hole.uMinMm - expansion
      && c.u <= benchmark.geometry.hole.uMaxMm + expansion
      && c.v >= benchmark.geometry.hole.vMinMm - expansion
      && c.v <= benchmark.geometry.hole.vMaxMm + expansion) {
      selected.add(element.elementId);
    }
  }
  for (const probe of benchmark.probes.filter((row) => row.probeId !== 'FAR_SIDE')) {
    selected.add(hostElementAtUv(mesh, geometry, curvedHoleShellUvAtPoint3d,
      probe.uMm, probe.vMm).elementId);
  }
  return [...selected].sort();
}

function createCurvedHoleGeometry(spec) {
  const halfSpan = Math.PI * spec.radiusMm / 4;
  return createLafeaCurvedHoleShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4', geometryId: 'TECH13E-CURVED-HOLE', lengthUnit: 'mm',
    surface: {
      kind: 'CYLINDER', axisOrigin: { x: 10, y: -20, z: 30 },
      axisDirection: { x: ROOT2, y: ROOT2, z: 0 }, radialDirection: { x: 0, y: 0, z: 1 },
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
    segments: [segment('OS1','O1','O2'),segment('OS2','O2','O3'),segment('OS3','O3','O4'),segment('OS4','O4','O1'),
      segment('HS1','H1','H2'),segment('HS2','H2','H3'),segment('HS3','H3','H4'),segment('HS4','H4','H1')],
    loops: [
      { loopId: 'OUTER', role: 'OUTER', segmentIds: ['OS1','OS2','OS3','OS4'] },
      { loopId: 'HOLE', role: 'HOLE', segmentIds: ['HS1','HS2','HS3','HS4'] },
    ],
  });
}

function createCurvedHoleParent(geometry) {
  const sourceHash = `sha256:${'d'.repeat(64)}`;
  const domain = createLafeaCurvedHoleShellAnalysisDomain({
    schema: LAFEA_SHELL_CURVED_HOLE_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4', domainId: 'TECH13E-CURVED-HOLE-DOMAIN', sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash, lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_CURVED_HOLE_TOPOLOGY,
  });
  return createLafeaCurvedHoleShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_CURVED_HOLE_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4', sourceHash, analysisDomain: domain, geometry,
    producerRef: 'TECH13E-CURVED-HOLE-PARENT',
  });
}

function meshProfile(identity, target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: identity, sourceRevision: 'TECH13E',
    semanticHash: undefined,
    fields: { continuumElement: 'T3', shellElement: LAFEA_SHELL_ELEMENT,
      globalTargetSize: target, adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 5, aspectRatioBlock: 10, scaledJacobianWarn: 0.5,
      scaledJacobianBlock: 0.2, adaptiveLevels: 3 },
  });
}

function sampleStressProbe({ probe, mesh, uvById, result, globalDirectionAt, valueName }) {
  const host = hostElementFromUvMap(mesh, uvById, probe.uMm, probe.vMm);
  assert.ok(host.minimumBarycentricMargin > PROBE_TOLERANCE,
    `${probe.probeId} lies on/too near an element edge`);
  const row = result.loadCaseResults[0].elementResults.find((item) => item.elementId === host.elementId);
  const evidence = result.meshEvidence.elements.find((item) => item.elementId === host.elementId);
  assert.ok(row && evidence);
  const [a, b] = localDirection(globalDirectionAt(probe.uMm, probe.vMm), evidence.localFrame);
  return Object.freeze({ probeId: probe.probeId, elementId: host.elementId,
    minimumBarycentricMargin: host.minimumBarycentricMargin,
    [valueName]: projectStress(row.membraneStress, a, b) });
}
function hostElementAtUv(mesh, geometry, uvFn, u, v) {
  return hostElementFromUvMap(mesh, uvMap(mesh, geometry, uvFn), u, v);
}
function hostElementFromUvMap(mesh, uvById, u, v) {
  const candidates = [];
  for (const element of mesh.elements) {
    const points = element.nodeIds.slice(0, 3).map((id) => uvById.get(id));
    const bary = barycentric(u, v, points);
    if (!bary) continue;
    const minimum = Math.min(...bary);
    if (minimum >= -PROBE_TOLERANCE) candidates.push({ elementId: element.elementId, minimumBarycentricMargin: minimum });
  }
  assert.ok(candidates.length > 0, `no element contains fixed probe (${u}, ${v})`);
  candidates.sort((a, b) => b.minimumBarycentricMargin - a.minimumBarycentricMargin || a.elementId.localeCompare(b.elementId));
  return candidates[0];
}
function uvMap(mesh, geometry, fn) { return new Map(mesh.nodes.map((node) => [node.nodeId, fn(geometry, node)])); }
function uvCentroid(element, uvById) {
  const rows = element.nodeIds.slice(0, 3).map((id) => uvById.get(id));
  return { u: rows.reduce((sum, row) => sum + row.u, 0) / rows.length,
    v: rows.reduce((sum, row) => sum + row.v, 0) / rows.length };
}
function barycentric(u, v, triangle) {
  if (triangle.length !== 3) return null;
  const [a, b, c] = triangle;
  const d = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
  if (Math.abs(d) <= 1e-14) return null;
  const l1 = ((b.v - c.v) * (u - c.u) + (c.u - b.u) * (v - c.v)) / d;
  const l2 = ((c.v - a.v) * (u - c.u) + (a.u - c.u) * (v - c.v)) / d;
  return [l1, l2, 1 - l1 - l2];
}
function constraints(nodeId, values, prefix) {
  return ['UX','UY','UZ','R1','R2'].map((dof, index) => ({ constraintId: `TECH13E-${prefix}-${nodeId}-${dof}`,
    nodeId, dof, value: values[index], sourceReference: `TECH13E-${prefix}-${nodeId}-${dof}` }));
}
function localDirection(global, frame) {
  let a = dot(global, frame.ex); let b = dot(global, frame.ey);
  const length = Math.hypot(a, b); assert.ok(length > 0); a /= length; b /= length; return [a, b];
}
function projectStress(stress, a, b) { return a ** 2 * stress.sigmaX + b ** 2 * stress.sigmaY + 2 * a * b * stress.tauXY; }
function relativeDifferenceOf(a, b) { return Math.abs(a - b) / Math.max(Number.EPSILON, Math.abs(b)); }
function summary(evidence, solve) { return Object.freeze({ meshHash: evidence.meshHash,
  nodeCount: evidence.mesh.nodes.length, elementCount: evidence.mesh.elements.length,
  qualification: evidence.qualification,
  maximumRelativeAnalyticalStressError: solve.maximumRelativeAnalyticalStressError ?? null,
  forceEquilibrium: solve.forceEquilibrium, momentEquilibrium: solve.momentEquilibrium }); }
function meshOnlySummary(evidence) { return Object.freeze({ meshHash: evidence.meshHash,
  nodeCount: evidence.mesh.nodes.length, elementCount: evidence.mesh.elements.length,
  qualification: evidence.qualification }); }
function vector(value) { return Array.isArray(value) ? [...value] : [value.x, value.y, value.z]; }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function segment(segmentId, startVertexId, endVertexId) { return { segmentId, startVertexId, endVertexId }; }
function close(actual, expected, tolerance) { assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`); }
