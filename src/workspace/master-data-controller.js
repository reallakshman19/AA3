import { EventBus } from './event-bus.js';
import { WorkspaceState } from './workspace-state.js';
import { DEFAULT_WEIGHT_MASTER_ROWS } from './default-weight-master.js';
import { DEFAULT_MATERIAL_MASTER_ROWS } from './default-material-master.js';

export const MasterDataConfigV1 = {
  createDefault() {
    return {
      version: 1,
      lineList: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      pipingClass: { rawRows: [], fieldMap: {}, normalizedRows: [], diagnostics: [] },
      weight: { rawRows: DEFAULT_WEIGHT_MASTER_ROWS, fieldMap: {}, normalizedRows: DEFAULT_WEIGHT_MASTER_ROWS, diagnostics: [] },
      materialMap: { rawRows: DEFAULT_MATERIAL_MASTER_ROWS, fieldMap: {}, normalizedRows: DEFAULT_MATERIAL_MASTER_ROWS, diagnostics: [] },
      config: {}
    };
  }
};

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MasterDataDB', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('masters');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIDB(key, data) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('masters', 'readwrite');
    tx.objectStore('masters').put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadFromIDB(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('masters', 'readonly');
    const req = tx.objectStore('masters').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(tx.error);
  });
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
    this.masterData = this.loadPersistedState() || MasterDataConfigV1.createDefault();
    this.restoreFromIndexedDB();
  }

  async restoreFromIndexedDB() {
    if (typeof indexedDB === 'undefined') return;
    try {
      const stored = await loadFromIDB('masterDataRowsV1');
      if (stored) {
        let updated = false;
        for (const key of ['lineList', 'pipingClass', 'weight', 'materialMap']) {
          if (stored[key] && stored[key].rawRows && stored[key].rawRows.length > 0) {
            this.masterData[key].rawRows = stored[key].rawRows;
            this.masterData[key].normalizedRows = stored[key].normalizedRows || [];
            this.masterData[key].fileName = stored[key].fileName;
            this.masterData[key].diagnostics = stored[key].diagnostics || [];
            if (stored[key].sourceHash) this.masterData[key].sourceHash = stored[key].sourceHash;
            if (stored[key].byteLength != null) this.masterData[key].byteLength = stored[key].byteLength;
            updated = true;
          }
        }
        if (updated) {
          this.eventBus.publish('MASTER_DATA_UPDATED', { action: 'idb_restore' });
        }
      }
    } catch (e) {
      console.warn('Failed to restore from IDB', e);
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

  persistState() {
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

      if (typeof indexedDB !== 'undefined') {
        const idbState = {
          lineList: { rawRows: this.masterData.lineList.rawRows, normalizedRows: this.masterData.lineList.normalizedRows, fileName: this.masterData.lineList.fileName, diagnostics: this.masterData.lineList.diagnostics, sourceHash: this.masterData.lineList.sourceHash || null, byteLength: this.masterData.lineList.byteLength ?? null },
          pipingClass: { rawRows: this.masterData.pipingClass.rawRows, normalizedRows: this.masterData.pipingClass.normalizedRows, fileName: this.masterData.pipingClass.fileName, diagnostics: this.masterData.pipingClass.diagnostics, sourceHash: this.masterData.pipingClass.sourceHash || null, byteLength: this.masterData.pipingClass.byteLength ?? null },
          weight: { rawRows: this.masterData.weight.rawRows, normalizedRows: this.masterData.weight.normalizedRows, fileName: this.masterData.weight.fileName, diagnostics: this.masterData.weight.diagnostics, sourceHash: this.masterData.weight.sourceHash || null, byteLength: this.masterData.weight.byteLength ?? null },
          materialMap: { rawRows: this.masterData.materialMap.rawRows, normalizedRows: this.masterData.materialMap.normalizedRows, fileName: this.masterData.materialMap.fileName, diagnostics: this.masterData.materialMap.diagnostics, sourceHash: this.masterData.materialMap.sourceHash || null, byteLength: this.masterData.materialMap.byteLength ?? null }
        };
        saveToIDB('masterDataRowsV1', idbState).catch(e => console.warn('IDB save failed', e));
      }
    } catch (e) {
      console.warn('Failed to save master data config to localStorage', e);
    }
  }

  getMasterData() {
    return this.masterData;
  }

  setRawRows(masterKey, rawRows, fileName, sheetName, sourceMetadata) {
    if (!this.masterData[masterKey]) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
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
    this.masterData[masterKey].fieldMap = fieldMap;
    this.persistState();
    this.eventBus.publish('MASTER_DATA_UPDATED', { masterKey, action: 'mapping_update' });
  }

  setNormalizedRows(masterKey, normalizedRows, diagnostics = []) {
    if (!this.masterData[masterKey]) throw new RangeError(`Unknown master-data key: ${masterKey}.`);
    this.masterData[masterKey].normalizedRows = normalizedRows;
    this.masterData[masterKey].diagnostics = diagnostics;
    this.persistState();
    this.eventBus.publish('MASTER_DATA_UPDATED', { masterKey, action: 'normalized_update' });
  }

  clear() {
    this.masterData = MasterDataConfigV1.createDefault();
    this.persistState();
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
      sourceMetadata: {
        lineList: { source: this.masterData.lineList.fileName || 'not-loaded', sourceType: 'file', status: this.masterData.lineList.rawRows.length ? 'loaded' : 'pending' },
        pipingClass: { source: this.masterData.pipingClass.fileName || 'not-loaded', sourceType: 'file', status: this.masterData.pipingClass.rawRows.length ? 'loaded' : 'pending' },
        weight: { source: this.masterData.weight.fileName || 'not-loaded', sourceType: 'file', status: this.masterData.weight.rawRows.length ? 'loaded' : 'pending', sourceHash: this.masterData.weight.sourceHash || '' },
        materialMap: { source: this.masterData.materialMap.fileName || 'not-loaded', sourceType: 'file', status: this.masterData.materialMap.rawRows.length ? 'loaded' : 'pending', sourceHash: this.masterData.materialMap.sourceHash || '' }
      },
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
