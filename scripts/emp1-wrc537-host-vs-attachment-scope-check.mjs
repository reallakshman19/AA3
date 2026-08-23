#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ledgerPath='validation/emp1/wrc537-2013/host-shell-vs-attachment-stress-boundary-v1.json';
const ledger=JSON.parse(await readFile(ledgerPath,'utf8'));
const sourceSha='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';

assert.equal(ledger.schema,'emp1-wrc537-host-shell-vs-attachment-stress-boundary/v1');
assert.equal(ledger.status,'PASS_FAIL_CLOSED_METHOD_SCOPE_BOUNDARY');
assert.equal(ledger.engineeringAuthority,true);
assert.equal(ledger.productionNumericalMethodChanged,false);
assert.equal(ledger.source.rawPdfSha256,sourceSha);
assert.equal(ledger.source.qualifiedStatementLocator,'4.5.3');
assert.equal(ledger.wrc537ResultDomain.physicalBody,'HOST_CYLINDRICAL_SHELL');
assert.equal(ledger.wrc537ResultDomain.recoveryRegion,'ATTACHMENT_SHELL_JUNCTURE');
for(const key of [
  'nozzleWallStressAuthorized',
  'attachmentWallStressAuthorized',
  'nozzleNeckStressAuthorized',
  'weldStressAuthorized',
  'reinforcementPadStressAuthorized',
]) assert.equal(ledger.wrc537ResultDomain[key],false,`${key} must remain false`);
assert.equal(ledger.separateMethodBoundary.wrc297CandidateMethodFamilyOnly,true);
assert.equal(ledger.separateMethodBoundary.wrc297AuthorizedTechnicalSourcePresent,false);
assert.equal(ledger.separateMethodBoundary.wrc297EngineeringAuthority,false);
assert.equal(ledger.separateMethodBoundary.nozzleAttachmentStressAuthority,false);
assert.equal(ledger.separateMethodBoundary.conversionFromWrc537ShellStressPermitted,false);
assert.equal(ledger.separateMethodBoundary.relabelWrc537ShellStressAsAttachmentStressPermitted,false);
for(const prohibition of [
  'DO_NOT_INFER_WRC297_FROM_WRC537_TABLE5_RESULTS',
  'DO_NOT_USE_APPENDIX_B_SCF_AS_NOZZLE_STRESS_METHOD_AUTHORITY',
  'DO_NOT_RELABEL_HOST_SHELL_STRESS_AS_NOZZLE_OR_ATTACHMENT_STRESS',
  'DO_NOT_INFER_NOZZLE_STRESS_FROM_GEOMETRY_SIMILARITY',
  'DO_NOT_USE_PUBLIC_METHOD_DESCRIPTION_AS_TECHNICAL_IMPLEMENTATION_AUTHORITY',
  'DO_NOT_CONFLATE_STRESS_CALCULATION_WITH_CODE_COMPLIANCE_OR_RELEASE',
]) assert.ok(ledger.prohibitions.includes(prohibition),`missing prohibition ${prohibition}`);
assert.equal(ledger.authorization.wrc537HostShellScopeBoundaryQualified,true);
assert.equal(ledger.authorization.nozzleAttachmentStressCalculationAllowed,false);
assert.equal(ledger.authorization.wrc297ImplementationAllowed,false);
assert.equal(ledger.authorization.globalEmp1CRouteRegistrationAllowed,false);
assert.equal(ledger.authorization.codeComplianceAuthorized,false);
assert.equal(ledger.authorization.releaseQualified,false);

console.log(JSON.stringify({
  schema:'emp1-wrc537-host-vs-attachment-scope-check/v1',
  status:'PASS_FAIL_CLOSED_METHOD_SCOPE_BOUNDARY',
  sourceSha256:sourceSha,
  wrc537ResultDomain:'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE',
  nozzleAttachmentStressAuthority:false,
  wrc297EngineeringAuthority:false,
  productionNumericalMethodChanged:false,
  globalEmp1CRouteAuthority:false,
  codeComplianceAuthorized:false,
  releaseQualified:false,
},null,2));
