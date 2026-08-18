/** Controller-owned LAFEA run evidence. History is immutable; current authority is read-only live context. */
import { createLafeaRunEvidenceDossier } from './lafea-evidence-dossier.js';
import { compareLafeaRunHistoryEntries } from './lafea-run-comparison.js';
import { createLafeaRunHistory } from './lafea-run-history.js';

export function createLafeaControllerRunEvidence(options = {}) {
  const history = createLafeaRunHistory({ buildSha: options.buildSha ?? null });

  function capture(stateValue) {
    const stage = activeQualifiedStage(stateValue);
    return stage ? history.append(stage) : null;
  }

  function compare(leftRunId, rightRunId) {
    return compareLafeaRunHistoryEntries(history.get(leftRunId), history.get(rightRunId));
  }

  function dossier(runId, stateValue = null) {
    const entry = history.get(runId);
    const currentStage = stateValue?.stages?.[entry.stageId] ?? null;
    return createLafeaRunEvidenceDossier(entry, {
      currentRunId: history.latest()?.runId ?? null,
      currentStage,
    });
  }

  return Object.freeze({
    capture,
    list: history.list,
    get: history.get,
    latest: history.latest,
    compare,
    dossier,
  });
}

function activeQualifiedStage(value) {
  const stageId = value?.activeStageId;
  const stage = stageId ? value?.stages?.[stageId] : null;
  return stage?.execution?.status === 'QUALIFIED' ? stage : null;
}
