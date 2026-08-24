import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'validation/emp1/wrc537-2013/stress-intensity-source-qualification-v1.json'), 'utf8'));
const doc = fs.readFileSync(path.join(root, 'docs/emp1/WRC537_2013_Stress_Intensity_Authority.md'), 'utf8');
const retained = fs.readFileSync(path.join(root, 'docs/emp1/WRC537_2013_Tables_and_Charts.md'), 'utf8');
const table5 = fs.readFileSync(path.join(root, 'src/core/emp1/emp1-wrc537-cylindrical-table5.js'), 'utf8');

assertEqual(ledger.status,
  'BLOCKED_PARTIAL_TABLE5_STRESS_INTENSITY_FORMULA_AUTHORITY_PLANE_STRESS_SEMANTICS_UNQUALIFIED');
assertEqual(ledger.sourceDocument.rawPdfSha256,
  '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');
assertEqual(ledger.sourceDocument.gitBlobSha1,
  'ce861233928154145a9257efbbf8dbef3f5a17d1');
assertEqual(ledger.sourceDocument.primaryPageReobservationAvailableInConnectedEnvironment, false);
assertEqual(ledger.sourceDocument.currentTurnDirectPdfObservationState,
  'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT');

assertEqual(ledger.retainedTable5Authority.retainedPath,
  'docs/emp1/WRC537_2013_Tables_and_Charts.md');
assertEqual(ledger.retainedTable5Authority.table, 'Table 5');
assertEqual(ledger.retainedTable5Authority.pages, '41-42');
for (const key of [
  'combinedStressIntensitySectionPresent',
  'algebraicNormalStressSummationBeforeStressIntensity',
  'algebraicShearStressSummationBeforeStressIntensity',
  'likeSignNormalStressCasePresent',
  'unlikeSignNormalStressCasePresent',
  'zeroShearCasePresent',
  'tablePresentsSAsPostProcessingFromCombinedStressComponents',
]) assertEqual(ledger.retainedTable5Authority[key], true);

requireRegex(retained, /Table 5[^\n]*Computation Sheet for Local Stresses in Cylindrical Shells/i);
requireRegex(retained, /Pages 41[^0-9]*42/i);
requireRegex(retained, /COMBINED STRESS INTENSITY/i);
requireRegex(retained, /Add algebraically for summation of shear stresses/i);
requireRegex(retained, /When\s+[^\n]*have like signs/i);
requireRegex(retained, /When\s+[^\n]*have unlike signs/i);
requireRegex(retained, /When\s+[^\n]*tau[^\n]*=\s*0/i);

for (const key of [
  'table5CombinedStressIntensityPostProcessingQualified',
  'combinedSigmaPhiSigmaXTauInputsQualified',
  'algebraicComponentSummationBeforeSQualified',
  'likeUnlikeAndZeroShearCaseStructureQualified',
  'table5SIsDerivedAfterComponentStressFormationQualified',
]) assertEqual(ledger.qualifiedSourceClaims[key], true);

for (const [key, value] of Object.entries(ledger.unqualifiedPrimarySourceClaims)) {
  assertEqual(value, false, `UNQUALIFIED_SOURCE_CLAIM:${key}`);
}

assertEqual(ledger.currentImplementation.function, 'planeStressTresca');
assertEqual(ledger.currentImplementation.implementationChangedByThisQualification, false);
requireText(table5, 'function planeStressTresca(sigmaPhi, sigmaX, tau)');
requireText(table5, 'const p1=0.5*(sigmaPhi+sigmaX+d),p2=0.5*(sigmaPhi+sigmaX-d),p3=0;');
requireText(table5, 'Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1))');
requireText(table5, "basis: 'MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY'");
requireText(table5, 'globalAbsoluteMaximumClaim: false');
if (/von\s*mises/i.test(table5)) throw new Error('EMP1-36 production Table-5 unexpectedly contains von Mises semantics');

for (const key of [
  'fullPrimaryStressIntensityReconstructionAuthority',
  'explicitPlaneStressSourceAuthority',
  'vonMisesAlternativeAuthority',
  'globalMaximumAuthority',
  'codeComplianceAuthority',
  'releaseAuthority',
]) assertEqual(ledger.requiredFailClosedState[key], false, `AUTHORITY_MUST_REMAIN_FALSE:${key}`);

assertEqual(ledger.productionChangesAuthorizedByThisRecord, false);
assertEqual(ledger.workflowChangesAuthorizedByThisRecord, false);
requireText(doc, 'Table-5 combined-stress-intensity post-processing');
requireText(doc, 'explicit plane-stress');
requireText(doc, 'code compliance');

console.log(JSON.stringify({
  status: 'PASS_RETAINED_TABLE5_STRESS_INTENSITY_TEXT_ORDER_PHYSICAL_PLANE_STRESS_SEMANTICS_BLOCKED',
  numericalEquationChanged: false,
  retainedTable5PostProcessingAuthority: true,
  explicitPlaneStressSourceAuthority: false,
  codeComplianceAuthority: false,
  releaseAuthority: false,
}, null, 2));

function requireText(text, token) {
  if (!text.includes(token)) throw new Error(`EMP1-36 required token missing: ${token}`);
}

function requireRegex(text, regex) {
  if (!regex.test(text)) throw new Error(`EMP1-36 required pattern missing: ${regex}`);
}

function assertEqual(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`EMP1-36 assertion failed${label ? ` ${label}` : ''}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
