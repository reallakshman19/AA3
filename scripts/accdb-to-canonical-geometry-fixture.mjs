/**
 * Deterministic ACCDB-table-shaped fixture for the ACCDB -> canonical
 * geometry adapter (src/core/geometry/adapters/accdb-to-canonical-geometry.js)
 * and its source-binding layer (src/core/linear-piping-analysis-consumer/
 * accdb-source-binding.js).
 *
 * A real .accdb binary was used to validate this adapter during development
 * (BM_CII.ACCDB, a real CAESAR II export from a sibling repository), but
 * that binary is not part of this repository and cannot be committed here
 * for a portable, CI-safe check -- mirroring the same constraint
 * caesar-accdb-friction-fixture.js documents for the M047 friction fixture.
 * This fixture reproduces the exact 11-table/column shape
 * readAccdbNamedTables(...) produces, hand-built to exercise every major
 * code path the real fixture could only partially cover (the real file had
 * zero rows in INPUT_REDUCERS/INPUT_OFFSETS/INPUT_FORCMNT): a bend, a rigid
 * (VALVE), a reducer, an element offset (fail-closed), a welding-tee SIF, an
 * undocumented SIF type code, an anchor restraint, a non-anchor restraint
 * with a nonzero GAP, a restraint with a CNODE (fail-closed), a restraint on
 * an unresolved node, forces/moments evidence, field inheritance across
 * elements, CAESAR blank-sentinel handling, and the real "bars" pressure
 * token (the plural-token bug this adapter's units fix addresses).
 *
 * Node layout (raw mm, converted to metres by the adapter):
 *   10 -(bend, R=500mm)-> 20 -> 30 -> 40 -> 50 -> 60 -> 70
 * DELTA_X/Y/Z on each element are declared consistently with the node
 * coordinates below so the topology closure check (comparing declared
 * element deltas against INPUT_NODAL_COORDINATES-derived node positions)
 * passes cleanly -- this is the exact cross-check the rawDelta wiring in
 * accdb-source-binding.js exists to satisfy.
 */
const SENTINEL = -1.01010000705719;

const INPUT_UNITS = [{
  LENGTH: 'mm.',
  FORCE: 'N.',
  MOMENT_IN: 'N.M.',
  STRESS: 'MPa',
  TEMP: 'C',
  PRESSURE: 'bars',
  EMODULUS: 'MPa',
  PIPE_DENSITY: 'kg./cu.cm.',
  INSUL_DENSITY: 'kg./cu.cm.',
  FLUID_DENSITY: 'kg./cu.cm.',
}];

const INPUT_CONTROL = [{ NUMELT: 6 }];

const INPUT_NODAL_COORDINATES = [
  { FROM_NODE: 10, TO_NODE: 20, FROM_NODE_X: 0, FROM_NODE_Y: 0, FROM_NODE_Z: 0, TO_NODE_X: 2000, TO_NODE_Y: 0, TO_NODE_Z: 0 },
  { FROM_NODE: 20, TO_NODE: 30, FROM_NODE_X: 2000, FROM_NODE_Y: 0, FROM_NODE_Z: 0, TO_NODE_X: 2000, TO_NODE_Y: 1000, TO_NODE_Z: 0 },
  { FROM_NODE: 30, TO_NODE: 40, FROM_NODE_X: 2000, FROM_NODE_Y: 1000, FROM_NODE_Z: 0, TO_NODE_X: 2000, TO_NODE_Y: 1000, TO_NODE_Z: 500 },
  { FROM_NODE: 40, TO_NODE: 50, FROM_NODE_X: 2000, FROM_NODE_Y: 1000, FROM_NODE_Z: 500, TO_NODE_X: 2000, TO_NODE_Y: 1000, TO_NODE_Z: 1000 },
  { FROM_NODE: 50, TO_NODE: 60, FROM_NODE_X: 2000, FROM_NODE_Y: 1000, FROM_NODE_Z: 1000, TO_NODE_X: 2000, TO_NODE_Y: 1000, TO_NODE_Z: 1500 },
  { FROM_NODE: 60, TO_NODE: 70, FROM_NODE_X: 2000, FROM_NODE_Y: 1000, FROM_NODE_Z: 1500, TO_NODE_X: 2000, TO_NODE_Y: 1000, TO_NODE_Z: 2000 },
];

const INPUT_BENDS = [
  { BEND_PTR: 1, RADIUS: 500, ANGLE1: 90, ANGLE2: 0, NUM_MITER: 0, NODE1: 0, NODE2: 0 },
];

const INPUT_RIGIDS = [
  { RIGID_PTR: 1, RIGID_TYPE: 'VALVE', RIGID_WGT: 150 },
];

