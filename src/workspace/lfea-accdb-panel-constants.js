export const LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA = 'lfea-pipeline-accdb-input-panel/v1';

/** The full ACCDB model table set (11 tables) -- matches caesar-accdb-package.js's MODEL_TABLES. */
export const LFEA_PIPELINE_ACCDB_MODEL_TABLES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);
