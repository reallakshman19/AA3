/** Standalone-only LAFEA controller composition with product-owned historic evidence. */
import { createLafeaControllerRunEvidence } from '../workspace/lafea-controller-run-evidence.js';
import { LafeaWorkbenchController } from '../workspace/lafea-workbench-controller.js';

export class LafeaStandaloneController extends LafeaWorkbenchController {
  constructor(rootElement, options = {}) {
    super(rootElement, options);
    this.runEvidence = createLafeaControllerRunEvidence({
      buildSha: options.currentCandidateHeadSha ?? null,
    });
  }

  run() {
    const state = super.run();
    this.runEvidence.capture(state);
    return state;
  }

  captureCurrentRunEvidence() { return this.runEvidence.capture(this.getState()); }
  listRunHistory() { return this.runEvidence.list(); }
  getRunHistoryEntry(runId) { return this.runEvidence.get(runId); }
  compareRunHistoryEntries(leftRunId, rightRunId) {
    return this.runEvidence.compare(leftRunId, rightRunId);
  }
  createRunEvidenceDossier(runId) {
    return this.runEvidence.dossier(runId, this.getState());
  }
}
