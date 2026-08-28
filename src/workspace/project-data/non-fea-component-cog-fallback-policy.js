export const NON_FEA_COMPONENT_COG_FALLBACK = Object.freeze({
  GEOMETRIC_MIDPOINT: 'GEOMETRIC_MIDPOINT',
  DISABLED: 'DISABLED',
});

export const NON_FEA_COMPONENT_COG_FALLBACK_VALUES = Object.freeze(
  Object.values(NON_FEA_COMPONENT_COG_FALLBACK),
);

export function isNonFeaComponentCogFallbackPolicy(value) {
  return NON_FEA_COMPONENT_COG_FALLBACK_VALUES.includes(normalize(value));
}

export function requireNonFeaComponentCogFallbackPolicy(value) {
  const normalized = normalize(value);
  if (!NON_FEA_COMPONENT_COG_FALLBACK_VALUES.includes(normalized)) {
    throw new RangeError(
      `Unsupported component CoG fallback policy: ${normalized || 'EMPTY'}.`,
    );
  }
  return normalized;
}

export function optionalNonFeaComponentCogFallbackPolicy(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return requireNonFeaComponentCogFallbackPolicy(value);
}

function normalize(value) {
  return String(value ?? '').trim().toUpperCase();
}
