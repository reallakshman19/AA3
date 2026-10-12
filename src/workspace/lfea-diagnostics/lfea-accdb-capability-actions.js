/**
 * ACCDB model-finding next-action classification. Display-only; never changes
 * governed disposition or widens the source write authority.
 */
export const LFEA_ACCDB_ACTION_CLASSES = Object.freeze({
  EDITABLE_INPUT: 'EDITABLE_INPUT',
  GOVERNED_CHOICE: 'GOVERNED_CHOICE',
  WORKFLOW_PREREQUISITE: 'WORKFLOW_PREREQUISITE',
  UNSUPPORTED_MECHANICS: 'UNSUPPORTED_MECHANICS',
  EXTERNAL_SOURCE_CORRECTION: 'EXTERNAL_SOURCE_CORRECTION',
  INFORMATION: 'INFORMATION',
});

export function classifyLfeaAccdbFindingAction(code) {
  const token = String(code ?? '');
  let actionClass = 'INFORMATION';
  let action = 'Inspect the affected source objects and raw evidence; no change is implied by review.';
  let nextStep = null;
  if (/^TOPOLOGY_|^INPUTXML_SOURCE_GEOMETRY_INVALID$/u.test(token)) {
    actionClass = 'EDITABLE_INPUT';
    action = 'Inspect exact nodes and spans. A source-node coordinate may be corrected with preview and explicit Apply; no automatic merge, split or overlap deletion is supported.';
  } else if (/^(BEND|BRANCH)_FACTOR_EDITION_AUTHORITY_UNRESOLVED$/u.test(token)) {
    actionClass = 'GOVERNED_CHOICE';
    action = 'Choose an existing B31/B31J edition and component policy in the governed authority control. This is a basis decision, not a geometry repair.';
  } else if (/_PREPARATION_REQUIRED$/u.test(token) && !/^CODE_STRESS_/u.test(token)) {
    actionClass = 'WORKFLOW_PREREQUISITE';
    action = 'Input evidence is recorded here; select the intended case at Load case, then analyze it at Run. This note is not an input defect.';
    nextStep = 'LOAD_CASE';
  } else if (/^CODE_STRESS_.*_PREPARATION_REQUIRED$/u.test(token)) {
    actionClass = 'WORKFLOW_PREREQUISITE';
    action = 'Code stress assessment has not been performed. No available step in this preparation proves B31.3 compliance; use an authorized assessment path.';
  } else if (/FRICTION|_GAP_|UNILATERAL|PRESSURE_STRUCTURAL_EFFECTS|TEE_EXACT_MECHANICS|REDUCER_EXACT_MECHANICS|BEND_EXACT_MECHANICS|SIF_TYPE_UNSUPPORTED|SIF_TYPE_UNCLASSIFIED|COMPONENT_TYPE_UNSUPPORTED|FORCES_MOMENTS_PRESENT_NOT_COMPILED|RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED|RESTRAINT_CONNECTING_NODE_UNSUPPORTED/iu.test(token)) {
    actionClass = 'UNSUPPORTED_MECHANICS';
    action = /PRESSURE_STRUCTURAL_EFFECTS/u.test(token)
      ? 'Raw PRESSURE1 input is editable where declared, but pressure stiffening, end thrust and Bourdon mechanics are not supplied. Changing pressure does not add those mechanics.'
      : /FRICTION|_GAP_|UNILATERAL/iu.test(token)
        ? 'The declared support condition is retained but this solver does not provide exact nonlinear contact/friction. Do not treat acknowledgment or a coordinate edit as a support mechanics repair.'
        : /FORCES_MOMENTS/iu.test(token)
          ? 'Declared source force/moment rows are retained but this pipeline has no supported in-app transaction to compile them as loads. Do not claim they were applied.'
          : 'The imported feature is retained with a disclosed limitation. This workspace cannot implement exact bend, tee, reducer, SIF or connected-support mechanics; review the available governed solver profile and external source authority.';
  } else if (/^MODEL_OPERATING_TEMPERATURE_NOT_DECLARED$|^ACCDB_.*(?:TYPE_UNMAPPED|NODE_UNRESOLVED|OFFSET_NOT_SUPPORTED)|^MODEL_RESTRAINT_TARGET_DUPLICATE$|^TOPOLOGY_MODEL_EMPTY$/u.test(token)) {
    actionClass = 'EXTERNAL_SOURCE_CORRECTION';
    action = 'The required structural/support source edit is outside the current ACCDB workspace whitelist. Correct it in the source authority and re-import; never infer a replacement restraint or node.';
  } else if (/^(MODEL_FEATURE_LIMITATION|CAPABILITY_REQUIRES_CONDITIONAL_AUTHORIZATION)$/u.test(token)) {
    actionClass = 'GOVERNED_CHOICE';
    action = 'Review the exact current-preparation limitation; explicit accepted authority is separate from editing the source.';
  } else if (/^(ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER|.*_INHERITED_FROM_PRIOR_ELEMENT)$/u.test(token)) {
    actionClass = 'EDITABLE_INPUT';
    action = 'Verify the inherited or overridden source property. Use the existing whitelisted raw-element field editor when an actual input value needs correction.';
  }
  return Object.freeze({ code: token, actionClass, action, nextStep });
}
