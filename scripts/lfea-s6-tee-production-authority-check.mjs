#!/usr/bin/env node

import assert from 'node:assert/strict';
import { eulerBernoulliProfile, materialResolution, sectionResolution } from './lfea-b3.2-piping-component-fixtures.mjs';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';
import { compileInputXmlExecutionElementAuthorities } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { compileInputXmlFrameElementAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-frame-authority.js';
import { compileInputXmlProductionBranchModifiers } from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js';
import {
  sealInputXmlProductionBranchFactorAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import { inputXmlStiffnessFrameElementProfile } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionComponentLimitation,
  productionTeeSourceEligible,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';

assert.equal(PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics, true,
  'S6 qualification must exercise the global production capability, not a test-only override.');

const material = materialResolution();
const section = sectionResolution();
const factorAuthority = sealInputXmlProductionBranchFactorAuthority({
  authorityId: 'S6-DETERMINISTIC-B31-3-2022-B31J-2017',
  editionProfileId: 'B31_3_2022_B31J_2017',
  sourceId: 'S6-DETERMINISTIC-ENGINEER-SELECTION',
  sourceRevision: '01',
});
const sourcePreparation = teeSourcePreparation(material, section);
const structuralPreparation = teeStructuralPreparation();
const compiled = compileInputXmlProductionBranchModifiers({
  sourcePreparation,
  structuralPreparation,
  factorAuthority,
});

assert.equal(compiled.eligibleTeeJunctionCount, 1);
assert.equal(compiled.exactTeeJunctionCount, 1);
assert.equal(compiled.junctions.length, 1);
assert.equal(compiled.modifierByElementId.size, 3,
  'One source tee must modify its three existing carriers, not create duplicate tee spans.');
assert.equal(compiled.factorAuthority.semanticHash, factorAuthority.semanticHash);

const modifiers = [...compiled.modifierByElementId.values()];
assert.deepEqual(
  modifiers.map((row) => row.role).sort(),
  ['BRANCH', 'RUN', 'RUN'],
  'Direction-vector topology must identify two anti-parallel run legs and one branch.',
);
const branch = modifiers.find((row) => row.role === 'BRANCH');
assert.ok(branch, 'The deterministic tee requires one branch modifier.');
assert.equal(branch.junctionNodeId, 'J');
assert.equal(branch.junctionEnd, 'I');
assert.ok(Array.isArray(branch.rigidOffset) && branch.rigidOffset.length === 3);
assert.ok(Math.abs(Math.hypot(...branch.rigidOffset) - section.dimensions.outerDiameter / 2) < 1e-12,
  'Branch flexibility must act at the physical run surface, one run radius from the centreline junction.');
assert.equal(branch.springRule, 'K_EQUALS_RIGIDITY_OVER_K_MEAN_DIAMETER_V2');
assert.ok(branch.rotationalSprings.length > 0,
  'The deterministic B31J welding tee must exercise at least one non-unity directional flexibility spring.');
assert.ok(branch.rotationalSprings.every((row) => Number.isFinite(row.stiffness) && row.stiffness > 0));
assert.ok(modifiers.filter((row) => row.role === 'RUN').every((row) => row.rigidOffset === null),
  'Run legs remain on the centreline; only the branch carrier receives the run-surface rigid offset.');

const nodeI = modelNode('J', 10, 20, 30);
const nodeJ = modelNode('B', 10, 21, 30);
const temperatureByElement = new Map(branch.runThermalAuthority.runElementIds.map((elementId) => [
  elementId,
  {
    operatingTemperature: 623.15,
    installationTemperature: 293.15,
    stiffnessEvaluationMaterialStateId: branch.runThermalAuthority.materialStateId,
  },
]));
const built = compileInputXmlFrameElementAuthority({
  element: { elementId: branch.elementId, localAxes: { y: [0, 0, 1] } },
  material,
  section,
  nodeI,
  nodeJ,
  frameProfile: eulerBernoulliProfile(),
  distributedLoads: [],
  temperature: null,
  temperatureByElement,
  branchModifier: branch,
});
assert.equal(built.branchModifier.role, 'BRANCH');
assert.ok(built.frameElement.rigidOffsets.I !== null && built.frameElement.rigidOffsets.J === null);
assert.ok(Math.abs(
  built.frameElement.geometry.length - (1 - section.dimensions.outerDiameter / 2)
) < 1e-12, 'Physical branch beam must start at the run surface rather than the centreline junction.');
assert.ok(built.frameElement.initialStrainLoadVector.local.some((value) => Math.abs(value) > 0),
  'Thermal growth of the rigid run-surface offset must enter the branch initial-strain vector.');

const mismatchedTemperature = new Map(temperatureByElement);
const secondRun = branch.runThermalAuthority.runElementIds[1];
mismatchedTemperature.set(secondRun, {
  ...mismatchedTemperature.get(secondRun),
  operatingTemperature: 600,
});
assert.throws(() => compileInputXmlFrameElementAuthority({
  element: { elementId: branch.elementId, localAxes: { y: [0, 0, 1] } },
  material,
  section,
  nodeI,
  nodeJ,
  frameProfile: eulerBernoulliProfile(),
  distributedLoads: [],
  temperature: null,
  temperatureByElement: mismatchedTemperature,
  branchModifier: branch,
}), (error) => error?.code === 'BRANCH_RUN_THERMAL_AUTHORITY_MISMATCH',
'Run-surface thermal growth must fail closed when the two run legs do not share one thermal state.');

const type3 = sourcePreparation.normalizedGeometry.segments[0];
const type5 = structuredClone(type3);
type5.meta.analysis.sifs = [{ nodeId: 'J', typeCode: 5, inPlane: null, outOfPlane: null }];
const orphanType3 = structuredClone(type3);
orphanType3.meta.analysis.sifs = [{ nodeId: 'UNRELATED', typeCode: 3, inPlane: null, outOfPlane: null }];
assert.equal(productionTeeSourceEligible(type3), true);
assert.equal(productionTeeSourceEligible(type5), false,
  'TYPE=5 weldolet source declarations remain outside S6 exact welding-tee promotion.');
assert.equal(productionTeeSourceEligible(orphanType3), false,
  'A TYPE=3 declaration that does not own a segment endpoint is not exact tee authority.');
assert.equal(
  productionComponentLimitation('TEE', PRODUCTION_CAPABILITY_PROFILE, type5),
  'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY',
  'Global S6 capability must not falsely report TYPE=5 as exact.',
);
assert.equal(
  productionComponentLimitation('TEE', PRODUCTION_CAPABILITY_PROFILE, orphanType3),
  'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY',
  'Global S6 capability must not falsely report an orphan TYPE=3 record as exact.',
);

const mismatchedHeader = structuredClone(sourcePreparation);
const alternateSection = structuredClone(section);
alternateSection.semanticHash = 'fnv1a64:6000000000000002';
alternateSection.dimensions.wallThickness += 0.001;
mismatchedHeader.sectionResolutions.push(alternateSection);
mismatchedHeader.segmentBindings.find((row) => row.segmentId === 'S2').physicalSectionSemanticHash = alternateSection.semanticHash;
assert.throws(() => compileInputXmlProductionBranchModifiers({
  sourcePreparation: mismatchedHeader,
  structuralPreparation,
  factorAuthority,
}), (error) => error?.code === 'BRANCH_RUN_SECTION_MISMATCH',
'Exact tee factors must block when the two run legs do not establish one header OD/wall section.');

const accdbSession = createLinearPipingAccdbSession(cleanTeeAccdbFixture(), {
  fileName: 'S6_DETERMINISTIC_TEE.ACCDB',
  requestedProfileId: DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
});
const preFlight = prepareLinearPipingAccdbPreFlight(
  accdbSession.intake,
  accdbSession.sourceBundle,
  { branchFactorAuthority: factorAuthority },
);
assert.notEqual(preFlight.status, 'BLOCK',
  `Production tee pre-flight must remain runnable with explicit branch factor authority; got ${preFlight.status}.`);
const stiffness = preFlight.preparation.stiffnessPreflight;
assert.equal(stiffness.teeExactMechanicsApplied, true,
  'Production pre-flight must apply exact tee mechanics under the global S6 capability.');
assert.equal(stiffness.eligibleTeeJunctionCount, 1);
assert.equal(stiffness.branchFactorAuthority.semanticHash, factorAuthority.semanticHash);
const teeLedger = stiffness.elementLedger.filter((row) => row.branchModifierApplied);
assert.equal(teeLedger.length, 3,
  'Production pre-flight must retain exactly three tee-modified existing frame carriers.');
assert.deepEqual(teeLedger.map((row) => row.branchRole).sort(), ['BRANCH', 'RUN', 'RUN']);
assert.notEqual(stiffness.effectiveStiffnessStateHash, stiffness.stiffnessStateHash,
  'Exact tee flexibility must create a distinct effective stiffness identity.');

const physicalCase = preFlight.preparation.physicalPreparation.physicalCases[0];
assert.ok(physicalCase, 'Production tee fixture must compile at least one physical case.');
const runtimeElements = compileInputXmlExecutionElementAuthorities(
  preFlight.preparation.structuralPreparation,
  inputXmlStiffnessFrameElementProfile(),
  physicalCase.loadCase,
  {
    sourcePreparation: preFlight.preparation.sourcePreparation,
    bendFactorAuthority: stiffness.bendFactorAuthority,
    branchFactorAuthority: stiffness.branchFactorAuthority,
    capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
  },
);
assert.equal(runtimeElements.teeExactMechanicsApplied, true);
assert.equal(runtimeElements.effectiveStiffnessStateHash, stiffness.effectiveStiffnessStateHash,
  'Runtime reconstruction must retain the exact tee stiffness identity qualified by pre-flight.');
assert.equal(runtimeElements.elementLedger.filter((row) => row.branchModifierApplied).length, 3);

assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureBourdon, false,
  'S6 must not widen the independent S5 pressure/Bourdon capability.');
assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics, false,
  'S6 must not widen the blocked S4 reducer capability.');

