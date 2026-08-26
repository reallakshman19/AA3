import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const ledger = readJson('validation/emp1/wrc537-2013/shell-thickness-basis-source-qualification-v1.json');
const authority = read('docs/emp1/WRC537_2013_Shell_Thickness_Basis_Authority.md');
const retainedSource = read('docs/emp1/WRC537_2013_Tables_and_Charts.md');
const routeSource = read('src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js');
const registrySource = read('src/core/emp1/emp1-c-bounded-route-registry.js');
const professionalState = readJson('validation/emp1/release/emp1-professional-release-current-state-v1.json');

const failures = [];
const requireTrue = (condition, code) => { if (!condition) failures.push(code); };

requireTrue(
  ledger.schema === 'emp1-wrc537-shell-thickness-basis-source-qualification/v1',
  'SCHEMA_MISMATCH',
);
requireTrue(
  ledger.status === 'BLOCKED_WRC_SHELL_THICKNESS_PHYSICAL_BASIS_UNRESOLVED_TABLE5_ROLE_RECONCILED',
  'STATUS_MUST_RETAIN_PHYSICAL_BASIS_BLOCK',
);
requireTrue(ledger.primarySourceDirectlyReobserved === false, 'PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(
  ledger.primarySourceExecutionStatus === 'NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT',
  'PRIMARY_SOURCE_EXECUTION_STATUS_MISMATCH',
);

const table5Start = retainedSource.indexOf('### Table 5');
const table6Start = retainedSource.indexOf('### Table 6', table5Start + 1);
requireTrue(table5Start >= 0, 'RETAINED_TABLE5_NOT_FOUND');
requireTrue(table6Start > table5Start, 'RETAINED_TABLE5_BOUNDARY_NOT_FOUND');
const table5 = retainedSource.slice(table5Start, table6Start);
requireTrue(table5.includes('Vessel Thickness'), 'TABLE5_VESSEL_THICKNESS_LABEL_NOT_FOUND');
requireTrue(table5.includes('R γ= m = T'), 'TABLE5_GAMMA_RM_OVER_T_TRANSCRIPTION_NOT_FOUND');
requireTrue(table5.includes('T2'), 'TABLE5_T_SQUARED_STRESS_SCALE_NOT_FOUND');

requireTrue(ledger.retainedSourceAuthority?.table === 5, 'RETAINED_SOURCE_TABLE_MISMATCH');
requireTrue(
  JSON.stringify(ledger.retainedSourceAuthority?.pdfPages) === JSON.stringify([41, 42]),
  'RETAINED_SOURCE_PAGES_MISMATCH',
);
requireTrue(ledger.retainedSourceAuthority?.cylindricalGeometryLabel === 'Vessel Thickness', 'TABLE5_LABEL_MISMATCH');
requireTrue(ledger.retainedSourceAuthority?.cylindricalThicknessSymbol === 'T', 'TABLE5_SYMBOL_MISMATCH');
requireTrue(ledger.retainedSourceAuthority?.gammaRelationship === 'gamma = R_m/T', 'TABLE5_GAMMA_ROLE_MISMATCH');
requireTrue(
  ledger.retainedSourceAuthority?.physicalThicknessBasisDefinitionPresentInRetainedTable5 === false,
  'TABLE5_MUST_NOT_CLAIM_PHYSICAL_BASIS',
);

for (const key of [
  'cylindricalThicknessSymbolQualified',
  'cylindricalGeometryLabelQualified',
  'thicknessUsedInGammaQualified',
  'thicknessUsedInTable5StressScalingQualified',
]) requireTrue(ledger.partialAuthority?.[key] === true, `RETAINED_TABLE5_AUTHORITY_REQUIRED:${key}`);

for (const key of [
  'nominalThicknessBasisQualified',
  'actualThicknessBasisQualified',
  'minimumThicknessBasisQualified',
  'corrodedAssessmentThicknessBasisQualified',
  'corrosionAllowanceTreatmentQualified',
  'millToleranceOrFormingThinningTreatmentQualified',
  'measuredLocalThinningTreatmentQualified',
  'junctureVersusRemoteCourseThicknessQualified',
  'locallyThickenedInsertOrPadTreatmentQualified',
  'radiusThicknessPhysicalConsistencyRuleQualified',
]) requireTrue(ledger.partialAuthority?.[key] === false, `PHYSICAL_BASIS_MUST_REMAIN_BLOCKED:${key}`);

