import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { projectPreflightModel } from './lfea-preflight-resolution.js';
import {
  LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from './lfea-preflight-phase1-schema.js';
import {
  LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
  buildLfeaPreflightPhase1Index,
  createLfeaPreflightPhase1TargetId,
} from './lfea-preflight-phase1-index.js';
import {
  buildLfeaPreflightPhase1ComponentIndex,
  getLfeaPreflightPhase1ComponentParentLineTargetId,
  getLfeaPreflightPhase1ComponentSourceOrdinal,
} from './lfea-preflight-phase1-component-index.js';

export const LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA = 'lfea-preflight-phase1-review-source/v2';

const SOURCE_STATE = new WeakMap();

// Only fields already present as explicit normalized Line List evidence belong
// here. Engineering concepts are intentionally not cross-filled: design
// pressure never borrows hydro-test pressure, and operating density never
// borrows mixed density.
const MASTER_FIELDS = Object.freeze({
  'process.designPressureKpaG': 'designPressure',
  'process.hydroTestPressureKpaG': 'hydroTestPressure',
  'process.designTemperatureC': 'designTemperature',
  'process.operatingTemperatureC': 'operatingTemperature',
  'process.minimumTemperatureC': 'minimumTemperature',
  'process.phaseCode': 'phase',
  'material.materialCode': 'materialCode',
  'contents.operatingDensityKgM3': 'operatingDensity',
  'contents.gasDensityKgM3': 'gasDensity',
  'contents.liquidDensityKgM3': 'liquidDensity',
  'contents.mixedDensityKgM3': 'mixedDensity',
  'insulation.thicknessMm': 'insulationThickness',
});

const SOURCE_FIELDS = Object.freeze({
  'piping.nominalBoreMm': 'bore',
});

const DUAL_CODE_FIELDS = Object.freeze({
  'piping.pipingClassCode': Object.freeze({
    sourceProperty: 'sourcePipingClass',
    masterProperty: 'masterPipingClass',
  }),
  'piping.ratingClassCode': Object.freeze({
    sourceProperty: 'sourceRating',
    masterProperty: 'masterRating',
  }),
});

const WALL_THICKNESS_FIELD = 'piping.wallThicknessMm';

export const LFEA_PREFLIGHT_PHASE1_REVIEW_PROVIDERS = Object.freeze({
  getLine: getLfeaPreflightPhase1ReviewLine,
  getCell: getLfeaPreflightPhase1ReviewCell,
  getComponent: getLfeaPreflightPhase1ReviewComponent,
});

/**
 * Adapt the current read-only pre-flight projection into indexed Phase-1 state.
 * Engineering cell DTOs and component DTOs are lazy; the retained large-model
 * state is typed status columns, stable indexes, compact line records and source
 * item references. No shared-model/master-data/event-bus/solver mutation path
 * is introduced.
 */
export function createLfeaPreflightPhase1ReviewSource(model, lineRows = []) {
  const projection = projectPreflightModel(model, lineRows);
  if (projection.blocked) {
    const blocked = Object.freeze({
      schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA,
      blocked: true,
      reason: projection.blocked,
      projection,
      datasetIdentity: null,
      targetCount: 0,
      componentCount: 0,
      columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
      engineeringEvidenceHash: null,
      structuralHash: null,
    });
    SOURCE_STATE.set(blocked, { lineByTargetId: new Map(), componentItems: [] });
    return blocked;
  }

  // Dataset identity remains source-stable. Master enrichment values are kept
  // out of target identity so a reviewed target does not become a different
  // target merely because master evidence changes.
  const stableGroups = projection.groups.map(stableGroupIdentity).sort(compareStableGroups);
  const datasetIdentity = semanticHash({
    schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA,
    source: 'SHARED_MODEL_PLUS_MASTER_LINE_LIST_READ_ONLY_PROJECTION',
    groups: stableGroups,
  });
  const lineCount = projection.groups.length;
  const targetIdByOrdinal = new Array(lineCount);
  const normalizedKeyByOrdinal = new Array(lineCount);
  const serviceByOrdinal = new Array(lineCount);
  const ratingByOrdinal = new Array(lineCount);
  const classByOrdinal = new Array(lineCount);
  const engineeringStatusByField = Object.fromEntries(
    LFEA_PREFLIGHT_ENGINEERING_FIELDS.map((fieldId) => [fieldId, new Uint8Array(lineCount)]),
  );
  const lineByTargetId = new Map();
  const engineeringEvidenceRows = [];
  const componentTargetIds = [];
  const parentLineTargetIds = [];
  const componentParentLineOrdinal = [];
  const componentItems = [];

  for (let lineOrdinal = 0; lineOrdinal < projection.groups.length; lineOrdinal += 1) {
    const group = projection.groups[lineOrdinal];
    const memberIds = stableMemberIds(group);
    const provenancePath = lineProvenancePath(group, memberIds);
    const targetId = createLfeaPreflightPhase1TargetId({
      sourceModelId: datasetIdentity,
      sourceEntityId: semanticHash({ fullLineKeyName: group.fullLineKeyName, memberIds }),
      targetKind: 'LINE',
      provenancePath,
    });
    targetIdByOrdinal[lineOrdinal] = targetId;
    normalizedKeyByOrdinal[lineOrdinal] = group.isolatedLineKeyToken;
    serviceByOrdinal[lineOrdinal] = group.service ?? 'UNSPECIFIED';
    ratingByOrdinal[lineOrdinal] = group.rating ?? 'UNSPECIFIED';
    classByOrdinal[lineOrdinal] = group.cls ?? 'UNSPECIFIED';

    const statuses = new Uint8Array(LFEA_PREFLIGHT_ENGINEERING_FIELDS.length);
    for (let fieldOrdinal = 0; fieldOrdinal < LFEA_PREFLIGHT_ENGINEERING_FIELDS.length; fieldOrdinal += 1) {
      const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
      const status = fieldStatus(group, fieldId);
      statuses[fieldOrdinal] = status;
      engineeringStatusByField[fieldId][lineOrdinal] = status;
    }

    const lineRecord = Object.freeze({
      targetId,
      fullLineKeyName: group.fullLineKeyName,
      isolatedLineKeyToken: group.isolatedLineKeyToken,
      service: group.service,
      rating: group.rating,
      pipingClass: group.cls,
      cls: group.cls,
      bore: group.bore,
      sourcePipingClass: group.sourcePipingClass,
      sourceRating: group.sourceRating,
      masterPipingClass: group.masterPipingClass,
      masterRating: group.masterRating,
      masterRowHash: group.masterRowHash,
      candidateCount: group.candidateCount,
      designPressure: group.designPressure,
      hydroTestPressure: group.hydroTestPressure,
      designTemperature: group.designTemperature,
      operatingTemperature: group.operatingTemperature,
      minimumTemperature: group.minimumTemperature,
      phase: group.phase,
      materialCode: group.materialCode,
      operatingDensity: group.operatingDensity,
      gasDensity: group.gasDensity,
      liquidDensity: group.liquidDensity,
      mixedDensity: group.mixedDensity,
      insulationThickness: group.insulationThickness,
      wallThickness: group.wallThickness,
      wallThicknessConflict: group.wallThicknessConflict,
      wallThicknessCandidates: Object.freeze([...(group.wallThicknessCandidates ?? [])]),
      metalDensity: group.metalDensity,
      itemCount: group.items.length,
      resolution: Object.freeze(structuredClone(group.resolution)),
      provenancePath,
      sourceMemberIds: Object.freeze(memberIds),
      readiness: readinessFromStatuses(statuses),
    });
    lineByTargetId.set(targetId, lineRecord);
    engineeringEvidenceRows.push(Object.freeze({
      targetId,
      masterRowHash: group.masterRowHash,
      wallThicknessCandidates: lineRecord.wallThicknessCandidates,
    }));

    const stableItems = [...group.items].sort(compareItems);
    for (const item of stableItems) {
      const componentProvenance = `${provenancePath}/COMPONENT/${escapePath(item.id)}/${escapePath(item.itemType)}/${escapePath(item.itemName)}`;
      const componentTargetId = createLfeaPreflightPhase1TargetId({
        sourceModelId: datasetIdentity,
        sourceEntityId: requireIdentityText(item.id, 'component.id'),
        targetKind: 'COMPONENT',
        provenancePath: componentProvenance,
      });
      componentTargetIds.push(componentTargetId);
      parentLineTargetIds.push(targetId);
      componentParentLineOrdinal.push(lineOrdinal);
      componentItems.push(item);
    }
  }

  const snapshot = {
    schema: LFEA_PREFLIGHT_PHASE1_SNAPSHOT_SCHEMA,
    datasetIdentity,
    lines: {
      targetIdByOrdinal,
      normalizedKeyByOrdinal,
      serviceByOrdinal,
      ratingByOrdinal,
      classByOrdinal,
      engineeringStatusByField,
    },
    components: {
      count: componentTargetIds.length,
      parentLineOrdinal: Uint32Array.from(componentParentLineOrdinal),
    },
    deferredTargetIds: [],
  };
  const lineIndex = buildLfeaPreflightPhase1Index(snapshot);
  const componentIndex = buildLfeaPreflightPhase1ComponentIndex(lineIndex, {
    targetIdByOrdinal: componentTargetIds,
    parentLineTargetIdByOrdinal: parentLineTargetIds,
  });
  const engineeringEvidenceHash = semanticHash({
    lines: [...engineeringEvidenceRows].sort((left, right) => compareAscii(left.targetId, right.targetId)),
  });
  const structuralHash = semanticHash({
    datasetIdentity,
    engineeringEvidenceHash,
    lineIndex: lineIndex.structuralHash,
    componentIndex: componentIndex.structuralHash,
    columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
  });
  const source = Object.freeze({
    schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA,
    blocked: false,
    reason: null,
    projection,
    datasetIdentity,
    targetCount: lineIndex.targetCount,
    componentCount: componentIndex.componentCount,
    columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
    engineeringEvidenceHash,
    lineIndex,
    componentIndex,
    structuralHash,
  });
  SOURCE_STATE.set(source, { lineByTargetId, componentItems });
  return source;
}

export function getLfeaPreflightPhase1ReviewLine(source, targetId) {
  const state = requireSource(source);
  return state.lineByTargetId.get(String(targetId)) ?? null;
}

export function getLfeaPreflightPhase1ReviewCell(source, targetId, fieldOrdinal) {
  const line = getLfeaPreflightPhase1ReviewLine(source, targetId);
  if (line === null) return null;
  if (!Number.isSafeInteger(fieldOrdinal) || fieldOrdinal < 0 || fieldOrdinal >= LFEA_PREFLIGHT_ENGINEERING_FIELDS.length) {
    throw sourceError('E_P06_FIELD_ORDINAL_INVALID', `Phase-1 field ordinal is invalid: ${fieldOrdinal}`);
  }
  const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];

  if (fieldId in DUAL_CODE_FIELDS) {
    return dualCodeCell(source, line, fieldId, fieldOrdinal, DUAL_CODE_FIELDS[fieldId]);
  }
  if (fieldId === WALL_THICKNESS_FIELD) {
    return wallThicknessCell(source, line, fieldId, fieldOrdinal);
  }
  if (fieldId in SOURCE_FIELDS) {
    const property = SOURCE_FIELDS[fieldId];
    const value = normalizeCellValue(line[property]);
    return sealCell({
      fieldId,
      fieldOrdinal,
      value,
      status: value === null ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      sourceKind: 'SHARED_MODEL',
      sourceHash: source.datasetIdentity,
      locator: line.provenancePath,
      method: 'SOURCE_MODEL_PROJECTION',
      candidateCount: value === null ? 0 : 1,
    });
  }
  if (fieldId in MASTER_FIELDS) {
    const property = MASTER_FIELDS[fieldId];
    const value = line.resolution.status === 'EXACT' ? normalizeCellValue(line[property]) : null;
    return sealCell({
      fieldId,
      fieldOrdinal,
      value,
      status: masterStatus(line.resolution, value),
      sourceKind: 'MASTER_LINE_LIST',
      sourceHash: line.masterRowHash,
      locator: `MASTER_LINE_LIST:${line.isolatedLineKeyToken}`,
      method: masterMethod(line.resolution),
      candidateCount: line.candidateCount,
    });
  }
  return sealCell({
    fieldId,
    fieldOrdinal,
    value: null,
    status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
    sourceKind: 'UNRESOLVED',
    sourceHash: null,
    locator: line.provenancePath,
    method: 'NOT_YET_PROJECTED_BY_CURRENT_READ_ONLY_PREFLIGHT',
    candidateCount: 0,
  });
}

