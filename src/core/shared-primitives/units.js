const UNIT_FACTORS = deepFreeze({
  length: { mm: 1, m: 1000 },
  force: { N: 1, kN: 1000 },
  moment: {
    'N·mm': 1,
    'N*mm': 1,
    'N·m': 1000,
    'N*m': 1000,
    'kN·m': 1_000_000,
    'kN*m': 1_000_000,
  },
  pressure: { Pa: 1e-6, kPa: 1e-3, MPa: 1 },
  stress: { Pa: 1e-6, kPa: 1e-3, MPa: 1 },
  modulus: { MPa: 1, GPa: 1000 },
});

export function unitFactor(dimension, unit) {
  const factors = UNIT_FACTORS[dimension];
  if (!factors || typeof unit !== 'string' || !Object.hasOwn(factors, unit)) return null;
  return factors[unit];
}

export function supportedUnits(dimension) {
  const factors = UNIT_FACTORS[dimension];
  return factors ? Object.freeze(Object.keys(factors)) : Object.freeze([]);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
