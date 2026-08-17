import assert from 'node:assert/strict';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
import { lafeaDocumentDigest } from '../src/workspace/lafea-edit-command.js';
import {
  applyLafeaScreeningTermFactorCommand,
  createLafeaScreeningTermFactorCommand,
} from '../src/workspace/lafea-screening-term-edit.js';
import { executeLafeaStage } from '../src/workspace/lafea-workbench-model.js';

function command(documentValue, overrides = {}) {
  return createLafeaScreeningTermFactorCommand({
    commandId: overrides.commandId ?? 'CHECK-LAFEA2-TERM-001',
    expectedDocumentDigest: overrides.expectedDocumentDigest ?? lafeaDocumentDigest(documentValue),
    screeningCaseId: overrides.screeningCaseId ?? 'CASE-B',
    loadCaseId: overrides.loadCaseId ?? 'LC-A',
    rawText: overrides.rawText ?? '0.25',
    origin: { surface: 'REGRESSION', sessionId: 'LAFEA2-NESTED-EDIT-CHECK', sequence: 1 },
  });
}

const reordered = structuredClone(screeningRequestFixture());
reordered.screeningCases.find((row) => row.screeningCaseId === 'CASE-B').mechanicalTerms.reverse();
const originalDigest = lafeaDocumentDigest(reordered);
const edited = applyLafeaScreeningTermFactorCommand(reordered, command(reordered));
assert.equal(edited.status, 'APPLIED');
assert.equal(edited.previousDocumentDigest, originalDigest);
assert.equal(
  edited.document.screeningCases.find((row) => row.screeningCaseId === 'CASE-B')
    .mechanicalTerms.find((row) => row.loadCaseId === 'LC-A').factor,
  0.25,
  'LC-A must be selected by nested identity after term reordering.',
);

const execution = executeLafeaStage('LAFEA.2', edited.document);
assert.equal(execution.status, 'QUALIFIED');
const caseB = execution.result.screeningCases.find((row) => row.screeningCaseId === 'CASE-B');
assert.deepEqual(caseB.combinedForceLocal, [-750, -25, 137.5]);
assert.deepEqual(caseB.combinedMomentLocal, [-2750, -5000, 27500]);

const stale = applyLafeaScreeningTermFactorCommand(
  edited.document,
  command(edited.document, { commandId: 'CHECK-LAFEA2-STALE', expectedDocumentDigest: originalDigest }),
);
assert.equal(stale.status, 'CONFLICT');
assert.equal(stale.diagnostics[0].code, 'LAFEA_STALE_DOCUMENT_DIGEST');

const missing = applyLafeaScreeningTermFactorCommand(
  edited.document,
  command(edited.document, { commandId: 'CHECK-LAFEA2-MISSING', loadCaseId: 'LC-NOT-PRESENT' }),
);
assert.equal(missing.status, 'REJECTED');
assert.equal(missing.diagnostics[0].code, 'LAFEA_ENTITY_NOT_FOUND');

const invalid = applyLafeaScreeningTermFactorCommand(
  edited.document,
  command(edited.document, { commandId: 'CHECK-LAFEA2-INVALID', rawText: '1.2.3' }),
);
assert.equal(invalid.status, 'REJECTED');
assert.equal(invalid.diagnostics[0].code, 'LAFEA_SCREENING_TERM_FACTOR_INVALID');

const duplicate = structuredClone(edited.document);
const duplicateCase = duplicate.screeningCases.find((row) => row.screeningCaseId === 'CASE-B');
duplicateCase.mechanicalTerms.push({ loadCaseId: 'LC-A', factor: 9 });
const duplicateEdit = applyLafeaScreeningTermFactorCommand(
  duplicate,
  command(duplicate, { commandId: 'CHECK-LAFEA2-DUPLICATE' }),
);
assert.equal(duplicateEdit.status, 'REJECTED');
assert.equal(duplicateEdit.diagnostics[0].code, 'LAFEA_IDENTITY_COLLISION');

console.log(JSON.stringify({
  check: 'lafea.2-nested-identity-edit',
  status: 'PASS',
  editedIdentity: { screeningCaseId: 'CASE-B', loadCaseId: 'LC-A' },
  factor: 0.25,
  combinedForceLocal: caseB.combinedForceLocal,
  combinedMomentLocal: caseB.combinedMomentLocal,
  staleDigestRejected: true,
  missingIdentityRejected: true,
  duplicateIdentityRejected: true,
  arrayPositionAuthority: false,
}));
