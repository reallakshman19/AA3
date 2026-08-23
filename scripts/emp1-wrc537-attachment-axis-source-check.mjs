import fs from 'node:fs';

const q=JSON.parse(fs.readFileSync('validation/emp1/wrc537-2013/attachment-axis-intersection-source-qualification-v1.json','utf8'));
const fail=(m)=>{throw new Error(`EMP1_WRC537_ATTACHMENT_AXIS_SOURCE_CHECK:${m}`)};

if(q.schema!=='emp1-wrc537-attachment-axis-intersection-source-qualification/v1') fail('SCHEMA');
if(q.status!=='BLOCKED_PRIMARY_INTERSECTION_RULE_NOT_DIRECTLY_VERIFIED') fail('STATUS');
if(q.primarySource?.gitBlobSha!=='ce861233928154145a9257efbbf8dbef3f5a17d1') fail('PDF_BLOB');
if(q.primarySource?.rawPdfSha256!=='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2') fail('PDF_SHA256');
if(q.secondaryResearch?.declaredStatus!=='NOT_READY_FOR_IMPLEMENTATION') fail('SECONDARY_STATUS');
if(q.currentSoftwareGuard?.nonOrthogonalDiagnostic!=='EMP1_WRC537_FRAME_NON_ORTHOGONAL') fail('GUARD_DIAGNOSTIC');
if(q.currentSoftwareGuard?.defaultOrthogonalityTolerance!==1e-10) fail('GUARD_TOLERANCE');
if(q.currentSoftwareGuard?.classification!=='MATHEMATICAL_VECTOR_GUARD_ONLY_NOT_PRIMARY_APPLICABILITY_PROOF') fail('GUARD_CLASSIFICATION');
if(q.authorityDistinction?.physicalShellNormalProof!=='UNRESOLVED') fail('PHYSICAL_NORMALITY_PROMOTED');
if(q.authorityDistinction?.obliqueWrcApplicability!=='NOT_AUTHORIZED') fail('OBLIQUE_AUTHORITY_WIDENED');
if(q.authorityDistinction?.numericalToleranceMeaning!=='FLOATING_POINT_EQUIVALENCE_ONLY_NOT_ENGINEERING_ANGLE_ALLOWANCE') fail('TOLERANCE_MEANING');
if(q.authorization?.widenOrthogonalityTolerance!==false) fail('TOLERANCE_WIDENED');
if(q.authorization?.obliqueGeometryImplementationAllowed!==false) fail('OBLIQUE_IMPLEMENTATION_WIDENED');

for(const required of [
  'NO_OBLIQUE_TO_RADIAL_PROJECTION',
  'NO_EQUIVALENT_PERPENDICULAR_SURROGATE',
  'NO_ENGINEERING_ANGLE_ALLOWANCE_FROM_1E_10_TOLERANCE',
  'NO_PHYSICAL_NORMALITY_CLAIM_FROM_CENTERLINE_ORTHOGONALITY_ALONE',
  'NO_OBLIQUE_PRODUCTION_ROUTE'
]) if(!(q.prohibitions||[]).includes(required)) fail(`MISSING_PROHIBITION:${required}`);

console.log('EMP1 WRC537 attachment-axis source boundary: BLOCKED as intended');
