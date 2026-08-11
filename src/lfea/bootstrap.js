import { LfeaWorkbenchController } from '../workspace/lfea-workbench-controller.js';
import { createLfeaGovernedJourneyProjection } from './governed-journey-projection.js';
import { mountLfeaGovernedJourneyView } from './governed-journey-view.js';
import { LfeaStandaloneInputXmlSourceController } from './inputxml-source-controller.js';
import {
  clearLfeaStandaloneLayout,
  renderLfeaStandaloneLayout,
} from './standalone-layout.js';

export const LFEA_STANDALONE_APPLICATION_SCHEMA = 'lfea-standalone-application/v1';

/**
 * Bootstrap LFEA without constructing the combined Advanced Analysis workspace.
 *
 * Native InputXML Source → Review → Model → pre-FEA authorization is composed
 * from existing governed modules. Native solve execution is deliberately not
 * connected in this slice; the element-FEA workbench remains isolated under
 * Verification and is not presented as piping execution authority.
 */
export function bootstrapLfeaStandalone(rootElement, options = {}) {
  if (!rootElement?.ownerDocument) {
    throw new TypeError('Standalone LFEA application root was not found.');
  }

  const identity = createApplicationIdentity(options.identity);
  const layout = renderLfeaStandaloneLayout(rootElement, identity);
  const journeyView = mountLfeaGovernedJourneyView({
    reviewRoot: layout.reviewRoot,
    modelRoot: layout.modelRoot,
    analysisRoot: layout.analysisRoot,
  });
  let governedJourney = createLfeaGovernedJourneyProjection();
  journeyView.update(governedJourney);

  const sourceController = new LfeaStandaloneInputXmlSourceController(
    layout.sourceRoot,
    rootElement.ownerDocument,
    (sourceSnapshot, preFlight) => {
      governedJourney = createLfeaGovernedJourneyProjection({ sourceSnapshot, preFlight });
      journeyView.update(governedJourney);
      layout.statusRoot.textContent = journeyStatus(governedJourney);
    },
  );

  const workbenchController = new LfeaWorkbenchController(layout.workbenchRoot, options.workbench);
  let destroyed = false;

  sourceController.init();
  workbenchController.init();
  layout.statusRoot.textContent = journeyStatus(governedJourney);

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
    getApplicationState() {
      requireActive();
      return Object.freeze({
        identity,
        activeView: layout.getActiveView(),
        source: sourceController.getSnapshot(),
        governedJourney,
      });
    },
    activateView(viewId) {
      requireActive();
      return layout.activate(viewId);
    },
    getActiveView() {
      requireActive();
      return layout.getActiveView();
    },
    getGovernedJourney() {
      requireActive();
      return governedJourney;
    },
    loadInputXmlSource(input, sourceOptions) {
      requireActive();
      return sourceController.loadSource(input, sourceOptions);
    },
    authorizeInputXmlSourceUnit(unit) {
      requireActive();
      return sourceController.authorizeUnit(unit);
    },
    authorizeInputXmlPreFlight(approval) {
      requireActive();
      return sourceController.authorizePreFlight(approval);
    },
    getInputXmlSourceState() {
      requireActive();
      return sourceController.getSnapshot();
    },
    getInputXmlPreFlight() {
      requireActive();
      return sourceController.getPreFlight();
    },
    clearInputXmlSource() {
      requireActive();
      sourceController.clear();
      return sourceController.getSnapshot();
    },

    // Verification-workbench compatibility API. This workbench is deliberately
    // mounted under Verification and is not native piping execution handoff.
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
      sourceController.destroy();
      journeyView.destroy();
      workbenchController.destroy();
      clearLfeaStandaloneLayout(rootElement);
    },
  });
}

function journeyStatus(journey) {
  if (journey.source.status === 'EMPTY') {
    return 'Import a governed CAESAR II InputXML source to begin Source → Review → Model preparation.';
  }
  if (journey.analysis.status === 'BLOCKED') {
    return 'Native InputXML pre-FEA is BLOCKED. Review retained findings; no solve authorization or execution handoff exists.';
  }
  if (journey.analysis.readyForExecutionHandoff) {
    return 'Reviewed pre-FEA authorization is sealed. Native execution handoff remains intentionally disconnected in this slice.';
  }
  if (journey.review.status === 'REVIEW_REQUIRED') {
    return 'Native InputXML pre-FEA requires explicit engineering review before solve authorization can be sealed.';
  }
  return 'Native InputXML source is retained; complete governed pre-FEA preparation before execution handoff.';
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
