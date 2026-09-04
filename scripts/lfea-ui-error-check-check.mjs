#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildLfeaErrorCheckPresentation,
  selectLfeaErrorCheckSections,
} from '../src/workspace/lfea-diagnostics/lfea-error-check-presentation.js';

const findings = Object.freeze([
  finding('F-SOURCE', 'SOURCE_NOTE', 'SOURCE', 'PASS', 'INFO', 'Source evidence retained.'),
  finding('F-GEO', 'GEOMETRY_NOTE', 'GEOMETRY', 'ADVISORY', 'ERROR', 'Text says BLOCK but disposition remains advisory.'),
  finding('F-REST', 'RESTRAINT_LIMIT', 'RESTRAINT', 'CONDITIONAL', 'INFO', 'Review restraint limitation.'),
  finding('F-LOAD', 'PRESSURE_BLOCK', 'PRESSURE', 'BLOCK', 'INFO', 'Pressure authority is incomplete.'),
  finding('F-OTHER', 'VENDOR_EXTENSION', 'VENDOR_PRIVATE_CATEGORY', 'ADVISORY', 'WARNING', 'Vendor-specific source note.'),
]);
const preFlight = makePreFlight(findings);
const before = JSON.stringify(preFlight);

const inputXml = buildLfeaErrorCheckPresentation(preFlight, {
  sourceKind: 'INPUTXML',
  sourceIdentityKey: 'INPUTXML:demo.xml',
  fileName: 'demo.xml',
});
const accdb = buildLfeaErrorCheckPresentation(preFlight, {
  sourceKind: 'ACCDB',
  sourceIdentityKey: 'ACCDB:demo.accdb',
  fileName: 'demo.accdb',
});

assert.equal(inputXml.findingCount, findings.length);
assert.deepEqual(inputXml.counts, { PASS: 1, ADVISORY: 2, CONDITIONAL: 1, BLOCK: 1 });
assert.deepEqual(inputXml.rows.map((row) => row.findingId).sort(), findings.map((row) => row.findingId).sort());
assert.equal(new Set(inputXml.rows.map((row) => row.findingId)).size, findings.length);
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-GEO').presentationLevel, 'info');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-GEO').disposition, 'ADVISORY');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-REST').presentationLabel, 'Review and accept');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-LOAD').presentationLabel, 'Stops the analysis');

assert.equal(inputXml.rows.find((row) => row.findingId === 'F-SOURCE').engineeringCategoryId, 'SOURCE_AND_UNITS');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-GEO').engineeringCategoryId, 'GEOMETRY_AND_TOPOLOGY');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-REST').engineeringCategoryId, 'RESTRAINTS_AND_SUPPORTS');
assert.equal(inputXml.rows.find((row) => row.findingId === 'F-LOAD').engineeringCategoryId, 'LOADS_PRESSURE_THERMAL');
const unknown = inputXml.rows.find((row) => row.findingId === 'F-OTHER');
assert.equal(unknown.engineeringCategoryId, 'OTHER_UNCLASSIFIED');
assert.equal(unknown.governedCategory, 'VENDOR_PRIVATE_CATEGORY');

const inputProjection = inputXml.rows.map(stableProjection);
const accdbProjection = accdb.rows.map(stableProjection);
assert.deepEqual(accdbProjection, inputProjection);
assert.equal(inputXml.source.kind, 'INPUTXML');
assert.equal(accdb.source.kind, 'ACCDB');

const restraintSections = selectLfeaErrorCheckSections(inputXml, 'RESTRAINTS_AND_SUPPORTS');
assert.equal(restraintSections.length, 1);
assert.deepEqual(restraintSections[0].rows.map((row) => row.findingId), ['F-REST']);
assert.equal(selectLfeaErrorCheckSections(inputXml, 'ALL').length, inputXml.sections.length);
assert.throws(
  () => selectLfeaErrorCheckSections(inputXml, 'MADE_UP_CATEGORY'),
  /Unknown Error Check engineering category/u,
);

assert.equal(JSON.stringify(preFlight), before, 'presentation/category selection must not mutate pre-flight state');

const duplicate = makePreFlight([
  finding('F-DUP', 'ONE', 'GEOMETRY', 'PASS', 'INFO', 'one'),
  finding('F-DUP', 'TWO', 'LOAD', 'BLOCK', 'ERROR', 'two'),
]);
assert.throws(
  () => buildLfeaErrorCheckPresentation(duplicate),
  /Duplicate governed finding id F-DUP/u,
);

const presentationSource = fs.readFileSync(
  new URL('../src/workspace/lfea-diagnostics/lfea-error-check-presentation.js', import.meta.url),
  'utf8',
);
const panelSource = fs.readFileSync(
  new URL('../src/workspace/lfea-diagnostics/lfea-error-check-panel.js', import.meta.url),
  'utf8',
);
const cssSource = fs.readFileSync(
  new URL('../src/workspace/lfea-diagnostics/lfea-error-check.css', import.meta.url),
  'utf8',
);
const surfaceSource = fs.readFileSync(
  new URL('../src/workspace/lfea-pipeline-analysis-surface.js', import.meta.url),
  'utf8',
);
const acquisitionCss = fs.readFileSync(
  new URL('../src/workspace/lfea-source-acquisition.css', import.meta.url),
  'utf8',
);
const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const accdbPanelSource = fs.readFileSync(
  new URL('../src/workspace/lfea-pipeline-accdb-input-panel.js', import.meta.url),
  'utf8',
);

