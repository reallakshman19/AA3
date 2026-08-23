/**
 * Production representation capability for the linear piping analysis path.
 *
 * Flags describe implementation capability, not whether a particular source
 * supplies enough geometry/authority to exercise it. Source-specific gates
 * remain fail-closed; e.g. a bend without a qualified tangent basis is not
 * promoted merely because bend mechanics exist in the compiler.
 */
export const PRODUCTION_CAPABILITY_PROFILE_SCHEMA = 'lfea-production-capability-profile/v1';

export const PRODUCTION_CAPABILITY_PROFILE = Object.freeze({
  schema: PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  profileId: 'LFEA_PRODUCTION_CAPABILITY_R1',
  bendExactMechanics: true,
  teeExactMechanics: false,
  reducerExactMechanics: false,
  pressureStiffening: false,
  pressureAxialThrust: false,
  pressureBourdon: false,
  pressureCodeStress: true,
});

export const PRODUCTION_REPRESENTABLE_COMPONENT_KINDS = Object.freeze([
  'STRAIGHT_PIPE', 'RIGID', 'BEND', 'REDUCER', 'TEE',
]);

const QUALIFIED_BEND_TANGENT_BASES = new Set([
  'ACCDB_CORNER_INTERSECTION_V1',
  'INPUTXML_TANGENT_TO_TANGENT_V1',
]);

export function productionComponentIsRepresentable(componentKind) {
  return PRODUCTION_REPRESENTABLE_COMPONENT_KINDS.includes(componentKind);
}

export function productionBendSourceEligible(segment) {
  return segment?.type === 'BEND'
    && QUALIFIED_BEND_TANGENT_BASES.has(String(segment.meta?.bendTangentBasis ?? ''))
    && segment.meta?.bendTangentStart != null
    && segment.meta?.bendTangentEnd != null
    && segment.meta?.bendArcCentre != null
    && typeof segment.meta?.bendComputedRadius === 'number'
    && Number.isFinite(segment.meta.bendComputedRadius)
    && segment.meta.bendComputedRadius > 0;
}

export function productionAuthorizedPressureEffects(profile) {
  const resolved = profile === undefined ? PRODUCTION_CAPABILITY_PROFILE : profile;
  return Object.freeze({
    codeStress: resolved.pressureCodeStress,
    pressureStiffening: resolved.pressureStiffening,
    axialThrust: resolved.pressureAxialThrust,
    bourdon: resolved.pressureBourdon,
  });
}

/**
 * Return the currently declared approximation for a component. For BEND, a
 * globally enabled compiler still requires source-qualified tangent geometry;
 * unresolved/internal-station bends therefore remain disclosed as straight
 * chords instead of being falsely reported exact.
 */
export function productionComponentLimitation(componentKind, profile, segment) {
  const resolved = profile === undefined ? PRODUCTION_CAPABILITY_PROFILE : profile;
  if (componentKind === 'BEND') {
    return resolved.bendExactMechanics && (segment === undefined || productionBendSourceEligible(segment))
      ? null
      : 'GENERIC_APPROX_BEND_STRAIGHT_CHORD';
  }
  if (componentKind === 'REDUCER') {
    return resolved.reducerExactMechanics ? null : 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION';
  }
  if (componentKind === 'TEE') {
    return resolved.teeExactMechanics ? null : 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY';
  }
  return null;
}
