import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'validation/emp1/wrc537-2013/stress-intensity-source-qualification-v1.json'), 'utf8'));
const doc = fs.readFileSync(path.join(root, 'docs/emp1/WRC537_2013_Stress_Intensity_Authority.md'), 'utf8');
const table5 = fs.readFileSync(path.join(root, 'src/core/emp1/emp1-wrc537-cylindrical-table5.js'), 'utf8');

assertEqual(ledger.status, 'BLOCKED_PRIMARY_STRESS_INTENSITY_RECONSTRUCTION_UNQUALIFIED');
assertEqual(ledger.currentImplementation.function, 'planeStressTresca');
assertEqual(ledger.currentImplementation.implementationChangedByThisQualification, false);
assertEqual(ledger.requiredFailClosedState.primaryStressIntensityReconstructionAuthority, false);
assertEqual(ledger.requiredFailClosedState.vonMisesAlternativeAuthority, false);
assertEqual(ledger.requiredFailClosedState.globalMaximumAuthority, false);
assertEqual(ledger.requiredFailClosedState.codeComplianceAuthority, false);
assertEqual(ledger.requiredFailClosedState.releaseAuthority, false);
assertEqual(ledger.productionChangesAuthorizedByThisRecord, false);
assertEqual(ledger.workflowChangesAuthorizedByThisRecord, false);

requireText(table5, 'function planeStressTresca(sigmaPhi, sigmaX, tau)');
requireText(table5, 'const p1=0.5*(sigmaPhi+sigmaX+d),p2=0.5*(sigmaPhi+sigmaX-d),p3=0;');
requireText(table5, 'Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1))');
requireText(table5, "basis: 'MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY'");
requireText(table5, 'globalAbsoluteMaximumClaim: false');

requireText(doc, '`primaryStressIntensityReconstructionAuthority = false`');
requireText(doc, '`vonMisesAlternativeAuthority = false`');
requireText(doc, '`globalMaximumAuthority = false`');
requireText(doc, '`codeComplianceAuthority = false`');
requireText(doc, '`releaseAuthority = false`');

if (/von\s*mises/i.test(table5)) {
  throw new Error('EMP1-36 production Table-5 unexpectedly contains von Mises semantics');
}

console.log(JSON.stringify({
  status: 'PASS_SOURCE_BOUNDARY_STATIC_CHECK',
  numericalEquationChanged: false,
  primarySourceReconstructionAuthority: false,
  codeComplianceAuthority: false,
  releaseAuthority: false,
}, null, 2));

function requireText(text, token) {
  if (!text.includes(token)) throw new Error(`EMP1-36 required token missing: ${token}`);
}

function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(`EMP1-36 assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