requireTrue(
  JSON.stringify(ledger.currentSoftwareCustody?.foundationThicknessPolicies) ===
    JSON.stringify(['NOMINAL_MINUS_CORROSION', 'EXPLICIT_ASSESSMENT']),
  'FOUNDATION_THICKNESS_POLICIES_MISMATCH',
);
requireTrue(
  ledger.currentSoftwareCustody?.wrcCustodyThicknessDerivationLabel === 'LAFEA2_ASSESSMENT_PIPE_THICKNESS',
  'WRC_CUSTODY_THICKNESS_DERIVATION_MISMATCH',
);
requireTrue(
  ledger.currentSoftwareCustody?.wrcMeanRadiusDerivation === 'pipeOutsideDiameter/2 - assessmentPipeThickness/2',
  'WRC_MEAN_RADIUS_DERIVATION_MISMATCH',
);
requireTrue(ledger.currentSoftwareCustody?.internallyDeterministic === true, 'CURRENT_CHAIN_MUST_BE_DETERMINISTIC');
requireTrue(
  ledger.currentSoftwareCustody?.wrcPrimaryPhysicalThicknessBasisQualified === false,
  'PHYSICAL_THICKNESS_BASIS_MUST_REMAIN_UNQUALIFIED',
);

for (const key of [
  'positiveThicknessValueAloneProvesWrcBasis',
  'lafeaAssessmentPolicyEqualsWrcSourceRule',
  'nominalMinusCorrosionAuthorizedByWrc',
  'explicitAssessmentThicknessAuthorizedByWrc',
  'automaticCorrosionAllowanceSubtractionAuthorizedByWrc',
  'measuredMinimumThicknessAutomaticallyAuthorizedAsWrcT',
  'reinforcementPadThicknessMaySubstituteForShellT',
  'nominalRadiusMayBeMixedWithDifferentNetThicknessWithoutGeometryRule',
  'productionThicknessBasisAuthority',
]) requireTrue(ledger.engineeringConclusions?.[key] === false, `ENGINEERING_CONCLUSION_MUST_REMAIN_FALSE:${key}`);
requireTrue(ledger.engineeringConclusions?.table5IdentifiesCylindricalVesselThicknessAsT === true, 'TABLE5_T_IDENTITY_MUST_BE_RETAINED');
requireTrue(ledger.engineeringConclusions?.table5UsesTInGamma === true, 'TABLE5_T_GAMMA_ROLE_MUST_BE_RETAINED');
requireTrue(ledger.engineeringConclusions?.table5UsesTInStressScaling === true, 'TABLE5_T_STRESS_ROLE_MUST_BE_RETAINED');
requireTrue(ledger.engineeringConclusions?.currentRmAndTAreInternallyCoherent === true, 'CURRENT_RM_T_COHERENCE_MUST_BE_RETAINED');

// Current runtime authority and this source record's authority are intentionally orthogonal.
requireTrue(
  routeSource.includes('export const EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true;'),
  'CURRENT_BOUNDED_ROUTE_MUST_BE_AUTHORIZED',
);
requireTrue(
  routeSource.includes('engineeringUseAuthorized: true') && routeSource.includes('productionUseAuthorized: true'),
  'CURRENT_METHOD_USE_AUTHORITY_MUST_BE_TRUE',
);
requireTrue(
  registrySource.includes('registered: true') && registrySource.includes('engineeringUseAuthorized: true'),
  'CURRENT_REGISTRY_BOUNDED_USE_MUST_BE_TRUE',
);
requireTrue(
  registrySource.includes('globalEmp1CRouteAuthority: false') && registrySource.includes('releaseQualified: false'),
  'CURRENT_REGISTRY_GLOBAL_RELEASE_MUST_REMAIN_FALSE',
);

for (const key of [
  'boundedRouteAuthorized',
  'registryRegistered',
  'boundedEngineeringUseAuthorized',
  'boundedProductionUseAuthorized',
]) requireTrue(ledger.currentLiveRouteState?.[key] === true, `CURRENT_ROUTE_STATE_MUST_BE_TRUE:${key}`);
for (const key of [
  'globalEmp1CAuthority',
  'codeComplianceAuthority',
  'releaseQualified',
  'professionalReleaseReady',
]) requireTrue(ledger.currentLiveRouteState?.[key] === false, `CURRENT_ROUTE_WIDER_AUTHORITY_MUST_BE_FALSE:${key}`);