export function getLfeaPreflightPhase1ReviewComponent(source, targetId) {
  const state = requireSource(source);
  const sourceOrdinal = getLfeaPreflightPhase1ComponentSourceOrdinal(source.componentIndex, targetId);
  if (sourceOrdinal === null) return null;
  const item = state.componentItems[sourceOrdinal] ?? null;
  if (item === null) {
    throw sourceError('E_P06_COMPONENT_SOURCE_STALE', `Component source ordinal is stale: ${targetId}`);
  }
  const parentLineTargetId = getLfeaPreflightPhase1ComponentParentLineTargetId(
    source.componentIndex,
    source.lineIndex,
    targetId,
  );
  const parentLine = getLfeaPreflightPhase1ReviewLine(source, parentLineTargetId);
  if (parentLine === null) {
    throw sourceError('E_P06_COMPONENT_PARENT_STALE', `Component parent line is stale: ${targetId}`);
  }
  const provenancePath = `${parentLine.provenancePath}/COMPONENT/${escapePath(item.id)}/${escapePath(item.itemType)}/${escapePath(item.itemName)}`;
  return Object.freeze({
    targetId: String(targetId),
    parentLineTargetId,
    sourceEntityId: String(item.id),
    name: item.itemName,
    type: item.itemType,
    bore: item.bore,
    provenancePath,
    sourceHash: semanticHash({ datasetIdentity: source.datasetIdentity, item: stableItemIdentity(item) }),
  });
}

