import assert from 'node:assert/strict';

export function assertLafeaExecutionCustody(stage, expected = {}) {
  const mesh = stage?.retainedAnalysisMeshEvidenceV2;
  const execution = stage?.execution;
  assert.ok(mesh, 'retained v2 mesh evidence is required');
  assert.ok(execution, 'qualified execution is required');
  assert.equal(mesh.qualification, 'PASS');
  assert.ok(['CURRENT_PASS', 'CURRENT_WARNING'].includes(stage.analysisMeshCustodyProjection?.state));
  assert.equal(stage.analysisMeshCustodyProjection?.usableForRun, true);
  assert.equal(execution.status, 'QUALIFIED');
  if (expected.route) assert.equal(execution.route, expected.route);
  assert.equal(execution.meshHash, mesh.meshHash);
  assert.equal(stage.lifecycle?.artifacts?.ANALYSIS_MESH?.artifactHash, mesh.meshHash);
  assert.equal(stage.lifecycle?.artifacts?.EXECUTION?.artifactHash, execution.compiledExecutionHash);
  assert.equal(stage.lifecycle?.artifacts?.RECOVERY?.status, 'CURRENT');
  assert.equal(stage.lifecycle?.artifacts?.RECOVERY?.qualification, 'PASS');
  assert.equal(stage.lifecycleReadiness?.calculationState, 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT');
  assert.equal(stage.lifecycleReadiness?.resultReady, true);
  assert.equal(stage.orchestration?.sections?.EXECUTION?.state, 'COMPLETE');
  assert.equal(stage.orchestration?.sections?.RESULTS?.state, 'COMPLETE');
  if (expected.resultAccepted) expected.resultAccepted(execution.result);

  return Object.freeze({
    sourceHash: stage.sourceAuthority?.sourceHash ?? stage.lifecycle?.source?.sourceHash ?? null,
    meshHash: mesh.meshHash,
    meshArtifactHash: mesh.artifactHash,
    solverModelHash: execution.solverModelHash,
    compiledExecutionHash: execution.compiledExecutionHash,
    recoveryArtifactHash: stage.lifecycle?.artifacts?.RECOVERY?.artifactHash ?? null,
  });
}

export function assertSourceEditRevokesOldAuthority(before, after) {
  const beforeSource = before.sourceAuthority?.sourceHash ?? before.lifecycle?.source?.sourceHash ?? null;
  const afterSource = after.sourceAuthority?.sourceHash ?? after.lifecycle?.source?.sourceHash ?? null;
  assert.match(beforeSource ?? '', /^sha256:[0-9a-f]{64}$/u);
  assert.match(afterSource ?? '', /^sha256:[0-9a-f]{64}$/u);
  assert.notEqual(afterSource, beforeSource, 'engineering source edit must change source authority');
  assert.notEqual(after.analysisMeshCustodyProjection?.state, 'CURRENT_PASS');
  assert.notEqual(after.analysisMeshCustodyProjection?.state, 'CURRENT_WARNING');
  assert.notEqual(after.orchestration?.sections?.AUTHORIZATION?.state, 'READY');
  assert.notEqual(after.orchestration?.sections?.EXECUTION?.state, 'COMPLETE');
  assert.notEqual(after.lifecycleReadiness?.calculationState, 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT');
  assert.notEqual(after.lifecycleReadiness?.resultReady, true);
  if (after.execution) {
    assert.notEqual(after.execution.compiledExecutionHash, before.execution?.compiledExecutionHash);
  }
}

export function assertMeshChangeRevokesOldAuthority(before, after) {
  const beforeMesh = before.retainedAnalysisMeshEvidenceV2?.meshHash;
  assert.match(beforeMesh ?? '', /^sha256:[0-9a-f]{64}$/u);
  assert.notEqual(after.analysisMeshCustodyProjection?.state, 'CURRENT_PASS');
  assert.notEqual(after.analysisMeshCustodyProjection?.state, 'CURRENT_WARNING');
  assert.notEqual(after.orchestration?.sections?.AUTHORIZATION?.state, 'READY');
  assert.notEqual(after.orchestration?.sections?.EXECUTION?.state, 'COMPLETE');
  assert.notEqual(after.lifecycleReadiness?.resultReady, true);
  if (after.execution) assert.notEqual(after.execution.meshHash, beforeMesh);
}

export function maxContinuumDisplacement(loadCase) {
  return Math.max(...loadCase.nodalDisplacements.map((row) => Math.hypot(row.ux, row.uy)));
}

export function maxContinuumVonMises(loadCase) {
  let value = 0;
  for (const element of loadCase.elementResults) {
    if (element.recoveryLayer === 'INTEGRATION_POINT' && Array.isArray(element.gaussPointResults)) {
      for (const point of element.gaussPointResults) value = Math.max(value, Math.abs(point.vonMises));
    } else {
      value = Math.max(value, Math.abs(element.vonMises));
    }
  }
  return value;
}

export function closeRelative(actual, expected, relative = 1e-8, absolute = 1e-10) {
  const tolerance = Math.max(absolute, relative * Math.max(1, Math.abs(expected)));
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
}
