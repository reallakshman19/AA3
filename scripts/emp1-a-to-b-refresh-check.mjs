import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import {
  MODEL_SCHEMA,
  calculateLocalAttachmentFoundation,
  createCanonicalLocalAttachmentFoundationModel,
} from '../src/core/local-stress/index.js';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  classifyEmp1BSourceCustody,
  evaluateEmp1BSourceRefresh,
  refreshEmp1BSourceEvidence,
} from '../src/core/emp1/emp1-a-to-b-refresh.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';

const originalB = screeningRequestFixture();
const currentA = changedCompatibleA(originalB.sourceEvidence.foundationModel);
const currentAResult = calculateLocalAttachmentFoundation(currentA);
const currentAExecution = qualifiedAExecution(currentA, currentAResult);

const stale = classifyEmp1BSourceCustody({
  aDocument: currentA,
  aExecution: currentAExecution,
  bDocument: originalB,
});
assert.equal(stale.state, EMP1_B_SOURCE_CUSTODY_STATES.STALE_REFRESH_AVAILABLE);
assert.equal(stale.canRefresh, true);

const preservedFactor = originalB.screeningCases
  .find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms
  .find((row) => row.loadCaseId === 'LC-A').factor;
const refreshedB = refreshEmp1BSourceEvidence({
  aDocument: currentA,
  aExecution: currentAExecution,
  bDocument: originalB,
});
assert.equal(
  refreshedB.screeningCases.find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms
    .find((row) => row.loadCaseId === 'LC-A').factor,
  preservedFactor,
  'A-to-B refresh must preserve B-owned screening factors.',
);
assert.equal(semanticHash(refreshedB.sourceEvidence.foundationModel), semanticHash(currentA));
assert.equal(semanticHash(refreshedB.sourceEvidence.foundationResult), semanticHash(currentAResult));
assert.equal(semanticHash(refreshedB.screeningCases), semanticHash(originalB.screeningCases));
assert.equal(semanticHash(refreshedB.resultRequests), semanticHash(originalB.resultRequests));
assert.equal(semanticHash(refreshedB.qualificationProfile), semanticHash(originalB.qualificationProfile));

const current = classifyEmp1BSourceCustody({
  aDocument: currentA,
  aExecution: currentAExecution,
  bDocument: refreshedB,
});
assert.equal(current.state, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT);
assert.equal(current.canRefresh, false);

const missingA = evaluateEmp1BSourceRefresh({
  aDocument: currentA,
  aExecution: null,
  bDocument: originalB,
});
assert.equal(missingA.status, 'BLOCKED');
assert.equal(missingA.code, 'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED');

const incompatibleA = canonicalFixture();
const incompatibleResult = calculateLocalAttachmentFoundation(incompatibleA);
const incompatible = evaluateEmp1BSourceRefresh({
  aDocument: incompatibleA,
  aExecution: qualifiedAExecution(incompatibleA, incompatibleResult),
  bDocument: originalB,
});
assert.equal(incompatible.status, 'BLOCKED');
assert.equal(incompatible.code, 'LOAD_CASE_REFERENCE_MISSING');
assert.equal(incompatible.document, null);

console.log(JSON.stringify({
  status: 'PASS',
  staleState: stale.state,
  refreshedState: current.state,
  preservedFactor,
  incompatibleRefresh: incompatible.code,
  authority: 'A_SOURCE_EVIDENCE_REFRESH_ONLY',
  inventedBInputs: false,
}, null, 2));

function changedCompatibleA(model) {
  const raw = structuredClone(model.sourceEvidence);
  raw.schema = MODEL_SCHEMA;
  const load = raw.loadCases.find((row) => row.identity === 'LC-A');
  load.force.value[0] += 250;
  return createCanonicalLocalAttachmentFoundationModel(raw);
}

function qualifiedAExecution(document, result) {
  return Object.freeze({
    stageId: 'LAFEA.1',
    status: 'QUALIFIED',
    source: document,
    canonicalInput: document,
    result,
    diagnostics: Object.freeze([]),
  });
}
