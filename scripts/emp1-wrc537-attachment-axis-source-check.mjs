import fs from 'node:fs';

const q=JSON.parse(fs.readFileSync('validation/emp1/wrc537-2013/attachment-axis-intersection-source-qualification-v1.json','utf8'));
const doc=fs.readFileSync('docs/emp1/WRC537_2013_Attachment_Axis_Authority.md','utf8');
const frame=fs.readFileSync('src/core/emp1/emp1-wrc537-cylindrical-frame.js','utf8');
const axis=fs.readFileSync('src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js','utf8');
const fail=(m)=>{throw new Error(`EMP1_WRC537_ATTACHMENT_AXIS_SOURCE_CHECK:${m}`)};
const requireText=(text,token,label)=>{if(!text.includes(token)) fail(`${label}:${token}`)};

if(q.schema!=='emp1-wrc537-attachment-axis-intersection-source-qualification/v1') fail('SCHEMA');
if(q.status!=='BLOCKED_PARTIAL_PRIMARY_SHELL_NORMAL_REFERENCE_AXIS_QUALIFIED_PHYSICAL_ATTACHMENT_AXIS_COINCIDENCE_AND_OBLIQUE_APPLICABILITY_UNRESOLVED') fail('STATUS');
if(q.engineeringAuthority!==false) fail('ENGINEERING_AUTHORITY_WIDENED');
if(q.obliqueAttachmentAuthority!==false) fail('OBLIQUE_AUTHORITY_WIDENED');

if(q.primarySource?.gitBlobSha!=='ce861233928154145a9257efbbf8dbef3f5a17d1') fail('PDF_BLOB');
if(q.primarySource?.rawPdfSha256!=='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2') fail('PDF_SHA256');
if(q.primarySource?.primaryPageInspection!=='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT') fail('DIRECT_PDF_STATE');
if(q.primarySource?.externalReadableRenderingObserved!==true) fail('EXTERNAL_PRIMARY_RENDERING_NOT_RETAINED');
if(q.primarySource?.externalRenderingByteIdentityToPinnedPdf!=='UNPROVEN') fail('EXTERNAL_BYTE_IDENTITY_OVERCLAIMED');
if(q.primarySource?.observedLocator!=='WRC537_2013_NOMENCLATURE_GENERAL_NOMENCLATURE') fail('PRIMARY_LOCATOR');
if(q.primarySource?.shellNormalReferenceAxisObserved!==true) fail('SHELL_NORMAL_REFERENCE_AXIS_NOT_QUALIFIED');
if(q.primarySource?.shellNormalReferenceAxisMeaning!=='AXIS_NORMAL_TO_SHELL_THROUGH_CENTER_OF_ATTACHMENT') fail('SHELL_NORMAL_REFERENCE_AXIS_MEANING');
if(q.primarySource?.cylindricalDirectionReferenceObserved!==true) fail('CYLINDRICAL_DIRECTION_REFERENCE_NOT_QUALIFIED');
if(q.primarySource?.cylindricalDirectionReferenceMeaning!=='LONGITUDINAL_AND_CIRCUMFERENTIAL_DIRECTIONS_WITH_RESPECT_TO_CYLINDER_AXIS') fail('CYLINDRICAL_DIRECTION_REFERENCE_MEANING');
if(q.primarySource?.classification!=='PRIMARY_TEXT_OBSERVATION_EXTERNAL_RENDERING_ONLY_PINNED_PDF_BYTE_IDENTITY_UNPROVEN') fail('PRIMARY_CLASSIFICATION');

if(q.retainedSourceEvidence?.path!=='docs/emp1/WRC537_2013_Tables_and_Charts.md') fail('RETAINED_SOURCE_PATH');
if(q.retainedSourceEvidence?.table!=='Table 5') fail('TABLE5_ID');
if(q.retainedSourceEvidence?.pages!=='41-42') fail('TABLE5_PAGES');
if(q.retainedSourceEvidence?.explicitIntersectionAngleInputPresent!==false) fail('ANGLE_INPUT_INVENTED');
if(q.retainedSourceEvidence?.explicitObliquityInputPresent!==false) fail('OBLIQUITY_INPUT_INVENTED');
if(q.retainedSourceEvidence?.explicitPhysicalNormalityRulePresentInRetainedTable5!==false) fail('TABLE5_NORMALITY_RULE_INVENTED');
if(q.retainedSourceEvidence?.classification!=='QUALIFIED_TABLE5_EXPLICIT_INPUT_CONTENT_ONLY_NOT_PHYSICAL_NORMALITY_AUTHORITY') fail('TABLE5_CLASSIFICATION');

