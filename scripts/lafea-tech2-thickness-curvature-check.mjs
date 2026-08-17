#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { PROFILE_KINDS, canonicalProfile } from '../src/core/lafea-profile-contract/index.js';
import { createLafeaMockDocument } from '../src/workspace/advanced-mock-data.js';
import { normalizeLafeaStageDocument } from '../src/workspace/lafea-workbench-model.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaSimulatedShellMidsurfaceEvidence } from '../src/workspace/lafea-simulated-shell-midsurface-provider.js';
import { LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES } from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  LAFEA4_CURVATURE_CEILING_ANGLE_DEGREES,
  buildLafea4ThicknessCurvatureObservation,
} from '../src/workspace/lafea-shell-thickness-curvature-observation.js';
import {
  createLafea4ShellThicknessBasis,
  validateLafea4ShellThicknessBasis,
} from '../src/workspace/lafea-shell-thickness-basis.js';

const document = normalizeLafeaStageDocument('LAFEA.4', createLafeaMockDocument('LAFEA.4'));
const authority = issueLafeaSourceAuthority('LAFEA.4', document, 'TECH2-THICKNESS-CURVATURE');
const parent = createLafeaSimulatedShellMidsurfaceEvidence('LAFEA.4', authority.sourceHash, document);
const profile = canonicalProfile(PROFILE_KINDS.MESH, {
  schema: 'lafea-mesh-profile/v1',
  profileIdentity: 'TECH2_LAFEA4_CURVATURE_CEILING_PROFILE',
  sourceRevision: 'TECH2',
  semanticHash: undefined,
  fields: {
    continuumElement: 'T3',
    shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
    globalTargetSize: 100,
    adjacentSizeRatioMax: 1.5,
    aspectRatioWarn: 5,
    aspectRatioBlock: 10,
    scaledJacobianWarn: 0.5,
    scaledJacobianBlock: 0.2,
    adaptiveLevels: 3,
  },
});

assert.equal(LAFEA4_CURVATURE_CEILING_ANGLE_DEGREES, LAFEA_SHELL_CURVED_TARGET_ANGLE_DEGREES,
  'read-only observation must remain locked to the shell producer curvature ceiling');

const stage = {
  stageId: 'LAFEA.4',
  document,
  sourceAuthority: authority,
  retainedShellMidsurfaceEvidence: parent,
  retainedAnalysisMeshProfile: profile,
};
const observation = buildLafea4ThicknessCurvatureObservation(stage);
assert.ok(observation);
assert.equal(observation.authority, 'MEASURED_INFORMATIONAL_NOT_QUALIFICATION_GATE');
assert.equal(observation.qualification, 'NOT_GATED');
assert.equal(observation.qualificationLimit, null);
assert.equal(observation.thicknessClassification, 'UNIFORM_THICKNESS');
assert.equal(observation.uniformThickness, 1.5);
assert.equal(observation.minimumThickness, 1.5);
assert.equal(observation.maximumThickness, 1.5);
assert.equal(observation.radius, 100);
assert.equal(observation.requestedTargetElementLength, 100);
assert.equal(observation.curvatureCeilingAngleDegrees, 15);

const expectedCurvatureTarget = 100 * Math.PI / 12;
const expectedSagitta = 100 * (1 - Math.cos(Math.PI / 24));
const expectedSagittaToThickness = expectedSagitta / 1.5;
assert.ok(Math.abs(observation.curvatureTargetElementLength - expectedCurvatureTarget) < 1e-12);
assert.ok(Math.abs(observation.effectiveTargetElementLength - expectedCurvatureTarget) < 1e-12);
assert.ok(Math.abs(observation.effectiveCurvatureAngleDegrees - 15) < 1e-12);
assert.ok(Math.abs(observation.curvatureSagitta - expectedSagitta) < 1e-12);
assert.ok(Math.abs(observation.curvatureSagittaToThicknessRatio - expectedSagittaToThickness) < 1e-12);

const basis = validateLafea4ShellThicknessBasis(createLafea4ShellThicknessBasis({
  sourceHash: authority.sourceHash,
  document,
}));
assert.equal(basis.elementCount, 24);
assert.equal(basis.uniformThickness, 1.5);
assert.equal(basis.sourceHash, authority.sourceHash);

const nonuniformDocument = structuredClone(document);
nonuniformDocument.elements[0].thickness = 2;
const nonuniformAuthority = issueLafeaSourceAuthority(
  'LAFEA.4', nonuniformDocument, 'TECH2-NONUNIFORM-THICKNESS',
);
const nonuniform = createLafea4ShellThicknessBasis({
  sourceHash: nonuniformAuthority.sourceHash,
  document: nonuniformDocument,
});
assert.equal(nonuniform.classification, 'NONUNIFORM_THICKNESS');
assert.equal(nonuniform.uniformThickness, null);
assert.equal(nonuniform.minimumThickness, 1.5);
assert.equal(nonuniform.maximumThickness, 2);

assert.throws(
  () => createLafea4ShellThicknessBasis({
    sourceHash: authority.sourceHash,
    document: nonuniformDocument,
  }),
  (error) => error?.code === 'LAFEA4_SHELL_THICKNESS_SOURCE_HASH_MISMATCH',
  'thickness evidence from a different source revision must be rejected',
);

const panelSource = read('../src/workspace/lafea-discretization-generation-panel.js');
const viewModelSource = read('../src/workspace/lafea-discretization-view-model.js');
assert.match(viewModelSource, /buildLafea4ThicknessCurvatureObservation/u);
assert.match(panelSource, /lafea-thickness-curvature-observation/u);
assert.match(panelSource, /NOT GATED — measured engineering evidence only/u);
assert.doesNotMatch(panelSource, /Sagitta \/ thickness.*PASS|Sagitta \/ thickness.*BLOCK/u);

console.log(JSON.stringify({
  check: 'lafea-tech2-thickness-curvature',
  status: 'PASS',
  source: {
    elementCount: basis.elementCount,
    uniformThickness: basis.uniformThickness,
    sourceHash: basis.sourceHash,
  },
  handCalculation: {
    radius: 100,
    curvatureAngleDegrees: 15,
    curvatureTargetElementLength: expectedCurvatureTarget,
    sagitta: expectedSagitta,
    thickness: 1.5,
    sagittaToThickness: expectedSagittaToThickness,
  },
  qualification: 'NOT_GATED',
}, null, 2));

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
}
