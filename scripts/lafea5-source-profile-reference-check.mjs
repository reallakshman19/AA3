#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { PROFILE_KINDS, canonicalProfile } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import {
  LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_BASIS,
  LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_ROLE,
  createLafea5SourceShellParent,
  lafea5SourceShellProfileReference,
  planLafea5SourceShellMeshAdoption,
  produceLafea5SourceShellMeshAdoption,
} from '../src/workspace/lafea-source-shell-mesh-adoption.js';

const source = createLafeaMockDocument('LAFEA.5');
const authority = issueLafeaSourceAuthority('LAFEA.5', source, 'LAFEA5-SOURCE-PROFILE-REFERENCE-CHECK');
const parent = createLafea5SourceShellParent({
  sourceHash: authority.sourceHash,
  shellTemplate: source.shellTemplate,
});
const reference = lafea5SourceShellProfileReference(parent);
assert.ok(reference.referenceLength > 0);
assert.equal(reference.lengthUnit, parent.lengthUnit);
assert.equal(reference.basis, LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_BASIS);
assert.equal(reference.role, LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_ROLE);
assert.ok(reference.uniqueEdgeCount > 0);
assert.deepEqual(reference, lafea5SourceShellProfileReference(parent));

const qualified = profile(reference.referenceLength, 'QUALIFIED');
const plan = planLafea5SourceShellMeshAdoption({ parent, meshProfile: qualified });
assert.equal(plan.profileReferenceLength, reference.referenceLength);
assert.equal(plan.profileReferenceBasis, reference.basis);
assert.equal(plan.profileReferenceRole, reference.role);
assert.equal(plan.characteristicLengthMin, null);
assert.equal(plan.characteristicLengthMedian, null);
assert.equal(plan.characteristicLengthMax, null);
assert.equal(plan.topologyMutation, false);
assert.equal(plan.coordinateMutation, false);

const produced = produceLafea5SourceShellMeshAdoption({ parent, meshProfile: qualified, plan });
assert.deepEqual(produced.evidence.mesh, parent.mesh);
assert.equal(produced.evidence.qualification, 'PASS');

const arbitrary = profile(reference.referenceLength * 1.1, 'ARBITRARY-CALLER-VALUE');
assert.throws(
  () => planLafea5SourceShellMeshAdoption({ parent, meshProfile: arbitrary }),
  (error) => error?.code === 'LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_MISMATCH',
);

const panelSource = fs.readFileSync(
  new URL('../src/workspace/lafea-discretization-generation-panel.js', import.meta.url),
  'utf8',
);
assert.doesNotMatch(panelSource, /sourceAdoption \? 'Quality-profile reference length'/u);
assert.match(panelSource, /sourceAdoption \? null : numberControl/u);
assert.match(panelSource, /generation\.sourceProfileReference\.referenceLength/u);
assert.match(panelSource, /data.*lafea-source-profile-reference-evidence|dataset\.role = 'lafea-source-profile-reference-evidence'/u);
assert.match(panelSource, /Profile identity and quality custody only — not a remesh target/u);

console.log(JSON.stringify({
  check: 'lafea5-source-profile-reference',
  status: 'PASS',
  referenceLength: reference.referenceLength,
  lengthUnit: reference.lengthUnit,
  basis: reference.basis,
  uniqueEdgeCount: reference.uniqueEdgeCount,
  editablePseudoInputRemoved: true,
  callerOverrideRejected: true,
  topologyMutation: plan.topologyMutation,
  coordinateMutation: plan.coordinateMutation,
}));

function profile(globalTargetSize, suffix) {
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `LAFEA5_SOURCE_REFERENCE_${suffix}`,
    sourceRevision: 'LAFEA5-SOURCE-REFERENCE-R1',
    semanticHash: undefined,
    fields: {
      continuumElement: 'T3',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
      adjacentSizeRatioMax: 1.5,
      aspectRatioWarn: 3,
      aspectRatioBlock: 10,
      scaledJacobianWarn: 0.6,
      scaledJacobianBlock: 0.2,
      adaptiveLevels: 3,
    },
  });
}
