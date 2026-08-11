import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import {
  COMMON_ENRICHED_LINE_LIST_FIELD_BINDING_SCHEMA,
  COMMON_ENRICHED_LINE_LIST_RESOLUTION_SCHEMA,
  COMMON_ENRICHED_MATERIAL_FIELD_BINDING_SCHEMA,
  COMMON_ENRICHED_MATERIAL_KEY_CONFIG_SCHEMA,
  COMMON_ENRICHED_MATERIAL_RESOLUTION_SCHEMA,
  COMMON_ENRICHED_PIPING_CLASS_FIELD_BINDING_SCHEMA,
  COMMON_ENRICHED_PIPING_CLASS_KEY_CONFIG_SCHEMA,
  COMMON_ENRICHED_PIPING_CLASS_RESOLUTION_SCHEMA,
  COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
  ENGINEERING_MASTER_RECORD_SCHEMA,
  ENGINEERING_MASTER_SNAPSHOT_SCHEMA,
  createCommonEnrichedLineListResolution,
  createCommonEnrichedMaterialResolution,
  createCommonEnrichedPipingClassResolution,
  createCommonEnrichedTargetInventory,
  createEngineeringMasterSnapshot,
} from '../core/common-enriched-properties/index.js';

export const LFEA_PREFLIGHT_PHASE1_MASTER_AUTHORITY_SCHEMA =
  'lfea-preflight-phase1-master-authority/v1';

/**
 * Phase-1 fields that the currently normalized workspace masters can support
 * without an engineering default, handbook lookup or solver-side inference.
 *
 * `material.materialCode` is resolved indirectly: the exact piping-class row
 * supplies materialName and the exact material-map row supplies code.
 */
export const LFEA_PREFLIGHT_MASTER_AUTHORITY_FIELDS = Object.freeze([
  'material.materialCode',
  'piping.corrosionAllowanceMm',
  'piping.nominalBoreIn',
  'piping.scheduleCode',
  'piping.wallThicknessMm',
]);

/**
 * Closed declaration of fields intentionally NOT supplied by this adapter.
 * The current normalized piping-class schema has no OD, and the current
 * normalized material-map schema has no mechanical-property columns. Keeping
 * these explicit prevents a later caller from treating absence as permission to
 * derive a default.
 */
export const LFEA_PREFLIGHT_MASTER_AUTHORITY_UNAVAILABLE_FIELDS = Object.freeze([
  'material.categoryCode',
  'material.densityKgM3',
  'material.elasticModulusMpa',
  'material.poissonRatio',
  'material.referenceAllowableMpa',
  'material.thermalExpansionPerC',
  'piping.insideDiameterMm',
  'piping.outsideDiameterMm',
  'piping.sectionAreaM2',
]);

const LINE_BINDINGS = Object.freeze([
  lineBinding('piping.nominalBoreMm', 'nominalBoreMm', 'mm', 'NUMBER'),
  lineBinding('piping.pipingClassCode', 'pipingClass', null, 'STRING'),
].sort(byTargetField));

const PIPING_BINDINGS = Object.freeze([
  pipingBinding('material.materialName', 'materialName', null, 'STRING'),
  pipingBinding('piping.corrosionAllowanceMm', 'corrosionAllowanceMm', 'mm', 'NUMBER'),
  pipingBinding('piping.nominalBoreIn', 'nps', 'in', 'NUMBER'),
  pipingBinding('piping.scheduleCode', 'schedule', null, 'STRING'),
  pipingBinding('piping.wallThicknessMm', 'wallThicknessMm', 'mm', 'NUMBER'),
].sort(byTargetField));

const MATERIAL_BINDINGS = Object.freeze([
  materialBinding('material.materialCode', 'materialCode', null, 'STRING'),
]);

