#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
  createLafeaMockMeshProfile,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';

const STAGE_ID = 'LAFEA.3';
const source = await createLafeaMockDocument(STAGE_ID);
const normalized = requireLafeaStageComposition(STAGE_ID).normalizeDocument(source);
const authority = issueLafeaSourceAuthority(
  STAGE_ID,
  normalized,
  'LAFEA3_VISIBLE_CONTINUUM_PREFLIGHT_CHECK',
);
const parents = await createLafeaMockDomainAndGeometryEvidence(STAGE_ID, authority.sourceHash);
const profile = createLafeaMockMeshProfile(STAGE_ID);
const store = createLafeaWorkbenchStore({
  initialStage: STAGE_ID,
  initialDocument: normalized,
  initialSourceHash: authority.sourceHash,
});

try {
  store.activateDomainFirstProfile();
  assert.equal(store.registerAnalysisDomain(parents.domain).projection.state, 'CURRENT_PASS');
  assert.equal(
    store.registerAnalysisGeometryEvidence(parents.geometryEvidence).projection.state,
    'CURRENT_PASS',
  );
  store.bindAnalysisMeshProfile(profile);
  const generated = store.generateAnalysisMesh();
  assert.equal(generated.evidence.qualification, 'PASS');

  const before = store.getState().stages[STAGE_ID];
  assert.equal(before.analysisMeshCustodyProjection.state, 'CURRENT_PASS');
  assert.equal(before.analysisMeshCustodyProjection.usableForRun, true);
  assert.equal(before.preparationProjection.state, 'ABSENT');
  assert.equal(before.retainedContinuumPreflightEvidence, null);
  assert.notEqual(before.orchestration.sections.AUTHORIZATION.state, 'READY');

  const prepared = store.prepareContinuumForRun();
  assert.equal(prepared.projection.state, 'CURRENT_PASS');
  assert.equal(prepared.projection.usableForAuthorization, true);
  const current = store.getState().stages[STAGE_ID];
  const preflight = current.retainedContinuumPreflightEvidence;
  assert.ok(preflight);
  assert.equal(preflight.status, 'PASS');
  assert.equal(preflight.meshHash, generated.evidence.meshHash);
  assert.equal(preflight.meshProfileHash, generated.evidence.meshProfileHash);
  assert.match(preflight.solverModelHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(preflight.topologyQualificationHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(preflight.highOrderJacobianQualificationHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(preflight.solverExecuted, false);
  assert.equal(preflight.executionAuthorized, true);
  assert.equal(preflight.releaseQualified, false);
  assert.equal(current.preparationProjection.evidenceHash, preflight.semanticHash);
  assert.equal(current.orchestration.sections.AUTHORIZATION.state, 'READY');

  const replay = store.prepareContinuumForRun();
  assert.equal(replay.changed, false, 'current preflight replay must not create new evidence');
  assert.equal(
    store.getState().stages[STAGE_ID].retainedContinuumPreflightEvidence.semanticHash,
    preflight.semanticHash,
  );

  store.run();
  const executed = store.getState().stages[STAGE_ID];
  assert.equal(executed.execution.status, 'QUALIFIED');
  assert.equal(executed.execution.route, 'DOMAIN_FIRST_COMPILED_SOLVER_MODEL');
  assert.equal(executed.execution.meshHash, generated.evidence.meshHash);
  assert.equal(executed.execution.meshProfileHash, generated.evidence.meshProfileHash);
  assert.equal(executed.execution.solverModelHash, preflight.solverModelHash);
  assert.match(executed.execution.compiledExecutionHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(executed.execution.result.qualification.state, 'ACCEPTED');
  assert.equal(executed.execution.result.loadCaseResults.length, 2);
  assertExecutedSourcePhysics(normalized, executed.execution.canonicalInput);
  for (const loadCase of executed.execution.result.loadCaseResults) {
    assert.ok(Number.isFinite(loadCase.totalStrainEnergy) && loadCase.totalStrainEnergy > 0,
      `${loadCase.loadCaseId} must retain finite nonzero physical strain energy.`);
    assert.ok(Array.isArray(loadCase.nodalDisplacements) && loadCase.nodalDisplacements.length > 0,
      `${loadCase.loadCaseId} must retain recovered nodal displacements.`);
    assert.equal(loadCase.equilibrium?.accepted, true,
      `${loadCase.loadCaseId} must pass the current continuum equilibrium contract.`);
    assert.ok(loadCase.freeDofResiduals.every(
      (row) => Math.abs(row.value) <= loadCase.equilibrium.freeDofTolerance,
    ), `${loadCase.loadCaseId} free-DOF residual exceeds its retained tolerance.`);
  }
  assert.equal(executed.lifecycle.artifacts.ANALYSIS_MESH.artifactHash, generated.evidence.meshHash);
  assert.equal(
    executed.lifecycle.artifacts.EXECUTION.artifactHash,
    executed.execution.compiledExecutionHash,
  );
  assert.equal(executed.lifecycle.artifacts.RECOVERY.status, 'CURRENT');
  assert.equal(executed.lifecycle.artifacts.RECOVERY.qualification, 'PASS');

  const controllerSource = read('../src/workspace/lafea-workbench-controller.js');
  const contentSource = read('../src/workspace/lafea-workbench-content.js');
  assert.match(controllerSource, /onPrepareContinuum:\s*\(\)\s*=>\s*this\.prepareContinuumForRun\(\)/u);
  assert.match(controllerSource, /prepareContinuumForRun\(s\s*=.*this\.store\.prepareContinuumForRun\(s\)/su);
  assert.match(contentSource, /stage\.preparationProjection\?\.state\s*!==\s*'CURRENT_PASS'/u);
  assert.match(contentSource, /options\.handlers\.onPrepareContinuum\?\.\(\)/u);

  console.log(JSON.stringify({
    check: 'lafea3-visible-continuum-preflight',
    status: 'PASS',
    meshHash: generated.evidence.meshHash,
    preflightHash: preflight.semanticHash,
    solverModelHash: preflight.solverModelHash,
    topologyQualificationHash: preflight.topologyQualificationHash,
    highOrderJacobianQualificationHash: preflight.highOrderJacobianQualificationHash,
    executionHash: executed.execution.compiledExecutionHash,
    resultQualification: executed.execution.result.qualification.state,
    loadCaseCount: executed.execution.result.loadCaseResults.length,
    sourcePhysicsParity: true,
    caseEnergy: Object.fromEntries(executed.execution.result.loadCaseResults.map(
      (row) => [row.loadCaseId, row.totalStrainEnergy],
    )),
    visibleActionBound: true,
    releaseQualified: false,
  }));
} finally {
  store.destroy();
}

function assertExecutedSourcePhysics(sourceValue, canonicalInput) {
  assert.ok(canonicalInput, 'Authoritative execution must retain its compiled canonical input.');
  const sourceNodeById = new Map(sourceValue.nodes.map((row) => [row.nodeId, row]));
  const solvedNodeById = new Map(canonicalInput.nodes.map((row) => [row.nodeId, row]));
  assert.equal(canonicalInput.constraints.length, sourceValue.constraints.length,
    'Compiled solve restraint count must equal the source restraint count.');

  for (const constraint of sourceValue.constraints) {
    const sourceNode = sourceNodeById.get(constraint.nodeId);
    const solvedNodeId = uniqueSolvedNodeAt(sourceNode, canonicalInput.nodes);
    assert.ok(canonicalInput.constraints.some((row) =>
      row.nodeId === solvedNodeId && row.dof === constraint.dof && row.value === constraint.value),
    `Source restraint ${constraint.constraintId} did not reach the exact physical point in the solve.`);
  }

  for (const sourceCase of sourceValue.loadCases) {
    const compiledCase = canonicalInput.loadCases.find((row) => row.loadCaseId === sourceCase.loadCaseId);
    assert.ok(compiledCase, `Missing compiled load case ${sourceCase.loadCaseId}.`);
    assert.equal(compiledCase.nodalForces.length, sourceCase.nodalForces.length,
      `${sourceCase.loadCaseId} compiled nodal-force count differs from source.`);
    for (const force of sourceCase.nodalForces) {
      const sourceNode = sourceNodeById.get(force.nodeId);
      const solvedNodeId = uniqueSolvedNodeAt(sourceNode, canonicalInput.nodes);
      assert.ok(solvedNodeById.has(solvedNodeId));
      assert.ok(compiledCase.nodalForces.some((row) =>
        row.nodeId === solvedNodeId && row.fx === force.fx && row.fy === force.fy),
      `Source force ${force.loadId} did not reach the exact physical point in ${sourceCase.loadCaseId}.`);
    }
  }

  const caseB = canonicalInput.loadCases.find((row) => row.loadCaseId === 'CASE-B');
  assert.equal(caseB?.nodalForces.length, 2, 'CASE-B must retain both source nodal forces.');
  assert.ok(caseB.nodalForces.some((row) => row.fx === 0 && row.fy === -15000));
}

function uniqueSolvedNodeAt(sourceNode, solvedNodes) {
  assert.ok(sourceNode, 'Source feature node is missing.');
  const matches = solvedNodes.filter((row) =>
    Math.hypot(row.x - sourceNode.x, row.y - sourceNode.y) <= 1e-9);
  assert.equal(matches.length, 1,
    `Expected exactly one retained solver node at (${sourceNode.x}, ${sourceNode.y}).`);
  return matches[0].nodeId;
}

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
