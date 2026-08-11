#!/usr/bin/env node

/**
 * M047 Type 2.1 tee rigid-thermal qualification that does not require ACE/ACCDB.
 *
 * Source custody lives in:
 * benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json
 *
 * The fixture pins the CAESAR II 14 Misc and Load Case reports in Common. This
 * check deliberately retains the benchmark alpha as provisional diagnostic
 * state and never promotes the rounded report value 0.0012 mm/mm to authority.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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

const AUTHORITY_PATH = fileURLToPath(new URL(
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json',
  import.meta.url,
));
const authority = JSON.parse(await readFile(AUTHORITY_PATH, 'utf8'));
const COMMON_REVISION = authority.sources.commonCommit;
const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const ELASTIC_MODULUS_PA = 203395008e3;
const POISSON_RATIO = 0.292;
const MATERIAL_NUMBER = 106;
const provisional = authority.provisionalThermalDiagnostic;
const PROVISIONAL_STRAIN = provisional.coefficientPerKelvin
  * (provisional.operatingTemperatureC - provisional.installationTemperatureC);

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
    absoluteTemperature: provisional.installationTemperatureC + 273.15,
    elasticModulus: ELASTIC_MODULUS_PA,
    shearModulus: ELASTIC_MODULUS_PA / (2 * (1 + POISSON_RATIO)),
    poissonRatio: POISSON_RATIO,
    massDensity: 7833,
    thermalExpansionCoefficient: provisional.coefficientPerKelvin,
  };
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId: `ACCDB-MATERIAL-${MATERIAL_NUMBER}`,
    sourceEvidence: sourceEvidence('BM4_L:ACCDB:COLD-MATERIAL-106'),
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
    sourceEvidence: sourceEvidence(`BM4_L:MISC:${sectionStateId}`),
  };
  return resolvePipeSection({
    request: { ...payload, semanticHash: computePipeSectionRequestSemanticHash(payload) },
    profile: PIPE_SECTION_PROFILE,
  });
}

function qualifyTee(entry) {
  const runMeanDiameterM = entry.runMeanDiameterMm / 1000;
  const runWallM = entry.runWallMm / 1000;
  const branchMeanDiameterM = entry.branchMeanDiameterMm / 1000;
  const branchWallM = entry.branchWallMm / 1000;
  const runOuterDiameter = runMeanDiameterM + runWallM;
  const branchOuterDiameter = branchMeanDiameterM + branchWallM;
  const material = materialResolution();
  const runSection = sectionResolution(
    `TEE-${entry.teeNode}-RUN`,
    runOuterDiameter,
    runWallM,
  );
  const branchSection = sectionResolution(
    `TEE-${entry.teeNode}-BRANCH`,
    branchOuterDiameter,
    branchWallM,
  );
  const branchRelativeExcess = (branchOuterDiameter - runOuterDiameter) / runOuterDiameter;
  assert.ok(
    branchRelativeExcess <= 0.001,
    `tee ${entry.teeNode} branch OD reconciliation exceeds production tolerance`,
  );
  const factorBranchOuterDiameter = branchOuterDiameter > runOuterDiameter
    ? runOuterDiameter
    : branchOuterDiameter;
  const factorResult = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `M047-TEE-${entry.teeNode}-FACTORS`,
    componentId: `M047-TEE-${entry.teeNode}`,
    editionProfileId: FACTOR_PROFILE_ID,
    componentType: 'WELDING_TEE',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'WELDING_TEE',
      lengthUnit: 'm',
      runOuterDiameter,
      runWallThickness: runWallM,
      branchOuterDiameter: factorBranchOuterDiameter,
      branchWallThickness: branchWallM,
      fittingQuality: 'UNVERIFIED',
      sourceEvidence: {
        sourceId: `COMMON:BM4_L:MISC:TYPE2.1:${entry.teeNode}`,
        sourceRevision: COMMON_REVISION,
      },
    },
    momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
    semanticHash: '',
  });
  assert.equal(factorResult.status, 'QUALIFIED', `tee ${entry.teeNode} factor result must qualify`);
  const modifiers = deriveB31JDirectionalBranchEndModifiers({
    componentId: `M047-TEE-${entry.teeNode}`,
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
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `${message}: ${actual} vs ${expected}`,
  );
}

console.log('\n--- M047 Type 2.1 tee rigid thermal no-ACE qualification ---');

test('M047-RT-01', 'Source custody pins the requested CAESAR reports and version', () => {
  assert.equal(authority.schema, 'm047-bm4l-tee-rigid-thermal-authority/v1');
  assert.equal(authority.benchmarkId, 'BM4_L');
  assert.equal(authority.caesarVersion, '14.00.00.0910');
  assert.equal(authority.caesarBuild, '231113');
  assert.equal(COMMON_REVISION, '179c4831cf521cf797c13699cfbbd118315c9244');
  assert.equal(authority.sources.misc.path, 'LFEA/BM4/Miscdata_BM4_L.txt');
  assert.equal(authority.sources.misc.gitBlobSha, 'ef23d224925e4568185a360ecbe1ee62503f15ff');
  assert.equal(authority.sources.loadCase.path, 'LFEA/BM4/Loadcasereport_BM4_L.txt');
  assert.equal(authority.sources.loadCase.gitBlobSha, 'be62eeb08af26dddcd59146e21188c108c4600dd');
});

test('M047-RT-02', 'Pinned Load Case Report keeps T1 selectivity and ALG L14 explicit', () => {
  const cases = new Map(authority.loadCases.map((entry) => [entry.caseId, entry]));
  assert.deepEqual([...cases.keys()], ['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
  assert.deepEqual(
    [...cases.values()].filter((entry) => entry.combinationMethod === 'PHYSICAL' && entry.containsT1)
      .map((entry) => entry.caseId),
    ['L3', 'L5'],
  );
  assert.deepEqual(
    [...cases.values()].filter((entry) => entry.combinationMethod === 'PHYSICAL' && !entry.containsT1)
      .map((entry) => entry.caseId),
    ['L2', 'L4', 'L6'],
  );
  for (const entry of [...cases.values()].filter((row) => row.combinationMethod === 'PHYSICAL')) {
    assert.equal(entry.elasticModulus, 'EC', `${entry.caseId} must use EC`);
    assert.equal(entry.frictionMultiplier, 0, `${entry.caseId} must have zero friction multiplier`);
  }
  assert.equal(cases.get('L14').combinationMethod, 'ALG');
  assert.equal(cases.get('L14').formula, 'L14=L5-L6');
  assert.equal(cases.get('L14').containsT1, true);
});

test('M047-RT-03', 'Provisional thermal state is diagnostic only and internally consistent', () => {
  assert.equal(provisional.authorityStatus, 'PROVISIONAL_GUESSED_NOT_PROMOTABLE');
  relativeClose(PROVISIONAL_STRAIN, provisional.strain, 1e-14, 'provisional alpha*DeltaT strain');
  assert.notEqual(provisional.strain, 0.0012, 'rounded Misc output must not become exact benchmark strain');
});

for (const entry of authority.type21Tees) {
  const qualified = qualifyTee(entry);
  const branch = qualified.modifiers.modifiers.find((modifier) => modifier.role === 'BRANCH');
  assert.ok(branch, `tee ${entry.teeNode} must resolve one branch modifier`);

  test(`M047-RT-${entry.teeNode}-A`, `Tee ${entry.teeNode} reproduces pinned B31J FLEXb/Kb`, () => {
    relativeClose(
      qualified.factorResult.factors.flexibility.branch.inPlane,
      entry.flexBranchInPlane,
      1e-3,
      `tee ${entry.teeNode} FLEXb in-plane`,
    );
    const inPlaneSpring = branch.rotationalSprings.find((spring) => spring.dof === 'RY');
    assert.ok(inPlaneSpring, `tee ${entry.teeNode} requires one in-plane branch spring`);
    relativeClose(
      inPlaneSpring.stiffness * Math.PI / 180,
      entry.kbBranchInPlaneNmPerDegree,
      1e-3,
      `tee ${entry.teeNode} Kb in N.m/deg`,
    );
  });

  test(`M047-RT-${entry.teeNode}-B`, `Tee ${entry.teeNode} surface offset gives predeclared free growth`, () => {
    const radius = Math.hypot(...branch.rigidOffset);
    relativeClose(radius, qualified.runOuterDiameter / 2, 1e-12, `tee ${entry.teeNode} surface radius`);
    const freeGrowth = radius * PROVISIONAL_STRAIN;
    const expected = provisional.expectedFreeGrowthMm[String(entry.teeNode)] / 1000;
    relativeClose(freeGrowth, expected, 1e-12, `tee ${entry.teeNode} provisional free growth`);
  });
}

const solverSource = await readFile(
  new URL('../src/core/fea-benchmarks/caesar-accdb-linear-solve.js', import.meta.url),
  'utf8',
);
const frameStart = solverSource.indexOf('function buildFrameElement(input)');
const frameEnd = solverSource.indexOf('function buildRigidElement(input)');
const frameSource = solverSource.slice(frameStart, frameEnd);

test('M047-RT-08', 'Solver integration is thermal-only and fail-closed on run material custody', () => {
  assert.match(solverSource, /const runThermalAuthority = input\.caseMode\.thermal\s*\? commonTeeRunThermalAuthority/u);
  assert.match(solverSource, /material\.materialState\.materialId !== materialId/u);
  assert.match(solverSource, /authority\.materialId !== input\.material\.materialState\.materialId/u);
  assert.match(solverSource, /!input\.caseMode\.thermal \|\| modifier === null \|\| modifier\.rigidOffset === null/u);
});

test('M047-RT-09', 'Solver integration applies -Keff*g after tee condensation and before T/H transforms', () => {
  const condensed = frameSource.indexOf('const effectiveLocalStiffness = condensed.matrix;');
  const freeState = frameSource.indexOf('const teeRigidThermal = buildTeeRigidThermalInitialLoad({');
  const globalTransform = frameSource.indexOf('let effectiveGlobalStiffness = transformStiffnessToGlobal(');
  assert.ok(
    condensed >= 0 && freeState > condensed && globalTransform > freeState,
    'tee free state must sit between condensation and global transforms',
  );
  assert.match(solverSource, /const freeTranslationGlobal = scale\(modifier\.rigidOffset, strain\);/u);
  assert.match(solverSource, /initialLocal: Object\.freeze\(scale\(freeLoadLocal, -1\)\)/u);
  assert.doesNotMatch(solverSource, /ACCDB\.E12|ACCDB\.E36\.STRAIGHT/u);
});

test('M047-RT-10', 'Type 2.6 structural invention and fitted alpha remain outside this patch', () => {
  assert.equal(authority.excludedStructuralInterpretation.miscType, '2.6');
  assert.match(solverSource, /const CAESAR_WELDING_TEE_TYPE = 3;/u);
  assert.doesNotMatch(solverSource, /1\.22e-5|0\.001208|0\.001210/u);
});

console.log('M047 Type 2.1 tee rigid thermal no-ACE qualification PASS');
