import { renderStandaloneImportMastersPanel, mappingHealthText } from '../calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js';
import { MASTER_FIELDS } from '../calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-fields-config.js';
import { parseMasterFile, autoMapMasterColumns } from './master-data-events-handler.js';
import { masterDataController } from './master-data-controller.js';
import { normalizeLineList, normalizePipingClass, normalizeWeight, normalizeMaterialMap, isMappedFieldSatisfied, derivationYieldsValues } from './master-data-normalizers.js';
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

/** Masters the Load Calc readiness projection counts as required in Step 4. */
const LOAD_CALC_REQUIRED_MASTERS = Object.freeze(new Set(['lineList', 'pipingClass', 'weight']));

const ACTION_STYLE = Object.freeze({
  badgeBg: '#450a0a', badgeColor: '#fca5a5', borderColor: '#7f1d1d',
});

/**
 * Mirrors the Step 4 readiness rule exactly: a required master counts as ready
 * only with normalized rows and a source hash. The badge names the next actual
 * step, because "imported" and "mapped" are separate states and a loaded file
 * with unmapped columns is still not usable authority.
 */
function masterTabReadiness(master, masterKey, effectiveFieldMap) {
  const ready = Array.isArray(master?.normalizedRows)
    && master.normalizedRows.length > 0
    && typeof master.sourceHash === 'string'
    && master.sourceHash.length > 0;
  if (ready) {
    return {
      code: 'READY',
      badge: '✓',
      badgeBg: '#052e16',
      badgeColor: '#4ade80',
      borderColor: '#166534',
      title: `${master.normalizedRows.length} normalized row(s) with a source hash.`,
    };
  }
  if (!LOAD_CALC_REQUIRED_MASTERS.has(masterKey)) {
    return {
      code: 'OPTIONAL',
      badge: '',
      badgeBg: '',
      badgeColor: '',
      borderColor: '#334155',
      title: 'Optional for this load calculation.',
    };
  }

  const rawRowCount = Array.isArray(master?.rawRows) ? master.rawRows.length : 0;
  if (rawRowCount === 0) {
    return {
      ...ACTION_STYLE,
      code: 'IMPORT',
      badge: 'IMPORT',
      title: 'No rows loaded. Choose a source file or fetch it from a path/URL.',
    };
  }

  const fields = MASTER_FIELDS[masterKey]?.fields || [];
  const fieldMap = effectiveFieldMap || master?.fieldMap || {};
  const requiredFields = fields.filter((field) => field.required);
  const unmapped = requiredFields.filter((field) => !isMappedFieldSatisfied(field, fieldMap));

  // A derivation that yields nothing for every sampled row is not a mapping.
  const brokenDerivation = requiredFields.find((field) => (
    isMappedFieldSatisfied(field, fieldMap)
    && !derivationYieldsValues(field, fieldMap, master?.rawRows)
  ));
  if (unmapped.length === 0 && brokenDerivation) {
    const sourceLabel = fields.find((row) => row.name === brokenDerivation.derivableFrom)?.label
      || brokenDerivation.derivableFrom;
    return {
      ...ACTION_STYLE,
      code: 'MAP',
      badge: 'CHECK',
      title: `${brokenDerivation.label} is set to derive from ${sourceLabel}, but the mapped `
        + `${sourceLabel} column produced no recognised nominal size. Map ${brokenDerivation.label} `
        + `directly, or point ${sourceLabel} at the inch-size column.`,
    };
  }
  if (unmapped.length > 0) {
    const describe = (field) => {
      const alternative = field.derivableFrom
        ? ` (or ${fields.find((row) => row.name === field.derivableFrom)?.label || field.derivableFrom} to derive it)`
        : '';
      return `${field.label || field.name}${alternative}`;
    };
    return {
      ...ACTION_STYLE,
      code: 'MAP',
      badge: `MAP ${requiredFields.length - unmapped.length}/${requiredFields.length}`,
      title: `${rawRowCount} row(s) loaded, but required column(s) are not mapped: `
        + `${unmapped.map(describe).join(', ')}. `
        + 'Use Auto Map Fields or pick the columns, then press Apply Mapping.',
    };
  }

  return {
    ...ACTION_STYLE,
    code: 'APPLY',
    badge: 'APPLY',
    title: `${rawRowCount} row(s) loaded and required columns are mapped, but the mapping `
      + 'has not been applied yet. Press Apply Mapping to normalize the rows.',
  };
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

  // Assigned when the tab bar is built; lets draft edits repaint the badges
  // without a full re-render that would drop focus from the select being used.
  let repaintMasterTabBadges = () => {};

  const clearDraftMapping = (masterKey) => {
    delete stateRef.current.masterDraftMappings[masterKey];
    delete stateRef.current.masterDraftDirty[masterKey];
  };

  const updateVisibleStatus = (message) => {
    stateRef.current.importMastersWriteBackStatus = message;
    const status = container.querySelector('.xml-cii-master-actions .xml-cii-phase-help');
    if (status) status.textContent = message;
  };

  const projectDraftIntoControls = (body, masterKey) => {
    const applyButton = body.querySelector(`[data-action="save-master-mapping"][data-master-key="${masterKey}"]`);
    if (applyButton) applyButton.textContent = '✓ Apply Mapping';

    const draft = stateRef.current.masterDraftMappings[masterKey];
    if (!draft || !stateRef.current.masterDraftDirty[masterKey]) return;
    const selects = body.querySelectorAll(`select[data-master-field-map][data-master-key="${masterKey}"]`);
    selects.forEach((select) => {
      select.value = draft[select.dataset.masterFieldMap] || '';
    });
  };

  const seedDefaultMappings = () => {
    const masters = masterDataController.getMasterData();
    Object.keys(MASTER_FIELDS).forEach((masterKey) => {
      const master = masters?.[masterKey];
      const rawRows = Array.isArray(master?.rawRows) ? master.rawRows : [];
      if (rawRows.length === 0) return;
      if (stateRef.current.masterDraftMappings[masterKey]) return;
      if (Object.keys(master?.fieldMap || {}).length > 0) return;
      const detected = autoMapMasterColumns(rawRows, masterKey);
      if (detected && Object.values(detected).some(Boolean)) {
        setDraftMapping(masterKey, detected);
      }
    });
  };

  const render = () => {
    container.innerHTML = '';

    // Pass only the authoritative legacy context to Preview/calculation. Draft
    // mapping edits are projected into controls separately and cannot invalidate
    // engineering authority until Apply Mapping succeeds.
    stateRef.current.masterContext = masterDataController.getLegacyContext();
    stateRef.current.supportConfigJson = JSON.stringify(stateRef.current.masterContext.config || {});

    // Offer the detected column mapping as the starting draft for any loaded
    // master that has none, so the standard columns are already selected rather
    // than requiring Auto Map to be pressed first. It stays a draft: nothing is
    // committed to engineering authority until Apply Mapping succeeds, and an
    // existing committed or operator-edited mapping is never overwritten.
    seedDefaultMappings();

    // Top Navigation Tabs Bar
    const header = documentRef.createElement('div');
    header.style.cssText = 'display:flex; gap:12px; align-items:center; background:#0f172a; padding:12px 20px; border-bottom:1px solid #1e293b; flex:none; flex-wrap:wrap;';

    const tabs = [
      { id: 'lineList', label: 'Line List' },
      { id: 'pipingClass', label: 'Piping Classes' },
      { id: 'weight', label: 'Weights' },
      { id: 'materialMap', label: 'Material Map' }
    ];

    // Step 4 reports one combined action count, so each sub-tab states its own
    // readiness; otherwise the operator cannot tell which master is missing.
    const masterState = masterDataController.getMasterData();

    // The badge reflects the draft mapping, not just the committed one, so the
    // required-field count responds while columns are still being selected.
    const paintTab = (btn, tab) => {
      const readiness = masterTabReadiness(
        masterState?.[tab.id],
        tab.id,
        draftMappingFor(tab.id),
      );
      btn.textContent = tab.label;
      btn.dataset.masterTab = tab.id;
      btn.dataset.masterTabState = readiness.code;
      btn.title = readiness.title;
      if (readiness.badge) {
        const badge = documentRef.createElement('span');
        badge.textContent = readiness.badge;
        badge.style.cssText = `margin-left:7px; padding:1px 6px; border-radius:999px; font-size:10px; font-weight:800; background:${readiness.badgeBg}; color:${readiness.badgeColor};`;
        btn.appendChild(badge);
      }
      return readiness;
    };
    repaintMasterTabBadges = () => {
      tabs.forEach((tab) => {
        const btn = header.querySelector(`button[data-master-tab="${tab.id}"]`);
        if (btn) paintTab(btn, tab);
      });
      const health = container.querySelector(`[data-mapping-health="${stateRef.current.activeMainTab}"]`);
      if (health) {
        const key = stateRef.current.activeMainTab;
        health.textContent = mappingHealthText(
          key,
          MASTER_FIELDS[key]?.fields || [],
          draftMappingFor(key),
        );
      }
    };

    tabs.forEach(tab => {
      const btn = documentRef.createElement('button');
      const readiness = paintTab(btn, tab);
      const isActive = stateRef.current.activeMainTab === tab.id;
      btn.style.cssText = `
        background: ${isActive ? '#0284c7' : '#1e293b'};
        color: ${isActive ? '#fff' : '#94a3b8'};
        border: 1px solid ${isActive ? '#0284c7' : readiness.borderColor};
        padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;
      `;
      btn.addEventListener('click', () => {
        stateRef.current.activeMainTab = tab.id;
        render();
      });
      header.appendChild(btn);
    });

    const actionsRight = documentRef.createElement('div');
    actionsRight.style.cssText = 'margin-left:auto; display:flex; gap:10px; align-items:center;';

    header.appendChild(actionsRight);
    container.appendChild(header);

    const body = documentRef.createElement('div');
    body.style.cssText = 'flex:1; overflow-y:auto; padding:20px;';

    renderStandaloneImportMastersPanel(body, stateRef.current, stateRef.current.activeMainTab);
    projectDraftIntoControls(body, stateRef.current.activeMainTab);

    // Attach master action events (Upload File, Auto-Map, Apply Mapping)
    body.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;

      if (action === 'load-import-masters') {
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
          projectDraftIntoControls(body, masterKey);
          repaintMasterTabBadges();
          updateVisibleStatus(`Auto-mapped columns for ${masterKey}. Draft only — select Apply Mapping to validate and commit.`);
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
          updateVisibleStatus(`Cannot apply ${masterKey} mapping before an authoritative file is loaded.`);
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
            projectDraftIntoControls(body, masterKey);
            updateVisibleStatus(`Loaded saved mapping "${selectedMappingName}" as a draft for ${masterKey}. Select Apply Mapping to make it authoritative.`);
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
        repaintMasterTabBadges();
        updateVisibleStatus(`Mapping modified for ${masterKey}; draft only — select Apply Mapping to validate and commit.`);
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

  render();
  return container;
}
