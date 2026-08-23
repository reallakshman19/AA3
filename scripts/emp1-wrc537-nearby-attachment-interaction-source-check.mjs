import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(
  root,
  'validation/emp1/wrc537-2013/nearby-attachment-interaction-source-qualification-v1.json',
), 'utf8'));
const authority = fs.readFileSync(path.join(
  root,
  'docs/emp1/WRC537_2013_Nearby_Attachment_Interaction_Authority.md',
), 'utf8');

const failures = [];
const requireTrue = (condition, code) => { if (!condition) failures.push(code); };

requireTrue(
  ledger.schema === 'emp1-wrc537-nearby-attachment-interaction-source-qualification/v1',
  'SCHEMA_MISMATCH',
);
requireTrue(
  ledger.status === 'BLOCKED_NEARBY_ATTACHMENT_INTERACTION_AUTHORITY_UNRESOLVED',
  'STATUS_MUST_REMAIN_BLOCKED',
);
requireTrue(ledger.primarySourceDirectlyReobserved === false, 'PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(
  ledger.existingQualifiedApplicabilityRulesPreserved?.changedByThisIncrement === false,
  'EXISTING_4_5_RULES_MUST_REMAIN_UNCHANGED',
);
requireTrue(
  ledger.existingQualifiedApplicabilityRulesPreserved?.radialLoadCylinderLength === 'l >= Rm when P is active',
  'RADIAL_LOAD_LENGTH_RULE_MISMATCH',
);
requireTrue(
  ledger.existingQualifiedApplicabilityRulesPreserved?.externalMomentEndDistance === 'nearest cylinder end distance >= 0.5*Rm when Mc or Ml is active',
  'MOMENT_END_DISTANCE_RULE_MISMATCH',
);
for (const [key, expected] of Object.entries({
  neighborAttachmentGeometryRetained: false,
  localDiscontinuityInventoryRetained: false,
  interactionCorrectionImplemented: false,
  independentAttachmentStressFieldSuperpositionAuthority: false,
  productionRouteAuthority: false,
})) requireTrue(ledger.currentRouteCapability?.[key] === expected, `CURRENT_CAPABILITY_MISMATCH:${key}`);

for (const key of [
  'existingEndDistanceRulesProveNeighborNoninteraction',
  'absenceOfNeighborInputsProvesIsolation',
  'nearbyAttachmentInteractionAccountedFor',
  'nearbyDiscontinuityInteractionAccountedFor',
  'sourceQualifiedSpacingCriterionAvailable',
  'sourceQualifiedInteractionCorrectionAvailable',
  'overlappingIndependentWrcResultsMayBeSuperposed',
]) requireTrue(ledger.engineeringConclusions?.[key] === false, `ENGINEERING_CONCLUSION_MUST_REMAIN_FALSE:${key}`);

for (const key of [
  'productionNumericsChanged',
  'applicabilityNumericsChanged',
  'routeRegistryChanged',
  'gammaBetaAuthorityChanged',
  'pressureAuthorityChanged',
  'scfAuthorityChanged',
  'offAxisAuthorityChanged',
  'codeComplianceAuthority',
  'releaseAuthority',
]) requireTrue(ledger.authorityEffect?.[key] === false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);

for (const phrase of [
  'does not have source-qualified authority',
  '§4.5 end-distance checks pass',
  'do not treat missing neighbor inputs as proof of isolation',
  'BLOCKED_NEARBY_ATTACHMENT_INTERACTION_AUTHORITY_UNRESOLVED',
]) requireTrue(authority.includes(phrase), `AUTHORITY_NOTE_MISSING:${phrase}`);

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS_FAIL_CLOSED_SOURCE_BOUNDARY',
  qualificationId: ledger.qualificationId,
  disposition: ledger.status,
  existingWrc45RulesChanged: false,
  productionRouteAuthority: ledger.currentRouteCapability.productionRouteAuthority,
}, null, 2));
