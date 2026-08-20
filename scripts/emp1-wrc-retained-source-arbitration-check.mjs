#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const path = resolve(repoRoot, 'validation/emp1/wrc537-2013/retained-source-arbitration-v1.json');
const record = JSON.parse(await readFile(path, 'utf8'));

assert.equal(record.schema, 'emp1-wrc-retained-source-arbitration/v1');
assert.equal(record.status, 'BLOCKED_PRIMARY_PDF_REOBSERVATION');
assert.equal(record.engineeringAuthority, false);
assert.equal(record.productionAuthority, false);
assert.equal(record.primarySource.rawPdfSha256, null);
assert.equal(record.primarySource.custodyState, 'UNRESOLVED_RAW_BYTES');
assert.equal(record.primarySource.reobservationState, 'NOT_RUN');
assert.equal(record.authorization.emp1CRouteRegistrationAllowed, false);

const arbitrations = new Map(record.arbitrations.map((row) => [row.id, row]));
assert.equal(arbitrations.size, 5);

const radial = required('SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH');
assert.equal(radial.status, 'BLOCKED_PENDING_PRIMARY_SOURCE');
assert.equal(radial.dimensionalProof.classification, 'INDEPENDENT_DERIVED_NOT_SOURCE_AUTHORITY');
close(radial.handCalculationProbe.dimensionallyConsistentCandidate_psi, 83.0, 1e-12, 'SP radial candidate');
close(radial.handCalculationProbe.retainedMachineNumericValue, 166.0, 1e-12, 'SP radial retained');
close(radial.handCalculationProbe.ratio_retainedNumeric_to_candidate, 2.0, 1e-12, 'SP radial ratio');
close(radial.handCalculationProbe.unitMetamorphicProbe.candidate_converted_psi, 83.0000000883153, 1e-9, 'SP radial SI/US metamorphic');
assert.equal(radial.retainedEvidence.retainedRadialMembraneEquation.retainedLocator.equation, 'Eq. 6');
assert.match(radial.sourceDecisionRequired.rule, /Pinned PDF wins/u);

const moment = required('SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH');
assert.equal(moment.status, 'BLOCKED_PENDING_PRIMARY_SOURCE');
assert.equal(moment.dimensionalProof.classification, 'INDEPENDENT_DERIVED_NOT_SOURCE_AUTHORITY');
close(moment.handCalculationProbe.dimensionallyConsistentCandidate_psi, 10.371795512680665, 1e-12, 'SM moment candidate');
close(moment.handCalculationProbe.retainedMachineNumericValue, 20.74359102536133, 1e-12, 'SM moment retained');
close(moment.handCalculationProbe.ratio_retainedNumeric_to_candidate, 2.0, 1e-12, 'SM moment ratio');
assert.equal(moment.retainedEvidence.retainedMomentMembraneEquation.retainedLocator.equation, 'Eq. 12');
assert.match(moment.sourceDecisionRequired.rule, /Pinned PDF wins/u);

const intensity = required('STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH');
assert.equal(intensity.status, 'BLOCKED_PENDING_PRIMARY_SOURCE');
assert.equal(intensity.retainedEvidence.nomenclature.dimension, 'stress');
assert.equal(intensity.dimensionalProof.outerSqrtOutputDimension, 'sqrt(stress)');
close(intensity.handCalculationProbe.retainedOuterSqrtTerm, 10.0, 1e-12, 'stress intensity retained outer sqrt');
assert.deepEqual(intensity.handCalculationProbe.planeStressPrincipalValues_MPa, [100, 50, 0]);
close(intensity.handCalculationProbe.twiceMaximumShearStress_MPa, 100.0, 1e-12, 'independent Tresca check');

const axes = required('LAFEA_TO_WRC_AXIS_AND_SIGN_ARBITRATION');
assert.equal(axes.status, 'BLOCKED_PENDING_PRIMARY_SOURCE_AND_FRAME_CONTRACT');
assert.equal(axes.retainedWrcEvidence.retainedMappingAuthority, 'TENTATIVE_UNRESOLVED');
assert.match(axes.lafEaProductionEvidence.frameRule, /eX = axialDirection/u);
assert.match(axes.requiredResolution.rule, /do not rename FX\/FY\/FZ fields by fixed permutation/u);
assert(axes.retainedWrcEvidence.loads.some((row) => row.symbol === 'Mt' && row.positive === 'UNRESOLVED'));

const thrust = required('PRESSURE_THRUST_LOAD_ASSEMBLY_CUSTODY');
assert.equal(thrust.status, 'BLOCKED_PENDING_ENGINEERING_POLICY_AND_SOURCE_CHECK');
assert.equal(thrust.softwareBoundary.doubleCountGuardRequired, true);
assert.equal(thrust.softwareBoundary.unresolvedBehavior, 'BLOCK');
const area = Math.PI * thrust.supplementalNumericalSanity.nozzleInsideDiameter_in ** 2 / 4;
const pressureThrust = area * thrust.supplementalNumericalSanity.pressure_psi;
const combined = thrust.supplementalNumericalSanity.restraintAxialForce_lbf - pressureThrust;
close(area, thrust.supplementalNumericalSanity.pressureArea_in2, 1e-10, 'pressure area');
close(pressureThrust, thrust.supplementalNumericalSanity.pressureThrust_lbf, 1e-8, 'pressure thrust');
close(combined, thrust.supplementalNumericalSanity.combinedRadialLoad_lbf, 1e-8, 'combined radial load');
assert.equal(Math.round(combined), thrust.supplementalNumericalSanity.displayRounded_lbf);
assert.match(thrust.supplementalNumericalSanity.authority, /SUPPLEMENTAL_ONLY/u);

for (const row of record.arbitrations) {
  assert.match(row.status, /^BLOCKED_/u, `${row.id} must remain blocked before primary source arbitration`);
}
for (const [key, value] of Object.entries(record.authorization)) {
  if (key === 'emp1CRouteRegistrationAllowed') assert.equal(value, false);
  else assert.equal(value, 'BLOCKED', `${key} must remain BLOCKED`);
}

console.log(JSON.stringify({
  schema: 'emp1-wrc-retained-source-arbitration-check/v1',
  status: 'PASS_EXPECTED_BLOCKED',
  arbitrationCount: arbitrations.size,
  dimensionalProbes: {
    radialMembraneCandidate_psi: radial.handCalculationProbe.dimensionallyConsistentCandidate_psi,
    radialRetainedNumeric: radial.handCalculationProbe.retainedMachineNumericValue,
    momentMembraneCandidate_psi: moment.handCalculationProbe.dimensionallyConsistentCandidate_psi,
    momentRetainedNumeric: moment.handCalculationProbe.retainedMachineNumericValue,
    stressIntensityOuterSqrt: intensity.handCalculationProbe.retainedOuterSqrtTerm,
  },
  sourceCustody: record.primarySource.custodyState,
  engineeringAuthority: record.engineeringAuthority,
  productionAuthority: record.productionAuthority,
}, null, 2));

function required(id) {
  const row = arbitrations.get(id);
  assert(row, `missing arbitration ${id}`);
  return row;
}

function close(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual), `${label}: actual not finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, observed ${actual}`);
}
