#!/usr/bin/env node

/**
 * Master Data & JSON Trace containment qualification.
 *
 * The original file was a permanent-red defect ledger: every F-001…F-007 entry
 * failed unconditionally, even after the implementation changed. This check
 * measures the governed invariants directly and stays fail-closed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MasterDataController, masterDataRecordKey } from '../src/workspace/master-data-controller.js';
import { normalizeMaterialMap } from '../src/workspace/master-data-normalizers.js';
import { MASTER_FIELDS } from '../src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-fields-config.js';
import {
  buildPreviewSearchIndex,
  getPreviewSearchMetrics,
  resetPreviewSearchMetrics,
} from '../src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-preview-search.js';
import { summarizeStandaloneImportMasters } from '../src/calc-workspace/cii-standalone-port/xml-cii-master-context.js';

const ROOT = path.resolve('.');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const masterUi = read('src/workspace/master-data-ui.js');
const importMasters = read('src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js');
const authorizedConsumer = read('src/workspace/enrichment/authorized-enrichment-consumer-controller.js');
const engineeringController = read('src/workspace/engineering-model-controller.js');
const jsonTrace = read('src/workspace/json-trace-ui.js');
const masterControllerSource = read('src/workspace/master-data-controller.js');

console.log('--- Master Data & JSON Trace Containment Check ---');

function pass(id, description) {
  console.log(`PASS: ${id} - ${description}`);
}

// F-001 — every rendered master upload uses the same data-master-file contract
// consumed by the wrapper change handler.
{
  const summaries = summarizeStandaloneImportMasters({});
  assert.deepEqual(
    summaries.map((row) => row.key),
    ['lineList', 'pipingClass', 'weight', 'materialMap'],
    'F-001: the four master cards must resolve to canonical master keys',
  );
  assert.match(importMasters, /fileInput\.dataset\.masterFile\s*=\s*master\.key/u);
  assert.match(masterUi, /input\[type="file"\]\[data-master-file\]/u);
  assert.match(masterUi, /const masterKey = fileInput\.dataset\.masterFile/u);
  pass('F-001', 'all four upload controls and the wrapper handler share data-master-file');
}

// F-002 — Auto Map and dropdown edits are draft-only. The governed master state
// changes only through an explicit validated mapping commit.
{
  assert.match(masterUi, /const mapping = autoMapMasterColumns\(rawRows, masterKey\)/u);
  assert.match(masterUi, /setDraftMapping\(masterKey, mapping\)/u);
  assert.match(masterUi, /masterDataController\.commitMasterMapping\(masterKey/u);
  const autoMapBlock = masterUi.match(/action === 'auto-map-master-fields'[\s\S]*?} else if \(action === 'save-master-mapping'\)/u)?.[0] || '';
  assert.doesNotMatch(autoMapBlock, /masterDataController\.(?:setFieldMap|setNormalizedRows|commitMasterMapping)/u);
  const dropdownBlock = masterUi.match(/const select = e\.target\.closest\('select\[data-master-field-map\]'\);[\s\S]*?const fileInput/u)?.[0] || '';
  assert.match(dropdownBlock, /setDraftMapping\(masterKey, currentMap\)/u);
  assert.doesNotMatch(dropdownBlock, /masterDataController\.(?:setFieldMap|setNormalizedRows|commitMasterMapping)/u);
  pass('F-002', 'mapping edits remain draft-only until explicit validated Apply Mapping');
}

// F-003 — materialMap is the canonical master key; the legacy standalone
// config intentionally names its nested config bucket "material". Verify the
// bridge rather than requiring both APIs to use an incompatible single name.
{
  assert.equal(MASTER_FIELDS.materialMap.configKey, 'material');
  const events = [];
  const controller = new MasterDataController({ publish: (topic, payload) => events.push({ topic, payload }) });
  controller.setFieldMap('materialMap', { code: 'Code', material: 'Description' });
  const legacy = controller.getLegacyContext();
  assert.deepEqual(legacy.config.material.fieldMap, { code: 'Code', material: 'Description' });
  assert.ok(Object.hasOwn(legacy.rawRows, 'materialMap'));
  assert.ok(Object.hasOwn(legacy.sourceMetadata, 'materialMap'));
  pass('F-003', 'materialMap is canonical and bridges explicitly to legacy config.material');
}

// F-004 — raw source rows and normalized canonical rows are separate stores.
{
  const events = [];
  const controller = new MasterDataController({ publish: (topic, payload) => events.push({ topic, payload }) });
  const rawRows = [{ Code: '1', Description: 'A106 B', _sourceRowNumber: 4, _sourceSheet: 'Materials' }];
  const mapping = { code: 'Code', material: 'Description' };
  controller.setRawRows('materialMap', rawRows, 'materials.csv', 'Materials', { sourceHash: 'sha256:test', byteLength: 12 });
  assert.equal(controller.getMasterData().materialMap.normalizedRows.length, 0,
    'F-004: raw upload must not populate normalized rows');
  const normalized = normalizeMaterialMap(rawRows, mapping);
  controller.setNormalizedRows('materialMap', normalized);
  assert.notStrictEqual(controller.getMasterData().materialMap.rawRows, controller.getMasterData().materialMap.normalizedRows);
  assert.deepEqual(
    controller.getMasterData().materialMap.normalizedRows.map((row) => ({ code: row.code, material: row.material })),
    [{ code: '1', material: 'A106 B' }],
  );
  assert.strictEqual(controller.getMasterData().materialMap.normalizedRows[0]._sourceProvenance, rawRows[0]);
  pass('F-004', 'raw workbook rows remain separate from normalized canonical rows with provenance');
}

// F-005 — the dead dataset.properties.masterDataConfig bypass is retired.
// Production consumption is the authorized empirical consumer, which receives
// the controller's current normalized master state at configuration/execution.
{
  assert.equal(
    fs.existsSync(path.join(ROOT, 'src/workspace/master-data-standalone-adapter.js')),
    false,
    'F-005: orphan master-data standalone adapter must remain retired',
  );
  const workspaceFiles = listJavaScriptFiles(path.join(ROOT, 'src/workspace'));
  for (const file of workspaceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /properties\.masterDataConfig\b/u,
      `F-005: dead dataset masterDataConfig bypass reintroduced in ${path.relative(ROOT, file)}`);
  }
  assert.match(
    authorizedConsumer,
    /configureAuthorizedEmpiricalPackage\([\s\S]*?this\.masterDataController\.getMasterData\(\)/u,
  );
  assert.match(
    authorizedConsumer,
    /executeConfiguredAuthorized\([\s\S]*?this\.masterDataController\.getMasterData\(\)/u,
  );
  pass('F-005', 'dead dataset masterDataConfig bypass is absent; governed consumer owns calculation use');
}

// F-006 — legacy atomic setters still publish through the event bus. This keeps
// existing callers compatible while the UI moves logical imports to one commit.
{
  const published = [];
  const controller = new MasterDataController({ publish: (topic, payload) => published.push({ topic, payload }) });
  controller.setRawRows('lineList', [{ Line: 'L-1' }], 'lines.csv', 'Sheet1', {});
  controller.setFieldMap('lineList', { lineKey1: 'Line' });
  controller.setNormalizedRows('lineList', [{ lineKey: 'L-1' }]);
  assert.deepEqual(
    published.map((row) => [row.topic, row.payload.action]),
    [
      ['MASTER_DATA_UPDATED', 'raw_upload'],
      ['MASTER_DATA_UPDATED', 'mapping_update'],
      ['MASTER_DATA_UPDATED', 'normalized_update'],
    ],
  );
  assert.match(engineeringController, /subscribe\('MASTER_DATA_UPDATED', \(\) => this\.handleMasterDataChanged\(\)\)/u);
  assert.match(engineeringController, /subscribe\('MASTER_DATA_CLEARED', \(\) => this\.handleMasterDataChanged\(\)\)/u);
  assert.match(engineeringController, /markEmpiricalStale\('MASTER_DATA_CHANGED'/u);
  assert.match(engineeringController, /nonFeaCommonInputStore\.markStale\('MASTER_DATA_CHANGED'/u);
  assert.match(engineeringController, /authorizedConsumerController\.refreshEmpirical\(\)/u);
  assert.doesNotMatch(masterControllerSource, /executeConfiguredAuthorized|CALCULATE_REQUESTED/u);
  pass('F-006', 'master edits stale/refresh governed authority through events and never calculate directly');
}

// F-007 — JSON Trace is a projection of the active normalized dataset's source
// evidence. Missing source identity/pointer fails closed as BLOCKED.
{
  assert.match(jsonTrace, /WorkspaceState\.getSnapshot\(\)\?\.dataset/u);
  assert.match(jsonTrace, /const rows = dataset\.entities\.map\(traceRow\)/u);
  assert.match(jsonTrace, /sourceEntityId: entity\.sourceEntityId \?\? ''/u);
  assert.match(jsonTrace, /jsonPointer: entity\.jsonPointer \?\? ''/u);
  assert.match(jsonTrace, /values\.sourceEntityId && values\.jsonPointer \? 'TRACEABLE' : 'BLOCKED'/u);
  assert.doesNotMatch(jsonTrace, /Math\.random|randomUUID|exampleRows|sampleRows|syntheticRows/u);
  pass('F-007', 'JSON Trace projects source evidence and blocks records without source identity/pointer');
}

// F-008 — one logical import produces one runtime master revision, one
// persistence request and one invalidation event. Provenance hash remains a
// separate engineering identity field and is not used as the runtime revision.
{
  const published = [];
  const controller = new MasterDataController({ publish: (topic, payload) => published.push({ topic, payload }) });
  controller.resetPerformanceMetrics();
  controller.commitMasterImport('weight', {
    rawRows: [{ TYPE: 'VALVE', DRY_WT: 42 }],
    fieldMap: { type: 'TYPE', weightKg: 'DRY_WT' },
    normalizedRows: [{ type: 'VALVE', weightKg: 42 }],
    diagnostics: [{ code: 'VALID', message: 'ok' }],
    fileName: 'weights.csv',
    sheetName: 'Weights',
    sourceMetadata: { sourceHash: 'sha256:weights', byteLength: 128 },
  });
  const metrics = controller.getPerformanceMetrics();
  assert.equal(metrics.mutationCommits, 1);
  assert.equal(metrics.persistenceRequests, 1);
  assert.equal(metrics.updateEventsPublished, 1);
  assert.equal(metrics.masterRevisions.weight, 1);
  assert.equal(metrics.masterRevisions.lineList, 0);
  assert.equal(metrics.persistenceRequestsByMaster.weight, 1);
  assert.deepEqual(
    published.map((row) => [row.topic, row.payload.action, row.payload.masterRevision]),
    [['MASTER_DATA_UPDATED', 'import_commit', 1]],
  );
  assert.equal(controller.getMasterData().weight.sourceHash, 'sha256:weights');
  assert.equal(controller.getLegacyContext().sourceMetadata.weight.revision, 1);
  pass('F-008', 'logical master import is one revision / persistence request / invalidation event');
}

// F-009 — large row persistence is isolated by master. The legacy aggregate key
// remains read-compatible for migration, but new writes are addressed per master.
{
  assert.equal(masterDataRecordKey('lineList'), 'masterDataRowsV2:lineList');
  assert.equal(masterDataRecordKey('weight'), 'masterDataRowsV2:weight');
  assert.notEqual(masterDataRecordKey('lineList'), masterDataRecordKey('weight'));
  assert.match(masterControllerSource, /writePersistedMasterRows\(masterKey, snapshot\)/u);
  assert.match(masterControllerSource, /put\(value, masterDataRecordKey\(masterKey\)\)/u);
  assert.match(masterControllerSource, /LEGACY_MASTER_DATA_ROWS_KEY = 'masterDataRowsV1'/u);
  pass('F-009', 'new persistence writes only the changed master while legacy aggregate data remains readable');
}

// F-010 — runtime revisions are monotonic within the process. Clear invalidates
// every master and cannot reset a revision to a value that an old cache may hold.
{
  const published = [];
  const controller = new MasterDataController({ publish: (topic, payload) => published.push({ topic, payload }) });
  const importWeight = (name) => controller.commitMasterImport('weight', {
    rawRows: [{ TYPE: 'VALVE', DRY_WT: 42 }],
    fieldMap: { type: 'TYPE', weightKg: 'DRY_WT' },
    normalizedRows: [{ type: 'VALVE', weightKg: 42 }],
    diagnostics: [],
    fileName: name,
    sheetName: 'Weights',
    sourceMetadata: { sourceHash: `sha256:${name}`, byteLength: 128 },
  });
  importWeight('first.csv');
  const beforeClear = controller.getRevisionSnapshot().weight;
  controller.clear();
  const afterClear = controller.getRevisionSnapshot().weight;
  importWeight('second.csv');
  const afterReload = controller.getRevisionSnapshot().weight;
  assert.ok(afterClear > beforeClear, 'F-010: clear must advance the weight revision');
  assert.ok(afterReload > afterClear, 'F-010: replacement import must advance again');
  const clearEvent = published.find((row) => row.topic === 'MASTER_DATA_CLEARED');
  assert.equal(clearEvent?.payload?.revisions?.weight, afterClear);
  pass('F-010', 'clear and replacement imports preserve monotonic runtime currentness');
}

// F-011 — full preview-search materialization normalizes exactly one row source.
// When canonical rows are present, raw rows are not redundantly normalized.
{
  const canonicalRows = Array.from({ length: 50 }, (_, index) => ({
    type: `VALVE-${index}`,
    weightKg: index,
  }));
  const rawRows = Array.from({ length: 10000 }, (_, index) => ({
    TYPE: `RAW-${index}`,
    DRY_WT: index,
  }));
  resetPreviewSearchMetrics();
  const index = buildPreviewSearchIndex(
    { key: 'weight', rows: canonicalRows },
    {
      supportConfigJson: '{}',
      masterContext: { rawRows: { weight: rawRows } },
    },
  );
  const metrics = getPreviewSearchMetrics();
  assert.equal(index.length, 50);
  assert.equal(metrics.rowBuilds, 1);
  assert.equal(metrics.rowsNormalized, 50,
    'F-011: rawRows must not also be normalized when canonical master.rows exist');
  assert.equal(metrics.searchIndexBuilds, 1);
  assert.equal(metrics.searchTextRows, 50);
  pass('F-011', 'preview search normalizes one authoritative row source and builds search text once');
}

// F-012 — initial Preview render must not materialize the full searchable master.
// The index is created only behind the first non-empty search and cached thereafter.
{
  assert.doesNotMatch(importMasters, /const allRows\s*=\s*buildPreviewSearchRows/u);
  assert.match(importMasters, /let searchIndex = null/u);
  assert.match(importMasters, /if \(!searchIndex\) searchIndex = buildPreviewSearchIndex\(master, state\)/u);
  assert.match(importMasters, /if \(!q\) \{[\s\S]*?replacePreviewRows\(tbodyEl, columns, rows, masterKey, state\)/u);
  assert.match(importMasters, /PREVIEW_SEARCH_DEBOUNCE_MS = 120/u);
  assert.match(importMasters, /PREVIEW_SEARCH_RESULT_LIMIT = 150/u);
  pass('F-012', 'full master preview search is lazy, cached per rendered master and debounced');
}

console.log('\nCONTAINMENT STATUS: PASS.');
console.log('Master Data changes remain authorization-invalidating inputs; JSON Trace remains evidence-only.');

function listJavaScriptFiles(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listJavaScriptFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) result.push(full);
  }
  return result;
}
