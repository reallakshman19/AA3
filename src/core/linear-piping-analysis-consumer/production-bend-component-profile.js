import { PIPING_COMPONENT_PROFILE_ID, sealPipingComponentProfile } from '../linear-fea-piping-components/index.js';

const SOURCE = 'LFEA-PIPING-PROMOTION-S3-CONVERGENCE-QUALIFICATION';

/**
 * S3 stiffness profile for source-qualified bends.
 *
 * Six elements are intentionally aligned with S2. A maximum 30-degree segment
 * angle can never demand more than six elements for the supported circular
 * sweep (<180 degrees), so the component builder and structural topology keep
 * identical element identities. The component's own 4x compliance convergence
 * report remains mandatory; a geometry for which six elements do not satisfy
 * 1% is BLOCKED rather than silently refined behind the topology's back.
 * The pressure-stiffening argument is required rather than defaulted. This
 * package's own anti-drift guard forbids hidden default parameters, and it is
 * right to: a profile that silently defaulted to "no pressure" would seal a
 * component whose declared rule disagreed with the factor it was built from.
 *
 * The pressure-stiffening rule is not a fixed property of this profile: the
 * component kernel refuses a factor set whose pressure basis disagrees with the
 * profile that consumes it, in either direction, so the rule has to state what
 * the factor authority actually did. It follows the capability profile.
 */
export function productionBendComponentProfile(pressureStiffeningApplied) {
  return sealPipingComponentProfile({
    schema: 'fea-linear-piping-component-profile/v1',
    // Must equal the piping-component kernel's own contract identity -- this
    // is not a caller-chosen label. caesar-accdb-linear-solve.js seals the
    // identical benchmark-qualified profile the same way. A different string
    // here does not create a distinct profile; it fails PIPING_COMPONENT_PROFILE_INVALID
    // on every bend, unconditionally, regardless of what factor authority is supplied.
    profileId: PIPING_COMPONENT_PROFILE_ID,
    bendFormulation: 'PIPE_BEND_CORRECTED_FRAME_V1',
    bendSubdivisionPurpose: 'STRESS_RECOVERY_V1',
    bendPressureStiffeningRule: requireBoolean(pressureStiffeningApplied)
      ? 'BEND_PRESSURE_STIFFENING_DECLARED_FACTOR_V1'
      : 'BEND_PRESSURE_STIFFENING_EXCLUDED_V1',
    convergenceRequired: true,
    reducerRule: 'REDUCER_STEPPED_SECTION_V1',
    valveBodyRule: 'VALVE_RIGID_BODY_V1',
    weightLumpRule: 'FINITE_LENGTH_BODY_REQUIRED_V1',
    branchFlexibilityMethod: 'BRANCH_FLEXIBILITY_NOT_APPLIED_V1',
    branchClassificationRule: 'DIRECTION_VECTOR_TOPOLOGY_V1',
    supportOffsetRule: 'RIGID_OFFSET_KINEMATIC_V1',
    outsideApplicabilityRule: 'BLOCK',
    bendMaxAngleDegrees: { value: 30, source: SOURCE },
    bendMinimumElements: { value: 6, source: SOURCE },
    bendMinimumElementsBetweenStations: { value: 3, source: SOURCE },
    bendRadiusRelativeTolerance: { value: 1e-9, source: SOURCE },
    bendConvergenceRefinementFactor: { value: 4, source: SOURCE },
    convergenceRelativeTolerance: { value: 0.01, source: SOURCE },
    flexibilityDoubleCountTolerance: { value: 1e-9, source: SOURCE },
    runCollinearityTolerance: { value: 1e-9, source: SOURCE },
    rigidBodyStiffnessMultiplier: { value: 1000, source: SOURCE },
    semanticHash: '',
  });
}

function requireBoolean(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError(
      'productionBendComponentProfile requires an explicit pressureStiffeningApplied flag; '
      + 'it must state what the factor authority actually did.',
    );
  }
  return value;
}
