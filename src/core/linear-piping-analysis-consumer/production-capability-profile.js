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
  teeExactMechanics: true,
  /*
   * Stays false, now measured on a base that agrees with it.
   *
   * The ten-cylinder condensation is implemented, wired and authorized (see
   * reducer-condensation-augmentation.js and reducer-production-authorization.js).
   * It was first suspected of failing only because production straight pipe was
   * Euler-Bernoulli while the condensation is Timoshenko (kappa = 0.5), putting
   * a beam-theory discontinuity at exactly the reducer elements.
   *
   * Production is now Timoshenko throughout, which removed that discontinuity
   * -- and did NOT rescue the promotion. On the matched base, enabling reducers
   * still costs parity on every BM4_L case:
   *
   *   L2  88.87 -> 86.94   (-1.93)
   *   L5  83.75 -> 81.61   (-2.14)
   *   L6  73.93 -> 72.47   (-1.46)
   *
   * So the treatment is independently wrong for this model, not merely
   * inconsistent with its surroundings. The favourable benchmark reading
   * (1.74% vs 7.59%) measured reducer-local end actions inside the benchmark
   * harness and does not survive whole-model parity. Closing this needs the S4
   * controlled runs the authorization record already says it does not close --
   * particularly which station each cylinder samples.
   */
  reducerExactMechanics: false,
  pressureStiffening: true,
  pressureAxialThrust: true,
  pressureBourdon: true,
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

/**
 * Minimum source-level eligibility for exact tee mechanics. The production
 * junction compiler performs the stronger three-leg/topology/state checks.
 * TYPE=5 weldolets are intentionally excluded until independently qualified.
 * A TYPE=3 declaration must name an endpoint of the segment that carries it;
 * otherwise the source record does not establish custody of that junction.
 */
export function productionTeeSourceEligible(segment) {
  const endpoints = new Set([
    String(segment?.startNodeId ?? ''),
    String(segment?.endNodeId ?? ''),
  ]);
  return (segment?.meta?.analysis?.sifs ?? []).some((sif) =>
    Number(sif.typeCode) === 3
      && sif.nodeId !== null
      && sif.nodeId !== undefined
      && endpoints.has(String(sif.nodeId)));
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

/** Return the current declared approximation, preserving source-level gates. */
export function productionComponentLimitation(componentKind, profile, segment) {
  const resolved = profile === undefined ? PRODUCTION_CAPABILITY_PROFILE : profile;
  if (componentKind === 'BEND') {
    return resolved.bendExactMechanics && (segment === undefined || productionBendSourceEligible(segment))
      ? null
      : 'GENERIC_APPROX_BEND_STRAIGHT_CHORD';
  }
  if (componentKind === 'REDUCER') {
    // Promotion replaced the uniform-section stick, but did not close the S4
    // sampling-station and gravity-ownership blockers, so the disclosure changes
    // rather than disappearing: the treatment is measured, not qualified.
    return resolved.reducerExactMechanics
      ? 'UNQUALIFIED_SAMPLING_REDUCER_TEN_CYLINDER_MIDPOINT'
      : 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION';
  }
  if (componentKind === 'TEE') {
    return resolved.teeExactMechanics && (segment === undefined || productionTeeSourceEligible(segment))
      ? null
      : 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY';
  }
  return null;
}
