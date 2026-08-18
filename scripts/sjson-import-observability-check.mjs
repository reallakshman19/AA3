#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const observer = fs.readFileSync('src/workspace/non-fea-p0-observability.js', 'utf8');
const tree = fs.readFileSync('src/workspace/tree-panel-events.js', 'utf8');
const p0 = fs.readFileSync('e2e/non-fea-p0-current-main-baseline.spec.js', 'utf8');
const contract = fs.readFileSync('scripts/non-fea-baseline/browser-baseline.mjs', 'utf8');

assert.match(observer, /export async function measureNonFeaP0AsyncStage/u);
assert.match(observer, /export function readNonFeaP0OperationCounts/u);
assert.match(observer, /if \(!isNonFeaP0ObservabilityEnabled\(\)\) return callback\(\);/u,
  'disabled timing path must remain a direct callback pass-through');
assert.match(observer, /operationCounts\.set\(stageId, \(operationCounts\.get\(stageId\) \?\? 0\) \+ 1\)/u);

const requiredStages = [
  'SJSON_FILE_READ',
  'SJSON_DECODE',
  'SJSON_PARSE',
  'SJSON_SHA256',
];
for (const stageId of requiredStages) {
  assert.match(tree, new RegExp(`['"]${stageId}['"]`, 'u'), `${stageId} missing from real ingest path`);
  assert.match(p0, new RegExp(`['"]${stageId}['"]`, 'u'), `${stageId} missing from browser assertion`);
}

assert.match(tree, /measureNonFeaP0AsyncStage\(\s*['"]SJSON_FILE_READ['"],\s*\(\) => file\.arrayBuffer\(\)/u);
assert.match(tree, /measureNonFeaP0Stage\(\s*['"]SJSON_DECODE['"],\s*\(\) => decodeJsonBytes\(sourceBytes\)/u);
assert.match(tree, /measureNonFeaP0Stage\(['"]SJSON_PARSE['"], \(\) => JSON\.parse\(text\)\)/u);
assert.match(tree, /measureNonFeaP0AsyncStage\(\s*['"]SJSON_SHA256['"],\s*\(\) => sha256\(sourceBytes\)/u);

assert.match(p0, /operationCounts: timingModule\.readNonFeaP0OperationCounts\(\)/u);
assert.match(p0, /runtime\.operationCounts\[stageId\][\s\S]*?\.toBe\(1\)/u,
  'normal P0 file import must assert one operation per ingest stage');

const governedStages = [
  'THREE_MATERIALIZATION',
  'GPU_SCENE_INSTALL',
  'FIT',
  'FIRST_MEANINGFUL_FRAME',
  'SELECTION',
  'ORBIT_PAN',
];
const contractStageSection = contract.slice(
  contract.indexOf('export const NON_FEA_BROWSER_STAGE_IDS'),
  contract.indexOf(']);', contract.indexOf('export const NON_FEA_BROWSER_STAGE_IDS')) + 3,
);
for (const stageId of governedStages) assert.match(contractStageSection, new RegExp(`['"]${stageId}['"]`, 'u'));
for (const stageId of requiredStages) {
  assert.doesNotMatch(contractStageSection, new RegExp(`['"]${stageId}['"]`, 'u'),
    'measurement-only slice must not migrate governed P0 evidence schema');
}

console.log(JSON.stringify({
  status: 'PASS',
  scope: 'SJSON_IMPORT_OBSERVABILITY_ONLY',
  requiredStages,
  expectedNormalImportOperationCounts: Object.fromEntries(requiredStages.map((id) => [id, 1])),
  governedP0EvidenceSchemaChanged: false,
  engineeringOutputChanged: false,
  hashDomainChanged: false,
}, null, 2));
