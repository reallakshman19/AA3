#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createLfeaPreflightPhase1MasterAuthority,
  LFEA_PREFLIGHT_MASTER_AUTHORITY_FIELDS,
  LFEA_PREFLIGHT_MASTER_AUTHORITY_UNAVAILABLE_FIELDS,
} from '../src/workspace/lfea-preflight-phase1-master-authority.js';
import { createSharedPipingModel } from '../src/core/shared-piping-model/index.js';

const CAPTURED = Object.freeze({
  lineList: '2026-08-11T06:00:00.000Z',
  pipingClass: '2026-08-11T06:01:00.000Z',
  materialMap: '2026-08-11T06:02:00.000Z',
});
const HASH = Object.freeze({
  lineList: 'a'.repeat(64),
  pipingClass: 'b'.repeat(64),
  materialMap: 'c'.repeat(64),
});

const sharedModel = createSharedPipingModel({
  project: { datasetId: 'P06-MASTER-AUTH', name: 'P-06 master authority fixture', sourceName: 'fixture.json' },
  units: { length: 'mm', force: 'N', mass: 'kg' },
  sourceSnapshotRef: {
    schema: 'source-package-snapshot/v1',
    datasetId: 'P06-MASTER-AUTH',
    sourceSchema: 'synthetic-shared-model/v1',
    sourceSemanticHash: 'fnv1a64:1234567890abcdef',
    sourceByteHash: null,
  },
  components: [
    component('PIPE-100', 'S100'),
    component('PIPE-200', 'S200'),
    component('PIPE-300', 'S300'),
  ],
  supports: [],
  sourceReferences: { nodes: [] },
  diagnostics: [],
});

const masterData = fixtureMasters();
const before = structuredClone(masterData);
const first = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData,
  capturedAtByMaster: CAPTURED,
});
const second = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData,
  capturedAtByMaster: CAPTURED,
});

