import { deepFreeze } from '../core/shared-piping-model/immutable.js';

export const LFEA_PERSISTENCE_SNAPSHOT_SCHEMA = 'lfea-persistence-snapshot/v1';
export const LFEA_PERSISTENCE_RECORD_SCHEMA = 'lfea-persistence-record/v1';
export const LFEA_PERSISTENCE_KEYS = Object.freeze({
  activeView: 'lfea.ui.activeView.v1',
  recentSourceMetadata: 'lfea.source.recentMetadata.v1',
});

const VIEW_PATTERN = /^[a-z][a-z0-9-]{0,31}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

/** Browser storage boundary for non-authoritative standalone LFEA preferences only. */
export function createLfeaPersistenceAdapter(storage = null) {
  function load() {
    const diagnostics = [];
    const activeView = readRecord(storage, LFEA_PERSISTENCE_KEYS.activeView, 'ACTIVE_VIEW', diagnostics);
    const recent = readRecord(storage, LFEA_PERSISTENCE_KEYS.recentSourceMetadata, 'RECENT_SOURCE_METADATA', diagnostics);
    return deepFreeze({
      schema: LFEA_PERSISTENCE_SNAPSHOT_SCHEMA,
      activeView: validView(activeView) ? activeView : null,
      recentSourceMetadata: validRecentSource(recent) ? freezeRecentSource(recent) : null,
      diagnostics: deepFreeze(diagnostics),
    });
  }

  function saveActiveView(viewId) {
    if (!validView(viewId)) throw persistenceError('LFEA_PERSISTENCE_ACTIVE_VIEW_INVALID', 'Active view preference is invalid.');
    return writeRecord(storage, LFEA_PERSISTENCE_KEYS.activeView, 'ACTIVE_VIEW', viewId);
  }

  function saveRecentSourceMetadata(metadata) {
    if (!validRecentSource(metadata)) {
      throw persistenceError('LFEA_PERSISTENCE_RECENT_SOURCE_INVALID', 'Recent source metadata is invalid.');
    }
    return writeRecord(
      storage,
      LFEA_PERSISTENCE_KEYS.recentSourceMetadata,
      'RECENT_SOURCE_METADATA',
      freezeRecentSource(metadata),
    );
  }

  return Object.freeze({ load, saveActiveView, saveRecentSourceMetadata });
}

/** Resolve browser storage without leaking localStorage access outside this module. */
export function getLfeaBrowserStorage(windowRef) {
  try {
    return windowRef?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readRecord(storage, key, kind, diagnostics) {
  if (!storage) return null;
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    diagnostics.push(diagnostic(key, 'STORAGE_READ_FAILED', error));
    return null;
  }
  if (raw === null) return null;
  try {
    const record = JSON.parse(raw);
    if (!record || record.schema !== LFEA_PERSISTENCE_RECORD_SCHEMA || record.kind !== kind
      || !Object.hasOwn(record, 'value') || Object.keys(record).length !== 3) {
      diagnostics.push(diagnostic(key, 'STORED_RECORD_REJECTED'));
      return null;
    }
    return record.value;
  } catch (error) {
    diagnostics.push(diagnostic(key, 'STORED_JSON_REJECTED', error));
    return null;
  }
}

function writeRecord(storage, key, kind, value) {
  if (!storage) return deepFreeze({ status: 'UNAVAILABLE', key });
  const serialized = JSON.stringify({ schema: LFEA_PERSISTENCE_RECORD_SCHEMA, kind, value });
  try {
    if (storage.getItem(key) !== serialized) storage.setItem(key, serialized);
    return deepFreeze({ status: 'SAVED', key });
  } catch (error) {
    return deepFreeze({ status: 'UNAVAILABLE', key, reason: messageOf(error) });
  }
}

function validView(value) {
  return typeof value === 'string' && VIEW_PATTERN.test(value);
}

function validRecentSource(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(',') !== 'contentSha256,fileName,sourceUnit') return false;
  return boundedText(value.fileName, 256)
    && typeof value.contentSha256 === 'string'
    && SHA256_PATTERN.test(value.contentSha256)
    && boundedText(value.sourceUnit, 32);
}

function freezeRecentSource(value) {
  return deepFreeze({
    fileName: String(value.fileName),
    contentSha256: String(value.contentSha256),
    sourceUnit: String(value.sourceUnit),
  });
}

function boundedText(value, limit) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

function diagnostic(key, code, error = null) {
  return deepFreeze({ key, code, message: error ? messageOf(error) : null });
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error ?? 'UNKNOWN_ERROR');
}

function persistenceError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_NON_AUTHORITATIVE_PERSISTENCE';
  return error;
}
