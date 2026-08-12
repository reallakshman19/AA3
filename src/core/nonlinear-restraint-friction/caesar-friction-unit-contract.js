const FORCE_TO_N = Object.freeze({
  N: 1,
  KN: 1000,
  LB: 4.4482216152605,
  LBF: 4.4482216152605,
});

const LENGTH_TO_M = Object.freeze({
  M: 1,
  CM: 0.01,
  MM: 0.001,
  IN: 0.0254,
  FT: 0.3048,
});

/** Parse model display force/length units from a CAESAR InputXML <UNITS> block. */
export function parseCaesarInputXmlForceLengthUnits(xmlText) {
  if (typeof xmlText !== 'string' || !xmlText.trim()) {
    throw new TypeError('xmlText must be a non-empty string.');
  }
  const unitsBlock = xmlText.match(/<UNITS>([\s\S]*?)<\/UNITS>/i)?.[1];
  if (!unitsBlock) throw new TypeError('CAESAR InputXML <UNITS> block is required.');

  const length = parseUnitRow(unitsBlock, 'LENGTH');
  const force = parseUnitRow(unitsBlock, 'FORCE');
  const forceUnit = normalizeForceUnit(force.label);
  const lengthUnit = normalizeLengthUnit(length.label);

  return Object.freeze({
    forceUnit,
    lengthUnit,
    stiffnessUnit: `${forceUnit}/${lengthUnit}`,
    scaleToNPerM: FORCE_TO_N[forceUnit] / LENGTH_TO_M[lengthUnit],
    sourceRows: Object.freeze({
      force: Object.freeze(force),
      length: Object.freeze(length),
    }),
  });
}

/** Normalize a translational stiffness to SI N/m from an explicit force/length unit. */
export function normalizeForcePerLengthToNPerM(value, unit) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError('value must be finite and >= 0.');
  }
  const parsed = parseForcePerLengthUnit(unit);
  return Number(value) * FORCE_TO_N[parsed.forceUnit] / LENGTH_TO_M[parsed.lengthUnit];
}

/**
 * Normalize CAESAR's static friction-stiffness configuration value to SI.
 * The source unit is mandatory. Model InputXML display units are deliberately
 * not used to infer this configuration item's unit.
 */
export function normalizeCaesarStaticFrictionStiffnessToSI({ value, sourceUnit }) {
  const normalizedUnit = canonicalForcePerLengthUnit(sourceUnit);
  return Object.freeze({
    sourceValue: Number(value),
    sourceUnit: normalizedUnit,
    value: normalizeForcePerLengthToNPerM(value, normalizedUnit),
    unit: 'N/m',
  });
}

function parseUnitRow(block, tag) {
  const re = new RegExp(`<${tag}\\s+LABEL="([^"]+)"\\s+FACTOR="([^"]+)"\\s*\\/>`, 'i');
  const match = block.match(re);
  if (!match) throw new TypeError(`CAESAR InputXML ${tag} unit row is required.`);
  const factor = Number(match[2]);
  if (!Number.isFinite(factor) || factor <= 0) throw new TypeError(`${tag} FACTOR must be finite and > 0.`);
  return { label: match[1], factor };
}

function canonicalForcePerLengthUnit(unit) {
  const parsed = parseForcePerLengthUnit(unit);
  return `${parsed.forceUnit}/${parsed.lengthUnit}`;
}

function parseForcePerLengthUnit(unit) {
  const text = String(unit ?? '').trim().toUpperCase().replace(/\s+/g, '').replace(/\./g, '');
  const parts = text.split('/');
  if (parts.length !== 2) throw new TypeError(`Unsupported force/length unit ${unit}.`);
  const forceUnit = normalizeForceUnit(parts[0]);
  const lengthUnit = normalizeLengthUnit(parts[1]);
  return { forceUnit, lengthUnit };
}

function normalizeForceUnit(label) {
  const token = String(label ?? '').trim().toUpperCase().replace(/\./g, '');
  const alias = token === 'LBS' ? 'LB' : token;
  if (!(alias in FORCE_TO_N)) throw new TypeError(`Unsupported force unit ${label}.`);
  return alias;
}

function normalizeLengthUnit(label) {
  const token = String(label ?? '').trim().toUpperCase().replace(/\./g, '');
  if (!(token in LENGTH_TO_M)) throw new TypeError(`Unsupported length unit ${label}.`);
  return token;
}