requireTrue(ledger.authoritySeparation?.physicalThicknessBasisSourceAuthority === false, 'THICKNESS_SOURCE_AUTHORITY_MUST_REMAIN_FALSE');
requireTrue(ledger.authoritySeparation?.currentRouteMayExecuteWithHistoricalBoundedThicknessCustody === true, 'HISTORICAL_BOUNDED_CUSTODY_ROUTE_STATE_MISMATCH');
requireTrue(ledger.authoritySeparation?.currentRouteExecutionProvesPhysicalThicknessBasis === false, 'ROUTE_EXECUTION_MUST_NOT_PROVE_THICKNESS_BASIS');
requireTrue(ledger.authoritySeparation?.routeAuthorizationMayBackPropagateIntoThicknessSourceAuthority === false, 'ROUTE_AUTHORITY_BACK_PROPAGATION_PROHIBITED');
requireTrue(
  ledger.authoritySeparation?.rule ===
    'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_SHELL_THICKNESS_PHYSICAL_BASIS_SOURCE_AUTHORITY',
  'AUTHORITY_SEPARATION_RULE_MISMATCH',
);

requireTrue(professionalState.runtimeAuthority?.boundedProductionRouteAuthorized === true, 'PROFESSIONAL_STATE_BOUNDED_ROUTE_MUST_BE_TRUE');
requireTrue(professionalState.runtimeAuthority?.boundedEngineeringUseAuthorized === true, 'PROFESSIONAL_STATE_ENGINEERING_USE_MUST_BE_TRUE');
requireTrue(professionalState.runtimeAuthority?.globalEmp1CRouteAuthority === false, 'PROFESSIONAL_STATE_GLOBAL_AUTHORITY_MUST_BE_FALSE');
requireTrue(professionalState.runtimeAuthority?.codeComplianceAuthorized === false, 'PROFESSIONAL_STATE_CODE_AUTHORITY_MUST_BE_FALSE');
requireTrue(professionalState.runtimeAuthority?.releaseQualified === false, 'PROFESSIONAL_STATE_RELEASE_MUST_BE_FALSE');
requireTrue(professionalState.releaseReady === false, 'PROFESSIONAL_RELEASE_READY_MUST_BE_FALSE');

for (const key of [
  'productionThicknessConversionChanged',
  'productionNumericsChanged',
  'sourceCustodyImplementationChanged',
  'routeRegistryChanged',
  'gammaBetaImplementationChanged',
  'aggregateP0GateChanged',
  'pressureAuthorityChanged',
  'scfAuthorityChanged',
  'thisRecordWidensBoundedRouteAuthority',
  'thisRecordGrantsThicknessBasisSourceAuthority',
  'globalEmp1CAuthorityChanged',
  'codeComplianceAuthorityChanged',
  'releaseAuthorityChanged',
]) requireTrue(ledger.authorityEffect?.[key] === false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for (const phrase of [
  'Table 5 identifies the cylindrical geometry quantity as `Vessel Thickness T`',
  'does not define which physical thickness basis must be selected',
  'Do not promote `NOMINAL_MINUS_CORROSION` to a WRC source rule',
  'BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_SHELL_THICKNESS_PHYSICAL_BASIS_SOURCE_AUTHORITY',
  'bounded route is authorized',
  'physical thickness-basis source authority remains false',
]) requireTrue(authority.includes(phrase), `AUTHORITY_NOTE_MISSING:${phrase}`);

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS_CURRENT_AUTHORIZED_ROUTE_THICKNESS_SOURCE_BOUNDARY_STATIC_CHECK',
  qualificationId: ledger.qualificationId,
  disposition: ledger.status,
  boundedRouteAuthorized: ledger.currentLiveRouteState.boundedRouteAuthorized,
  productionThicknessBasisAuthority: ledger.engineeringConclusions.productionThicknessBasisAuthority,
  globalEmp1CAuthority: ledger.currentLiveRouteState.globalEmp1CAuthority,
  codeComplianceAuthority: ledger.currentLiveRouteState.codeComplianceAuthority,
  releaseQualified: ledger.currentLiveRouteState.releaseQualified,
}, null, 2));