const INPUT_REDUCERS = [
  { RED_PTR: 1, DIAMETER2: 88.9, THICKNESS2: 5.5, ALPHA: 15, R1: 0, R2: 0 },
];

const INPUT_OFFSETS = [
  { EOFF_PTR: 1, EOFF_X: 10, EOFF_Y: 0, EOFF_Z: 0 },
];

const INPUT_SIFTEES = [
  { NODE: 40, TYPE: 3, SIF_IN: 1.5, SIF_OUT: 1.2 },
  { NODE: 40, TYPE: 11, SIF_IN: SENTINEL, SIF_OUT: SENTINEL },
];

const INPUT_FORCMNT = [
  { FORCMNT_PTR: 1, FORCMNT_NUM: 1, VECTOR_NUM: 1, FX: 100, FY: 0, FZ: 0, MX: 0, MY: 0, MZ: 10 },
];

const INPUT_RESTRAINTS = [
  { NODE_NUM: 10, RES_TYPEID: 1, XCOSINE: SENTINEL, YCOSINE: SENTINEL, ZCOSINE: SENTINEL, STIFFNESS: SENTINEL, GAP: SENTINEL, FRIC_COEF: SENTINEL, CNODE: SENTINEL, RES_TAG: 'ANCHOR-10' },
  { NODE_NUM: 40, RES_TYPEID: 3, XCOSINE: SENTINEL, YCOSINE: 1, ZCOSINE: SENTINEL, STIFFNESS: SENTINEL, GAP: 10, FRIC_COEF: SENTINEL, CNODE: SENTINEL, RES_TAG: 'Y-40' },
  { NODE_NUM: 60, RES_TYPEID: 3, XCOSINE: SENTINEL, YCOSINE: 1, ZCOSINE: SENTINEL, STIFFNESS: SENTINEL, GAP: SENTINEL, FRIC_COEF: SENTINEL, CNODE: 999, RES_TAG: 'CNODE-60' },
  { NODE_NUM: 9999, RES_TYPEID: 3, XCOSINE: SENTINEL, YCOSINE: 1, ZCOSINE: SENTINEL, STIFFNESS: SENTINEL, GAP: SENTINEL, FRIC_COEF: SENTINEL, CNODE: SENTINEL, RES_TAG: 'ORPHAN' },
];

const BASE_ELEMENT = {
  JOBNAME: 'FIXTURE', ISSUE_NO: '', UPDATE_TIME: '', FROM_NODE_NAME: '', TO_NODE_NAME: '', LINE_NO: 'LINE1',
  INSUL_THICK: 20, CORR_ALLOW: 0, TEMP_EXP_C2: SENTINEL,
  PRESSURE2: 0, PRESSURE3: 0, PRESSURE4: 0, PRESSURE5: 0, PRESSURE6: 0, PRESSURE7: 0, PRESSURE8: 0, PRESSURE9: 0,
  HOT_MOD1: SENTINEL, MATERIAL_NUM: 106, MILL_TOL_PLUS: 0, MILL_TOL_MINUS: 0, SEAM_WELD: 0,
  BEND_PTR: 0, RIGID_PTR: 0, EXPJ_PTR: 0, REST_PTR: 0, DISP_PTR: 0, FORCMNT_PTR: 0, ULOAD_PTR: 0, WLOAD_PTR: 0,
  EOFF_PTR: 0, ALLOW_PTR: 0, INT_PTR: 0, HGR_PTR: 0, NOZ_PTR: 0, REDUCER_PTR: 0, FLANGE_PTR: 0, ELEMENT_NAME: '',
  REFRACT_THK: 0, REFRACT_DENSITY: SENTINEL, CLAD_THK: 0, CLAD_DENSITY: SENTINEL, INSUL_CLAD_UNIT_WEIGHT: SENTINEL,
};

