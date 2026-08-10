#!/usr/bin/env node

import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  compileLinearPipingPresentation,
} from '../src/core/linear-piping-presentation/index.js';
import {
  APPLICATION_RESULT_REQUEST_SCHEMA,
  sealLinearPipingQualifiedApplicationResult,
} from '../src/core/linear-piping-code-application/index.js';
import { projectSupportActionTriad } from '../src/core/linear-piping-support-action-triad/index.js';
import {
  createLinearPipingSupportActionWorkbookModel,
  linearPipingSupportActionWorkbook,
  linearPipingSupportActionXlsxBytes,
} from '../src/workspace/linear-piping-support-action-xlsx.js';
import { buildQualifiedPresentationFixture } from './linear-piping-presentation-fixtures.mjs';

function expectCode(body, expectedCode) {
  assert.throws(body, (error) => {
    assert.equal(error?.code, expectedCode, `expected ${expectedCode}, received ${error?.code}`);
    return true;
  });
}

const fixture = buildQualifiedPresentationFixture();
const presentation = compileLinearPipingPresentation(fixture);
const interfaceRow = presentation.interfaceRows[0];
const analysisRow = presentation.analysisRows[0];
const sourceSemanticHash = 'fnv1a64:1234567890abcdef';
const modelVersion = 17;

function action(triad) {
  return {
    entityId: 'support:EXPORT-1',
    nodeId: interfaceRow.nodeId,
    interfaceId: interfaceRow.interfaceId,
    loadCaseId: interfaceRow.loadCaseId,
    physicalLoadCaseHash: analysisRow.physicalLoadCaseHash,
    analysisResultSemanticHash: analysisRow.analysisResultSemanticHash,
    executionHash: analysisRow.executionHash,
    recoverySemanticHash: interfaceRow.recoverySemanticHash,
    triad,
  };
}

const resolvedTriad = projectSupportActionTriad({
  forceGlobal: interfaceRow.forceGlobal,
  tangentGlobal: { x: 1, y: 0, z: 0 },
  upGlobal: { x: 0, y: 0, z: 1 },
  parallelTolerance: 1e-10,
});
const qualifiedInput = {
  presentation,
  applicationResult: fixture.applicationResult,
  sourceSemanticHash,
  modelVersion,
  forceUnit: interfaceRow.units.force,
  actions: [action(resolvedTriad)],
};

const qualifiedModel = createLinearPipingSupportActionWorkbookModel(qualifiedInput);
assert.equal(qualifiedModel.exportEligibility, 'ENGINEERING_EXPORT_ALLOWED');
assert.ok(qualifiedModel.sheets.some((sheet) => sheet.name === 'Engineering Loads'));
assert.ok(qualifiedModel.sheets.some((sheet) => sheet.name === 'Sign-off'));
assert.equal(qualifiedModel.sheets.find((sheet) => sheet.name === 'Engineering Loads').rows[0][4], resolvedTriad.fAxial);
assert.equal(qualifiedModel.sheets.find((sheet) => sheet.name === 'Engineering Loads').rows[0][15], resolvedTriad.semanticHash);

