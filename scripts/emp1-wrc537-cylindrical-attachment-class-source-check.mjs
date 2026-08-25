import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(root,'validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json'),'utf8'));
const authority = fs.readFileSync(path.join(root,'docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md'),'utf8');
const failures=[];
const requireTrue=(condition,code)=>{if(!condition) failures.push(code);};

requireTrue(ledger.schema==='emp1-wrc537-cylindrical-attachment-class-source-qualification/v1','SCHEMA_MISMATCH');
requireTrue(ledger.status==='BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED','STATUS_MUST_REMAIN_BLOCKED');
requireTrue(ledger.primarySourceDirectlyReobserved===false,'PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(ledger.primarySourceExecutionStatus==='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT','PRIMARY_SOURCE_EXECUTION_STATUS_MISMATCH');
requireTrue(ledger.retainedTable5Evidence?.table==='Table 5','TABLE5_ID');
requireTrue(ledger.retainedTable5Evidence?.pages==='41-42','TABLE5_PAGES');
requireTrue(JSON.stringify(ledger.retainedTable5Evidence?.explicitAttachmentGeometryInputs)===JSON.stringify(['r0']),'TABLE5_ATTACHMENT_GEOMETRY_INPUTS');
requireTrue(ledger.retainedTable5Evidence?.attachmentWallThicknessInputPresent===false,'ATTACHMENT_THICKNESS_INPUT_INVENTED');
requireTrue(ledger.retainedTable5Evidence?.solidHollowClassificationInputPresent===false,'SOLID_HOLLOW_INPUT_INVENTED');
requireTrue(ledger.retainedTable5Evidence?.rigidityFlexibilityInputPresent===false,'RIGIDITY_INPUT_INVENTED');
requireTrue(ledger.retainedTable5Evidence?.classification==='QUALIFIED_TABLE5_EXPLICIT_INPUT_CONTENT_ONLY_NOT_ATTACHMENT_CLASS_EQUIVALENCE_AUTHORITY','TABLE5_CLASSIFICATION');
requireTrue(ledger.currentRoute?.shellFamily==='CYLINDRICAL','CURRENT_ROUTE_SHELL_FAMILY_MISMATCH');
requireTrue(ledger.currentRoute?.attachmentShape==='ROUND','CURRENT_ROUTE_ATTACHMENT_SHAPE_MISMATCH');
requireTrue(JSON.stringify(ledger.currentRoute?.standardTable5EightPointFiguresForLongitudinalMoment)===JSON.stringify(['1B','2B']),'STANDARD_LONGITUDINAL_FIGURE_SET_MISMATCH');
requireTrue(ledger.currentRoute?.productionRouteAuthority===true,'CURRENT_ROUTE_STATE_STALE');
requireTrue(ledger.currentRoute?.productionRouteAuthorityClassification==='OWNER_AUTHORIZED_BOUNDED_ROUTE_DOES_NOT_CLOSE_ATTACHMENT_CLASS_SOURCE_GATE','ROUTE_GATE_CONFLATED');

for(const key of [
  'standardTable5ExplicitAttachmentWallThicknessInputAbsent',
  'standardTable5ExplicitSolidHollowInputAbsent',
  'standardTable5ExplicitRigidityFlexibilityInputAbsent'
]) requireTrue(ledger.engineeringConclusions?.[key]===true,`EXPLICIT_TABLE5_FACT_MISSING:${key}`);
for(const key of [
  'roundGeometryAloneProvesAttachmentClass',
  'standardEightPointSolidHollowEquivalencePrimaryVerified',
  'standardEightPointRigidityIndependencePrimaryVerified',
  'attachmentWallThicknessIrrelevancePrimaryVerified',
  'offAxisFlexibleNozzleClassificationQualified',
  'arbitraryRoundObjectAuthorized',
  'structuralLugOrPadAuthorizedByRoundSurrogate',
  'sphericalAttachmentParametersTransferToCylindrical',
  'table5InputSilenceProvesPhysicalIrrelevance'
]) requireTrue(ledger.engineeringConclusions?.[key]===false,`ENGINEERING_CONCLUSION_MUST_REMAIN_FALSE:${key}`);

for(const key of [
  'productionNumericsChanged','routeRegistryChanged','wrcCoefficientsChanged','gammaBetaAuthorityChanged','pressureAuthorityChanged','scfAuthorityChanged','offAxisAuthorityChanged','codeComplianceAuthority','releaseAuthority'
]) requireTrue(ledger.authorityEffect?.[key]===false,`AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for(const phrase of [
  'explicit input-content evidence',
  'round flexible-nozzle connection',
  'do not widen the current bounded route to arbitrary round objects',
  'BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED'
]) requireTrue(authority.includes(phrase),`AUTHORITY_NOTE_MISSING:${phrase}`);

if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1);}
console.log(JSON.stringify({
  status:'PASS_FAIL_CLOSED_PARTIAL_SOURCE_RECONCILIATION',
  table5ClassInputsAbsent:true,
  attachmentClassAuthority:false,
  currentBoundedRouteAuthorized:true,
  disposition:ledger.status
},null,2));
