import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';

/**
 * Bind a frozen linear stiffness state to one converged friction tangent state.
 *
 * STICK contributes the declared tangential spring stiffness; SLIDE contributes
 * zero tangent stiffness but remains part of the state signature. Capped slide
 * load magnitude/direction belong to the nonlinear load/state ledger, not this
 * tangent-stiffness identity.
 */
export function buildCaesarFrictionStiffnessState({
  baseStiffnessStateHash,
  finalStates,
  restraints,
}) {
  const base = requireHash(baseStiffnessStateHash, 'baseStiffnessStateHash');
  if (!Array.isArray(finalStates)) throw new TypeError('finalStates must be an array.');
  if (!Array.isArray(restraints)) throw new TypeError('restraints must be an array.');
  const restraintById = new Map(restraints.map((restraint) => [restraint.restraintId, restraint]));
  if (restraintById.size !== restraints.length) {
    throw new TypeError('friction restraints must have unique restraintId values.');
  }
  const frictionStates = finalStates.map((state, index) => {
    const restraintId = String(state?.restraintId ?? '').trim();
    const restraint = restraintById.get(restraintId);
    if (!restraint) throw new TypeError(`finalStates[${index}] references unknown restraint ${restraintId}.`);
    const activeState = String(state?.state ?? '').trim().toUpperCase();
    if (!['STICK', 'SLIDE'].includes(activeState)) {
      throw new TypeError(`finalStates[${index}].state must be STICK or SLIDE.`);
    }
    const frictionStiffnessNPerM = Number(restraint.frictionStiffnessNPerM);
    if (!(frictionStiffnessNPerM > 0) || !Number.isFinite(frictionStiffnessNPerM)) {
      throw new TypeError(`${restraintId} frictionStiffnessNPerM must be finite and positive.`);
    }
    return deepFreeze({
      restraintId,
      nodeId: String(restraint.nodeId),
      state: activeState,
      tangentStiffnessNPerM: activeState === 'STICK' ? frictionStiffnessNPerM : 0,
      declaredFrictionStiffnessNPerM: frictionStiffnessNPerM,
    });
  }).sort((left, right) => compareText(left.restraintId, right.restraintId));
  if (frictionStates.length !== restraints.length) {
    throw new TypeError('finalStates must contain exactly one entry for every friction restraint.');
  }
  const duplicateStates = duplicates(frictionStates.map((state) => state.restraintId));
  if (duplicateStates.length > 0) {
    throw new TypeError(`finalStates contains duplicate restraint states: ${duplicateStates.join(', ')}.`);
  }

  const projection = deepFreeze({
    schema: 'm047-bm4l-nonlinear-stiffness-state/v1',
    baseStiffnessStateHash: base,
    frictionStates: deepFreeze(frictionStates),
  });
  return deepFreeze({
    ...projection,
    semanticHash: semanticHash(projection),
  });
}

function requireHash(value, field) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(text)) throw new TypeError(`${field} must be a 64-hex hash.`);
  return text;
}

function duplicates(values) {
  const seen = new Set();
  const result = new Set();
  for (const value of values) {
    if (seen.has(value)) result.add(value);
    seen.add(value);
  }
  return [...result].sort(compareText);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