/**
 * Convert the live normalized workspace masters into the already-governed
 * common-enrichment exact-resolution chain.
 *
 * This function is deliberately read-only. It receives a current sealed shared
 * model and a snapshot of masterDataController.getMasterData(); it does not
 * import the controller, publish events, mutate source rows, read browser
 * storage, invent timestamps, or run any solver.
 *
 * @param {object} input
 * @param {object} input.sharedModel Current shared-piping-model/v1.
 * @param {object} input.masterData Read-only master-data snapshot.
 * @param {{lineList:string,pipingClass:string,materialMap?:string|null}} input.capturedAtByMaster
 *   Canonical UTC capture timestamps supplied by the caller. No ambient clock is
 *   permitted here.
 * @returns {object} Immutable-by-construction common-enrichment authority bundle.
 */
export function createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData,
  capturedAtByMaster,
}) {
  requireRecord(masterData, 'masterData');
  requireRecord(capturedAtByMaster, 'capturedAtByMaster');

  const lineList = requireMaster(masterData, 'lineList', true);
  const pipingClass = requireMaster(masterData, 'pipingClass', true);
  const materialMap = requireMaster(masterData, 'materialMap', false);

  const inventory = createCommonEnrichedTargetInventory({
    schema: COMMON_ENRICHED_TARGET_INVENTORY_SCHEMA,
    inventoryId: `P06-INVENTORY-${sharedModel?.semanticHash ?? 'INVALID'}`,
    sharedModel,
  });

  const lineListSnapshot = createEngineeringMasterSnapshot({
    schema: ENGINEERING_MASTER_SNAPSHOT_SCHEMA,
    snapshotId: snapshotId('LINE_LIST', lineList.sourceHash),
    sourceKind: 'LINE_LIST',
    sourceKey: 'lineList',
    sourceHash: requireSourceHash(lineList.sourceHash, 'lineList'),
    capturedAt: requireCapture(capturedAtByMaster.lineList, 'lineList'),
    mappingSemanticHash: semanticHash(lineList.fieldMap ?? {}),
    records: lineListRecords(lineList.normalizedRows),
    metadata: sourceMetadata(lineList),
  });

  const lineListResolution = createCommonEnrichedLineListResolution({
    schema: COMMON_ENRICHED_LINE_LIST_RESOLUTION_SCHEMA,
    resolutionId: resolutionId('LINE_LIST', inventory.semanticHash, lineListSnapshot.semanticHash),
    inventory,
    snapshot: lineListSnapshot,
    bindings: LINE_BINDINGS,
  });

  const pipingClassSnapshot = createEngineeringMasterSnapshot({
    schema: ENGINEERING_MASTER_SNAPSHOT_SCHEMA,
    snapshotId: snapshotId('PIPING_CLASS', pipingClass.sourceHash),
    sourceKind: 'PIPING_CLASS',
    sourceKey: 'pipingClass',
    sourceHash: requireSourceHash(pipingClass.sourceHash, 'pipingClass'),
    capturedAt: requireCapture(capturedAtByMaster.pipingClass, 'pipingClass'),
    mappingSemanticHash: semanticHash(pipingClass.fieldMap ?? {}),
    records: pipingClassRecords(pipingClass.normalizedRows),
    metadata: sourceMetadata(pipingClass),
  });

  // The live Line List has no governed schedule column. Therefore schedule is
  // intentionally NOT part of the exact key. If class+bore identifies multiple
  // schedule rows, the existing resolver returns BLOCKED_AMBIGUOUS rather than
  // picking a schedule. This is the conservative engineering behavior.
  const pipingClassResolution = createCommonEnrichedPipingClassResolution({
    schema: COMMON_ENRICHED_PIPING_CLASS_RESOLUTION_SCHEMA,
    resolutionId: resolutionId(
      'PIPING_CLASS',
      lineListResolution.semanticHash,
      pipingClassSnapshot.semanticHash,
    ),
    lineListResolution,
    snapshot: pipingClassSnapshot,
    keyConfig: {
      schema: COMMON_ENRICHED_PIPING_CLASS_KEY_CONFIG_SCHEMA,
      targetClassField: 'piping.pipingClassCode',
      targetBoreField: 'piping.nominalBoreMm',
      targetScheduleField: null,
      sourceClassField: 'pipingClass',
      sourceBoreField: 'nominalBoreMm',
      sourceScheduleField: null,
    },
    bindings: PIPING_BINDINGS,
  });

  const materialAuthority = materialMap === null
    ? { snapshot: null, resolution: null }
    : buildMaterialAuthority({
      materialMap,
      pipingClassResolution,
      capturedAt: capturedAtByMaster.materialMap,
    });

  const projection = {
    schema: LFEA_PREFLIGHT_PHASE1_MASTER_AUTHORITY_SCHEMA,
    inventorySemanticHash: inventory.semanticHash,
    lineListSnapshotSemanticHash: lineListSnapshot.semanticHash,
    lineListResolutionSemanticHash: lineListResolution.semanticHash,
    pipingClassSnapshotSemanticHash: pipingClassSnapshot.semanticHash,
    pipingClassResolutionSemanticHash: pipingClassResolution.semanticHash,
    materialSnapshotSemanticHash: materialAuthority.snapshot?.semanticHash ?? null,
    materialResolutionSemanticHash: materialAuthority.resolution?.semanticHash ?? null,
    availableFieldIds: LFEA_PREFLIGHT_MASTER_AUTHORITY_FIELDS,
    unavailableFieldIds: LFEA_PREFLIGHT_MASTER_AUTHORITY_UNAVAILABLE_FIELDS,
  };

  return Object.freeze({
    ...projection,
    inventory,
    snapshots: Object.freeze({
      lineList: lineListSnapshot,
      pipingClass: pipingClassSnapshot,
      materialMap: materialAuthority.snapshot,
    }),
    resolutions: Object.freeze({
      lineList: lineListResolution,
      pipingClass: pipingClassResolution,
      materialMap: materialAuthority.resolution,
    }),
    semanticHash: semanticHash(projection),
  });
}

