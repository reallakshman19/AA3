/**
 * How much geometry discrepancy this application accepts without blocking.
 *
 * Real CAESAR models carry millimetre-scale overlaps and clearances between
 * spans where a support or SIF node was placed with a sign slip or a rounded
 * coordinate -- BM4_L overlaps itself by 1 mm in three places, on 273 mm pipe.
 * Refusing to analyze a model over that is stricter than the engineering
 * warrants, and it stops an engineer reaching results they can act on.
 *
 * 25 mm is the declared allowance, matching the length limit the InputXML
 * backtrack repair already uses to decide what counts as a modelling stub
 * rather than a real run. Anything inside it is still detected, still named,
 * still counted and still shown -- it is dispositioned as something to review
 * rather than something that stops the analysis, and it says the allowance it
 * was accepted under. Anything outside it blocks exactly as before.
 *
 * Applied in metres because canonical geometry is in metres.
 */
export const LFEA_GEOMETRY_ALLOWANCE_MM = 25;
export const LFEA_GEOMETRY_ALLOWANCE_M = LFEA_GEOMETRY_ALLOWANCE_MM / 1000;

/** Proximity options carrying the allowance, for every path that diagnoses one model. */
export function lfeaProximityOptions(overrides = {}) {
  return Object.freeze({
    smallDiscrepancyAllowance: LFEA_GEOMETRY_ALLOWANCE_M,
    ...overrides,
  });
}
