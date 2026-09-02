/**
 * Plain-language labels for the EMP.1 codes that reach the screen.
 *
 * The rest of the LAFEA/LFEA workbench already routes its reason codes through
 * `lafea-workbench-reason-labels.js`, which returns sentences. The EMP.1 surfaces
 * instead used a helper that only replaced underscores with spaces, so an engineer
 * read `CANONICAL MODEL NOT CURRENT AND QUALIFIED` rather than a sentence. This
 * registry closes that gap for EMP.1's own vocabulary.
 *
 * Two shapes are covered because the presentation layer produces both:
 *   - underscore codes, e.g. `EMP1_WORKBENCH_A_DOCUMENT_REQUIRED`
 *   - already-spaced uppercase summary values, e.g. `LOCAL METHOD BLOCKED`
 *
 * Anything unmapped falls back to the previous underscore-stripping behaviour, so
 * a new code degrades to what it looked like before rather than to nothing.
 */

const COMPOSED_SEPARATOR = ' \u00b7 ';

const STATE_LABELS = Object.freeze({
  // readiness dimensions
  INPUT_REQUIRED: 'Input required',
  NOT_ESTABLISHED: 'Not established',
  NOT_READY: 'Not ready',
  NOT_REVIEWED: 'Not reviewed',
  NOT_ASSESSED: 'Not assessed',
  NOT_QUALIFIED: 'Not qualified',
  NOT_RUN: 'Not run',
  READY: 'Ready',
  READY_TO_RUN: 'Ready to run',
  READY_TO_CALCULATE: 'Ready to calculate',
  READY_FOR_ENGINEERING_REVIEW: 'Ready for engineering review',
  CALCULATED_CURRENT: 'Calculated and current',
  CALCULATION_REQUIRED: 'Calculation required',
  CALCULATION_STALE: 'Calculation is stale',
  CURRENT: 'Current',
  STALE: 'Stale',
  STALE_INPUT: 'Input changed since the last run',
  STALE_AUTHORITY: 'Route authority changed since the last run',
  STALE_A_EVIDENCE: 'Step A evidence changed since the last run',
  STALE_WITH_RETAINED_CALCULATION: 'Stale, with an earlier calculation retained',
  SOURCE_INCOMPLETE: 'Source is incomplete',
  SOURCE_STALE: 'Source has changed since the last run',
  BLOCKED: 'Blocked',
  METHOD_BLOCKED: 'Method is blocked',
  ROUTE_SUSPENDED: 'Route is suspended',
  AWAITING_CURRENT_A: 'Waiting on a current step A result',
  A_EVIDENCE_REQUIRED: 'Step A evidence is required',
  PENDING_EXECUTION_GATE: 'Pending the execution gate',
  AUTHORIZED_BOUNDED_ROUTE: 'Authorized on the bounded route',
  QUALIFIED_BY_CURRENT_EXECUTION_GATE: 'Qualified by the current execution gate',
  QUALIFIED_BY_EXISTING_RELEASE_BOUNDARY: 'Qualified by the existing release boundary',
  CURRENT_REPORTABLE_BOUNDED_C_EXECUTION: 'Current, reportable bounded step C execution',

  // blockers and route authority
  EMP1_READINESS_A_SOURCE_REQUIRED:
    'The EMP.1.A load and reference source is required.',
  EMP1_READINESS_B_SOURCE_REQUIRED:
    'The EMP.1.B section-screening source is required.',
  EMP1_WORKBENCH_A_DOCUMENT_REQUIRED:
    'Load the EMP.1.A load and reference source before running.',
  EMP1_WORKBENCH_B_DOCUMENT_REQUIRED:
    'Load the EMP.1.B section-screening source before running.',
  EMP1_WORKBENCH_RUN_INPUT_REQUIRED:
    'Complete the EMP.1.C source binding and run setup before running.',
  EMP1_WORKBENCH_RUN_INPUT_INVALID:
    'The EMP.1.C run setup was rejected; re-enter the source binding.',
  EMP1_WORKBENCH_GEOMETRY_IDENTITY_REQUIRED:
    'Bind an attachment geometry identity before running.',
  EMP1_WORKBENCH_LOAD_CASE_IDENTITY_REQUIRED: 'Select a load case before running.',
  EMP1_WORKBENCH_PRESSURE_RESULT_IDENTITY_REQUIRED: 'Select a pressure result before running.',
  EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED:
    'Route authority changed after the retained result; re-run before relying on it.',
  EMP1_WORKBENCH_C_CURRENT_ROUTE_AUTHORITY_REQUIRED:
    'A current route authority snapshot is required before step C can run.',
  EMP1_WORKBENCH_C_CURRENT_ROUTE_NOT_AUTHORIZED:
    'The current route is not authorized for step C execution.',
  EMP1_WORKBENCH_C_ROUTE_AUTHORITY_SNAPSHOT_REQUIRED:
    'A route authority snapshot is required before step C can run.',
  EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED:
    'Step A must produce a current qualified result before step C can run.',
  EMP1_C_BOUNDED_ROUTE_NOT_REGISTERED:
    'The bounded local-correlation route is not registered in this build.',
  EMP1_C_BOUNDED_ROUTE_REGISTRY_ENTRY_REQUIRED:
    'The bounded local-correlation route has no registry entry.',
  EMP1_C_BOUNDED_ROUTE_ENGINEERING_USE_NOT_AUTHORIZED:
    'The bounded local-correlation route is not authorized for engineering use.',
  EMP1_C_BOUNDED_ROUTE_EXECUTOR_NOT_AUTHORIZED:
    'The bounded local-correlation route has no authorized executor.',
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED:
    'The WRC 537 gamma=5 zero-pressure route is suspended pending requalification.',
});

