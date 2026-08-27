import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(root,'validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json'),'utf8'));
const authority = fs.readFileSync(path.join(root,'docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md'),'utf8');
const failures=[];
const requireTrue=(condition,code)=>{if(!condition) failures.push(code);};

requireTrue(ledger.schema==='emp1-wrc537-cylindrical-attachment-class-source-qualification/v1','SCHEMA_MISMATCH');
requireTrue(ledger.qualificationId==='EMP1_WRC537_2013_CYLINDRICAL_ATTACHMENT_CLASS_SOURCE_Q2','QUALIFICATION_ID_MISMATCH');
requireTrue(ledger.status==='BLOCKED_PARTIAL_PRIMARY_STANDARD_CYLINDRICAL_ROUND_CLASS_QUALIFIED_NONSTANDARD_CLASS_BOUNDARIES_UNQUALIFIED','STATUS_MISMATCH');
requireTrue(ledger.sourceDocument?.rawSha256==='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2','SOURCE_SHA_MISMATCH');
requireTrue(ledger.sourceDocument?.gitBlobSha==='ce861233928154145a9257efbbf8dbef3f5a17d1','SOURCE_BLOB_MISMATCH');
requireTrue(ledger.primarySourceDirectlyReobserved===false,'PINNED_PRIMARY_REOBSERVATION_MUST_REMAIN_FALSE');
requireTrue(ledger.primarySourceExecutionStatus==='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT','PINNED_PRIMARY_EXECUTION_STATUS_MISMATCH');
requireTrue(ledger.primaryTextObservation?.externalRenderingByteIdentityToPinnedPdf==='UNPROVEN','EXTERNAL_RENDERING_BYTE_IDENTITY_MUST_REMAIN_UNPROVEN');
requireTrue(ledger.primaryTextObservation?.pinnedPdfDirectPageObservation==='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT','PINNED_PAGE_OBSERVATION_MISMATCH');

const observedSections = new Set((ledger.primaryTextObservation?.locators ?? []).map((row)=>row.section));
for(const required of ['1.3','4.2.2','4.2.2.1','4.3.4','4.5.3','Appendix A discussion of off-axis maximum stresses']) {
  requireTrue(observedSections.has(required),`PRIMARY_TEXT_LOCATOR_MISSING:${required}`);
}

requireTrue(ledger.retainedTable5Evidence?.table==='Table 5','TABLE5_ID');
requireTrue(ledger.retainedTable5Evidence?.pages==='41-42','TABLE5_PAGES');
requireTrue(JSON.stringify(ledger.retainedTable5Evidence?.explicitAttachmentGeometryInputs)===JSON.stringify(['r0']),'TABLE5_ATTACHMENT_GEOMETRY_INPUTS');
requireTrue(ledger.retainedTable5Evidence?.attachmentWallThicknessInputPresent===false,'TABLE5_ATTACHMENT_THICKNESS_INPUT_INVENTED');
requireTrue(ledger.retainedTable5Evidence?.solidHollowClassificationInputPresent===false,'TABLE5_SOLID_HOLLOW_INPUT_INVENTED');
requireTrue(ledger.retainedTable5Evidence?.rigidityFlexibilityInputPresent===false,'TABLE5_RIGIDITY_INPUT_INVENTED');

requireTrue(ledger.currentRoute?.shellFamily==='CYLINDRICAL','CURRENT_ROUTE_SHELL_FAMILY_MISMATCH');
requireTrue(ledger.currentRoute?.attachmentShape==='ROUND','CURRENT_ROUTE_ATTACHMENT_SHAPE_MISMATCH');
requireTrue(JSON.stringify(ledger.currentRoute?.standardTable5EightPointFiguresForLongitudinalMoment)===JSON.stringify(['1B','2B']),'STANDARD_LONGITUDINAL_FIGURE_SET_MISMATCH');
requireTrue(ledger.currentRoute?.offAxisFiguresAuthorizedByCurrentBoundedRoute===false,'OFF_AXIS_ROUTE_MUST_REMAIN_FALSE');
requireTrue(ledger.currentRoute?.productionRouteAuthority===true,'CURRENT_ROUTE_STATE_STALE');

for(const key of [
  'standardCylindricalAttachmentGeometryFamiliesPrimaryVerified',
  'standardRoundAttachmentParameterizationPrimaryVerified',
  'cylindricalR0OutsideRadiusMeaningPrimaryVerified',
  'roundPipeExampleWithinStandardCylindricalFamilyPrimaryVerified',
  'nozzleRecognizedAsAttachmentCaseForShellStressProcedurePrimaryVerified',
  'standardHostShellRoundRouteClassQualified',
  'offAxisFlexibleNozzleRestrictionPrimaryVerified'
]) requireTrue(ledger.engineeringConclusions?.[key]===true,`PRIMARY_CLASS_FACT_MISSING:${key}`);

