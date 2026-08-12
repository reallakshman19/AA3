const EPS = 1e-12;
const STATES = Object.freeze({
  OPEN: 'OPEN',
  STICK: 'STICK',
  SLIDING: 'SLIDING',
  DISABLED: 'DISABLED',
});

export const CAESAR_STIFFNESS_FRICTION_STATES = STATES;

/**
 * Evaluate one translational friction site's CAESAR-style stiffness-method state.
 *
 * This is a local constitutive/state kernel only. Contact/open-gap ownership,
 * global iteration, convergence, and load-case sequencing remain caller-owned.
 * The returned force is the resisting force on the pipe.
 */
export function evaluateCaesarStiffnessFriction(input) {
  const contactActive = input?.contactActive !== false;
  const normalUnit = unitVector(input?.normalUnit, 'normalUnit');
  const relativeDisplacement = vector3(input?.relativeDisplacement, 'relativeDisplacement');
  const normalForce = nonnegativeFinite(input?.normalForce, 'normalForce');
  const coefficientOfFriction = nonnegativeFinite(
    input?.coefficientOfFriction,
    'coefficientOfFriction',
  );
  const frictionMultiplier = nonnegativeFinite(
    input?.frictionMultiplier,
    'frictionMultiplier',
  );
  const frictionStiffness = positiveFinite(input?.frictionStiffness, 'frictionStiffness');
  const currentState = normalizedState(input?.currentState ?? STATES.STICK);
  const tangentialProjector = projector(normalUnit);
  const tangentialDisplacement = multiplyMatrixVector(tangentialProjector, relativeDisplacement);
  const tangentialDisplacementMagnitude = norm(tangentialDisplacement);
  const effectiveMu = coefficientOfFriction * frictionMultiplier;
  const coulombLimit = effectiveMu * normalForce;

  if (!contactActive) {
    return zeroResult({
      state: STATES.OPEN,
      normalUnit,
      tangentialProjector,
      tangentialDisplacement,
      effectiveMu,
      coulombLimit,
      reason: 'CONTACT_INACTIVE',
    });
  }

  if (effectiveMu === 0 || normalForce === 0) {
    return zeroResult({
      state: STATES.DISABLED,
      normalUnit,
      tangentialProjector,
      tangentialDisplacement,
      effectiveMu,
      coulombLimit,
      reason: effectiveMu === 0 ? 'ZERO_EFFECTIVE_FRICTION' : 'ZERO_NORMAL_FORCE',
    });
  }

  const slideMultiplier = positiveFinite(input?.slideMultiplier, 'slideMultiplier');

  if (currentState === STATES.SLIDING) {
    const slidingDirection = resolveSlidingDirection(
      tangentialDisplacement,
      input?.slidingDirection,
      normalUnit,
    );
    const slidingMagnitude = slideMultiplier * coulombLimit;
    return freezeResult({
      state: STATES.SLIDING,
      nextState: STATES.SLIDING,
      stateChanged: false,
      normalUnit,
      tangentialProjector,
      tangentialDisplacement,
      tangentialDisplacementMagnitude,
      effectiveMu,
      coulombLimit,
      trialFrictionMagnitude: null,
      limitExceeded: false,
      slideMultiplier,
      slidingDirection,
      resistingForce: scale(slidingDirection, -slidingMagnitude),
      tangentStiffness: zeroMatrix(),
      constantForceMagnitude: slidingMagnitude,
      reason: 'CONSTANT_SLIDING_FORCE',
    });
  }

  if (currentState !== STATES.STICK) {
    throw new TypeError(`currentState ${currentState} is not valid for active friction contact.`);
  }

  const trialForce = scale(tangentialDisplacement, -frictionStiffness);
  const trialFrictionMagnitude = norm(trialForce);
  const limitExceeded = trialFrictionMagnitude >= coulombLimit;
  const nextState = limitExceeded ? STATES.SLIDING : STATES.STICK;
  const slidingDirection = limitExceeded
    ? directionOrNull(tangentialDisplacement)
    : null;

  return freezeResult({
    state: STATES.STICK,
    nextState,
    stateChanged: nextState !== STATES.STICK,
    normalUnit,
    tangentialProjector,
    tangentialDisplacement,
    tangentialDisplacementMagnitude,
    effectiveMu,
    coulombLimit,
    trialFrictionMagnitude,
    limitExceeded,
    slideMultiplier,
    slidingDirection,
    resistingForce: trialForce,
    tangentStiffness: scaleMatrix(tangentialProjector, frictionStiffness),
    constantForceMagnitude: null,
    reason: limitExceeded ? 'LIMIT_REACHED_SWITCH_NEXT_ITERATION' : 'NONSLIDING_STIFFNESS',
  });
}

