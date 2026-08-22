#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildLfeaResultsAuthorityPresentation,
} from '../src/workspace/lfea-results-authority/lfea-results-authority-presentation.js';

const analysisCurrent = Object.freeze({
  status: 'CURRENT',
  cases: Object.freeze([
    Object.freeze({ caseId: 'LC-W', executionStatus: 'PASS', blockingChecks: Object.freeze([]) }),
    Object.freeze({
      caseId: 'LC-WP',
      executionStatus: 'BLOCK',
      blockingChecks: Object.freeze([Object.freeze({ checkId: 'RESIDUAL_LIMIT' })]),
    }),
  ]),
});
const analysisEmpty = Object.freeze({ status: 'EMPTY', cases: Object.freeze([]) });

const qualifiedApplicationState = Object.freeze({
  status: 'CURRENT',
  qualificationStatus: 'QUALIFIED',
  exportEligibility: 'ENGINEERING_EXPORT_ALLOWED',
  applicationId: 'APP-1',
  applicationResultSemanticHash: 'APP-HASH',
  presentationSemanticHash: 'PRESENTATION-HASH',
  presentationEvidenceHash: 'PRESENTATION-EVIDENCE',
});
const presentationWithoutCode = Object.freeze({
  applicationId: 'APP-1',
  status: 'QUALIFIED',
  exportEligibility: 'ENGINEERING_EXPORT_ALLOWED',
  currency: 'CURRENT',
  applicationResultSemanticHash: 'APP-HASH',
  semanticHash: 'PRESENTATION-HASH',
  evidenceHash: 'PRESENTATION-EVIDENCE',
  codeRows: Object.freeze([]),
  nozzleRows: Object.freeze([]),
  notConfigured: Object.freeze([]),
  limitations: Object.freeze([]),
});
const presentationWithCode = Object.freeze({
  ...presentationWithoutCode,
  codeRows: Object.freeze([Object.freeze({
    checkId: 'B31-1',
    category: 'SUSTAINED',
    componentId: 'E1',
    codePointId: 'N20',
    combinationId: 'W+P1',
    codeProfileId: 'B31.3-2022',
    calculatedStress: 123456789,
    allowableStress: 200000000,
    utilization: 0.617283945,
    status: 'QUALIFIED',
    semanticHash: 'CODE-HASH-1',
  })]),
  nozzleRows: Object.freeze([Object.freeze({
    interfaceId: 'NZ-1',
    loadCaseId: 'LC-WP',
    assessmentStatus: 'PASS',
    qualificationStatus: 'QUALIFIED',
    utilization: 0.42,
    semanticHash: 'NOZZLE-HASH-1',
  })]),
});

const analysisOnly = buildLfeaResultsAuthorityPresentation({ analysisState: analysisCurrent });
assert.equal(analysisOnly.execution.status, 'CURRENT');
assert.equal(analysisOnly.execution.caseCount, 2);
assert.equal(analysisOnly.execution.blockedCaseCount, 1);
assert.equal(analysisOnly.codeAssessment.status, 'NOT_PERFORMED');
assert.equal(analysisOnly.qualification.availability, 'NOT_AVAILABLE');

const noCodeBefore = JSON.stringify({ analysisCurrent, qualifiedApplicationState, presentationWithoutCode });
const qualifiedWithoutCode = buildLfeaResultsAuthorityPresentation({
  analysisState: analysisCurrent,
  applicationState: qualifiedApplicationState,
  applicationPresentation: presentationWithoutCode,
});
assert.equal(qualifiedWithoutCode.qualification.applicationStatus, 'QUALIFIED');
assert.equal(qualifiedWithoutCode.codeAssessment.status, 'NOT_PERFORMED');
assert.equal(qualifiedWithoutCode.codeAssessment.codeCheckCount, 0);
assert.equal(
  JSON.stringify({ analysisCurrent, qualifiedApplicationState, presentationWithoutCode }),
  noCodeBefore,
  'display projection must not mutate analysis/application inputs',
);

