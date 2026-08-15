/**
 * Ephemeral display cache for immutable canonical BC/load glyph projections.
 * This owns no engineering authority: accepted execution state remains the
 * retained source of truth. Exact execution-hash matching prevents stale
 * glyphs from being rendered against a different result packet.
 */
const MAX_PROJECTIONS = 16;
const projections = new Map();

export function retainLafeaBcLoadGlyphDisplayProjection(projection) {
  if (!projection?.executionHash || !projection?.canonicalExecutionInputHash
    || !Array.isArray(projection.glyphs)) {
    throw new TypeError('LAFEA_BC_LOAD_GLYPH_DISPLAY_PROJECTION_INVALID');
  }
  const retained = deepFreeze(structuredClone(projection));
  projections.delete(retained.executionHash);
  projections.set(retained.executionHash, retained);
  while (projections.size > MAX_PROJECTIONS) {
    projections.delete(projections.keys().next().value);
  }
  return retained;
}

export function selectLafeaBcLoadGlyphDisplayProjection(executionHash) {
  if (!executionHash) return null;
  return projections.get(executionHash) ?? null;
}

export function clearLafeaBcLoadGlyphDisplayProjection(executionHash) {
  return executionHash ? projections.delete(executionHash) : false;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