assert.deepEqual(first, second, 'P-06 master authority must be deterministic for identical inputs.');
assert.deepEqual(masterData, before, 'P-06 master authority must not mutate live normalized master state.');
assert.match(first.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.deepEqual(first.availableFieldIds, LFEA_PREFLIGHT_MASTER_AUTHORITY_FIELDS);
assert.deepEqual(first.unavailableFieldIds, LFEA_PREFLIGHT_MASTER_AUTHORITY_UNAVAILABLE_FIELDS);
console.log('P06E-MASTER-01 PASS deterministic read-only authority composition');

const piping100 = record(first.resolutions.pipingClass, 'S100');
assertField(piping100, 'piping.nominalBoreIn', 4, 'RESOLVED_EXACT', 'PIPING_CLASS');
assertField(piping100, 'piping.scheduleCode', 'SCH40', 'RESOLVED_EXACT', 'PIPING_CLASS');
assertField(piping100, 'piping.wallThicknessMm', 6.02, 'RESOLVED_EXACT', 'PIPING_CLASS');
assertField(piping100, 'piping.corrosionAllowanceMm', 1.5, 'RESOLVED_EXACT', 'PIPING_CLASS');
assertField(piping100, 'material.materialName', 'ASTM A106 B', 'RESOLVED_EXACT', 'PIPING_CLASS');
assert.match(field(piping100, 'piping.wallThicknessMm').sourceHash, /^[bc]{64}$/u);
console.log('P06E-MASTER-02 PASS exact class+bore resolves governed section fields with master evidence');

// S200 has two exact class+bore candidates that differ by schedule. The live
// Line List schema has no governed schedule field, so schedule cannot safely
// disambiguate the key. The existing exact resolver must block every projected
// piping-class field instead of selecting a row.
const piping200 = record(first.resolutions.pipingClass, 'S200');
for (const resolvedField of piping200.fields) {
  assert.equal(resolvedField.status, 'BLOCKED_AMBIGUOUS');
  assert.equal(resolvedField.value, null);
  assert.match(resolvedField.matchMethod, /MULTIPLE_ROWS/u);
}
assert.equal(first.resolutions.pipingClass.summary.ambiguousRowCount, 1);
console.log('P06E-MASTER-03 PASS duplicate class+bore rows block; schedule is never guessed');

// A non-numeric wall-thickness token survives representation normalization and
// is rejected by the NUMBER binding as a conflict. It is not converted to zero,
// standard wall, or missing data.
const piping300 = record(first.resolutions.pipingClass, 'S300');
assertField(piping300, 'piping.wallThicknessMm', null, 'BLOCKED_CONFLICT', 'PIPING_CLASS');
assert.ok(field(piping300, 'piping.wallThicknessMm').diagnostics.includes('PIPING_CLASS_FIELD_TYPE_CONFLICT'));
console.log('P06E-MASTER-04 PASS invalid numeric master values remain conflicts, never engineering defaults');

const material100 = record(first.resolutions.materialMap, 'S100');
assertField(material100, 'material.materialCode', 'A106-B', 'RESOLVED_EXACT', 'MATERIAL_REGISTER');
assert.equal(first.snapshots.materialMap.records[0].values.densityKgM3, undefined,
  'Ad-hoc mechanical properties outside the normalized materialMap schema must not become authority.');
for (const unavailable of [
  'material.densityKgM3',
  'material.elasticModulusMpa',
  'material.poissonRatio',
  'material.thermalExpansionPerC',
  'material.referenceAllowableMpa',
]) {
  assert.ok(first.unavailableFieldIds.includes(unavailable));
  assert.equal(material100.fields.some((entry) => entry.field === unavailable), false);
}
console.log('P06E-MASTER-05 PASS material identity resolves exactly while absent mechanical-property authority stays unavailable');

assert.throws(
  () => createLfeaPreflightPhase1MasterAuthority({
    sharedModel,
    masterData: {
      ...masterData,
      pipingClass: { ...masterData.pipingClass, sourceHash: '' },
    },
    capturedAtByMaster: CAPTURED,
  }),
  (error) => error?.code === 'E_P06_MASTER_SOURCE_HASH_REQUIRED',
  'Missing governed source digest must fail closed.',
);
assert.throws(
  () => createLfeaPreflightPhase1MasterAuthority({
    sharedModel,
    masterData,
    capturedAtByMaster: { ...CAPTURED, pipingClass: null },
  }),
  (error) => error?.code === 'E_P06_MASTER_CAPTURE_TIME_REQUIRED',
  'Missing explicit capture time must fail closed rather than reading ambient time.',
);
console.log('P06E-MASTER-06 PASS missing provenance fails closed');

const withoutMaterial = createLfeaPreflightPhase1MasterAuthority({
  sharedModel,
  masterData: { ...masterData, materialMap: { ...masterData.materialMap, normalizedRows: [] } },
  capturedAtByMaster: { ...CAPTURED, materialMap: null },
});
assert.equal(withoutMaterial.snapshots.materialMap, null);
assert.equal(withoutMaterial.resolutions.materialMap, null);
assert.ok(record(withoutMaterial.resolutions.pipingClass, 'S100'));
console.log('P06E-MASTER-07 PASS optional material-map absence does not erase exact piping-class authority');

const source = fs.readFileSync('src/workspace/lfea-preflight-phase1-master-authority.js', 'utf8');
for (const forbidden of [
  'masterDataController',
  'localStorage',
  'sessionStorage',
  'Date.now',
  'new Date()',
  'Math.random',
  'runLinearPiping',
  'solveInputXml',
  'factorization',
  'dispatchEvent',
  'EventBus',
  'document.',
  'window.',
]) {
  assert.equal(source.includes(forbidden), false, `Forbidden authority leak: ${forbidden}`);
}
for (const forbiddenDefault of [
  /wallThickness[^\n]*(?:\?\?|\|\|)\s*0/u,
  /density[^\n]*(?:\?\?|\|\|)\s*(?:7850|8000)/u,
  /elastic[^\n]*(?:\?\?|\|\|)\s*(?:200|210)/u,
  /outsideDiameter[^\n]*nominalBore/u,
]) {
  assert.doesNotMatch(source, forbiddenDefault);
}
assert.match(source, /targetScheduleField:\s*null/u);
assert.match(source, /sourceScheduleField:\s*null/u);
assert.match(source, /createCommonEnrichedPipingClassResolution/u);
assert.match(source, /createCommonEnrichedMaterialResolution/u);
console.log('P06E-MASTER-08 PASS no mutation, solver, browser, clock, or default-property authority');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-master-authority',
  status: 'PASS',
  semanticHash: first.semanticHash,
  pipingClassSummary: first.resolutions.pipingClass.summary,
  materialSummary: first.resolutions.materialMap.summary,
  availableFieldIds: first.availableFieldIds,
  unavailableFieldIds: first.unavailableFieldIds,
}, null, 2));

