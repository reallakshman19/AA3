import {
  CAESAR_STIFFNESS_FRICTION_STATES as STATES,
  evaluateCaesarStiffnessFriction,
} from './caesar-stiffness-friction.js';

const STATUS = Object.freeze({
  CALCULATED: 'CALCULATED',
  BLOCKED_NONCONVERGENT: 'BLOCKED_NONCONVERGENT',
});

export const GOVERNED_FRICTION_ITERATION_STATUS = STATUS;

/**
 * Deterministic outer iteration controller for a set of local friction sites.
 *
 * This controller deliberately does not invent CAESAR's undocumented internal
 * slide multiplier or the exact implementation of its angle/normal-force
 * convergence controls. The supplied solveIteration callback must report
 * equilibriumConverged and caesarFrictionControlsConverged for the solved
 * global trial state. A state-changing stick->slide trial can never be
 * committed as a converged result in the same iteration.
 */
export function runGovernedFrictionIteration(input) {
  const maxIterations = positiveInteger(input?.maxIterations, 'maxIterations');
  const solveIteration = input?.solveIteration;
  if (typeof solveIteration !== 'function') {
    throw new TypeError('solveIteration must be a function.');
  }
  const sites = normalizeSites(input?.sites);
  const initialStateById = new Map(sites.map((site) => [site.siteId, normalizeInitialState(site)]));
  const history = [];
  let stateById = initialStateById;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const solveRequest = Object.freeze({
      iteration,
      states: Object.freeze(sites.map((site) => freezeStateRequest(site, stateById.get(site.siteId)))),
    });
    const solved = normalizeSolvedIteration(solveIteration(solveRequest), sites);
    const evaluations = [];
    let stateChanged = false;
    const nextStateById = new Map();

    for (const site of sites) {
      const solvedSite = solved.byId.get(site.siteId);
      const current = stateById.get(site.siteId);
      const evaluation = evaluateCaesarStiffnessFriction({
        contactActive: solvedSite.contactActive,
        normalUnit: site.normalUnit,
        relativeDisplacement: solvedSite.relativeDisplacement,
        normalForce: solvedSite.normalForce,
        coefficientOfFriction: site.coefficientOfFriction,
        frictionMultiplier: site.frictionMultiplier,
        frictionStiffness: site.frictionStiffness,
        slideMultiplier: site.slideMultiplier,
        currentState: current.state,
        slidingDirection: current.slidingDirection,
      });
      const next = Object.freeze({
        state: evaluation.nextState,
        slidingDirection: evaluation.slidingDirection ?? current.slidingDirection ?? null,
      });
      nextStateById.set(site.siteId, next);
      stateChanged ||= next.state !== current.state;
      evaluations.push(Object.freeze({ siteId: site.siteId, ...evaluation }));
    }

    const converged = Boolean(solved.equilibriumConverged)
      && Boolean(solved.caesarFrictionControlsConverged)
      && !stateChanged;
    history.push(Object.freeze({
      iteration,
      equilibriumConverged: Boolean(solved.equilibriumConverged),
      caesarFrictionControlsConverged: Boolean(solved.caesarFrictionControlsConverged),
      stateChanged,
      converged,
      evaluations: Object.freeze(evaluations),
    }));

    if (converged) {
      return freezeResult({
        status: STATUS.CALCULATED,
        iterationCount: iteration,
        history,
        finalSites: evaluations,
        policy: {
          partialFinalStatePublishedOnNonconvergence: false,
          caesarAngleControlImplementedHere: false,
          caesarNormalForceControlImplementedHere: false,
          slideMultiplierDefaulted: false,
        },
      });
    }

    stateById = nextStateById;
  }

  return freezeResult({
    status: STATUS.BLOCKED_NONCONVERGENT,
    iterationCount: maxIterations,
    history,
    finalSites: [],
    policy: {
      partialFinalStatePublishedOnNonconvergence: false,
      caesarAngleControlImplementedHere: false,
      caesarNormalForceControlImplementedHere: false,
      slideMultiplierDefaulted: false,
    },
  });
}

function normalizeSites(value) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('sites must be a non-empty array.');
  const rows = value.map((site) => Object.freeze({
    siteId: requiredString(site?.siteId, 'siteId'),
    normalUnit: vector3(site?.normalUnit, 'normalUnit'),
    coefficientOfFriction: nonnegativeFinite(site?.coefficientOfFriction, 'coefficientOfFriction'),
    frictionMultiplier: nonnegativeFinite(site?.frictionMultiplier, 'frictionMultiplier'),
    frictionStiffness: positiveFinite(site?.frictionStiffness, 'frictionStiffness'),
    slideMultiplier: site?.slideMultiplier,
    initialState: site?.initialState ?? STATES.STICK,
    initialSlidingDirection: site?.initialSlidingDirection ?? null,
  })).sort((a, b) => a.siteId.localeCompare(b.siteId));
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.siteId)) throw new TypeError(`duplicate friction siteId ${row.siteId}.`);
    ids.add(row.siteId);
  }
  return Object.freeze(rows);
}

function normalizeInitialState(site) {
  if (site.coefficientOfFriction === 0 || site.frictionMultiplier === 0) {
    return Object.freeze({ state: STATES.DISABLED, slidingDirection: null });
  }
  const state = String(site.initialState).toUpperCase();
  if (![STATES.STICK, STATES.SLIDING].includes(state)) {
    throw new TypeError(`initialState for ${site.siteId} must be STICK or SLIDING.`);
  }
  return Object.freeze({
    state,
    slidingDirection: site.initialSlidingDirection ? vector3(site.initialSlidingDirection, 'initialSlidingDirection') : null,
  });
}

function freezeStateRequest(site, state) {
  return Object.freeze({
    siteId: site.siteId,
    state: state.state,
    slidingDirection: state.slidingDirection ? Object.freeze([...state.slidingDirection]) : null,
  });
}

function normalizeSolvedIteration(value, sites) {
  if (!value || !Array.isArray(value.siteResponses)) {
    throw new TypeError('solveIteration must return siteResponses.');
  }
  const byId = new Map();
  for (const row of value.siteResponses) {
    const siteId = requiredString(row?.siteId, 'solved siteId');
    if (byId.has(siteId)) throw new TypeError(`duplicate solved siteId ${siteId}.`);
    byId.set(siteId, Object.freeze({
      contactActive: row?.contactActive !== false,
      normalForce: nonnegativeFinite(row?.normalForce, `normalForce ${siteId}`),
      relativeDisplacement: vector3(row?.relativeDisplacement, `relativeDisplacement ${siteId}`),
    }));
  }
  for (const site of sites) {
    if (!byId.has(site.siteId)) throw new TypeError(`solveIteration omitted site ${site.siteId}.`);
  }
  for (const siteId of byId.keys()) {
    if (!sites.some((site) => site.siteId === siteId)) throw new TypeError(`solveIteration returned unknown site ${siteId}.`);
  }
  return Object.freeze({
    equilibriumConverged: value.equilibriumConverged === true,
    caesarFrictionControlsConverged: value.caesarFrictionControlsConverged === true,
    byId,
  });
}

function requiredString(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required.`);
  return text;
}

function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new TypeError(`${label} must be an array of three finite numbers.`);
  }
  return Object.freeze(value.map(Number));
}

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || !(value > 0)) throw new TypeError(`${label} must be finite and > 0.`);
  return Number(value);
}

function nonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and >= 0.`);
  return Number(value);
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive integer.`);
  return value;
}

function freezeResult(value) {
  Object.freeze(value.policy);
  Object.freeze(value.finalSites);
  Object.freeze(value.history);
  return Object.freeze(value);
}
