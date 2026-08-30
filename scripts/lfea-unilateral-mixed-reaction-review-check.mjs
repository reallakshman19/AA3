import assert from 'node:assert/strict';
import {
  reviewInputXmlLinearUnilateralRestraints,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-unilateral-restraint-review.js';

const deliberateBreak = process.argv.includes('--deliberate-break');
const MODEL_ID = 'MIXED';
const NODE_ID = `${MODEL_ID}.N40`;
const K = 1000;
const N = Object.freeze([0.6, 0.8, 0]);
const displacements = Object.freeze([
  { nodeId: NODE_ID, dof: 'UX', value: 0 },
  { nodeId: NODE_ID, dof: 'UY', value: 0.01 },
  { nodeId: NODE_ID, dof: 'UZ', value: 0 },
]);
const q = N[1] * 0.01;
const springUx = -K * q * N[0];

function preparation(withSpring = true) {
  return {
    modelId: MODEL_ID,
    constraintBindings: [{
      sourceNodeId: '40',
      sourceFeatureId: 'ONE-WAY-X-40',
      unilateralAction: { dof: 'UX', resistedSign: 1 },
      limitationCodes: ['GENERIC_APPROX_UNILATERAL_LINEARIZED'],
    }],
    compilation: {
      model: {
        constraints: withSpring ? [{
          constraintId: 'SKEW-40',
          nodeId: NODE_ID,
          dof: null,
          behavior: 'LINEAR_SPRING',
          basis: 'GLOBAL',
          stiffness: K,
          direction: N,
        }] : [],
      },
    },
  };
}

function mixedRows(unilateralReaction) {
  return [
    { nodeId: NODE_ID, dof: 'UX', value: unilateralReaction },
    { nodeId: NODE_ID, dof: 'UX', value: springUx },
  ];
}

const consistent = reviewInputXmlLinearUnilateralRestraints(
  preparation(),
  mixedRows(10),
  displacements,
);
assert.equal(consistent.status, deliberateBreak ? 'LINEARIZATION_EXCEEDED' : 'CONSISTENT',
  'an overlapping spring row must not reverse the one-way support verdict');
assert.deepEqual(consistent.violations, []);

const exceeded = reviewInputXmlLinearUnilateralRestraints(
  preparation(),
  mixedRows(-10),
  displacements,
);
assert.equal(exceeded.status, 'LINEARIZATION_EXCEEDED');
assert.equal(exceeded.violations.length, 1);
assert.equal(exceeded.violations[0].nodeId, '40');
assert.equal(exceeded.violations[0].dof, 'UX');
assert.equal(exceeded.violations[0].reaction, -10,
  'review must recover the one-way support action, not the total or spring contribution');

assert.throws(
  () => reviewInputXmlLinearUnilateralRestraints(preparation(), mixedRows(10)),
  (error) => error?.code === 'INPUTXML_UNILATERAL_REVIEW_DISPLACEMENT_REQUIRED',
  'mixed one-way + directional support review must fail closed without displacement evidence',
);

const ordinary = reviewInputXmlLinearUnilateralRestraints(
  preparation(false),
  [{ nodeId: NODE_ID, dof: 'UX', value: 10 }],
);
assert.equal(ordinary.status, 'CONSISTENT',
  'ordinary unilateral-only review must preserve the existing two-argument path');

console.log(JSON.stringify({
  check: 'lfea-unilateral-mixed-reaction-review',
  status: 'PASS',
  projectedSpringUxReaction: springUx,
  consistentUnilateralReaction: 10,
  exceededUnilateralReaction: exceeded.violations[0].reaction,
  missingDisplacementFailsClosed: true,
  ordinaryTwoArgumentPathPreserved: true,
  authority: 'Review custody only; solver reactions and spring mechanics are unchanged.',
}, null, 2));
