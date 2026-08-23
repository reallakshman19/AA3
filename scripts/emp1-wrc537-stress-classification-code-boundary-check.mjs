import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ledgerPath = path.join(
  root,
  'validation/emp1/wrc537-2013/stress-classification-code-boundary-v1.json',
);
const docPath = path.join(
  root,
  'docs/emp1/WRC537_2013_Stress_Classification_Code_Authority.md',
);
const table5Path = path.join(root, 'src/core/emp1/emp1-wrc537-cylindrical-table5.js');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const doc = fs.readFileSync(docPath, 'utf8');
const table5 = fs.readFileSync(table5Path, 'utf8');

assertEqual(
  ledger.status,
  'BLOCKED_CODE_CLASSIFICATION_AND_ACCEPTANCE_AUTHORITY_UNQUALIFIED',
  'ledger status must remain fail-closed',
);
assertEqual(
  ledger.authoritySeparation.rule,
  'AUTHORITY_FOR_A_DOES_NOT_IMPLY_B_C_OR_D',
  'authority separation rule drifted',
);
for (const key of [
  'codeStressClassificationAuthority',
  'allowableComparisonAuthority',
  'codeComplianceAuthority',
  'releaseAuthority',
]) {
  assertEqual(ledger.requiredFailClosedState[key], false, `${key} must remain false`);
}
assertEqual(
  ledger.productionChangesAuthorizedByThisRecord,
  false,
  'source boundary must not authorize production changes',
);
assertEqual(
  ledger.workflowChangesAuthorizedByThisRecord,
  false,
  'source boundary must not authorize workflow changes',
);

requireText(doc, '`codeStressClassificationAuthority = false`');
requireText(doc, '`allowableComparisonAuthority = false`');
requireText(doc, '`codeComplianceAuthority = false`');
requireText(doc, '`releaseAuthority = false`');
requireText(
  doc,
  '`AUTHORITY_FOR_WRC_STRESS_CALCULATION_DOES_NOT_IMPLY_CODE_CLASSIFICATION_COMPLIANCE_OR_RELEASE`',
);

requireText(table5, "domain: 'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE'");
requireText(table5, 'attachmentStressesCalculated: false');
requireText(table5, 'nozzleStressesCalculated: false');
requireText(table5, 'absoluteShellMaximumAssured: false');
requireText(table5, 'arbitraryLoadingGlobalMaximumAuthority: false');

for (const forbidden of [
  'codeStressCategory:',
  'allowableStress:',
  'codeCompliance: true',
  'releaseQualified: true',
]) {
  if (table5.includes(forbidden)) {
    throw new Error(`EMP1-35 forbidden Table-5 authority token present: ${forbidden}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: 'PASS_SOURCE_BOUNDARY_STATIC_CHECK',
      engineeringNumericalPassClaimed: false,
      codeClassificationAuthority: false,
      codeComplianceAuthority: false,
      releaseAuthority: false,
    },
    null,
    2,
  ),
);

function requireText(text, token) {
  if (!text.includes(token)) throw new Error(`EMP1-35 required token missing: ${token}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