function zeroResult(context) {
  return freezeResult({
    state: context.state,
    nextState: context.state,
    stateChanged: false,
    normalUnit: context.normalUnit,
    tangentialProjector: context.tangentialProjector,
    tangentialDisplacement: context.tangentialDisplacement,
    tangentialDisplacementMagnitude: norm(context.tangentialDisplacement),
    effectiveMu: context.effectiveMu,
    coulombLimit: context.coulombLimit,
    trialFrictionMagnitude: 0,
    limitExceeded: false,
    slideMultiplier: null,
    slidingDirection: null,
    resistingForce: [0, 0, 0],
    tangentStiffness: zeroMatrix(),
    constantForceMagnitude: 0,
    reason: context.reason,
  });
}

function resolveSlidingDirection(tangentialDisplacement, suppliedDirection, normalUnit) {
  const fromDisplacement = directionOrNull(tangentialDisplacement);
  if (fromDisplacement) return fromDisplacement;
  if (suppliedDirection === undefined || suppliedDirection === null) {
    throw new TypeError(
      'slidingDirection is required when SLIDING has zero tangential displacement.',
    );
  }
  const candidate = unitVector(suppliedDirection, 'slidingDirection');
  const normalComponent = dot(candidate, normalUnit);
  if (Math.abs(normalComponent) > 1e-10) {
    throw new TypeError('slidingDirection must lie in the restraint tangent plane.');
  }
  return candidate;
}

function directionOrNull(vector) {
  const magnitude = norm(vector);
  return magnitude > EPS ? vector.map((value) => value / magnitude) : null;
}

function projector(normal) {
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) - normal[i] * normal[j]));
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => dot(row, vector));
}

function scaleMatrix(matrix, factor) {
  return matrix.map((row) => row.map((value) => value * factor));
}

function zeroMatrix() {
  return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
}

function scale(vector, factor) {
  return vector.map((value) => value * factor);
}

function unitVector(value, label) {
  const vector = vector3(value, label);
  const magnitude = norm(vector);
  if (!(magnitude > EPS)) throw new TypeError(`${label} must have nonzero magnitude.`);
  return vector.map((entry) => entry / magnitude);
}

function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must be an array of three finite numbers.`);
  }
  return value.map(Number);
}

function normalizedState(value) {
  const state = String(value ?? '').toUpperCase();
  if (!Object.values(STATES).includes(state)) throw new TypeError(`Unknown friction state ${value}.`);
  return state;
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || !(value > 0)) throw new TypeError(`${label} must be finite and > 0.`);
  return Number(value);
}

function nonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and >= 0.`);
  return Number(value);
}

function norm(vector) {
  return Math.hypot(...vector);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function freezeResult(value) {
  for (const key of ['normalUnit', 'tangentialDisplacement', 'resistingForce', 'slidingDirection']) {
    if (Array.isArray(value[key])) Object.freeze(value[key]);
  }
  for (const row of value.tangentialProjector) Object.freeze(row);
  for (const row of value.tangentStiffness) Object.freeze(row);
  Object.freeze(value.tangentialProjector);
  Object.freeze(value.tangentStiffness);
  return Object.freeze(value);
}