function dualCodeCell(source, line, fieldId, fieldOrdinal, config) {
  const sourceValue = normalizeCodeValue(line[config.sourceProperty]);
  const masterValue = line.resolution.status === 'EXACT'
    ? normalizeCodeValue(line[config.masterProperty])
    : null;
  if (sourceValue !== null && masterValue !== null && !sameCode(sourceValue, masterValue)) {
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: null,
      status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
      sourceKind: 'SHARED_MODEL+MASTER_LINE_LIST',
      sourceHash: combinedSourceHash(source, line),
      locator: `${line.provenancePath} | MASTER_LINE_LIST:${line.isolatedLineKeyToken}`,
      method: 'SOURCE_MASTER_CONFLICT',
      candidateCount: 2,
    });
  }
  if (sourceValue !== null && masterValue !== null) {
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: sourceValue,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      sourceKind: 'SHARED_MODEL+MASTER_LINE_LIST',
      sourceHash: combinedSourceHash(source, line),
      locator: `${line.provenancePath} | MASTER_LINE_LIST:${line.isolatedLineKeyToken}`,
      method: 'EXACT_SOURCE_MASTER_AGREEMENT',
      candidateCount: 2,
    });
  }
  if (sourceValue !== null) {
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: sourceValue,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      sourceKind: 'SHARED_MODEL',
      sourceHash: source.datasetIdentity,
      locator: line.provenancePath,
      method: line.resolution.status === 'BLOCKED_AMBIGUOUS'
        ? 'SOURCE_MODEL_EXPLICIT; MASTER_LINE_LIST_AMBIGUOUS_NOT_SELECTED'
        : 'SOURCE_MODEL_EXPLICIT',
      candidateCount: 1,
    });
  }
  if (masterValue !== null) {
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: masterValue,
      status: LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
      sourceKind: 'MASTER_LINE_LIST',
      sourceHash: line.masterRowHash,
      locator: `MASTER_LINE_LIST:${line.isolatedLineKeyToken}`,
      method: 'EXACT_NORMALIZED_LINE_KEY',
      candidateCount: line.candidateCount,
    });
  }
  return sealCell({
    fieldId,
    fieldOrdinal,
    value: null,
    status: masterStatus(line.resolution, null),
    sourceKind: line.resolution.status === 'BLOCKED_AMBIGUOUS' ? 'MASTER_LINE_LIST' : 'UNRESOLVED',
    sourceHash: null,
    locator: line.resolution.status === 'BLOCKED_AMBIGUOUS'
      ? `MASTER_LINE_LIST:${line.isolatedLineKeyToken}`
      : line.provenancePath,
    method: masterMethod(line.resolution),
    candidateCount: line.candidateCount,
  });
}

