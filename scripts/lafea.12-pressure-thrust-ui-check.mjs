import assert from 'node:assert/strict';
import {
  AXIAL_PRESSURE_THRUST_BASES,
  calculateLocalAttachmentScreening,
  createLocalAttachmentScreeningRequest,
} from '../src/core/local-attachment-screening/index.js';
import { refreshEmp1BSourceEvidence } from '../src/core/emp1/emp1-a-to-b-refresh.js';
import { lafeaDocumentDigest } from '../src/workspace/lafea-edit-command.js';
import {
  pressureThrustEvidenceMessage,
  pressureThrustEvidenceRows,
  unresolvedEmp1BPressureThrustCases,
} from '../src/workspace/lafea-pressure-thrust-custody-view-model.js';
import {
  applyLafeaScreeningPressureThrustBasisCommand,
  createLafeaScreeningPressureThrustBasisCommand,
} from '../src/workspace/lafea-screening-pressure-thrust-edit.js';
import { rawRequestFixture, screeningRequestFixture } from './lafea.2-fixtures.mjs';

// Legacy active closed-end records remain UNKNOWN in source custody and fail closed.
const legacyActive = rawRequestFixture((raw) => {
  delete raw.screeningCases[0].axialPressureThrustBasis;
});
assert.deepEqual(unresolvedEmp1BPressureThrustCases(legacyActive), ['CASE-A']);
assert.throws(() => createLocalAttachmentScreeningRequest(legacyActive), (error) => {
  assert.equal(error?.state, 'UNSUPPORTED_REQUEST');
  assert.equal(error?.code, 'AXIAL_PRESSURE_THRUST_BASIS_REQUIRED');
  return true;
});

// UNKNOWN remains admissible when the axial pressure-thrust term is inactive.
const legacyOpen = rawRequestFixture((raw) => {
  delete raw.screeningCases[1].axialPressureThrustBasis;
});
const normalizedOpen = createLocalAttachmentScreeningRequest(legacyOpen);
assert.equal(
  normalizedOpen.screeningCases.find((row) => row.screeningCaseId === 'CASE-B')?.axialPressureThrustBasis,
  AXIAL_PRESSURE_THRUST_BASES.UNKNOWN,
);
assert.deepEqual(unresolvedEmp1BPressureThrustCases(normalizedOpen), []);

const zeroFactor = rawRequestFixture((raw) => {
  delete raw.screeningCases[0].axialPressureThrustBasis;
  raw.screeningCases[0].pressureFactor = 0;
});
const normalizedZeroFactor = createLocalAttachmentScreeningRequest(zeroFactor);
assert.equal(
  normalizedZeroFactor.screeningCases.find((row) => row.screeningCaseId === 'CASE-A')?.axialPressureThrustBasis,
  AXIAL_PRESSURE_THRUST_BASES.UNKNOWN,
);
assert.deepEqual(unresolvedEmp1BPressureThrustCases(normalizedZeroFactor), []);

// The normal EMP.1 edit path resolves UNKNOWN through an identity/digest-safe command.
const command = createLafeaScreeningPressureThrustBasisCommand({
  commandId: 'THRUST-CASE-A-1',
  expectedDocumentDigest: lafeaDocumentDigest(legacyActive),
  screeningCaseId: 'CASE-A',
  basis: AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST,
  origin: { surface: 'TEST', sessionId: 'TEST-SESSION', sequence: 1 },
});
const edited = applyLafeaScreeningPressureThrustBasisCommand(legacyActive, command);
assert.equal(edited.status, 'APPLIED');
assert.notEqual(edited.currentDocumentDigest, edited.previousDocumentDigest);
assert.equal(
  edited.document.screeningCases.find((row) => row.screeningCaseId === 'CASE-A')?.axialPressureThrustBasis,
  AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST,
);
assert.deepEqual(unresolvedEmp1BPressureThrustCases(edited.document), []);
assert.ok(edited.dependencyImpact.includes('EXECUTION'));
assert.ok(edited.dependencyImpact.includes('REPORT'));

const staleCommand = createLafeaScreeningPressureThrustBasisCommand({
  commandId: 'THRUST-CASE-A-STALE',
  expectedDocumentDigest: 'stale-digest',
  screeningCaseId: 'CASE-A',
  basis: AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
  origin: { surface: 'TEST', sessionId: 'TEST-SESSION', sequence: 2 },
});
assert.equal(
  applyLafeaScreeningPressureThrustBasisCommand(edited.document, staleCommand).status,
  'CONFLICT',
);
assert.throws(() => createLafeaScreeningPressureThrustBasisCommand({
  commandId: 'THRUST-CASE-A-UNKNOWN',
  expectedDocumentDigest: edited.currentDocumentDigest,
  screeningCaseId: 'CASE-A',
  basis: AXIAL_PRESSURE_THRUST_BASES.UNKNOWN,
}), /includes or excludes closed-end pressure thrust/u);

// A-to-B evidence refresh preserves B-owned thrust custody; it never guesses a new basis.
const retainedB = screeningRequestFixture((raw) => {
  raw.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST;
});
const aDocument = retainedB.sourceEvidence.foundationModel;
const aExecution = {
  stageId: 'LAFEA.1',
  status: 'QUALIFIED',
  source: aDocument,
  canonicalInput: aDocument,
  result: retainedB.sourceEvidence.foundationResult,
};
const refreshed = refreshEmp1BSourceEvidence({ aDocument, aExecution, bDocument: retainedB });
assert.equal(
  refreshed.screeningCases.find((row) => row.screeningCaseId === 'CASE-A')?.axialPressureThrustBasis,
  AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST,
);

// Result-side evidence must come from retained calculation evidence, not inferred UI arithmetic.
const excludes = calculateLocalAttachmentScreening(screeningRequestFixture());
const excludesEvidence = pressureThrustEvidenceRows(excludes)
  .find((row) => row.screeningCaseId === 'CASE-A');
assert.equal(excludesEvidence?.basis, AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST);
assert.equal(excludesEvidence?.treatment, 'ADDED_FROM_FOUNDATION_CLOSED_END_STRESS');
assert.match(pressureThrustEvidenceMessage(excludesEvidence), /added separately/u);

const includes = calculateLocalAttachmentScreening(screeningRequestFixture((raw) => {
  raw.screeningCases[0].axialPressureThrustBasis = AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST;
}));
const includesEvidence = pressureThrustEvidenceRows(includes)
  .find((row) => row.screeningCaseId === 'CASE-A');
assert.equal(includesEvidence?.basis, AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST);
assert.equal(includesEvidence?.treatment, 'SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT');
assert.match(pressureThrustEvidenceMessage(includesEvidence), /suppressed/u);

console.log('EMP.1.B pressure-thrust custody UI/compatibility checks passed.');
