import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const ledger=JSON.parse(fs.readFileSync(path.join(root,'validation/emp1/wrc537-2013/nearby-attachment-interaction-source-qualification-v1.json'),'utf8'));
const authority=fs.readFileSync(path.join(root,'docs/emp1/WRC537_2013_Nearby_Attachment_Interaction_Authority.md'),'utf8');
const failures=[];
const requireTrue=(condition,code)=>{if(!condition) failures.push(code);};

requireTrue(ledger.schema==='emp1-wrc537-nearby-attachment-interaction-source-qualification/v1','SCHEMA_MISMATCH');
requireTrue(ledger.status==='BLOCKED_PARTIAL_PRIMARY_STRESS_ATTENUATION_AND_IDEALIZED_CASE_LIMITATION_QUALIFIED_NEIGHBOR_SPACING_AND_INTERACTION_AUTHORITY_UNRESOLVED','STATUS_MUST_REMAIN_BOUNDED_PARTIAL');
requireTrue(ledger.externalPrimaryTextObservation?.status==='PASS_TEXT_OBSERVED','PRIMARY_TEXT_OBSERVATION_REQUIRED');
requireTrue(ledger.externalPrimaryTextObservation?.documentIdentity==='WRC 537 (2013)','PRIMARY_TEXT_DOCUMENT_IDENTITY');
requireTrue(ledger.externalPrimaryTextObservation?.byteIdentityToPinnedPdf==='UNPROVEN','EXTERNAL_BYTE_IDENTITY_MUST_REMAIN_UNPROVEN');
requireTrue(Array.isArray(ledger.externalPrimaryTextObservation?.locators)&&ledger.externalPrimaryTextObservation.locators.length===2,'PRIMARY_TEXT_LOCATOR_COUNT');
requireTrue(ledger.primarySourceDirectlyReobserved===false,'PINNED_PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(ledger.primarySourceExecutionStatus==='NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT','PRIMARY_SOURCE_EXECUTION_STATUS');
requireTrue(ledger.retainedTable5Evidence?.table==='Table 5','TABLE5_ID');
requireTrue(ledger.retainedTable5Evidence?.pages==='41-42','TABLE5_PAGES');
for(const key of ['neighborAttachmentGeometryInputPresent','localDiscontinuityInventoryInputPresent','neighborSpacingInputPresent','interactionCorrectionInputPresent']) requireTrue(ledger.retainedTable5Evidence?.[key]===false,`TABLE5_INPUT_INVENTED:${key}`);
requireTrue(ledger.retainedTable5Evidence?.classification==='QUALIFIED_TABLE5_EXPLICIT_INPUT_CONTENT_ONLY_NOT_ISOLATION_OR_NONINTERACTION_AUTHORITY','TABLE5_CLASSIFICATION');
requireTrue(ledger.existingQualifiedApplicabilityRulesPreserved?.changedByThisIncrement===false,'EXISTING_4_5_RULES_MUST_REMAIN_UNCHANGED');
requireTrue(ledger.existingQualifiedApplicabilityRulesPreserved?.radialLoadCylinderLength==='l >= Rm when P is active','RADIAL_LOAD_LENGTH_RULE_MISMATCH');
requireTrue(ledger.existingQualifiedApplicabilityRulesPreserved?.externalMomentEndDistance==='nearest cylinder end distance >= 0.5*Rm when Mc or Ml is active','MOMENT_END_DISTANCE_RULE_MISMATCH');

for(const key of [
  'qualitativeStressAttenuationAwayFromJunctureQualified',
  'maximumUsuallyAtJunctureObservationQualified',
  'substantiallyNonidealCaseApplicabilityWarningQualified',
  'appendixA3AndOriginalReferenceReviewDirectionQualified'
]) requireTrue(ledger.partialAuthority?.[key]===true,`PARTIAL_AUTHORITY_REQUIRED:${key}`);
for(const key of [
  'quantitativeNeighborSpacingCriterionQualified',
  'neighborSpacingDistanceBasisQualified',
  'neighborSpacingInclusivityQualified',
  'loadFamilyInteractionDependenceQualified',
  'attachmentAlignmentInteractionDependenceQualified',
  'commonReinforcementInteractionQualified',
  'localDiscontinuitySeparationQualified',
  'independentAttachmentEvaluationQualified',
  'overlappingStressFieldSuperpositionQualified',
  'interactionCorrectionQualified',
  'automaticAlternativeMethodOrFeaTriggerQualified'
]) requireTrue(ledger.partialAuthority?.[key]===false,`UNAUTHORIZED_PARTIAL_AUTHORITY:${key}`);

requireTrue(ledger.currentRouteCapability?.productionRouteAuthority===true,'CURRENT_ROUTE_STATE_STALE');
requireTrue(ledger.currentRouteCapability?.productionRouteAuthorityClassification==='OWNER_AUTHORIZED_BOUNDED_ROUTE_DOES_NOT_CLOSE_INTERACTION_SOURCE_GATE','ROUTE_GATE_CONFLATED');
for(const [key,expected] of Object.entries({
  neighborAttachmentGeometryRetained:false,
  localDiscontinuityInventoryRetained:false,
  interactionCorrectionImplemented:false,
  independentAttachmentStressFieldSuperpositionAuthority:false
})) requireTrue(ledger.currentRouteCapability?.[key]===expected,`CURRENT_CAPABILITY_MISMATCH:${key}`);

for(const key of [
  'table5ExplicitNeighborGeometryInputAbsent',
  'table5ExplicitSpacingInputAbsent',
  'primaryTextSupportsQualitativeStressAttenuation',
  'primaryTextIdentifiesIdealizedCaseApplicabilityBoundary'
]) requireTrue(ledger.engineeringConclusions?.[key]===true,`QUALIFIED_ENGINEERING_FACT_MISSING:${key}`);
for(const key of [
  'existingEndDistanceRulesProveNeighborNoninteraction',
  'rapidStressAttenuationProvesNeighborNoninteraction',
  'rapidStressAttenuationDefinesASeparationDistance',
  'maximumUsuallyAtJunctureProvesAllRemoteStressNegligible',
  'idealizedCaseWarningAuthorizesAutomaticFea',
  'absenceOfNeighborInputsProvesIsolation',
  'nearbyAttachmentInteractionAccountedFor',
  'nearbyDiscontinuityInteractionAccountedFor',
  'sourceQualifiedSpacingCriterionAvailable',
  'sourceQualifiedInteractionCorrectionAvailable',
  'overlappingIndependentWrcResultsMayBeSuperposed',
  'table5InputSilenceProvesNoninteraction'
]) requireTrue(ledger.engineeringConclusions?.[key]===false,`ENGINEERING_CONCLUSION_MUST_REMAIN_FALSE:${key}`);

for(const key of ['productionNumericsChanged','applicabilityNumericsChanged','productionGeometryEvidenceChanged','interactionModelImplemented','routeRegistryChanged','gammaBetaAuthorityChanged','pressureAuthorityChanged','scfAuthorityChanged','offAxisAuthorityChanged','codeComplianceAuthority','releaseAuthority']) requireTrue(ledger.authorityEffect?.[key]===false,`AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for(const phrase of [
  'qualitative only',
  'does **not** authorize claims that nearby attachments',
  'SUBSTANTIALLY_NONIDEAL_CASES_REQUIRE_DEEPER_SOURCE_APPLICABILITY_REVIEW',
  '§4.5 end-distance checks pass',
  'does not prove isolation or noninteraction',
  'Independent WRC results are not automatically superposable',
  'BLOCKED_PARTIAL_PRIMARY_STRESS_ATTENUATION_AND_IDEALIZED_CASE_LIMITATION_QUALIFIED_NEIGHBOR_SPACING_AND_INTERACTION_AUTHORITY_UNRESOLVED'
]) requireTrue(authority.includes(phrase),`AUTHORITY_NOTE_MISSING:${phrase}`);

if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1);}
console.log(JSON.stringify({
  status:'PASS_FAIL_CLOSED_PARTIAL_PRIMARY_SOURCE_RECONCILIATION',
  qualitativeStressAttenuationQualified:true,
  idealizedCaseApplicabilityWarningQualified:true,
  quantitativeNeighborSpacingAuthority:false,
  independentAttachmentSuperpositionAuthority:false,
  existingWrc45RulesPreserved:true,
  currentBoundedRouteAuthorized:true
},null,2));
