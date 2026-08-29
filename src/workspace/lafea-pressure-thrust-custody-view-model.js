/** Pure EMP.1.B pressure-thrust custody view/evidence helpers. */
import { AXIAL_PRESSURE_THRUST_BASES } from '../core/local-attachment-screening/index.js';
import { END_CONDITIONS } from '../core/local-stress/index.js';

export const PRESSURE_THRUST_BASIS_OPTIONS = Object.freeze([
  Object.freeze({
    value: AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
    label: 'Fx excludes pressure thrust',
    meaning: 'Closed-end axial pressure stress is added separately.',
  }),
  Object.freeze({
    value: AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST,
    label: 'Fx already includes pressure thrust',
    meaning: 'Fx already contains end-cap pressure thrust; the separate closed-end axial pressure term is suppressed. Hoop and radial pressure stresses remain included.',
  }),
]);

export function pressureThrustBasisLabel(value) {
  const option = PRESSURE_THRUST_BASIS_OPTIONS.find((row) => row.value === value);
  return option?.label ?? 'Pressure-thrust basis unresolved';
}

export function pressureThrustBasisMeaning(value) {
  const option = PRESSURE_THRUST_BASIS_OPTIONS.find((row) => row.value === value);
  return option?.meaning
    ?? 'Active closed-end pressure screening cannot run until the axial pressure-thrust basis is declared.';
}

export function unresolvedEmp1BPressureThrustCases(documentValue) {
  const screeningCases = Array.isArray(documentValue?.screeningCases)
    ? documentValue.screeningCases
    : [];
  const pressures = pressureMap(documentValue);
  return Object.freeze(screeningCases.filter((screeningCase) => {
    const pressure = pressures.get(screeningCase?.pressureDefinitionId);
    return activeClosedEndAxialPressure(screeningCase, pressure)
      && normalizedBasis(screeningCase?.axialPressureThrustBasis) === AXIAL_PRESSURE_THRUST_BASES.UNKNOWN;
  }).map((row) => String(row.screeningCaseId ?? 'UNRESOLVED_SCREENING_CASE')));
}

export function pressureThrustCaseView(documentValue) {
  const screeningCases = Array.isArray(documentValue?.screeningCases)
    ? documentValue.screeningCases
    : [];
  const pressures = pressureMap(documentValue);
  return Object.freeze(screeningCases.map((screeningCase) => {
    const basis = normalizedBasis(screeningCase?.axialPressureThrustBasis);
    const pressure = pressures.get(screeningCase?.pressureDefinitionId);
    const active = activeClosedEndAxialPressure(screeningCase, pressure);
    return Object.freeze({
      screeningCaseId: String(screeningCase?.screeningCaseId ?? 'UNRESOLVED_SCREENING_CASE'),
      pressureDefinitionId: String(screeningCase?.pressureDefinitionId ?? 'UNRESOLVED_PRESSURE_DEFINITION'),
      pressureFactor: screeningCase?.pressureFactor,
      basis,
      basisLabel: pressureThrustBasisLabel(basis),
      meaning: active ? pressureThrustBasisMeaning(basis) : inactiveMeaning(pressure, screeningCase),
      activeClosedEndAxialPressure: active,
      unresolved: active && basis === AXIAL_PRESSURE_THRUST_BASES.UNKNOWN,
    });
  }));
}

export function pressureThrustEvidenceRows(result) {
  const states = Array.isArray(result?.pointStressStates) ? result.pointStressStates : [];
  const rows = new Map();
  states.forEach((state) => {
    const pressure = state?.pressureStress;
    const screeningCaseId = String(state?.screeningCaseId ?? 'UNRESOLVED_SCREENING_CASE');
    if (!pressure || rows.has(screeningCaseId)) return;
    rows.set(screeningCaseId, Object.freeze({
      screeningCaseId,
      pressureDefinitionId: String(pressure.pressureDefinitionId ?? 'UNRESOLVED_PRESSURE_DEFINITION'),
      endCondition: String(pressure.endCondition ?? 'UNRESOLVED_END_CONDITION'),
      basis: normalizedBasis(pressure.axialPressureThrustBasis),
      treatment: String(pressure.axialPressureTreatment ?? 'UNRESOLVED_PRESSURE_THRUST_TREATMENT'),
    }));
  });
  return Object.freeze([...rows.values()].sort((a, b) => a.screeningCaseId.localeCompare(b.screeningCaseId)));
}

export function pressureThrustEvidenceMessage(row) {
  if (!row) return '';
  if (row.treatment === 'ADDED_FROM_FOUNDATION_CLOSED_END_STRESS') {
    return `${row.screeningCaseId} — Fx excludes pressure thrust; closed-end axial pressure stress was added separately.`;
  }
  if (row.treatment === 'SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT') {
    return `${row.screeningCaseId} — Fx already includes pressure thrust; the separate closed-end axial pressure term was suppressed while hoop/radial pressure stress remained.`;
  }
  if (row.treatment === 'OPEN_END_ZERO_AXIAL_PRESSURE_STRESS') {
    return `${row.screeningCaseId} — open-end pressure condition; no axial pressure-thrust stress was added.`;
  }
  if (row.treatment === 'ZERO_PRESSURE_FACTOR') {
    return `${row.screeningCaseId} — pressure factor is zero; no pressure contribution was applied.`;
  }
  if (row.treatment === 'EXPLICIT_AXIAL_RESULTANT_HANDLED_AS_MECHANICAL_RESULTANT') {
    return `${row.screeningCaseId} — explicit axial resultant is handled as a mechanical resultant; no separate axial pressure term was added.`;
  }
  return `${row.screeningCaseId} — axial pressure treatment: ${row.treatment}.`;
}

function pressureMap(documentValue) {
  const rows = Array.isArray(documentValue?.sourceEvidence?.foundationResult?.pressureStressResults)
    ? documentValue.sourceEvidence.foundationResult.pressureStressResults
    : [];
  return new Map(rows.map((row) => [row?.pressureDefinitionIdentity, row]));
}

function activeClosedEndAxialPressure(screeningCase, pressure) {
  return pressure?.endCondition === END_CONDITIONS.CLOSED_END
    && screeningCase?.pressureFactor !== 0
    && typeof pressure?.axialPressureStress === 'number'
    && Number.isFinite(pressure.axialPressureStress)
    && pressure.axialPressureStress !== 0;
}

function normalizedBasis(value) {
  return Object.values(AXIAL_PRESSURE_THRUST_BASES).includes(value)
    ? value
    : AXIAL_PRESSURE_THRUST_BASES.UNKNOWN;
}

function inactiveMeaning(pressure, screeningCase) {
  if (screeningCase?.pressureFactor === 0) return 'Pressure factor is zero; pressure-thrust custody does not affect this screening case.';
  if (pressure?.endCondition === END_CONDITIONS.OPEN_END) return 'Open-end pressure has zero axial pressure stress; pressure-thrust custody does not affect this screening case.';
  if (pressure?.endCondition === END_CONDITIONS.EXPLICIT_AXIAL_RESULTANT) return 'Explicit axial resultant is governed separately as a mechanical resultant.';
  if (pressure?.endCondition === END_CONDITIONS.CLOSED_END && pressure?.axialPressureStress === 0) return 'Closed-end axial pressure stress is zero for this pressure definition.';
  return 'Pressure-thrust custody is not active for this screening case.';
}
