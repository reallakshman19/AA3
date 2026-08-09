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
      reason: projection.reason,
      projection,
      datasetIdentity: null,
      targetCount: 0,
      componentCount: 0,
      columnSchemaHash: LFEA_PREFLIGHT_COLUMN_SCHEMA_HASH,
      structuralHash: null,
    });
    SOURCE_STATE.set(blocked, { lineByTargetId: new Map(), componentItems: [] });
    return blocked;
  }

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

    const rowHash = group.resolution.selected
      ? semanticHash({ lineKey: group.isolatedLineKeyToken, selected: group.resolution.selected })
      : null;
    const statuses = new Uint8Array(LFEA_PREFLIGHT_ENGINEERING_FIELDS.length);
    for (let fieldOrdinal = 0; fieldOrdinal < LFEA_PREFLIGHT_ENGINEERING_FIELDS.length; fieldOrdinal += 1) {
      const fieldId = LFEA_PREFLIGHT_ENGINEERING_FIELDS[fieldOrdinal];
      const status = fieldStatus(group, fieldId);
      statuses[fieldOrdinal] = status;
      engineeringStatusByField[fieldId][lineOrdinal] = status;
    }
    lineByTargetId.set(targetId, Object.freeze({
      targetId,
      fullLineKeyName: group.fullLineKeyName,
      isolatedLineKeyToken: group.isolatedLineKeyToken,
      service: group.service,
      rating: group.rating,
      pipingClass: group.cls,
      cls: group.cls,
      bore: group.bore,
      p1: group.p1,
      t1: group.t1,
      t2: group.t2,
      t3: group.t3,
      phase: group.phase,
      fluidDensity: group.fluidDensity,
      metalDensity: group.metalDensity,
      itemCount: group.items.length,
      resolution: Object.freeze(structuredClone(group.resolution)),
      provenancePath,
      rowHash,
      sourceMemberIds: Object.freeze(memberIds),
      readiness: readinessFromStatuses(statuses),
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
      candidateCount: 1,
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
      sourceHash: line.rowHash,
      locator: `MASTER_LINE_LIST:${line.isolatedLineKeyToken}`,
      method: line.resolution.status === 'EXACT'
        ? 'EXACT_NORMALIZED_LINE_KEY'
        : line.resolution.status === 'BLOCKED_AMBIGUOUS'
          ? 'DUPLICATE_PRESERVING_KEY_BUCKET'
          : 'NO_MASTER_ROW_MATCH',
      candidateCount: line.resolution.candidateCount ?? 0,
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

function fieldStatus(group, fieldId) {
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

function masterStatus(resolution, value) {
  if (resolution.status === 'BLOCKED_AMBIGUOUS') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS;
  if (resolution.status === 'BLOCKED_MISSING') return LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING;
  return value === null
    ? LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING
    : LFEA_PREFLIGHT_FIELD_STATUS.RESOLVED_EXACT;
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
  return String(value);
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
