#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanonicalLocalShellModel } from '../src/core/local-shell/index.js';
import { PROFILE_KINDS, canonicalProfile } from '../src/core/lafea-profile-contract/index.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
  createLafeaMockMeshProfile,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { createLafeaLiveWorkbenchViewportModel } from '../src/workspace/lafea-live-workbench-viewport.js';
import { compileLafeaShellSolverModel } from '../src/workspace/lafea-shell-solver-model.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';
import {
  assertLafeaExecutionCustody,
  closeRelative,
  maxContinuumDisplacement,
  maxContinuumVonMises,
} from './lib/lafea1371-custody-assertions.mjs';
import { executeB02KirschProductionLevel } from './lib/lafea-b02-kirsch-production-route.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTINUUM_STAGE = 'LAFEA.3';
const SHELL_STAGE = 'LAFEA.4';
const CONTINUUM_ROUTE = 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL';
const SHELL_ROUTE = 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';
const MODULUS_BEFORE = 200000;
const MODULUS_AFTER = 210000;
const MODULUS_FACTOR = MODULUS_AFTER / MODULUS_BEFORE;
const EXPECTED_DISPLACEMENT_RATIO = 1 / MODULUS_FACTOR;
const GP1 = Object.freeze({ pointId: 'GP1', xi: 1 / 6, eta: 1 / 6 });

const continuum = await runContinuumSample();
const q1 = q1RetainedT6Binding(continuum);
const q2 = q2KirschFixedProbe();
const shell = await runShellSample();
const q3 = q3ShellPressureEquilibrium(shell);
const q4 = q4TopologyOrientation(shell);
const q5 = await q5MaterialEditInvalidation(continuum);

const body = Object.freeze({
  schema: 'lafea-implementation-authorization-gate-receipt/v1',
  status: 'PASS',
  authority: Object.freeze({
    gatePurpose: 'IMPLEMENTATION_AUTHORIZATION_ONLY',
    releaseAuthorityGranted: false,
    toleranceMutationAllowed: false,
    benchmarkProbeMutationAllowed: false,
    sourceCustodyMutationAllowed: false,
  }),
  q1,
  q2,
  q3,
  q4,
  q5,
});
const receipt = Object.freeze({
  ...body,
  receiptHash: canonicalLafeaSha256({
    schema: 'lafea-implementation-authorization-gate-receipt-hash-input/v1',
    receipt: body,
  }),
});
console.log(JSON.stringify(receipt, null, 2));

continuum.store.destroy();
shell.store.destroy();

async function runContinuumSample() {
  const source = await createLafeaMockDocument(CONTINUUM_STAGE);
  const normalized = requireLafeaStageComposition(CONTINUUM_STAGE).normalizeDocument(source);
  const authority = issueLafeaSourceAuthority(
    CONTINUUM_STAGE, normalized, 'IMPLEMENTATION-AUTHORIZATION-GATE/LAFEA3',
  );
  const parents = await createLafeaMockDomainAndGeometryEvidence(
    CONTINUUM_STAGE, authority.sourceHash,
  );
  const profile = createLafeaMockMeshProfile(CONTINUUM_STAGE);
  const store = createLafeaWorkbenchOrchestratorStore({
    initialStage: CONTINUUM_STAGE,
    initialDocument: normalized,
    initialSourceHash: authority.sourceHash,
  });
  store.activateDomainFirstProfile(CONTINUUM_STAGE);
  store.registerAnalysisDomain(parents.domain, CONTINUUM_STAGE);
  store.registerAnalysisGeometryEvidence(parents.geometryEvidence, CONTINUUM_STAGE);
  store.bindAnalysisMeshProfile(profile, CONTINUUM_STAGE);
  const generated = store.generateAnalysisMesh({}, CONTINUUM_STAGE);
  assert.equal(generated?.evidence?.qualification, 'PASS');
  store.prepareContinuumForRun(CONTINUUM_STAGE);
  store.run();
  const stage = store.getState().stages[CONTINUUM_STAGE];
  const snapshot = assertLafeaExecutionCustody(stage, {
    route: CONTINUUM_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
  });
  return { source, normalized, authority, parents, profile, store, stage, snapshot };
}