console.log(JSON.stringify({
  check: 'lfea-s6-tee-production-authority',
  status: 'PASS',
  teeJunctionCount: compiled.exactTeeJunctionCount,
  carrierCount: compiled.modifierByElementId.size,
  branchSpringCount: branch.rotationalSprings.length,
  branchRigidOffsetMagnitude: Math.hypot(...branch.rigidOffset),
  factorEdition: factorAuthority.editionProfileId,
  productionEffectiveStiffnessStateHash: stiffness.effectiveStiffnessStateHash,
  type5ExactMechanicsAuthorized: false,
}));

function teeSourcePreparation(materialResolutionResult, sectionResolutionResult) {
  const segments = [
    segment('S1', 'L', 'J', true),
    segment('S2', 'J', 'R', false),
    segment('S3', 'J', 'B', false),
  ];
  return {
    sourceBundleSemanticHash: 'fnv1a64:6000000000000001',
    normalizedGeometry: {
      unit: 'm',
      nodes: [
        geometryNode('L', 9, 20, 30),
        geometryNode('J', 10, 20, 30),
        geometryNode('R', 11, 20, 30),
        geometryNode('B', 10, 21, 30),
      ],
      segments,
    },
    segmentBindings: segments.map((row, index) => ({
      segmentId: row.id,
      sourceIndex: index,
      materialResolutionSemanticHash: materialResolutionResult.semanticHash,
      physicalSectionSemanticHash: sectionResolutionResult.semanticHash,
      analysisSectionSemanticHash: sectionResolutionResult.semanticHash,
    })),
    materialResolutions: [materialResolutionResult],
    sectionResolutions: [sectionResolutionResult],
  };
}

