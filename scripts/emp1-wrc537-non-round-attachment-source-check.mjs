#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ledger=JSON.parse(await readFile('validation/emp1/wrc537-2013/non-round-attachment-source-qualification-v1.json','utf8'));
const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
assert.equal(ledger.schema,'emp1-wrc537-non-round-attachment-source-qualification/v1');
assert.equal(ledger.status,'BLOCKED_PRIMARY_SOURCE_NON_ROUND_METHOD_NOT_QUALIFIED');
assert.equal(ledger.engineeringAuthority,true);
assert.equal(ledger.productionNonRoundAuthority,false);
assert.equal(ledger.source.controlledWrc537RawPdfSha256,sourceSha);
assert.equal(ledger.source.retainedSecondaryExtractionStatus,'NOT_READY_FOR_IMPLEMENTATION');
assert.equal(ledger.source.primarySourceNonRoundMethodVerified,false);
assert.deepEqual(ledger.retainedCandidateEvidence.cylindricalRectangularLoadingSymbolsObserved,['C1','C2']);
assert.equal(ledger.retainedCandidateEvidence.candidateSquareAttachmentParameterNoteQualifiedForImplementation,false);
assert.equal(ledger.currentBoundedRoute.shellFamily,'CYLINDRICAL');
assert.equal(ledger.currentBoundedRoute.attachmentShape,'ROUND');
assert.equal(ledger.currentBoundedRoute.rectangularOrSquareAttachmentsExcluded,true);
assert.equal(ledger.currentBoundedRoute.equivalentRoundConversionAuthorized,false);
for(const p of [
  'DO_NOT_USE_EQUAL_AREA_EQUIVALENT_ROUND',
  'DO_NOT_USE_EQUAL_PERIMETER_EQUIVALENT_ROUND',
  'DO_NOT_USE_HYDRAULIC_DIAMETER_EQUIVALENT_ROUND',
  'DO_NOT_REUSE_ROUND_BETA_EQUATION_FOR_NON_ROUND_ATTACHMENT',
  'DO_NOT_REUSE_ROUND_COEFFICIENT_ROWS_FOR_NON_ROUND_ATTACHMENT',
  'DO_NOT_PROMOTE_SECONDARY_CANDIDATE_EQUATIONS_TO_PRODUCTION_AUTHORITY',
  'DO_NOT_MIX_ROUND_AND_NON_ROUND_METHOD_FAMILIES',
]) assert.ok(ledger.prohibitions.includes(p),`missing prohibition ${p}`);
assert.equal(ledger.authorization.roundBoundedRouteUnchanged,true);
assert.equal(ledger.authorization.nonRoundSourceFamilyCandidateRecognized,true);
assert.equal(ledger.authorization.nonRoundCalculationAllowed,false);
assert.equal(ledger.authorization.equivalentRoundApproximationAllowed,false);
assert.equal(ledger.authorization.globalEmp1CRouteRegistrationAllowed,false);
assert.equal(ledger.authorization.codeComplianceAuthorized,false);
assert.equal(ledger.authorization.releaseQualified,false);
console.log(JSON.stringify({
  schema:'emp1-wrc537-non-round-attachment-source-check/v1',
  status:'PASS_NON_ROUND_FAMILY_RECOGNIZED_BUT_PRODUCTION_BLOCKED',
  sourceSha256:sourceSha,
  primarySourceNonRoundMethodVerified:false,
  currentAuthorizedAttachmentShape:'ROUND',
  nonRoundCalculationAllowed:false,
  equivalentRoundApproximationAllowed:false,
  globalEmp1CRouteAuthority:false,
  codeComplianceAuthorized:false,
  releaseQualified:false,
},null,2));
