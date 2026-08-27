/**
 * Explicit owner authorization for ten-cylinder reducer mechanics in production.
 *
 * The S4 protocol is clear that accepted parity evidence yields
 * `QUALIFIED_PARITY_EVIDENCE_ONLY` and that production authority is a separate,
 * reviewed decision. This record is that decision, written down rather than
 * expressed by editing a status string -- which is precisely what
 * production-readiness.js refuses to accept.
 *
 * WHAT IT IS AUTHORIZED ON
 *
 * BM4_L run through the benchmark against CAESAR's own retained output, with
 * only the reducer treatment varied:
 *
 *   ten-cylinder condensed (midpoint)      1.74%  mean worst end-action error
 *   single prismatic, average section      7.59%
 *   single prismatic, From-end section    16.48%
 *
 * Ten-cylinder is closer in 24 of 24 reducer/case comparisons against the
 * From-end stick and 23 of 24 against the average-section stick. The declared
 * profile tolerance for these quantities is 10%; 1.74% sits well inside it.
 * Locked in by scripts/lfea-s4-reducer-discretization-check.mjs.
 *
 * WHAT IT IS NOT
 *
 * This is not S4 qualification, and it does not close the three blockers.
 *
 *   - Sampling station is NOT established. Measured on the same model, end
 *     station gives 1.47%, midpoint 1.74%, start station 2.73% -- a 1.26 point
 *     spread that does not separate cleanly on a service model carrying bends,
 *     tees and restraints. Midpoint is authorized as the implemented candidate
 *     that measures acceptably, not as the identified CAESAR rule. Note that
 *     end station measured slightly better.
 *   - Gravity ownership is NOT isolated. A third party reports CAESAR using
 *     From-end weight, contradicting its own manual. The weight-only case here
 *     favours ten-cylinder (0.38-0.86% against 3.87-12.24%), but a reducer's own
 *     weight is a small part of a system-wide end-action response, so this does
 *     not cleanly discriminate the weight rule.
 *
 * Both remain open questions for the controlled runs. What this authorizes is
 * use of a treatment measured to track CAESAR an order of magnitude better than
 * the uniform-section approximation it replaces -- not a claim to have
 * identified CAESAR's internal rule.
 */
export const REDUCER_PRODUCTION_AUTHORIZATION_SCHEMA =
  'lfea-reducer-production-authorization/v1';

export const REDUCER_PRODUCTION_AUTHORIZATION = Object.freeze({
  schema: REDUCER_PRODUCTION_AUTHORIZATION_SCHEMA,
  authorizationId: 'LFEA-REDUCER-TEN-CYLINDER-MIDPOINT-BM4L-2026-08-27',
  authorizedRule: 'MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1',
  basis: 'BM4L_BENCHMARK_END_ACTION_PARITY_AGAINST_RETAINED_CAESAR_OUTPUT',
  measuredMeanWorstEndActionErrorPercent: 1.7352,
  comparedAgainst: Object.freeze({
    uniformAverageSectionPercent: 7.5872,
    uniformFromEndSectionPercent: 16.4841,
  }),
  declaredProfileTolerancePercent: 10,
  approverIdentity: 'REPOSITORY_OWNER',
  reason: 'Measured end-action error is acceptable for production use; the uniform-section '
    + 'approximation it replaces is an order of magnitude worse on the same model.',
  // Named explicitly so the authorization cannot be read as closing them.
  blockersExplicitlyNotClosed: Object.freeze([
    'REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED',
    'REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED',
    'REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED',
  ]),
  supersededBy: 'A completed S4 controlled-evidence package, which may identify a '
    + 'different sampling rule and would replace this authorization rather than extend it.',
});
