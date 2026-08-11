import { deepFreeze, semanticHash } from '../core/shared-piping-model/index.js';
import {
  TOPOLOGY_EDIT_PREPARED_EXPORT_SCHEMA,
  TOPOLOGY_EDIT_STAGED_JSON_SCHEMA,
  assertPreparedTopologyEditExport,
} from './topology-edit/topology-edit-export.js';

export const LFEA_SOURCE_SCHEMA = 'lfea-source/v1';
export const LFEA_SOURCE_KINDS = Object.freeze({
  TOPOLOGY_EDIT_SNAPSHOT: 'TOPOLOGY_EDIT_SNAPSHOT',
  INPUTXML_FILE: 'INPUTXML_FILE',
  STAGED_JSON_FILE: 'STAGED_JSON_FILE',
});
export const LFEA_SOURCE_KEYS = Object.freeze([
  'schema',
  'kind',
  'sourceSemanticHash',
  'contentHash',
  'modelVersion',
  'capturedAtSourceVersion',
  'payload',
  'semanticHash',
]);

export function sealLfeaSource(kind, payload, options = {}) {
  const material = sourceMaterial(kind, payload, options);
  return deepFreeze({ ...material, semanticHash: semanticHash(material) });
}

export function requireLfeaSource(value) {
  requireRecord(value, 'LFEA source');
  const actual = Object.keys(value).sort();
  const expected = [...LFEA_SOURCE_KEYS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw sourceError('LFEA_SOURCE_KEYS_INVALID', 'LFEA source keys are invalid.');
  }
  const rebuilt = sourceMaterial(value.kind, value.payload, { modelVersion: value.modelVersion });
  if (semanticHash(rebuilt) !== semanticHash(withoutSemanticHash(value))
    || value.semanticHash !== semanticHash(withoutSemanticHash(value))) {
    throw sourceError('LFEA_SOURCE_STALE', 'LFEA source seal is stale or inconsistent.');
  }
  return deepFreeze({ ...value });
}

function sourceMaterial(kind, payload, options) {
  if (!Object.values(LFEA_SOURCE_KINDS).includes(kind)) {
    throw sourceError('LFEA_SOURCE_KIND_INVALID', `Unsupported LFEA source kind: ${String(kind)}.`);
  }
  const modelVersion = sourceVersion(kind, options?.modelVersion);
  if (kind === LFEA_SOURCE_KINDS.TOPOLOGY_EDIT_SNAPSHOT) {
    const prepared = assertPreparedTopologyEditExport(payload);
    return material(kind, prepared, prepared.draftCanonicalTopologyHash, prepared.preparedOutputHash, modelVersion);
  }
  if (kind === LFEA_SOURCE_KINDS.INPUTXML_FILE) {
    const input = requireInputXmlPayload(payload);
    const retained = deepFreeze({ fileName: input.fileName, content: input.content });
    const contentHash = semanticHash({ mediaType: 'application/xml', content: retained.content });
    return material(kind, retained, semanticHash({ kind, contentHash }), contentHash, modelVersion);
  }
  const stagedJson = requireStagedJson(payload);
  return material(kind, stagedJson, stagedJson.draftCanonicalTopologyHash, stagedJson.preparedOutputHash, modelVersion);
}

function material(kind, payload, sourceSemanticHash, contentHash, modelVersion) {
  return {
    schema: LFEA_SOURCE_SCHEMA,
    kind,
    sourceSemanticHash: requireText(sourceSemanticHash, 'sourceSemanticHash'),
    contentHash: requireText(contentHash, 'contentHash'),
    modelVersion,
    capturedAtSourceVersion: modelVersion,
    payload: deepFreeze(structuredClone(payload)),
  };
}

function sourceVersion(kind, value) {
  if (kind !== LFEA_SOURCE_KINDS.TOPOLOGY_EDIT_SNAPSHOT && value === undefined) return 0;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw sourceError('LFEA_SOURCE_VERSION_INVALID', 'LFEA source modelVersion must be a non-negative safe integer.');
  }
  return value;
}

function requireInputXmlPayload(value) {
  requireRecord(value, 'InputXML source');
  if (Object.keys(value).sort().join('|') !== 'content|fileName') {
    throw sourceError('LFEA_SOURCE_INPUTXML_INVALID', 'InputXML source requires exactly fileName and content.');
  }
  return {
    fileName: requireText(value.fileName, 'fileName'),
    content: requireText(value.content, 'content'),
  };
}

function requireStagedJson(value) {
  const candidate = typeof value === 'string' ? parseJson(value) : value;
  requireRecord(candidate, 'StagedJSON source');
  if (candidate.schema === TOPOLOGY_EDIT_PREPARED_EXPORT_SCHEMA) {
    return assertPreparedTopologyEditExport(candidate).stagedJson;
  }
  if (candidate.schema !== TOPOLOGY_EDIT_STAGED_JSON_SCHEMA) {
    throw sourceError('LFEA_SOURCE_STAGEDJSON_INVALID', `StagedJSON source must use ${TOPOLOGY_EDIT_STAGED_JSON_SCHEMA}.`);
  }
  const materialValue = { ...candidate };
  delete materialValue.preparedOutputHash;
  if (semanticHash(materialValue) !== candidate.preparedOutputHash) {
    throw sourceError('LFEA_SOURCE_STAGEDJSON_HASH_MISMATCH', 'StagedJSON preparedOutputHash is stale.');
  }
  requireText(candidate.draftCanonicalTopologyHash, 'draftCanonicalTopologyHash');
  return candidate;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw sourceError('LFEA_SOURCE_STAGEDJSON_INVALID', 'StagedJSON source is not valid JSON.');
  }
}

function withoutSemanticHash(value) {
  const { semanticHash: _semanticHash, ...materialValue } = value;
  return materialValue;
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw sourceError('LFEA_SOURCE_RECORD_REQUIRED', `${label} must be a record.`);
  }
  return value;
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw sourceError('LFEA_SOURCE_TEXT_REQUIRED', `${label} must be a non-empty string.`);
  }
  return value;
}

function sourceError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}
