import assert from 'node:assert/strict';
import { compileInputXmlStiffnessElementAuthorities } from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-elements.js';
import { inputXmlStiffnessFrameElementProfile } from '../../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from '../../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import { elementContributionFromFrameElement } from '../../src/core/linear-fea-solver/element-contributions.js';
import {
  applyOffsetToLoad,
  applyOffsetToStiffness,
  frameOffsetMatrix,
  transformLoadToGlobal,
  transformStiffnessToGlobal,
} from '../../src/core/linear-fea-frame-element/frame-element-stiffness.js';

/**
 * Source-bound forensic on the REAL native frame compiler; never routes a
 * candidate into the authorized solve and never changes the active profile.
 */
export function buildE75ReducerMatrixDiagnostic(preparation) {
  assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics, false,
    'S4 candidate must remain disabled in the actual production capability');
  const source = preparation.sourcePreparation;
  const structural = preparation.structuralPreparation;
  const preflight = preparation.stiffnessPreflight;
  const bindings = structural.segmentBindings.filter(
    (row) => String(row.sourceSegmentId) === 'ACCDB.E75');
  assert.equal(bindings.length, 1, 'E75 one-to-one reducer source binding is required');
  const elementId = bindings[0].elementId;
  const profile = inputXmlStiffnessFrameElementProfile();
  const opts = {
    sourcePreparation: source,
    bendFactorAuthority: preflight.bendFactorAuthority,
    branchFactorAuthority: preflight.branchFactorAuthority,
  };
  const baseline = compileInputXmlStiffnessElementAuthorities(structural, profile, opts);
  const candidate = compileInputXmlStiffnessElementAuthorities(structural, profile, {
    ...opts,
    capabilityProfile: { ...PRODUCTION_CAPABILITY_PROFILE, reducerExactMechanics: true },
  });
  const first = baseline.frameElements.find((row) => row.elementId === elementId);
  const second = candidate.frameElements.find((row) => row.elementId === elementId);
  const existing = preflight.elementLedger.find((row) => row.elementId === elementId);
  const measured = baseline.elementLedger.find((row) => row.elementId === elementId);
  assert.ok(first && second && existing && measured, 'Missing E75 assembled frame/ledger evidence');
  assert.equal(existing.globalStiffnessHash, measured.globalStiffnessHash,
    'The baseline compiler must exactly reproduce the sealed native stiffness preflight');
  assert.equal(existing.frameElementSemanticHash, measured.frameElementSemanticHash,
    'The baseline compiler must reproduce the sealed native prismatic frame');
  assert.equal(first.globalStiffness.length, 144);
  assert.equal(second.globalStiffness.length, 144);
  assert.equal(first.localStiffness.length, 144);
  assert.equal(second.localStiffness.length, 144);
  assert.equal(first.formulationId, second.formulationId);
  assert.equal(first.profileSemanticHash, second.profileSemanticHash);
  assert.deepEqual(second.localAxes, first.localAxes,
    'The counterfactual reducer must not move/rotate the native frame axis');
  assert.deepEqual(second.rigidOffsets, first.rigidOffsets,
    'The counterfactual reducer must not replace the native offset custody');
  assert.deepEqual(first.transformation, second.transformation);
  const actualContribution = elementContributionFromFrameElement(first);
  const candidateContribution = elementContributionFromFrameElement(second);
  assert.deepEqual(actualContribution.globalStiffness, first.globalStiffness);
  assert.deepEqual(candidateContribution.globalStiffness, second.globalStiffness);

  const recompute = (frame) => {
    const T = frame.transformation.matrix;
    const H = frame.rigidOffsets.I === null && frame.rigidOffsets.J === null
      ? null : frameOffsetMatrix(frame.rigidOffsets);
    let stiffness = transformStiffnessToGlobal(frame.localStiffness, T);
    let gravity = transformLoadToGlobal(frame.equivalentLoadVector.local, T);
    let thermal = transformLoadToGlobal(frame.initialStrainLoadVector.local, T);
    if (H !== null) {
      stiffness = applyOffsetToStiffness(stiffness, H);
      gravity = applyOffsetToLoad(gravity, H);
      thermal = applyOffsetToLoad(thermal, H);
    }
    return { stiffness, gravity, thermal };
  };
  const nativeProjection = recompute(first);
  const candidateProjection = recompute(second);
  function maxRelativeDifference(a, b) {
    assert.equal(a.length, b.length);
    let maximum = 0;
    for (let i = 0; i < a.length; i += 1) {
      assert.ok(Number.isFinite(a[i]) && Number.isFinite(b[i]));
      maximum = Math.max(maximum, Math.abs(a[i]-b[i]) / Math.max(1,Math.abs(a[i]),Math.abs(b[i])));
    }
    return maximum;
  }
  const baselineConsistency = maxRelativeDifference(first.globalStiffness,nativeProjection.stiffness);
  const candidateConsistency = maxRelativeDifference(second.globalStiffness,candidateProjection.stiffness);
  const candidateLoadConsistency = {
    gravity: maxRelativeDifference(second.equivalentLoadVector.global,candidateProjection.gravity),
    thermal: maxRelativeDifference(second.initialStrainLoadVector.global,candidateProjection.thermal),
  };
  assert.ok(baselineConsistency <= 1e-12,
    'Actual production global K must follow its sealed local K and frame transformation');
  assert.ok(candidateConsistency <= 1e-12,
    'S4 inactive candidate global K must be the transformed *condensed* local K');
  assert.ok(candidateLoadConsistency.gravity <= 1e-12 && candidateLoadConsistency.thermal <= 1e-12,
    'S4 inactive candidate global gravity/thermal vectors must follow condensed locals');
  const relativeMatrixChange = maxRelativeDifference(first.globalStiffness,second.globalStiffness);
  const localMatrixChange = maxRelativeDifference(first.localStiffness,second.localStiffness);
  assert.ok(localMatrixChange > 1e-9 && relativeMatrixChange > 1e-9,
    'E75 counterfactual condenser must actually modify the global contribution, not only local record');
  const axis = second.localAxes.axes;
  const dot = (a,b) => a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const handedness=dot(cross(axis.x,axis.y),axis.z);
  assert.ok(Math.abs(handedness-1) <= 1e-10,
    'E75 source-bound local basis must be right-handed');
  const orthogonality=Math.max(
    Math.abs(dot(axis.x,axis.y)),Math.abs(dot(axis.x,axis.z)),Math.abs(dot(axis.y,axis.z)),
  );
  assert.ok(orthogonality < 1e-10,
    'E75 source-bound local basis must be orthogonal');
  const axisX=axis.x;
  const rank=(a,b)=>Array.from({length:a.length},(_,i)=>({
    flatIndex:i,row:Math.floor(i/12),col:i%12,
    baseline:a[i],candidate:b[i],delta:b[i]-a[i],
  })).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,12);
  return {
    schema: 'lfea-bm4l-native-e75-reducer-assembly-forensic/v1',
    status: 'PASS_CANDIDATE_GLOBAL_MATRIX_AND_LOADS_CONSISTENT_BUT_NOT_PRODUCTION_AUTHORIZED',
    sourceSegmentId:'ACCDB.E75',
    elementId,
    currentProductionReducerExactMechanics:false,
    counterfactualReducerExactMechanics:true,
    activeSolverIsUnchanged:true,
    nativeStiffnessPreflightHash:existing.globalStiffnessHash,
    nativeFrameSemanticHash:first.semanticHash,
    candidateFrameSemanticHash:second.semanticHash,
    sourceElementLocalAxis:axis,
    axisX,
    frameLocalXAxisAlignmentWithGlobalX:axisX[0],
    coordinateRightHandedness:handedness,
    maximumAxisNonorthogonality:orthogonality,
    fromToLengthM:first.geometry.length,
    noLocalOffsetAdded: first.rigidOffsets.I===null && first.rigidOffsets.J===null,
    nativeGlobalConsistencyRelative:baselineConsistency,
    candidateGlobalConsistencyRelative:candidateConsistency,
    candidateLoadConsistencyRelative:candidateLoadConsistency,
    localMatrixMaxRelativeDifference:localMatrixChange,
    globalMatrixMaxRelativeDifference:relativeMatrixChange,
    largestGlobalMatrixChanges:rank(first.globalStiffness,second.globalStiffness),
    sourceReferenceCaesarParityReSolvedWithCandidate:false,
    globalCaesarNumericalParityClaimed:false,
    native: {
      localStiffness:first.localStiffness,
      globalStiffness:first.globalStiffness,
      equivalentLoadVector:first.equivalentLoadVector,
      initialStrainLoadVector:first.initialStrainLoadVector,
    },
    counterfactual: {
      localStiffness:second.localStiffness,
      globalStiffness:second.globalStiffness,
      equivalentLoadVector:second.equivalentLoadVector,
      initialStrainLoadVector:second.initialStrainLoadVector,
    },
  };
}
