/**
 * CAESAR bend pressure-stiffening pressure authority.
 *
 * The Static Load Case Editor's `Pmax` selection is the maximum of operating
 * pressure slots P1 through P9. Hydrotest pressure is a separate `Phydro`
 * selection and must not silently participate in Pmax. ACCDB stores pressures
 * in kPa; negative CAESAR sentinel values are not active pressures.
 */

export const CAESAR_BEND_PMAX_FIELDS = Object.freeze([
  'PRESSURE1',
  'PRESSURE2',
  'PRESSURE3',
  'PRESSURE4',
  'PRESSURE5',
  'PRESSURE6',
  'PRESSURE7',
  'PRESSURE8',
  'PRESSURE9',
]);

const KPA_TO_PA = 1000;

/** Return CAESAR `Pmax = max(P1..P9)` in pascals. */
export function resolveCaesarBendPressureStiffeningPressurePa(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new TypeError('A CAESAR basic-element row is required for bend pressure stiffening.');
  }
  let maximumKpa = 0;
  for (const field of CAESAR_BEND_PMAX_FIELDS) {
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
