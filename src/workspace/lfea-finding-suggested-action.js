/**
 * What to actually do about a finding, in the words an engineer would use.
 *
 * `lfea-finding-plain-language.js` says what a finding *is*. This says what to
 * *do* about it, which is the question a reviewer is really asking when a
 * model comes back with a hundred and seventy findings on it.
 *
 * The distinction that matters here is not severity, it is consequence: two
 * findings can both be "review and accept" while one is a formality and the
 * other quietly changes the answer. Saying "Review and accept" on both tells
 * the reviewer nothing. So each entry states the engineering consequence and
 * when it stops being acceptable -- "expect movements near bends to read low"
 * is actionable; "conditional authorization required" is not.
 *
 * A code with no entry here falls back to null and the panel simply shows no
 * suggestion, rather than inventing generic advice that might be wrong for
 * that finding.
 */
const SUGGESTED_ACTION = Object.freeze({
  // --- Blockers: the run cannot proceed until these are resolved ---
  ACCDB_RESTRAINT_TYPE_UNMAPPED: 'Identify this support type in the source model. It is deliberately not guessed at, because an assumed support changes every reaction downstream of it.',
  ACCDB_UNIT_DECLARATION_REQUIRED: 'Set the units in the source model to ones this tool recognises, then re-import.',
  ACCDB_UNIT_TOKEN_UNSUPPORTED: 'Set the units in the source model to ones this tool recognises, then re-import.',
  ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED: 'Remove the end offset in the source model, or model it explicitly as a short element between two nodes.',
  ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED: 'Change this to a support to ground, or model the connection between the two nodes explicitly.',
  MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED: 'Change this to a support to ground, or model the connection between the two nodes explicitly.',
  INPUTXML_SOURCE_GEOMETRY_INVALID: 'The geometry could not be read cleanly. Re-export the model from CAESAR and re-import it.',
  TOPOLOGY_MODEL_EMPTY: 'No usable pipe was found. Check that the file exported correctly and contains piping elements.',
  SOLVER_MECHANISM_FLOATING_COMPONENT: 'Part of the model is unsupported and can float. Add a support, or connect that part to the rest of the model, then re-check.',
  MODEL_RESTRAINT_TARGET_DUPLICATE: 'Two supports act on the same node in the same direction. Remove one, or confirm which is intended, before running.',
  MODEL_COMPONENT_TYPE_UNSUPPORTED: 'This component has no representation in this solver. Replace it with one that does, or exclude it from the run.',
  MODEL_COMPONENT_SOURCE_UNRECONCILED: 'A component could not be matched to the geometry built from it. Re-export the source model and re-import.',
  MODEL_OPERATING_TEMPERATURE_NOT_DECLARED: 'Set an operating temperature in the source model if you need a thermal expansion case.',

  // --- Topology: usually a real modelling mistake worth opening the file for ---
  TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP: 'Almost always a duplicated element. Find these two runs in the source model and delete the duplicate — otherwise the weight of that stretch is counted twice.',
  TOPOLOGY_EXACT_DUPLICATE_SEGMENTS: 'Delete the duplicate run in the source model, or its weight and stiffness are counted twice.',
  TOPOLOGY_NUMERIC_DUPLICATE_SEGMENTS: 'Check whether these two runs are meant to be the same pipe. If so, delete one in the source model.',
  TOPOLOGY_UNNODED_INTERIOR_INTERSECTION: 'If these runs are meant to connect, add a node where they cross in the source model. As it stands they pass through each other carrying no load between them.',
  TOPOLOGY_ENDPOINT_ON_SEGMENT_INTERIOR: 'If this run is meant to tee into the other, split the through-run and add a shared node there. As it stands the branch carries no load into the header.',
  TOPOLOGY_UNSHARED_COINCIDENT_ENDPOINTS: 'Merge these two node numbers in the source model if the runs are meant to connect. They are at the same point but not joined.',
  TOPOLOGY_DISTINCT_NODES_EXACTLY_COINCIDENT: 'Confirm whether these two nodes should be one. Nothing is merged automatically.',
  TOPOLOGY_DISTINCT_NODES_NUMERIC_COINCIDENCE: 'Confirm whether these two nodes should be one. Nothing is merged automatically.',
  TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT: 'Open these nodes in the source model and confirm the coordinates are intended. A small offset here is often a typing slip that leaves the pipe unconnected.',
  TOPOLOGY_SEGMENT_NEAR_MISS: 'Confirm these runs really are separate. If they should connect, add a shared node in the source model.',
  TOPOLOGY_ELEMENT_DELTA_CLOSURE_MISMATCH: 'The element length and its node coordinates disagree. Check the delta dimensions on this element in the source model.',
  TOPOLOGY_PROXIMITY_PAIR_DEGENERATE: 'Nothing to do unless this very short run is unintended.',
  TOPOLOGY_NODE_ID_INVALID: 'A node number could not be read. Check this node in the source model.',

  // --- Simplifications: acceptable, but each one changes the answer somewhere ---
  MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE: 'Expect movement near bends to read low and support loads to read high. Fine for a first pass or a layout check; for a final flexibility or nozzle-load check use a solver with proper bend flexibility factors.',
  MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE: 'Accept unless the branch connection is your critical point — local tee flexibility mainly affects branch loads and stresses at the junction itself.',
  MODEL_REDUCER_EXACT_MECHANICS_UNAVAILABLE: 'Normally safe to accept. It matters only where a reducer sits at a highly stressed or highly flexible point.',
  MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED: 'Fine to accept when you only need a code stress check. If the line is thin-wall, high pressure, or contains expansion joints, pressure stiffening and end thrust are real effects and this run will miss them.',
  MODEL_RESTRAINT_FRICTION_UNSUPPORTED: 'Without friction the pipe slides freely, so thermal movement reads high and support loads read low. Accept for a movement check; do not use these support loads for sizing without allowing for friction.',
  ACCDB_RESTRAINT_FRICTION_NOT_MODELED: 'Without friction the pipe slides freely, so thermal movement reads high and support loads read low. Accept for a movement check; do not use these support loads for sizing without allowing for friction.',
  MODEL_RESTRAINT_GAP_UNSUPPORTED: 'The support acts from the start instead of after the gap closes, so it picks up load earlier than the real one would. Matters most where the gap is large compared with the movement at that point.',
  ACCDB_RESTRAINT_GAP_NOT_MODELED: 'The support acts from the start instead of after the gap closes, so it picks up load earlier than the real one would. Matters most where the gap is large compared with the movement at that point.',
  MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED: 'Check the results at this support: if it comes out in tension, the real one would have lifted off and the answer there is not trustworthy. If it stays in compression, the simplification cost you nothing.',
  MODEL_SIF_TYPE_UNSUPPORTED: 'Identify the fitting type in the source model, or leave this point out of code checking. Do not rely on a code stress result here as it stands.',
  ACCDB_SIF_TYPE_UNCLASSIFIED: 'Nothing is blocked. If you need a code stress check at this fitting, identify its type in the source model first.',
  MODEL_FEATURE_LIMITATION: 'Read the stated simplification and decide whether it affects the result you care about.',
  ACCDB_RESTRAINT_NODE_UNRESOLVED: 'This support is attached to a node no pipe uses, so it holds nothing. Check the node number in the source model.',

  // --- Notes: nothing to do ---
  ACCDB_BEND_ARC_GEOMETRY_RESOLVED: 'Nothing to do — the bend geometry was read successfully from the file.',
  ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER: 'Nothing to do — this records a value you changed by hand.',
  ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED: 'If these applied forces matter for your case, add them in the Load case step. As it stands they are recorded but not applied.',
  ALGEBRAIC_RESIDUAL_NORMALIZED: 'Nothing to do — the solve is far more precise than pipe stress work requires.',

  // --- Stages performed elsewhere in the workflow ---
  CODE_STRESS_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — code stress checking is set up in a later step.',
  THERMAL_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the thermal case is set up in the Load case step.',
  SUSTAINED_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the sustained case is set up in the Load case step.',
  OPERATING_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the operating case is set up in the Load case step.',
  CAPABILITY_REQUIRES_CONDITIONAL_AUTHORIZATION: 'Accept the simplifications listed above to continue. Each one states what it changes in the result.',
});

/** The suggested action for a finding code, or null when none is recorded. */
export function lfeaFindingSuggestedAction(code) {
  const key = String(code ?? '').trim().toUpperCase();
  if (!key) return null;
  return SUGGESTED_ACTION[key] ?? null;
}

export const LFEA_FINDING_SUGGESTED_ACTION_CODES = Object.freeze(Object.keys(SUGGESTED_ACTION));
