import { semanticHash } from '../core/shared-piping-model/canonical-json.js';

export const LFEA_PREFLIGHT_PHASE1_SCHEMA = 'lfea-preflight-phase1-review/v1';

/**
 * Closed Phase-1 engineering value schema.
 *
 * The 40 field IDs are the production counterpart of the pinned Phase-0
 * qualification schema. Ordinal is contractual: callers store values/statuses
 * by ordinal and must not infer order from object enumeration or rendered DOM.
 */
export const LFEA_PREFLIGHT_ENGINEERING_FIELDS = Object.freeze([
  'process.designPressureKpaG',
  'process.hydroTestPressureKpaG',
  'process.designTemperatureC',
  'process.operatingTemperatureC',
  'process.minimumTemperatureC',
  'process.phaseCode',
  'process.testMediumCode',
  'piping.pipingClassCode',
  'piping.ratingClassCode',
  'piping.nominalBoreMm',
  'piping.nominalBoreIn',
  'piping.outsideDiameterMm',
  'piping.scheduleCode',
  'piping.wallThicknessMm',
  'piping.corrosionAllowanceMm',
  'piping.insideDiameterMm',
  'piping.sectionAreaM2',
  'material.materialCode',
  'material.categoryCode',
  'material.densityKgM3',
  'material.elasticModulusMpa',
  'material.poissonRatio',
  'material.thermalExpansionPerC',
  'material.referenceAllowableMpa',
  'contents.operatingDensityKgM3',
  'contents.hydroDensityKgM3',
  'contents.gasDensityKgM3',
  'contents.liquidDensityKgM3',
  'contents.mixedDensityKgM3',
  'contents.selectedBasisCode',
  'insulation.code',
  'insulation.stateCode',
  'insulation.thicknessMm',
  'insulation.densityKgM3',
  'insulation.massKgPerM',
  'weight.pipeMetalKgPerM',
  'weight.contentsOperatingKgPerM',
  'weight.contentsHydroKgPerM',
  'weight.insulationKgPerM',
  'weight.totalOperatingKgPerM',
]);

export const LFEA_PREFLIGHT_FIELD_STATUS = Object.freeze({
  RESOLVED_EXACT: 1,
  RESOLVED_DERIVED: 2,
  PROPOSED_REVIEW: 3,
  BLOCKED_MISSING: 4,
  BLOCKED_AMBIGUOUS: 5,
  BLOCKED_CONFLICT: 6,
  BLOCKED_STALE_SOURCE: 7,
  NOT_APPLICABLE: 8,
});

export const LFEA_PREFLIGHT_EXCEPTION_QUEUE = Object.freeze({
  MISSING: 'MISSING',
  AMBIGUOUS: 'AMBIGUOUS',
  CONFLICTING: 'CONFLICTING',
  STALE: 'STALE',
  PROPOSED: 'PROPOSED',
  DEFERRED: 'DEFERRED',
});

export const LFEA_PREFLIGHT_FACET_MODE = Object.freeze({
  AND: 'AND',
  OR: 'OR',
});

const FIELD_LABELS = Object.freeze({
  'process.designPressureKpaG': 'Design pressure (kPa g)',
  'process.hydroTestPressureKpaG': 'Hydro test pressure (kPa g)',
  'process.designTemperatureC': 'Design temperature (°C)',
  'process.operatingTemperatureC': 'Operating temperature (°C)',
  'process.minimumTemperatureC': 'Minimum temperature (°C)',
  'process.phaseCode': 'Phase',
  'process.testMediumCode': 'Test medium',
  'piping.pipingClassCode': 'Piping class',
  'piping.ratingClassCode': 'Rating class',
  'piping.nominalBoreMm': 'Nominal bore (mm)',
  'piping.nominalBoreIn': 'Nominal bore (in)',
  'piping.outsideDiameterMm': 'Outside diameter (mm)',
  'piping.scheduleCode': 'Schedule',
  'piping.wallThicknessMm': 'Wall thickness (mm)',
  'piping.corrosionAllowanceMm': 'Corrosion allowance (mm)',
  'piping.insideDiameterMm': 'Inside diameter (mm)',
  'piping.sectionAreaM2': 'Section area (m²)',
  'material.materialCode': 'Material',
  'material.categoryCode': 'Material category',
  'material.densityKgM3': 'Material density (kg/m³)',
  'material.elasticModulusMpa': 'Elastic modulus (MPa)',
  'material.poissonRatio': 'Poisson ratio',
  'material.thermalExpansionPerC': 'Thermal expansion (/°C)',
  'material.referenceAllowableMpa': 'Reference allowable (MPa)',
  'contents.operatingDensityKgM3': 'Operating contents density (kg/m³)',
  'contents.hydroDensityKgM3': 'Hydro contents density (kg/m³)',
  'contents.gasDensityKgM3': 'Gas density (kg/m³)',
  'contents.liquidDensityKgM3': 'Liquid density (kg/m³)',
  'contents.mixedDensityKgM3': 'Mixed density (kg/m³)',
  'contents.selectedBasisCode': 'Contents density basis',
  'insulation.code': 'Insulation code',
  'insulation.stateCode': 'Insulation state',
  'insulation.thicknessMm': 'Insulation thickness (mm)',
  'insulation.densityKgM3': 'Insulation density (kg/m³)',
  'insulation.massKgPerM': 'Insulation mass (kg/m)',
  'weight.pipeMetalKgPerM': 'Pipe metal mass (kg/m)',
  'weight.contentsOperatingKgPerM': 'Operating contents mass (kg/m)',
  'weight.contentsHydroKgPerM': 'Hydro contents mass (kg/m)',
  'weight.insulationKgPerM': 'Insulation mass contribution (kg/m)',
  'weight.totalOperatingKgPerM': 'Total operating mass (kg/m)',
});

