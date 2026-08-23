#!/usr/bin/env node

import assert from 'node:assert/strict';
import { compileResultRecovery } from '../src/core/linear-fea-result-recovery/index.js';
import { compileSolverExecution } from '../src/core/linear-fea-solver/index.js';
import { compileInputXmlLinearElementAuthorities } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js';
import {
  sealInputXmlProductionBendFactorAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import {
  inputXmlProductionRecoveryProfile,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js';
import {
  inputXmlStiffnessFrameElementProfile,
  inputXmlStiffnessSolverProfile,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';

const tables = cleanBendFixture();
const session = createLinearPipingAccdbSession(tables, {
  fileName: 'S3_DETERMINISTIC_BEND.ACCDB',
  requestedProfileId: DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
});
const preFlight = prepareLinearPipingAccdbPreFlight(session.intake, session.sourceBundle);
assert.notEqual(preFlight.status, 'BLOCK',
  `Deterministic bend source must prepare; got ${preFlight.status}.`);

const preparation = preFlight.preparation;
const sourcePreparation = preparation.sourcePreparation;
const structuralPreparation = preparation.structuralPreparation;
const frameProfile = inputXmlStiffnessFrameElementProfile();
const factorAuthority = sealInputXmlProductionBendFactorAuthority({
  authorityId: 'S3-DETERMINISTIC-B31-3-2022-B31J-2017',
  editionProfileId: 'B31_3_2022_B31J_2017',
  smooth90FlexibilityCorrection: false,
  sourceId: 'S3-DETERMINISTIC-ENGINEER-SELECTION',
  sourceRevision: '01',
});
const exactCapability = Object.freeze({
  ...PRODUCTION_CAPABILITY_PROFILE,
  bendExactMechanics: true,
});

assert.throws(
  () => compileInputXmlLinearElementAuthorities({
    sourcePreparation,
    structuralPreparation,
    frameProfile,
    capabilityProfile: exactCapability,
  }),
  (error) => error?.code === 'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
  'Exact bend mechanics must fail closed when factor edition authority is absent.',
);

const stiffness = compileInputXmlLinearElementAuthorities({
  sourcePreparation,
  structuralPreparation,
  frameProfile,
  bendFactorAuthority: factorAuthority,
  capabilityProfile: exactCapability,
});
assert.equal(stiffness.eligibleBendCount, 1);
assert.equal(stiffness.bendExactMechanicsApplied, true);
assert.equal(stiffness.pipingComponents.length, 1);
assert.equal(stiffness.bendFactorAuthority.semanticHash, factorAuthority.semanticHash);
assert.notEqual(stiffness.effectiveStiffnessStateHash, structuralPreparation.compilation.stiffnessStateHash,
  'Applying B31/B31J bend k must create a distinct effective stiffness identity.');

const bend = stiffness.pipingComponents[0];
assert.equal(bend.componentType, 'BEND');
assert.equal(bend.elements.length, 6, 'S2 and S3 must own the same six bend chords.');
assert.equal(bend.flexibility.geometryBasis, 'ARC_GEOMETRY_EXCLUDED_V1');
assert.ok(bend.flexibility.factor > 1,
  'The deterministic B31J bend fixture should have k > 1; a unity factor would not exercise S3.');
assert.equal(bend.flexibility.doubleCountGuard.accepted, true);
assert.ok(Math.abs(
  bend.flexibility.doubleCountGuard.appliedCorrectionRatio - bend.flexibility.factor,
) <= 1e-9, 'Compiled matrices must reproduce the declared k exactly once.');
assert.equal(bend.flexibilityOwnership.ownerPackageId, 'LFEA-B3.2');
assert.equal(bend.flexibilityOwnership.applied, true);
assert.equal(bend.acceptanceState, 'ACCEPTED');
assert.equal(bend.convergence.accepted, true);

const bendLedger = stiffness.elementLedger.filter((row) => row.authorityKind === 'PIPING_COMPONENT');
assert.equal(bendLedger.length, 6);
assert.deepEqual(
  bendLedger.map((row) => row.elementId),
  Array.from({ length: 6 }, (_, index) => `IXP.E1.BEND.E${index + 1}`),
  'Mechanical topology and B-3.2 component identities must align one-for-one.',
);
assert.ok(bendLedger.every((row) => row.flexibilityDoubleCountGuardAccepted));

const inactive = compileInputXmlLinearElementAuthorities({
  sourcePreparation,
  structuralPreparation,
  frameProfile,
  capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
});
assert.equal(inactive.pipingComponents.length, 0,
  'Global production capability remains off until source/UI authority is wired.');
assert.equal(inactive.frameElements.length, structuralPreparation.compilation.model.elements.length);
assert.ok(inactive.elementLedger.every((row) => row.authorityKind === 'FRAME_ELEMENT'));

const thermalCase = preparation.physicalPreparation.physicalCases
  .find((row) => row.caseRole === 'WEIGHT_TEMPERATURE');
assert.ok(thermalCase, 'The deterministic source must retain a W+T physical case.');
const bendThermalLedger = preparation.physicalPreparation.loadLedger.filter((row) =>
  String(row.segmentId).startsWith('ACCDB.E1/B') && row.sourceKind === 'UNIFORM_TEMPERATURE');
assert.equal(bendThermalLedger.length, 6,
  'Every generated bend chord must receive thermal authority through its source span.');
assert.ok(bendThermalLedger.every((row) => row.evidence.sourceAuthoritySegmentId === 'ACCDB.E1'));
const bendGravityLedger = preparation.physicalPreparation.loadLedger.filter((row) =>
  String(row.segmentId).startsWith('ACCDB.E1/B') && row.sourceKind === 'PHYSICAL_LINE_WEIGHT');
assert.equal(bendGravityLedger.length, 6,
  'Every generated bend chord must receive gravity authority through its source span.');
assert.ok(bendGravityLedger.every((row) => row.evidence.sourceAuthoritySegmentId === 'ACCDB.E1'));

const loaded = compileInputXmlLinearElementAuthorities({
  sourcePreparation,
  structuralPreparation,
  frameProfile,
  loadCase: thermalCase.loadCase,
  bendFactorAuthority: factorAuthority,
  capabilityProfile: exactCapability,
});
assert.equal(loaded.effectiveStiffnessStateHash, stiffness.effectiveStiffnessStateHash,
  'Binding physical loads must not change the effective stiffness identity.');
const loadedBend = loaded.pipingComponents[0];
assert.ok(loadedBend.elements.every((entry) =>
  entry.frameElement.appliedLoads.some((load) => load.kind === 'DISTRIBUTED_LOAD')),
'Each exact bend chord must retain distributed gravity load evidence.');
assert.ok(loadedBend.elements.every((entry) => entry.frameElement.thermal !== null),
  'Each exact bend chord must retain the source temperature primitive.');
assert.deepEqual(
  stiffness.elementLedger.map(stiffnessProjection),
  loaded.elementLedger.map(stiffnessProjection),
  'Pre-flight and loaded execution must reconstruct identical stiffness ownership.',
);

const execution = compileSolverExecution({
  compilation: structuralPreparation.compilation,
  elementContributions: loaded.elementContributions,
  loadCase: thermalCase.loadCase,
  solverProfile: inputXmlStiffnessSolverProfile(),
});
assert.ok(['QUALIFIED', 'CONDITIONAL'].includes(execution.status),
  `Exact-bend deterministic solve must be runnable; got ${execution.status}.`);
const recovery = compileResultRecovery({
  compilation: structuralPreparation.compilation,
  execution,
  loadCase: thermalCase.loadCase,
  frameElements: loaded.frameElements,
  pipingComponents: loaded.pipingComponents,
  recoveryProfile: inputXmlProductionRecoveryProfile(),
});
assert.equal(recovery.componentResultants.length, 1,
  'B-3.4 recovery must retain the exact bend as a component resultant.');
assert.equal(recovery.componentResultants[0].componentId, bend.componentId);

console.log(JSON.stringify({
  check: 'lfea-s3-bend-production-authority',
  status: 'PASS',
  factorEdition: factorAuthority.editionProfileId,
  flexibilityFactor: bend.flexibility.factor,
  geometryBasis: bend.flexibility.geometryBasis,
  appliedCorrectionRatio: bend.flexibility.doubleCountGuard.appliedCorrectionRatio,
  chordCount: bend.elements.length,
  effectiveStiffnessStateHash: stiffness.effectiveStiffnessStateHash,
  mechanicalStiffnessStateHash: structuralPreparation.compilation.stiffnessStateHash,
  thermalCaseId: thermalCase.caseId,
  recoveryComponentCount: recovery.componentResultants.length,
}));

function cleanBendFixture() {
  const tables = structuredClone(buildAccdbFixtureTables());
  tables.INPUT_BASIC_ELEMENT_DATA.rows = tables.INPUT_BASIC_ELEMENT_DATA.rows.slice(0, 2);
  tables.INPUT_CONTROL.rows = [{ NUMELT: 2 }];
  tables.INPUT_NODAL_COORDINATES.rows = tables.INPUT_NODAL_COORDINATES.rows.slice(0, 2);
  tables.INPUT_RIGIDS.rows = [];
  tables.INPUT_REDUCERS.rows = [];
  tables.INPUT_OFFSETS.rows = [];
  tables.INPUT_SIFTEES.rows = [];
  tables.INPUT_FORCMNT.rows = [];
  tables.INPUT_RESTRAINTS.rows = tables.INPUT_RESTRAINTS.rows
    .filter((row) => Number(row.NODE_NUM) === 10);
  return tables;
}

function stiffnessProjection(row) {
  return {
    elementId: row.elementId,
    authorityKind: row.authorityKind,
    globalStiffnessHash: row.globalStiffnessHash,
    pipingComponentProfileSemanticHash: row.pipingComponentProfileSemanticHash,
    flexibilityFactorSetId: row.flexibilityFactorSetId,
    flexibilityFactor: row.flexibilityFactor,
    flexibilityGeometryBasis: row.flexibilityGeometryBasis,
    flexibilityDoubleCountGuardAccepted: row.flexibilityDoubleCountGuardAccepted,
  };
}
