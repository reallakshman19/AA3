import fs from 'node:fs';

const path='validation/emp1/wrc537-2013/spherical-method-source-qualification-v1.json';
const q=JSON.parse(fs.readFileSync(path,'utf8'));
const fail=(m)=>{throw new Error(`EMP1_WRC537_SPHERICAL_SOURCE_CHECK:${m}`)};

if(q.schema!=='emp1-wrc537-spherical-method-source-qualification/v1') fail('SCHEMA');
if(q.status!=='BLOCKED_PRIMARY_SPHERICAL_SOURCE_NOT_DIRECTLY_VERIFIED') fail('STATUS');
if(q.source?.gitBlobSha!=='ce861233928154145a9257efbbf8dbef3f5a17d1') fail('PDF_BLOB');
if(q.source?.rawPdfSha256!=='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2') fail('PDF_SHA256');
if(q.source?.connectorBinaryPayloadAvailable!==false) fail('BINARY_PAYLOAD_STATE');
if(q.source?.primaryPageInspection!=='NOT_RUN_EXECUTION_ENVIRONMENT') fail('PRIMARY_INSPECTION_STATE');
if(q.secondaryExtraction?.declaredStatus!=='NOT_READY_FOR_IMPLEMENTATION') fail('SECONDARY_STATUS');
if(q.secondaryExtraction?.authority!=='SECONDARY_OCR_RESEARCH_ONLY') fail('SECONDARY_AUTHORITY');
if(q.engineeringAuthority!==false||q.productionAuthority!==false||q.fullMethodAuthority!==false) fail('AUTHORITY_WIDENED');
if(q.authorization?.sphericalHandcalcAllowed!==false) fail('HANDCALC_WIDENED');
if(q.authorization?.sphericalProductionImplementationAllowed!==false) fail('PRODUCTION_WIDENED');
if(q.authorization?.sphericalRouteRegistrationAllowed!==false) fail('ROUTE_WIDENED');

const prohibited=new Set(q.prohibitions||[]);
for(const item of [
  'NO_CYLINDRICAL_GAMMA_OR_BETA_REUSE',
  'NO_CYLINDRICAL_TABLE5_CURVE_REUSE',
  'NO_CYLINDRICAL_ORACLE_OR_QUALIFICATION_HASH_REUSE',
  'NO_SECONDARY_CANDIDATE_EQUATION_PROMOTION',
  'NO_SPHERICAL_PRODUCTION_EVALUATOR',
  'NO_GLOBAL_EMP1C_CODE_OR_RELEASE_AUTHORITY'
]) if(!prohibited.has(item)) fail(`MISSING_PROHIBITION:${item}`);

for(const p of q.candidateSphericalSemantics?.parameters||[]){
  if(p.authority!=='UNQUALIFIED_SECONDARY_CANDIDATE') fail(`CANDIDATE_PROMOTED:${p.symbol}`);
}

if(q.authorization?.requiredNextGate!=='DIRECT_PRIMARY_SPHERICAL_PAGE_EXTRACTION_AND_INDEPENDENT_REVIEW') fail('NEXT_GATE');
console.log('EMP1 WRC537 spherical source boundary: BLOCKED as intended');