export const LFEA_PREFLIGHT_COLUMN_SCHEMA = Object.freeze(
  LFEA_PREFLIGHT_ENGINEERING_FIELDS.map((fieldId, ordinal) => Object.freeze({
    ordinal,
    fieldId,
    groupId: fieldId.split('.')[0].toUpperCase(),
    label: FIELD_LABELS[fieldId],
  })),
);

export const LFEA_PREFLIGHT_COLUMN_GROUPS = Object.freeze([
  Object.freeze({ groupId: 'PROCESS', startOrdinal: 0, columnCount: 7 }),
  Object.freeze({ groupId: 'PIPING', startOrdinal: 7, columnCount: 10 }),
  Object.freeze({ groupId: 'MATERIAL', startOrdinal: 17, columnCount: 7 }),
  Object.freeze({ groupId: 'CONTENTS', startOrdinal: 24, columnCount: 6 }),
  Object.freeze({ groupId: 'INSULATION', startOrdinal: 30, columnCount: 5 }),
  Object.freeze({ groupId: 'WEIGHT', startOrdinal: 35, columnCount: 5 }),
]);

export const LFEA_PREFLIGHT_COLUMN_PRESETS = Object.freeze({
  REVIEW: Object.freeze([
    0, 2, 3, 5, 7, 8, 9, 12, 13, 17, 19, 24, 29, 30, 32, 39,
  ]),
  PROCESS: Object.freeze([0, 1, 2, 3, 4, 5, 6, 24, 25, 26, 27, 28, 29]),
  MECHANICAL: Object.freeze([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]),
  EVIDENCE: Object.freeze([...Array(40).keys()]),
  ALL_40: Object.freeze([...Array(40).keys()]),
});

export const LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH = semanticHash({
  schema: LFEA_PREFLIGHT_PHASE1_SCHEMA,
  columns: LFEA_PREFLIGHT_COLUMN_SCHEMA,
  groups: LFEA_PREFLIGHT_COLUMN_GROUPS,
});

validateClosedSchema();

export function requireLfeaPreflightFieldOrdinal(fieldId) {
  const ordinal = LFEA_PREFLIGHT_ENGINEERING_FIELDS.indexOf(String(fieldId));
  if (ordinal < 0) throw phase1SchemaError('E_P06_FIELD_UNKNOWN', `Unknown Phase-1 field: ${fieldId}`);
  return ordinal;
}

export function requireLfeaPreflightFieldStatus(value) {
  const status = Number(value);
  if (!Object.values(LFEA_PREFLIGHT_FIELD_STATUS).includes(status)) {
    throw phase1SchemaError('E_P06_FIELD_STATUS_INVALID', `Unknown Phase-1 field status: ${value}`);
  }
  return status;
}

function validateClosedSchema() {
  if (LFEA_PREFLIGHT_ENGINEERING_FIELDS.length !== 40
    || LFEA_PREFLIGHT_COLUMN_SCHEMA.length !== 40) {
    throw phase1SchemaError('E_P06_FIELD_SCHEMA_DRIFT', 'Phase-1 engineering schema must contain exactly 40 columns.');
  }
  const ids = new Set();
  LFEA_PREFLIGHT_COLUMN_SCHEMA.forEach((column, ordinal) => {
    if (column.ordinal !== ordinal || ids.has(column.fieldId) || !column.label) {
      throw phase1SchemaError('E_P06_FIELD_SCHEMA_DRIFT', 'Phase-1 engineering column ordinals or IDs are invalid.');
    }
    ids.add(column.fieldId);
  });
  const covered = LFEA_PREFLIGHT_COLUMN_GROUPS.reduce((total, group) => total + group.columnCount, 0);
  if (covered !== 40) {
    throw phase1SchemaError('E_P06_FIELD_SCHEMA_DRIFT', 'Phase-1 column groups must cover exactly 40 ordinals.');
  }
}

function phase1SchemaError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_SCHEMA';
  return error;
}