function teeStructuralPreparation() {
  return {
    segmentBindings: ['S1', 'S2', 'S3'].map((sourceSegmentId, index) => ({
      sourceSegmentId,
      segmentId: sourceSegmentId,
      elementId: `E${index + 1}`,
      bendChordOf: null,
      retopologyRole: 'UNCHANGED',
    })),
  };
}

function segment(id, startNodeId, endNodeId, carrySif) {
  return {
    id,
    type: carrySif ? 'TEE' : 'PIPE',
    startNodeId,
    endNodeId,
    meta: {
      analysis: {
        sifs: carrySif
          ? [{ nodeId: 'J', typeCode: 3, inPlane: 1.5, outOfPlane: 1.2 }]
          : [],
      },
    },
  };
}

function cleanTeeAccdbFixture() {
  const tables = structuredClone(buildAccdbFixtureTables());
  const rows = tables.INPUT_BASIC_ELEMENT_DATA.rows.slice(0, 3).map((row) => ({
    ...row,
    BEND_PTR: 0,
    RIGID_PTR: 0,
    REDUCER_PTR: 0,
    EOFF_PTR: 0,
    FORCMNT_PTR: 0,
    PRESSURE1: 0,
    HYDRO_PRESSURE: 0,
  }));
  rows[0] = { ...rows[0], ELEMENTID: 1, FROM_NODE: 10, TO_NODE: 20, DELTA_X: 1000, DELTA_Y: 0, DELTA_Z: 0 };
  rows[1] = { ...rows[1], ELEMENTID: 2, FROM_NODE: 20, TO_NODE: 30, DELTA_X: 1000, DELTA_Y: 0, DELTA_Z: 0 };
  rows[2] = { ...rows[2], ELEMENTID: 3, FROM_NODE: 20, TO_NODE: 40, DELTA_X: 0, DELTA_Y: 1000, DELTA_Z: 0 };
  tables.INPUT_BASIC_ELEMENT_DATA.rows = rows;
  tables.INPUT_CONTROL.rows = [{ NUMELT: 3 }];
  tables.INPUT_NODAL_COORDINATES.rows = [
    { FROM_NODE: 10, TO_NODE: 20, FROM_NODE_X: 0, FROM_NODE_Y: 0, FROM_NODE_Z: 0, TO_NODE_X: 1000, TO_NODE_Y: 0, TO_NODE_Z: 0 },
    { FROM_NODE: 20, TO_NODE: 30, FROM_NODE_X: 1000, FROM_NODE_Y: 0, FROM_NODE_Z: 0, TO_NODE_X: 2000, TO_NODE_Y: 0, TO_NODE_Z: 0 },
    { FROM_NODE: 20, TO_NODE: 40, FROM_NODE_X: 1000, FROM_NODE_Y: 0, FROM_NODE_Z: 0, TO_NODE_X: 1000, TO_NODE_Y: 1000, TO_NODE_Z: 0 },
  ];
  tables.INPUT_SIFTEES.rows = [{ NODE: 20, TYPE: 3, SIF_IN: 1.5, SIF_OUT: 1.2 }];
  tables.INPUT_BENDS.rows = [];
  tables.INPUT_RIGIDS.rows = [];
  tables.INPUT_REDUCERS.rows = [];
  tables.INPUT_OFFSETS.rows = [];
  tables.INPUT_FORCMNT.rows = [];
  tables.INPUT_RESTRAINTS.rows = tables.INPUT_RESTRAINTS.rows.filter((row) => Number(row.NODE_NUM) === 10);
  return tables;
}

function geometryNode(id, x, y, z) { return { id, x, y, z }; }
function modelNode(nodeId, x, y, z) { return { nodeId, position: { x, y, z } }; }
