/**
 * Deterministic ACCDB-shaped fixture for friction and configuration-authority proofs.
 *
 * The pinned BM4_L.ACCDB is a Windows/ACE-only binary source, so it cannot be
 * opened in a portable check. This fixture reproduces the exact table/column
 * contract the real extraction produces for a small three-span model with one
 * anchor and two bidirectional +Y supports. It is a plumbing and mechanics
 * fixture only: its OUTPUT_* rows are explicit zeros so no synthetic value can
 * ever be mistaken for CAESAR benchmark authority.
 *
 * The friction declaration is selectable so the migration from the superseded
 * load-case COEFFICIENT_OF_FRICTION_MU override to the governed
 * model-mu x load-case FRICTION_MULTIPLIER representation can be compared on
 * identical mechanics.
 */
import { deepFreeze } from '../shared-piping-model/immutable.js';

export const FRICTION_FIXTURE_SOURCE_SHA256 =
  '00000000000000000000000000000000000000000000000000000000000000ff';

export const FRICTION_FIXTURE_DECLARATIONS = Object.freeze([
  'SUPERSEDED_LOAD_CASE_MU_OVERRIDE',
  'MODEL_MU_WITH_LOAD_CASE_MULTIPLIER',
]);

const ELEMENT_COLUMNS = Object.freeze([
  'ELEMENTID', 'FROM_NODE', 'TO_NODE', 'ELEMENT_NAME', 'DIAMETER', 'WALL_THICK',
  'MODULUS', 'POISSONS', 'PIPE_DENSITY', 'FLUID_DENSITY', 'INSUL_DENSITY', 'INSUL_THICK',
  'MATERIAL_NUM', 'TEMP_EXP_C1', 'PRESSURE1', 'HYDRO_PRESSURE',
  'BEND_PTR', 'RIGID_PTR', 'REDUCER_PTR',
]);

const COORDINATE_COLUMNS = Object.freeze([
  'FROM_NODE', 'TO_NODE',
  'FROM_NODE_X', 'FROM_NODE_Y', 'FROM_NODE_Z',
  'TO_NODE_X', 'TO_NODE_Y', 'TO_NODE_Z',
]);

const NODES = deepFreeze({
  10: [0, 0, 0],
  20: [4000, 0, 0],
  30: [8000, 0, 0],
  40: [8000, 0, 4000],
});

const SPANS = deepFreeze([
  { elementId: 1, fromNode: 10, toNode: 20 },
  { elementId: 2, fromNode: 20, toNode: 30 },
  { elementId: 3, fromNode: 30, toNode: 40 },
]);

const MATERIAL = deepFreeze({
  DIAMETER: 168.3,
  WALL_THICK: 7.11,
  MODULUS: 203000000,
  POISSONS: 0.3,
  PIPE_DENSITY: 0.00785,
  FLUID_DENSITY: 0.001,
  INSUL_DENSITY: 0,
  INSUL_THICK: 0,
  MATERIAL_NUM: 106,
  TEMP_EXP_C1: 150,
  PRESSURE1: 2000,
  HYDRO_PRESSURE: 3000,
});

const CASES = deepFreeze([
  { lcaseNumber: 5, caseClass: 'OPE', formula: 'W+T1+P1', governed: { FRICTION_MULTIPLIER: 0 }, superseded: { COEFFICIENT_OF_FRICTION_MU: 0 } },
  { lcaseNumber: 6, caseClass: 'SUS', formula: 'W+P1', governed: { FRICTION_MULTIPLIER: 0 }, superseded: { COEFFICIENT_OF_FRICTION_MU: 0 } },
  { lcaseNumber: 7, caseClass: 'OPE', formula: 'W+T1+P1', governed: { FRICTION_MULTIPLIER: 1 }, superseded: {} },
  { lcaseNumber: 13, caseClass: 'SUS', formula: 'W+P1', governed: { FRICTION_MULTIPLIER: 1 }, superseded: {} },
  { lcaseNumber: 14, caseClass: 'EXP', formula: 'L14=L5-L6', governed: {}, superseded: { COEFFICIENT_OF_FRICTION_MU: 0 } },
  { lcaseNumber: 15, caseClass: 'EXP', formula: 'L15=L7-L13', governed: {}, superseded: {} },
]);

/** Non-friction control cases, primitive friction cases and derived combinations. */
export const FRICTION_FIXTURE_CASE_IDS = deepFreeze({
  nonFriction: ['L5', 'L6'],
  nonFrictionDerived: ['L14'],
  primitiveFriction: ['L13', 'L7'],
  derivedFriction: ['L15'],
});

