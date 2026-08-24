import fs from 'node:fs';
import assert from 'node:assert/strict';

const qualificationPath = 'validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json';
const retainedPath = 'docs/emp1/WRC537_2013_Tables_and_Charts.md';
const reviewedPath = 'validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json';

const q = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));
const retained = fs.readFileSync(retainedPath, 'utf8');
const reviewed = JSON.parse(fs.readFileSync(reviewedPath, 'utf8'));

assert.equal(q.status,
  'BLOCKED_PARTIAL_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_UNQUALIFIED');
assert.equal(q.source.document, 'WRC 537');
assert.equal(q.source.edition, '2013');
assert.equal(q.source.sha256,
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');

// Retained Table-5 source-validation authority already exists in repository history.
assert.equal(q.retainedPrimaryValidationAuthority.classification,
  'RETAINED_WRC_TABLE5_PRIMARY_VALIDATION_AUTHORITY');
assert.equal(q.retainedPrimaryValidationAuthority.retainedPath, retainedPath);
assert.equal(q.retainedPrimaryValidationAuthority.table, 'Table 5');
assert.equal(q.retainedPrimaryValidationAuthority.pages, '41-42');
assert.equal(q.retainedPrimaryValidationAuthority.priorAuthorityRecord,
  'agents/PR1312_workreport.md');
assert.equal(q.retainedPrimaryValidationAuthority.reviewedInterpretationPath, reviewedPath);
assert.equal(q.retainedPrimaryValidationAuthority.reviewedInterpretationSemanticHash,
  '654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2');
assert.equal(q.retainedPrimaryValidationAuthority.currentTurnDirectPdfReobserved, false);
assert.equal(q.retainedPrimaryValidationAuthority.currentTurnDirectPdfObservationState,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT');

assert.match(retained, /Table 5[^\n]*Computation Sheet for Local Stresses in Cylindrical Shells/i);
assert.match(retained, /Pages 41[^0-9]*42/);
assert.ok(retained.includes('If load is opposite that shown, reverse signs shown'));

assert.equal(reviewed.schema, 'emp1-wrc537-table5-reviewed-interpretation/v1');
assert.equal(reviewed.source.document, 'WRC 537');
assert.equal(reviewed.source.edition, '2013');
assert.equal(reviewed.source.table, 'Table 5');
assert.equal(reviewed.source.pages, '41-42');
assert.equal(reviewed.source.retainedPath, retainedPath);
assert.equal(reviewed.authority.class, 'SOURCE_DERIVED_REVIEWED_VALIDATION_INTERPRETATION');
assert.equal(reviewed.authority.productionMethodAuthority, false);
assert.equal(reviewed.semanticHash,
  q.retainedPrimaryValidationAuthority.reviewedInterpretationSemanticHash);
assert.deepEqual(q.retainedTable5SignAuthority.reviewedSigns, reviewed.reviewedSigns);

for (const key of [
  'radialLoadSignPlacementQualified',
  'circumferentialMomentSignPlacementQualified',
  'longitudinalMomentSignPlacementQualified',
  'shearAndTorsionSignPlacementQualified',
  'oppositeLoadDirectionReversesApplicableSignsQualified',
]) {
  assert.equal(q.retainedTable5SignAuthority[key], true, key);
}

for (const key of [
  'radialLoadSignTableQualified',
  'circumferentialMomentSignTableQualified',
  'longitudinalMomentSignTableQualified',
  'shearSignTableQualified',
  'loadDirectionReversalQualified',
]) {
  assert.equal(q.primarySourceAuthority[key], true, key);
}

for (const key of [
  'uLowerPhysicalSurfaceMeaningQualified',
  'ABCDPhysicalLocationMeaningQualified',
  'membraneBendingSurfaceReconstructionQualified',
  'commonPhysicalPointSuperpositionQualified',
]) {
  assert.equal(q.primarySourceAuthority[key], false, `UNRESOLVED_MUST_REMAIN_FALSE:${key}`);
}

assert.equal(q.currentImplementation.productionSignArraysChangedByThisQualification, false);
assert.equal(q.secondaryEvidence.implementationAuthority, false);
assert.ok(Array.isArray(q.unresolvedClosureRequirements));
assert.equal(q.unresolvedClosureRequirements.length, 4);

for (const key of [
  'engineeringAuthority',
  'productionAuthority',
  'globalEmp1CAuthority',
  'codeComplianceAuthority',
  'releaseAuthority',
]) {
  assert.equal(q[key], false, `AUTHORITY_MUST_REMAIN_FALSE:${key}`);
}

console.log('PASS_EMP1_WRC537_RETAINED_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_BLOCKED');