const workbook = linearPipingSupportActionWorkbook(qualifiedInput);
assert.ok(workbook.SheetNames.includes('Engineering Loads'));
const engineeringSheet = workbook.Sheets['Engineering Loads'];
for (const address of ['E2', 'F2', 'G2']) {
  assert.ok(Array.isArray(engineeringSheet[address].c));
  assert.match(engineeringSheet[address].c[0].t, new RegExp(analysisRow.executionHash.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(engineeringSheet[address].c[0].t, new RegExp(interfaceRow.recoverySemanticHash.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(engineeringSheet[address].c[0].t, /Model version: 17/u);
}
const bytes = linearPipingSupportActionXlsxBytes(qualifiedInput);
assert.ok(bytes.byteLength > 1000);

const degenerateTriad = projectSupportActionTriad({
  forceGlobal: interfaceRow.forceGlobal,
  tangentGlobal: { x: 0, y: 0, z: 1 },
  upGlobal: { x: 0, y: 0, z: 1 },
  parallelTolerance: 1e-10,
});
const degenerateModel = createLinearPipingSupportActionWorkbookModel({
  ...qualifiedInput,
  actions: [action(degenerateTriad)],
});
const degenerateRow = degenerateModel.sheets.find((sheet) => sheet.name === 'Engineering Loads').rows[0];
assert.equal(degenerateRow[4], degenerateTriad.fAxial);
assert.equal(degenerateRow[5], null);
assert.equal(degenerateRow[6], null);
assert.equal(degenerateRow[7], 'BLOCKED_AXIS_DEGENERATE');
assert.equal(degenerateRow[8], 'AXIAL_PARALLEL_TO_VERTICAL');
const degenerateWorkbook = linearPipingSupportActionWorkbook({
  ...qualifiedInput,
  actions: [action(degenerateTriad)],
});
assert.notEqual(degenerateWorkbook.Sheets['Engineering Loads'].F2?.v, 0);
assert.notEqual(degenerateWorkbook.Sheets['Engineering Loads'].G2?.v, 0);
assert.match(degenerateWorkbook.Sheets['Engineering Loads'].F2.c[0].t, /BLOCKED_AXIS_DEGENERATE/u);

const conditionalApplication = sealLinearPipingQualifiedApplicationResult({
  schema: APPLICATION_RESULT_REQUEST_SCHEMA,
  applicationId: 'PIPE-PHASE5-CONDITIONAL-XLSX',
  analysisResults: fixture.analysisResults,
  interfaceSet: fixture.interfaceSet,
  interfaceRecoveries: fixture.interfaceRecoveries,
  nozzleAssessments: [],
  b31Application: fixture.b31Application,
});
const conditionalPresentation = compileLinearPipingPresentation({
  ...fixture,
  applicationResult: conditionalApplication,
  nozzleAssessments: [],
});
const conditionalInterface = conditionalPresentation.interfaceRows[0];
const conditionalAnalysis = conditionalPresentation.analysisRows[0];
const conditionalTriad = projectSupportActionTriad({
  forceGlobal: conditionalInterface.forceGlobal,
  tangentGlobal: { x: 1, y: 0, z: 0 },
  upGlobal: { x: 0, y: 0, z: 1 },
  parallelTolerance: 1e-10,
});
const conditionalModel = createLinearPipingSupportActionWorkbookModel({
  presentation: conditionalPresentation,
  applicationResult: conditionalApplication,
  sourceSemanticHash,
  modelVersion,
  forceUnit: conditionalInterface.units.force,
  actions: [{
    entityId: 'support:EXPORT-1',
    nodeId: conditionalInterface.nodeId,
    interfaceId: conditionalInterface.interfaceId,
    loadCaseId: conditionalInterface.loadCaseId,
    physicalLoadCaseHash: conditionalAnalysis.physicalLoadCaseHash,
    analysisResultSemanticHash: conditionalAnalysis.analysisResultSemanticHash,
    executionHash: conditionalAnalysis.executionHash,
    recoverySemanticHash: conditionalInterface.recoverySemanticHash,
    triad: conditionalTriad,
  }],
});
assert.equal(conditionalModel.exportEligibility, 'AUDIT_ONLY_CONDITIONAL');
assert.ok(!conditionalModel.sheets.some((sheet) => sheet.name === 'Engineering Loads'));
assert.ok(!conditionalModel.sheets.some((sheet) => sheet.name === 'Sign-off'));
assert.ok(conditionalModel.sheets.some((sheet) => sheet.name === 'Audit Actions'));
assert.ok(conditionalModel.sheets.some((sheet) => sheet.name === 'Conditional Notice'));
assert.match(conditionalModel.sheets.find((sheet) => sheet.name === 'Cover').rows[1][1], /AUDIT ONLY/u);

expectCode(
  () => createLinearPipingSupportActionWorkbookModel({
    ...qualifiedInput,
    actions: [{ ...action(resolvedTriad), recoverySemanticHash: 'fnv1a64:0000000000000000' }],
  }),
  'PIPING_SUPPORT_ACTION_XLSX_INTERFACE_STALE',
);
expectCode(
  () => createLinearPipingSupportActionWorkbookModel({
    ...qualifiedInput,
    actions: [{ ...action(resolvedTriad), executionHash: 'fnv1a64:0000000000000000' }],
  }),
  'PIPING_SUPPORT_ACTION_XLSX_ANALYSIS_STALE',
);
expectCode(
  () => createLinearPipingSupportActionWorkbookModel({
    ...qualifiedInput,
    applicationResult: conditionalApplication,
  }),
  'PIPING_PRESENTATION_STALE',
);

console.log('linear-piping-support-action-xlsx-check: PASS');
