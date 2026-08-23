import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(
  root,
  'validation/emp1/wrc537-2013/shell-thickness-basis-source-qualification-v1.json',
), 'utf8'));
const authority = fs.readFileSync(path.join(
  root,
  'docs/emp1/WRC537_2013_Shell_Thickness_Basis_Authority.md',
), 'utf8');

const failures = [];
const requireTrue = (condition, code) => { if (!condition) failures.push(code); };

requireTrue(
  ledger.schema === 'emp1-wrc537-shell-thickness-basis-source-qualification/v1',
  'SCHEMA_MISMATCH',
);
requireTrue(
  ledger.status === 'BLOCKED_WRC_SHELL_THICKNESS_BASIS_PRIMARY_SOURCE_UNRESOLVED',
  'STATUS_MUST_REMAIN_BLOCKED',
);
requireTrue(ledger.primarySourceDirectlyReobserved === false, 'PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(
  JSON.stringify(ledger.currentSoftwareCustody?.foundationThicknessPolicies) ===
    JSON.stringify(['NOMINAL_MINUS_CORROSION', 'EXPLICIT_ASSESSMENT']),
  'FOUNDATION_THICKNESS_POLICIES_MISMATCH',
);
requireTrue(
  ledger.currentSoftwareCustody?.wrcCustodyThicknessDerivationLabel === 'LAFEA2_ASSESSMENT_PIPE_THICKNESS',
  'WRC_CUSTODY_THICKNESS_DERIVATION_MISMATCH',
);
requireTrue(
  ledger.currentSoftwareCustody?.wrcMeanRadiusDerivation === 'pipeOutsideDiameter/2 - assessmentPipeThickness/2',
  'WRC_MEAN_RADIUS_DERIVATION_MISMATCH',
);
requireTrue(ledger.currentSoftwareCustody?.internallyDeterministic === true, 'CURRENT_CHAIN_MUST_BE_DETERMINISTIC');
requireTrue(ledger.currentSoftwareCustody?.wrcPrimarySourceBasisQualified === false, 'WRC_PRIMARY_BASIS_MUST_REMAIN_UNQUALIFIED');

for (const key of [
  'positiveThicknessValueAloneProvesWrcBasis',
  'lafeaAssessmentPolicyEqualsWrcSourceRule',
  'nominalMinusCorrosionAuthorizedByWrc',
  'explicitAssessmentThicknessAuthorizedByWrc',
  'automaticCorrosionAllowanceSubtractionAuthorizedByWrc',
  'measuredMinimumThicknessAutomaticallyAuthorizedAsWrcT',
  'reinforcementPadThicknessMaySubstituteForShellT',
  'nominalRadiusMayBeMixedWithDifferentNetThicknessWithoutGeometryRule',
  'productionThicknessBasisAuthority',
]) requireTrue(ledger.engineeringConclusions?.[key] === false, `ENGINEERING_CONCLUSION_MUST_REMAIN_FALSE:${key}`);
requireTrue(ledger.engineeringConclusions?.currentRmAndTAreInternallyCoherent === true, 'CURRENT_RM_T_COHERENCE_MUST_BE_RETAINED');

for (const key of [
  'productionThicknessConversionChanged',
  'productionNumericsChanged',
  'sourceCustodyImplementationChanged',
  'routeRegistryChanged',
  'gammaBetaAuthorityChanged',
  'pressureAuthorityChanged',
  'scfAuthorityChanged',
  'codeComplianceAuthority',
  'releaseAuthority',
]) requireTrue(ledger.authorityEffect?.[key] === false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for (const phrase of [
  'internally consistent and deterministic software chain',
  'cannot automatically become WRC 537 engineering authority',
  'do not promote `NOMINAL_MINUS_CORROSION` to a WRC source rule',
  'BLOCKED_WRC_SHELL_THICKNESS_BASIS_PRIMARY_SOURCE_UNRESOLVED',
]) requireTrue(authority.includes(phrase), `AUTHORITY_NOTE_MISSING:${phrase}`);

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS_FAIL_CLOSED_SOURCE_BOUNDARY',
  qualificationId: ledger.qualificationId,
  disposition: ledger.status,
  currentRmAndTAreInternallyCoherent: ledger.engineeringConclusions.currentRmAndTAreInternallyCoherent,
  productionThicknessBasisAuthority: ledger.engineeringConclusions.productionThicknessBasisAuthority,
}, null, 2));