function q1RetainedT6Binding(run) {
  const stage = run.stage;
  const meshEvidence = stage.retainedAnalysisMeshEvidenceV2;
  assert.ok(meshEvidence);
  const mesh = meshEvidence.mesh;
  assert.ok(mesh.elements.length > 0);
  assert.equal(mesh.elements.every((row) => row.elementType === 'T6'), true);

  // Deterministic loaded-region choice: nearest retained T6 corner-centroid to
  // the midpoint of the two top loaded source nodes N13/N14 = (180,230) mm.
  const loadedRegion = { x: 180, y: 230 };
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const selected = [...mesh.elements].sort((left, right) => {
    const dl = centroidDistanceSquared(left, nodeById, loadedRegion);
    const dr = centroidDistanceSquared(right, nodeById, loadedRegion);
    return dl - dr || left.elementId.localeCompare(right.elementId);
  })[0];
  assert.equal(selected.nodeIds.length, 6);
  const selectedNodes = selected.nodeIds.map((nodeId) => {
    const node = nodeById.get(nodeId);
    assert.ok(node);
    return { nodeId, x: node.x, y: node.y, z: node.z };
  });

  const hand = independentT6Jacobian(selectedNodes, GP1.xi, GP1.eta);
  const elementEvidence = stage.execution.result.meshEvidence.elementEvidence.find(
    (row) => row.elementId === selected.elementId,
  );
  assert.ok(elementEvidence);
  const solverPoint = elementEvidence.gaussEvidence.find((row) => row.pointId === GP1.pointId);
  assert.ok(solverPoint);
  closeRelative(solverPoint.jacobianDeterminant, hand.determinant, 2e-13, 1e-10);

  const resultElement = stage.execution.result.loadCaseResults
    .find((row) => row.loadCaseId === 'CASE-A')
    ?.elementResults.find((row) => row.elementId === selected.elementId);
  assert.ok(resultElement);
  const resultPoint = resultElement.gaussPointResults.find((row) => row.pointId === GP1.pointId);
  assert.ok(resultPoint);
  closeRelative(resultPoint.jacobianDeterminant, hand.determinant, 2e-13, 1e-10);

  const viewport = createLafeaLiveWorkbenchViewportModel({
    stageId: CONTINUUM_STAGE,
    document: stage.document,
    lifecycle: stage.lifecycle,
    lifecycleBinding: stage.lifecycleBinding,
    sceneRevision: 141301,
    renderPacket: null,
    selection: null,
    retainedMeshEvidence: meshEvidence,
    analysisMeshCustodyState: stage.analysisMeshCustodyProjection?.state ?? null,
  });
  assert.equal(viewport.retainedMeshIdentity.meshHash, meshEvidence.meshHash);
  assert.equal(viewport.retainedMeshIdentity.artifactHash, meshEvidence.artifactHash);

  const material = run.normalized.materials.find((row) => row.materialId === 'MAT');
  const caseA = run.normalized.loadCases.find((row) => row.loadCaseId === 'CASE-A');
  assert.ok(material && caseA);

  return Object.freeze({
    status: 'PASS',
    selectedBy: 'NEAREST_T6_CORNER_CENTROID_TO_SOURCE_LOAD_REGION_MIDPOINT_180_230_MM',
    selectedElementId: selected.elementId,
    orderedNodeIds: [...selected.nodeIds],
    midsideOrdering: Object.freeze({
      node4: 'EDGE_1_2', node5: 'EDGE_2_3', node6: 'EDGE_3_1',
    }),
    nodes: selectedNodes,
    sectionAndMaterial: Object.freeze({
      thickness: run.normalized.elements[0].thickness,
      materialId: material.materialId,
      elasticModulus: material.elasticModulus,
      poissonRatio: material.poissonRatio,
    }),
    physicalLoadCase: Object.freeze({
      loadCaseId: caseA.loadCaseId,
      nodalForces: structuredClone(caseA.nodalForces),
    }),
    integrationPoint: GP1,
    independentMapping: hand,
    solverJacobianDeterminant: solverPoint.jacobianDeterminant,
    recoveredResultJacobianDeterminant: resultPoint.jacobianDeterminant,
    trace: Object.freeze({
      sourceHash: run.authority.sourceHash,
      analysisDomainHash: run.parents.domain.semanticHash,
      analysisGeometryHash: run.parents.geometryEvidence.analysisGeometryHash,
      retainedMeshHash: meshEvidence.meshHash,
      retainedMeshArtifactHash: meshEvidence.artifactHash,
      solverModelHash: stage.execution.solverModelHash,
      compiledExecutionHash: stage.execution.compiledExecutionHash,
      recoveryArtifactHash: stage.lifecycle.artifacts.RECOVERY.artifactHash,
      viewportMeshHash: viewport.retainedMeshIdentity.meshHash,
      viewportMeshArtifactHash: viewport.retainedMeshIdentity.artifactHash,
    }),
    firstFailureModule: 'src/core/local-continuum/t6-element.js::t6BMatrixAt/jacobianAt',
    falsifier: 'SAME_ORDERED_SIX_COORDINATES_AND_NATURAL_POINT_MATCH_HAND_DETJ',
  });
}

