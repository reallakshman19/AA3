#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  compileLinearPipingPresentation,
  createLinearPipingAuditJsonExport,
  createQualifiedLinearPipingEngineeringExports,
  requireLinearPipingPresentation,
} from '../src/core/linear-piping-presentation/index.js';
import {
  APPLICATION_RESULT_REQUEST_SCHEMA,
  sealLinearPipingQualifiedApplicationResult,
} from '../src/core/linear-piping-code-application/index.js';
import { renderLinearPipingResultsView } from '../src/workspace/linear-piping-results-view.js';
import { buildQualifiedPresentationFixture } from './linear-piping-presentation-fixtures.mjs';

function test(id, name, body) {
  body();
  console.log(`${id} PASS ${name}`);
}

function expectCode(body, expectedCode) {
  assert.throws(body, (error) => {
    assert.equal(error?.code, expectedCode, `expected ${expectedCode}, received ${error?.code}`);
    return true;
  });
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.scope = '';
    this.colSpan = 1;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  get childElementCount() {
    return this.children.length;
  }
}

function flattenText(node) {
  return [node.textContent, ...node.children.map(flattenText)].join(' ');
}

const fixture = buildQualifiedPresentationFixture();
const presentation = compileLinearPipingPresentation(fixture);

console.log('\n--- [SIMULATED] Linear piping Phase 5 presentation and export checks ---');

test('P5-PRES-01', 'Current application chain compiles into a read-only qualified presentation', () => {
  assert.equal(fixture.applicationResult.status, 'QUALIFIED');
  assert.equal(presentation.currency, 'CURRENT');
  assert.equal(presentation.status, 'QUALIFIED');
  assert.equal(presentation.exportEligibility, 'ENGINEERING_EXPORT_ALLOWED');
  assert.equal(presentation.summary.analysisCount, 1);
  assert.equal(presentation.summary.interfaceResultCount, 1);
  assert.equal(presentation.summary.nozzleAssessmentCount, 1);
  assert.equal(presentation.summary.codeCheckCount, 1);
  assert.equal(requireLinearPipingPresentation(presentation).semanticHash, presentation.semanticHash);
});

test('P5-PRES-02', 'Presentation rows retain units, basis, sign and direct evidence identities', () => {
  const interfaceRow = presentation.interfaceRows[0];
  const codeRow = presentation.codeRows[0];
  const b31Entry = fixture.b31Application.results[0];
  const sourceBinding = fixture.b31Application.caseBindings.find(
    (binding) => binding.caseId === 'OPERATING_CASE',
  );
  assert.ok(sourceBinding, 'qualified fixture must retain the OPERATING_CASE binding');
  assert.equal(interfaceRow.reportingSignConvention, 'FORCE_ON_INTERFACE_FROM_PIPE');
  assert.deepEqual(interfaceRow.units, { force: 'N', moment: 'N*m', length: 'm' });
  assert.equal(interfaceRow.recoverySemanticHash, fixture.interfaceRecoveries[0].semanticHash);
  assert.equal(interfaceRow.recoveryEvidenceHash, fixture.interfaceRecoveries[0].evidenceHash);
  assert.equal(presentation.nozzleRows[0].profileSemanticHash, fixture.nozzleAssessments[0].profileSemanticHash);
  assert.deepEqual(codeRow.sourceRecoveryHashes, [fixture.analysisResults[0].recovery.semanticHash]);
  assert.equal(codeRow.codeProfileId, b31Entry.codeResult.codeProfileId);
  assert.equal(codeRow.codeProfileSemanticHash, fixture.b31Application.codeProfileSemanticHash);
  assert.equal(codeRow.editionDatasetSemanticHash, fixture.b31Application.editionDatasetSemanticHash);
  assert.deepEqual(codeRow.sourceCaseIds, ['OPERATING_CASE']);
  assert.deepEqual(codeRow.sourcePhysicalLoadCaseHashes, [sourceBinding.physicalLoadCaseHash]);
});

test('P5-PRES-03', 'Input array order does not change presentation identity', () => {
  const second = compileLinearPipingPresentation({
    ...fixture,
    analysisResults: [...fixture.analysisResults].reverse(),
    interfaceRecoveries: [...fixture.interfaceRecoveries].reverse(),
    nozzleAssessments: [...fixture.nozzleAssessments].reverse(),
  });
  assert.equal(second.semanticHash, presentation.semanticHash);
  assert.equal(second.evidenceHash, presentation.evidenceHash);
});

test('P5-PRES-04', 'Missing current analysis parent is rejected before presentation', () => {
  expectCode(
    () => compileLinearPipingPresentation({ ...fixture, analysisResults: [] }),
    'PIPING_PRESENTATION_ANALYSIS_STALE',
  );
});

test('P5-EXP-01', 'Current audit JSON is deterministic and retains the qualification state', () => {
  const first = createLinearPipingAuditJsonExport(presentation, fixture.applicationResult);
  const second = createLinearPipingAuditJsonExport(presentation, fixture.applicationResult);
  assert.equal(first.content, second.content);
  assert.equal(first.contentHash, second.contentHash);
  assert.equal(first.qualificationStatus, 'QUALIFIED');
  assert.match(first.content, /"currency": "CURRENT"/u);
  assert.ok(first.content.endsWith('\n'));
});

