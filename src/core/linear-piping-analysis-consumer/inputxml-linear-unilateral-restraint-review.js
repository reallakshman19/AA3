const SCHEMA = 'inputxml-linear-unilateral-restraint-review/v1';
const TRANSLATIONAL_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const DIRECTION_COMPONENT_TOLERANCE = 1e-12;

/**
 * Review a solved case against what its one-way supports could physically do.
 *
 * A CAESAR "+Y" support can only push the pipe up; a "-Y" only down. This
 * consumer linearizes every restrained DOF as bidirectionally FIXED and
 * discloses that as GENERIC_APPROX_UNILATERAL_LINEARIZED -- but disclosure at
 * pre-flight says only that the approximation was MADE, not whether it ended
 * up mattering. It matters exactly when the solved reaction runs against the
 * direction the support can resist: there the linearized model is holding the
 * pipe with a support that would really have lifted off, and load near it is
 * redistributed onto neighbours that would not really carry it.
 *
 * Measured on the BM4 benchmark against real CAESAR II output, this is the
 * dominant error source: the supports flagged here are precisely the ones
 * CAESAR lifts off and reports zero for, and the reactions around them read
 * high. So this is not a theoretical caveat -- it is the check that says
 * whether a given linear result can be trusted for a given model.
 *
 * Reactions are this repository's own convention: the reaction applied BY the
 * restraint TO the structure.
 *
 * A mixed node may also carry one or more grounded directional springs. The
 * solver deliberately retains those spring actions as separate reaction rows,
 * so the algebraic total at one node/DOF is not the one-way support action by
 * itself. Where such an overlap exists, this review reconstructs the exact
 * directional-spring action from the compiled spring and solved displacement,
 * then subtracts it from the retained total to isolate the one-way support's
 * own constrained reaction. Missing displacement evidence fails closed rather
 * than selecting a reaction row by order.
 */
export function reviewInputXmlLinearUnilateralRestraints(
  structuralPreparation,
  reactions,
  displacements,
) {
  const bindings = (structuralPreparation?.constraintBindings ?? [])
    .filter((binding) => binding.unilateralAction !== null && binding.unilateralAction !== undefined);
  const modelId = structuralPreparation?.modelId ?? null;
  const reactionTotals = sumByNodeDof(reactions);
  const directionalSprings = groundedDirectionalSprings(structuralPreparation);
  const requiredKeys = new Set(bindings.map((binding) => {
    const boundNodeId = `${modelId}.N${binding.sourceNodeId}`;
    return `${boundNodeId}:${binding.unilateralAction.dof}`;
  }));
  const overlapping = directionalSprings.some((constraint) => constraint.direction.some(
    (component, index) => Math.abs(component) > DIRECTION_COMPONENT_TOLERANCE
      && requiredKeys.has(`${constraint.nodeId}:${TRANSLATIONAL_DOFS[index]}`),
  ));
  if (overlapping && !Array.isArray(displacements)) {
    throw reviewError(
      'INPUTXML_UNILATERAL_REVIEW_DISPLACEMENT_REQUIRED',
      'Solved displacement evidence is required to isolate a one-way support reaction from overlapping directional-spring support action.',
    );
  }
  const springActions = overlapping
    ? groundedDirectionalSpringActions(directionalSprings, displacements)
    : new Map();

  const violations = [];
  for (const binding of bindings) {
    const { dof, resistedSign } = binding.unilateralAction;
    const boundNodeId = `${modelId}.N${binding.sourceNodeId}`;
    const key = `${boundNodeId}:${dof}`;
    const total = reactionTotals.get(key);
    if (typeof total !== 'number' || !Number.isFinite(total)) continue;
    const value = total - (springActions.get(key) ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    // Same sign as the support can resist -> the support is doing real work in
    // the only direction it has. Opposite sign -> it is pulling the pipe back,
    // which the real support cannot do.
    if (Math.sign(value) === resistedSign) continue;
    violations.push(Object.freeze({
      nodeId: binding.sourceNodeId,
      dof,
      resistedSign,
      reaction: value,
      sourceFeatureId: binding.sourceFeatureId,
      limitationCodes: binding.limitationCodes,
    }));
  }
  violations.sort((left, right) => Math.abs(right.reaction) - Math.abs(left.reaction));

  return Object.freeze({
    schema: SCHEMA,
    unilateralRestraintCount: bindings.length,
    violations: Object.freeze(violations),
    worstReaction: violations.length === 0 ? 0 : violations[0].reaction,
    status: violations.length === 0 ? 'CONSISTENT' : 'LINEARIZATION_EXCEEDED',
  });
}

function sumByNodeDof(rows) {
  const byKey = new Map();
  for (const row of rows ?? []) {
    const key = `${row.nodeId}:${row.dof}`;
    byKey.set(key, (byKey.get(key) ?? 0) + row.value);
  }
  return byKey;
}

function groundedDirectionalSprings(structuralPreparation) {
  return (structuralPreparation?.compilation?.model?.constraints ?? []).filter(
    (constraint) => constraint.behavior === 'LINEAR_SPRING'
      && !constraint.connectedNodeId
      && Array.isArray(constraint.direction),
  );
}

function groundedDirectionalSpringActions(constraints, displacements) {
  const displacementByKey = sumByNodeDof(displacements);
  const actions = new Map();
  for (const constraint of constraints) {
    const u = TRANSLATIONAL_DOFS.map((dof) => displacementByKey.get(`${constraint.nodeId}:${dof}`));
    if (u.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw reviewError(
        'INPUTXML_UNILATERAL_REVIEW_DISPLACEMENT_REQUIRED',
        `Solved translational displacement evidence is incomplete for directional spring ${constraint.constraintId}.`,
      );
    }
    const q = constraint.direction.reduce(
      (sum, component, index) => sum + component * u[index],
      0,
    );
    constraint.direction.forEach((component, index) => {
      const key = `${constraint.nodeId}:${TRANSLATIONAL_DOFS[index]}`;
      const action = -constraint.stiffness * q * component;
      actions.set(key, (actions.get(key) ?? 0) + action);
    });
  }
  return actions;
}

function reviewError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'INPUTXML_UNILATERAL_RESTRAINT_REVIEW';
  return error;
}

/** One sentence an engineer can act on, or null when there is nothing to say. */
export function unilateralRestraintReviewSummary(review) {
  if (review.violations.length === 0) return null;
  const nodes = review.violations.map((row) => row.nodeId).join(', ');
  const worst = Math.abs(review.worstReaction);
  return `${review.violations.length} of ${review.unilateralRestraintCount} one-way supports are carrying load in the direction they cannot resist (${nodes}). `
    + `The largest is ${worst.toFixed(0)} N at node ${review.violations[0].nodeId}. `
    + 'A real support of this type would lift off instead, so reactions and deflections near these nodes read high. '
    + 'Treat them as an upper bound, not a prediction.';
}

export const INPUTXML_LINEAR_UNILATERAL_RESTRAINT_REVIEW_SCHEMA = SCHEMA;