function q2KirschFixedProbe() {
  const definitionPath = path.join(ROOT, 'validation/lafea-b02-definitions/B02C-kirsch.json');
  const definition = JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
  const level = definition.meshLadder.levels.at(-1);
  const production = executeB02KirschProductionLevel(definition, 'T6', level);
  const frozen = definition.fixedProbes.find((row) => row.probeId === 'KIRSCH_NEAR_CROWN_PMAX');
  const observed = production.probes.find((row) => row.probe.probeId === frozen.probeId);
  assert.ok(frozen && observed);
  const analytical = kirschPrincipalMaximum({
    x: frozen.physicalCoordinate.x,
    y: frozen.physicalCoordinate.y,
    holeRadius: definition.geometry.holeRadius,
    remoteSigmaX: definition.loadCase.remoteStressSigmaX,
  });
  closeRelative(analytical, frozen.analyticalReferenceValue, 2e-8, 1e-6);
  const relativeError = Math.abs(observed.authoritativeValue - analytical)
    / Math.max(Math.abs(analytical), 1e-30);
  const limit = definition.acceptance.highGradientFineRelativeMaximum;
  assert.ok(relativeError <= limit, `B02C T6 finest fixed-probe error ${relativeError} > ${limit}`);
  assert.equal(observed.nodalStressProjectionUsed, false);
  assert.equal(observed.crossElementAveragingUsed, false);
  assert.equal(observed.displayInterpolationUsed, false);
  assert.equal(observed.movingMaximumUsed, false);

  return Object.freeze({
    status: 'PASS',
    definitionHash: canonicalLafeaSha256(definition),
    method: 'T6',
    levelId: level.levelId,
    h: level.h,
    probeId: frozen.probeId,
    physicalCoordinate: frozen.physicalCoordinate,
    analyticalValue: analytical,
    frozenAnalyticalReferenceValue: frozen.analyticalReferenceValue,
    authoritativeRecoveredValue: observed.authoritativeValue,
    authoritativeRecoveryMethod: observed.recoveryAuthority,
    relativeError,
    acceptanceLimit: limit,
    mapping: observed.mapping,
    displayedOrNodalValue: null,
    displayedOrNodalValueGovernsAcceptance: false,
    trace: Object.freeze({
      sourceHash: observed.custody.sourceHash,
      meshHash: observed.custody.meshHash,
      solverModelHash: observed.custody.solverModelHash,
      compiledExecutionHash: observed.custody.executionHash,
      recoveryArtifactHash: observed.custody.recoveryHash,
      probeEvidenceHash: observed.semanticHash,
    }),
    firstWrongValuePolicy: 'ANALYTICAL->EXACT_PHYSICAL_DIRECT_RECOVERY->PRESENTATION',
  });
}

