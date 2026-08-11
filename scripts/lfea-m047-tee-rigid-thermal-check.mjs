#!/usr/bin/env node

/**
 * M047 Type 2.1 tee rigid-thermal qualification that does not require ACE/ACCDB.
 *
 * Governing external evidence is pinned to reallaksh19/Common
 * 179c4831cf521cf797c13699cfbbd118315c9244:
 * - LFEA/BM4/Miscdata_BM4_L.txt
 * - LFEA/BM4/Loadcasereport_BM4_L.txt
 *
 * The Misc report supplies the two Type 2.1 welding-tee geometries and rounded
 * B31J FLEXb/Kb values. The Load Case report establishes that L2/L4/L6 are
 * nonthermal, L3/L5 contain T1, and L14 is ALG L5-L6. This check deliberately
 * does not promote the report's rounded 0.0012 mm/mm as exact thermal authority.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';
import {
  LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  resolveLinearFeaMaterialState,
  sealMaterialTable,
} from '../src/core/linear-fea-material/index.js';
import {
  deriveB31JDirectionalBranchEndModifiers,
} from '../src/core/linear-fea-piping-components/index.js';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../src/core/linear-fea-section/index.js';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const COMMON_REVISION = '179c4831cf521cf797c13699cfbbd118315c9244';
const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const INSTALLATION_TEMPERATURE_C = 21;
const OPERATING_TEMPERATURE_C = 120;
const PROVISIONAL_ALPHA_PER_K = 1.17e-5;
const PROVISIONAL_STRAIN = PROVISIONAL_ALPHA_PER_K
  * (OPERATING_TEMPERATURE_C - INSTALLATION_TEMPERATURE_C);
const ELASTIC_MODULUS_PA = 203395008e3;
const POISSON_RATIO = 0.292;
const MATERIAL_NUMBER = 106;

const CASE_THERMAL_AUTHORITY = Object.freeze({
  L2: false,
  L3: true,
  L4: false,
  L5: true,
  L6: false,
  L14: 'ALG:L5-L6=T1',
});

const TEE_CASES = Object.freeze([
  Object.freeze({
    nodeId: '20160',
    surfaceNodeId: '20161',
    runMeanDiameterM: 0.254737,
    runWallM: 0.018263,
    branchMeanDiameterM: 0.254737,
    branchWallM: 0.018263,
    expectedFlexBranchInPlane: 1.294,
    expectedKbNmPerDegree: 1.283e6,
    expectedFreeGrowthM: 0.00015810795,
  }),
  Object.freeze({
    nodeId: '20295',
    surfaceNodeId: '20296',
    runMeanDiameterM: 0.157302,
    runWallM: 0.010973,
    branchMeanDiameterM: 0.157327,
    branchWallM: 0.010973,
    expectedFlexBranchInPlane: 1.323,
    expectedKbNmPerDegree: 2.877e5,
    expectedFreeGrowthM: 0.00009745646625,
  }),
]);

function test(id, name, body) {
  body();
  console.log(`${id} PASS ${name}`);
}

function sourceEvidence(sourceId) {
  const identity = { sourceId, sourceRevision: COMMON_REVISION };
  return { ...identity, sourceSemanticHash: semanticHash(identity) };
}

function materialResolution() {
  const point = {
    absoluteTemperature: INSTALLATION_TEMPERATURE_C + 273.15,
    elasticModulus: ELASTIC_MODULUS_PA,
    shearModulus: ELASTIC_MODULUS_PA / (2 * (1 + POISSON_RATIO)),
    poissonRatio: POISSON_RATIO,
    massDensity: 7833,
    thermalExpansionCoefficient: PROVISIONAL_ALPHA_PER_K,
  };
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId: `ACCDB-MATERIAL-${MATERIAL_NUMBER}`,
    sourceEvidence: sourceEvidence('COMMON:BM4_L:A106_GRADE_B'),
    points: [point],
    semanticHash: '',
  });
  return resolveLinearFeaMaterialState({
    table,
    request: {
      materialStateId: 'BM4L-COLD-EC-QUALIFICATION',
      materialId: table.materialId,
      evaluationTemperature: point.absoluteTemperature,
    },
    profile: LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  });
}

function sectionResolution(sectionStateId, outerDiameter, wallThickness) {
  const payload = {
    schema: PIPE_SECTION_REQUEST_SCHEMA,
    sectionStateId,
    formulationId: PIPE_SECTION_FORMULATION_ID,
    outerDiameter,
    wallThickness,
    sourceEvidence: sourceEvidence(`COMMON:BM4_L:${sectionStateId}`),
  };
  return resolvePipeSection({
    request: { ...payload, semanticHash: computePipeSectionRequestSemanticHash(payload) },
    profile: PIPE_SECTION_PROFILE,
  });
}

function qualifyTee(entry) {
  const runOuterDiameter = entry.runMeanDiameterM + entry.runWallM;
  const branchOuterDiameter = entry.branchMeanDiameterM + entry.branchWallM;
  const material = materialResolution();
  const runSection = sectionResolution(
    `BM4L-TEE-${entry.nodeId}-RUN`,
    runOuterDiameter,
    entry.runWallM,
  );
  const branchSection = sectionResolution(
    `BM4L-TEE-${entry.nodeId}-BRANCH`,
    branchOuterDiameter,
    entry.branchWallM,
  );
  const branchRelativeExcess = (branchOuterDiameter - runOuterDiameter) / runOuterDiameter;
  assert.ok(branchRelativeExcess <= 0.001, `tee ${entry.nodeId} branch OD reconciliation exceeds production tolerance`);
  const factorBranchOuterDiameter = branchOuterDiameter > runOuterDiameter
    ? runOuterDiameter
    : branchOuterDiameter;
  const factorResult = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `M047-TEE-${entry.nodeId}-FACTORS`,
    componentId: `M047-TEE-${entry.nodeId}`,
    editionProfileId: FACTOR_PROFILE_ID,
    componentType: 'WELDING_TEE',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'WELDING_TEE',
      lengthUnit: 'm',
      runOuterDiameter,
      runWallThickness: entry.runWallM,
      branchOuterDiameter: factorBranchOuterDiameter,
      branchWallThickness: entry.branchWallM,
      fittingQuality: 'UNVERIFIED',
      sourceEvidence: {
        sourceId: `COMMON:BM4_L:MISC:TYPE2.1:${entry.nodeId}`,
        sourceRevision: COMMON_REVISION,
      },
    },
    momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
    semanticHash: '',
  });
  assert.equal(factorResult.status, 'QUALIFIED', `tee ${entry.nodeId} factor result must qualify`);
  const modifiers = deriveB31JDirectionalBranchEndModifiers({
    componentId: `M047-TEE-${entry.nodeId}`,
    factorResult,
    junctionPosition: [0, 0, 0],
    legs: [
      {
        legId: 'RUN-A',
        junctionEnd: 'I',
        endPoint: [1, 0, 0],
        material,
        section: runSection,
      },
      {
        legId: 'RUN-B',
        junctionEnd: 'I',
        endPoint: [-1, 0, 0],
        material,
        section: runSection,
      },
      {
        legId: 'BRANCH',
        junctionEnd: 'I',
        endPoint: [0, 0, 1],
        material,
        section: branchSection,
      },
    ],
    runCollinearityTolerance: { value: 1e-9, source: 'M047-BM4L-QUALIFICATION' },
  });
  return { runOuterDiameter, factorResult, modifiers };
}

function relativeClose(actual, expected, tolerance, message) {
  const scale = Math.max(Math.abs(expected), Number.MIN_VALUE);
  assert.ok(Math.abs(actual - expected) <= tolerance * scale, `${message}: ${actual} vs ${expected}`);
}

console.log('\n--- M047 Type 2.1 tee rigid thermal no-ACE qualification ---');

test('M047-RT-01', 'Pinned Load Case Report keeps thermal selectivity explicit', () => {
  assert.deepEqual(CASE_THERMAL_AUTHORITY, {
    L2: false,
    L3: true,
    L4: false,
    L5: true,
    L6: false,
    L14: 'ALG:L5-L6=T1',
  });
});

for (const entry of TEE_CASES) {
  const qualified = qualifyTee(entry);
  const branch = qualified.modifiers.modifiers.find((modifier) => modifier.role === 'BRANCH');
  assert.ok(branch, `tee ${entry.nodeId} must resolve one branch modifier`);

  test(`M047-RT-${entry.nodeId}-A`, `Tee ${entry.nodeId} reproduces pinned B31J branch flexibility`, () => {
    relativeClose(
      qualified.factorResult.factors.flexibility.branch.inPlane,
      entry.expectedFlexBranchInPlane,
      1e-3,
      `tee ${entry.nodeId} FLEXb in-plane`,
    );
    const inPlaneSpring = branch.rotationalSprings.find((spring) => spring.dof === 'RY');
    assert.ok(inPlaneSpring, `tee ${entry.nodeId} requires one in-plane branch spring`);
    relativeClose(
      inPlaneSpring.stiffness * Math.PI / 180,
      entry.expectedKbNmPerDegree,
      1e-3,
      `tee ${entry.nodeId} Kb in N.m/deg`,
    );
  });

  test(`M047-RT-${entry.nodeId}-B`, `Tee ${entry.nodeId} surface offset gives the predeclared free growth`, () => {
    const radius = Math.hypot(...branch.rigidOffset);
    relativeClose(radius, qualified.runOuterDiameter / 2, 1e-12, `tee ${entry.nodeId} surface radius`);
    const freeGrowth = radius * PROVISIONAL_STRAIN;
    relativeClose(freeGrowth, entry.expectedFreeGrowthM, 1e-12, `tee ${entry.nodeId} provisional free growth`);
  });
}

const solverSource = await readFile(
  new URL('../src/core/fea-benchmarks/caesar-accdb-linear-solve.js', import.meta.url),
  'utf8',
);
const frameStart = solverSource.indexOf('function buildFrameElement(input)');
const frameEnd = solverSource.indexOf('function buildRigidElement(input)');
const frameSource = solverSource.slice(frameStart, frameEnd);

test('M047-RT-06', 'Solver integration is thermal-only and fail-closed on run material custody', () => {
  assert.match(solverSource, /const runThermalAuthority = input\.caseMode\.thermal\s*\? commonTeeRunThermalAuthority/u);
  assert.match(solverSource, /material\.materialState\.materialId !== materialId/u);
  assert.match(solverSource, /authority\.materialId !== input\.material\.materialState\.materialId/u);
  assert.match(solverSource, /!input\.caseMode\.thermal \|\| modifier === null \|\| modifier\.rigidOffset === null/u);
});

test('M047-RT-07', 'Solver integration applies -Keff*g after tee condensation and before T/H transforms', () => {
  const condensed = frameSource.indexOf('const effectiveLocalStiffness = condensed.matrix;');
  const freeState = frameSource.indexOf('const teeRigidThermal = buildTeeRigidThermalInitialLoad({');
  const globalTransform = frameSource.indexOf('let effectiveGlobalStiffness = transformStiffnessToGlobal(');
  assert.ok(condensed >= 0 && freeState > condensed && globalTransform > freeState, 'tee free state must sit between condensation and global transforms');
  assert.match(solverSource, /const freeTranslationGlobal = scale\(modifier\.rigidOffset, strain\);/u);
  assert.match(solverSource, /initialLocal: Object\.freeze\(scale\(freeLoadLocal, -1\)\)/u);
  assert.doesNotMatch(solverSource, /ACCDB\.E12|ACCDB\.E36\.STRAIGHT/u);
});

test('M047-RT-08', 'Qualification keeps Type 2.6 and fitted alpha outside this patch', () => {
  assert.match(solverSource, /const CAESAR_WELDING_TEE_TYPE = 3;/u);
  assert.doesNotMatch(solverSource, /1\.22e-5|0\.001208|0\.001210/u);
});

console.log('M047 Type 2.1 tee rigid thermal no-ACE qualification PASS');
