const ENTRIES = Object.freeze({
  1: Object.freeze({
    code: 1,
    abbreviation: 'ANC',
    family: 'ANCHOR',
    dofs: Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']),
    directional: false,
    rotational: true,
    translational: true,
    snubber: false,
    gapUnitClass: 'MIXED_BY_DOF',
  }),
  7: Object.freeze({
    code: 7,
    abbreviation: 'RZ',
    family: 'ROTATIONAL_DOUBLE_ACTING',
    dofs: Object.freeze(['RZ']),
    directional: false,
    rotational: true,
    translational: false,
    snubber: false,
    gapUnitClass: 'ANGLE_DEG',
  }),
  10: Object.freeze({
    code: 10,
    abbreviation: 'XSNB',
    family: 'STATIC_SNUBBER_TRANSLATIONAL_DOUBLE_ACTING',
    dofs: Object.freeze(['UX']),
    directional: false,
    rotational: false,
    translational: true,
    snubber: true,
    activationAuthority: 'LOAD_CASE_SNUBBERS_ACTIVE',
    gapUnitClass: 'SNUBBER_FIELD_NOT_GENERIC_CONTACT_AUTHORITY',
  }),
  17: Object.freeze({
    code: 17,
    abbreviation: '-Y',
    family: 'TRANSLATIONAL_DIRECTIONAL',
    dofs: Object.freeze(['UY']),
    directional: true,
    rotational: false,
    translational: true,
    snubber: false,
    freeDirection: '-Y',
    restrainedDirection: '+Y',
    axisUnit: Object.freeze([0, 1, 0]),
    gapUnitClass: 'LENGTH',
  }),
});

export const CAESAR_RESTRAINT_CODE_AUTHORITY = ENTRIES;

/**
 * Decode CAESAR II's exported restraint code (INPUT_RESTRAINTS.RES_TYPEID /
 * InputXML RESTRAINT.TYPE). The integer code is product semantics; direction
 * cosines are supporting axis data and must not replace this classification.
 */
export function decodeCaesarRestraintCode(value) {
  const code = Number(value);
  if (!Number.isInteger(code) || code <= 0) {
    throw new TypeError(`CAESAR restraint code must be a positive integer; received ${String(value)}.`);
  }
  const entry = ENTRIES[code];
  if (entry) return entry;
  return Object.freeze({
    code,
    abbreviation: null,
    family: 'UNSUPPORTED_RESTRAINT_CODE',
    dofs: Object.freeze([]),
    directional: null,
    rotational: null,
    translational: null,
    snubber: null,
    gapUnitClass: 'UNKNOWN',
  });
}