function wallThicknessCell(source, line, fieldId, fieldOrdinal) {
  if (line.wallThicknessConflict) {
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: null,
      status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
      sourceKind: 'SHARED_MODEL',
      sourceHash: source.datasetIdentity,
      locator: line.provenancePath,
      method: 'CONFLICTING_EXPLICIT_SOURCE_WALL_THICKNESSES',
      candidateCount: line.wallThicknessCandidates.length,
    });
  }
  const value = normalizeCellValue(line.wallThickness);
  return sealCell({
    fieldId,
    fieldOrdinal,
    value,
    status: value === null ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
    sourceKind: value === null ? 'UNRESOLVED' : 'SHARED_MODEL',
    sourceHash: value === null ? null : source.datasetIdentity,
    locator: line.provenancePath,
    method: value === null ? 'NO_EXPLICIT_SOURCE_WALL_THICKNESS' : 'AGREED_EXPLICIT_SOURCE_WALL_THICKNESS',
    candidateCount: line.wallThicknessCandidates.length,
  });
}

function fieldStatus(group, fieldId) {
  if (fieldId in DUAL_CODE_FIELDS) return dualCodeStatus(group, DUAL_CODE_FIELDS[fieldId]);
  if (fieldId === WALL_THICKNESS_FIELD) {
    if (group.wallThicknessConflict) return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT;
    return normalizeCellValue(group.wallThickness) === null
      ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
      : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
  }
  if (fieldId in SOURCE_FIELDS) {
    return normalizeCellValue(group[SOURCE_FIELDS[fieldId]]) === null
      ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
      : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
  }
  if (fieldId in MASTER_FIELDS) {
    const value = group.resolution.status === 'EXACT'
      ? normalizeCellValue(group[MASTER_FIELDS[fieldId]])
      : null;
    return masterStatus(group.resolution, value);
  }
  return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING;
}

