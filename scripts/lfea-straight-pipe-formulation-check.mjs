/*
 * Production straight pipe is Timoshenko, and this is why.
 *
 * Euler-Bernoulli bending stiffness grows as 1/L^3 with no upper bound, so a
 * piping model -- which is full of short elements between fittings and
 * restraints -- assembles enormous stiffness ratios. Timoshenko's 1/(1+phi)
 * factor, with phi proportional to 1/L^2, bounds them.
 *
 * Measured on BM4_L, switching the straight-pipe formulation moved three
 * independent things in the same direction:
 *
 *   condition estimate      3.561e13  ->  4.758e6
 *   algebraic residual      3.426e-05 (WARN)  ->  1.067e-11 (PASS)
 *   force imbalance, W      0.3068 N  ->  4.858e-08 N
 *   CAESAR parity, L2/L5/L6 83.33/81.03/72.94  ->  88.87/83.75/73.93
 *
 * The residual is the load-bearing one: under Euler-Bernoulli it sat 34x over
 * its own declared limit of 1e-6 and the solver was warning about it. This was
 * a real conditioning defect, not a modelling preference.
 *
 * kappa = 0.5 is CAESAR's pipe shear coefficient 2, the same factor the
 * ten-cylinder reducer condensation carries; lfea-reducer-beam-theory-
 * consistency-check.mjs pins the two together.
 */
import assert from 'node:assert';
import {
  inputXmlStiffnessFrameElementProfile,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { TIMOSHENKO_FORMULATION } from '../src/core/linear-fea-frame-element/index.js';

const profile = inputXmlStiffnessFrameElementProfile();

assert.equal(profile.straightPipeFormulation, TIMOSHENKO_FORMULATION,
  'production straight pipe must be Timoshenko; Euler-Bernoulli put the BM4_L solve at a '
  + '3.6e13 condition estimate with the algebraic residual 34x over its declared limit.');
assert.equal(profile.shearDeformation, true,
  'the shear flag is the formulation identity and must agree with it.');

for (const axis of ['Y', 'Z']) {
  const declared = profile[`shearCorrectionFactor${axis}`];
  assert.ok(declared && typeof declared === 'object',
    `shearCorrectionFactor${axis} must be a declared value carrying its source.`);
  assert.equal(declared.value, 0.5,
    `shearCorrectionFactor${axis} must be 0.5 -- CAESAR pipe shear coefficient 2.`);
  assert.ok(typeof declared.source === 'string' && declared.source.length > 0,
    `shearCorrectionFactor${axis} must cite where 0.5 comes from.`);
}

console.log(JSON.stringify({
  check: 'lfea-straight-pipe-formulation',
  status: 'PASS',
  formulation: profile.straightPipeFormulation,
  kappaY: profile.shearCorrectionFactorY.value,
  kappaZ: profile.shearCorrectionFactorZ.value,
  kappaSource: profile.shearCorrectionFactorY.source,
}, null, 2));