async function runShellSample() {
  const source = await createLafeaMockDocument(SHELL_STAGE);
  const normalized = requireLafeaStageComposition(SHELL_STAGE).normalizeDocument(source);
  const authority = issueLafeaSourceAuthority(
    SHELL_STAGE, normalized, 'IMPLEMENTATION-AUTHORIZATION-GATE/LAFEA4',
  );
  const parent = createLafeaSimulatedShellMidsurfaceEvidence(
    SHELL_STAGE, authority.sourceHash, normalized,
  );
  const profile = shellProfile(15);
  const store = createLafeaWorkbenchOrchestratorStore({
    initialStage: SHELL_STAGE,
    initialDocument: normalized,
    initialSourceHash: authority.sourceHash,
  });
  store.registerShellMidsurfaceEvidence(parent, SHELL_STAGE);
  store.bindAnalysisMeshProfile(profile, SHELL_STAGE);
  const generated = store.generateAnalysisMesh({}, SHELL_STAGE);
  assert.equal(generated?.evidence?.qualification, 'PASS');
  store.run();
  const stage = store.getState().stages[SHELL_STAGE];
  const snapshot = assertLafeaExecutionCustody(stage, {
    route: SHELL_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.accepted, true),
  });
  return { source, normalized, authority, parent, profile, store, stage, generated, snapshot };
}

function q3ShellPressureEquilibrium(run) {
  const stage = run.stage;
  const geometry = run.parent.geometry;
  const radius = geometry.surface.radius;
  const u = geometry.vertices.map((row) => row.u);
  const v = geometry.vertices.map((row) => row.v);
  const uMin = Math.min(...u); const uMax = Math.max(...u);
  const vMin = Math.min(...v); const vMax = Math.max(...v);
  assert.equal(vMin, 0);
  const angularSpan = (uMax - uMin) / radius;
  const axialLength = vMax - vMin;
  const sourceCase = run.normalized.loadCases.find((row) => row.loadCaseId === 'PRESSURE');
  assert.ok(sourceCase);
  const pressures = [...new Set(sourceCase.pressureLoads.map((row) => row.pressure))];
  const senses = [...new Set(sourceCase.pressureLoads.map((row) => row.sense))];
  assert.equal(pressures.length, 1);
  assert.deepEqual(senses, ['ALONG_ELEMENT_NORMAL']);
  const pressure = pressures[0];

  const forceZ = pressure * radius * axialLength * 2 * Math.sin(angularSpan / 2);
  const analyticalForce = [0, 0, forceZ];
  const analyticalMoment = [0, -forceZ * axialLength / 2, 0];
  const loadCase = stage.execution.result.loadCaseResults.find((row) => row.loadCaseId === 'PRESSURE');
  assert.ok(loadCase);
  vectorClose(loadCase.appliedLoadEvidence.appliedForce, analyticalForce, 2e-10, 1e-7);
  vectorClose(loadCase.appliedLoadEvidence.appliedMomentAboutOrigin, analyticalMoment, 2e-10, 1e-6);
  assert.equal(loadCase.forceEquilibrium.qualification.accepted, true);
  assert.equal(loadCase.momentEquilibrium.qualification.accepted, true);

  const compiled = compileLafeaShellSolverModel({
    stageId: SHELL_STAGE,
    sourceHash: run.authority.sourceHash,
    source: stage.document,
    midsurfaceEvidence: stage.retainedShellMidsurfaceEvidence,
    meshEvidence: stage.retainedAnalysisMeshEvidenceV2,
  });
  const support = shellReactionTotals(compiled.canonicalShellModel, loadCase.reactions);
  vectorClose(support.force, analyticalForce.map((value) => -value), 2e-10, 1e-7);
  vectorClose(support.moment, analyticalMoment.map((value) => -value), 2e-10, 1e-6);

  return Object.freeze({
    status: 'PASS',
    radius,
    angularSpanRadians: angularSpan,
    angularSpanDegrees: angularSpan * 180 / Math.PI,
    axialLength,
    pressure,
    pressureSense: senses[0],
    analyticalForce,
    analyticalMomentAboutOrigin: analyticalMoment,
    compiledAppliedForce: loadCase.appliedLoadEvidence.appliedForce,
    compiledAppliedMomentAboutOrigin: loadCase.appliedLoadEvidence.appliedMomentAboutOrigin,
    solverReactionTotals: support,
    forceEquilibrium: loadCase.forceEquilibrium,
    momentEquilibrium: loadCase.momentEquilibrium,
    contributionCount: loadCase.appliedLoadEvidence.contributions.length,
    trace: Object.freeze({
      sourceHash: stage.execution.sourceHash,
      meshHash: stage.execution.meshHash,
      solverModelHash: stage.execution.solverModelHash,
      compiledExecutionHash: stage.execution.compiledExecutionHash,
      recoveryArtifactHash: stage.lifecycle.artifacts.RECOVERY.artifactHash,
    }),
    forcePassMomentFailIsolationOrder: Object.freeze([
      'SUM_EXACT_NODAL_R_CROSS_F_ABOUT_GLOBAL_ORIGIN',
      'REACTION_FORCE_TRANSPORT_PLUS_R1_R2_TANGENT_MOMENTS',
      'FACET_NORMAL_PRESSURE_SENSE_AND_PARENT_NORMAL_ALIGNMENT',
    ]),
  });
}

