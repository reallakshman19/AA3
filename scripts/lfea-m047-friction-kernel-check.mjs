import {
  CAESAR_STIFFNESS_FRICTION_STATES as STATES,
  evaluateCaesarStiffnessFriction,
} from '../src/core/nonlinear-restraint-friction/index.js';

const base = {
  contactActive: true,
  normalUnit: [0, 1, 0],
  normalForce: 10,
  coefficientOfFriction: 0.3,
  frictionMultiplier: 1,
  frictionStiffness: 1000,
  slideMultiplier: 1,
};

const stick = evaluateCaesarStiffnessFriction({
  ...base,
  relativeDisplacement: [0.002, 0, 0],
});
assert(stick.state === STATES.STICK && stick.nextState === STATES.STICK, 'below-limit state must stick');
nearVector(stick.resistingForce, [-2, 0, 0], 1e-12, 'stick resisting force');
near(stick.coulombLimit, 3, 1e-12, 'stick Coulomb limit');
near(stick.tangentStiffness[0][0], 1000, 1e-12, 'tangent stiffness x');
near(stick.tangentStiffness[1][1], 0, 1e-12, 'normal tangent stiffness must be zero');

const transition = evaluateCaesarStiffnessFriction({
  ...base,
  relativeDisplacement: [0.004, 0, 0],
});
assert(transition.state === STATES.STICK, 'limit is detected on the current stiffness iteration');
assert(transition.nextState === STATES.SLIDING && transition.stateChanged, 'limit must switch next iteration to sliding');
assert(transition.limitExceeded, 'transition must record exceeded limit');
nearVector(transition.resistingForce, [-4, 0, 0], 1e-12, 'transition remains stiffness trial force');

const sliding = evaluateCaesarStiffnessFriction({
  ...base,
  currentState: STATES.SLIDING,
  relativeDisplacement: [0.004, 0, 0],
});
nearVector(sliding.resistingForce, [-3, 0, 0], 1e-12, 'sliding force');
near(sliding.constantForceMagnitude, 3, 1e-12, 'sliding force magnitude');
assert(sliding.tangentStiffness.flat().every((value) => value === 0), 'sliding tangent stiffness must be removed');

const scaledSliding = evaluateCaesarStiffnessFriction({
  ...base,
  slideMultiplier: 0.95,
  currentState: STATES.SLIDING,
  relativeDisplacement: [0.004, 0, 0],
});
near(scaledSliding.constantForceMagnitude, 2.85, 1e-12, 'explicit slide multiplier');

const oblique = evaluateCaesarStiffnessFriction({
  ...base,
  normalUnit: [0, 0, 2],
  normalForce: 100,
  relativeDisplacement: [0.001, 0.001, 0.4],
});
nearVector(oblique.tangentialDisplacement, [0.001, 0.001, 0], 1e-12, 'tangent projection');
near(dot(oblique.resistingForce, oblique.normalUnit), 0, 1e-12, 'friction force normal component');
assert(dot(oblique.resistingForce, oblique.tangentialDisplacement) <= 0, 'friction must oppose tangential motion');

const zeroMu = evaluateCaesarStiffnessFriction({
  ...base,
  coefficientOfFriction: 0,
  slideMultiplier: undefined,
  relativeDisplacement: [999, 2, -4],
});
assert(zeroMu.state === STATES.DISABLED, 'zero mu must disable friction');
nearVector(zeroMu.resistingForce, [0, 0, 0], 0, 'zero-mu force identity');
assert(zeroMu.tangentStiffness.flat().every((value) => value === 0), 'zero mu tangent must be zero');

const zeroMultiplier = evaluateCaesarStiffnessFriction({
  ...base,
  frictionMultiplier: 0,
  slideMultiplier: undefined,
  relativeDisplacement: [2, 3, 4],
});
nearVector(zeroMultiplier.resistingForce, [0, 0, 0], 0, 'zero friction-multiplier identity');

const open = evaluateCaesarStiffnessFriction({
  ...base,
  contactActive: false,
  slideMultiplier: undefined,
  relativeDisplacement: [2, 0, 0],
});
assert(open.state === STATES.OPEN, 'inactive contact must be OPEN');
nearVector(open.resistingForce, [0, 0, 0], 0, 'open contact force');

const zeroNormal = evaluateCaesarStiffnessFriction({
  ...base,
  normalForce: 0,
  slideMultiplier: undefined,
  relativeDisplacement: [2, 0, 0],
});
nearVector(zeroNormal.resistingForce, [0, 0, 0], 0, 'zero normal force identity');

const carriedDirection = evaluateCaesarStiffnessFriction({
  ...base,
  currentState: STATES.SLIDING,
  relativeDisplacement: [0, 0, 0],
  slidingDirection: [2, 0, 0],
});
nearVector(carriedDirection.resistingForce, [-3, 0, 0], 1e-12, 'carried sliding direction');

expectThrow(() => evaluateCaesarStiffnessFriction({
  ...base,
  slideMultiplier: undefined,
  relativeDisplacement: [0.001, 0, 0],
}), 'positive friction must require explicit slide multiplier');

expectThrow(() => evaluateCaesarStiffnessFriction({
  ...base,
  normalForce: -1,
  relativeDisplacement: [0.001, 0, 0],
}), 'negative normal force must fail closed');

expectThrow(() => evaluateCaesarStiffnessFriction({
  ...base,
  currentState: STATES.SLIDING,
  relativeDisplacement: [0, 0, 0],
}), 'zero-motion sliding state requires a retained direction');

const rotated = evaluateCaesarStiffnessFriction({
  ...base,
  normalUnit: [1, 0, 0],
  relativeDisplacement: [0, 0.002, 0],
});
nearVector(rotated.resistingForce, [0, -2, 0], 1e-12, 'rotated equivalent stick response');
near(rotated.trialFrictionMagnitude, stick.trialFrictionMagnitude, 1e-12, 'rotational magnitude invariance');

console.log(JSON.stringify({
  check: 'm047-generic-caesar-stiffness-friction-kernel',
  status: 'PASS',
  states: STATES,
  verified: [
    'NONSLIDING_STIFFNESS_RESPONSE',
    'LIMIT_SWITCHES_ON_NEXT_ITERATION',
    'SLIDING_CONSTANT_OPPOSING_FORCE',
    'EXPLICIT_SLIDE_MULTIPLIER',
    'TANGENT_PLANE_PROJECTION',
    'ZERO_FRICTION_EXACT_IDENTITY',
    'OPEN_CONTACT_ZERO_FRICTION',
    'ZERO_NORMAL_FORCE_ZERO_FRICTION',
    'ROTATIONAL_INVARIANCE',
    'MISSING_AUTHORITY_FAILS_CLOSED',
  ],
  bm4lIntegrated: false,
  bm4lProductionFrictionAuthorized: false,
}, null, 2));

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function near(actual, expected, tolerance, label) {
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
}

function nearVector(actual, expected, tolerance, label) {
  assert(actual.length === expected.length, `${label}: vector length mismatch`);
  for (let index = 0; index < actual.length; index += 1) {
    near(actual[index], expected[index], tolerance, `${label}[${index}]`);
  }
}

function expectThrow(callback, label) {
  let threw = false;
  try {
    callback();
  } catch {
    threw = true;
  }
  assert(threw, label);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