function buildMaterialAuthority({ materialMap, pipingClassResolution, capturedAt }) {
  const sourceHash = requireSourceHash(materialMap.sourceHash, 'materialMap');
  const snapshot = createEngineeringMasterSnapshot({
    schema: ENGINEERING_MASTER_SNAPSHOT_SCHEMA,
    snapshotId: snapshotId('MATERIAL_REGISTER', sourceHash),
    sourceKind: 'MATERIAL_REGISTER',
    sourceKey: 'materialMap',
    sourceHash,
    capturedAt: requireCapture(capturedAt, 'materialMap'),
    mappingSemanticHash: semanticHash(materialMap.fieldMap ?? {}),
    records: materialMapRecords(materialMap.normalizedRows),
    metadata: sourceMetadata(materialMap),
  });
  const resolution = createCommonEnrichedMaterialResolution({
    schema: COMMON_ENRICHED_MATERIAL_RESOLUTION_SCHEMA,
    resolutionId: resolutionId('MATERIAL', pipingClassResolution.semanticHash, snapshot.semanticHash),
    pipingClassResolution,
    snapshot,
    keyConfig: {
      schema: COMMON_ENRICHED_MATERIAL_KEY_CONFIG_SCHEMA,
      targetMaterialCodeField: 'material.materialName',
      sourceMaterialCodeField: 'materialName',
    },
    bindings: MATERIAL_BINDINGS,
  });
  return { snapshot, resolution };
}

function lineListRecords(rows) {
  return rows.map((row, ordinal) => masterRecord('LINE_LIST', row, ordinal, {
    lineKey: textValue(row.lineKey ?? row.lineNoKey),
    pipingClass: textValue(row.pipingClass),
    nominalBoreMm: numericRepresentation(row.convertedBore),
  }));
}

function pipingClassRecords(rows) {
  return rows.map((row, ordinal) => masterRecord('PIPING_CLASS', row, ordinal, {
    pipingClass: textValue(row.pipingClass),
    nominalBoreMm: numericRepresentation(row.convertedBore),
    nps: numericRepresentation(row.nps),
    schedule: textValue(row.schedule),
    wallThicknessMm: numericRepresentation(row.wallThickness),
    corrosionAllowanceMm: numericRepresentation(row.corrosion),
    materialName: textValue(row.materialName),
  }));
}

function materialMapRecords(rows) {
  // The current normalized materialMap authority contains code/material/spec
  // only. Extra ad-hoc properties on a row are intentionally ignored here.
  return rows.map((row, ordinal) => masterRecord('MATERIAL', row, ordinal, {
    materialName: textValue(row.material),
    materialCode: textValue(row.code),
    spec: textValue(row.spec),
  }));
}