assert.match(presentationSource, /buildLfeaDiagnosticPresentation\(preFlight, options\)/u);
assert.doesNotMatch(presentationSource, /capabilityEffects|message\.includes|severity\s*===/u);
assert.doesNotMatch(
  panelSource,
  /authorizeLinearPiping|limitationsAccepted|setSource\(|clearSource\(|conditionGeometry|compileLinear|runLinear|preFlight\.solveAuthorized\s*=|presentation\.solveAuthorized\s*=/u,
);
assert.match(panelSource, /selectLfeaErrorCheckSections\(this\.presentation, this\.activeCategory\)/u);
assert.match(panelSource, /dataset\.action = 'lfea-error-check-acknowledge-limitation'/u);
assert.match(panelSource, /dataset\.action = 'authorize-lfea-error-check-limitations'/u);
assert.match(panelSource, /this\.options\.onAuthorizePreFlight\(\{/u);
assert.match(surfaceSource, /mountLfeaCommonErrorCheckPanel/u);
assert.match(surfaceSource, /onAuthorizePreFlight: options\.onAuthorizePreFlight/u);
assert.match(surfaceSource, /errorCheckPanel\.refresh\(\)/u);
assert.match(surfaceSource, /errorCheckPanel\.destroy\(\)/u);
assert.match(mainSource, /function authorizeActiveLfeaPreFlight\(approval\)/u);
assert.match(mainSource, /linearPipingInputXmlSource\.authorizePreFlight\(approval\)/u);
assert.match(mainSource, /lfeaAccdbInputPanel\.authorizePreFlight\(approval\)/u);
assert.match(accdbPanelSource, /authorizeLinearPipingInputXmlPreFlight\(this\.preFlight, approval\)/u);
assert.match(acquisitionCss, /@import '\.\/lfea-diagnostics\/lfea-error-check\.css';/u);
assert.match(cssSource, /linear-piping-inputxml-governed-diagnostics/u);
assert.match(cssSource, /lfea-pipeline-accdb-capabilities/u);
assert.match(cssSource, /\[data-role="lfea-pipeline-accdb-acceptance"\][^{]*\{\s*display:\s*none/u);
assert.match(cssSource, /\[data-action="authorize-linear-piping-inputxml-prefea"\]/u);
assert.match(cssSource, /\.lfea-common-error-check__authorization\s*\{/u);

console.log(JSON.stringify({
  check: 'lfea-ui-error-check',
  status: 'PASS',
  findingCount: inputXml.findingCount,
  sectionCount: inputXml.sections.length,
  unknownCategory: unknown.engineeringCategoryId,
}));

function finding(findingId, code, category, disposition, severity, message) {
  return Object.freeze({
    findingId,
    code,
    category,
    disposition,
    severity,
    message,
    technicalBasis: `${code} basis`,
    remediation: `${code} remediation`,
    sourceFeatureIds: Object.freeze([`${findingId}:SOURCE`]),
    sourcePaths: Object.freeze([]),
    canonicalEntityIds: Object.freeze([`${findingId}:CANONICAL`]),
    physicalCaseIds: Object.freeze([]),
    approximationEligible: disposition === 'CONDITIONAL',
    authorizationRequired: disposition === 'CONDITIONAL',
  });
}

function makePreFlight(rows) {
  return {
    status: rows.some((row) => row.disposition === 'BLOCK') ? 'BLOCK' : 'WARN',
    solveAuthorized: false,
    diagnostics: {
      semanticHash: 'diag-semantic',
      evidenceHash: 'diag-evidence',
      summary: {
        requestedProfileId: 'LINEAR_PIPING_DISCLOSED_APPROX_V1',
        sourceNodeCount: 6,
        sourceElementCount: 5,
        blockedCapabilityIds: ['LOAD_CAPABILITY'],
        conditionalCapabilityIds: ['RESTRAINT_CAPABILITY'],
        authorizedCapabilityIds: ['GEOMETRY_CAPABILITY'],
      },
      topologyDiagnostics: { status: 'PASS' },
      proximityDiagnostics: { status: 'PASS' },
      representabilityDiagnostics: { status: 'WARN' },
    },
    preparation: {
      status: rows.some((row) => row.disposition === 'BLOCK') ? 'BLOCK' : 'WARN',
      semanticHash: 'prep-semantic',
      evidenceHash: 'prep-evidence',
      findings: rows,
    },
  };
}

function stableProjection(row) {
  return {
    findingId: row.findingId,
    governedCategory: row.governedCategory,
    engineeringCategoryId: row.engineeringCategoryId,
    disposition: row.disposition,
    presentationLevel: row.presentationLevel,
    presentationLabel: row.presentationLabel,
  };
}
