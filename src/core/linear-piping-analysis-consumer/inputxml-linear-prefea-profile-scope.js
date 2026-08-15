import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from './inputxml-model-health-profile.js';

// Capability ids ending _STRICT / _APPROXIMATE (STRICT_LINEAR_STATIC and
// APPROXIMATE_LINEAR_STATIC themselves, plus the SUSTAINED_CASE_*/
// OPERATING_CASE_* pairs that depend on them — see
// INPUTXML_MODEL_HEALTH_CAPABILITY_DEPENDENCIES) belong to exactly one of the
// two mutually-exclusive analysis profiles a request selects. A request for
// the strict profile can never solve, and never needs to solve, under the
// approximate profile's capability, so surfacing "APPROXIMATE_LINEAR_STATIC
// is blocked" against a strict request is noise about a path the request
// never takes.
const PROFILE_FAMILY_BY_ID = Object.freeze({
  [STRICT_INPUTXML_LINEAR_STATIC_PROFILE]: 'STRICT',
  [DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE]: 'APPROXIMATE',
});

export function requestedProfileFamily(requestedProfileId) {
  return PROFILE_FAMILY_BY_ID[requestedProfileId] ?? null;
}

export function capabilityAppliesToRequest(capabilityId, requestedFamily) {
  if (requestedFamily === null) return true;
  if (capabilityId.endsWith('_STRICT') || capabilityId === 'STRICT_LINEAR_STATIC') {
    return requestedFamily === 'STRICT';
  }
  if (capabilityId.endsWith('_APPROXIMATE') || capabilityId === 'APPROXIMATE_LINEAR_STATIC') {
    return requestedFamily === 'APPROXIMATE';
  }
  return true;
}

const EFFECT_RANK = Object.freeze({ PASS: 0, CONDITIONAL: 1, BLOCK: 2 });

/**
 * Recompute a finding's disposition from only the capability effects that
 * apply to the requested profile, instead of the severity/disposition the
 * model-health authority baked from the worst effect across BOTH profiles.
 *
 * Every model-health-sourced row (topology, proximity, representability) sets
 * `capabilityEffects` to this same Record<capabilityId, {disposition}> shape.
 * A per-feature finding like a BEND or an axis-aligned unilateral restraint
 * is routinely STRICT=BLOCK / APPROXIMATE=CONDITIONAL (the whole point of the
 * approximate profile is to accept declared approximations STRICT refuses) —
 * before this, the baked severity took the worst of the two regardless of
 * which profile was requested, so an APPROXIMATE request saw the same BLOCK a
 * STRICT request would, defeating the reason to have an approximate profile
 * at all. Returns null when there is nothing to recompute (no requested
 * profile, or a row that isn't model-health-sourced), so the caller falls
 * back to the row's own severity/disposition unchanged.
 */
export function scopedDisposition(upstreamCapabilityEffects, requestedFamily) {
  if (upstreamCapabilityEffects === null || requestedFamily === null) return null;
  if (Array.isArray(upstreamCapabilityEffects)) return null;
  let worst = 'PASS';
  for (const [capabilityId, effect] of Object.entries(upstreamCapabilityEffects)) {
    if (!capabilityAppliesToRequest(capabilityId, requestedFamily)) continue;
    const disposition = String(effect?.disposition ?? '').toUpperCase();
    if (EFFECT_RANK[disposition] === undefined) continue;
    if (EFFECT_RANK[disposition] > EFFECT_RANK[worst]) worst = disposition;
  }
  return worst;
}

export function severityForScopedDisposition(disposition) {
  if (disposition === 'BLOCK') return 'ERROR';
  if (disposition === 'CONDITIONAL') return 'WARNING';
  return 'INFO';
}
