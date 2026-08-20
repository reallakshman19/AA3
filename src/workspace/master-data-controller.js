import { EventBus } from './event-bus.js';
import { WorkspaceState } from './workspace-state.js';
import {
  BUNDLED_WEIGHT_MASTER,
  BUNDLED_MAT_MAP_MASTER,
  BUNDLED_PIPING_CLASS_MASTER,
} from '../master-data/bundled-master-data.js';

const MASTER_DATA_DB_NAME = 'MasterDataDB';
const MASTER_DATA_STORE_NAME = 'masters';
const LEGACY_MASTER_DATA_ROWS_KEY = 'masterDataRowsV1';
const MASTER_DATA_RECORD_PREFIX = 'masterDataRowsV2:';
const MASTER_KEYS = Object.freeze(['lineList', 'pipingClass', 'weight', 'materialMap']);

export function masterDataRecordKey(masterKey) {
  if (!MASTER_KEYS.includes(masterKey)) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
  return `${MASTER_DATA_RECORD_PREFIX}${masterKey}`;
}

export const MasterDataConfigV1 = {
  createDefault() {
    return {
      version: 1,
      lineList: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      pipingClass: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      weight: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      materialMap: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      config: {}
    };
  }
};

function openPersistedMasterDb() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(MASTER_DATA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MASTER_DATA_STORE_NAME)) {
        db.createObjectStore(MASTER_DATA_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function readPersistedMasterRows() {
  const db = await openPersistedMasterDb();
  if (!db) return null;
  try {
    const tx = db.transaction(MASTER_DATA_STORE_NAME, 'readonly');
    const store = tx.objectStore(MASTER_DATA_STORE_NAME);
    const [legacy, ...individual] = await Promise.all([
      requestResult(store.get(LEGACY_MASTER_DATA_ROWS_KEY)),
      ...MASTER_KEYS.map((key) => requestResult(store.get(masterDataRecordKey(key)))),
    ]);
    const restored = {};
    let found = false;
    MASTER_KEYS.forEach((key, index) => {
      const source = individual[index] || legacy?.[key] || null;
      if (!source) return;
      restored[key] = source;
      found = true;
    });
    return found ? restored : null;
  } finally {
    db.close();
  }
}

async function writePersistedMasterRows(masterKey, value) {
  const db = await openPersistedMasterDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MASTER_DATA_STORE_NAME, 'readwrite');
    tx.objectStore(MASTER_DATA_STORE_NAME).put(value, masterDataRecordKey(masterKey));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function deletePersistedMasterRows() {
  const db = await openPersistedMasterDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MASTER_DATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(MASTER_DATA_STORE_NAME);
    store.delete(LEGACY_MASTER_DATA_ROWS_KEY);
    for (const key of MASTER_KEYS) store.delete(masterDataRecordKey(key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

function persistedMasterRowsSnapshot(masterData, masterKey) {
  const row = masterData[masterKey] || {};
  return structuredClone({
    rawRows: Array.isArray(row.rawRows) ? row.rawRows : [],
    normalizedRows: Array.isArray(row.normalizedRows) ? row.normalizedRows : [],
    fileName: row.fileName || '',
    sheetName: row.sheetName || '',
    diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
    sourceHash: row.sourceHash || '',
    byteLength: row.byteLength ?? null,
  });
}

function emptyRevisionMap() {
  return Object.fromEntries(MASTER_KEYS.map((key) => [key, 0]));
}

function emptyPerformanceMetrics() {
  return {
    mutationCommits: 0,
    persistenceRequests: 0,
    updateEventsPublished: 0,
    persistenceRequestsByMaster: emptyRevisionMap(),
  };
}

function validateRows(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`);
  return value;
}

function validateFieldMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('fieldMap must be an object.');
  }
  return value;
}

export class MasterDataController {
  get eventBus() {
    return this._eventBus || EventBus;
  }
  set eventBus(val) {
    this._eventBus = val;
  }
  get workspaceState() {
    return this._workspaceState || WorkspaceState;
  }
  set workspaceState(val) {
    this._workspaceState = val;
  }
  constructor(eventBus = null, workspaceState = null) {
    if (eventBus) this._eventBus = eventBus;
    if (workspaceState) this._workspaceState = workspaceState;
    this._mutationRevision = 0;
    this._masterRevisions = emptyRevisionMap();
    this._performanceMetrics = emptyPerformanceMetrics();
    this._persistQueue = Promise.resolve();
    this.masterData = this.loadPersistedState() || MasterDataConfigV1.createDefault();
    this.restorePromise = this.restorePersistedRows(this._mutationRevision);
  }

  async restorePersistedRows(basisRevision) {
    try {
      const stored = await readPersistedMasterRows();
      if (!stored || basisRevision !== this._mutationRevision) {
        // Nothing in IndexedDB — seed bundled defaults for keys that are still empty.
        this._seedBundledDefaults();
        return false;
      }
      let restored = false;
      for (const key of MASTER_KEYS) {
        const source = stored[key];
        if (!source || !Array.isArray(source.rawRows) || !Array.isArray(source.normalizedRows)) continue;
        if (!source.rawRows.length && !source.normalizedRows.length && !source.fileName) continue;
        Object.assign(this.masterData[key], {
          rawRows: source.rawRows,
          normalizedRows: source.normalizedRows,
          fileName: source.fileName || '',
          sheetName: source.sheetName || '',
          diagnostics: Array.isArray(source.diagnostics) ? source.diagnostics : [],
          sourceHash: source.sourceHash || '',
          byteLength: source.byteLength ?? null,
        });
        this._masterRevisions[key] += 1;
        restored = true;
      }
      // Seed bundled defaults for any key that still has no rows after IDB restore.
      this._seedBundledDefaults();
      if (basisRevision === this._mutationRevision) {
        this.publishMasterUpdated({ action: 'idb_restore', revisions: this.getRevisionSnapshot() });
      }
      return restored;
    } catch (error) {
      console.warn('Failed to restore master data rows from IndexedDB', error);
      this._seedBundledDefaults();
      return false;
    }
  }

  /**
   * Seeds bundled master data for 'weight' and 'materialMap' only when the
   * key currently has zero rawRows. User-uploaded data always wins because
   * this is called after IDB restoration.
   */
  _seedBundledDefaults() {
    const BUNDLED = {
      weight: BUNDLED_WEIGHT_MASTER,
      materialMap: BUNDLED_MAT_MAP_MASTER,
      pipingClass: BUNDLED_PIPING_CLASS_MASTER,
    };
    let seeded = false;
    for (const [key, bundled] of Object.entries(BUNDLED)) {
      if (!this.masterData[key]) continue;
      if (this.masterData[key].rawRows.length > 0) continue; // IDB data wins
      Object.assign(this.masterData[key], {
        rawRows: bundled.rawRows,
        normalizedRows: bundled.normalizedRows,
        fileName: bundled.fileName,
        sheetName: bundled.sheetName,
        diagnostics: bundled.diagnostics,
        sourceHash: bundled.sourceHash,
        byteLength: bundled.byteLength,
      });
      this._masterRevisions[key] += 1;
      seeded = true;
    }
    if (seeded) {
      this.publishMasterUpdated({ action: 'bundled_seed', revisions: this.getRevisionSnapshot() });
    }
  }

  loadPersistedState() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem('masterDataConfigV1');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const def = MasterDataConfigV1.createDefault();

      if (parsed.lineList?.fieldMap) def.lineList.fieldMap = parsed.lineList.fieldMap;
      if (parsed.pipingClass?.fieldMap) def.pipingClass.fieldMap = parsed.pipingClass.fieldMap;
      if (parsed.weight?.fieldMap) def.weight.fieldMap = parsed.weight.fieldMap;
      if (parsed.materialMap?.fieldMap) def.materialMap.fieldMap = parsed.materialMap.fieldMap;
      if (parsed.config) def.config = parsed.config;

      return def;
    } catch (e) {
      console.warn('Failed to load master data config from localStorage', e);
      return null;
    }
  }

  persistMappingState() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stateToSave = {
        version: this.masterData.version,
        lineList: { fieldMap: this.masterData.lineList.fieldMap },
        pipingClass: { fieldMap: this.masterData.pipingClass.fieldMap },
        weight: { fieldMap: this.masterData.weight.fieldMap },
        materialMap: { fieldMap: this.masterData.materialMap.fieldMap },
        config: this.masterData.config
      };
      localStorage.setItem('masterDataConfigV1', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save master data config to localStorage', e);
    }
  }

  queuePersistedRows(operation) {
    this._persistQueue = this._persistQueue
      .then(operation)
      .catch((error) => console.warn('Failed to persist master data rows', error));
    return this._persistQueue;
  }

  persistState(masterKey = null) {
    this.persistMappingState();
    if (masterKey) return this.persistMasterRows(masterKey);
    for (const key of MASTER_KEYS) this.persistMasterRows(key);
    return this._persistQueue;
  }

  persistMasterRows(masterKey) {
    this.requireMasterKey(masterKey);
    const snapshot = persistedMasterRowsSnapshot(this.masterData, masterKey);
    this._performanceMetrics.persistenceRequests += 1;
    this._performanceMetrics.persistenceRequestsByMaster[masterKey] += 1;
    return this.queuePersistedRows(() => writePersistedMasterRows(masterKey, snapshot));
  }

  whenPersistenceSettled() {
    return this._persistQueue;
  }

  getMasterData() {
    return this.masterData;
  }

  getRevisionSnapshot() {
    return { ...this._masterRevisions };
  }

  getPerformanceMetrics() {
    return {
      mutationRevision: this._mutationRevision,
      masterRevisions: this.getRevisionSnapshot(),
      mutationCommits: this._performanceMetrics.mutationCommits,
      persistenceRequests: this._performanceMetrics.persistenceRequests,
      updateEventsPublished: this._performanceMetrics.updateEventsPublished,
      persistenceRequestsByMaster: { ...this._performanceMetrics.persistenceRequestsByMaster },
    };
  }

  resetPerformanceMetrics() {
    this._performanceMetrics = emptyPerformanceMetrics();
  }

  commitMasterImport(masterKey, {
    rawRows,
    fieldMap,
    normalizedRows,
    diagnostics = [],
    fileName = '',
    sheetName = '',
    sourceMetadata = {},
  }) {
    return this.commitMasterMutation(masterKey, {
      rawRows: validateRows(rawRows, 'rawRows'),
      fieldMap: validateFieldMap(fieldMap || {}),
      normalizedRows: validateRows(normalizedRows, 'normalizedRows'),
      diagnostics: validateRows(diagnostics, 'diagnostics'),
      fileName,
      sheetName,
      sourceHash: sourceMetadata?.sourceHash || '',
      byteLength: sourceMetadata?.byteLength ?? null,
    }, 'import_commit');
  }

  commitMasterMapping(masterKey, { fieldMap, normalizedRows, diagnostics = [] }) {
    return this.commitMasterMutation(masterKey, {
      fieldMap: validateFieldMap(fieldMap),
      normalizedRows: validateRows(normalizedRows, 'normalizedRows'),
      diagnostics: validateRows(diagnostics, 'diagnostics'),
    }, 'mapping_commit');
  }

  setRawRows(masterKey, rawRows, fileName, sheetName, sourceMetadata) {
    return this.commitMasterMutation(masterKey, {
      rawRows: validateRows(rawRows, 'rawRows'),
      fileName,
      sheetName,
      sourceHash: sourceMetadata?.sourceHash || '',
      byteLength: sourceMetadata?.byteLength ?? null,
    }, 'raw_upload');
  }

  setFieldMap(masterKey, fieldMap) {
    return this.commitMasterMutation(masterKey, {
      fieldMap: validateFieldMap(fieldMap),
    }, 'mapping_update');
  }

  setNormalizedRows(masterKey, normalizedRows, diagnostics = []) {
    return this.commitMasterMutation(masterKey, {
      normalizedRows: validateRows(normalizedRows, 'normalizedRows'),
      diagnostics: validateRows(diagnostics, 'diagnostics'),
    }, 'normalized_update');
  }

  commitMasterMutation(masterKey, patch, action) {
    this.requireMasterKey(masterKey);
    this._mutationRevision += 1;
    this._masterRevisions[masterKey] += 1;
    this._performanceMetrics.mutationCommits += 1;
    Object.assign(this.masterData[masterKey], patch);
    this.persistState(masterKey);
    this.publishMasterUpdated({
      masterKey,
      action,
      mutationRevision: this._mutationRevision,
      masterRevision: this._masterRevisions[masterKey],
    });
    return this.masterData[masterKey];
  }

  publishMasterUpdated(payload) {
    this._performanceMetrics.updateEventsPublished += 1;
    this.eventBus.publish('MASTER_DATA_UPDATED', payload);
  }

  requireMasterKey(masterKey) {
    if (!this.masterData[masterKey] || !MASTER_KEYS.includes(masterKey)) {
      throw new RangeError(`Unknown master-data key: ${masterKey}.`);
    }
  }

  clear() {
    this._mutationRevision += 1;
    for (const key of MASTER_KEYS) this._masterRevisions[key] += 1;
    this._performanceMetrics.mutationCommits += 1;
    this.masterData = MasterDataConfigV1.createDefault();
    this.persistMappingState();
    this.queuePersistedRows(() => deletePersistedMasterRows());
    this.eventBus.publish('MASTER_DATA_CLEARED', {
      mutationRevision: this._mutationRevision,
      revisions: this.getRevisionSnapshot(),
    });
  }

  /**
   * Translates the new MasterDataConfigV1 state into the legacy masterContext
   * structure expected by the old UI components (xml-cii-adapted-import-masters).
   */
  getLegacyContext() {
    const config = {
      linelist: { fieldMap: this.masterData.lineList.fieldMap },
      pipingClass: { fieldMap: this.masterData.pipingClass.fieldMap },
      weight: { fieldMap: this.masterData.weight.fieldMap },
      material: { fieldMap: this.masterData.materialMap.fieldMap }
    };

    const sourceMetadata = Object.fromEntries(MASTER_KEYS.map((key) => [key, {
      source: this.masterData[key].fileName || 'not-loaded',
      sourceType: 'file',
      status: this.masterData[key].rawRows.length ? 'loaded' : 'pending',
      sourceHash: this.masterData[key].sourceHash || '',
      byteLength: this.masterData[key].byteLength ?? null,
      revision: this._masterRevisions[key],
    }]));

    return {
      rawRows: {
        lineList: this.masterData.lineList.rawRows,
        pipingClass: this.masterData.pipingClass.rawRows,
        weight: this.masterData.weight.rawRows,
        materialMap: this.masterData.materialMap.rawRows
      },
      lineRows: this.masterData.lineList.normalizedRows,
      pipingClassRows: this.masterData.pipingClass.normalizedRows,
      weightMasterRows: this.masterData.weight.normalizedRows,
      materialMapRows: this.masterData.materialMap.normalizedRows,
      sourceMetadata,
      diagnostics: {
        lineList: this.masterData.lineList.diagnostics,
        pipingClass: this.masterData.pipingClass.diagnostics,
        weight: this.masterData.weight.diagnostics,
        materialMap: this.masterData.materialMap.diagnostics
      },
      config
    };
  }
}

// Export a singleton instance for workspace consumption
export const masterDataController = new MasterDataController();
