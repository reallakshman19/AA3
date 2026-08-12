const INPUTXML_CANONICAL = Object.freeze({
  0: Object.freeze({
    code: 0,
    abbreviation: 'ANC',
    family: 'ANCHOR',
    axisFromDirectionCosines: false,
    gapUnitClass: 'NOT_APPLICABLE',
  }),
  8: Object.freeze({
    code: 8,
    abbreviation: 'LIM',
    family: 'LIMIT',
    axisFromDirectionCosines: true,
    gapUnitClass: 'LENGTH',
  }),
  9: Object.freeze({
    code: 9,
    abbreviation: 'GUI',
    family: 'GUIDE',
    axisFromDirectionCosines: true,
    gapUnitClass: 'LENGTH',
  }),
  14: Object.freeze({
    code: 14,
    abbreviation: '+Y',
    family: 'TRANSLATIONAL_DIRECTIONAL',
    axisFromDirectionCosines: false,
    axisUnit: Object.freeze([0, 1, 0]),
    directionLabel: '+Y',
    gapUnitClass: 'LENGTH',
  }),
});

const BM4L_ACCDB_CANONICAL = Object.freeze({
  1: Object.freeze({
    code: 1,
    abbreviation: 'ANC',
    family: 'ANCHOR',
    axisFromDirectionCosines: false,
    gapUnitClass: 'NOT_APPLICABLE',
  }),
  3: Object.freeze({
    code: 3,
    abbreviation: 'Y',
    family: 'TRANSLATIONAL_AXIS',
    axisFromDirectionCosines: false,
    axisUnit: Object.freeze([0, 1, 0]),
    directionLabel: 'Y',
    gapUnitClass: 'LENGTH',
  }),
  8: Object.freeze({
    code: 8,
    abbreviation: 'GUI',
    family: 'GUIDE',
    axisFromDirectionCosines: true,
    gapUnitClass: 'LENGTH',
  }),
  9: Object.freeze({
    code: 9,
    abbreviation: 'LIM',
    family: 'LIMIT',
    axisFromDirectionCosines: true,
    gapUnitClass: 'LENGTH',
  }),
});

export const BM4L_INPUTXML_CANONICAL_RESTRAINT_TYPES = INPUTXML_CANONICAL;
export const BM4L_ACCDB_CANONICAL_RESTRAINT_TYPES = BM4L_ACCDB_CANONICAL;

/**
 * ACCDB restraint IDs are already in the ACCDB source domain and must never be
 * passed through the InputXML mutation table.
 */
export function retainAccdbRestraintTypeId(value) {
  const sourceTypeId = requireIntegerCode(value, 'ACCDB restraint RES_TYPEID');
  return Object.freeze({
    sourceDomain: 'ACCDB',
    sourceTypeId,
    effectiveTypeId: sourceTypeId,
    mutationRequired: false,
    mutationApplied: false,
  });
}

/**
 * Decode the exact BM4_L ACCDB restraint IDs from the database-published
 * RESTRAINT_TYPES lookup. F2.7 independently confirmed the same lookup in the
 * authenticated BM4_NL database. Corrected InputXML class labels remain a
 * separate source-domain view and are not substituted for these ACCDB labels.
 */
export function decodeBm4lAccdbRestraintType(value) {
  const code = requireIntegerCode(value, 'BM4_L ACCDB restraint RES_TYPEID');
  const entry = BM4L_ACCDB_CANONICAL[code];
  if (entry) return entry;
  return Object.freeze({
    code,
    abbreviation: null,
    family: 'UNSUPPORTED_BM4L_ACCDB_RESTRAINT_TYPE',
    axisFromDirectionCosines: null,
    gapUnitClass: 'UNKNOWN',
  });
}

/**
 * Decode a restraint TYPE only after the governed InputXML mutation has been
 * applied exactly once. Raw InputXML TYPE values are not accepted as product
 * semantics by this function.
 */
export function decodeCorrectedInputXmlRestraintType(value) {
  const code = requireIntegerCode(value, 'corrected InputXML restraint TYPE');
  const entry = INPUTXML_CANONICAL[code];
  if (entry) return entry;
  return Object.freeze({
    code,
    abbreviation: null,
    family: 'UNSUPPORTED_CORRECTED_INPUTXML_RESTRAINT_TYPE',
    axisFromDirectionCosines: null,
    gapUnitClass: 'UNKNOWN',
  });
}

function requireIntegerCode(value, label) {
  const code = Number(value);
  if (!Number.isInteger(code) || code < 0) {
    throw new TypeError(`${label} must be a non-negative integer; received ${String(value)}.`);
  }
  return code;
}