if(q.secondaryResearch?.declaredStatus!=='NOT_READY_FOR_IMPLEMENTATION') fail('SECONDARY_STATUS');
if(q.currentSoftwareGuard?.nonOrthogonalDiagnostic!=='EMP1_WRC537_FRAME_NON_ORTHOGONAL') fail('GUARD_DIAGNOSTIC');
if(q.currentSoftwareGuard?.defaultOrthogonalityTolerance!==1e-10) fail('GUARD_TOLERANCE');
if(q.currentSoftwareGuard?.classification!=='MATHEMATICAL_VECTOR_GUARD_ONLY_NOT_PRIMARY_APPLICABILITY_PROOF') fail('GUARD_CLASSIFICATION');
if(q.currentQualifiedAxisAuthority?.sourceToTargetVectorRole!=='SOFTWARE_DERIVED_PLUS_P_BASIS') fail('AXIS_AUTHORITY_ROLE');
if(q.currentQualifiedAxisAuthority?.requiresLongitudinalOrthogonality!==true) fail('AXIS_ORTHOGONALITY_GUARD_MISSING');
if(q.currentQualifiedAxisAuthority?.requiresRetainedRadialCollinearity!==true) fail('AXIS_RADIAL_GUARD_MISSING');
if(q.currentQualifiedAxisAuthority?.classification!=='SOURCE_BOUND_SOFTWARE_GEOMETRY_CUSTODY_NOT_PROOF_OF_PHYSICAL_ATTACHMENT_AXIS_COINCIDENCE') fail('AXIS_AUTHORITY_CLASSIFICATION');

if(q.currentBoundedRouteObservation?.routeAuthorized!==true) fail('CURRENT_ROUTE_STATE_STALE');
if(q.currentBoundedRouteObservation?.classification!=='ROUTE_AUTHORIZATION_DOES_NOT_CLOSE_ATTACHMENT_AXIS_SOURCE_GATE') fail('ROUTE_GATE_CONFLATED');

if(q.authorityDistinction?.table5ExplicitAngleInputAbsence!=='QUALIFIED_RETAINED_SOURCE_TEXT') fail('TABLE5_INPUT_FACT_NOT_RETAINED');
if(q.authorityDistinction?.wrcShellNormalReferenceAxis!=='QUALIFIED_PRIMARY_TEXT_OBSERVATION_EXTERNAL_RENDERING') fail('REFERENCE_AXIS_AUTHORITY_MISSING');
if(q.authorityDistinction?.wrcShellNormalReferenceAxisThroughAttachmentCenter!==true) fail('REFERENCE_AXIS_CENTER_CUSTODY');
if(q.authorityDistinction?.vectorOrthogonality!=='IMPLEMENTED_FAIL_CLOSED_GUARD') fail('VECTOR_GUARD_STATE');
if(q.authorityDistinction?.physicalAttachmentAxisCoincidenceWithWrcShellNormal!=='UNRESOLVED') fail('PHYSICAL_AXIS_COINCIDENCE_PROMOTED');
if(q.authorityDistinction?.attachmentStationPhysicalNormalCustody!=='UNRESOLVED') fail('ATTACHMENT_STATION_CUSTODY_PROMOTED');
if(q.authorityDistinction?.obliqueWrcApplicability!=='NOT_AUTHORIZED') fail('OBLIQUE_APPLICABILITY_WIDENED');
if(q.authorityDistinction?.numericalToleranceMeaning!=='FLOATING_POINT_EQUIVALENCE_ONLY_NOT_ENGINEERING_ANGLE_ALLOWANCE') fail('TOLERANCE_MEANING');

if(q.authorization?.retainCurrentNonOrthogonalRejection!==true) fail('NON_ORTHOGONAL_REJECTION_NOT_RETAINED');
if(q.authorization?.widenOrthogonalityTolerance!==false) fail('TOLERANCE_WIDENED');
if(q.authorization?.shellNormalReferenceAxisSourceQualified!==true) fail('REFERENCE_AXIS_SOURCE_NOT_QUALIFIED');
if(q.authorization?.physicalAttachmentAxisCoincidenceSourceGateClosed!==false) fail('PHYSICAL_AXIS_GATE_FALSE_POSITIVE');
if(q.authorization?.obliqueGeometryImplementationAllowed!==false) fail('OBLIQUE_IMPLEMENTATION_WIDENED');
if(q.authorization?.physicalNormalitySourceGateClosed!==false) fail('FULL_SOURCE_GATE_FALSE_POSITIVE');
if(q.authorization?.requiredNextGate!=='PHYSICAL_ATTACHMENT_AXIS_COINCIDENCE_AND_OBLIQUE_APPLICABILITY_SOURCE_CLOSURE') fail('NEXT_GATE');
if(q.productionNumericsChanged!==false) fail('PRODUCTION_NUMERICS_CHANGED');
if(q.collateralAuthorityWidened!==false) fail('COLLATERAL_AUTHORITY_WIDENED');

