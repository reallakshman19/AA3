import fs from 'node:fs';

const path = 'validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json';
const q = JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(`EMP1_WRC537_SURFACE_SIGN_SOURCE_CHECK_FAILED:${message}`); };

if (q.status !== 'BLOCKED_PRIMARY_SURFACE_SIGN_SEMANTICS_UNQUALIFIED') fail('STATUS');
if (q.currentImplementation?.productionSignArraysChangedByThisQualification !== false) fail('SIGN_ARRAY_MUTATION');
for (const [key, value] of Object.entries(q.primarySourceAuthority ?? {})) {
  if (value !== false) fail(`UNQUALIFIED_AUTHORITY_TRUE:${key}`);
}
if (q.secondaryEvidence?.implementationAuthority !== false) fail('SECONDARY_AUTHORITY');
for (const key of ['engineeringAuthority','productionAuthority','globalEmp1CAuthority','codeComplianceAuthority','releaseAuthority']) {
  if (q[key] !== false) fail(`AUTHORITY_TRUE:${key}`);
}
console.log('PASS_EMP1_WRC537_CYLINDRICAL_SURFACE_SIGN_SOURCE_BOUNDARY');