const INPUT_BASIC_ELEMENT_DATA = [
  {
    ...BASE_ELEMENT, ELEMENTID: 1, FROM_NODE: 10, TO_NODE: 20, DELTA_X: 2000, DELTA_Y: 0, DELTA_Z: 0,
    DIAMETER: 114.3, WALL_THICK: 6, MODULUS: 203390.7, POISSONS: 0.292, PIPE_DENSITY: 0.007833,
    FLUID_DENSITY: 0.0009996, INSUL_DENSITY: 0.00014, TEMP_EXP_C1: 350, PRESSURE1: 2, HYDRO_PRESSURE: 5,
    MATERIAL_NAME: 'A106 B', BEND_PTR: 1,
  },
  {
    ...BASE_ELEMENT, ELEMENTID: 2, FROM_NODE: 20, TO_NODE: 30, DELTA_X: 0, DELTA_Y: 1000, DELTA_Z: 0,
    DIAMETER: SENTINEL, WALL_THICK: SENTINEL, MODULUS: SENTINEL, POISSONS: SENTINEL, PIPE_DENSITY: SENTINEL,
    FLUID_DENSITY: SENTINEL, INSUL_DENSITY: SENTINEL, TEMP_EXP_C1: SENTINEL, PRESSURE1: SENTINEL, HYDRO_PRESSURE: SENTINEL,
    MATERIAL_NAME: '',
  },
  {
    ...BASE_ELEMENT, ELEMENTID: 3, FROM_NODE: 30, TO_NODE: 40, DELTA_X: 0, DELTA_Y: 0, DELTA_Z: 500,
    DIAMETER: SENTINEL, WALL_THICK: SENTINEL, MODULUS: SENTINEL, POISSONS: SENTINEL, PIPE_DENSITY: SENTINEL,
    FLUID_DENSITY: SENTINEL, INSUL_DENSITY: SENTINEL, TEMP_EXP_C1: SENTINEL, PRESSURE1: SENTINEL, HYDRO_PRESSURE: SENTINEL,
    MATERIAL_NAME: '',
  },
  {
    ...BASE_ELEMENT, ELEMENTID: 4, FROM_NODE: 40, TO_NODE: 50, DELTA_X: 0, DELTA_Y: 0, DELTA_Z: 500,
    DIAMETER: SENTINEL, WALL_THICK: SENTINEL, MODULUS: SENTINEL, POISSONS: SENTINEL, PIPE_DENSITY: SENTINEL,
    FLUID_DENSITY: SENTINEL, INSUL_DENSITY: SENTINEL, TEMP_EXP_C1: SENTINEL, PRESSURE1: SENTINEL, HYDRO_PRESSURE: SENTINEL,
    MATERIAL_NAME: '', RIGID_PTR: 1,
  },
  {
    ...BASE_ELEMENT, ELEMENTID: 5, FROM_NODE: 50, TO_NODE: 60, DELTA_X: 0, DELTA_Y: 0, DELTA_Z: 500,
    DIAMETER: 114.3, WALL_THICK: 6, MODULUS: SENTINEL, POISSONS: SENTINEL, PIPE_DENSITY: SENTINEL,
    FLUID_DENSITY: SENTINEL, INSUL_DENSITY: SENTINEL, TEMP_EXP_C1: SENTINEL, PRESSURE1: SENTINEL, HYDRO_PRESSURE: SENTINEL,
    MATERIAL_NAME: '', REDUCER_PTR: 1,
  },
  {
    ...BASE_ELEMENT, ELEMENTID: 6, FROM_NODE: 60, TO_NODE: 70, DELTA_X: 0, DELTA_Y: 0, DELTA_Z: 500,
    DIAMETER: SENTINEL, WALL_THICK: SENTINEL, MODULUS: SENTINEL, POISSONS: SENTINEL, PIPE_DENSITY: SENTINEL,
    FLUID_DENSITY: SENTINEL, INSUL_DENSITY: SENTINEL, TEMP_EXP_C1: SENTINEL, PRESSURE1: SENTINEL, HYDRO_PRESSURE: SENTINEL,
    MATERIAL_NAME: '', EOFF_PTR: 1, FORCMNT_PTR: 1,
  },
];

function table(rows) {
  return { columns: rows.length > 0 ? Object.keys(rows[0]) : [], rows };
}

/** Matches readAccdbNamedTables(bytes, MODEL_TABLES, log)'s { TABLE: { columns, rows } } shape. */
export function buildAccdbFixtureTables() {
  return {
    INPUT_BASIC_ELEMENT_DATA: table(INPUT_BASIC_ELEMENT_DATA),
    INPUT_BENDS: table(INPUT_BENDS),
    INPUT_CONTROL: table(INPUT_CONTROL),
    INPUT_FORCMNT: table(INPUT_FORCMNT),
    INPUT_NODAL_COORDINATES: table(INPUT_NODAL_COORDINATES),
    INPUT_OFFSETS: table(INPUT_OFFSETS),
    INPUT_REDUCERS: table(INPUT_REDUCERS),
    INPUT_RESTRAINTS: table(INPUT_RESTRAINTS),
    INPUT_RIGIDS: table(INPUT_RIGIDS),
    INPUT_SIFTEES: table(INPUT_SIFTEES),
    INPUT_UNITS: table(INPUT_UNITS),
  };
}

export const ACCDB_FIXTURE_ELEMENT_COUNT = INPUT_BASIC_ELEMENT_DATA.length;
export const ACCDB_FIXTURE_SENTINEL = SENTINEL;
