import { FeaBenchmarkPanel } from './fea-benchmark-panel.js';
import { CaesarAccdbBenchmarkPanel } from './caesar-accdb-benchmark-panel.js';

export const LFEA_PIPELINE_VERIFICATION_DRAWER_SCHEMA = 'lfea-pipeline-verification-drawer/v1';

/**
 * Mount the Verification/ACCDB-QA drawer into the LFEA pipeline shell's
 * persistent drawer host. Houses the same FeaBenchmarkPanel/
 * CaesarAccdbBenchmarkPanel classes the continuum LFEA Workbench composed
 * inline before Phase 6 -- QA for the software itself (a benchmark suite
 * run against live code paths, and a frozen ACCDB comparison), not an
 * output of the user's own analysis, so it lives in a drawer reachable
 * from any pipeline step rather than gated behind one.
 *
 * The Workbench's own LfeaWorkbenchController instance
 * (workspace/bootstrap.js) now opts out of composing these same two
 * panels inline (composeQaBenchmarkPanels: false) so they are not shown
 * twice on the same tab; its runBenchmark()/getBenchmarkReport() API
 * stays intact regardless (see that controller's own comment).
 */
export function mountLfeaPipelineVerificationDrawer(drawerHostElement, options = {}) {
  if (!drawerHostElement || typeof drawerHostElement.append !== 'function') {
    throw new TypeError('Verification drawer requires a host element.');
  }
  const documentRef = options.documentRef ?? drawerHostElement.ownerDocument ?? document;
  return new LfeaPipelineVerificationDrawerController(drawerHostElement, documentRef).init();
}

export class LfeaPipelineVerificationDrawerController {
  constructor(hostElement, documentRef) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.benchmarkPanel = null;
    this.caesarAccdbBenchmarkPanel = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;
    const section = this.documentRef.createElement('section');
    section.dataset.role = 'lfea-pipeline-verification-drawer';
    const intro = this.documentRef.createElement('p');
    intro.dataset.role = 'lfea-pipeline-verification-drawer-intro';
    intro.textContent = 'QA for this application itself -- a benchmark suite run against live code paths, and a frozen CAESAR II ACCDB comparison. Not a result of your own loaded model.';
    const benchmarkHost = this.documentRef.createElement('div');
    benchmarkHost.dataset.role = 'lfea-pipeline-verification-benchmark-host';
    const caesarAccdbBenchmarkHost = this.documentRef.createElement('div');
    caesarAccdbBenchmarkHost.dataset.role = 'lfea-pipeline-verification-caesar-accdb-host';
    section.append(intro, benchmarkHost, caesarAccdbBenchmarkHost);
    this.hostElement.append(section);
    this.section = section;

    this.benchmarkPanel = new FeaBenchmarkPanel(benchmarkHost, { surface: 'LFEA' });
    this.caesarAccdbBenchmarkPanel = new CaesarAccdbBenchmarkPanel(caesarAccdbBenchmarkHost);
    this.benchmarkPanel.render();
    this.caesarAccdbBenchmarkPanel.render();
    this.initialized = true;
    return this;
  }

  runBenchmark() {
    return this.benchmarkPanel?.run() ?? null;
  }

  getBenchmarkReport() {
    return this.benchmarkPanel?.getReport() ?? null;
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_VERIFICATION_DRAWER_SCHEMA,
      benchmarkReport: this.getBenchmarkReport(),
    });
  }

  destroy() {
    this.benchmarkPanel?.destroy();
    this.caesarAccdbBenchmarkPanel?.destroy();
    this.benchmarkPanel = null;
    this.caesarAccdbBenchmarkPanel = null;
    this.section?.remove();
    this.section = null;
    this.initialized = false;
  }
}
