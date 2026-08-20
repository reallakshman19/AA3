#!/usr/bin/env node

/**
 * Guards the relationship between the solver's residual gate and its
 * conditioning gate, which were mutually unsatisfiable before this.
 *
 * The normalized residual gate measures ||K u - f|| / ||f||. For a
 * backward-stable direct solve that quantity is bounded by
 *
 *     ||r|| / ||f||  <=  c * eps * kappa(K)
 *
 * so it reports the PROBLEM's conditioning at least as much as the solver's
 * work. A profile that permits conditioning up to 1e14 (conditionWarning,
 * from this project's M027 BM2 study) is therefore permitting residuals up to
 * roughly 1e14 * 2.2e-16 = 2.2e-2. Demanding 1e-9 from that same profile was
 * asking double precision for something it cannot deliver, and the failure
 * was reported as though the solver had broken.
 *
 * Measured on the real BM4_L.ACCDB, through the real pipeline:
 *
 *     normwise backward error   1.19e-17   (0.054 x machine epsilon)
 *     normalized residual       2.03e-5
 *     implied condition number  1.7e12     (residual / backward error)
 *     element length ratio      1.25e4     (0.52 mm stub beside a 6.6 m run)
 *
 * 1.25e4 cubed is 2e12 -- bending stiffness goes as 1/L^3, so the conditioning
 * is exactly what that length ratio predicts, and it is ordinary for piping:
 * short elements exist because supports and fittings are placed on them (node
 * 22370 in BM4_L carries a support). The solve was exact to better than one
 * machine epsilon; only its accuracy was limited, to about five significant
 * figures, which is far beyond what pipe stress requires.
 *
 * If a future change tightens these limits again, this check fails and points
 * back here rather than letting real models block on arithmetic that cannot
 * be satisfied.
 */
import assert from 'node:assert/strict';
import { inputXmlStiffnessSolverProfile } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { resolveSolverPolicies } from '../src/core/linear-fea-solver/solver-contract.js';

const EPSILON = Number.EPSILON;

// Measured on BM4_L.ACCDB through the pipeline; see the header.
const BM4_NORMALIZED_RESIDUAL = 2.03e-5;
const BM4_BACKWARD_ERROR = 1.19e-17;
const BM4_IMPLIED_CONDITION = BM4_NORMALIZED_RESIDUAL / BM4_BACKWARD_ERROR;

const policies = resolveSolverPolicies(inputXmlStiffnessSolverProfile());

// The limits must come from a study of real models, not from an unattributed
// default -- that is how the 1e-9 got there in the first place.
assert.match(
  policies.normalizedResidualLimit.source,
  /CONDITIONING-STUDY/u,
  'The residual pass limit must cite the conditioning study it came from.',
);
assert.match(
  policies.normalizedResidualWarnLimit.source,
  /CONDITIONING-STUDY/u,
  'The residual warn limit must cite the conditioning study it came from.',
);

// A model at BM4's conditioning must land in the disclosed band, not be
// blocked: its solve is exact to better than one epsilon.
assert.ok(
  BM4_NORMALIZED_RESIDUAL > policies.normalizedResidualLimit.value,
  'BM4 is expected to exceed the pass limit -- it is conditioning-limited, and pretending otherwise would hide that.',
);
assert.ok(
  BM4_NORMALIZED_RESIDUAL <= policies.normalizedResidualWarnLimit.value,
  `A solve whose backward error is ${BM4_BACKWARD_ERROR} (${(BM4_BACKWARD_ERROR / EPSILON).toFixed(3)} x machine epsilon) must not be reported as a solver failure. `
  + `Residual ${BM4_NORMALIZED_RESIDUAL} exceeds the warn limit ${policies.normalizedResidualWarnLimit.value}.`,
);

// The backward error is what says the solver did its job, and it is at
// machine precision -- the residual is conditioning, not error.
assert.ok(
  BM4_BACKWARD_ERROR < EPSILON,
  'The recorded backward error must be at or below machine epsilon; a larger one would mean the solver, not the model, was at fault.',
);
assert.ok(
  BM4_IMPLIED_CONDITION > 1e11 && BM4_IMPLIED_CONDITION < 1e14,
  `Implied condition number ${BM4_IMPLIED_CONDITION.toExponential(2)} should sit near the cube of BM4's element length ratio.`,
);

// The two gates in one profile must be able to hold at once: a profile that
// accepts conditioning up to kappa cannot also demand a residual far below
// what kappa forces. The residual warn limit is checked against a modest
// fraction of that bound rather than the worst case, because the bound is an
// upper limit and real solves sit well inside it.
const conditioningResidualFloor = policies.conditionWarning.value * EPSILON;
assert.ok(
  policies.normalizedResidualWarnLimit.value >= conditioningResidualFloor * 1e-3,
  `The profile accepts conditioning up to ${policies.conditionWarning.value.toExponential(0)}, which forces residuals near `
  + `${conditioningResidualFloor.toExponential(2)}; a warn limit of ${policies.normalizedResidualWarnLimit.value.toExponential(2)} `
  + 'cannot be met by any model at that conditioning.',
);

// The ordering the solver contract itself relies on.
assert.ok(policies.normalizedResidualLimit.value <= policies.normalizedResidualWarnLimit.value);
assert.ok(policies.conditionWarning.value <= policies.conditionBlock.value);

console.log(JSON.stringify({
  check: 'lfea-solver-residual-conditioning',
  status: 'PASS',
  residualPassLimit: policies.normalizedResidualLimit.value,
  residualWarnLimit: policies.normalizedResidualWarnLimit.value,
  limitSource: policies.normalizedResidualLimit.source,
  bm4NormalizedResidual: BM4_NORMALIZED_RESIDUAL,
  bm4BackwardErrorOverEpsilon: Number((BM4_BACKWARD_ERROR / EPSILON).toFixed(4)),
  bm4ImpliedCondition: Number(BM4_IMPLIED_CONDITION.toPrecision(3)),
}));