function q4TopologyOrientation(run) {
  const source = structuredClone(run.source);
  const canonicalSource = createCanonicalLocalShellModel(source);
  const canonicalById = new Map(canonicalSource.elements.map((row) => [row.elementId, row]));
  const sourceNodeById = new Map(source.nodes.map((row) => [row.nodeId, row]));
  const changed = source.elements.find((row) => {
    const canonical = canonicalById.get(row.elementId);
    return canonical && JSON.stringify(canonical.nodeIds) !== JSON.stringify(row.nodeIds);
  });
  assert.ok(changed, 'LAFEA.4 Sample must expose at least one source triangle whose canonical order changes');
  const canonicalElement = canonicalById.get(changed.elementId);
  const sourceNormal = triangleNormal(changed.nodeIds.map((id) => sourceNodeById.get(id).position));
  const canonicalNormal = triangleNormal(canonicalElement.nodeIds.map((id) => sourceNodeById.get(id).position));
  const sourceCanonicalDot = dot3(sourceNormal.unit, canonicalNormal.unit);
  assert.ok(sourceCanonicalDot > 1 - 1e-12);

  const stage = run.stage;
  const compiled = compileLafeaShellSolverModel({
    stageId: SHELL_STAGE,
    sourceHash: run.authority.sourceHash,
    source: stage.document,
    midsurfaceEvidence: stage.retainedShellMidsurfaceEvidence,
    meshEvidence: stage.retainedAnalysisMeshEvidenceV2,
  });
  const retainedNodeById = new Map(
    stage.retainedAnalysisMeshEvidenceV2.mesh.nodes.map((row) => [row.nodeId, [row.x, row.y, row.z]]),
  );
  const kernelById = new Map(compiled.canonicalShellModel.elements.map((row) => [row.elementId, row]));
  let minimumRetainedKernelNormalDot = 1;
  const orientationBindings = stage.retainedAnalysisMeshEvidenceV2.mesh.elements.map((retained) => {
    const kernel = kernelById.get(retained.elementId);
    assert.ok(kernel);
    assert.deepEqual([...kernel.nodeIds].sort(), [...retained.nodeIds].sort());
    const retainedNormal = triangleNormal(retained.nodeIds.map((id) => retainedNodeById.get(id)));
    const kernelNormal = triangleNormal(kernel.nodeIds.map((id) => retainedNodeById.get(id)));
    const alignment = dot3(retainedNormal.unit, kernelNormal.unit);
    minimumRetainedKernelNormalDot = Math.min(minimumRetainedKernelNormalDot, alignment);
    assert.ok(alignment > 0, `${retained.elementId} kernel normal reversed relative to retained mesh`);
    return { elementId: retained.elementId, retainedNodeIds: retained.nodeIds, kernelNodeIds: kernel.nodeIds, normalAlignment: alignment };
  });

  const pressureSense = run.source.loadCases[0].pressureLoads[0].sense;
  assert.equal(pressureSense, 'ALONG_ELEMENT_NORMAL');
  return Object.freeze({
    status: 'PASS',
    changedSourceElement: Object.freeze({
      elementId: changed.elementId,
      sourceNodeIds: [...changed.nodeIds],
      canonicalNodeIds: [...canonicalElement.nodeIds],
      sourceCoordinates: changed.nodeIds.map((id) => sourceNodeById.get(id).position),
      sourceCrossProduct: sourceNormal.cross,
      sourceUnitNormal: sourceNormal.unit,
      canonicalCrossProduct: canonicalNormal.cross,
      canonicalUnitNormal: canonicalNormal.unit,
      normalAlignment: sourceCanonicalDot,
    }),
    sourceCustodyMutated: false,
    canonicalizationAllowed: true,
    physicalNormalReversalAllowed: false,
    pressureSense,
    retainedKernelElementCount: orientationBindings.length,
    minimumRetainedKernelNormalDot,
    predictedWholeSurfaceReactionIfNormalsReverse: Object.freeze({
      intendedReactionZ: -6000,
      reversedReactionZ: 6000,
      reactionErrorZ: 12000,
    }),
    enforcementBoundary: Object.freeze([
      'src/core/local-shell/geometry.js::canonicalFacet',
      'src/workspace/lafea-shell-solver-model.js::compileLafea4/proveKernelMeshBinding',
      'src/core/local-shell/loads.js::addPressureLoad',
    ]),
  });
}

