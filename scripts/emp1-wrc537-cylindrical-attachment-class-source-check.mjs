import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerPath = path.join(
  root,
  'validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json',
);
const authorityPath = path.join(
  root,
  'docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md',
);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const authority = fs.readFileSync(authorityPath, 'utf8');

const failures = [];
function requireTrue(condition, code) {
  if (!condition) failures.push(code);
}

requireTrue(
  ledger.schema === 'emp1-wrc537-cylindrical-attachment-class-source-qualification/v1',
  'SCHEMA_MISMATCH',
);
requireTrue(
  ledger.status === 'BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED',
  'STATUS_MUST_REMAIN_BLOCKED',
);
requireTrue(ledger.primarySourceDirectlyReobserved === false, 'PRIMARY_REOBSERVATION_MUST_BE_FALSE');
requireTrue(
  ledger.primarySourceExecutionStatus === 'NOT_RUN_EXECUTION_ENVIRONMENT',
  'PRIMARY_SOURCE_EXECUTION_STATUS_MISMATCH',
);
requireTrue(ledger.currentRoute?.shellFamily === 'CYLINDRICAL', 'CURRENT_ROUTE_SHELL_FAMILY_MISMATCH');
requireTrue(ledger.currentRoute?.attachmentShape === 'ROUND', 'CURRENT_ROUTE_ATTACHMENT_SHAPE_MISMATCH');
requireTrue(
  JSON.stringify(ledger.currentRoute?.standardTable5EightPointFiguresForLongitudinalMoment) === JSON.stringify(['1B', '2B']),
  'STANDARD_LONGITUDINAL_FIGURE_SET_MISMATCH',
);
requireTrue(ledger.currentRoute?.productionRouteAuthority === false, 'PRODUCTION_ROUTE_AUTHORITY_MUST_REMAIN_FALSE');
requireTrue(
  ledger.engineeringConclusions?.roundGeometryAloneProvesAttachmentClass === false,
  'ROUND_GEOMETRY_MUST_NOT_PROVE_ATTACHMENT_CLASS',
);
requireTrue(
  ledger.engineeringConclusions?.standardEightPointSolidHollowEquivalencePrimaryVerified === false,
  'SOLID_HOLLOW_EQUIVALENCE_MUST_REMAIN_UNVERIFIED',
);
requireTrue(
  ledger.engineeringConclusions?.standardEightPointRigidityIndependencePrimaryVerified === false,
  'RIGIDITY_INDEPENDENCE_MUST_REMAIN_UNVERIFIED',
);
requireTrue(
  ledger.engineeringConclusions?.offAxisFlexibleNozzleClassificationQualified === false,
  'OFF_AXIS_FLEXIBLE_NOZZLE_CLASSIFICATION_MUST_REMAIN_UNQUALIFIED',
);
requireTrue(
  ledger.engineeringConclusions?.arbitraryRoundObjectAuthorized === false,
  'ARBITRARY_ROUND_OBJECT_AUTHORITY_MUST_REMAIN_FALSE',
);
requireTrue(
  ledger.engineeringConclusions?.structuralLugOrPadAuthorizedByRoundSurrogate === false,
  'LUG_PAD_ROUND_SURROGATE_MUST_REMAIN_PROHIBITED',
);
requireTrue(
  ledger.engineeringConclusions?.sphericalAttachmentParametersTransferToCylindrical === false,
  'SPHERICAL_PARAMETER_TRANSFER_MUST_REMAIN_FALSE',
);

for (const key of [
  'productionNumericsChanged',
  'routeRegistryChanged',
  'wrcCoefficientsChanged',
  'gammaBetaAuthorityChanged',
  'pressureAuthorityChanged',
  'scfAuthorityChanged',
  'offAxisAuthorityChanged',
  'codeComplianceAuthority',
  'releaseAuthority',
]) {
  requireTrue(ledger.authorityEffect?.[key] === false, `AUTHORITY_EFFECT_MUST_REMAIN_FALSE:${key}`);
}

for (const phrase of [
  'software fact is not engineering authority',
  'round flexible-nozzle connection',
  'do not widen the current bounded route to arbitrary round objects',
  'BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED',
]) {
  requireTrue(authority.includes(phrase), `AUTHORITY_NOTE_MISSING:${phrase}`);
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS_FAIL_CLOSED_SOURCE_BOUNDARY',
  qualificationId: ledger.qualificationId,
  productionRouteAuthority: ledger.currentRoute.productionRouteAuthority,
  primarySourceDirectlyReobserved: ledger.primarySourceDirectlyReobserved,
  disposition: ledger.status,
}, null, 2));