test('P5-EXP-02', 'Qualified interface, nozzle and B31 CSV exports are byte deterministic', () => {
  const first = createQualifiedLinearPipingEngineeringExports(presentation, fixture.applicationResult);
  const second = createQualifiedLinearPipingEngineeringExports(presentation, fixture.applicationResult);
  assert.equal(first.length, 3);
  assert.deepEqual(
    first.map((row) => ({ role: row.role, contentHash: row.contentHash, content: row.content })),
    second.map((row) => ({ role: row.role, contentHash: row.contentHash, content: row.content })),
  );
  const interfaceExport = first.find((row) => row.role === 'INTERFACE_LOADS_CSV');
  const nozzleExport = first.find((row) => row.role === 'NOZZLE_ASSESSMENTS_CSV');
  const codeExport = first.find((row) => row.role === 'B31_CODE_RESULTS_CSV');
  assert.ok(interfaceExport);
  assert.ok(nozzleExport);
  assert.ok(codeExport);
  assert.match(interfaceExport.content, /recovery_evidence_hash/u);
  assert.match(nozzleExport.content, /assessment_evidence_hash/u);
  assert.match(codeExport.content, /source_recovery_hashes/u);
  assert.match(codeExport.content, /code_profile_id/u);
  assert.match(codeExport.content, /code_profile_hash/u);
  assert.match(codeExport.content, /edition_dataset_hash/u);
  assert.match(codeExport.content, /source_case_ids/u);
  assert.match(codeExport.content, /source_physical_load_case_hashes/u);
  assert.ok(codeExport.content.includes(presentation.codeRows[0].codeProfileId));
  assert.ok(codeExport.content.includes(presentation.codeRows[0].codeProfileSemanticHash));
  assert.ok(codeExport.content.includes(presentation.codeRows[0].editionDatasetSemanticHash));
  assert.ok(codeExport.content.includes(presentation.codeRows[0].sourceCaseIds[0]));
  assert.ok(codeExport.content.includes(presentation.codeRows[0].sourcePhysicalLoadCaseHashes[0]));
});

test('P5-EXP-03', 'Conditional current result remains audit-visible but engineering issue export is blocked', () => {
  const conditionalApplication = sealLinearPipingQualifiedApplicationResult({
    schema: APPLICATION_RESULT_REQUEST_SCHEMA,
    applicationId: 'PIPE-PHASE5-CONDITIONAL',
    analysisResults: fixture.analysisResults,
    interfaceSet: fixture.interfaceSet,
    interfaceRecoveries: fixture.interfaceRecoveries,
    nozzleAssessments: [],
    b31Application: fixture.b31Application,
  });
  const conditionalInput = {
    ...fixture,
    applicationResult: conditionalApplication,
    nozzleAssessments: [],
  };
  const conditionalPresentation = compileLinearPipingPresentation(conditionalInput);
  assert.equal(conditionalPresentation.status, 'CONDITIONAL');
  assert.equal(conditionalPresentation.exportEligibility, 'AUDIT_ONLY_CONDITIONAL');
  assert.match(
    createLinearPipingAuditJsonExport(conditionalPresentation, conditionalApplication).content,
    /NOZZLE_ALLOWABLE_NOT_CONFIGURED/u,
  );
  expectCode(
    () => createQualifiedLinearPipingEngineeringExports(conditionalPresentation, conditionalApplication),
    'PIPING_PRESENTATION_ENGINEERING_EXPORT_BLOCKED',
  );
});

test('P5-EXP-04', 'A previously valid presentation is rejected against a different current application', () => {
  const conditionalApplication = sealLinearPipingQualifiedApplicationResult({
    schema: APPLICATION_RESULT_REQUEST_SCHEMA,
    applicationId: 'PIPE-PHASE5-STALE-TARGET',
    analysisResults: fixture.analysisResults,
    interfaceSet: fixture.interfaceSet,
    interfaceRecoveries: fixture.interfaceRecoveries,
    nozzleAssessments: [],
    b31Application: fixture.b31Application,
  });
  expectCode(
    () => createLinearPipingAuditJsonExport(presentation, conditionalApplication),
    'PIPING_PRESENTATION_STALE',
  );
});

test('P5-PRES-05', 'Tampered presentation evidence is rejected independently', () => {
  const tampered = structuredClone(presentation);
  tampered.analysisRows[0].evidenceHash = 'fnv1a64:0000000000000000';
  expectCode(() => requireLinearPipingPresentation(tampered), 'PIPING_PRESENTATION_HASH_MISMATCH');
});

test('P5-UI-01', 'Workspace renderer consumes sealed current B31 provenance without mechanics', () => {
  const documentRef = new FakeDocument();
  const root = new FakeElement('div', documentRef);
  const view = renderLinearPipingResultsView(root, presentation, fixture.applicationResult);
  const rendered = flattenText(view);
  const codeRow = presentation.codeRows[0];
  assert.equal(root.children.length, 1);
  assert.equal(view.dataset.currency, 'CURRENT');
  assert.equal(view.dataset.status, 'QUALIFIED');
  assert.equal(view.dataset.exportEligibility, 'ENGINEERING_EXPORT_ALLOWED');
  assert.ok(rendered.includes('B31.3 application results'));
  assert.ok(rendered.includes(fixture.interfaceRecoveries[0].semanticHash));
  assert.ok(rendered.includes(codeRow.codeProfileId));
  assert.ok(rendered.includes(codeRow.codeProfileSemanticHash));
  assert.ok(rendered.includes(codeRow.editionDatasetSemanticHash));
  assert.ok(rendered.includes(codeRow.sourceCaseIds[0]));
  assert.ok(rendered.includes(codeRow.sourcePhysicalLoadCaseHashes[0]));
});

console.log('Linear piping Phase 5 presentation and export checks PASS');