function fixtureMasters() {
  return {
    lineList: master('line-list.xlsx', 'LineList', HASH.lineList, {
      lineKey: 'LINE', pipingClass: 'CLASS', convertedBore: 'DN',
    }, [
      lineRow(10, 'S100', 'A1', '100'),
      lineRow(11, 'S200', 'B1', 200),
      lineRow(12, 'S300', 'C1', 300),
    ]),
    pipingClass: master('piping-class.xlsx', 'Class', HASH.pipingClass, {
      pipingClass: 'CLASS', convertedBore: 'DN', nps: 'NPS', schedule: 'SCH',
      wallThickness: 'WT', corrosion: 'CA', materialName: 'MATERIAL',
    }, [
      pipingRow(20, 'A1', 100, '4', 'SCH40', '6.02', '1.5', 'ASTM A106 B'),
      pipingRow(21, 'B1', 200, 8, 'SCH40', 8.18, 1.5, 'ASTM A106 B'),
      pipingRow(22, 'B1', 200, 8, 'SCH80', 12.7, 1.5, 'ASTM A106 B'),
      pipingRow(23, 'C1', 300, 12, 'SCH40', 'STD', 2, 'ASTM A312 TP316'),
    ]),
    materialMap: master('materials.xlsx', 'Materials', HASH.materialMap, {
      code: 'CODE', material: 'MATERIAL', spec: 'SPEC',
    }, [
      materialRow(30, 'A106-B', 'ASTM A106 B', 'ASTM A106', { densityKgM3: 7850, elasticModulusMpa: 200000 }),
      materialRow(31, 'A312-TP316', 'ASTM A312 TP316', 'ASTM A312', { densityKgM3: 8000 }),
    ]),
  };
}

function master(fileName, sheetName, sourceHash, fieldMap, normalizedRows) {
  return { fileName, sheetName, sourceHash, byteLength: 4096, fieldMap, normalizedRows, diagnostics: [] };
}

function lineRow(sourceRow, lineKey, pipingClass, convertedBore) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'LineList',
    lineKey,
    lineNoKey: lineKey,
    pipingClass,
    convertedBore,
  };
}

function pipingRow(sourceRow, pipingClass, convertedBore, nps, schedule, wallThickness, corrosion, materialName) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'Class',
    pipingClass,
    convertedBore,
    nps,
    schedule,
    wallThickness,
    corrosion,
    materialName,
  };
}

function materialRow(sourceRow, code, material, spec, extras = {}) {
  return {
    _sourceRowIndex: sourceRow - 1,
    _sourceRowNumber: sourceRow,
    _sourceSheet: 'Materials',
    code,
    material,
    spec,
    ...extras,
  };
}

function component(componentKey, lineId) {
  return {
    componentKey,
    sourceEntityId: componentKey,
    name: componentKey,
    type: 'PIPE',
    identity: { lineId, branchId: `${lineId}/B1`, systemId: '', zoneId: '' },
    geometry: {
      start: null,
      end: null,
      center: null,
      points: [],
      branchPoints: [],
      sources: {},
      sourcePath: `/${componentKey}`,
      ports: [],
    },
    engineeringProperties: {},
    compatibilityEvidence: {},
    sourceReferences: { sourceEntityId: componentKey },
    diagnostics: [],
  };
}

function record(resolution, lineKey) {
  const result = resolution.targetRecords.find((entry) => entry.lineKey === lineKey);
  assert.ok(result, `Missing resolution record for ${lineKey}`);
  return result;
}

function field(targetRecord, fieldId) {
  const result = targetRecord.fields.find((entry) => entry.field === fieldId);
  assert.ok(result, `Missing field ${fieldId}`);
  return result;
}

function assertField(targetRecord, fieldId, value, status, sourceKind) {
  const result = field(targetRecord, fieldId);
  assert.equal(result.value, value, `${fieldId} value`);
  assert.equal(result.status, status, `${fieldId} status`);
  assert.equal(result.sourceKind, sourceKind, `${fieldId} sourceKind`);
  return result;
}