async function q5MaterialEditInvalidation(run) {
  const baseline = run.store.getState().stages[CONTINUUM_STAGE];
  const baselineSnapshot = assertLafeaExecutionCustody(baseline, {
    route: CONTINUUM_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
  });
  const baselineCase = baseline.execution.result.loadCaseResults.find((row) => row.loadCaseId === 'CASE-A');
  const baselineDisplacement = maxContinuumDisplacement(baselineCase);
  const baselineStress = maxContinuumVonMises(baselineCase);

  assert.equal(baseline.document.materials.find((row) => row.materialId === 'MAT').elasticModulus, MODULUS_BEFORE);
  run.store.setScalar(
    'LAFEA.3.material.elasticModulus', 'MAT', String(MODULUS_AFTER),
    'IMPLEMENTATION-AUTHORIZATION-GATE',
  );
  const invalidated = run.store.getState().stages[CONTINUUM_STAGE];
  assert.notEqual(invalidated.sourceAuthority.sourceHash, baselineSnapshot.sourceHash);
  assert.notEqual(invalidated.analysisMeshCustodyProjection?.state, 'CURRENT_PASS');
  assert.notEqual(invalidated.orchestration.sections.AUTHORIZATION.state, 'READY');
  assert.notEqual(invalidated.lifecycleReadiness.resultReady, true);

  const editedParents = await createLafeaMockDomainAndGeometryEvidence(
    CONTINUUM_STAGE, invalidated.sourceAuthority.sourceHash,
  );
  run.store.activateDomainFirstProfile(CONTINUUM_STAGE);
  run.store.registerAnalysisDomain(editedParents.domain, CONTINUUM_STAGE);
  run.store.registerAnalysisGeometryEvidence(editedParents.geometryEvidence, CONTINUUM_STAGE);
  run.store.bindAnalysisMeshProfile(run.profile, CONTINUUM_STAGE);
  const editedMesh = run.store.generateAnalysisMesh({}, CONTINUUM_STAGE);
  assert.equal(editedMesh.evidence.meshHash, baselineSnapshot.meshHash);
  assert.notEqual(editedMesh.evidence.artifactHash, baselineSnapshot.meshArtifactHash);
  run.store.prepareContinuumForRun(CONTINUUM_STAGE);
  run.store.run();
  const after = run.store.getState().stages[CONTINUUM_STAGE];
  const afterSnapshot = assertLafeaExecutionCustody(after, {
    route: CONTINUUM_ROUTE,
    resultAccepted: (result) => assert.equal(result.qualification?.state, 'ACCEPTED'),
  });
  assert.notEqual(afterSnapshot.sourceHash, baselineSnapshot.sourceHash);
  assert.equal(afterSnapshot.meshHash, baselineSnapshot.meshHash);
  assert.notEqual(afterSnapshot.meshArtifactHash, baselineSnapshot.meshArtifactHash);
  assert.notEqual(afterSnapshot.solverModelHash, baselineSnapshot.solverModelHash);
  assert.notEqual(afterSnapshot.compiledExecutionHash, baselineSnapshot.compiledExecutionHash);
  assert.notEqual(afterSnapshot.recoveryArtifactHash, baselineSnapshot.recoveryArtifactHash);

  const editedCase = after.execution.result.loadCaseResults.find((row) => row.loadCaseId === 'CASE-A');
  const editedDisplacement = maxContinuumDisplacement(editedCase);
  const editedStress = maxContinuumVonMises(editedCase);
  closeRelative(editedDisplacement / baselineDisplacement, EXPECTED_DISPLACEMENT_RATIO, 2e-8, 1e-10);
  closeRelative(editedStress / baselineStress, 1, 2e-8, 1e-8);

  return Object.freeze({
    status: 'PASS',
    edit: Object.freeze({
      materialId: 'MAT', elasticModulusBefore: MODULUS_BEFORE,
      elasticModulusAfter: MODULUS_AFTER, factor: MODULUS_FACTOR,
    }),
    predictionBeforeExecution: Object.freeze({
      displacementRatio: EXPECTED_DISPLACEMENT_RATIO,
      displacementChangePercent: (EXPECTED_DISPLACEMENT_RATIO - 1) * 100,
      forceControlledStressRatio: 1,
    }),
    stateImmediatelyAfterEdit: Object.freeze({
      sourceHash: invalidated.sourceAuthority.sourceHash,
      meshCustodyState: invalidated.analysisMeshCustodyProjection?.state ?? null,
      authorizationState: invalidated.orchestration.sections.AUTHORIZATION.state,
      calculationState: invalidated.lifecycleReadiness.calculationState,
      resultReady: invalidated.lifecycleReadiness.resultReady,
      canonicalModelStatus: invalidated.lifecycle.artifacts.CANONICAL_MODEL?.status ?? null,
      analysisMeshStatus: invalidated.lifecycle.artifacts.ANALYSIS_MESH?.status ?? null,
      executionStatus: invalidated.lifecycle.artifacts.EXECUTION?.status ?? null,
      recoveryStatus: invalidated.lifecycle.artifacts.RECOVERY?.status ?? null,
    }),
    before: baselineSnapshot,
    after: afterSnapshot,
    meshContentHashLegallyReused: afterSnapshot.meshHash === baselineSnapshot.meshHash,
    meshEvidenceArtifactReissued: afterSnapshot.meshArtifactHash !== baselineSnapshot.meshArtifactHash,
    observed: Object.freeze({
      baselineMaxDisplacement: baselineDisplacement,
      editedMaxDisplacement: editedDisplacement,
      displacementRatio: editedDisplacement / baselineDisplacement,
      baselineMaxAuthoritativeVonMises: baselineStress,
      editedMaxAuthoritativeVonMises: editedStress,
      stressRatio: editedStress / baselineStress,
    }),
    custodyConclusion: Object.freeze({
      oldMeshGeometryMayRemainPhysicallyValid: true,
      oldParentBoundMeshEvidenceMayRemainCurrentWithoutRevalidation: false,
      oldExecutionMayRemainCurrent: false,
      oldRecoveryResultMayRemainCurrent: false,
    }),
  });
}

