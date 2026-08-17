import { renderStandaloneImportMastersPanel } from '../calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js';
import { parseMasterFile, autoMapMasterColumns } from './master-data-events-handler.js';
import { masterDataController } from './master-data-controller.js';
import { normalizeLineList, normalizePipingClass, normalizeWeight, normalizeMaterialMap } from './master-data-normalizers.js';
import { saveMappingForFile, getSavedMappingsForMaster } from '../calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-state.js';

/**
 * Normalizes an imported master using its explicit type and user-visible mapping.
 * Inputs are the master key, parsed source rows, and selected column mapping; the
 * output is the validated canonical row list. Unknown keys fail without fallback.
 */
function normalizeMasterRows(masterKey, rawRows, mapping) {
  if (masterKey === 'lineList') return normalizeLineList(rawRows, mapping);
  if (masterKey === 'pipingClass') return normalizePipingClass(rawRows, mapping);
  if (masterKey === 'weight') return normalizeWeight(rawRows, mapping);
  if (masterKey === 'materialMap') return normalizeMaterialMap(rawRows, mapping);
  throw new RangeError(`Unsupported master type: ${masterKey}`);
}

function copyMapping(mapping) {
  return { ...(mapping || {}) };
}

export function renderMasterDataUI(documentRef) {
  if (!documentRef) throw new TypeError('Master Data UI requires a document.');
  const container = documentRef.createElement('div');
  container.className = 'master-data-ui';
  container.style.cssText = 'display:flex; flex-direction:column; height:100%; overflow:hidden; background:#0b1120; color:#e2e8f0; padding:0;';

  const stateRef = {
    current: {
      masterContext: null,
      supportConfigJson: '{}',
      activeMainTab: 'lineList',
      importMastersLoading: false,
      importMastersWriteBackStatus: '',
      masterDraftMappings: {},
      masterDraftDirty: {},
    }
  };

  const appliedMappingFor = (masterKey) => copyMapping(
    masterDataController.getMasterData()[masterKey]?.fieldMap,
  );

  const draftMappingFor = (masterKey) => copyMapping(
    stateRef.current.masterDraftMappings[masterKey] || appliedMappingFor(masterKey),
  );

  const setDraftMapping = (masterKey, mapping) => {
    stateRef.current.masterDraftMappings[masterKey] = copyMapping(mapping);
    stateRef.current.masterDraftDirty[masterKey] = true;
  };

  const clearDraftMapping = (masterKey) => {
    delete stateRef.current.masterDraftMappings[masterKey];
    delete stateRef.current.masterDraftDirty[masterKey];
  };

  const updateVisibleStatus = (message, masterKey = null) => {
    stateRef.current.importMastersWriteBackStatus = message;
    const status = container.querySelector('.xml-cii-master-actions .xml-cii-phase-help');
    if (status) status.textContent = message;
    if (masterKey) {
      const draftStatus = container.querySelector(`[data-master-draft-status="${masterKey}"]`);
      if (draftStatus) {
        draftStatus.textContent = 'Draft mapping modified — not applied. Preview and calculations still use the last applied mapping.';
        draftStatus.style.color = '#fbbf24';
      }
    }
  };

  const render = () => {
    container.innerHTML = '';

    // Pass the authoritative legacy context to the adapted UI. Draft mapping is
    // supplied separately so Preview/calculation never consumes unapplied edits.
    stateRef.current.masterContext = masterDataController.getLegacyContext();
    stateRef.current.supportConfigJson = JSON.stringify(stateRef.current.masterContext.config || {});

    // Top Navigation Tabs Bar
    const header = documentRef.createElement('div');
    header.style.cssText = 'display:flex; gap:12px; align-items:center; background:#0f172a; padding:12px 20px; border-bottom:1px solid #1e293b; flex:none; flex-wrap:wrap;';

    const tabs = [
      { id: 'lineList', label: 'Line List' },
      { id: 'pipingClass', label: 'Piping Classes' },
      { id: 'weight', label: 'Weights' },
      { id: 'materialMap', label: 'Material Map' }
    ];

    tabs.forEach(tab => {
      const btn = documentRef.createElement('button');
      btn.textContent = tab.label;
      const isActive = stateRef.current.activeMainTab === tab.id;
      btn.style.cssText = `
        background: ${isActive ? '#0284c7' : '#1e293b'};
        color: ${isActive ? '#fff' : '#94a3b8'};
        border: 1px solid ${isActive ? '#0284c7' : '#334155'};
        padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;
      `;
      btn.addEventListener('click', () => {
        stateRef.current.activeMainTab = tab.id;
        render();
      });
      header.appendChild(btn);
    });

    // Action buttons
    const actionsRight = documentRef.createElement('div');
    actionsRight.style.cssText = 'margin-left:auto; display:flex; gap:10px; align-items:center;';

    header.appendChild(actionsRight);
    container.appendChild(header);

    // Body Container
    const body = documentRef.createElement('div');
    body.style.cssText = 'flex:1; overflow-y:auto; padding:20px;';

    renderStandaloneImportMastersPanel(body, stateRef.current, stateRef.current.activeMainTab);

    // Attach master action events (Upload File, Auto-Map, Save Mapping)
    body.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;

      if (action === 'load-import-masters') {
        // No-op for now, MasterDataController initializes state automatically
        render();
      } else if (action === 'clear-master-context') {
        masterDataController.clear();
        stateRef.current.masterDraftMappings = {};
        stateRef.current.masterDraftDirty = {};
        render();
      } else if (action === 'auto-map-master-fields') {
        const masterKey = target.dataset.masterKey;
        const rawRows = masterDataController.getMasterData()[masterKey]?.rawRows || [];
        if (rawRows.length) {
          const mapping = autoMapMasterColumns(rawRows, masterKey);
          setDraftMapping(masterKey, mapping);
          stateRef.current.importMastersWriteBackStatus = `Auto-mapped columns for ${masterKey}. Review the draft and select Apply Mapping.`;
          render();
        }
      } else if (action === 'save-master-mapping') {
        const masterKey = target.dataset.masterKey;
        const selects = container.querySelectorAll(`select[data-master-field-map][data-master-key="${masterKey}"]`);
        const mapping = {};
        selects.forEach(s => {
          if (s.value) mapping[s.dataset.masterFieldMap] = s.value;
        });

        const rawRows = masterDataController.getMasterData()[masterKey]?.rawRows || [];
        const fileName = masterDataController.getMasterData()[masterKey]?.fileName;
        if (!fileName) {
          stateRef.current.importMastersWriteBackStatus = `Cannot apply ${masterKey} mapping before an authoritative file is loaded.`;
          render();
          return;
        }

        try {
          const normalizedRows = normalizeMasterRows(masterKey, rawRows, mapping);
          masterDataController.commitMasterMapping(masterKey, {
            fieldMap: mapping,
            normalizedRows,
            diagnostics: [{ code: 'VALID', message: 'Mapping validated and applied successfully.' }],
          });
          saveMappingForFile(masterKey, fileName, mapping);
          clearDraftMapping(masterKey);
          stateRef.current.importMastersWriteBackStatus = `Mapping saved as "${fileName}" and applied successfully for ${masterKey}.`;
        } catch (err) {
          setDraftMapping(masterKey, mapping);
          stateRef.current.importMastersWriteBackStatus = `Mapping validation failed for ${masterKey}; the last applied mapping remains authoritative: ${err instanceof Error ? err.message : String(err)}`;
        }
        render();
      }
    });

    body.addEventListener('change', async (e) => {
      const selectAction = e.target.closest('select[data-action]');
      if (selectAction && selectAction.dataset.action === 'apply-saved-mapping') {
        const masterKey = selectAction.dataset.masterKey;
        const selectedMappingName = selectAction.value;
        if (selectedMappingName) {
          const savedMappings = getSavedMappingsForMaster(masterKey);
          const mapping = savedMappings[selectedMappingName];
          if (mapping) {
            setDraftMapping(masterKey, mapping);
            stateRef.current.importMastersWriteBackStatus = `Loaded saved mapping "${selectedMappingName}" as a draft for ${masterKey}. Select Apply Mapping to make it authoritative.`;
            render();
          }
        }
        return;
      }

      const select = e.target.closest('select[data-master-field-map]');
      if (select) {
        const masterKey = select.dataset.masterKey;
        const fieldName = select.dataset.masterFieldMap;
        const val = select.value;
        const currentMap = draftMappingFor(masterKey);
        if (val) currentMap[fieldName] = val;
        else delete currentMap[fieldName];
        setDraftMapping(masterKey, currentMap);
        updateVisibleStatus(
          `Mapping modified for ${masterKey}; select Apply Mapping to validate and commit it.`,
          masterKey,
        );
        return;
      }

      const fileInput = e.target.closest('input[type="file"][data-master-file]');
      if (fileInput && fileInput.files?.length > 0) {
        const file = fileInput.files[0];
        const masterKey = fileInput.dataset.masterFile;
        try {
          const { rawRows, sheetName, sourceMetadata } = await parseMasterFile(file, file.name, masterKey);
          const mapping = autoMapMasterColumns(rawRows, masterKey) || {};
          let normalizedRows = [];
          let diagnostics = [];

          if (Object.keys(mapping).length > 0) {
            try {
              normalizedRows = normalizeMasterRows(masterKey, rawRows, mapping);
              diagnostics = [{ code: 'VALID', message: 'Auto-mapping validated and applied successfully.' }];
              stateRef.current.importMastersWriteBackStatus = `Successfully uploaded, auto-mapped, and validated ${normalizedRows.length} rows for ${masterKey}.`;
            } catch (error) {
              diagnostics = [{ code: 'INVALID_MAPPING', message: error instanceof Error ? error.message : String(error) }];
              stateRef.current.importMastersWriteBackStatus = `Uploaded ${rawRows.length} rows, but mapping validation failed for ${masterKey}: ${error instanceof Error ? error.message : String(error)}`;
            }
          } else {
            diagnostics = [{ code: 'NO_AUTHORITATIVE_MAPPING', message: 'No authoritative field mapping was found.' }];
            stateRef.current.importMastersWriteBackStatus = `Uploaded ${rawRows.length} rows for ${masterKey}; no authoritative field mapping was found.`;
          }

          masterDataController.commitMasterImport(masterKey, {
            rawRows,
            fieldMap: mapping,
            normalizedRows,
            diagnostics,
            fileName: file.name,
            sheetName,
            sourceMetadata,
          });
          clearDraftMapping(masterKey);
          render();
        } catch (err) {
          stateRef.current.importMastersWriteBackStatus = `Failed to parse file: ${err.message}`;
          render();
        }
      }
    });

    container.appendChild(body);
  };

  // Init
  render();

  return container;
}
