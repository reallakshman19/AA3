/**
 * Strict CAESAR-to-SI scalar conversion used by ACCDB reference normalization.
 * Unsupported dimensions or unit labels raise errors; no inferred-unit fallback is permitted.
 */
const LENGTH_UNITS = Object.freeze({
  M: Object.freeze({ factor: 1, unit: 'm' }),
  MM: Object.freeze({ factor: 1e-3, unit: 'm' }),
  CM: Object.freeze({ factor: 1e-2, unit: 'm' }),
  IN: Object.freeze({ factor: 0.0254, unit: 'm' }),
  INCH: Object.freeze({ factor: 0.0254, unit: 'm' }),
  FT: Object.freeze({ factor: 0.3048, unit: 'm' }),
});

const ROTATION_UNITS = Object.freeze({
  RAD: Object.freeze({ factor: 1, unit: 'rad' }),
  DEG: Object.freeze({ factor: Math.PI / 180, unit: 'rad' }),
});

const FORCE_UNITS = Object.freeze({
  N: Object.freeze({ factor: 1, unit: 'N' }),
  KN: Object.freeze({ factor: 1e3, unit: 'N' }),
  LB: Object.freeze({ factor: 4.4482216152605, unit: 'N' }),
  LBF: Object.freeze({ factor: 4.4482216152605, unit: 'N' }),
  KIP: Object.freeze({ factor: 4448.2216152605, unit: 'N' }),
});

const MOMENT_UNITS = Object.freeze({
  'N.M': Object.freeze({ factor: 1, unit: 'N*m' }),
  'N-M': Object.freeze({ factor: 1, unit: 'N*m' }),
  'KN.M': Object.freeze({ factor: 1e3, unit: 'N*m' }),
  'KN-M': Object.freeze({ factor: 1e3, unit: 'N*m' }),
  'LB.IN': Object.freeze({ factor: 0.1129848290276167, unit: 'N*m' }),
  'IN.LB': Object.freeze({ factor: 0.1129848290276167, unit: 'N*m' }),
  'LBF.IN': Object.freeze({ factor: 0.1129848290276167, unit: 'N*m' }),
  // 1.3558179483314003 is the exact double for 4.4482216152605 N/lbf x
  // 0.3048 m/ft. The decimal 1.3558179483314004 names the same double but
  // claims a final digit the format cannot hold, so the value actually
  // used is what is written.
  'LB.FT': Object.freeze({ factor: 1.3558179483314003, unit: 'N*m' }),
  'FT.LB': Object.freeze({ factor: 1.3558179483314003, unit: 'N*m' }),
  'LBF.FT': Object.freeze({ factor: 1.3558179483314003, unit: 'N*m' }),
  'KIP.FT': Object.freeze({ factor: 1355.8179483314004, unit: 'N*m' }),
});

const STRESS_UNITS = Object.freeze({
  PA: Object.freeze({ factor: 1, unit: 'Pa' }),
  KPA: Object.freeze({ factor: 1e3, unit: 'Pa' }),
  MPA: Object.freeze({ factor: 1e6, unit: 'Pa' }),
  BAR: Object.freeze({ factor: 1e5, unit: 'Pa' }),
  PSI: Object.freeze({ factor: 6894.757293168, unit: 'Pa' }),
  KSI: Object.freeze({ factor: 6894757.293168, unit: 'Pa' }),
});

const UNIT_MAPS = Object.freeze({
  LENGTH: LENGTH_UNITS,
  ROTATION: ROTATION_UNITS,
  FORCE: FORCE_UNITS,
  MOMENT: MOMENT_UNITS,
  STRESS: STRESS_UNITS,
});

/** Convert a finite CAESAR scalar to the benchmark SI row contract. */
export function convertCaesarValue(rawValue, rawUnit, dimension) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) throw new TypeError(`CAESAR ${dimension} value must be finite.`);
  const unitMap = UNIT_MAPS[String(dimension).toUpperCase()];
  if (!unitMap) throw new TypeError(`Unsupported CAESAR unit dimension ${dimension}.`);
  const token = normalizeCaesarUnitToken(rawUnit);
  const conversion = unitMap[token];
  if (!conversion) throw new TypeError(`Unsupported CAESAR ${dimension} unit ${String(rawUnit)}.`);
  return Object.freeze({ value: value * conversion.factor, unit: conversion.unit });
}

/** Convert an explicit installation-temperature profile value to Kelvin. */
export function temperatureToKelvin(rawValue, rawUnit) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) throw new TypeError('Installation temperature must be finite.');
  const token = normalizeCaesarUnitToken(rawUnit);
  if (token === 'K') return value;
  if (token === 'C' || token === 'DEGC') return value + 273.15;
  if (token === 'F' || token === 'DEGF') return (value - 32) * 5 / 9 + 273.15;
  throw new TypeError(`Unsupported installation temperature unit ${String(rawUnit)}.`);
}

export function normalizeCaesarUnitToken(rawUnit) {
  const compact = String(rawUnit ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, '')
    .replace(/·/gu, '.')
    .replace(/\.+$/gu, '')
    // Real CAESAR ACCDB exports label bar pressure as the plural "bars"; the
    // stress/pressure table only declares the singular BAR. Matches the
    // equivalent fold already applied to InputXML's own unit labels
    // (inputxml-unit-system.js), so both adapters accept the same real-world
    // label variant rather than one silently rejecting it.
    .replace(/\bBARS\b/u, 'BAR');
  if (!compact) throw new TypeError('CAESAR unit is required.');
  return compact;
}
