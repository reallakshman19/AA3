import { deepFreeze, semanticHash, stringValue } from '../../../core/shared-piping-model/index.js';
import {
  normalizeTopologyEditInlineReplacementPayload,
} from '../topology-edit-inline-component-replacement.js';
import {
  normalizeTopologyEditTableNodePositionPayload,
  topologyEditTableNodePositionPriorValue,
} from './topology-edit-table-node-position-contract.js';
import {
  normalizeTopologyEditTableSupportRestraintPayload,
  topologyEditTableSupportRestraintPriorValue,
} from './topology-edit-table-support-restraint-contract.js';
import {
  normalizeTopologyEditTableTeeReducerRelation,
  topologyEditTableTeeReducerPriorValue,
} from './topology-edit-table-tee-reducer-contract.js';
import { assertTopologyEditTableProjection } from './topology-edit-table-projection.js';

export const TOPOLOGY_EDIT_TABLE_INTENT_SCHEMA = 'TopologyEditTableIntent.v1';
export const TOPOLOGY_EDIT_TABLE_AUTHORITY_SCHEMA = 'TopologyEditTableEditAuthority.v1';

const INTENT_KINDS = new Set([
  'PIPE_LENGTH',
  'NODE_POSITION',
  'SUPPORT_RESTRAINT',
  'VALVE_REPLACEMENT',
  'TEE_REDUCER_RELATION',
]);
const ANCHORS = new Set(['FROM', 'TO', 'BOTH']);
const PROPAGATION = new Set(['DOWNSTREAM', 'UPSTREAM', 'FIT_BETWEEN_FIXED']);

export function createTopologyEditTableIntent({
  projection: projectionInput,
  sessionSnapshot,
  canonicalId,
  intentKind,
  requestedValue,
  geometryPolicy,
} = {}) {
  const projection = assertTopologyEditTableProjection(projectionInput);
  const authority = editAuthority(projection, sessionSnapshot);
  const row = exactRow(projection, canonicalId);
  const kind = requiredEnum(intentKind, INTENT_KINDS, 'intentKind');
  const payload = normalizeIntentPayload(kind, requestedValue, geometryPolicy, row, projection);
  const target = {
    rowId: row.rowId,
    canonicalKind: row.identity.canonicalKind,
    canonicalId: row.identity.canonicalId,
    targetRevision: row.targetRevision,
  };
  const material = {
    schema: TOPOLOGY_EDIT_TABLE_INTENT_SCHEMA,
    intentKind: kind,
    authority,
    target,
    priorValue: priorValue(kind, row, payload),
    requestedValue: payload.requestedValue,
    geometryPolicy: payload.geometryPolicy,
  };
  return deepFreeze({ ...material, intentHash: semanticHash(material) });
}

export function assertTopologyEditTableIntent(value) {
  if (value?.schema !== TOPOLOGY_EDIT_TABLE_INTENT_SCHEMA) {
    throw new TypeError(`Table intent must use ${TOPOLOGY_EDIT_TABLE_INTENT_SCHEMA}.`);
  }
  const material = { ...value };
  delete material.intentHash;
  if (semanticHash(material) !== value.intentHash) {
    throw new Error('TopologyEditTableIntent: intent hash mismatch.');
  }
  assertEditAuthority(value.authority);
  requiredEnum(value.intentKind, INTENT_KINDS, 'intentKind');
  return value;
}

export function rebaseTopologyEditTableIntent(intentInput, projectionInput, sessionSnapshot) {
  const intent = assertTopologyEditTableIntent(intentInput);
  const projection = assertTopologyEditTableProjection(projectionInput);
  const row = exactRow(projection, intent.target.canonicalId);
  if (row.targetRevision !== intent.target.targetRevision) {
    throw new Error(`TopologyEditTableIntent: target ${intent.target.canonicalId} changed before rebase.`);
  }
  return createTopologyEditTableIntent({
    projection,
    sessionSnapshot,
    canonicalId: intent.target.canonicalId,
    intentKind: intent.intentKind,
    requestedValue: intent.requestedValue,
    geometryPolicy: intent.geometryPolicy,
  });
}

export function assertTopologyEditTableEditAuthority(value) {
  return assertEditAuthority(value);
}

function editAuthority(projection, snapshot) {
  if (!snapshot?.baseAuthority || !Number.isInteger(snapshot.sessionVersion)) {
    throw new TypeError('TopologyEditTableIntent: certified session snapshot is required.');
  }
  if (snapshot.activeCanonicalTopologyHash !== projection.authority.canonicalTopologyHash) {
    throw new Error('TopologyEditTableIntent: session canonical hash differs from table projection.');
  }
  if (snapshot.baseAuthority.datasetId !== projection.authority.datasetId
    || snapshot.baseAuthority.sourceHash !== projection.authority.sourceHash) {
    throw new Error('TopologyEditTableIntent: session source authority differs from table projection.');
  }
  const material = {
    schema: TOPOLOGY_EDIT_TABLE_AUTHORITY_SCHEMA,
    datasetId: projection.authority.datasetId,
    datasetVersion: projection.authority.datasetVersion,
    sourceHash: projection.authority.sourceHash,
    baseCanonicalHash: snapshot.baseAuthority.baseCanonicalHash,
    priorDraftHash: projection.authority.canonicalTopologyHash,
    projectionHash: projection.projectionHash,
    sessionVersion: snapshot.sessionVersion,
    journalHash: requiredText(snapshot.journalHash, 'sessionSnapshot.journalHash'),
    activeLedgerHash: requiredText(snapshot.activeLedgerHash, 'sessionSnapshot.activeLedgerHash'),
  };
  return deepFreeze({ ...material, authorityHash: semanticHash(material) });
}