requireTrue(JSON.stringify(ledger.engineeringConclusions?.standardCylindricalFamilies)===JSON.stringify(['ROUND','RECTANGULAR']),'CYLINDRICAL_FAMILY_SET_MISMATCH');
requireTrue(ledger.engineeringConclusions?.standardRoundAttachmentParameterization==='beta = 0.875*r0/Rm','ROUND_PARAMETERIZATION_MISMATCH');

for(const key of [
  'standardRouteSolidHollowSelectorDefinedBySource',
  'standardRouteRigidityFlexibilitySelectorDefinedBySource',
  'standardRouteAttachmentWallThicknessParameterDefinedBySource',
  'standardHostShellRoundRouteRequiresSolidHollowDistinctionForCurveSelection',
  'standardHostShellRoundRouteRequiresRigidityFlexibilityDistinctionForCurveSelection',
  'standardHostShellRoundRouteRequiresAttachmentWallThicknessForSection4Parameterization',
  'offAxisFlexibleNozzleClassificationQualified',
  'arbitraryRoundObjectAuthorized',
  'structuralLugOrPadAuthorizedByRoundSurrogate',
  'reinforcementOrLocalThickeningApplicabilityQualified',
  'largeOrDeviantAttachmentGeneralized',
  'sphericalAttachmentParametersTransferToCylindrical',
  'solidHollowPhysicalEquivalenceClaimed'
]) requireTrue(ledger.engineeringConclusions?.[key]===false,`FAIL_CLOSED_CLASS_BOUNDARY_MISMATCH:${key}`);

requireTrue(ledger.qualifiedBoundedClass?.identity==='WRC537_CYLINDRICAL_STANDARD_ROUND_HOST_SHELL_ATTACHMENT','QUALIFIED_BOUNDED_CLASS_ID_MISMATCH');
requireTrue(ledger.qualifiedBoundedClass?.hostShellStressOnly===true,'HOST_SHELL_ONLY_REQUIRED');
requireTrue(ledger.qualifiedBoundedClass?.standardAxesOfSymmetryEightPointRouteOnly===true,'STANDARD_EIGHT_POINT_ONLY_REQUIRED');
requireTrue(ledger.qualifiedBoundedClass?.offAxisMaximumStressFiguresAuthorized===false,'OFF_AXIS_AUTHORITY_MUST_REMAIN_FALSE');
requireTrue(ledger.qualifiedBoundedClass?.attachmentWallStressAuthorized===false,'ATTACHMENT_WALL_STRESS_MUST_REMAIN_FALSE');
requireTrue(ledger.qualifiedBoundedClass?.structuralRoundSurrogateAuthorized===false,'STRUCTURAL_SURROGATE_MUST_REMAIN_FALSE');
requireTrue(ledger.qualifiedBoundedClass?.reinforcementSpecificAuthority===false,'REINFORCEMENT_AUTHORITY_MUST_REMAIN_FALSE');

for(const key of [
  'productionNumericsChanged','routeRegistryChanged','wrcCoefficientsChanged','gammaBetaAuthorityChanged','pressureAuthorityChanged','scfAuthorityChanged','offAxisAuthorityChanged','codeComplianceAuthority','releaseAuthority'
]) requireTrue(ledger.authorityEffect?.[key]===false,`AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for(const phrase of [
  'standard cylindrical round host-shell attachment',
  'round flexible-nozzle connection',
  'arbitrary round object',
  'external rendering is not byte custody',
  'BLOCKED_PARTIAL_PRIMARY_STANDARD_CYLINDRICAL_ROUND_CLASS_QUALIFIED_NONSTANDARD_CLASS_BOUNDARIES_UNQUALIFIED'
]) requireTrue(authority.includes(phrase),`AUTHORITY_NOTE_MISSING:${phrase}`);

if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1);}
console.log(JSON.stringify({
  status:'PASS_FAIL_CLOSED_PRIMARY_STANDARD_ROUND_CLASS_RECONCILIATION',
  standardRoundHostShellClassQualified:true,
  offAxisFlexibleNozzleClassQualified:false,
  arbitraryRoundObjectAuthorized:false,
  nonstandardClassBoundariesQualified:false,
  currentBoundedRouteAuthorized:true,
  disposition:ledger.status
},null,2));
