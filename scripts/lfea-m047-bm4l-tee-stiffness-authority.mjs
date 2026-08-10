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
  B31J_DIRECTIONAL_SPRING_RULE,
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

const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const E_PA = 203395008e3;
const POISSON_RATIO = 0.292;
const K_B_RELATIVE_LIMIT = 1e-3;
const EXPECTED_SPRING_RULE = 'K_EQUALS_RIGIDITY_OVER_K_MEAN_DIAMETER_V2';

const CASES = Object.freeze([
  Object.freeze({
    nodeId: '20160',
    runOuterDiameterM: 0.273000,
    runWallThicknessM: 0.018263,
    factorBranchOuterDiameterM: 0.273000,
    physicalBranchOuterDiameterM: 0.273000,
    branchWallThicknessM: 0.018263,
    printedKbNmPerDegree: 1.283e6,
  }),
  Object.freeze({
    nodeId: '20295',
    runOuterDiameterM: 0.168275,
    runWallThicknessM: 0.010973,
    factorBranchOuterDiameterM: 0.168275,
    physicalBranchOuterDiameterM: 0.168300,
    branchWallThicknessM: 0.010973,
    printedKbNmPerDegree: 2.877e5,
  }),
]);

function sourceEvidence(sourceId, sourceRevision = 'M047-BM4L-MISC-179C4831') {
  const identity = { sourceId, sourceRevision };
  return Object.freeze({ ...identity, sourceSemanticHash: semanticHash(identity) });
}

function materialResolution() {
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId: 'BM4L-A106-GRADE-B-COLD-EC',
    sourceEvidence: sourceEvidence('BM4L:INPUT_BASIC_ELEMENT_DATA:MATERIAL'),
    points: [
      {
        absoluteTemperature: 294.15,
        elasticModulus: E_PA,
        shearModulus: E_PA / (2 * (1 + POISSON_RATIO)),
        poissonRatio: POISSON_RATIO,
        massDensity: 7850,
        thermalExpansionCoefficient: 11.7e-6,
      },
    ],
    semanticHash: '',
  });
  return resolveLinearFeaMaterialState({
    table,
    request: {
      materialStateId: 'BM4L-A106-GRADE-B-COLD-EC-294K',
      materialId: table.materialId,
      evaluationTemperature: 294.15,
    },
    profile: LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  });
}

function sectionResolution(sectionStateId, outerDiameter, wallThickness) {
  const base = {
    schema: PIPE_SECTION_REQUEST_SCHEMA,
    sectionStateId,
    formulationId: PIPE_SECTION_FORMULATION_ID,
    outerDiameter,
    wallThickness,
    sourceEvidence: sourceEvidence(`BM4L:${sectionStateId}`),
  };
  return resolvePipeSection({
    request: { ...base, semanticHash: computePipeSectionRequestSemanticHash(base) },
    profile: PIPE_SECTION_PROFILE,
  });
}

function factorResult(entry) {
  return calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: `BM4L-TEE-${entry.nodeId}-KB-AUTHORITY`,
    componentId: `BM4L-TEE-${entry.nodeId}`,
    editionProfileId: FACTOR_PROFILE_ID,
    componentType: 'WELDING_TEE',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'WELDING_TEE',
      lengthUnit: 'm',
      runOuterDiameter: entry.runOuterDiameterM,
      runWallThickness: entry.runWallThicknessM,
      branchOuterDiameter: entry.factorBranchOuterDiameterM,
      branchWallThickness: entry.branchWallThicknessM,
      fittingQuality: 'UNVERIFIED',
      sourceEvidence: sourceEvidence(`BM4L:MISC:TEE:${entry.nodeId}`),
    },
    momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
    semanticHash: '',
  });
}

