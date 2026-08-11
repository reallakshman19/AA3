import {
  CAESAR_STIFFNESS_FRICTION_STATES as STATES,
  GOVERNED_FRICTION_ITERATION_STATUS as STATUS,
  runGovernedFrictionIteration,
} from '../src/core/nonlinear-restraint-friction/index.js';

const baseSite = {
  siteId: 'S1',
  normalUnit: [0, 1, 0],
  coefficientOfFriction: 0.3,
  frictionMultiplier: 1,
  frictionStiffness: 1000,
  slideMultiplier: 1,
};

const stick = runGovernedFrictionIteration({
  maxIterations: 3,
  sites: [baseSite],
  solveIteration: () => solved([siteResponse('S1', 10, [0.002, 0, 0])]),
});
assert(stick.status === STATUS.CALCULATED, 'stick fixture must calculate');
assert(stick.iterationCount === 1, 'stick fixture should converge in one iteration');
assert(stick.finalSites[0].state === STATES.STICK, 'stick final state mismatch');

const transitionRequests = [];
const transition = runGovernedFrictionIteration({
  maxIterations: 4,
  sites: [baseSite],
  solveIteration: (request) => {
    transitionRequests.push(request);
    return solved([siteResponse('S1', 10, [0.004, 0, 0])]);
  },
});
assert(transition.status === STATUS.CALCULATED, 'transition fixture must calculate');
assert(transition.iterationCount === 2, 'stick->slide must require a following iteration');
assert(transition.history[0].stateChanged, 'first transition iteration must change state');
assert(!transition.history[0].converged, 'state-changing iteration cannot converge');
assert(transitionRequests[0].states[0].state === STATES.STICK, 'iteration 1 state');
assert(transitionRequests[1].states[0].state === STATES.SLIDING, 'iteration 2 state');
assert(transition.finalSites[0].state === STATES.SLIDING, 'final sliding state');

let controlIteration = 0;
const controlGate = runGovernedFrictionIteration({
  maxIterations: 3,
  sites: [{ ...baseSite, coefficientOfFriction: 0 }],
  solveIteration: () => {
    controlIteration += 1;
    return solved([siteResponse('S1', 10, [9, 0, 0])], {
      caesarFrictionControlsConverged: controlIteration >= 2,
    });
  },
});
assert(controlGate.iterationCount === 2, 'external CAESAR control gate must delay commit');
assert(controlGate.history[0].equilibriumConverged && !controlGate.history[0].caesarFrictionControlsConverged, 'control gate trace');

const nonconvergent = runGovernedFrictionIteration({
  maxIterations: 2,
  sites: [{ ...baseSite, coefficientOfFriction: 0 }],
  solveIteration: () => solved([siteResponse('S1', 10, [0, 0, 0])], { equilibriumConverged: false }),
});
assert(nonconvergent.status === STATUS.BLOCKED_NONCONVERGENT, 'nonconvergence must block');
assert(nonconvergent.finalSites.length === 0, 'nonconvergence must publish no partial final sites');
assert(nonconvergent.history.length === 2, 'nonconvergence trace length');

const ordered = runGovernedFrictionIteration({
  maxIterations: 1,
  sites: [
    { ...baseSite, siteId: 'B', coefficientOfFriction: 0 },
    { ...baseSite, siteId: 'A', coefficientOfFriction: 0 },
  ],
  solveIteration: (request) => solved(request.states.map((row) => siteResponse(row.siteId, 1, [0, 0, 0]))),
});
assert(ordered.finalSites.map((row) => row.siteId).join(',') === 'A,B', 'site ordering must be deterministic');

expectThrow(() => runGovernedFrictionIteration({
  maxIterations: 1,
  sites: [{ ...baseSite, slideMultiplier: undefined }],
  solveIteration: () => solved([siteResponse('S1', 10, [0.001, 0, 0])]),
}), 'positive friction without slide multiplier must fail closed');

expectThrow(() => runGovernedFrictionIteration({
  maxIterations: 1,
  sites: [baseSite],
  solveIteration: () => solved([]),
}), 'omitted solved site must fail closed');

expectThrow(() => runGovernedFrictionIteration({
  maxIterations: 1,
  sites: [baseSite, baseSite],
  solveIteration: () => solved([siteResponse('S1', 1, [0, 0, 0])]),
}), 'duplicate site IDs must fail closed');

console.log(JSON.stringify({
  check: 'm047-governed-friction-iteration-controller',
  status: 'PASS',
  verified: [
    'DETERMINISTIC_SITE_ORDER',
    'STICK_ONE_ITERATION_COMMIT',
    'STICK_TO_SLIDE_REQUIRES_NEXT_ITERATION',
    'EXTERNAL_CAESAR_CONTROL_GATE_REQUIRED',
    'NONCONVERGENCE_PUBLISHES_NO_PARTIAL_FINAL_STATE',
    'MISSING_SLIDE_AUTHORITY_FAILS_CLOSED',
    'INCOMPLETE_SITE_RESPONSE_FAILS_CLOSED',
  ],
  caesarAngleControlImplementedHere: false,
  caesarNormalForceControlImplementedHere: false,
  bm4lIntegrated: false,
  bm4lProductionFrictionAuthorized: false,
}, null, 2));

function solved(siteResponses, overrides = {}) {
  return {
    equilibriumConverged: overrides.equilibriumConverged ?? true,
    caesarFrictionControlsConverged: overrides.caesarFrictionControlsConverged ?? true,
    siteResponses,
  };
}

function siteResponse(siteId, normalForce, relativeDisplacement) {
  return { siteId, contactActive: true, normalForce, relativeDisplacement };
}

function expectThrow(callback, label) {
  let threw = false;
  try { callback(); } catch { threw = true; }
  assert(threw, label);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
