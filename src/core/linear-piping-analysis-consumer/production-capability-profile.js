/**
 * Production representation capability for the linear piping analysis path.
 *
 * This module is disclosure authority only. A flag may become true only in the
 * stage that wires the corresponding production mechanics and qualifies that
 * route. S0 deliberately preserves the current behavior: component mechanics
 * remain unavailable and pressure contributes to code-stress custody only.
 */

export const PRODUCTION_CAPABILITY_PROFILE_SCHEMA = 'lfea-production-capability-profile/v1';

export const PRODUCTION_CAPABILITY_PROFILE = Object.freeze({
  schema: PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  profileId: 'LFEA_PRODUCTION_CAPABILITY_R1',
  bendExactMechanics: false,
  teeExactMechanics: false,
  reducerExactMechanics: false,
  pressureStiffening: false,
  pressureAxialThrust: false,
  pressureBourdon: false,
  pressureCodeStress: true,
});

export const PRODUCTION_REPRESENTABLE_COMPONENT_KINDS = Object.freeze(new Set([
  'STRAIGHT_PIPE',
  'RIGID',
  'BEND',
  'REDUCER',
  'TEE',
]));

export function productionAuthorizedPressureEffects(profile = PRODUCTION_CAPABILITY_PROFILE) {
  return Object.freeze({
    codeStress: profile.pressureCodeStress,
    pressureStiffening: profile.pressureStiffening,
    axialThrust: profile.pressureAxialThrust,
    bourdon: profile.pressureBourdon,
  });
}

/**
 * Return the declared approximation code for a known component, or null when
 * the component is represented exactly or is outside the representable set.
 * Callers must distinguish those two null states using
 * PRODUCTION_REPRESENTABLE_COMPONENT_KINDS.
 */
export function productionComponentLimitation(componentKind, profile = PRODUCTION_CAPABILITY_PROFILE) {
  if (componentKind === 'BEND') {
    return profile.bendExactMechanics ? null : 'GENERIC_APPROX_BEND_STRAIGHT_CHORD';
  }
  if (componentKind === 'REDUCER') {
    return profile.reducerExactMechanics ? null : 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION';
  }
  if (componentKind === 'TEE') {
    return profile.teeExactMechanics ? null : 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY';
  }
  return null;
}