function independentT6Jacobian(nodes, xi, eta) {
  assert.equal(nodes.length, 6);
  const dNdXi = [
    4 * xi + 4 * eta - 3,
    4 * xi - 1,
    0,
    4 * (1 - 2 * xi - eta),
    4 * eta,
    -4 * eta,
  ];
  const dNdEta = [
    4 * xi + 4 * eta - 3,
    0,
    4 * eta - 1,
    -4 * xi,
    4 * xi,
    4 * (1 - xi - 2 * eta),
  ];
  let dxDxi = 0; let dyDxi = 0; let dxDeta = 0; let dyDeta = 0;
  for (let index = 0; index < 6; index += 1) {
    dxDxi += dNdXi[index] * nodes[index].x;
    dyDxi += dNdXi[index] * nodes[index].y;
    dxDeta += dNdEta[index] * nodes[index].x;
    dyDeta += dNdEta[index] * nodes[index].y;
  }
  const determinant = dxDxi * dyDeta - dxDeta * dyDxi;
  assert.ok(determinant > 0);
  return Object.freeze({ xi, eta, dNdXi, dNdEta, dxDxi, dyDxi, dxDeta, dyDeta, determinant });
}

function kirschPrincipalMaximum({ x, y, holeRadius, remoteSigmaX }) {
  const r = Math.hypot(x, y);
  const theta = Math.atan2(y, x);
  const q = (holeRadius / r) ** 2;
  const q2 = q ** 2;
  const c2 = Math.cos(2 * theta);
  const s2 = Math.sin(2 * theta);
  const sigmaR = 0.5 * remoteSigmaX * (1 - q)
    + 0.5 * remoteSigmaX * (1 - 4 * q + 3 * q2) * c2;
  const sigmaTheta = 0.5 * remoteSigmaX * (1 + q)
    - 0.5 * remoteSigmaX * (1 + 3 * q2) * c2;
  const tauRTheta = -0.5 * remoteSigmaX * (1 + 2 * q - 3 * q2) * s2;
  const center = 0.5 * (sigmaR + sigmaTheta);
  const radius = Math.hypot(0.5 * (sigmaR - sigmaTheta), tauRTheta);
  return center + radius;
}

