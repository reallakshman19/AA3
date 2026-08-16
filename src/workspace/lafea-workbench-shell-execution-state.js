/** Orchestrator-owned authoritative execution state for governed shell routes. */
export const LAFEA_SHELL_EXECUTION_STATE_SCHEMA = 'lafea-shell-workbench-execution/v1';

const STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);

export function createLafeaWorkbenchShellExecutionState(stageIds) {
  const retained = Object.fromEntries(stageIds.map((stageId) => [stageId, null]));

  function retain(stageId, value) {
    requireStage(stageId);
    if (!value || value.stageId !== stageId
      || value.schema !== LAFEA_SHELL_EXECUTION_STATE_SCHEMA
      || !['QUALIFIED', 'FAILED'].includes(value.status)) {
      fail('LAFEA_SHELL_EXECUTION_STATE_INVALID');
    }
    retained[stageId] = freeze(structuredClone(value));
    return retained[stageId];
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
    const execution = select(stageId);
    return execution ? freeze({ execution }) : freeze({});
  }

  function requireStage(stageId) {
    if (!Object.hasOwn(retained, stageId)) fail('LAFEA_SHELL_EXECUTION_STAGE_INVALID');
    if (STAGES.includes(stageId) === false && retained[stageId] !== null) {
      fail('LAFEA_SHELL_EXECUTION_STAGE_NOT_AUTHORIZED');
    }
  }

  return Object.freeze({ retain, clear, select, fields });
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
