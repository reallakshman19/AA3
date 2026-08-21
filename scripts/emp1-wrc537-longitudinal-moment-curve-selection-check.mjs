#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_CONNECTION_FLEXIBILITY,
  EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
  requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority,
  resolveEmp1Wrc537LongitudinalMomentBendingSelection,
} from '../src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js';

const table = await readFile('docs/emp1/WRC537_2013_Tables_and_Charts.md', 'utf8');
assert.match(table, /1B or 1B-1/u);
assert.match(table, /2B or 2B-1/u);

const authority = requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY,
);
assert.equal(authority.authorityId,
  EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID);
assert.deepEqual(authority.sourceLocators, [
  'WRC537_2013_TABLE5_PAGES_41_42',
  'WRC537_2013_SECTION_4_4',
  'WRC537_2013_SECTION_4_3_6',
]);
assert.equal(authority.recoveryDomain.set, 'WRC_TABLE5_EIGHT_SHELL_JUNCTURE_POINTS');
assert.equal(authority.recoveryDomain.count, 8);
assert.deepEqual(authority.recoveryDomain.locations,
  ['Au', 'Al', 'Bu', 'Bl', 'Cu', 'Cl', 'Du', 'Dl']);
assert.equal(authority.recoveryDomain.continuousJunctureSearchPerformed, false);
assert.equal(authority.recoveryDomain.absoluteShellMaximumAssured, false);
assert.equal(authority.selection.mode,
  EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY);
assert.equal(authority.selection.circumferentialFigure, '1B');
assert.equal(authority.selection.longitudinalFigure, '2B');
assert.equal(authority.selection.offAxisMaximum, false);
assert.equal(authority.offAxisMaximum.authorizedByThisRoute, false);
assert.equal(authority.offAxisMaximum.circumferentialFigure, '1B-1');
assert.equal(authority.offAxisMaximum.longitudinalFigure, '2B-1');

const axis = resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY,
});
assert.equal(axis.circumferentialFigure, '1B');
assert.equal(axis.longitudinalFigure, '2B');

const max = resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.OFF_AXIS_MAXIMUM,
  attachmentShape: 'ROUND',
  connectionFlexibility: EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE,
  applicabilitySourceRef: 'QUALIFIED_FIXTURE:FLEXIBLE_ROUND_NOZZLE',
});
assert.equal(max.circumferentialFigure, '1B-1');
assert.equal(max.longitudinalFigure, '2B-1');
assert.equal(max.productionAuthorityForTable5EightPointRoute, false);

expect(() => resolveEmp1Wrc537LongitudinalMomentBendingSelection(),
  'EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_REQUIRED');
expect(() => resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: 'OFF_AXIS_MAXIMUM',
  attachmentShape: 'ROUND',
  connectionFlexibility: 'RIGID_OR_OTHER',
  applicabilitySourceRef: 'X',
}), 'EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_FLEXIBLE_NOZZLE');
expect(() => resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: 'OFF_AXIS_MAXIMUM',
  attachmentShape: 'RECTANGULAR',
  connectionFlexibility: 'FLEXIBLE_NOZZLE',
  applicabilitySourceRef: 'X',
}), 'EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_ROUND_ATTACHMENT');
expect(() => resolveEmp1Wrc537LongitudinalMomentBendingSelection({
  mode: 'OFF_AXIS_MAXIMUM',
  attachmentShape: 'ROUND',
  connectionFlexibility: 'FLEXIBLE_NOZZLE',
}), 'EMP1_WRC537_OFF_AXIS_MAXIMUM_APPLICABILITY_SOURCE_REQUIRED');

const offAxisSpoof = structuredClone(authority);
offAxisSpoof.selection = {
  ...offAxisSpoof.selection,
  mode: EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.OFF_AXIS_MAXIMUM,
  circumferentialFigure: '1B-1',
  longitudinalFigure: '2B-1',
  offAxisMaximum: true,
};
expect(() => requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(offAxisSpoof),
  'EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_SELECTION_INVALID');

const recoverySpoof = structuredClone(authority);
recoverySpoof.recoveryDomain.locations[0] = 'OFF_AXIS';
expect(() => requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(recoverySpoof),
  'EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_RECOVERY_DOMAIN_INVALID');

const sourceSpoof = structuredClone(authority);
sourceSpoof.sourceLocators[1] = 'UNQUALIFIED_SECTION';
expect(() => requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(sourceSpoof),
  'EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_SOURCE_AUTHORITY_INVALID');

const shapeSpoof = { ...structuredClone(authority), hiddenAuthority: true };
expect(() => requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(shapeSpoof),
  'EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_SHAPE_MISMATCH');

const hashSpoof = structuredClone(authority);
hashSpoof.semanticHash = 'fnv1a64:0000000000000000';
expect(() => requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(hashSpoof),
  'EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_HASH_MISMATCH');

console.log(JSON.stringify({
  status: 'PASS_TABLE5_EIGHT_POINT_LONGITUDINAL_MOMENT_AUTHORITY',
  recoveryLocations: authority.recoveryDomain.locations,
  productionEightPointFigures: ['1B', '2B'],
  offAxisMaximumFigures: ['1B-1', '2B-1'],
  offAxisApplicability: 'ROUND_FLEXIBLE_NOZZLE_ONLY_SEPARATE_SCOPE',
  offAxisAuthorizedByEightPointRoute: false,
  sourceLocatorSpoofRejected: true,
  hiddenFieldSpoofRejected: true,
  authorityHash: authority.semanticHash,
}, null, 2));

function expect(fn, code) {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  assert.equal(error?.code, code, `expected ${code}, got ${error?.code}`);
}
