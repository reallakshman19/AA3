/**
 * What the production analysis path can actually represent.
 *
 * This is the single place that answers "does the compiled model carry bend
 * flexibility?", and it exists because that question previously had four
 * separate hardcoded answers that nothing kept in agreement with reality.
 * `componentDispositions` returned a limitation per component kind
 * unconditionally, and the authorized pressure effects were an object literal
 * repeated in three files. None of them consulted what the compiler had done,
 * so they could not have been wrong in a way anyone would notice.
 *
 * Today every flag below is false, which is the truth: the piping component
 * builders live in `linear-fea-piping-components` and
 * `linear-fea-reducer-condensation`, and the only non-test caller of
 * `compilePipingComponent` is the benchmark harness. Production never builds a
 * component.
 *
 * A flag flips when the stage that implements it lands, and not before. The
 * accompanying check refuses a flag that has no benchmark wired into an npm
 * script, because a capability asserted without evidence is the same defect as
 * a limitation reported without cause -- just harder to see.
 *
 * See docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md (stages S0-S6).
 */

export const PRODUCTION_CAPABILITY_PROFILE_SCHEMA = 'lfea-production-capability-profile/v1';

export const PRODUCTION_CAPABILITY_PROFILE = Object.freeze({
  schema: PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  profileId: 'LFEA_PRODUCTION_CAPABILITY_R1',
  /** Bend arc represented geometrically with a qualified B31 factor set. Stage S3. */
  bendExactMechanics: false,
  /** Branch junction local flexibility. Stage S6. */
  teeExactMechanics: false,
  /** Tapering reducer condensation rather than a uniform section. Stage S4. */
  reducerExactMechanics: false,
  /** Pressure stiffening of the pipe wall. Stage S5. */
  pressureStiffening: false,
  /** End-cap axial thrust from internal pressure. Stage S5. */
  pressureAxialThrust: false,
  /** Bourdon effect: pressure straightening a bend. Stage S5. */
  pressureBourdon: false,
  /** Pressure carried into code stress checking. Already true today. */
  pressureCodeStress: true,
});

/**
 * Component kinds this path represents at all.
 *
 * Kept separate from the limitation lookup because "no limitation" is
 * ambiguous on its own: it means *represented exactly* for a bend once S3
 * lands, and *not representable* for a component kind this solver has no
 * formulation for. Collapsing the two would report an exactly-represented bend
 * as an unsupported component type the moment a capability flips.
 */
export const REPRESENTABLE_COMPONENT_KINDS = Object.freeze(new Set([
  'STRAIGHT_PIPE',
  'RIGID',
  'BEND',
  'REDUCER',
  'TEE',
]));

const LIMITATION_BY_KIND = Object.freeze({
  BEND: Object.freeze({ flag: 'bendExactMechanics', code: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD' }),
  REDUCER: Object.freeze({ flag: 'reducerExactMechanics', code: 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION' }),
  TEE: Object.freeze({ flag: 'teeExactMechanics', code: 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY' }),
});

/*
 * The resolvers below take their profile explicitly, and the production
 * wrappers bind it in one visible place. Default parameters are deliberately
 * avoided: a silently defaulted authority is exactly the shape of the problem
 * this module was written to remove, and the consumer anti-drift check
 * forbids it outright.
 */

/** The declared limitation for a component kind under `profile`, or null. */
export function componentLimitationFor(componentKind, profile) {
  const row = LIMITATION_BY_KIND[String(componentKind)] ?? null;
  if (row === null) return null;
  return profile[row.flag] === true ? null : row.code;
}

/** Pressure effects under `profile`, shaped as the load authorities publish them. */
export function authorizedPressureEffectsFor(profile) {
  return Object.freeze({
    codeStress: profile.pressureCodeStress === true,
    pressureStiffening: profile.pressureStiffening === true,
    axialThrust: profile.pressureAxialThrust === true,
    bourdon: profile.pressureBourdon === true,
  });
}

/** Limitation for a component kind on the production path. */
export function productionComponentLimitation(componentKind) {
  return componentLimitationFor(componentKind, PRODUCTION_CAPABILITY_PROFILE);
}

/** Authorized pressure effects on the production path. */
export function productionAuthorizedPressureEffects() {
  return authorizedPressureEffectsFor(PRODUCTION_CAPABILITY_PROFILE);
}
