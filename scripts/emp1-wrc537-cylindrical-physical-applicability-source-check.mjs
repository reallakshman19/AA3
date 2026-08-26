import fs from 'node:fs';

const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const aggregate=read('validation/emp1/wrc537-2013/cylindrical-physical-applicability-source-reconciliation-v1.json');
const axis=read('validation/emp1/wrc537-2013/attachment-axis-intersection-source-qualification-v1.json');
const cls=read('validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json');
const interaction=read('validation/emp1/wrc537-2013/nearby-attachment-interaction-source-qualification-v1.json');
const failures=[];
const req=(v,c)=>{if(!v) failures.push(c);};

req(aggregate.schema==='emp1-wrc537-cylindrical-physical-applicability-source-reconciliation/v1','SCHEMA');
req(aggregate.status==='BLOCKED_PHYSICAL_APPLICABILITY_SOURCE_GATES_REMAIN_OPEN','STATUS');
req(aggregate.sourceCustody?.wrcRawSha256==='698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2','WRC_SHA');
req(aggregate.sourceCustody?.retainedTable5Pages==='41-42','TABLE5_PAGES');
req(aggregate.sourceCustody?.directPdfReobservation==='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT','DIRECT_PDF_STATE');
req(aggregate.currentBoundedRoute?.authorized===true,'CURRENT_ROUTE_AUTHORITY_STALE');
req(aggregate.currentBoundedRoute?.engineeringUseAuthorized===true,'CURRENT_ENGINEERING_AUTHORITY_STALE');
req(aggregate.currentBoundedRoute?.productionUseAuthorized===true,'CURRENT_PRODUCTION_AUTHORITY_STALE');
req(aggregate.currentBoundedRoute?.globalEmp1CAuthority===false,'GLOBAL_AUTHORITY_WIDENED');
req(aggregate.currentBoundedRoute?.codeComplianceAuthority===false,'CODE_AUTHORITY_WIDENED');
req(aggregate.currentBoundedRoute?.professionalReleaseReady===false,'PROFESSIONAL_RELEASE_FALSE_POSITIVE');

for(const key of ['intersectionAngleInputPresent','attachmentWallThicknessInputPresent','solidHollowClassificationInputPresent','rigidityFlexibilityInputPresent','neighborAttachmentGeometryInputPresent','neighborSpacingInputPresent','interactionCorrectionInputPresent']) req(aggregate.retainedTable5ExplicitInputBoundary?.[key]===false,`TABLE5_ABSENCE_MISMATCH:${key}`);
req(aggregate.retainedTable5ExplicitInputBoundary?.classification==='EXPLICIT_TABLE5_INPUT_CONTENT_ONLY_NO_APPLICABILITY_BY_SILENCE','TABLE5_CLASSIFICATION');
req(aggregate.existingQualifiedApplicabilityPreserved?.radialLoadCylinderLength==='l >= Rm when P is active','P_LENGTH_RULE');
req(aggregate.existingQualifiedApplicabilityPreserved?.externalMomentEndDistance==='nearest cylinder end distance >= 0.5*Rm when Mc or Ml is active','MOMENT_END_RULE');
req(aggregate.existingQualifiedApplicabilityPreserved?.changedByThisBatch===false,'EXISTING_APPLICABILITY_MUTATED');

req(axis.status===aggregate.gates.attachmentAxis.status,'AXIS_STATUS_DRIFT');
req(axis.authorityDistinction?.physicalShellNormalProof==='UNRESOLVED','AXIS_NORMALITY_PROMOTED');
req(axis.authorityDistinction?.obliqueWrcApplicability==='NOT_AUTHORIZED','OBLIQUE_PROMOTED');
req(cls.status===aggregate.gates.attachmentClass.status,'CLASS_STATUS_DRIFT');
req(cls.engineeringConclusions?.standardEightPointSolidHollowEquivalencePrimaryVerified===false,'SOLID_HOLLOW_PROMOTED');
req(cls.engineeringConclusions?.standardEightPointRigidityIndependencePrimaryVerified===false,'RIGIDITY_PROMOTED');
req(interaction.status===aggregate.gates.interactionIsolation.status,'INTERACTION_STATUS_DRIFT');
req(interaction.engineeringConclusions?.sourceQualifiedSpacingCriterionAvailable===false,'SPACING_PROMOTED');
req(interaction.engineeringConclusions?.overlappingIndependentWrcResultsMayBeSuperposed===false,'SUPERPOSITION_PROMOTED');

for(const key of ['attachmentAxisGatePass','attachmentClassGatePass','interactionIsolationGatePass','allPhysicalApplicabilityGatesPass','calculationExecutionProvesProfessionalSourceApplicability','releaseReady']) req(aggregate.professionalReleaseDisposition?.[key]===false,`RELEASE_GATE_FALSE_POSITIVE:${key}`);
req(aggregate.professionalReleaseDisposition?.boundedCalculationMayExecuteUnderCurrentOwnerAuthorization===true,'CURRENT_OWNER_AUTHORIZATION_NOT_RETAINED');
for(const key of ['productionNumericsChanged','routeRegistryChanged','aggregateP0GateChanged','globalAuthorityChanged','codeAuthorityChanged','releaseAuthorityChanged']) req(aggregate[key]===false,`COLLATERAL_MUTATION:${key}`);

if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1);}
console.log(JSON.stringify({
  status:'PASS_FAIL_CLOSED_PHYSICAL_APPLICABILITY_RECONCILIATION',
  currentBoundedRouteAuthorized:true,
  axisSourceGate:false,
  attachmentClassSourceGate:false,
  interactionIsolationSourceGate:false,
  professionalReleaseReady:false
},null,2));