function centroidDistanceSquared(element, nodeById, target) {
  const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));
  const x = corners.reduce((sum, row) => sum + row.x, 0) / 3;
  const y = corners.reduce((sum, row) => sum + row.y, 0) / 3;
  return (x - target.x) ** 2 + (y - target.y) ** 2;
}

function triangleNormal(points) {
  assert.equal(points.length, 3);
  const ab = points[1].map((value, index) => value - points[0][index]);
  const ac = points[2].map((value, index) => value - points[0][index]);
  const cross = cross3(ab, ac);
  const length = Math.hypot(...cross);
  assert.ok(length > 0);
  return { cross, unit: cross.map((value) => value / length) };
}

function shellReactionTotals(model, reactions) {
  const nodeById = new Map(model.nodes.map((row) => [row.nodeId, row]));
  let force = [0, 0, 0];
  let moment = [0, 0, 0];
  for (const row of reactions) {
    const node = nodeById.get(row.nodeId);
    assert.ok(node);
    if (row.kind === 'FORCE') {
      const component = row.dof === 'UX' ? 0 : row.dof === 'UY' ? 1 : 2;
      const f = [0, 0, 0]; f[component] = row.value;
      force = add3(force, f);
      moment = add3(moment, cross3(node.position, f));
    } else {
      assert.equal(row.kind, 'MOMENT');
      const basis = row.dof === 'R1' ? node.rotationBasis1 : node.rotationBasis2;
      moment = add3(moment, basis.map((value) => value * row.value));
    }
  }
  return Object.freeze({ force, moment });
}

function vectorClose(actual, expected, relative, absolute) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => closeRelative(value, expected[index], relative, absolute));
}

function shellProfile(target) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `IMPLEMENTATION_AUTHORIZATION_LAFEA4_${target}`,
    sourceRevision: 'IMPLEMENTATION-AUTHORIZATION-GATE/V1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize: target,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 3,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function add3(a, b) { return a.map((value, index) => value + b[index]); }
function dot3(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
