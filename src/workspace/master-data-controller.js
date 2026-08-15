import { EventBus } from './event-bus.js';
import { WorkspaceState } from './workspace-state.js';

const MASTER_DATA_DB_NAME = 'MasterDataDB';
const MASTER_DATA_STORE_NAME = 'masters';
const MASTER_DATA_ROWS_KEY = 'masterDataRowsV1';
const MASTER_KEYS = Object.freeze(['lineList', 'pipingClass', 'weight', 'materialMap']);

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

async function readPersistedMasterRows() {
  const db = await openPersistedMasterDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MASTER_DATA_STORE_NAME, 'readonly');
    const request = tx.objectStore(MASTER_DATA_STORE_NAME).get(MASTER_DATA_ROWS_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || tx.error);
  }).finally(() => db.close());
}

async function writePersistedMasterRows(value) {
  const db = await openPersistedMasterDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MASTER_DATA_STORE_NAME, 'readwrite');
    tx.objectStore(MASTER_DATA_STORE_NAME).put(value, MASTER_DATA_ROWS_KEY);
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
    tx.objectStore(MASTER_DATA_STORE_NAME).delete(MASTER_DATA_ROWS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

function persistedMasterRowsSnapshot(masterData) {
  return Object.fromEntries(MASTER_KEYS.map((key) => {
    const row = masterData[key] || {};
    return [key, structuredClone({
      rawRows: Array.isArray(row.rawRows) ? row.rawRows : [],
      normalizedRows: Array.isArray(row.normalizedRows) ? row.normalizedRows : [],
      fileName: row.fileName || '',
      sheetName: row.sheetName || '',
      diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
      sourceHash: row.sourceHash || '',
      byteLength: row.byteLength ?? null,
    })];
  }));
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
    this._persistQueue = Promise.resolve();
    this.masterData = this.loadPersistedState() || MasterDataConfigV1.createDefault();
    this.restorePromise = this.restorePersistedRows(this._mutationRevision);
  }

  async restorePersistedRows(basisRevision) {
    try {
      const stored = await readPersistedMasterRows();
      if (!stored || basisRevision !== this._mutationRevision) return false;
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
        restored = true;
      }
      if (restored && basisRevision === this._mutationRevision) {
        this.eventBus.publish('MASTER_DATA_UPDATED', { action: 'idb_restore' });
      }
      return restored;
    } catch (error) {
      console.warn('Failed to restore master data rows from IndexedDB', error);
      return false;
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

  persistState() {
    this.persistMappingState();
    const snapshot = persistedMasterRowsSnapshot(this.masterData);
    return this.queuePersistedRows(() => writePersistedMasterRows(snapshot));
  }

  getMasterData() {
    return this.masterData;
  }

  setRawRows(masterKey, rawRows, fileName, sheetName, sourceMetadata) {
    if (!this.masterData[masterKey]) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
    this._mutationRevision += 1;
    this.masterData[masterKey].rawRows = rawRows;
    this.masterData[masterKey].fileName = fileName;
    this.masterData[masterKey].sheetName = sheetName;
    this.masterData[masterKey].sourceHash = sourceMetadata?.sourceHash || '';
    this.masterData[masterKey].byteLength = sourceMetadata?.byteLength || null;
    this.persistState();
    this.eventBus.publish('MASTER_DATA_UPDATED', { masterKey, action: 'raw_upload' });
  }

  setFieldMap(masterKey, fieldMap) {
    if (!this.masterData[masterKey]) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
    this._mutationRevision += 1;
    this.masterData[masterKey].fieldMap = fieldMap;
    this.persistState();
    this.eventBus.publish('MASTER_DATA_UPDATED', { masterKey, action: 'mapping_update' });
  }

  setNormalizedRows(masterKey, normalizedRows, diagnostics = []) {
    if (!this.masterData[masterKey]) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
    this._mutationRevision += 1;
    this.masterData[masterKey].normalizedRows = normalizedRows;
    this.masterData[masterKey].diagnostics = diagnostics;
    this.persistState();
    this.eventBus.publish('MASTER_DATA_UPDATED', { masterKey, action: 'normalized_update' });
  }

  clear() {
    this._mutationRevision += 1;
    this.masterData = MasterDataConfigV1.createDefault();
    this.persistMappingState();
    this.queuePersistedRows(() => deletePersistedMasterRows());
    this.eventBus.publish('MASTER_DATA_CLEARED', {});
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
