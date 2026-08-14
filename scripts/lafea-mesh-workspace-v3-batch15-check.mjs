#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
  createLafeaMeshArtifactLifecycleV3,
  createLafeaRecoveredArtifactQuarantineV3,
  transitionLafeaMeshArtifactLifecycleV3,
} from '../src/workspace/lafea-mesh-artifact-lifecycle-v3.js';

const temporary = state('TEMPORARY', false, null, null, null);
const generated = transitionLafeaMeshArtifactLifecycleV3(temporary, stateInput(
  'GENERATED_UNVERIFIED', false, null, null, temporary.stateHash,
));
const validated = transitionLafeaMeshArtifactLifecycleV3(generated, stateInput(
  'VALIDATED', false, hash('VALIDATION'), null, generated.stateHash,
));
const retained = transitionLafeaMeshArtifactLifecycleV3(validated, stateInput(
  'RETAINED', false, hash('VALIDATION'), null, validated.stateHash,
));
assert.equal(retained.state, 'RETAINED');
assert.equal(retained.engineeringAuthority, false);

const recoveredPartial = createLafeaRecoveredArtifactQuarantineV3({
  artifactHash: hash('RECOVERED'), recoveryCommandHash: hash('RECOVERY_COMMAND'),
  importBundleHash: hash('IMPORT_BUNDLE'), partial: true,
});
assert.equal(recoveredPartial.state, 'QUARANTINED');
assert.throws(() => transitionLafeaMeshArtifactLifecycleV3(recoveredPartial, {
  schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
  artifactHash: recoveredPartial.artifactHash,
  sourceCommandHash: recoveredPartial.sourceCommandHash,
  state: 'VALIDATED', partial: false, validationHash: hash('VALIDATION'),
  quarantineReasonHash: null, previousStateHash: recoveredPartial.stateHash,
}), (error) => error?.code === 'LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_PARTIAL_CANNOT_VALIDATE');

assert.throws(() => transitionLafeaMeshArtifactLifecycleV3(temporary, stateInput(
  'RETAINED', false, hash('VALIDATION'), null, temporary.stateHash,
)), (error) => error?.code === 'LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_TRANSITION_NOT_ALLOWED');

console.log(JSON.stringify({
  check: 'lafea-mesh-workspace-v3-batch15', status: 'PASS',
  normalArtifactPathRequiresValidationBeforeRetention: true,
  recoveryStartsQuarantined: true,
  partialRecoveredDataCannotValidate: true,
  temporaryDataCannotJumpToRetained: true,
  storageRetentionDoesNotGrantEngineeringAuthority: true,
}));

function state(target, partial, validationHash, quarantineReasonHash, previousStateHash) {
  return createLafeaMeshArtifactLifecycleV3(stateInput(
    target, partial, validationHash, quarantineReasonHash, previousStateHash,
  ));
}
function stateInput(target, partial, validationHash, quarantineReasonHash, previousStateHash) {
  return {
    schema: LAFEA_MESH_ARTIFACT_LIFECYCLE_V3_SCHEMA,
    artifactHash: hash('ARTIFACT'), sourceCommandHash: hash('COMMAND'),
    state: target, partial, validationHash, quarantineReasonHash, previousStateHash,
  };
}
function hash(value) {
  const hex = Buffer.from(value).toString('hex').padEnd(64, '0').slice(0, 64);
  return `sha256:${hex}`;
}
