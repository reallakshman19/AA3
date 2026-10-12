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

  // --- Governed limitations: no statement here qualifies an engineering use or grants acceptance ---
  MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE: 'Exact bend mechanics are unavailable for this declared feature/profile. Review the retained source bend and the current governed capability finding; obtain a qualified bend-mechanics analysis where the requested use requires it. No direction or magnitude of error is established here.',
  MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE: 'Exact tee/branch mechanics are unavailable in this preparation. Inspect the source junction and the current capability/profile limitation; use a separately qualified method when tee response is required. This note does not establish suitability or approve the simplification.',
  MODEL_REDUCER_EXACT_MECHANICS_UNAVAILABLE: 'Exact tapered-reducer mechanics are not provided by the active capability profile. Identify the source reducer and review its disclosed approximation; qualified tapered stiffness, weight and pressure response are separate engineering authorities. Do not infer acceptability from this UI.',
  MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED: 'Declared pressure inputs do not establish pressure stiffening, end thrust or Bourdon response in this solver profile. A supported PRESSURE1 raw-field correction changes input only. Review the actual case and use a qualified structural-pressure analysis if these effects are required; code-stress assessment is not performed here.',
  MODEL_RESTRAINT_FRICTION_UNSUPPORTED: 'Nonlinear support friction is not represented by this linear preparation. Inspect the declared source support and its governed limitation; no direction or bound on movements or reactions is qualified. Source-coordinate edits do not implement friction.',
  ACCDB_RESTRAINT_FRICTION_NOT_MODELED: 'ACCDB support friction is retained as source evidence but not compiled as exact contact/friction mechanics. Inspect the actual support and choose a qualified analysis route where this behavior matters; reviewing this note does not repair or qualify it.',
  MODEL_RESTRAINT_GAP_UNSUPPORTED: 'Gap/contact activation is not solved by the current linear support model. Inspect the source restraint and governed approximation; do not infer the sign or size of resulting load/displacement error.',
  ACCDB_RESTRAINT_GAP_NOT_MODELED: 'The declared ACCDB support gap is not implemented as nonlinear contact activation here. Inspect the source restraint and current capability finding; no supported in-workspace edit supplies exact gap mechanics.',
  MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED: 'One-way support/contact conditions require the governed active-set capability. Inspect lift-off disclosures and source restraint sense; a compressive linear reaction alone does not qualify exact unilateral behavior or engineering suitability.',
  MODEL_SIF_TYPE_UNSUPPORTED: 'The declared fitting/SIF type is not qualified for the requested code assessment. Verify the source fitting and use a separately authorized code-stress path; this linear Output does not perform code compliance.',
  ACCDB_SIF_TYPE_UNCLASSIFIED: 'The ACCDB source fitting/SIF type remains unclassified for code assessment. Verify it using source authority; this finding alone neither establishes run readiness nor qualifies code-stress compliance.',
  MODEL_FEATURE_LIMITATION: 'Inspect the source feature, the exact retained capability/disposition and the current requested profile. Only the existing governed approval process can record a decision; no engineering suitability is asserted by this suggestion.',
  ACCDB_RESTRAINT_NODE_UNRESOLVED: 'This support is attached to a node no pipe uses, so it holds nothing. Check the node number in the source model.',

  // --- Notes: nothing to do ---
  ACCDB_BEND_ARC_GEOMETRY_RESOLVED: 'Nothing to do — the bend geometry was read successfully from the file.',
  ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER: 'Nothing to do — this records a value you changed by hand.',
  ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED: 'ACCDB force/moment records are retained but not compiled into active linear load cases through this source path. The Load case step does not automatically restore those source loads; use a separately supported governed load-authoring route or report the missing capability.',
  ALGEBRAIC_RESIDUAL_NORMALIZED: 'Nothing to do — the solve is far more precise than pipe stress work requires.',

  // --- Stages performed elsewhere in the workflow ---
  CODE_STRESS_PROFILE_PREPARATION_REQUIRED: 'Code-stress evaluation is NOT_PERFORMED in this linear workflow. The input inventory is not a compliance assessment; a separately qualified code-stress process is required.',
  THERMAL_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the thermal case is set up in the Load case step.',
  SUSTAINED_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the sustained case is set up in the Load case step.',
  OPERATING_PROFILE_PREPARATION_REQUIRED: 'Nothing to do here — the operating case is set up in the Load case step.',
  CAPABILITY_REQUIRES_CONDITIONAL_AUTHORIZATION: 'Review every current-preparation conditional limitation and its disclosed capability effects before making an explicit engineering decision. Neither this note nor opening a finding automatically authorizes the run.',
});

/** The suggested action for a finding code, or null when none is recorded. */
export function lfeaFindingSuggestedAction(code) {
  const key = String(code ?? '').trim().toUpperCase();
  if (!key) return null;
  return SUGGESTED_ACTION[key] ?? null;
}

export const LFEA_FINDING_SUGGESTED_ACTION_CODES = Object.freeze(Object.keys(SUGGESTED_ACTION));
