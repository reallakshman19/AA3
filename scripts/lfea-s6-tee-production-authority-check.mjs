#!/usr/bin/env node

import assert from 'node:assert/strict';
import { eulerBernoulliProfile, materialResolution, sectionResolution } from './lfea-b3.2-piping-component-fixtures.mjs';
import { compileInputXmlFrameElementAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-frame-authority.js';
import { compileInputXmlProductionBranchModifiers } from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js';
import {
  sealInputXmlProductionBranchFactorAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionTeeSourceEligible,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

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
  built.frameElement.geometry.length
    - (1 - section.dimensions.outerDiameter / 2)
) < 1e-12,
'Physical branch beam must start at the run surface rather than the centreline junction.');
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
assert.equal(productionTeeSourceEligible(type3), true);
assert.equal(productionTeeSourceEligible(type5), false,
  'TYPE=5 weldolet source declarations remain outside S6 exact welding-tee promotion.');
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
  type5ExactMechanicsAuthorized: false,
}));

function teeSourcePreparation(materialResolutionResult, sectionResolutionResult) {
  const junction = [10, 20, 30];
  const segments = [
    segment('S1', 'L', 'J', junction, [9, 20, 30], true),
    segment('S2', 'J', 'R', junction, [11, 20, 30], false),
    segment('S3', 'J', 'B', junction, [10, 21, 30], false),
  ];
  return {
    sourceBundleSemanticHash: 'fnv1a64:6000000000000001',
    normalizedGeometry: {
      unit: 'm',
      nodes: [
        geometryNode('L', 9, 20, 30),
        geometryNode('J', ...junction),
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

function segment(id, startNodeId, endNodeId, junction, other, carrySif) {
  void junction;
  void other;
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
function geometryNode(id, x, y, z) { return { id, x, y, z }; }
function modelNode(nodeId, x, y, z) {
  return { nodeId, position: { x, y, z } };
}
