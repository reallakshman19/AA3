#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE,
  EMP1_WRC537_UNITY_SCF_AUTHORITY,
} from '../src/core/emp1/emp1-wrc537-stress-concentration-authority.js';

const ledgerPath = 'validation/emp1/wrc537-2013/appendix-b-scf-source-qualification-v1.json';
const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));

const sourceSha = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const sourceBlob = 'ce861233928154145a9257efbbf8dbef3f5a17d1';

assert.equal(ledger.schema, 'emp1-wrc537-appendix-b-scf-source-qualification/v1');
assert.equal(
  ledger.status,
  'BLOCKED_PINNED_PRIMARY_PDF_NOT_BINARY_READABLE_IN_CURRENT_EXECUTION_INTERFACE',
);
assert.equal(ledger.engineeringAuthority, false);
assert.equal(ledger.productionImplementationAuthority, false);
assert.equal(ledger.source.rawPdfSha256, sourceSha);
assert.equal(ledger.source.gitBlob, sourceBlob);
assert.equal(ledger.source.primarySourceVerifiedForImplementation, false);

assert.equal(ledger.existingSecondaryExtraction.state, 'NOT_READY_FOR_IMPLEMENTATION');
assert.deepEqual(ledger.existingSecondaryExtraction.candidateEquationIds, ['B.3', 'B.4', 'B.5']);
assert.equal(
  ledger.existingSecondaryExtraction.candidateFormulaTextAuthority,
  'REJECTED_FOR_IMPLEMENTATION_PENDING_PRIMARY_PAGE_VERIFICATION',
);

const corroboration = ledger.nonAuthoritativeCorroboration;
assert.equal(corroboration.sourceClass, 'PUBLIC_REPRODUCTION_NOT_PINNED_PRIMARY_AUTHORITY');
assert.equal(
  corroboration.observations.KnMeaning,
  'MEMBRANE_PORTION_STRESS_CONCENTRATION_FACTOR_FOR_EXTERNAL_NOZZLE_LOADINGS',
);
assert.equal(
  corroboration.observations.KbMeaning,
  'BENDING_PORTION_STRESS_CONCENTRATION_FACTOR_FOR_EXTERNAL_NOZZLE_LOADINGS',
);
assert.equal(
  corroboration.observations.shellFigureSelection,
  'FIGURE_B2_TENSION_FOR_Kn_AND_BENDING_FOR_Kb',
);
assert.equal(corroboration.observations.shellRatio, 'rA_over_T');
assert.equal(corroboration.observations.generalInfinitePlateBasis.shell_h, '2T');
assert.equal(corroboration.observations.generalInfinitePlateBasis.nozzle_h, 'dn');
assert.equal(
  corroboration.normalizedCandidateRelationsForReconciliationOnly.authority,
  'NON_AUTHORITATIVE_RECONSTRUCTION_PENDING_PINNED_PRIMARY_PAGE_RENDER',
);

assert.equal(ledger.transcriptionRisk.classification, 'MATERIAL_NUMERICAL_RISK');
assert.equal(
  ledger.transcriptionRisk.disposition,
  'DO_NOT_IMPLEMENT_OR_HANDCALC_FROM_SECONDARY_CANDIDATE_FORM',
);

assert.deepEqual(EMP1_WRC537_UNITY_SCF_AUTHORITY, {
  Kn: 1,
  Kb: 1,
  authority: 'PINNED_BOUNDED_ROUTE_UNITY_ONLY',
});
assert.equal(EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.mode, 'UNITY_ONLY');
assert.equal(EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.generalAppendixBAuthority, false);
assert.equal(EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.nonUnityAuthorized, false);
assert.equal(
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.sourceQualification
    .licensedPrimarySourceVerifiedForImplementation,
  false,
);
assert.equal(
  EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.sourceQualification
    .equationSelectionPolicyQualified,
  false,
);

for (const key of [
  'generalAppendixBAuthority',
  'nonUnityAuthorized',
  'equationSelectionPolicyQualified',
  'licensedPrimarySourceVerifiedForImplementation',
  'gammaExpansionAuthorized',
  'pressureExpansionAuthorized',
  'globalEmp1CRouteAuthority',
  'releaseQualified',
]) {
  assert.equal(ledger.authority[key], false, `${key} must remain false`);
}
assert.equal(ledger.authority.historicalUnityCustodyMustRemainUnchanged, true);
assert.ok(ledger.unresolvedPrimarySourceItems.length >= 8);

const result = {
  schema: 'emp1-wrc537-appendix-b-scf-source-check/v1',
  status: 'PASS_FAIL_CLOSED_APPENDIX_B_SOURCE_RECONCILIATION',
  primaryPinnedPdfVerifiedForImplementation: false,
  secondaryCandidateFormulaImplementationAuthorized: false,
  currentMode: EMP1_WRC537_GENERAL_SCF_AUTHORITY_STATE.mode,
  generalAppendixBAuthority: false,
  nonUnityAuthorized: false,
  historicalUnityCustodyPreserved: true,
  unresolvedPrimarySourceItems: ledger.unresolvedPrimarySourceItems.length,
  productionAuthorityGranted: false,
};
console.log(JSON.stringify(result, null, 2));
