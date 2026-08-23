#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_CONNECTION_FLEXIBILITY,
  EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY,
  resolveEmp1Wrc537LongitudinalMomentBendingSelection,
} from '../src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js';

const ledger = JSON.parse(await readFile(
  'validation/emp1/wrc537-2013/off-axis-longitudinal-moment-source-qualification-v1.json',
  'utf8',
));

assert.equal(ledger.schema, 'emp1-wrc537-off-axis-longitudinal-moment-source-qualification/v1');
assert.equal(ledger.status, 'BLOCKED_OFF_AXIS_PRODUCTION_AUTHORITY_RECOVERY_AND_APPLICABILITY_UNRESOLVED');
assert.equal(ledger.engineeringAuthority, false);
assert.equal(ledger.productionOffAxisRouteAuthorized, false);
assert.equal(ledger.globalAbsoluteMaximumAuthority, false);
assert.equal(ledger.source.rawPdfSha256, '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2');

const authority = EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY;
assert.equal(authority.selection.mode, EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY);
assert.equal(authority.selection.circumferentialFigure, '1B');
assert.equal(authority.selection.longitudinalFigure, '2B');
assert.equal(authority.recoveryDomain.count, 8);
assert.deepEqual(authority.recoveryDomain.locations, ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl']);
assert.equal(authority.recoveryDomain.continuousJunctureSearchPerformed, false);
assert.equal(authority.recoveryDomain.absoluteShellMaximumAssured, false);
assert.equal(authority.offAxisMaximum.authorizedByThisRoute, false);
assert.equal(authority.offAxisMaximum.circumferentialFigure, '1B-1');
assert.equal(authority.offAxisMaximum.longitudinalFigure, '2B-1');
assert.equal(authority.offAxisMaximum.requiredSeparateApplicability, 'ROUND_FLEXIBLE_NOZZLE_WITH_SOURCE_CUSTODY');

for (const bad of [
  { mode: 'OFF_AXIS_MAXIMUM', attachmentShape: 'RECTANGULAR', connectionFlexibility: 'FLEXIBLE_NOZZLE', applicabilitySourceRef: 'x' },
  { mode: 'OFF_AXIS_MAXIMUM', attachmentShape: 'ROUND', connectionFlexibility: 'RIGID_OR_OTHER', applicabilitySourceRef: 'x' },
  { mode: 'OFF_AXIS_MAXIMUM', attachmentShape: 'ROUND', connectionFlexibility: 'FLEXIBLE_NOZZLE' },
]) {
  assert.throws(() => resolveEmp1Wrc537LongitudinalMomentBendingSelection(bad));
}

const comparison = resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.OFF_AXIS_MAXIMUM,
  attachmentShape: 'ROUND',
  connectionFlexibility: EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE,
  applicabilitySourceRef: 'CONTROLLED_COMPARISON_REFERENCE_ONLY',
});
assert.equal(comparison.circumferentialFigure, '1B-1');
assert.equal(comparison.longitudinalFigure, '2B-1');
assert.equal(comparison.recoveryMeaning, 'OFF_AXIS_MAXIMUM_VALUE');
assert.equal(comparison.productionAuthorityForTable5EightPointRoute, false);

assert.equal(ledger.existingComparisonSelector.engineeringClassificationQualifiedBySelectorAlone, false);
assert.equal(ledger.retainedOffAxisSourceFinding.maySubstituteIntoEightPointRoute, false);
assert.equal(ledger.retainedOffAxisSourceFinding.mayClaimGlobalAbsoluteShellMaximum, false);
assert.equal(ledger.claimSeparation.rule, 'AUTHORITY_FOR_A_DOES_NOT_IMPLY_B_OR_C');
assert.ok(ledger.unresolvedAuthority.length >= 10);

for (const required of [
  'SOURCE_QUALIFIED_FLEXIBLE_NOZZLE_CLASSIFICATION_RULE',
  'SOURCE_QUALIFIED_OFF_AXIS_PHYSICAL_RECOVERY_LOCATION_OR_ANGLE',
  'WHETHER_1B_1_AND_2B_1_MAXIMA_OCCUR_AT_A_COMMON_PHYSICAL_LOCATION',
  'COMMON_LOCATION_COMBINED_STRESS_AUTHORITY',
  'GLOBAL_ABSOLUTE_STRESS_INTENSITY_AUTHORITY',
]) assert.ok(ledger.unresolvedAuthority.includes(required));

for (const prohibition of [
  'DO_NOT_SUBSTITUTE_1B_1_2B_1_INTO_TABLE5_EIGHT_POINT_PRODUCTION_ROUTE',
  'DO_NOT_ACCEPT_CALLER_FLEXIBLE_NOZZLE_LABEL_AS_ENGINEERING_AUTHORITY',
  'DO_NOT_SUPERPOSE_SEPARATELY_MAXIMIZED_COMPONENTS_WITHOUT_COMMON_LOCATION_AUTHORITY',
  'DO_NOT_CLAIM_GLOBAL_ABSOLUTE_MAXIMUM_FROM_OFF_AXIS_LONGITUDINAL_MOMENT_CURVES',
  'DO_NOT_ENABLE_PRODUCTION_OFF_AXIS_ROUTE_WHILE_RECOVERY_LOCATION_OR_APPLICABILITY_IS_UNRESOLVED',
]) assert.ok(ledger.prohibitions.includes(prohibition));

console.log(JSON.stringify({
  schema: 'emp1-wrc537-off-axis-longitudinal-source-check/v1',
  status: 'PASS_EXPECTED_BLOCKED_OFF_AXIS_PRODUCTION_AUTHORITY',
  eightPointRouteSelection: ['1B', '2B'],
  offAxisComparisonFigures: ['1B-1', '2B-1'],
  eightPointAbsoluteMaximumAssured: false,
  offAxisProductionRouteAuthorized: false,
  globalAbsoluteMaximumAuthority: false,
  unresolvedAuthorityCount: ledger.unresolvedAuthority.length,
}, null, 2));
