/**
 * CAESAR bend pressure-stiffening pressure authority.
 *
 * CAESAR defines bend pressure stiffening from the maximum pressure declared on
 * the element, not from the pressure term of the currently solved load case.
 * ACCDB basic-element rows expose nine operating pressure slots plus hydrotest
 * pressure in kPa. Negative CAESAR sentinel values are not active pressures.
 */

export const CAESAR_BEND_PRESSURE_STIFFENING_FIELDS = Object.freeze([
  'PRESSURE1',
  'PRESSURE2',
  'PRESSURE3',
  'PRESSURE4',
  'PRESSURE5',
  'PRESSURE6',
  'PRESSURE7',
  'PRESSURE8',
  'PRESSURE9',
  'HYDRO_PRESSURE',
]);

const KPA_TO_PA = 1000;

/** Return the maximum active declared CAESAR pressure in pascals. */
export function resolveCaesarBendPressureStiffeningPressurePa(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new TypeError('A CAESAR basic-element row is required for bend pressure stiffening.');
  }
  let maximumKpa = 0;
  for (const field of CAESAR_BEND_PRESSURE_STIFFENING_FIELDS) {
    const raw = row[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new TypeError(`CAESAR bend pressure field ${field} must be finite when present.`);
    }
    if (value > maximumKpa) maximumKpa = value;
  }
  return maximumKpa * KPA_TO_PA;
}