/** Summary values the presentation layer already emits space-separated. */
const SUMMARY_LABELS = Object.freeze({
  'SOURCE CURRENT': 'Source current',
  'SOURCE INCOMPLETE': 'Source incomplete',
  'SOURCE INPUT REQUIRED': 'Source input required',
  'SOURCE STALE': 'Source stale',
  'TRANSFER CURRENT': 'Load transfer current',
  'TRANSFER INPUT REQUIRED': 'Load transfer input required',
  'TRANSFER NOT CALCULATED': 'Load transfer not calculated',
  'SCREENING CURRENT': 'Section screening current',
  'SCREENING INPUT REQUIRED': 'Section screening input required',
  'SCREENING NOT CALCULATED': 'Section screening not calculated',
  'SCREENING STALE': 'Section screening stale',
  'LOCAL METHOD QUALIFIED': 'Local method qualified',
  'LOCAL METHOD BLOCKED': 'Local method blocked',
  'LOCAL RESULT CURRENT': 'Local result current',
  'LOCAL RESULT NOT CALCULATED': 'Local result not calculated',
  'LOCAL RESULT STALE': 'Local result stale',
  'RELEASE PROFILE QUALIFIED': 'Release profile qualified',
  'RELEASE PROFILE NOT QUALIFIED': 'Release profile not qualified',
  'CODE COMPLIANCE NOT ASSESSED': 'Code compliance not assessed',
});

/**
 * Plain-language text for one EMP.1 code or summary value.
 * Unmapped values fall back to underscore stripping, the previous behaviour.
 */
export function emp1PlainLanguageLabel(value) {
  const raw = String(value ?? 'UNRESOLVED');
  const direct = STATE_LABELS[raw] ?? SUMMARY_LABELS[raw];
  if (direct) return direct;
  // The workflow steps compose two summary values, e.g.
  // "LOCAL METHOD BLOCKED · LOCAL RESULT NOT CALCULATED". Map each half so a
  // composed label is not left shouting just because the pair is not itself a key.
  if (raw.includes(COMPOSED_SEPARATOR)) {
    return raw.split(COMPOSED_SEPARATOR)
      .map((part) => emp1PlainLanguageLabel(part.trim()))
      .join(COMPOSED_SEPARATOR);
  }
  return raw.replaceAll('_', ' ');
}

/** True when the value has a mapped label rather than a fallback. */
export function emp1HasPlainLanguageLabel(value) {
  const raw = String(value ?? '');
  return Object.hasOwn(STATE_LABELS, raw) || Object.hasOwn(SUMMARY_LABELS, raw);
}

export const EMP1_PLAIN_LANGUAGE_LABEL_COUNT =
  Object.keys(STATE_LABELS).length + Object.keys(SUMMARY_LABELS).length;