function dualCodeStatus(group, config) {
  const sourceValue = normalizeCodeValue(group[config.sourceProperty]);
  const masterValue = group.resolution.status === 'EXACT'
    ? normalizeCodeValue(group[config.masterProperty])
    : null;
  if (sourceValue !== null && masterValue !== null && !sameCode(sourceValue, masterValue)) {
    return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT;
  }
  if (sourceValue !== null || masterValue !== null) return LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
  return masterStatus(group.resolution, null);
}

function masterStatus(resolution, value) {
  if (resolution.status === 'BLOCKED_AMBIGUOUS') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS;
  if (resolution.status === 'BLOCKED_MISSING') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING;
  return value === null
    ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
}

function masterMethod(resolution) {
  if (resolution.status === 'EXACT') return 'EXACT_NORMALIZED_LINE_KEY';
  if (resolution.status === 'BLOCKED_AMBIGUOUS') return 'DUPLICATE_PRESERVING_KEY_BUCKET';
  return 'NO_MASTER_ROW_MATCH';
}

function combinedSourceHash(source, line) {
  return semanticHash({
    sharedModel: source.datasetIdentity,
    masterLineRow: line.masterRowHash,
  });
}

function sealCell(input) {
  if (input.status >= LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    && input.status <= LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE
    && input.value !== null) {
    throw sourceError('E_P06_BLOCKED_VALUE_NON_NULL', `Blocked Phase-1 field ${input.fieldId} must retain null value.`);
  }
  return Object.freeze({
    fieldId: input.fieldId,
    fieldOrdinal: input.fieldOrdinal,
    value: input.value,
    status: input.status,
    statusText: statusText(input.status),
    sourceKind: input.sourceKind,
    sourceHash: input.sourceHash,
    locator: input.locator,
    method: input.method,
    candidateCount: input.candidateCount,
  });
}

