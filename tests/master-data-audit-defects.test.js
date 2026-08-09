import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { MasterDataController } from '../src/workspace/master-data-controller.js';
import { normalizeMaterialMap } from '../src/workspace/master-data-normalizers.js';
import { MASTER_FIELDS } from '../src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-fields-config.js';
import { summarizeStandaloneImportMasters } from '../src/calc-workspace/cii-standalone-port/xml-cii-master-context.js';

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');
const masterUi = read('src/workspace/master-data-ui.js');
const importMasters = read('src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js');
const authorizedConsumer = read('src/workspace/enrichment/authorized-enrichment-consumer-controller.js');
const engineeringController = read('src/workspace/engineering-model-controller.js');
const jsonTrace = read('src/workspace/json-trace-ui.js');

test('F-001 | all four upload controls share the canonical data-master-file contract', () => {
  assert.deepEqual(
    summarizeStandaloneImportMasters({}).map((row) => row.key),
    ['lineList', 'pipingClass', 'weight', 'materialMap'],
  );
  assert.match(importMasters, /fileInput\.dataset\.masterFile\s*=\s*master\.key/u);
  assert.match(masterUi, /input\[type="file"\]\[data-master-file\]/u);
});

test('F-002 | Auto Map persists the computed mapping', () => {
  assert.match(masterUi, /const mapping = autoMapMasterColumns\(rawRows, masterKey\)/u);
  assert.match(masterUi, /masterDataController\.setFieldMap\(masterKey, mapping\)/u);
});

test('F-003 | materialMap bridges explicitly to legacy config.material', () => {
  assert.equal(MASTER_FIELDS.materialMap.configKey, 'material');
  const controller = new MasterDataController({ publish() {} });
  controller.setFieldMap('materialMap', { code: 'Code', material: 'Description' });
  const legacy = controller.getLegacyContext();
  assert.deepEqual(legacy.config.material.fieldMap, { code: 'Code', material: 'Description' });
  assert.ok(Object.hasOwn(legacy.rawRows, 'materialMap'));
});

test('F-004 | raw source rows stay separate from normalized canonical rows', () => {
  const controller = new MasterDataController({ publish() {} });
  const rawRows = [{ Code: '1', Description: 'A106 B', _sourceRowNumber: 4, _sourceSheet: 'Materials' }];
  controller.setRawRows('materialMap', rawRows, 'materials.csv', 'Materials', {});
  assert.equal(controller.getMasterData().materialMap.normalizedRows.length, 0);
  const normalized = normalizeMaterialMap(rawRows, { code: 'Code', material: 'Description' });
  controller.setNormalizedRows('materialMap', normalized);
  assert.deepEqual(
    controller.getMasterData().materialMap.normalizedRows.map((row) => ({ code: row.code, material: row.material })),
    [{ code: '1', material: 'A106 B' }],
  );
  assert.strictEqual(controller.getMasterData().materialMap.normalizedRows[0]._sourceProvenance, rawRows[0]);
});

test('F-005 | dead dataset masterDataConfig bypass is retired', () => {
  assert.equal(fs.existsSync(path.resolve('src/workspace/master-data-standalone-adapter.js')), false);
  assert.match(
    authorizedConsumer,
    /configureAuthorizedEmpiricalPackage\([\s\S]*?this\.masterDataController\.getMasterData\(\)/u,
  );
  assert.match(
    authorizedConsumer,
    /executeConfiguredAuthorized\([\s\S]*?this\.masterDataController\.getMasterData\(\)/u,
  );
});

test('F-006 | master edits invalidate governed authority through the event bus', () => {
  const published = [];
  const controller = new MasterDataController({ publish: (topic, payload) => published.push({ topic, payload }) });
  controller.setRawRows('lineList', [{ Line: 'L-1' }], 'lines.csv', 'Sheet1', {});
  controller.setFieldMap('lineList', { lineKey1: 'Line' });
  controller.setNormalizedRows('lineList', [{ lineKey: 'L-1' }]);
  assert.deepEqual(published.map((row) => row.payload.action), ['raw_upload', 'mapping_update', 'normalized_update']);
  assert.match(engineeringController, /subscribe\('MASTER_DATA_UPDATED', \(\) => this\.handleMasterDataChanged\(\)\)/u);
  assert.match(engineeringController, /markEmpiricalStale\('MASTER_DATA_CHANGED'/u);
  assert.match(engineeringController, /authorizedConsumerController\.refreshEmpirical\(\)/u);
});

test('F-007 | JSON Trace uses source evidence and fails closed when evidence is incomplete', () => {
  assert.match(jsonTrace, /const rows = dataset\.entities\.map\(traceRow\)/u);
  assert.match(jsonTrace, /sourceEntityId: entity\.sourceEntityId \?\? ''/u);
  assert.match(jsonTrace, /jsonPointer: entity\.jsonPointer \?\? ''/u);
  assert.match(jsonTrace, /values\.sourceEntityId && values\.jsonPointer \? 'TRACEABLE' : 'BLOCKED'/u);
  assert.doesNotMatch(jsonTrace, /Math\.random|randomUUID|exampleRows|sampleRows|syntheticRows/u);
});
