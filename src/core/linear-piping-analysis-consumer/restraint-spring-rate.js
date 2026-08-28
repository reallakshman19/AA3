/**
 * Resolving a declared spring rate into solver units.
 *
 * CAESAR declares restraint stiffness in the model's own force-per-length --
 * N/mm, lb/in -- while the solver works in N/m. The InputXML adapter converts
 * forces and lengths through separate paths, and stiffness is the quotient of
 * the two, so it belonged to neither and originally got neither: a rate given
 * in N/mm reached the solver as N/m, wrong by a factor of 1000 in the direction
 * of a support far softer than the engineer asked for.
 *
 * That failure is invisible in results. The model still solves, still balances,
 * and still reports a reaction consistent with its own (wrong) rate. Only the
 * conversion says otherwise, which is why it lives in one named place.
 */
const LENGTH_SCALES = Object.freeze({ m: 1, mm: 1e-3, cm: 1e-2, in: 0.0254, ft: 0.3048 });

/**
 * Force-per-length to N/m, or null when the file's units cannot resolve it.
 *
 * classifyRestraint() takes this factor as a required argument rather than
 * defaulting it, so a caller that forgets it fails loudly.
 */
export function springRateToSiFactor(forceDeclaration, lengthUnit) {
  if (!forceDeclaration || !Number.isFinite(forceDeclaration.scale)) return null;
  const lengthScale = LENGTH_SCALES[lengthUnit];
  if (!lengthScale) return null;
  return forceDeclaration.scale / lengthScale;
}

/**
 * The declared rate, the converted rate, and whether the conversion was
 * possible -- kept as three separate facts on purpose.
 *
 * A model whose units cannot be resolved must NOT fall back to treating the
 * declared number as already-SI. The declared value is still retained as
 * evidence; only the usable one is withheld, so the restraint refuses rather
 * than silently standing in for a support up to three orders of magnitude off.
 */
export function resolveSpringRate(declared, toSiFactor) {
  const positive = Number.isFinite(declared) && declared > 0;
  const resolvable = Number.isFinite(toSiFactor);
  return {
    stiffnessDeclared: positive ? Number(declared) : null,
    stiffnessValue: positive && resolvable ? Number(declared) * toSiFactor : null,
    stiffnessUnitsResolvable: resolvable,
  };
}