/** Build the fixture raw export in the ACCDB extraction contract. */
export function buildFrictionFixtureRawExport() {
  const elementRows = SPANS.map((span) => ({
    ...MATERIAL,
    ELEMENTID: span.elementId,
    FROM_NODE: span.fromNode,
    TO_NODE: span.toNode,
    ELEMENT_NAME: `SPAN-${span.elementId}`,
    BEND_PTR: 0,
    RIGID_PTR: 0,
    REDUCER_PTR: 0,
  }));
  const coordinateRows = SPANS.map((span) => ({
    FROM_NODE: span.fromNode,
    TO_NODE: span.toNode,
    FROM_NODE_X: NODES[span.fromNode][0],
    FROM_NODE_Y: NODES[span.fromNode][1],
    FROM_NODE_Z: NODES[span.fromNode][2],
    TO_NODE_X: NODES[span.toNode][0],
    TO_NODE_Y: NODES[span.toNode][1],
    TO_NODE_Z: NODES[span.toNode][2],
  }));
  const restraintRows = [
    { NODE_NUM: 10, RES_TYPEID: 1, XCOSINE: 0, YCOSINE: 0, ZCOSINE: 0 },
    { NODE_NUM: 20, RES_TYPEID: 2, XCOSINE: 0, YCOSINE: 1, ZCOSINE: 0 },
    { NODE_NUM: 30, RES_TYPEID: 2, XCOSINE: 0, YCOSINE: 1, ZCOSINE: 0 },
  ];
  return deepFreeze({
    schema: 'caesar-accdb-raw-export/v1',
    provider: 'FIXTURE_DETERMINISTIC_TABLE_BUILDER_V1',
    source: {
      fileName: 'FRICTION_FIXTURE.ACCDB',
      path: 'fixture://friction',
      byteLength: 0,
      lastWriteTimeUtc: '2026-01-01T00:00:00Z',
      sha256: FRICTION_FIXTURE_SOURCE_SHA256,
    },
    tables: {
      INPUT_BASIC_ELEMENT_DATA: { columns: [...ELEMENT_COLUMNS], rows: elementRows },
      INPUT_NODAL_COORDINATES: { columns: [...COORDINATE_COLUMNS], rows: coordinateRows },
      INPUT_RESTRAINTS: {
        columns: ['NODE_NUM', 'RES_TYPEID', 'XCOSINE', 'YCOSINE', 'ZCOSINE'],
        rows: restraintRows,
      },
      INPUT_UNITS: {
        columns: ['TRANS', 'ROT_STIFF'],
        rows: [{ TRANS: 'N./cm.', ROT_STIFF: 'N.m./deg' }],
      },
      INPUT_CONTROL: { columns: ['NUMELT', 'NUMBEND'], rows: [{ NUMELT: SPANS.length, NUMBEND: 0 }] },
      INPUT_BENDS: { columns: ['BEND_PTR', 'NODE1', 'NODE2', 'RADIUS'], rows: [] },
      INPUT_RIGIDS: { columns: ['RIGID_PTR', 'RIGID_WGT'], rows: [] },
      INPUT_REDUCERS: { columns: ['RED_PTR', 'DIAMETER2', 'THICKNESS2'], rows: [] },
      INPUT_SIFTEES: { columns: ['NODE', 'TYPE'], rows: [] },
      INPUT_OFFSETS: { columns: ['ELEMENTID'], rows: [] },
      INPUT_FORCMNT: { columns: ['NODE'], rows: [] },
      OUTPUT_DISPLACEMENTS: {
        columns: ['LCASE_NUM', 'CASE', 'LCASE_NAME', 'NODE', 'DX', 'DY', 'DZ', 'RX', 'RY', 'RZ', 'DUNITS', 'RUNITS'],
        rows: CASES.flatMap((caseRow) => Object.keys(NODES).map((nodeId) => ({
          ...caseDescriptorColumns(caseRow),
          NODE: Number(nodeId),
          DX: 0, DY: 0, DZ: 0, RX: 0, RY: 0, RZ: 0,
          DUNITS: 'mm.', RUNITS: 'deg',
        }))),
      },
      OUTPUT_RESTRAINTS_SUMMARY: {
        columns: ['LCASE_NUM', 'CASE', 'LCASE_NAME', 'NODE', 'FX', 'FY', 'FZ', 'MX', 'MY', 'MZ', 'FUNITS', 'MUNITS'],
        rows: CASES.flatMap((caseRow) => restraintRows.map((restraint) => ({
          ...caseDescriptorColumns(caseRow),
          NODE: restraint.NODE_NUM,
          FX: 0, FY: 0, FZ: 0, MX: 0, MY: 0, MZ: 0,
          FUNITS: 'N.', MUNITS: 'N.m.',
        }))),
      },
      OUTPUT_GLOBAL_ELEMENT_FORCES: {
        columns: [
          'LCASE_NUM', 'CASE', 'LCASE_NAME', 'FROM_NODE', 'TO_NODE', 'ELEMENT_NAME',
          'FXF', 'FYF', 'FZF', 'MXF', 'MYF', 'MZF',
          'FXT', 'FYT', 'FZT', 'MXT', 'MYT', 'MZT', 'FUNITS', 'MUNITS',
        ],
        rows: CASES.flatMap((caseRow) => SPANS.map((span) => ({
          ...caseDescriptorColumns(caseRow),
          FROM_NODE: span.fromNode,
          TO_NODE: span.toNode,
          ELEMENT_NAME: `SPAN-${span.elementId}`,
          FXF: 0, FYF: 0, FZF: 0, MXF: 0, MYF: 0, MZF: 0,
          FXT: 0, FYT: 0, FZT: 0, MXT: 0, MYT: 0, MZT: 0,
          FUNITS: 'N.', MUNITS: 'N.m.',
        }))),
      },
    },
  });
}

