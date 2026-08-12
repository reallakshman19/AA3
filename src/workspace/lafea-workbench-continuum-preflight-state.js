/** Orchestrator-owned custody for authoritative LAFEA.3 preflight evidence. */
import {
  validateLafeaContinuumDomainFirstPreflight,
} from './lafea-continuum-domain-first-preflight.js';

export function createLafeaWorkbenchContinuumPreflightState(stageIds) {
  const retained = Object.fromEntries(stageIds.map((stageId) => [stageId, null]));

  function register(value) {
    const evidence = validateLafeaContinuumDomainFirstPreflight(value);
    requireStage(evidence.stageId);
    const current = retained[evidence.stageId];
    if (current?.semanticHash === evidence.semanticHash) {
      return freeze({ changed: false, evidence: current });
    }
    retained[evidence.stageId] = evidence;
    return freeze({ changed: true, evidence });
  }

  function clear(stageId) {
    requireStage(stageId);
    const changed = retained[stageId] !== null;
    retained[stageId] = null;
    return changed;
  }

  function select(stageId) {
    requireStage(stageId);
    return retained[stageId];
  }

  function fields(stageId) {
    return freeze({ retainedContinuumPreflightEvidence: select(stageId) });
  }

  function requireStage(stageId) {
    if (!Object.hasOwn(retained, stageId)) fail('LAFEA_CONTINUUM_PREFLIGHT_STAGE_NOT_FOUND');
  }

  return Object.freeze({ register, clear, select, fields });
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
