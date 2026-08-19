const SCHEMA = 'inputxml-linear-unilateral-restraint-review/v1';

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
 */
export function reviewInputXmlLinearUnilateralRestraints(structuralPreparation, reactions) {
  const bindings = (structuralPreparation?.constraintBindings ?? [])
    .filter((binding) => binding.unilateralAction !== null && binding.unilateralAction !== undefined);
  const modelId = structuralPreparation?.modelId ?? null;
  const byKey = new Map();
  for (const row of reactions ?? []) {
    byKey.set(`${row.nodeId}:${row.dof}`, row.value);
  }

  const violations = [];
  for (const binding of bindings) {
    const { dof, resistedSign } = binding.unilateralAction;
    const boundNodeId = `${modelId}.N${binding.sourceNodeId}`;
    const value = byKey.get(`${boundNodeId}:${dof}`);
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) continue;
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
