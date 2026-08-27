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
const routePath = path.join(root, 'src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js');
const registryPath = path.join(root, 'src/core/emp1/emp1-c-bounded-route-registry.js');
const professionalStatePath = path.join(
  root,
  'validation/emp1/release/emp1-professional-release-current-state-v1.json',
);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const doc = fs.readFileSync(docPath, 'utf8');
const table5 = fs.readFileSync(table5Path, 'utf8');
const route = fs.readFileSync(routePath, 'utf8');
const registry = fs.readFileSync(registryPath, 'utf8');
const professionalState = JSON.parse(fs.readFileSync(professionalStatePath, 'utf8'));

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
assertEqual(
  ledger.currentAuthorizedRouteReconciliation.rule,
  'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CODE_ACCEPTANCE',
  'post-authorization reconciliation rule drifted',
);

for (const key of [
  'boundedRouteAuthorized',
  'registryRegistered',
  'boundedEngineeringUseAuthorized',
]) {
  assertEqual(
    ledger.currentAuthorizedRouteReconciliation[key],
    true,
    `${key} must truthfully retain the current bounded route authorization state`,
  );
}
for (const key of [
  'globalEmp1CRouteAuthority',
  'releaseQualified',
  'mayEstablishCodeStressClassificationAuthority',
  'mayEstablishAllowableComparisonAuthority',
  'mayEstablishCodeComplianceAuthority',
  'mayEstablishReleaseAuthority',
]) {
  assertEqual(
    ledger.currentAuthorizedRouteReconciliation[key],
    false,
    `${key} must remain false after bounded route authorization`,
  );
}
for (const key of [
  'codeStressClassificationAuthority',
  'allowableComparisonAuthority',
  'codeComplianceAuthority',
  'releaseAuthority',
]) {
  assertEqual(ledger.requiredFailClosedState[key], false, `${key} must remain false`);
}
assertEqual(
  ledger.requiredFailClosedState.boundedWrcRouteMayRemainAuthorized,
  true,
  'fail-closed code boundary must permit separately governed bounded WRC route authority',
);
assertEqual(
  ledger.referenceEvidence.caux2017Wrc01f.authorityRole,
  'REFERENCE_ONLY_NOT_WRC_PRIMARY_SOURCE_NOT_PRODUCTION_CODE_METHOD_AUTHORITY',
  'CAUx reference authority boundary drifted',
);
assertEqual(
  ledger.referenceEvidence.caux2017Wrc01f.mayDefineWrcStressCategory,
  false,
  'CAUx reference must not define WRC stress-category authority',
);
assertEqual(
  ledger.referenceEvidence.caux2017Wrc01f.mayDefineProductionCodeAcceptance,
  false,
  'CAUx reference must not define production code acceptance',
);
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

requireText(doc, '`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CODE_ACCEPTANCE`');
requireText(doc, '`codeStressClassificationAuthority = false`');
requireText(doc, '`allowableComparisonAuthority = false`');
requireText(doc, '`codeComplianceAuthority = false`');
requireText(doc, '`releaseAuthority = false`');
requireText(
  doc,
  '`AUTHORITY_FOR_WRC_STRESS_CALCULATION_DOES_NOT_IMPLY_CODE_CLASSIFICATION_COMPLIANCE_OR_RELEASE`',
);
requireText(doc, 'CAUx is a benchmark/reference source, not WRC primary-source method authority');

requireText(
  route,
  'export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true;',
);
requireText(route, "globalEmp1CRouteAuthority: false");
requireText(registry, 'registered: true');
requireText(registry, 'engineeringUseAuthorized: true');
requireText(registry, 'globalEmp1CRouteAuthority: false');
requireText(registry, 'releaseQualified: false');

assertEqual(
  professionalState.runtimeAuthority.boundedProductionRouteAuthorized,
  true,
  'professional state must retain bounded route authorization',
);
assertEqual(
  professionalState.runtimeAuthority.registryRegistered,
  true,
  'professional state must retain registry registration',
);
assertEqual(
  professionalState.runtimeAuthority.boundedEngineeringUseAuthorized,
  true,
  'professional state must retain bounded engineering-use authority',
);
for (const key of [
  'globalEmp1CRouteAuthority',
  'codeComplianceAuthorized',
  'releaseQualified',
  'deploymentAuthorized',
]) {
  assertEqual(
    professionalState.runtimeAuthority[key],
    false,
    `professional state ${key} must remain false`,
  );
}
assertEqual(professionalState.releaseReady, false, 'professional release must remain not ready');

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
      status: 'PASS_CURRENT_AUTHORIZED_ROUTE_CODE_ACCEPTANCE_BOUNDARY_STATIC_CHECK',
      boundedWrcRouteAuthorized: true,
      engineeringNumericalPassClaimed: false,
      codeClassificationAuthority: false,
      allowableComparisonAuthority: false,
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