function readinessFromStatuses(statuses) {
  const order = [
    LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_CONFLICT,
    LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS,
    LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
    LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE,
    LFEA_PREFLIGHT_FIELD_STATUS.PROPOSED_REVIEW,
    LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_DERIVED,
    LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
    LFEA_PREFLIGHT_FIELD_STATUS.NOT_APPLICABLE,
  ];
  for (const candidate of order) {
    if (statuses.includes(candidate)) return statusText(candidate);
  }
  return 'NOT_APPLICABLE';
}

function statusText(status) {
  for (const [name, value] of Object.entries(LFEA_PREFLIGHT_FIELD_STATUS)) {
    if (value === status) return name;
  }
  throw sourceError('E_P06_FIELD_STATUS_INVALID', `Unknown Phase-1 field status: ${status}`);
}

function stableGroupIdentity(group) {
  return {
    fullLineKeyName: group.fullLineKeyName,
    isolatedLineKeyToken: group.isolatedLineKeyToken,
    service: group.service,
    rating: group.rating,
    pipingClass: group.cls,
    bore: group.bore,
    members: stableMemberIds(group),
  };
}

function stableMemberIds(group) {
  return Object.freeze([...new Set(group.items.map((item) => requireIdentityText(item.id, 'item.id')))].sort(compareAscii));
}

function stableItemIdentity(item) {
  return {
    id: requireIdentityText(item.id, 'item.id'),
    name: item.itemName,
    type: item.itemType,
    bore: item.bore,
  };
}

function lineProvenancePath(group, memberIds) {
  return `/SHARED_MODEL/LINE/${escapePath(group.fullLineKeyName)}/${semanticHash({ memberIds }).slice('fnv1a64:'.length)}`;
}

function compareStableGroups(left, right) {
  return compareAscii(left.fullLineKeyName, right.fullLineKeyName)
    || compareAscii(left.isolatedLineKeyToken, right.isolatedLineKeyToken)
    || compareAscii(left.members.join('\u0000'), right.members.join('\u0000'));
}

function compareItems(left, right) {
  return compareAscii(left.id, right.id)
    || compareAscii(left.itemType, right.itemType)
    || compareAscii(left.itemName, right.itemName);
}

function normalizeCellValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeCodeValue(value) {
  const normalized = normalizeCellValue(value);
  return normalized === null ? null : String(normalized);
}

function sameCode(left, right) {
  return left.trim().toUpperCase() === right.trim().toUpperCase();
}

function requireIdentityText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw sourceError('E_P06_SOURCE_IDENTITY_MISSING', `${field} must be a non-empty stable source identity.`);
  return text;
}

function escapePath(value) {
  return encodeURIComponent(String(value ?? ''));
}

function compareAscii(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function requireSource(source) {
  const state = SOURCE_STATE.get(source);
  if (!state) throw sourceError('E_P06_REVIEW_SOURCE_REQUIRED', 'A Phase-1 production review source is required.');
  return state;
}

function sourceError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE';
  return error;
}