function assertEditAuthority(value) {
  if (value?.schema !== TOPOLOGY_EDIT_TABLE_AUTHORITY_SCHEMA) {
    throw new TypeError(`Edit authority must use ${TOPOLOGY_EDIT_TABLE_AUTHORITY_SCHEMA}.`);
  }
  const material = { ...value };
  delete material.authorityHash;
  if (semanticHash(material) !== value.authorityHash) {
    throw new Error('TopologyEditTableIntent: authority hash mismatch.');
  }
  return value;
}

function normalizeIntentPayload(kind, requestedValue, geometryPolicy, row, projection) {
  if (kind === 'PIPE_LENGTH') return normalizePipeLength(requestedValue, geometryPolicy, row);
  if (kind === 'NODE_POSITION') {
    return normalizeTopologyEditTableNodePositionPayload(requestedValue, geometryPolicy, row);
  }
  if (kind === 'SUPPORT_RESTRAINT') {
    return normalizeTopologyEditTableSupportRestraintPayload(requestedValue, row);
  }
  if (kind === 'VALVE_REPLACEMENT') {
    return normalizeValveReplacement(requestedValue, geometryPolicy, row);
  }
  if (kind === 'TEE_REDUCER_RELATION') {
    return normalizeTopologyEditTableTeeReducerRelation(requestedValue, row, projection);
  }
  throw new RangeError(`TopologyEditTableIntent: unsupported intent kind ${kind}.`);
}

function normalizePipeLength(requestedValue, geometryPolicy, row) {
  if (row.elementType !== 'PIPE' || row.identity.canonicalKind !== 'EDGE') {
    throw new RangeError('TopologyEditTableIntent: PIPE_LENGTH requires an exact canonical PIPE edge row.');
  }
  const lengthMm = Number(requestedValue?.lengthMm ?? requestedValue);
  if (!Number.isFinite(lengthMm) || lengthMm <= 0) {
    throw new RangeError('TopologyEditTableIntent: PIPE_LENGTH lengthMm must be positive and finite.');
  }
  return {
    requestedValue: { lengthMm },
    geometryPolicy: normalizeGeometryPolicy(geometryPolicy),
  };
}

function normalizeValveReplacement(requestedValue, geometryPolicy, row) {
  if (row.elementType !== 'VALVE' || row.identity.canonicalKind !== 'EDGE') {
    throw new RangeError('TopologyEditTableIntent: VALVE_REPLACEMENT requires an exact canonical VALVE edge row.');
  }
  if (token(row.fields.valveType) !== 'GATE') {
    throw new RangeError('TopologyEditTableIntent: M06 qualification requires an observed GATE valve target.');
  }
  const normalized = normalizeTopologyEditInlineReplacementPayload({
    edgeId: row.identity.canonicalId,
    direction: requestedValue?.direction ?? 'FROM_TO',
    catalogueBinding: requestedValue?.catalogueBinding,
  });
  if (normalized.catalogueBinding.valveType !== 'BALL') {
    throw new RangeError('TopologyEditTableIntent: M06 replacement catalogue record must be a BALL valve.');
  }
  const observedDn = finitePositive(row.fields.dnInMm);
  if (observedDn !== null
    && Math.abs(observedDn - normalized.catalogueBinding.nominalSizeMm) > 1e-9) {
    throw new RangeError('TopologyEditTableIntent: replacement valve nominal size differs from the target row.');
  }
  return {
    requestedValue: {
      direction: normalized.direction,
      catalogueBinding: normalized.catalogueBinding,
    },
    geometryPolicy: normalizeGeometryPolicy(geometryPolicy),
  };
}

function normalizeGeometryPolicy(value) {
  return {
    anchor: requiredEnum(value?.anchor, ANCHORS, 'geometryPolicy.anchor'),
    propagation: requiredEnum(value?.propagation, PROPAGATION, 'geometryPolicy.propagation'),
  };
}
function priorValue(kind, row, payload) {
  if (kind === 'PIPE_LENGTH') return deepFreeze({ lengthMm: row.fields.lengthMm });
  if (kind === 'NODE_POSITION') return topologyEditTableNodePositionPriorValue(payload);
  if (kind === 'SUPPORT_RESTRAINT') return topologyEditTableSupportRestraintPriorValue(row);
  if (kind === 'VALVE_REPLACEMENT') return deepFreeze({
    valveType: row.fields.valveType,
    lengthMm: row.fields.lengthMm,
    componentLengthMm: row.fields.componentLengthMm,
    catalogueRecordHash: row.custody.catalogue?.recordHash ?? null,
  });
  if (kind === 'TEE_REDUCER_RELATION') return topologyEditTableTeeReducerPriorValue(row);
  return null;
}
function exactRow(projection, canonicalIdInput) {
  const canonicalId = requiredText(canonicalIdInput, 'canonicalId');
  const matches = projection.rows.filter((row) => row.identity.canonicalId === canonicalId);
  if (matches.length !== 1) {
    throw new RangeError(`TopologyEditTableIntent: canonicalId ${canonicalId} resolved ${matches.length} rows.`);
  }
  return matches[0];
}
function requiredEnum(value, allowed, label) {
  const text = requiredText(value, label).toUpperCase();
  if (!allowed.has(text)) {
    throw new RangeError(`TopologyEditTableIntent: ${label} has unsupported value ${text}.`);
  }
  return text;
}
function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) throw new TypeError(`TopologyEditTableIntent: ${label} is required.`);
  return text;
}
function token(value) { return stringValue(value).toUpperCase(); }
function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
