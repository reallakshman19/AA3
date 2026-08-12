const LBF_TO_N = 4.4482216152605;
const INCH_TO_M = 0.0254;

const UNIT_TO_N_PER_M = Object.freeze({
  'n/m': 1,
  'n/cm': 100,
  'n/mm': 1000,
  'lb/in': LBF_TO_N / INCH_TO_M,
  'lbf/in': LBF_TO_N / INCH_TO_M,
});

export const CAESAR_TRANSLATIONAL_STIFFNESS_UNIT_TO_N_PER_M = UNIT_TO_N_PER_M;

/**
 * Read the CAESAR InputXML translational-stiffness display unit.
 * The XML FACTOR is retained as custody evidence; conversion to SI is driven by
 * the declared LABEL so no undocumented interpretation of FACTOR is required.
 */
export function parseCaesarInputXmlTranslationalStiffnessUnit(xmlText) {
  const text = requiredString(xmlText, 'xmlText');
  const match = text.match(/<TRANS_STIFF\b([^>]*)\/?\s*>/i);
  if (!match) throw new TypeError('InputXML does not contain a TRANS_STIFF unit declaration.');
  const attributes = parseAttributes(match[1]);
  const label = requiredString(attributes.LABEL, 'TRANS_STIFF LABEL');
  const factor = optionalFinite(attributes.FACTOR, 'TRANS_STIFF FACTOR');
  const normalizedUnit = normalizeTranslationalStiffnessUnitLabel(label);
  return Object.freeze({ label, normalizedUnit, factor });
}

export function normalizeTranslationalStiffnessUnitLabel(label) {
  const compact = requiredString(label, 'stiffness unit label')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '');
  const normalized = compact
    .replace(/^newtons?\//, 'n/')
    .replace(/^pounds?-force\//, 'lbf/')
    .replace(/^pounds?\//, 'lb/');
  if (!Object.hasOwn(UNIT_TO_N_PER_M, normalized)) {
    throw new TypeError(`Unsupported CAESAR translational stiffness unit: ${label}`);
  }
  return normalized;
}

export function convertCaesarTranslationalStiffnessToSi(value, unitLabel) {
  const sourceValue = positiveFinite(value, 'stiffness value');
  const sourceUnit = normalizeTranslationalStiffnessUnitLabel(unitLabel);
  const conversionFactorToNPerM = UNIT_TO_N_PER_M[sourceUnit];
  return Object.freeze({
    sourceValue,
    sourceUnit,
    conversionFactorToNPerM,
    valueNPerM: sourceValue * conversionFactorToNPerM,
  });
}

export function normalizeDisplayedCaesarFrictionStiffnessFromInputXml(input) {
  const displayedValue = positiveFinite(input?.displayedValue, 'displayedValue');
  const unit = parseCaesarInputXmlTranslationalStiffnessUnit(input?.xmlText);
  const normalized = convertCaesarTranslationalStiffnessToSi(displayedValue, unit.label);
  return Object.freeze({
    displayedValue,
    displayedUnitLabel: unit.label,
    normalizedUnit: normalized.sourceUnit,
    inputXmlTransStiffFactor: unit.factor,
    conversionFactorToNPerM: normalized.conversionFactorToNPerM,
    valueNPerM: normalized.valueNPerM,
  });
}

function parseAttributes(text) {
  const attributes = {};
  for (const match of String(text ?? '').matchAll(/([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"/g)) {
    attributes[match[1].toUpperCase()] = match[2];
  }
  return attributes;
}

function requiredString(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || !(value > 0)) throw new TypeError(`${label} must be finite and > 0.`);
  return Number(value);
}

function optionalFinite(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite when present.`);
  return number;
}