function masterRecord(kind, row, ordinal, values) {
  const sourceRow = Number.isSafeInteger(row?._sourceRowNumber)
    ? row._sourceRowNumber
    : Number.isSafeInteger(row?._sourceRowIndex)
      ? row._sourceRowIndex + 1
      : ordinal + 1;
  const locatorSheet = textValue(row?._sourceSheet) ?? kind;
  return {
    schema: ENGINEERING_MASTER_RECORD_SCHEMA,
    recordId: `${kind}:${String(ordinal).padStart(8, '0')}`,
    locator: `${locatorSheet}!${sourceRow}`,
    values,
  };
}

function requireMaster(masterData, key, required) {
  const master = masterData?.[key];
  if (!master || !Array.isArray(master.normalizedRows) || master.normalizedRows.length === 0) {
    if (!required) return null;
    throw authorityError(
      'E_P06_MASTER_NOT_LOADED',
      `Phase-1 ${key} exact authority requires loaded normalized rows.`,
      { masterKey: key },
    );
  }
  return master;
}

function requireSourceHash(value, key) {
  const hash = String(value ?? '').trim();
  if (!/^(?:[0-9a-f]{64}|sha256:[0-9a-f]{64}|fnv1a64:[0-9a-f]{16})$/u.test(hash)) {
    throw authorityError(
      'E_P06_MASTER_SOURCE_HASH_REQUIRED',
      `Phase-1 ${key} master requires a governed source digest.`,
      { masterKey: key },
    );
  }
  return hash;
}

function requireCapture(value, key) {
  const text = String(value ?? '').trim();
  const millis = Date.parse(text);
  if (!text || !Number.isFinite(millis) || new Date(millis).toISOString() !== text) {
    throw authorityError(
      'E_P06_MASTER_CAPTURE_TIME_REQUIRED',
      `Phase-1 ${key} master requires an explicit canonical UTC capture timestamp.`,
      { masterKey: key },
    );
  }
  return text;
}

function sourceMetadata(master) {
  return {
    byteLength: Number.isSafeInteger(master.byteLength) ? master.byteLength : null,
    fileName: textValue(master.fileName),
    sheetName: textValue(master.sheetName),
  };
}

function numericRepresentation(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? normalizeNegativeZero(value) : String(value);
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? normalizeNegativeZero(parsed) : text;
}

function textValue(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeNegativeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function snapshotId(kind, sourceHash) {
  return `P06-${kind}-${semanticHash({ sourceHash }).slice('fnv1a64:'.length).toUpperCase()}`;
}

function resolutionId(kind, upstreamHash, snapshotHash) {
  return `P06-${kind}-${semanticHash({ upstreamHash, snapshotHash }).slice('fnv1a64:'.length).toUpperCase()}`;
}

function lineBinding(targetField, sourceField, unit, valueKind) {
  return {
    schema: COMMON_ENRICHED_LINE_LIST_FIELD_BINDING_SCHEMA,
    targetField,
    sourceField,
    unit,
    valueKind,
  };
}

function pipingBinding(targetField, sourceField, unit, valueKind) {
  return {
    schema: COMMON_ENRICHED_PIPING_CLASS_FIELD_BINDING_SCHEMA,
    targetField,
    sourceField,
    unit,
    valueKind,
  };
}

function materialBinding(targetField, sourceField, unit, valueKind) {
  return {
    schema: COMMON_ENRICHED_MATERIAL_FIELD_BINDING_SCHEMA,
    targetField,
    sourceField,
    unit,
    valueKind,
  };
}

function byTargetField(left, right) {
  return left.targetField < right.targetField ? -1 : left.targetField > right.targetField ? 1 : 0;
}

function requireRecord(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw authorityError('E_P06_MASTER_AUTHORITY_INPUT_INVALID', `${field} must be a record.`, { field });
  }
  return value;
}

function authorityError(code, message, details) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_MASTER_AUTHORITY';
  error.details = details;
  return error;
}