/**
 * Build the fixture benchmark profile.
 *
 * @param {string} frictionDeclaration One of FRICTION_FIXTURE_DECLARATIONS.
 * @returns {Record<string, unknown>} Profile document in profile-schema shape.
 */
export function buildFrictionFixtureProfile(frictionDeclaration) {
  if (!FRICTION_FIXTURE_DECLARATIONS.includes(frictionDeclaration)) {
    throw new TypeError(`Unsupported fixture friction declaration ${String(frictionDeclaration)}.`);
  }
  const superseded = frictionDeclaration === 'SUPERSEDED_LOAD_CASE_MU_OVERRIDE';
  const tolerance = {
    absolute: 0,
    relative: 0.1,
    scaleFloor: 0,
    comparisonMode: 'LITERAL_RELATIVE_WITH_ZERO_ABSOLUTE',
    zeroReferenceAbsolute: 5,
  };
  return deepFreeze({
    schema: 'caesar-accdb-benchmark-profile/v1',
    profileId: `FRICTION-FIXTURE-${superseded ? 'SUPERSEDED' : 'GOVERNED'}-V1`,
    benchmarkId: 'FRICTION_FIXTURE',
    installationTemperature: { value: 21, unit: 'C' },
    caseSelection: {
      mode: 'EXPLICIT',
      cases: CASES.map((caseRow) => ({ caseId: `L${caseRow.lcaseNumber}`, lcaseNumber: caseRow.lcaseNumber })),
    },
    nodeSelection: 'INPUT_ENDPOINT_NODES',
    resultFamilies: ['DISPLACEMENT', 'RESTRAINT_REACTION', 'GLOBAL_ELEMENT_END_ACTION', 'NODAL_EQUILIBRIUM'],
    conventions: { restraintReaction: 'CAESAR_FORCE_ON_SUPPORT' },
    equilibriumTolerance: { forceN: 5, momentNm: 0.5 },
    tolerances: {
      DISPLACEMENT: { ...tolerance, zeroReferenceAbsolute: 1e-7 },
      ROTATION: { ...tolerance, zeroReferenceAbsolute: 1.7453292519943296e-6 },
      FORCE: { ...tolerance },
      MOMENT: { ...tolerance, zeroReferenceAbsolute: 0.5 },
      GLOBAL_END_FORCE_FROM: { ...tolerance },
      GLOBAL_END_FORCE_TO: { ...tolerance },
      GLOBAL_END_MOMENT_FROM: { ...tolerance, zeroReferenceAbsolute: 0.5 },
      GLOBAL_END_MOMENT_TO: { ...tolerance, zeroReferenceAbsolute: 0.5 },
      INCIDENT_GLOBAL_FORCE: { ...tolerance },
      INCIDENT_GLOBAL_MOMENT: { ...tolerance, zeroReferenceAbsolute: 0.5 },
    },
    configurationAuthority: {
      schema: 'caesar-configuration-authority/v1',
      caesarVersion: '14.000',
      precedence: superseded
        ? ['LOAD_CASE_SETTING', 'INDIVIDUAL_FILE_SETTING', 'MODEL_INPUT', 'OVERALL_GLOBAL_DEFAULT']
        : ['OVERALL_GLOBAL_DEFAULT', 'INDIVIDUAL_FILE_SETTING', 'LOAD_CASE_SETTING', 'MODEL_INPUT'],
      layers: {
        overallGlobalDefault: {
          source: 'FIXTURE_CAESAR_14_GLOBAL_DEFAULTS',
          settings: {
            Z_AXIS_UP: 'NO',
            BEND_AXIAL_SHAPE: 'YES',
            BOURDON_PRESSURE: 'NONE',
            COEFFICIENT_OF_FRICTION_MU: 0,
            FRICT_STIF: { value: 1000000, unit: 'DISPLAYED_CAESAR_UNITS' },
            DEFAULT_TRANS_RESTRAINT_STIFF: { value: 1000000000000, unit: 'DISPLAYED_CAESAR_UNITS' },
            DEFAULT_ROT_RESTRAINT_STIFF: { value: 1000000000000, unit: 'DISPLAYED_CAESAR_UNITS' },
            AMBIENT_TEMPERATURE: { value: 70, unit: 'F' },
            FLEXIBILITY_ELASTIC_MODULUS: 'EC',
          },
        },
        modelInput: {
          source: 'FIXTURE_MODEL_INPUT',
          settings: { COEFFICIENT_OF_FRICTION_MU: 0.3 },
        },
        individualFile: {
          source: 'FIXTURE_FILE_SETTINGS',
          settings: {
            BOURDON_PRESSURE: 'TRANSLATION_AND_ROTATION',
            AMBIENT_TEMPERATURE: { value: 21, unit: 'C' },
            RESTRAINT_DIRECTIONAL_BEHAVIOR: 'BIDIRECTIONAL',
          },
        },
        loadCase: {
          source: 'FIXTURE_CASE_SETTINGS',
          cases: Object.fromEntries(CASES.map((caseRow) => [
            `L${caseRow.lcaseNumber}`,
            caseLayerSettings(caseRow, superseded),
          ])),
        },
      },
      unresolvedSettings: [],
    },
    linearSolve: {
      thermalExpansion: {
        coefficientPerKelvin: 1.2231989994646464e-5,
        authorityStatus: 'RESOLVED',
        source: 'FIXTURE_THERMAL_EXPANSION',
      },
      gravityAcceleration: 9.80665,
      bourdonPressureEffects: {
        mode: 'TRANSLATION_AND_ROTATION',
        source: 'FIXTURE_FILE_SETTINGS',
      },
      directionalB31JTeeFlexibility: true,
      teeNominalDiameterRelativeTolerance: 0.001,
      reducerCondensation: true,
      b31jSmooth90FlexibilityCorrection: {
        enabled: true,
        authorityStatus: 'RESOLVED',
        source: 'FIXTURE_B31J_SMOOTH_90',
      },
      bendPressureStiffening: {
        pressureSource: 'P1',
        authorityStatus: 'RESOLVED',
        source: 'FIXTURE_BEND_PRESSURE_STIFFENING',
      },
      restraintRepresentation: {
        mode: 'CAESAR_DEFAULT_FINITE_STIFFNESS',
        authorityStatus: 'RESOLVED',
        source: 'FIXTURE_RESTRAINT_REPRESENTATION',
      },
      bendAxialShape: {
        enabled: true,
        method: 'DISCRETIZED_CURVED_CENTRELINE_AXIAL_DOF_V1',
        source: 'FIXTURE_BEND_AXIAL_SHAPE',
      },
    },
  });
}

/** Build the fixture profile and raw export together. */
export function buildFrictionFixture(frictionDeclaration) {
  return {
    profile: buildFrictionFixtureProfile(frictionDeclaration),
    rawExport: buildFrictionFixtureRawExport(),
  };
}

function caseLayerSettings(caseRow, superseded) {
  return { ...(superseded ? caseRow.superseded : caseRow.governed) };
}

function caseDescriptorColumns(caseRow) {
  return {
    LCASE_NUM: caseRow.lcaseNumber,
    CASE: `CASE ${caseRow.lcaseNumber} (${caseRow.caseClass}) ${caseRow.formula}`,
    LCASE_NAME: `FIXTURE-L${caseRow.lcaseNumber}`,
  };
}
