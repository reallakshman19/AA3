import { LfeaWorkbenchController } from '../workspace/lfea-workbench-controller.js';
import {
  clearLfeaStandaloneLayout,
  renderLfeaStandaloneLayout,
} from './standalone-layout.js';

export const LFEA_STANDALONE_APPLICATION_SCHEMA = 'lfea-standalone-application/v1';

/**
 * Bootstrap LFEA without constructing the combined Advanced Analysis workspace.
 *
 * This is the first standalone composition root. It owns only the LFEA shell
 * and LFEA workbench lifecycle; Source/Review/Model/History slices are added to
 * this root incrementally rather than inherited from the legacy application.
 *
 * @param {Element} rootElement Application host.
 * @param {{workbench?:Record<string,unknown>,identity?:Record<string,unknown>}} options Explicit standalone options.
 * @returns {Readonly<Record<string, unknown>>} Public standalone application API.
 */
export function bootstrapLfeaStandalone(rootElement, options = {}) {
  if (!rootElement?.ownerDocument) {
    throw new TypeError('Standalone LFEA application root was not found.');
  }

  const identity = createApplicationIdentity(options.identity);
  const { workbenchRoot, statusRoot } = renderLfeaStandaloneLayout(rootElement, identity);
  const workbenchController = new LfeaWorkbenchController(workbenchRoot, options.workbench);
  let destroyed = false;

  workbenchController.init();
  statusRoot.textContent = 'Standalone LFEA analysis workbench ready.';

  const requireActive = () => {
    if (destroyed) {
      const error = new Error('Standalone LFEA application has been destroyed.');
      error.code = 'LFEA_STANDALONE_DESTROYED';
      throw error;
    }
  };

  return Object.freeze({
    getIdentity() {
      return identity;
    },
    getState() {
      requireActive();
      return workbenchController.getState();
    },
    importDocument(value) {
      requireActive();
      return workbenchController.importDocument(value);
    },
    exportDocument() {
      requireActive();
      return workbenchController.exportDocument();
    },
    exportPackage() {
      requireActive();
      return workbenchController.exportPackage();
    },
    exportEvidence() {
      requireActive();
      return workbenchController.exportEvidence();
    },
    loadMockData() {
      requireActive();
      return workbenchController.loadMockData();
    },
    run() {
      requireActive();
      return workbenchController.run();
    },
    cancelRun() {
      requireActive();
      return workbenchController.cancelRun();
    },
    runBenchmark() {
      requireActive();
      return workbenchController.runBenchmark();
    },
    getBenchmarkReport() {
      requireActive();
      return workbenchController.getBenchmarkReport();
    },
    undo() {
      requireActive();
      return workbenchController.undo();
    },
    redo() {
      requireActive();
      return workbenchController.redo();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      workbenchController.destroy();
      clearLfeaStandaloneLayout(rootElement);
    },
  });
}

function createApplicationIdentity(value = {}) {
  const buildTime = text(value.buildTime)
    ?? (typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : null);
  return Object.freeze({
    schema: LFEA_STANDALONE_APPLICATION_SCHEMA,
    application: 'LFEA',
    mode: 'STANDALONE',
    applicationVersion: text(value.applicationVersion) ?? '0.0.0',
    buildSha: text(value.buildSha),
    buildTime,
  });
}

function text(value) {
  const result = String(value ?? '').trim();
  return result || null;
}