for(const required of [
  'NO_OBLIQUE_TO_RADIAL_PROJECTION',
  'NO_EQUIVALENT_PERPENDICULAR_SURROGATE',
  'NO_ENGINEERING_ANGLE_ALLOWANCE_FROM_1E_10_TOLERANCE',
  'NO_PHYSICAL_NORMALITY_CLAIM_FROM_CENTERLINE_ORTHOGONALITY_ALONE',
  'NO_ATTACHMENT_AXIS_COINCIDENCE_INFERENCE_FROM_REFERENCE_AXIS_WORDING',
  'NO_OBLIQUE_APPLICABILITY_FROM_REFERENCE_AXIS_WORDING',
  'NO_OBLIQUE_PRODUCTION_ROUTE',
  'NO_APPLICABILITY_INFERENCE_FROM_TABLE5_ANGLE_FIELD_ABSENCE'
]) if(!(q.prohibitions||[]).includes(required)) fail(`MISSING_PROHIBITION:${required}`);

for(const required of [
  'PHYSICAL_ATTACHMENT_AXIS_TO_WRC_SHELL_NORMAL_COINCIDENCE',
  'CYLINDRICAL_LOCAL_NORMAL_CONSTRUCTION_AT_ATTACHMENT_STATION',
  'SPHERICAL_LOCAL_NORMAL_CONSTRUCTION_AT_ATTACHMENT_STATION',
  'ATTACHMENT_STATION_GEOMETRY_CUSTODY',
  'ANGULAR_DOMAIN_OR_EXACT_90_DEGREE_RULE',
  'ECCENTRICITY_OFFSET_RULE',
  'LOAD_REFERENCE_TRANSLATION_COMPATIBILITY',
  'OBLIQUE_GEOMETRY_DISPOSITION'
]) if(!(q.requiredPrimaryClosures||[]).includes(required)) fail(`MISSING_REMAINING_CLOSURE:${required}`);

requireText(doc,'BLOCKED_PARTIAL_PRIMARY_SHELL_NORMAL_REFERENCE_AXIS_QUALIFIED_PHYSICAL_ATTACHMENT_AXIS_COINCIDENCE_AND_OBLIQUE_APPLICABILITY_UNRESOLVED','DOC_STATUS');
requireText(doc,'axis normal to the shell through the center of the attachment','DOC_PRIMARY_REFERENCE_AXIS');
requireText(doc,'External-rendering byte identity to the controlled pinned PDF remains:','DOC_BYTE_IDENTITY_BOUNDARY');
requireText(doc,'UNPROVEN','DOC_BYTE_IDENTITY_STATE');
requireText(doc,'physical attachment-axis coincidence qualified    = false','DOC_PHYSICAL_AXIS_FALSE');
requireText(doc,'oblique/skewed applicability authorized            = false','DOC_OBLIQUE_FALSE');

requireText(frame,"orthogonalityTolerance=1e-10",'FRAME_TOLERANCE');
requireText(frame,'EMP1_WRC537_FRAME_NON_ORTHOGONAL','FRAME_NON_ORTHOGONAL_DIAGNOSTIC');
requireText(axis,'EMP1_WRC537_AXIS_SOURCE_TO_TARGET_NOT_RADIAL','AXIS_RADIAL_GUARD');
requireText(axis,'EMP1_WRC537_AXIS_SOURCE_TO_TARGET_NOT_COLLINEAR_WITH_RADIAL','AXIS_COLLINEARITY_GUARD');

console.log(JSON.stringify({
  status:'PASS_FAIL_CLOSED_SHELL_NORMAL_REFERENCE_AXIS_PARTIAL_SOURCE_QUALIFICATION',
  wrcShellNormalReferenceAxisQualified:true,
  physicalAttachmentAxisCoincidenceAuthority:false,
  obliqueAuthority:false,
  engineeringAngleAllowanceAuthority:false,
  currentBoundedRouteAuthorized:true,
  productionNumericsChanged:false
},null,2));
