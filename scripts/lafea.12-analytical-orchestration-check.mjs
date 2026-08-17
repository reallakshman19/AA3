import assert from 'node:assert/strict';
import { sourceFixture as lafea1Fixture } from './lafea.1-fixtures.mjs';
import { screeningRequestFixture as lafea2Fixture } from './lafea.2-fixtures.mjs';
import { lafeaDocumentDigest } from '../src/workspace/lafea-edit-command.js';
import {
  applyLafeaScreeningTermFactorCommand,
  createLafeaScreeningTermFactorCommand,
} from '../src/workspace/lafea-screening-term-edit.js';
import { createLafeaWorkbenchOrchestratorStore } from '../src/workspace/lafea-workbench-orchestrator-store.js';

const foundation = createLafeaWorkbenchOrchestratorStore({
  initialStage: 'LAFEA.1',
  initialDocument: lafea1Fixture(),
});
let state = foundation.getState();
assert.equal(state.stages['LAFEA.1'].orchestration.sections.AUTHORIZATION.state, 'READY');
assert.equal(state.stages['LAFEA.1'].orchestration.sections.DISCRETIZATION.state, 'COMPLETE');
assert.ok(state.stages['LAFEA.1'].orchestration.sections.DISCRETIZATION.reasons.includes('ANALYSIS_MESH_NOT_APPLICABLE'));
assert.equal(state.stages['LAFEA.1'].execution, null);
foundation.run();
state = foundation.getState();
assert.equal(state.stages['LAFEA.1'].execution?.status, 'QUALIFIED');
assert.equal(state.stages['LAFEA.1'].orchestration.sections.EXECUTION.state, 'COMPLETE');
assert.equal(state.stages['LAFEA.1'].orchestration.sections.RESULTS.state, 'COMPLETE');
foundation.destroy();

const screening = createLafeaWorkbenchOrchestratorStore({
  initialStage: 'LAFEA.2',
  initialDocument: lafea2Fixture(),
});
state = screening.getState();
assert.equal(state.stages['LAFEA.2'].orchestration.sections.AUTHORIZATION.state, 'READY');
assert.equal(state.stages['LAFEA.2'].orchestration.sections.PREPARATION.state, 'COMPLETE');
assert.ok(state.stages['LAFEA.2'].orchestration.sections.PREPARATION.reasons.includes('ANALYTICAL_PREPARATION_NOT_APPLICABLE'));

const documentValue = state.stages['LAFEA.2'].document;
const edit = applyLafeaScreeningTermFactorCommand(documentValue, createLafeaScreeningTermFactorCommand({
  commandId: 'LAFEA12-ORCHESTRATION-TERM-EDIT',
  expectedDocumentDigest: lafeaDocumentDigest(documentValue),
  screeningCaseId: 'CASE-B',
  loadCaseId: 'LC-A',
  rawText: '0.25',
  origin: { surface: 'REGRESSION', sessionId: 'LAFEA12-ORCHESTRATION', sequence: 1 },
}));
assert.equal(edit.status, 'APPLIED');
screening.replaceDocument(edit.document, 'LAFEA2_SCREENING_TERM_FORM');
state = screening.getState();
assert.equal(state.stages['LAFEA.2'].execution, null);
assert.equal(state.stages['LAFEA.2'].orchestration.sections.AUTHORIZATION.state, 'READY');

screening.run();
state = screening.getState();
const stage = state.stages['LAFEA.2'];
assert.equal(stage.execution?.status, 'QUALIFIED');
assert.equal(stage.orchestration.sections.EXECUTION.state, 'COMPLETE');
assert.equal(stage.orchestration.sections.RESULTS.state, 'COMPLETE');
const caseB = stage.execution.result.screeningCases.find((row) => row.screeningCaseId === 'CASE-B');
assert.deepEqual(caseB.combinedForceLocal, [-750, -25, 137.5]);
assert.deepEqual(caseB.combinedMomentLocal, [-2750, -5000, 27500]);
screening.destroy();

console.log(JSON.stringify({
  check: 'lafea.1-2-analytical-orchestration',
  status: 'PASS',
  analyticalPreparationGate: 'NOT_APPLICABLE',
  meshGate: 'NOT_APPLICABLE',
  calculationAuthorizationBeforeFirstRun: true,
  calculationAuthorizationAfterEdit: true,
  caseBCombinedForceLocal: caseB.combinedForceLocal,
  caseBCombinedMomentLocal: caseB.combinedMomentLocal,
}));
