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
  getLfeaPreflightPhase1ComponentSourceOrdinal,
} from './lfea-preflight-phase1-component-index.js';

export const LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA = 'lfea-preflight-phase1-review-source/v1';

const SOURCE_STATE = new WeakMap();
const MASTER_FIELDS = Object.freeze({
  'process.designPressureKpaG': 'p1',
  'process.designTemperatureC': 't1',
  'process.operatingTemperatureC': 't2',
  'process.minimumTemperatureC': 't3',
  'process.phaseCode': 'phase',
  'contents.operatingDensityKgM3': 'fluidDensity',
  'material.densityKgM3': 'metalDensity',
});
const SOURCE_FIELDS = Object.freeze({
  'piping.pipingClassCode': 'cls',
  'piping.ratingClassCode': 'rating',
  'piping.nominalBoreMm': 'bore',
});

/**
 * Convert the existing read-only Phase-0 projection into the production Phase-1
 * indexed review source. No Project Data, master-data, event-bus, solver, or
 * shared-model mutation authority is introduced.
 */
export function createLfeaPreflightPhase1ReviewSource(model, lineRows = []) {
  const projection = projectPreflightModel(model, lineRows);
  if (projection.blocked) {
    const blocked = Object.freeze({
      schema: LFEA_PREFLIGHT_PHASE1_REVIEW_SOURCE_SCHEMA,
      blocked: true,
      reason: projection.reason,
      projection,
      datasetIdentity: null,
      targetCount: 0,
      componentCount: 0,
      columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
      structuralHash: null,
    });
    SOURCE_STATE.set(blocked, { lineByTargetId: new Map(), componentByTargetId: new Map() });
    return blocked;
  }

  const stableGroups = [...projection.groups].map(stableGroupIdentity).sort(compareStableGroups);
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
  const componentTargetIds = [];
  const parentLineTargetIds = [];
  const componentParentLineOrdinal = [];
  const componentByTargetId = new Map();

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

    const cells = buildCells(group, datasetIdentity, provenancePath);
    for (let fieldOrdinal = 0; fieldOrdinal < cells.length; fieldOrdinal += 1) {
      engineeringStatusByField[LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal]][lineOrdinal] = cells[fieldOrdinal].status;
    }
    lineByTargetId.set(targetId, Object.freeze({
      targetId,
      fullLineKeyName: group.fullLineKeyName,
      isolatedLineKeyToken: group.isolatedLineKeyToken,
      service: group.service,
      rating: group.rating,
      pipingClass: group.cls,
      bore: group.bore,
      itemCount: group.items.length,
      resolution: Object.freeze(structuredClone(group.resolution)),
      provenancePath,
      sourceMemberIds: Object.freeze(memberIds),
      cells: Object.freeze(cells),
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
      componentByTargetId.set(componentTargetId, Object.freeze({
        targetId: componentTargetId,
        parentLineTargetId: targetId,
        sourceEntityId: String(item.id),
        name: item.itemName,
        type: item.itemType,
        bore: item.bore,
        provenancePath: componentProvenance,
        sourceHash: semanticHash({ datasetIdentity, item: stableItemIdentity(item) }),
      }));
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
  const structuralHash = semanticHash({
    datasetIdentity,
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
    lineIndex,
    componentIndex,
    structuralHash,
  });
  SOURCE_STATE.set(source, { lineByTargetId, componentByTargetId });
  return source;
}

export function getLfeaPreflightPhase1LineRecord(source, targetId) {
  const state = requireSource(source);
  return state.lineByTargetId.get(String(targetId)) ?? null;
}

export function getLfeaPreflightPhase1Cell(source, targetId, fieldOrdinal) {
  const line = getLfeaPreflightPhase1LineRecord(source, targetId);
  if (line === null) return null;
  if (!Number.isSafeInteger(fieldOrdinal) || fieldOrdinal < 0 || fieldOrdinal >= LFEA_PREFLIGHT_ENGINEERING_FIELDS.length) {
    throw adapterError('E_P06_FIELD_ORDINAL_INVALID', `Phase-1 field ordinal is invalid: ${fieldOrdinal}`);
  }
  return line.cells[fieldOrdinal];
}

export function getLfeaPreflightPhase1ComponentRecord(source, targetId) {
  const state = requireSource(source);
  return state.componentByTargetId.get(String(targetId)) ?? null;
}

export function getLfeaPreflightPhase1ComponentRecordByIndexedOrdinal(source, targetId) {
  const ordinal = getLfeaPreflightPhase1ComponentSourceOrdinal(source.componentIndex, targetId);
  if (ordinal === null) return null;
  return getLfeaPreflightPhase1ComponentRecord(source, targetId);
}

function buildCells(group, datasetIdentity, provenancePath) {
  const rowHash = group.resolution.selected
    ? semanticHash({ lineKey: group.isolatedLineKeyToken, selected: group.resolution.selected })
    : null;
  return LFEA_PREFLIGHT_ENGINEERING_FIELDS.map((fieldId, fieldOrdinal) => {
    if (fieldId in SOURCE_FIELDS) {
      const property = SOURCE_FIELDS[fieldId];
      const value = normalizeCellValue(group[property]);
      return sealCell({
        fieldId,
        fieldOrdinal,
        value,
        status: value === null ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT,
        sourceKind: 'SHARED_MODEL',
        sourceHash: datasetIdentity,
        locator: provenancePath,
        method: 'SOURCE_MODEL_PROJECTION',
        candidateCount: 1,
      });
    }
    if (fieldId in MASTER_FIELDS) {
      const property = MASTER_FIELDS[fieldId];
      const value = group.resolution.status === 'EXACT'
        ? normalizeCellValue(group[property])
        : null;
      const status = masterStatus(group.resolution, value);
      return sealCell({
        fieldId,
        fieldOrdinal,
        value,
        status,
        sourceKind: 'MASTER_LINE_LIST',
        sourceHash: rowHash,
        locator: `MASTER_LINE_LIST:${group.isolatedLineKeyToken}`,
        method: group.resolution.status === 'EXACT'
          ? 'EXACT_NORMALIZED_LINE_KEY'
          : group.resolution.status === 'BLOCKED_AMBIGUOUS'
            ? 'DUPLICATE_PRESERVING_KEY_BUCKET'
            : 'NO_MASTER_ROW_MATCH',
        candidateCount: group.resolution.candidateCount ?? 0,
      });
    }
    return sealCell({
      fieldId,
      fieldOrdinal,
      value: null,
      status: LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING,
      sourceKind: 'UNRESOLVED',
      sourceHash: null,
      locator: provenancePath,
      method: 'NOT_YET_PROJECTED_BY_CURRENT_READ_ONLY_PREFLIGHT',
      candidateCount: 0,
    });
  });
}

function sealCell(input) {
  if (input.status >= LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    && input.status <= LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_STALE_SOURCE
    && input.value !== null) {
    throw adapterError('E_P06_BLOCKED_VALUE_NON_NULL', `Blocked Phase-1 field ${input.fieldId} must retain null value.`);
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

function masterStatus(resolution, value) {
  if (resolution.status === 'BLOCKED_AMBIGUOUS') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS;
  if (resolution.status === 'BLOCKED_MISSING') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING;
  return value === null
    ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
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
  return String(value);
}

function statusText(status) {
  for (const [name, value] of Object.entries(LFEA_PREFLIGHT_FIELD_STATUS)) {
    if (value === status) return name;
  }
  throw adapterError('E_P06_FIELD_STATUS_INVALID', `Unknown Phase-1 field status: ${status}`);
}

function requireIdentityText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw adapterError('E_P06_SOURCE_IDENTITY_MISSING', `${field} must be a non-empty stable source identity.`);
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
  if (!state) throw adapterError('E_P06_REVIEW_SOURCE_REQUIRED', 'A Phase-1 production review source is required.');
  return state;
}

function adapterError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_ADAPTER';
  return error;
}