function evaluate(entry, material) {
  const runSection = sectionResolution(
    `BM4L-TEE-${entry.nodeId}-RUN`,
    entry.runOuterDiameterM,
    entry.runWallThicknessM,
  );
  const branchSection = sectionResolution(
    `BM4L-TEE-${entry.nodeId}-BRANCH`,
    entry.physicalBranchOuterDiameterM,
    entry.branchWallThicknessM,
  );
  const factors = factorResult(entry);
  if (factors.status !== 'QUALIFIED') {
    throw new Error(`BM4_L tee ${entry.nodeId} factor calculation is ${factors.status}.`);
  }
  const modifiers = deriveB31JDirectionalBranchEndModifiers({
    componentId: `BM4L-TEE-${entry.nodeId}`,
    factorResult: factors,
    junctionPosition: [0, 0, 0],
    legs: [
      { legId: 'RUN-A', junctionEnd: 'I', endPoint: [1, 0, 0], material, section: runSection },
      { legId: 'RUN-B', junctionEnd: 'I', endPoint: [-1, 0, 0], material, section: runSection },
      { legId: 'BRANCH', junctionEnd: 'I', endPoint: [0, 0, 1], material, section: branchSection },
    ],
    runCollinearityTolerance: { value: 1e-9, source: 'M047-BM4L-TEE-KB-AUTHORITY' },
  });
  if (modifiers.springRule !== EXPECTED_SPRING_RULE
      || B31J_DIRECTIONAL_SPRING_RULE !== EXPECTED_SPRING_RULE) {
    throw new Error(
      `BM4_L tee ${entry.nodeId} spring rule is not ${EXPECTED_SPRING_RULE}.`,
    );
  }
  const branchModifier = modifiers.modifiers.find((candidate) => candidate.role === 'BRANCH');
  if (!branchModifier || branchModifier.rotationalSprings.length !== 1) {
    throw new Error(
      `BM4_L tee ${entry.nodeId} expected exactly one branch rotational spring; found `
      + `${branchModifier?.rotationalSprings.length ?? 0}.`,
    );
  }
  const spring = branchModifier.rotationalSprings[0];
  const actualKbNmPerDegree = spring.stiffness * Math.PI / 180;
  const relativeError = Math.abs(actualKbNmPerDegree - entry.printedKbNmPerDegree)
    / entry.printedKbNmPerDegree;
  const meanDiameterM = entry.physicalBranchOuterDiameterM - entry.branchWallThicknessM;
  return Object.freeze({
    nodeId: entry.nodeId,
    springDof: spring.dof,
    calculatedBranchInPlaneFlexibility: factors.factors.flexibility.branch.inPlane,
    physicalBranchMeanDiameterM: meanDiameterM,
    springRule: modifiers.springRule,
    actualKbNmPerDegree,
    printedKbNmPerDegree: entry.printedKbNmPerDegree,
    relativeError,
    relativeLimit: K_B_RELATIVE_LIMIT,
    status: relativeError <= K_B_RELATIVE_LIMIT ? 'PASS' : 'FAIL',
  });
}

export function buildBm4lTeeStiffnessAuthority() {
  const material = materialResolution();
  const rows = CASES.map((entry) => evaluate(entry, material));
  const failures = rows.filter((row) => row.status !== 'PASS');
  if (failures.length > 0) {
    throw new Error(
      `BM4_L CAESAR tee Kb parity failed: ${failures.map((row) => `${row.nodeId}:${row.relativeError}`).join(', ')}.`,
    );
  }
  return Object.freeze({
    schema: 'lfea-m047-bm4l-tee-stiffness-authority/v1',
    authority: Object.freeze({
      commonRepository: 'reallaksh19/Common',
      commonCommit: '179c4831cf521cf797c13699cfbbd118315c9244',
      path: 'LFEA/BM4/Miscdata_BM4_L.txt',
      gitBlobSha1: 'ef23d224925e4568185a360ecbe1ee62503f15ff',
      caesarVersion: '14.00.00.0910',
      printedQuantity: 'Kb elementary branch moment-rotation stiffness in N.m./deg',
    }),
    springRule: EXPECTED_SPRING_RULE,
    rows: Object.freeze(rows),
    status: 'PASS',
  });
}