const withCode = buildLfeaResultsAuthorityPresentation({
  analysisState: analysisCurrent,
  applicationState: qualifiedApplicationState,
  applicationPresentation: presentationWithCode,
});
assert.equal(withCode.codeAssessment.status, 'PERFORMED');
assert.equal(withCode.codeAssessment.codeRows[0].calculatedStress, 123456789);
assert.equal(withCode.codeAssessment.codeRows[0].allowableStress, 200000000);
assert.equal(withCode.codeAssessment.codeRows[0].utilization, 0.617283945);
assert.equal(withCode.codeAssessment.codeRows[0].status, 'QUALIFIED');
assert.equal(withCode.codeAssessment.nozzleRows[0].utilization, 0.42);
assert.equal(withCode.qualification.exportEligibility, 'ENGINEERING_EXPORT_ALLOWED');

const stale = buildLfeaResultsAuthorityPresentation({
  analysisState: analysisEmpty,
  applicationState: Object.freeze({ status: 'EMPTY' }),
  applicationPresentation: presentationWithCode,
});
assert.equal(stale.execution.status, 'NOT_CURRENT');
assert.equal(stale.codeAssessment.status, 'NOT_CURRENT');
assert.equal(stale.qualification.availability, 'NOT_CURRENT');
assert.equal(stale.codeAssessment.codeRows.length, 0);

const projectionSource = fs.readFileSync(
  new URL('../src/workspace/lfea-results-authority/lfea-results-authority-presentation.js', import.meta.url),
  'utf8',
);
for (const forbidden of [
  'authorizeLinear', 'runLinear', 'recoverInput', 'compileLinearPipingPresentation',
  'requireLinearPipingQualifiedApplicationResult', 'createQualifiedLinearPipingEngineeringExports',
]) {
  assert.equal(projectionSource.includes(forbidden), false, `results authority projection must not call ${forbidden}`);
}

const panelSource = fs.readFileSync(
  new URL('../src/workspace/lfea-results-authority/lfea-results-authority-panel.js', import.meta.url),
  'utf8',
);
assert.match(panelSource, /getLfeaAnalysisState/u);
assert.match(panelSource, /getLinearPipingResultState/u);
assert.match(panelSource, /getLinearPipingPresentation/u);
assert.match(panelSource, /dataset\.activeStep/u);
assert.equal(panelSource.includes('createLinearPipingEngineeringExportRecords'), false);

const cssSource = fs.readFileSync(
  new URL('../src/workspace/lfea-results-authority/lfea-results-authority.css', import.meta.url),
  'utf8',
);
assert.match(cssSource, /data-active-step="RUN"/u);
assert.match(cssSource, /data-active-step="OUTPUT"/u);
assert.match(cssSource, /data-active-step="EXPORT"/u);
assert.match(cssSource, /linear-piping-results-workbench/u);
assert.match(
  cssSource,
  /data-active-step="RUN"[\s\S]*?linear-piping-prerun-reviewer[\s\S]*?authorize-linear-piping-analysis/u,
  'conditional reviewer controls must remain scoped to the Run presentation',
);

const surfaceSource = fs.readFileSync(
  new URL('../src/workspace/lfea-pipeline-analysis-surface.js', import.meta.url),
  'utf8',
);
assert.match(surfaceSource, /mountLfeaResultsAuthorityPanel/u);

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(
  mainSource,
  /if \(!preRunCheck\.solveAuthorized\) \{[\s\S]*?lfeaPipelineShell\.setActiveStep\('RUN'\);[\s\S]*?pre-run gate WARN[\s\S]*?return;/u,
  'a conditional pre-run WARN must navigate to Run before returning so its reviewer controls are reachable',
);

console.log(JSON.stringify({
  check: 'lfea-ui-results-authority',
  status: 'PASS',
  analysisCodeSeparation: true,
  qualifiedWithoutCodeRemainsNotPerformed: true,
  staleEvidenceFailsClosed: true,
  engineeringValuesCopiedExactly: true,
  preRunWarnReviewReachable: true,
  presentationOnly: true,
}));
